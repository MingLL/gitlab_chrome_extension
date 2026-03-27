# Chrome 插件 CRX 打包设计

## 目标

为当前项目增加两类发布打包能力：

- 生成可手动上传到 Chrome Web Store 的 `.zip` 包
- 生成可用于本地分发和安装的签名 `.crx` 文件

项目当前已经支持通过 `npm run build` 构建出位于 `dist/` 的解压扩展。本次变更保持现有构建流程不变，只在其上补充独立的发布打包命令。

## 范围

本次包含：

- 保持 `npm run build` 仅负责生成 `dist/`
- 增加用于 Chrome Web Store 上传的 zip 打包命令
- 增加基于 PEM 私钥签名的 CRX 打包命令
- 增加本地测试私钥生成命令
- 将发布产物统一输出到 `release/` 目录
- 在文档中说明解压安装、zip 上传、CRX 分发三种用途的区别

本次不包含：

- Chrome Web Store 自动上传
- CI/CD 发布自动化
- 插件运行时行为改动
- 在未提供私钥的前提下自动签名生成 CRX

## 推荐方案

在现有构建产物之上，增加独立的 Node 打包脚本。

推荐流程：

1. 执行 `npm run build`，刷新 `dist/`
2. 执行 `npm run package:zip`，生成带版本号的上传包
3. 执行 `npm run package:crx -- --key <pem-path>`，生成带版本号的签名 CRX
4. 如需本地测试私钥，可先执行 `npm run keygen:crx`

这样可以把开发构建、商店上传打包、本地分发打包三件事清晰分开。

## 备选方案

### 1. 推荐方案：独立的发布脚本

为 zip、CRX、key 生成分别增加 npm 命令。

优点：

- 保留现有构建方式
- 不把发布逻辑混入日常 build
- 私钥处理方式明确
- 命令意图清晰，便于维护

缺点：

- 需要多维护几个命令

### 2. 把打包逻辑并入 `npm run build`

优点：

- 命令更少

缺点：

- 本地开发构建与发布产物耦合
- CRX 签名流程不够清晰
- 只想调试时也会被动生成发布文件

### 3. 引入完整发布工具链

优点：

- 未来更容易扩展自动化发布

缺点：

- 对当前仓库体量来说过度设计

## 命令设计

### 构建命令

保留：

- `npm run build`

行为：

- 仅构建解压扩展到 `dist/`
- 不生成发布产物

### Zip 打包命令

新增：

- `npm run package:zip`

行为：

- 先执行现有 build
- 生成 `release/gitlab-chrome-extension-<version>.zip`
- 打包的是 `dist/` 内部内容，而不是把整个 `dist/` 目录包进去

### CRX 打包命令

新增：

- `npm run package:crx -- --key <pem-path>`

行为：

- 先执行现有 build
- 必须通过 `--key` 显式传入 PEM 私钥路径
- 生成 `release/gitlab-chrome-extension-<version>.crx`
- 使用传入私钥对扩展进行签名

当未传 `--key` 时：

- 立即失败
- 给出明确错误提示
- 提示可执行 `npm run keygen:crx` 生成本地测试私钥

### 本地测试私钥生成命令

新增：

- `npm run keygen:crx`

行为：

- 生成仅用于本地测试的 PEM 私钥
- 输出到 `.local/keys/`
- 后续重复执行时默认复用同一路径，除非未来显式支持覆盖

建议输出路径：

- `.local/keys/chrome-extension.pem`

## 输出结构

### 解压扩展产物

- `dist/manifest.json`
- `dist/background/service-worker.js`
- `dist/sidepanel/index.html`
- `dist/assets/*`
- `dist/icons/*`

### 发布产物

- `release/gitlab-chrome-extension-<version>.zip`
- `release/gitlab-chrome-extension-<version>.crx`

### 本地签名材料

- `.local/keys/chrome-extension.pem`

本地私钥路径需要加入 git 忽略，避免误提交。

## 实现结构

## 需要修改的文件

- `package.json`
- `.gitignore`
- `README.md`

## 需要新增的文件

