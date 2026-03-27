# Chrome 插件 CRX 打包 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留现有 `dist/` 解压扩展构建方式的前提下，新增 `.zip` 与 `.crx` 两类发布打包能力，并支持本地测试私钥生成。

**Architecture:** 继续以 `npm run build` 产出的 `dist/` 作为唯一构建源。新增独立的 Node 脚本分别负责 zip 打包、CRX 打包和测试私钥生成，通过 `package.json` 暴露 npm scripts，并在 README 中明确三类产物的用途和安装方式。

**Tech Stack:** Node.js ESM scripts、Vite、Vitest、系统 `zip` 命令、Node `crypto`

---

### Task 1: 补充打包脚本测试覆盖

**Files:**
- Create: `src/scripts/packageArtifacts.test.ts`
- Modify: `package.json`
- Test: `src/scripts/packageArtifacts.test.ts`

- [ ] **Step 1: 编写 zip 和 crx 脚本参数校验的失败测试**

```ts
import { describe, expect, test } from 'vitest';
import { parsePackageArgs } from '../../scripts/package-helpers.mjs';

describe('parsePackageArgs', () => {
  test('缺少 --key 时返回明确错误', () => {
    expect(() => parsePackageArgs(['crx'])).toThrow(/--key/);
  });
});
```

- [ ] **Step 2: 运行测试并确认按预期失败**

Run: `npm test -- --run src/scripts/packageArtifacts.test.ts`
Expected: FAIL，提示目标模块或导出尚不存在

- [ ] **Step 3: 补充产物命名和输出路径的失败测试**

```ts
test('根据 package name 和 version 生成 release 文件名', () => {
  expect(buildReleaseFilename('gitlab-chrome-extension', '0.1.0', 'zip')).toBe(
    'gitlab-chrome-extension-0.1.0.zip',
  );
});
```

- [ ] **Step 4: 再次运行测试并确认仍为合理失败**

Run: `npm test -- --run src/scripts/packageArtifacts.test.ts`
Expected: FAIL，失败原因来自尚未实现的命名函数

- [ ] **Step 5: 提交测试骨架**

```bash
git add package.json src/scripts/packageArtifacts.test.ts
git commit -m "test(build): 补充扩展打包脚本行为测试"
```

### Task 2: 提取共享打包辅助逻辑

**Files:**
- Create: `scripts/package-helpers.mjs`
- Modify: `src/scripts/packageArtifacts.test.ts`
- Test: `src/scripts/packageArtifacts.test.ts`

- [ ] **Step 1: 实现最小辅助函数以满足测试**

```js
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
```

- [ ] **Step 2: 运行测试并确认新测试通过**

Run: `npm test -- --run src/scripts/packageArtifacts.test.ts`
Expected: PASS

- [ ] **Step 3: 为 package 信息读取与目录校验补一条失败测试**

```ts
test('dist 不存在时抛出明确错误', async () => {
  await expect(assertBuildDirectory('/tmp/missing-dist')).rejects.toThrow(/dist/);
});
```

- [ ] **Step 4: 运行测试并确认新增测试失败**

Run: `npm test -- --run src/scripts/packageArtifacts.test.ts`
Expected: FAIL，提示 `assertBuildDirectory` 尚未实现

- [ ] **Step 5: 实现目录校验并保持测试全绿**

```js
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';

export async function assertBuildDirectory(distPath) {
  try {
    await access(distPath, constants.R_OK);
  } catch {
    throw new Error(`构建目录不存在：${distPath}。请先执行 npm run build`);
  }
}
```

- [ ] **Step 6: 运行测试并确认全部通过**

Run: `npm test -- --run src/scripts/packageArtifacts.test.ts`
Expected: PASS

- [ ] **Step 7: 提交共享辅助逻辑**

```bash
git add scripts/package-helpers.mjs src/scripts/packageArtifacts.test.ts
git commit -m "feat(build): 抽取扩展打包共享辅助逻辑"
```

### Task 3: 实现 zip 打包命令

**Files:**
- Create: `scripts/package-extension.mjs`
- Modify: `package.json`
- Modify: `scripts/package-helpers.mjs`
- Test: `src/scripts/packageArtifacts.test.ts`

- [ ] **Step 1: 为 zip 命令增加调用封装测试**

