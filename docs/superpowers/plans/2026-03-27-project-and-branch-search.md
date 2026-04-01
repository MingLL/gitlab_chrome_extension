# 仓库搜索与分支活跃排序 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将仓库和分支选择从原生下拉改为“搜索框 + 结果列表”，其中仓库按本地使用习惯排序，分支按最新提交时间倒序排序。

**Architecture:** 保留现有 GitLab 拉取与配置流程，在侧边栏新增两个搜索选择组件替代原生 `select`。仓库排序由新的本地统计存储驱动，分支排序在拉取后基于最新提交时间排序，并通过独立的过滤与排序函数保证逻辑可测。

**Tech Stack:** React、TypeScript、Vite、Vitest、Chrome storage

---

### Task 1: 为仓库排序与分支排序补充纯函数测试

**Files:**
- Create: `src/lib/ui/projectSearch.test.ts`
- Create: `src/lib/ui/branchSearch.test.ts`
- Create: `src/lib/ui/projectSearch.ts`
- Create: `src/lib/ui/branchSearch.ts`
- Test: `src/lib/ui/projectSearch.test.ts`
- Test: `src/lib/ui/branchSearch.test.ts`

- [ ] **Step 1: 编写仓库排序与搜索的失败测试**

```ts
test('按当前标签匹配、使用次数和最近使用时间排序仓库', () => {
  const result = rankProjects(projects, usageStats, {
    matchedProjectId: 2,
    query: '',
  });

  expect(result.map((item) => item.id)).toEqual([2, 3, 1]);
});
```

```ts
test('仓库搜索同时匹配名称与路径', () => {
  const result = rankProjects(projects, [], { matchedProjectId: null, query: 'team/api' });
  expect(result.map((item) => item.pathWithNamespace)).toEqual(['team/api']);
});
```

- [ ] **Step 2: 编写分支按最新提交时间排序与搜索的失败测试**

```ts
test('按最新提交时间倒序排列分支', () => {
  const result = rankBranches(branches, '');
  expect(result.map((item) => item.name)).toEqual(['release/1.2.0', 'main', 'feature/login']);
});
```

```ts
test('分支搜索按名称过滤但保持时间排序', () => {
  const result = rankBranches(branches, 'release');
  expect(result.map((item) => item.name)).toEqual(['release/1.2.0']);
});
```

- [ ] **Step 3: 运行测试并确认按预期失败**

Run: `npm test -- --run src/lib/ui/projectSearch.test.ts src/lib/ui/branchSearch.test.ts`
Expected: FAIL，提示目标模块或函数尚不存在

- [ ] **Step 4: 实现最小排序与搜索纯函数**

```ts
export function rankBranches(branches: GitLabBranch[], query: string): GitLabBranch[] {
  return branches
    .filter(matchesQuery)
    .sort(compareByCommittedDateDescThenName);
}
```

- [ ] **Step 5: 运行测试并确认通过**

Run: `npm test -- --run src/lib/ui/projectSearch.test.ts src/lib/ui/branchSearch.test.ts`
Expected: PASS

- [ ] **Step 6: 提交纯函数排序逻辑**

```bash
git add src/lib/ui/projectSearch.ts src/lib/ui/projectSearch.test.ts src/lib/ui/branchSearch.ts src/lib/ui/branchSearch.test.ts
git commit -m "feat(ui): 增加仓库与分支搜索排序逻辑"
```

### Task 2: 为仓库使用统计增加本地存储能力

**Files:**
- Create: `src/lib/storage/projectUsageStorage.ts`
- Create: `src/lib/storage/projectUsageStorage.test.ts`
- Modify: `src/lib/types.ts`
- Test: `src/lib/storage/projectUsageStorage.test.ts`

- [ ] **Step 1: 编写仓库使用统计读写的失败测试**

```ts
test('记录仓库使用次数并更新时间', async () => {
  const current = [];
  const next = upsertProjectUsage(current, {
    gitlabBaseUrl: 'https://gitlab.example.com',
    projectId: 1,
    projectName: 'api',
    usedAt: '2026-03-27T10:00:00.000Z',
  });

  expect(next[0]?.useCount).toBe(1);
});
```

