/* @vitest-environment node */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import { buildManifestFromFiles } from '../../scripts/generate-manifest.mjs';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((path) => rm(path, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('generate manifest', () => {
  test('使用 package.json 的版本号覆盖 manifest 模板版本', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'manifest-'));
    tempDirs.push(dir);

    const manifestPath = join(dir, 'manifest.base.json');
    const packageJsonPath = join(dir, 'package.json');

    await writeFile(
      manifestPath,
      JSON.stringify({
        manifest_version: 3,
        name: 'GitLab Chrome Extension',
        version: '0.1.0'
      })
    );
    await writeFile(
      packageJsonPath,
      JSON.stringify({
        name: 'gitlab-chrome-extension',
        version: '1.2.3'
      })
    );

    const manifest = await buildManifestFromFiles(manifestPath, packageJsonPath);

    expect(manifest.version).toBe('1.2.3');
    expect(manifest.name).toBe('GitLab Chrome Extension');
  });
});
