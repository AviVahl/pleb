import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PackageJson } from 'type-fest';
import { sortPackagesByDepth, type INpmPackage } from '../utils/npm-package.ts';

describe('sortPackagesByDepth', () => {
  const createPackage = (packageName: string, dependencies?: Record<string, string>): INpmPackage => ({
    displayName: packageName,
    packageJson: { name: packageName, dependencies } as PackageJson,
    directoryPath: '/',
    packageJsonContent: ``,
    packageJsonPath: '/',
  });

  it('sorts two packages depending on one another', () => {
    const packageA = createPackage('packageA', { packageB: '1.0.0' });
    const packageB = createPackage('packageB');
    const sorted = sortPackagesByDepth([packageA, packageB]);
    assert.deepEqual(
      sorted.map((s) => s.displayName),
      ['packageB', 'packageA'],
    );
  });

  it('sorts several packages with isolated packages in the middle', () => {
    const packageA = createPackage('packageA', { packageB: '1.0.0' });
    const packageB = createPackage('packageB', { packageC: '1.0.0' });
    const packageC = createPackage('packageC');
    const packageD = createPackage('packageD');

    const sorted = sortPackagesByDepth([packageA, packageD, packageB, packageC]);
    assert.deepEqual(
      sorted.map((s) => s.displayName),
      ['packageC', 'packageB', 'packageA', 'packageD'],
    );
  });
});
