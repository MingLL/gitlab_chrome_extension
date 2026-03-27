import { join } from 'node:path';

import {
  assertBuildDirectory,
  buildReleaseFilename,
  buildZipCommand,
  ensureDirectory,
  loadPackageMetadata,
  removeIfExists,
  resolveProjectPaths,
  runCommand
} from './package-helpers.mjs';

async function main() {
  const { rootDir, distDir, releaseDir } = resolveProjectPaths();
  const pkg = await loadPackageMetadata(rootDir);

  await assertBuildDirectory(distDir);
  await ensureDirectory(releaseDir);

  const outputFile = join(releaseDir, buildReleaseFilename(pkg.name, pkg.version, 'zip'));
  await removeIfExists(outputFile);

  const { command, args, cwd } = buildZipCommand(distDir, outputFile);
  await runCommand(command, args, { cwd });

  console.log(`ZIP 打包完成：${outputFile}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