```ts
test('再次使用同一仓库时累计次数', () => {
  expect(next[0]?.useCount).toBe(2);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/lib/storage/projectUsageStorage.test.ts`
Expected: FAIL，提示存储模块尚未实现

- [ ] **Step 3: 实现最小存储逻辑**

```ts
export function upsertProjectUsage(records: ProjectUsageRecord[], input: UpsertProjectUsageInput) {
  // 命中同一 GitLab + projectId 时增加 useCount 并刷新 lastUsedAt
}
```

- [ ] **Step 4: 运行测试并确认通过**

Run: `npm test -- --run src/lib/storage/projectUsageStorage.test.ts`
Expected: PASS

- [ ] **Step 5: 提交仓库使用统计存储**

```bash
git add src/lib/storage/projectUsageStorage.ts src/lib/storage/projectUsageStorage.test.ts src/lib/types.ts
git commit -m "feat(storage): 增加仓库使用统计存储"
```

### Task 3: 在 GitLab 分支模型中保留最新提交时间

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/gitlab/mappers.ts`
- Modify: `src/lib/gitlab/client.test.ts`
- Test: `src/lib/gitlab/client.test.ts`

- [ ] **Step 1: 为分支映射增加提交时间字段的失败测试**

```ts
expect(branches[0]).toMatchObject({
  name: 'main',
  commitId: 'abc123',
  committedDate: '2026-03-27T09:30:00Z',
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/lib/gitlab/client.test.ts`
Expected: FAIL，提示映射结果缺少 `committedDate`

- [ ] **Step 3: 在类型与映射层实现最小变更**

```ts
export type GitLabBranch = {
  name: string;
  commitId: string;
  committedDate: string;
};
```

- [ ] **Step 4: 运行测试并确认通过**

Run: `npm test -- --run src/lib/gitlab/client.test.ts`
Expected: PASS

- [ ] **Step 5: 提交分支活跃时间字段**

```bash
git add src/lib/types.ts src/lib/gitlab/mappers.ts src/lib/gitlab/client.test.ts
git commit -m "feat(api): 增加分支最新提交时间字段"
```

### Task 4: 用自定义搜索列表替换仓库选择组件

**Files:**
- Create: `src/sidepanel/components/SearchList.tsx`
- Create: `src/sidepanel/components/SearchList.test.tsx`
- Modify: `src/sidepanel/components/ProjectSelect.tsx`
- Modify: `src/sidepanel/App.tsx`
- Modify: `src/sidepanel/app.css`
- Test: `src/sidepanel/App.test.tsx`
- Test: `src/sidepanel/components/SearchList.test.tsx`

- [ ] **Step 1: 为搜索列表基础交互编写失败测试**

```tsx
test('输入搜索词后只显示匹配项', async () => {
  render(<SearchList ... />);
  await user.type(screen.getByLabelText('仓库搜索'), 'team/api');
  expect(screen.getByText('team/api')).toBeInTheDocument();
  expect(screen.queryByText('team/web')).not.toBeInTheDocument();
});
```

```tsx
test('点击列表项后触发选中回调', async () => {
  await user.click(screen.getByRole('button', { name: /api/ }));
  expect(onSelect).toHaveBeenCalledWith('1');
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/sidepanel/components/SearchList.test.tsx`
Expected: FAIL，提示组件尚未实现

- [ ] **Step 3: 实现通用搜索列表组件与仓库版本接入**

```tsx
<SearchList
  label="仓库搜索"
  placeholder="搜索仓库名称或路径"
  items={rankedProjects}
  selectedValue={value}
  onSelect={onChange}
/>
```

- [ ] **Step 4: 在 `App.tsx` 中接入仓库搜索和排序**

```ts
const rankedProjects = rankProjects(projects, projectUsageRecords, {
  matchedProjectId,
  query: projectQuery,
});
```

- [ ] **Step 5: 运行相关测试并确认通过**

Run: `npm test -- --run src/sidepanel/components/SearchList.test.tsx src/sidepanel/App.test.tsx`
Expected: PASS

- [ ] **Step 6: 提交仓库搜索列表组件**

```bash
git add src/sidepanel/components/SearchList.tsx src/sidepanel/components/SearchList.test.tsx src/sidepanel/components/ProjectSelect.tsx src/sidepanel/App.tsx src/sidepanel/app.css src/sidepanel/App.test.tsx
git commit -m "feat(ui): 增加仓库搜索与列表选择交互"
```

### Task 5: 用自定义搜索列表替换分支选择组件

**Files:**
- Modify: `src/sidepanel/components/BranchSelect.tsx`
- Modify: `src/sidepanel/App.tsx`
- Modify: `src/sidepanel/app.css`
- Test: `src/sidepanel/App.test.tsx`

- [ ] **Step 1: 为分支搜索与时间排序编写失败测试**

```tsx
test('分支按最新提交时间倒序展示', async () => {
  render(<App />);
  expect(getBranchButtons()).toEqual(['release/1.2.0', 'main', 'feature/login']);
});
```

```tsx
test('搜索分支时只过滤匹配结果', async () => {
  await user.type(screen.getByLabelText('分支搜索'), 'release');
  expect(screen.getByRole('button', { name: /release\/1.2.0/ })).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: FAIL，仅因分支搜索交互尚未完成而失败

- [ ] **Step 3: 接入分支排序与搜索**

```ts
const rankedBranches = rankBranches(branches, branchQuery);
```

- [ ] **Step 4: 在分支列表项中展示最新提交时间**

```tsx
<span>{formatCommittedDate(branch.committedDate)}</span>
```

- [ ] **Step 5: 运行测试并确认通过**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: PASS

- [ ] **Step 6: 提交分支搜索与活跃排序**

```bash
git add src/sidepanel/components/BranchSelect.tsx src/sidepanel/App.tsx src/sidepanel/app.css src/sidepanel/App.test.tsx
git commit -m "feat(ui): 增加分支搜索与活跃时间排序"
```

### Task 6: 在应用层接入仓库使用统计

**Files:**
- Modify: `src/sidepanel/App.tsx`
- Modify: `src/lib/storage/projectUsageStorage.ts`
- Test: `src/sidepanel/App.test.tsx`

- [ ] **Step 1: 为选中仓库后写入使用统计补充失败测试**

```tsx
test('手动选择仓库后记录本地使用次数', async () => {
  await user.click(screen.getByRole('button', { name: /api/ }));
  expect(saveProjectUsage).toHaveBeenCalled();
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: FAIL，提示尚未调用仓库使用统计存储

- [ ] **Step 3: 在 `handleProjectChange` 与自动匹配路径中接入统计更新**

```ts
const nextUsage = upsertProjectUsage(currentUsage, {
  gitlabBaseUrl: config.baseUrl,
  projectId: project.id,
  projectName: project.name,
  usedAt: new Date().toISOString(),
});
```

- [ ] **Step 4: 运行测试并确认通过**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交应用层统计接入**

```bash
git add src/sidepanel/App.tsx src/lib/storage/projectUsageStorage.ts src/sidepanel/App.test.tsx
git commit -m "feat(core): 接入仓库使用统计与排序"
```

### Task 7: 更新 README 与回归验证

**Files:**
- Modify: `README.md`
- Test: `src/sidepanel/App.test.tsx`
- Test: `src/lib/ui/projectSearch.test.ts`
- Test: `src/lib/ui/branchSearch.test.ts`

- [ ] **Step 1: 更新 README 中的仓库与分支选择说明**

补充以下内容：

- 仓库支持按名称和路径搜索
- 仓库按本地使用频率优先展示
- 分支支持按名称搜索
- 分支按最新提交时间排序，更适合发布场景

- [ ] **Step 2: 运行完整测试**

Run: `npm test -- --run`
Expected: PASS

- [ ] **Step 3: 运行构建**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: 检查工作区与格式问题**

Run: `git diff --check`
Expected: 无格式错误

- [ ] **Step 5: 提交文档与收尾**

```bash
git add README.md
git commit -m "docs(readme): 补充仓库搜索与分支排序说明"
```
