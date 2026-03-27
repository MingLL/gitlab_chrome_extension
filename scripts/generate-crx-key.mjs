import { generateKeyPairSync } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import {
  assertFileDoesNotExist,
  ensureDirectory,
  getDefaultKeyPath
} from './package-helpers.mjs';

async function main() {
  const rootDir = process.cwd();
  const keyPath = getDefaultKeyPath(rootDir);

  await ensureDirectory(dirname(keyPath));
  await assertFileDoesNotExist(keyPath, '私钥文件');

  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 4096 });
  const pem = privateKey.export({
    type: 'pkcs8',
    format: 'pem'
  });

  await writeFile(keyPath, pem, { encoding: 'utf8', flag: 'wx' });
  console.log(`CRX 测试私钥已生成：${keyPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
