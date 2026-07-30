import { minimatch } from 'minimatch';
import type { PackageJson } from 'type-fest';
import { isPlainObject, isString } from './structures.ts';
import { type INpmPackage, PACKAGE_JSON } from './npm-package.ts';

export interface ResolveWorkspacePackagesHost {
  readFileSync(filePath: string, encoding: 'utf8'): string;
  readdirSync(
    directoryPath: string,
    options: { withFileTypes: true },
  ): Iterable<{ name: string; isFile(): boolean; isDirectory(): boolean }>;
  dirname(path: string): string;
  relative(from: string, to: string): string;
  join(...segments: string[]): string;
}

export function resolveWorkspacePackages(
  basePath: string,
  workspaces: string[],
  host: ResolveWorkspacePackagesHost,
): INpmPackage[] {
  const packages = new Map<string, INpmPackage>();

  const packageJsonFilePaths = Array.from(
    deepFindFilesSync(
      basePath,
      (fileName) => fileName === PACKAGE_JSON,
      (directoryName) => !directoryName.startsWith('.') && directoryName !== 'node_modules',
      host,
    ),
  );

  for (const packageDirGlob of workspaces) {
    const packageJsonGlob = ensureEndsWithPackageJson(packageDirGlob);
    const packageJsonPaths = packageJsonFilePaths.filter((packageJsonPath) =>
      minimatch(host.relative(basePath, packageJsonPath), packageJsonGlob),
    );
    for (const packageJsonPath of packageJsonPaths) {
      if (packages.has(packageJsonPath)) {
        continue;
      }
      const packageJsonContent = host.readFileSync(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageJsonContent) as PackageJson;
      if (!isPlainObject(packageJson)) {
        throw new Error(`${packageJsonPath}: no valid json object.`);
      }

      const displayName = packageJson.name ? packageJson.name : packageJsonPath;

      packages.set(packageJsonPath, {
        displayName,
        packageJsonPath,
        packageJson,
        directoryPath: host.dirname(packageJsonPath),
        packageJsonContent,
      });
    }
  }

  return Array.from(packages.values());
}

export function extractPackageLocations(workspaces: PackageJson['workspaces']): string[] {
  if (isString(workspaces)) {
    return [workspaces];
  } else if (Array.isArray(workspaces)) {
    if (workspaces.every(isString)) {
      return workspaces;
    }
  } else if (isPlainObject(workspaces)) {
    const { packages } = workspaces;
    if (isString(packages)) {
      return [packages];
    } else if (Array.isArray(packages) && packages.every(isString)) {
      return packages;
    }
  }
  throw new Error(`cannot extract package locations from "workspaces" field.`);
}

export function* deepFindFilesSync(
  directoryPath: string,
  filterFile: (fileName: string, filePath: string) => boolean = () => true,
  filterDirectory: (directoryName: string, directoryPath: string) => boolean = () => true,
  host: ResolveWorkspacePackagesHost,
): Generator<string> {
  for (const item of host.readdirSync(directoryPath, { withFileTypes: true })) {
    const itemPath = host.join(directoryPath, item.name);
    if (item.isFile() && filterFile(item.name, itemPath)) {
      yield host.join(directoryPath, item.name);
    } else if (item.isDirectory() && filterDirectory(item.name, itemPath)) {
      yield* deepFindFilesSync(itemPath, filterFile, filterDirectory, host);
    }
  }
}

function ensureEndsWithPackageJson(workspace: string) {
  if (workspace.endsWith(`/${PACKAGE_JSON}`)) {
    return workspace;
  } else if (workspace.endsWith('/')) {
    return workspace + PACKAGE_JSON;
  } else {
    return `${workspace}/${PACKAGE_JSON}`;
  }
}