```ts
test('zip 打包命令从 dist 内部打包内容', () => {
  expect(buildZipCommand('/repo/dist', '/repo/release/app-0.1.0.zip')).toEqual({
    command: 'zip',
    args: ['-r', '/repo/release/app-0.1.0.zip', '.'],
    cwd: '/repo/dist',
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/scripts/packageArtifacts.test.ts`
Expected: FAIL，提示 `buildZipCommand` 尚未实现

- [ ] **Step 3: 实现 zip 命令构建与脚本入口**

```js
const outputFile = join(releaseDir, buildReleaseFilename(pkg.name, pkg.version, 'zip'));
const { command, args, cwd } = buildZipCommand(distDir, outputFile);
await runCommand(command, args, { cwd });
```

- [ ] **Step 4: 在 `package.json` 中新增脚本**

```json
{
  "scripts": {
    "package:zip": "npm run build && node scripts/package-extension.mjs"
  }
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- --run src/scripts/packageArtifacts.test.ts`
Expected: PASS

- [ ] **Step 6: 手动验证 zip 打包命令**

Run: `npm run package:zip`
Expected: 成功生成 `release/gitlab-chrome-extension-<version>.zip`

- [ ] **Step 7: 检查 zip 根目录结构**

Run: `unzip -l release/gitlab-chrome-extension-<version>.zip`
Expected: 包内直接出现 `manifest.json`、`background/`、`sidepanel/`、`assets/`、`icons/`，没有额外 `dist/`

- [ ] **Step 8: 提交 zip 打包能力**

```bash
git add package.json scripts/package-extension.mjs scripts/package-helpers.mjs src/scripts/packageArtifacts.test.ts
git commit -m "feat(build): 增加扩展zip发布打包命令"
```

### Task 4: 实现本地测试私钥生成命令

**Files:**
- Create: `scripts/generate-crx-key.mjs`
- Modify: `.gitignore`
- Modify: `package.json`
- Test: `src/scripts/packageArtifacts.test.ts`

- [ ] **Step 1: 为私钥输出路径与覆盖保护编写失败测试**

```ts
test('默认生成到 .local/keys/chrome-extension.pem', () => {
  expect(getDefaultKeyPath('/repo')).toBe('/repo/.local/keys/chrome-extension.pem');
});
```

```ts
test('已存在 key 时拒绝覆盖', async () => {
  await expect(assertKeyDoesNotExist('/tmp/existing.pem')).rejects.toThrow(/已存在/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/scripts/packageArtifacts.test.ts`
Expected: FAIL，提示 key 相关辅助函数尚未实现

- [ ] **Step 3: 实现最小 key 生成脚本**

```js
import { generateKeyPairSync } from 'node:crypto';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
```

- [ ] **Step 4: 在 `.gitignore` 中忽略本地私钥目录**

```gitignore
.local/keys/
```

- [ ] **Step 5: 在 `package.json` 中新增命令**

```json
{
  "scripts": {
    "keygen:crx": "node scripts/generate-crx-key.mjs"
  }
}
```

- [ ] **Step 6: 运行测试并确认通过**

Run: `npm test -- --run src/scripts/packageArtifacts.test.ts`
Expected: PASS

- [ ] **Step 7: 手动验证 key 生成**

Run: `npm run keygen:crx`
Expected: 成功生成 `.local/keys/chrome-extension.pem`

- [ ] **Step 8: 提交私钥生成能力**

```bash
git add .gitignore package.json scripts/generate-crx-key.mjs src/scripts/packageArtifacts.test.ts
git commit -m "feat(build): 增加本地crx测试私钥生成命令"
```

### Task 5: 实现 CRX 打包命令

**Files:**
- Create: `scripts/package-crx.mjs`
- Modify: `package.json`
- Modify: `scripts/package-helpers.mjs`
- Test: `src/scripts/packageArtifacts.test.ts`

- [ ] **Step 1: 为 CRX 文件名和缺少 key 的报错补充测试**

```ts
test('crx 打包文件名包含版本号', () => {
  expect(buildReleaseFilename('gitlab-chrome-extension', '0.1.0', 'crx')).toBe(
    'gitlab-chrome-extension-0.1.0.crx',
  );
});
```

```ts
test('缺少 key 时给出下一步指引', () => {
  expect(() => parseCrxKeyArg([])).toThrow(/npm run keygen:crx/);
});
```

- [ ] **Step 2: 运行测试并确认至少一条失败**

