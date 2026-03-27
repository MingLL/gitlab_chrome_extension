import { createRequire } from 'node:module';
import { join } from 'node:path';

import {
  assertBuildDirectory,
  assertPemReadable,
  buildReleaseFilename,
  ensureDirectory,
  loadPackageMetadata,
  parseCrxKeyArg,
  removeIfExists,
  resolveProjectPaths
} from './package-helpers.mjs';

const require = createRequire(import.meta.url);
const crx3 = require('crx3');

async function main() {
  const { rootDir, distDir, releaseDir } = resolveProjectPaths();
  const pkg = await loadPackageMetadata(rootDir);
  const keyPath = parseCrxKeyArg(process.argv.slice(2));

  await assertBuildDirectory(distDir);
  await assertPemReadable(keyPath);
  await ensureDirectory(releaseDir);

  const outputFile = join(releaseDir, buildReleaseFilename(pkg.name, pkg.version, 'crx'));
  await removeIfExists(outputFile);

  const info = await crx3([join(distDir, 'manifest.json')], {
    keyPath,
    crxPath: outputFile
  });

  console.log(`CRX 打包完成：${outputFile}`);
  if (info?.appId) {
    console.log(`扩展 ID：${info.appId}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
