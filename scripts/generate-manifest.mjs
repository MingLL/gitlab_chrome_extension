import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '..');
const inputPath = resolve(root, 'manifest.base.json');
const outputPath = resolve(root, 'dist', 'manifest.json');

const manifestText = await readFile(inputPath, 'utf8');
const manifest = JSON.parse(manifestText);

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
