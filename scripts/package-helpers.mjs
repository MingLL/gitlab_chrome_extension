import { constants } from 'node:fs';
import { access, mkdir, readFile, rm } from 'node:fs/promises';
import { createPrivateKey } from 'node:crypto';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

export function buildReleaseFilename(name, version, ext) {
  return `${name}-${version}.${ext}`;
}

export function parseCrxKeyArg(args) {
  const keyIndex = args.indexOf('--key');

  if (keyIndex === -1 || !args[keyIndex + 1]) {
    throw new Error('缺少 --key <pem-path>，可先执行 npm run keygen:crx');
  }

  return args[keyIndex + 1];
}

export async function assertBuildDirectory(distPath) {
  try {
    await access(distPath, constants.R_OK);
  } catch {
    throw new Error(`构建目录不存在：${distPath}。请先执行 npm run build`);
  }
}

export function buildZipCommand(distPath, outputPath) {
  return {
    command: 'zip',
    args: ['-r', outputPath, '.'],
    cwd: distPath
  };
}

export function getDefaultKeyPath(rootDir) {
  return join(rootDir, '.local/keys/chrome-extension.pem');
}

export async function assertFileDoesNotExist(filePath, label = '文件') {
  try {
    await access(filePath, constants.F_OK);
  } catch {
    return;
  }

  throw new Error(`${label}已存在：${filePath}`);
}

export async function assertPemReadable(filePath) {
  try {
    const pem = await readFile(filePath, 'utf8');
    createPrivateKey(pem);
  } catch {
    throw new Error(`PEM 私钥无效或无法读取：${filePath}`);
  }
}

export async function ensureDirectory(dirPath) {
  await mkdir(dirPath, { recursive: true });
}

export async function removeIfExists(filePath) {
  await rm(filePath, { force: true });
}

export async function loadPackageMetadata(rootDir) {
  const packageJsonPath = join(rootDir, 'package.json');
  const raw = await readFile(packageJsonPath, 'utf8');
  const pkg = JSON.parse(raw);

  if (!pkg.name || !pkg.version) {
    throw new Error(`package.json 缺少有效的 name 或 version：${packageJsonPath}`);
  }

  return {
    name: pkg.name,
    version: pkg.version
  };
}

export function resolveProjectPaths(rootDir = process.cwd()) {
  return {
    rootDir,
    distDir: resolve(rootDir, 'dist'),
    releaseDir: resolve(rootDir, 'release')
  };
}

export async function runCommand(command, args, options = {}) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: 'inherit'
    });

    child.once('error', (error) => {
      rejectPromise(new Error(`执行命令失败：${command} ${args.join(' ')}\n${error.message}`));
    });

    child.once('close', (code) => {
      if (code === 0) {
        resolvePromise(undefined);
        return;
      }

      rejectPromise(new Error(`命令退出码非 0：${command} ${args.join(' ')}`));
    });
  });
}
