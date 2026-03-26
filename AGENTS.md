# AGENTS.md

## Branch policy

Before making any code, documentation, configuration, or other repository change, you must first create and switch to a new branch related to that change.

Rules:
- do not start implementation, editing, committing, or pushing on the current branch before creating the new branch
- branch names should be concise, descriptive, and related to the task
- prefer one logical change per branch
- if the user explicitly asks to work on a specific existing branch, follow the user's instruction

## Commit policy

You must follow this commit policy for every git commit.

### 1. Commit format

All commit messages must follow this format:

<type>(<scope>): <subject>

[optional body]

[optional footer]

Rules:
- type and scope must be lowercase
- subject must be concise, specific, and written in Chinese
- do not end subject with a period
- subject should describe the actual code change, not vague intent
- one commit should contain one logical change only
- split unrelated changes into separate commits
- avoid mixing feature, refactor, fix, docs, and test changes in one commit unless absolutely necessary

### 2. Allowed types

Use only these types:

- feat: 新功能
- fix: 修复缺陷
- refactor: 重构，不改变外部行为
- perf: 性能优化
- docs: 文档修改
- test: 测试相关
- build: 构建系统、依赖、打包配置
- ci: CI/CD 配置
- chore: 杂项维护
- style: 纯格式调整，不影响逻辑
- revert: 回滚提交

### 3. Scope rules

Scope must be a short module name, for example:

- auth
- api
- user
- order
- payment
- ui
- table
- form
- build
- deps
- config

If no clear scope exists, use:
- core

Do not omit scope unless the change truly affects the whole repo and no module is appropriate.

### 4. Subject rules

Good subjects:
- feat(auth): 新增短信验证码登录
- fix(api): 修复用户详情接口空指针问题
- refactor(user): 拆分用户服务与资料转换逻辑
- test(order): 补充订单取消场景单元测试

Bad subjects:
- feat: 更新代码
- fix(user): 修复问题
- chore(core): 调整一下
- refactor(api): 优化代码结构

The subject must:
- explain what changed
- be specific enough for git log review
- avoid empty words like “优化”, “调整”, “处理”, “修改” unless followed by clear object and purpose

### 5. Body rules

Add a body when the change is not obvious.

Body should explain:
- why the change is needed
- key implementation decision
- compatibility impact if any

Body should be concise and factual.
Do not add meaningless filler text.

### 6. Footer rules

Use footers when relevant, such as:

- BREAKING CHANGE: 接口字段 userName 改为 username
- Refs: #123
- Closes: #456

### 7. Staging and commit granularity

Before committing:
- review changed files
- stage files by logical change group
- never use one commit for unrelated files
- do not use `git add .` unless all changes are part of the same logical change
- prefer multiple small reviewable commits over one large commit

### 8. Verification before commit

Before creating a commit:
- ensure the code builds
- run the smallest relevant test set
- ensure no debug logs, temporary code, or commented-out junk remain
- ensure generated files are committed only when the repo convention requires them

### 9. Forbidden commit messages

Never use these kinds of commit messages:
- update
- fix bug
- 修复
- 修改
- 调整
- 优化
- 提交代码
- 临时提交
- wip
- test
- 先这样
- again
- try
- final

### 10. Commit decision policy

When asked to commit changes, you must:
1. inspect the diff
2. split changes by logical intent
3. propose or create commit messages that fully comply with this spec
4. if changes are mixed, separate them into multiple commits
5. prefer precision over brevity

### 11. Output policy

When presenting a proposed commit message, always output it in this exact structure:

Commit message:
<type>(<scope>): <subject>

Why:
- <reason 1>
- <reason 2>

### 12. Examples

- feat(login): 新增邮箱验证码登录流程
- fix(profile): 修复头像上传后预览未刷新的问题
- refactor(api): 统一封装请求错误处理逻辑
- perf(table): 降低大数据量场景下的重复渲染
- docs(readme): 补充本地开发与构建说明
- test(payment): 增加退款回调解析测试用例
- build(vite): 调整生产环境 sourcemap 输出策略
- chore(deps): 升级 axios 到 1.9 版本

## Current recommended commit message

Commit message:
feat(ui): 增加侧边栏中文界面文案

Why:
- 侧边栏界面新增了中文标题、状态提示、复制按钮和分组标签
- README 和界面测试断言已经同步到中文文案
