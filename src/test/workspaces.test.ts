import { createMemoryFs } from '@file-services/memory';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PackageJson } from 'type-fest';
import { resolveWorkspacePackages } from '../utils/workspaces.ts';

describe('resolveWorkspacePackages', () => {
  const packageJson = (packageJson: PackageJson) => JSON.stringify(packageJson, null, 2);

  const host = createMemoryFs({
    'package.json': packageJson({
      workspaces: ['packages/*'],
    }),
    packages: {
      a: {
        'package.json': packageJson({
          name: 'yarn-workspace-a',
          dependencies: {
            'yarn-workspace-b': '^1.0.0',
          },
        }),
      },
      b: {
        'package.json': packageJson({
          name: 'yarn-workspace-b',
        }),
      },
    },
  });

  it('finds packages when workspace definition contains a glob', () => {
    const packages = resolveWorkspacePackages('/', ['packages/*'], host);
    assert.deepEqual(
      packages.map(({ displayName }) => displayName),
      ['yarn-workspace-a', 'yarn-workspace-b'],
    );
  });

  it('finds packages only once, even if targeted by multiple definitions', () => {
    const packages = resolveWorkspacePackages('/', ['packages/b', 'packages/*'], host);
    assert.deepEqual(
      packages.map(({ displayName }) => displayName),
      ['yarn-workspace-b', 'yarn-workspace-a'],
    );
  });

  it('finds packages when workspace definition contains a glob', () => {
    const packages = resolveWorkspacePackages('/', ['packages/*'], host);
    assert.deepEqual(
      packages.map(({ displayName }) => displayName),
      ['yarn-workspace-a', 'yarn-workspace-b'],
    );
  });

  it('finds packages only once, even if targeted by multiple definitions', () => {
    const packages = resolveWorkspacePackages('/', ['packages/b', 'packages/*'], host);
    assert.deepEqual(
      packages.map(({ displayName }) => displayName),
      ['yarn-workspace-b', 'yarn-workspace-a'],
    );
  });
});