Run: `npm test -- --run src/scripts/packageArtifacts.test.ts`
Expected: FAIL，仅因 CRX 相关实现未完成而失败

- [ ] **Step 3: 实现最小 CRX 打包逻辑**

```js
const keyPath = parseCrxKeyArg(process.argv.slice(2));
await assertBuildDirectory(distDir);
await assertPemReadable(keyPath);
await packageCrx({ distDir, keyPath, outputFile });
```

- [ ] **Step 4: 在 `package.json` 中新增命令**

```json
{
  "scripts": {
    "package:crx": "npm run build && node scripts/package-crx.mjs"
  }
}
```

- [ ] **Step 5: 运行测试并确认通过**

Run: `npm test -- --run src/scripts/packageArtifacts.test.ts`
Expected: PASS

- [ ] **Step 6: 手动验证 CRX 打包**

Run: `npm run package:crx -- --key .local/keys/chrome-extension.pem`
Expected: 成功生成 `release/gitlab-chrome-extension-<version>.crx`

- [ ] **Step 7: 复查错误路径**

Run: `npm run package:crx`
Expected: FAIL，并提示必须传 `--key <pem-path>`

- [ ] **Step 8: 提交 CRX 打包能力**

```bash
git add package.json scripts/package-crx.mjs scripts/package-helpers.mjs src/scripts/packageArtifacts.test.ts
git commit -m "feat(build): 增加扩展crx签名打包命令"
```

### Task 6: 更新 README 文档

**Files:**
- Modify: `README.md`
- Test: `README.md`

- [ ] **Step 1: 更新安装与打包说明**

补充以下内容：

- `dist/` 用于 Chrome `Load unpacked`
- `npm run package:zip` 用于生成 Chrome Web Store 上传包
- `npm run keygen:crx` 用于生成本地测试私钥
- `npm run package:crx -- --key <pem-path>` 用于生成本地分发 CRX

- [ ] **Step 2: 增加示例命令与产物位置说明**

```md
release/gitlab-chrome-extension-<version>.zip
release/gitlab-chrome-extension-<version>.crx
.local/keys/chrome-extension.pem
```

- [ ] **Step 3: 手动检查 README 与现有安装说明是否一致**

Run: `sed -n '1,260p' README.md`
Expected: 解压安装、商店上传、CRX 分发三条路径描述清晰且不互相冲突

- [ ] **Step 4: 提交文档更新**

```bash
git add README.md
git commit -m "docs(readme): 补充扩展zip与crx打包说明"
```

### Task 7: 端到端验证与收尾

**Files:**
- Modify: `package.json`（如需补充聚合命令）
- Test: `src/scripts/packageArtifacts.test.ts`
- Test: `README.md`

- [ ] **Step 1: 运行完整测试**

Run: `npm test -- --run`
Expected: PASS

- [ ] **Step 2: 运行构建**

Run: `npm run build`
Expected: PASS，生成最新 `dist/`

- [ ] **Step 3: 运行 zip 打包**

Run: `npm run package:zip`
Expected: PASS，生成 zip 产物

- [ ] **Step 4: 运行 key 生成**

Run: `npm run keygen:crx`
Expected: PASS，生成 PEM 私钥

- [ ] **Step 5: 运行 CRX 打包**

Run: `npm run package:crx -- --key .local/keys/chrome-extension.pem`
Expected: PASS，生成 CRX 产物

- [ ] **Step 6: 检查 release 目录**

Run: `ls -l release`
Expected: 同时存在 `.zip` 和 `.crx`

- [ ] **Step 7: 检查 zip 包结构**

Run: `unzip -l release/gitlab-chrome-extension-<version>.zip`
Expected: 根目录结构正确，没有 `dist/` 包裹层

- [ ] **Step 8: 检查工作区中是否残留调试代码**

Run: `git diff --check`
Expected: 无格式问题，无调试残留

- [ ] **Step 9: 汇总变更并准备最终提交**

```bash
git status --short
git diff --stat
```

- [ ] **Step 10: 创建最终提交**

```bash
git add package.json .gitignore README.md scripts/package-extension.mjs scripts/package-crx.mjs scripts/generate-crx-key.mjs scripts/package-helpers.mjs src/scripts/packageArtifacts.test.ts
git commit -m "feat(build): 增加扩展zip与crx发布打包能力"
```