- `scripts/package-extension.mjs`
- `scripts/package-crx.mjs`，或等价的 CRX 辅助模块
- `scripts/generate-crx-key.mjs`

## 脚本职责

### `scripts/package-extension.mjs`

负责：

- 读取 `package.json`
- 在缺失时创建 `release/`
- 校验 build 后的 `dist/` 是否存在
- 生成带版本号的 zip 产物
- 输出清晰的操作提示和错误信息

### `scripts/package-crx.mjs`

负责：

- 解析 `--key`
- 校验 PEM 文件存在且可读取
- 基于构建后的扩展内容生成带版本号的 CRX
- 在签名或打包失败时输出明确错误

### `scripts/generate-crx-key.mjs`

负责：

- 在缺失时创建 `.local/keys/`
- 生成 PEM 私钥
- 默认不覆盖已存在私钥，除非未来显式支持
- 输出最终生成路径

## CRX 打包策略

CRX 打包应采用独立实现，而不是直接复用 zip 结果。

要求：

- 使用同一份 `dist/` 构建内容
- 私钥传入方式保持显式
- 在不修改插件源码的前提下生成有效 CRX 文件

实现说明：

- 优先选择体量小、职责单一的方案来生成 CRX
- 可以是一个轻量依赖，也可以是边界清晰的本地实现
- 不论内部采用哪种方式，对外命令保持一致：`--key` 为必填

## 错误处理

以下场景需要明确失败并给出可执行的下一步提示：

- `dist/` 缺失，说明 build 未成功或未执行
- `package.json` 中缺少可用的 `name` 或 `version`
- zip 打包执行失败
- 执行 `package:crx` 时未传 `--key`
- 指定的 PEM 路径不存在或无法读取
- 私钥格式不合法，导致 CRX 签名失败

错误信息应尽量说明操作者下一步该怎么做。

## 文档变更

更新 `README.md`，说明：

- 如何构建并通过 `dist/` 加载解压扩展
- 如何生成用于 Chrome Web Store 的 zip 包
- 如何生成本地测试签名私钥
- 如何生成签名 CRX
- 三类产物分别适用于什么场景

建议强调：

- `dist/` 用于 `Load unpacked`
- `.zip` 用于 Chrome Web Store 手动上传
- `.crx` 用于本地或手动分发安装

## 测试与验证

验证应包括：

- 现有单元测试仍然通过
- 构建仍然成功
- zip 打包成功
- 本地测试私钥生成成功
- 使用生成的 PEM 执行 CRX 打包成功
- 发布文件名包含当前版本号
- zip 内部结构为扩展根文件，而不是多一层 `dist/`

建议验证命令：

```bash
npm test -- --run
npm run build
npm run package:zip
npm run keygen:crx
npm run package:crx -- --key .local/keys/chrome-extension.pem
unzip -l release/gitlab-chrome-extension-<version>.zip
ls -l release
```

## 风险

### Zip 目录结构错误

如果打包时把整个 `dist/` 目录包进去，而不是包其内容，Chrome Web Store 上传可能无效。

缓解方式：

- 在 `dist/` 目录内部执行打包
- 在发布流程中显式检查压缩包结构

### CRX 签名流程复杂

相比 zip，CRX 生成对私钥格式和打包细节更敏感。

缓解方式：

- 将 CRX 打包逻辑与 zip 逻辑分离
- 强制显式传入私钥路径
- 在打包前先校验私钥

### 私钥误提交

本地测试私钥不应提交到仓库。

缓解方式：

- 统一放到 `.local/keys/`
- 将该路径加入 `.gitignore`
- 在文档中明确说明生成的私钥仅用于本地测试

## 完成标准

满足以下条件即可认为完成：

- 维护者仍可通过 `dist/` 构建并加载解压扩展
- `npm run package:zip` 能生成带版本号的商店上传包
- `npm run keygen:crx` 能生成本地测试用 PEM 私钥
- `npm run package:crx -- --key <pem-path>` 能生成带版本号的 CRX
- 发布产物统一输出到 `release/`
- README 能清楚说明三种安装和分发方式的区别
