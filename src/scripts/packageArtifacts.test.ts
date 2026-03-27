/* @vitest-environment node */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

import {
  assertBuildDirectory,
  assertFileDoesNotExist,
  assertPemReadable,
  buildReleaseFilename,
  buildZipCommand,
  getDefaultKeyPath,
  parseCrxKeyArg
} from '../../scripts/package-helpers.mjs';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((path) => rm(path, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('package helpers', () => {
  test('缺少 --key 时返回明确错误', () => {
    expect(() => parseCrxKeyArg([])).toThrow(/--key/);
  });

  test('根据 package name 和 version 生成 release 文件名', () => {
    expect(buildReleaseFilename('gitlab-chrome-extension', '0.1.0', 'zip')).toBe(
      'gitlab-chrome-extension-0.1.0.zip'
    );
  });

  test('dist 不存在时抛出明确错误', async () => {
    await expect(assertBuildDirectory('/tmp/missing-dist')).rejects.toThrow(/dist/);
  });

  test('zip 打包命令从 dist 内部打包内容', () => {
    expect(buildZipCommand('/repo/dist', '/repo/release/app-0.1.0.zip')).toEqual({
      command: 'zip',
      args: ['-r', '/repo/release/app-0.1.0.zip', '.'],
      cwd: '/repo/dist'
    });
  });

  test('默认生成到 .local/keys/chrome-extension.pem', () => {
    expect(getDefaultKeyPath('/repo')).toBe('/repo/.local/keys/chrome-extension.pem');
  });

  test('已存在 key 时拒绝覆盖', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pem-'));
    tempDirs.push(dir);
    const keyPath = join(dir, 'chrome-extension.pem');
    await mkdir(dir, { recursive: true });
    await writeFile(keyPath, 'pem');

    await expect(assertFileDoesNotExist(keyPath, '私钥文件')).rejects.toThrow(/已存在/);
  });

  test('非法 pem 文件给出明确错误', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pem-'));
    tempDirs.push(dir);
    const keyPath = join(dir, 'invalid.pem');
    await writeFile(keyPath, 'not-a-valid-pem');

    await expect(assertPemReadable(keyPath)).rejects.toThrow(/PEM/);
  });

  test('存在 dist 目录时通过校验', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dist-'));
    tempDirs.push(dir);
    await mkdir(join(dir, 'dist'));

    await expect(assertBuildDirectory(join(dir, 'dist'))).resolves.toBeUndefined();
  });
});
