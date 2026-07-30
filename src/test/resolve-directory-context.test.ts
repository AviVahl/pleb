import { createMemoryFs } from '@file-services/memory';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PackageJson } from 'type-fest';
import {
  childPackagesFromContext,
  type MultiPackageContext,
  resolveDirectoryContext,
  type SinglePackageContext,
} from '../utils/directory-context.ts';
import { type INpmPackage, PACKAGE_JSON } from '../utils/npm-package.ts';

describe('resolveDirectoryContext', () => {
  const packageJson = (packageJson: PackageJson) => JSON.stringify(packageJson, null, 2);

  it('supports a single package', () => {
    const host = createMemoryFs({
      [PACKAGE_JSON]: packageJson({
        name: 'some-package',
      }),
    });
    const packages = resolveDirectoryContext('/', host);

    assert.equal(packages.type, 'single');
    const { npmPackage } = packages as SinglePackageContext;
    assert.equal(npmPackage.displayName, 'some-package');
    assert.equal(npmPackage.directoryPath, '/');
    assert.equal(npmPackage.packageJsonPath, '/package.json');
  });

  it('supports npm/yarn "workspaces" definition', () => {
    const host = createMemoryFs({
      [PACKAGE_JSON]: packageJson({
        workspaces: ['packages/*'],
      }),
      packages: {
        a: {
          [PACKAGE_JSON]: packageJson({
            name: 'a',
          }),
        },
        b: {
          [PACKAGE_JSON]: packageJson({
            name: 'b',
          }),
        },
      },
    });
    const packages = resolveDirectoryContext('/', host);

    assert.equal(packages.type, 'multi');
    const { rootPackage, packages: workspacePackages } = packages as MultiPackageContext;
    assert.equal(rootPackage.displayName, '/package.json');
    assert.equal(rootPackage.directoryPath, '/');
    assert.equal(rootPackage.packageJsonPath, '/package.json');

    assert.equal(workspacePackages.length, 2);
    const [packageA, packageB] = workspacePackages as [INpmPackage, INpmPackage];

    assert.equal(packageA.displayName, 'a');
    assert.equal(packageA.directoryPath, '/packages/a');
    assert.equal(packageA.packageJsonPath, '/packages/a/package.json');

    assert.equal(packageB.displayName, 'b');
    assert.equal(packageB.directoryPath, '/packages/b');
    assert.equal(packageB.packageJsonPath, '/packages/b/package.json');
  });

  it('supports lerna "packages" definition', () => {
    const host = createMemoryFs({
      [PACKAGE_JSON]: packageJson({}),
      'lerna.json': JSON.stringify({ packages: ['packages/*'] }),
      packages: {
        a: {
          [PACKAGE_JSON]: packageJson({
            name: 'a',
          }),
        },
        b: {
          [PACKAGE_JSON]: packageJson({
            name: 'b',
          }),
        },
      },
    });
    const packages = resolveDirectoryContext('/', host);

    assert.equal(packages.type, 'multi');
    assert.equal(childPackagesFromContext(packages).length, 2);
    const [packageA, packageB] = childPackagesFromContext(packages) as [INpmPackage, INpmPackage];

    assert.equal(packageA.displayName, 'a');
    assert.equal(packageA.directoryPath, '/packages/a');
    assert.equal(packageA.packageJsonPath, '/packages/a/package.json');

    assert.equal(packageB.displayName, 'b');
    assert.equal(packageB.directoryPath, '/packages/b');
    assert.equal(packageB.packageJsonPath, '/packages/b/package.json');
  });

  it('supports npm file: links', () => {
    const host = createMemoryFs({
      [PACKAGE_JSON]: packageJson({
        devDependencies: {
          a: 'file:packages/a',
          b: 'file:packages/b',
        },
      }),
      packages: {
        a: {
          [PACKAGE_JSON]: packageJson({
            name: 'a',
          }),
        },
        b: {
          [PACKAGE_JSON]: packageJson({
            name: 'b',
          }),
        },
      },
    });
    const packages = resolveDirectoryContext('/', host);

    assert.equal(packages.type, 'multi');
    assert.equal(childPackagesFromContext(packages).length, 2);
    const [packageA, packageB] = childPackagesFromContext(packages) as [INpmPackage, INpmPackage];

    assert.equal(packageA.displayName, 'a');
    assert.equal(packageA.directoryPath, '/packages/a');
    assert.equal(packageA.packageJsonPath, '/packages/a/package.json');

    assert.equal(packageB.displayName, 'b');
    assert.equal(packageB.directoryPath, '/packages/b');
    assert.equal(packageB.packageJsonPath, '/packages/b/package.json');
  });
});
