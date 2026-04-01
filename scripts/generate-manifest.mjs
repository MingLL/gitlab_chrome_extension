import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '..');
const inputPath = resolve(root, 'manifest.base.json');
const packageJsonPath = resolve(root, 'package.json');
const outputPath = resolve(root, 'dist', 'manifest.json');

export async function buildManifestFromFiles(manifestPath, packagePath) {
  const [manifestText, packageText] = await Promise.all([
    readFile(manifestPath, 'utf8'),
    readFile(packagePath, 'utf8')
  ]);
  const manifest = JSON.parse(manifestText);
  const pkg = JSON.parse(packageText);

  if (!pkg.version || typeof pkg.version !== 'string') {
    throw new Error(`package.json 缺少有效的 version：${packagePath}`);
  }

  return {
    ...manifest,
    version: pkg.version
  };
}

const manifest = await buildManifestFromFiles(inputPath, packageJsonPath);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
