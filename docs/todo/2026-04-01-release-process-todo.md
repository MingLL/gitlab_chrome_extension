# 发布流程 TODO List

基于当前仓库状态与“高频迭代项目 GitHub 发布流程”目标的差距，整理出下面这份待办清单。

## 当前已完成

- [x] 默认分支使用 `main`
- [x] 接入 `release-please` 自动维护 release PR
- [x] 增加 `pull_request -> main` 与 `push -> main` 的最小 CI
- [x] 具备基础测试与构建脚本：`npm test -- --run`、`npm run build`

## P0：尽快补齐

- [ ] 在 GitHub 仓库设置中开启 `main` 的 branch protection
  目标：禁止直接 push，要求 PR review，并要求 CI checks 通过后才能 merge

- [ ] 确认 `release-please` 首次运行结果
  目标：验证 release PR、tag、GitHub Release、`package.json` / `package-lock.json` 版本更新是否符合预期

- [ ] 为 `release-please` workflow 增加 `concurrency`
  目标：避免同一时间多个发布流程并发执行

- [ ] 为 CI 增加依赖缓存命中与失败可见性检查
  目标：确认 `npm ci`、测试、构建在 GitHub Actions 上稳定通过

## P1：发布链路补齐

- [ ] 新增 `merge-main.yml`
  目标：在 `push -> main` 后构建正式候选产物并上传 artifact

- [ ] 固化发布产物
  目标：将 `.zip` / `.crx` 构建产物与 tag 或 release 绑定，确保同一版本对应唯一 artifact

- [ ] 设计并接入 `staging` 环境流程
  目标：支持候选版本自动部署与验证，而不是直接面向生产

- [ ] 为 `production` 环境增加 required reviewers
  目标：实现“自动准备 + 人工确认 + 自动发布”

- [ ] 增加最小 smoke test
  目标：在构建后或部署后验证核心流程可用，至少覆盖插件构建产物与关键页面行为

## P2：稳定性与回滚能力

- [ ] 增加发布后验证 workflow
  目标：在发布完成后自动执行健康检查、关键路径检查和结果回写

- [ ] 定义回滚策略
  目标：明确 `latest stable`、`previous stable`、`current deployed` 三个状态和回滚入口

- [ ] 设计预发布版本策略
  目标：是否启用 `alpha` / `beta` / `rc` 通道，以及对应的 tag 规则

- [ ] 优化 release notes 结构
  目标：让发布说明更适合测试、产品和运维阅读，而不只是提交列表

- [ ] 接入发布通知
  目标：将发布结果同步到 PR、GitHub Release 或团队通知渠道

## 后续建议顺序

1. 先完成 GitHub 仓库侧保护规则和 `release-please` 首次验证
2. 再补 `merge-main.yml`、artifact 固化和 `staging`
3. 最后补并发控制、生产审批、回滚和发布后验证
