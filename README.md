# GitLab Chrome 插件

基于 Chrome Side Panel 的 GitLab 插件，用于连接 GitLab、选择仓库和分支，并复制最新提交信息。

## 环境要求

- Chrome `114+`
- 可访问的 GitLab `11.11.3-ee` 实例
- 可访问项目和分支信息的 Personal Access Token
- 支持以下 GitLab 地址形式：
  - `https://gitlab.example.com`
  - `http://192.168.1.10`
  - `http://192.168.1.10:8080`
  - `http://192.168.1.10:8080/gitlab`

## 安装依赖

```bash
npm install
```

## 构建

```bash
npm run build
```

构建产物输出到 [dist](/Users/mingll/Documents/SomeProject/gitlab_chrome_extension/dist)。

## 打包发布产物

### 生成 Chrome Web Store 上传包

```bash
npm run package:zip
```

生成产物：

- `release/gitlab-chrome-extension-<version>.zip`

用途：

- 用于手动上传到 Chrome Web Store

### 生成本地测试 CRX 私钥

```bash
npm run keygen:crx
```

生成产物：

- `.local/keys/chrome-extension.pem`

用途：

- 用于本地测试或内部环境生成签名 `.crx`
- 该私钥仅建议用于测试，不应提交到仓库

### 生成签名 CRX 文件

```bash
npm run package:crx -- --key .local/keys/chrome-extension.pem
```

生成产物：

- `release/gitlab-chrome-extension-<version>.crx`

用途：

- 用于本地或内部环境分发签名扩展

如果未传 `--key`，命令会直接失败，并提示先执行 `npm run keygen:crx` 或显式传入已有 PEM 私钥。

## 在 Chrome 中加载插件

1. 执行 `npm run build`
2. 打开 `chrome://extensions`
3. 打开右上角 `Developer mode`
4. 点击 `Load unpacked`
5. 选择 [dist](/Users/mingll/Documents/SomeProject/gitlab_chrome_extension/dist) 目录
6. 确认扩展卡片正常出现，没有构建报错

这里加载的是“解压后的扩展”，使用的目录是 [dist](/Users/mingll/Documents/SomeProject/gitlab_chrome_extension/dist)，不是 `.zip` 或 `.crx` 文件。

## 打开侧边栏

1. 在 `chrome://extensions` 找到该插件
2. 如有需要，将插件固定到工具栏
3. 点击插件图标，或从 Chrome 的 Side Panel 入口打开
4. 保持侧边栏打开，方便联动当前 GitLab 页面进行验证

## 连接 GitLab

在侧边栏中输入：

- `GitLab 地址`
- `Token`

首次连接某个新的 GitLab 地址时，Chrome 会弹出 host permission 授权。必须允许该地址访问权限，插件才能请求 GitLab API。

## 典型使用流程

1. 输入 `GitLab 地址`
2. 输入 `Token`
3. 点击 `连接`
4. 允许 Chrome 弹出的 host permission
5. 等待仓库列表加载
6. 如果当前标签页正打开该 GitLab 的某个仓库页，插件会优先选中该仓库
7. 否则可通过仓库搜索框按名称或路径筛选目标仓库
8. 仓库列表会优先展示本地更常使用的仓库
9. 通过分支搜索框筛选分支
10. 分支列表默认按最新提交时间倒序展示，更适合发布场景快速定位活跃分支
11. 选择分支
12. 在结果汇总区复制仓库链接、分支信息或最新提交 Hash

## 手工验收清单

### 连接与授权

1. 使用全新状态打开侧边栏
2. 输入正确的 GitLab 地址和 Token
3. 点击 `连接`
4. 确认 Chrome 弹出对应 GitLab 地址的授权请求
5. 允许授权
6. 确认仓库列表正常加载

### GitLab 地址兼容性

按你的环境分别验证以下地址形式：

1. 域名：`https://gitlab.example.com`
2. IP：`http://192.168.1.10`
3. IP + 端口：`http://192.168.1.10:8080`
4. 路径前缀：`http://192.168.1.10:8080/gitlab`

### 当前标签页仓库预选

1. 先打开某个 GitLab 仓库页面
2. 使用相同 GitLab 地址连接插件
3. 确认匹配仓库会自动预选
4. 切换到非 GitLab 页面或其他域名页面
5. 确认插件显示“当前标签页与已配置的 GitLab 不匹配”，但仍可手动选择仓库

### 仓库、分支与 Hash 流程

1. 确认仓库列表中有当前用户可访问的仓库
2. 在仓库搜索框中输入名称或路径关键字
3. 手动选择一个仓库
4. 确认分支列表加载成功
5. 确认分支按最新提交时间倒序排列
6. 在分支搜索框中输入关键字筛选目标分支
7. 选择一个分支
8. 确认最新提交 Hash 会更新为该分支最新提交

### 最近使用仓库

1. 手动选择一个仓库
2. 关闭并重新打开侧边栏
3. 确认仓库下拉顶部出现 `最近使用`
4. 确认最近使用列表按 GitLab 地址隔离

### 复制功能

1. 在仓库和分支都已选中的情况下点击 `复制链接`
2. 粘贴并确认内容为 HTTP 仓库 clone URL，并带 `.git` 后缀
3. 点击 `复制分支`
4. 粘贴并确认内容为当前分支名
5. 点击 `复制 Hash`
6. 粘贴并确认内容为最新提交 Hash
7. 确认按钮会短暂变为 `已复制`

### 错误状态

1. 输入非法地址，如 `gitlab.example.com`
2. 点击 `连接`
3. 确认显示 `连接失败：GitLab 地址无效。`
4. 对一个新 GitLab 地址拒绝 Chrome 授权
5. 确认显示 `连接失败：Host permission request was denied.`
6. 输入错误 Token
7. 确认显示 GitLab API 错误提示

## 测试与构建

```bash
npm test -- --run
npm run build
```

## 发版流程

仓库现在使用单主干 `main` + `release-please` 自动维护发版流程：

1. 功能分支提交 PR 到 `main`
2. 提交信息遵循 `feat(scope): ...`、`fix(scope): ...` 这类规范格式
3. 合并到 `main` 后，GitHub Actions 会运行 `release-please`
4. `release-please` 会自动创建或更新发版 PR，并根据提交历史维护版本号与变更日志
5. 合并发版 PR 后，GitHub 会自动创建 tag、GitHub Release，并同步更新 `package.json` / `package-lock.json` 中的版本号
6. PR 合并后，GitHub 会自动删除对应的功能分支，避免远端分支长期堆积

### 分支约定

- 长期保留分支默认只有 `main`
- 日常开发使用短期分支，例如 `feat/*`、`fix/*`、`docs/*`、`chore/*`
- 主题分支合并后立即删除，不保留历史功能分支
- 当前发版模式下不再维护 `release/*` 远端分支，发布以 `release-please` 生成的发版 PR、tag 和 GitHub Release 为准

建议：

- 新功能使用 `feat(...)`
- 缺陷修复使用 `fix(...)`
- 破坏性变更使用 `!` 或 `BREAKING CHANGE:`
- `docs`、`ci`、`chore` 这类提交尽量保持准确，避免污染发版说明
