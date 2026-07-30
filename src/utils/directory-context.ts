import type { PackageJson } from 'type-fest';
import { findFileUpSync, type FindUpHost } from './find-up.ts';
import { isPlainObject, isString } from './structures.ts';
import {
  PACKAGE_JSON,
  resolveLinkedPackages,
  sortPackagesByDepth,
  type INpmPackage,
  type ResolveLinkedPackagesHost,
} from './npm-package.ts';
import { extractPackageLocations, resolveWorkspacePackages, type ResolveWorkspacePackagesHost } from './workspaces.ts';

export interface SinglePackageContext {
  type: 'single';
  npmPackage: INpmPackage;
}

export interface MultiPackageContext {
  type: 'multi';
  rootPackage: INpmPackage;
  packages: INpmPackage[];
}

export interface DirectoryContextHost extends FindUpHost, ResolveWorkspacePackagesHost, ResolveLinkedPackagesHost {
  existsSync(path: string): boolean;
}

export function resolveDirectoryContext(
  basePath: string,
  host: DirectoryContextHost,
): SinglePackageContext | MultiPackageContext {
  const packageJsonPath = findFileUpSync(basePath, PACKAGE_JSON, host);

  if (!isString(packageJsonPath)) {
    throw new Error(`Cannot find ${PACKAGE_JSON} for ${basePath}`);
  }

  const directoryPath = host.dirname(packageJsonPath);

  const packageJsonContent = host.readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonContent) as PackageJson;
  if (!isPlainObject(packageJson)) {
    throw new Error(`${packageJsonPath} is not a valid json object.`);
  }

  const displayName = packageJson.name ? packageJson.name : packageJsonPath;

  const rootPackage: INpmPackage = {
    displayName,
    directoryPath,
    packageJson,
    packageJsonPath,
    packageJsonContent,
  };
  const { workspaces } = rootPackage.packageJson;

  if (workspaces !== undefined) {
    return {
      type: 'multi',
      rootPackage,
      packages: sortPackagesByDepth(
        resolveWorkspacePackages(directoryPath, extractPackageLocations(packageJson.workspaces), host),
      ),
    };
  }

  const lernaJsonPath = host.join(directoryPath, 'lerna.json');
  if (host.existsSync(lernaJsonPath)) {
    const lernaJsonContents = host.readFileSync(lernaJsonPath, 'utf8');
    const lernaJson = JSON.parse(lernaJsonContents) as { packages?: string[] };
    if (isPlainObject(packageJson) && Array.isArray(lernaJson.packages)) {
      return {
        type: 'multi',
        rootPackage,
        packages: sortPackagesByDepth(
          resolveWorkspacePackages(directoryPath, extractPackageLocations(lernaJson.packages), host),
        ),
      };
    }
  }

  const linkedPackages = resolveLinkedPackages(rootPackage, host);
  if (linkedPackages.length) {
    return {
      type: 'multi',
      rootPackage,
      packages: sortPackagesByDepth(linkedPackages),
    };
  }

  return {
    type: 'single',
    npmPackage: rootPackage,
  };
}

export function childPackagesFromContext(context: SinglePackageContext | MultiPackageContext): INpmPackage[] {
  return context.type === 'single' ? [context.npmPackage] : [...context.packages];
}

export function allPackagesFromContext(context: SinglePackageContext | MultiPackageContext): INpmPackage[] {
  return context.type === 'single' ? [context.npmPackage] : [context.rootPackage, ...context.packages];
}

export function getRootPackage(context: SinglePackageContext | MultiPackageContext): INpmPackage {
  return context.type === 'single' ? context.npmPackage : context.rootPackage;
}
