# 发布表单一键填入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Chrome 插件侧边栏新增“一键填入”能力，将带 `.git` 的仓库地址、分支和最新提交 hash 自动写入当前发布平台表单，并在写入前先切换仓库类型为 `git`。

**Architecture:** 保持现有 GitLab 选择与结果汇总流程不变，在侧边栏新增触发按钮和结果提示。通过新的标签页注入桥接模块调用页面填表函数，页面函数只负责定位固定字段、先切换仓库类型，再写入 git 链接、分支和 hash，并返回结构化结果。

**Tech Stack:** React、TypeScript、Chrome Extensions Manifest V3、Vitest、Testing Library

---

### Task 1: 为页面自动填入工具编写失败测试

**Files:**
- Create: `src/lib/autofill/releaseForm.test.ts`
- Create: `src/lib/autofill/releaseForm.ts`
- Test: `src/lib/autofill/releaseForm.test.ts`

- [ ] **Step 1: 编写“先选择 git 再填字段”的失败测试**

```ts
test('先切换仓库类型为 git，再填入仓库地址、分支和 hash', () => {
  document.body.innerHTML = `
    <label>仓库类型<select><option>svn</option><option>git</option></select></label>
    <label>svn/git代码路径<input /></label>
    <label>git分支<input /></label>
    <label>svn/git修订号<input /></label>
  `;

  const result = autofillReleaseForm({
    repositoryUrl: 'https://gitlab.example.com/group/app.git',
    branch: 'release/1.0.0',
    commitHash: 'abc123456',
  });

  expect(result).toEqual({ ok: true });
  expect(screen.getByLabelText('仓库类型')).toHaveValue('git');
  expect(screen.getByLabelText('svn/git代码路径')).toHaveValue('https://gitlab.example.com/group/app.git');
});
```

- [ ] **Step 2: 编写“字段缺失时返回明确错误”的失败测试**

```ts
test('找不到 git 分支输入框时返回失败原因', () => {
  document.body.innerHTML = `
    <label>仓库类型<select><option>git</option></select></label>
    <label>svn/git代码路径<input /></label>
  `;

  expect(autofillReleaseForm(payload)).toEqual({
    ok: false,
    reason: '未找到 git分支 输入框',
  });
});
```

- [ ] **Step 3: 运行测试并确认失败**

Run: `npm test -- --run src/lib/autofill/releaseForm.test.ts`
Expected: FAIL，提示自动填入模块尚未实现

- [ ] **Step 4: 实现最小页面自动填入逻辑**

```ts
export function autofillReleaseForm(payload: ReleaseFormAutofillPayload): ReleaseFormAutofillResult {
  const repositoryTypeField = findSelectByLabel('仓库类型');
  selectOption(repositoryTypeField, 'git');
  setInputValue(findInputByLabel('svn/git代码路径'), payload.repositoryUrl);
  setInputValue(findInputByLabel('git分支'), payload.branch);
  setInputValue(findInputByLabel('svn/git修订号'), payload.commitHash);
  return { ok: true };
}
```

- [ ] **Step 5: 运行测试并确认通过**

Run: `npm test -- --run src/lib/autofill/releaseForm.test.ts`
Expected: PASS

- [ ] **Step 6: 提交页面自动填入工具**

```bash
git add src/lib/autofill/releaseForm.ts src/lib/autofill/releaseForm.test.ts
git commit -m "feat(core): 增加发布表单自动填入逻辑"
```

### Task 2: 为标签页注入桥接增加测试与实现

**Files:**
- Create: `src/lib/tabs/fillReleaseForm.ts`
- Modify: `src/test/setup.ts`
- Test: `src/sidepanel/App.test.tsx`

- [ ] **Step 1: 编写侧边栏触发注入的失败测试**

```tsx
test('点击一键填入后向当前标签页注入发布表单脚本', async () => {
  vi.mocked(chrome.scripting.executeScript).mockResolvedValue([{ result: { ok: true } }]);

  render(<App />);
  await prepareConnectedState();
  await user.click(screen.getByRole('button', { name: '一键填入' }));

  expect(chrome.scripting.executeScript).toHaveBeenCalled();
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: FAIL，提示 `chrome.scripting` mock 或注入逻辑尚未实现

- [ ] **Step 3: 实现最小桥接函数**

```ts
export async function fillReleaseFormInActiveTab(payload: ReleaseFormAutofillPayload) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id! },
    func: autofillReleaseForm,
    args: [payload],
  });
  return result;
}
```

- [ ] **Step 4: 更新测试环境中的 `chrome.scripting` mock**

```ts
globalThis.chrome.scripting = {
  executeScript: vi.fn(),
};
```

- [ ] **Step 5: 运行相关测试并确认通过**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: PASS，且新用例验证注入被调用

- [ ] **Step 6: 提交注入桥接能力**

```bash
git add src/lib/tabs/fillReleaseForm.ts src/test/setup.ts src/sidepanel/App.test.tsx
git commit -m "feat(tabs): 增加发布表单注入桥接"
```

### Task 3: 在结果汇总区接入一键填入按钮

**Files:**
- Modify: `src/sidepanel/components/ResultSummary.tsx`
- Modify: `src/sidepanel/App.tsx`
- Modify: `src/sidepanel/app.css`
- Test: `src/sidepanel/App.test.tsx`

- [ ] **Step 1: 编写按钮可用状态与成功提示的失败测试**

```tsx
test('数据未准备好时禁用一键填入按钮', async () => {
  render(
    <ResultSummary
      projectCloneUrl=""
      selectedBranchName=""
      latestCommitHash="尚未加载"
    />
  );

  expect(screen.getByRole('button', { name: '一键填入' })).toBeDisabled();
});
```

```tsx
test('一键填入成功后显示成功提示', async () => {
  vi.mocked(chrome.scripting.executeScript).mockResolvedValue([{ result: { ok: true } }]);

  render(<App />);
  await prepareConnectedState();
  await user.click(screen.getByRole('button', { name: '一键填入' }));

  expect(await screen.findByText('已填入 git 链接、分支和 hash')).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: FAIL，提示按钮或提示文案尚未实现

- [ ] **Step 3: 在结果汇总区增加“一键填入”按钮**

```tsx
<button
  type="button"
  className="button"
  disabled={!canAutofill}
  onClick={onAutofill}
>
  一键填入
</button>
```

- [ ] **Step 4: 在 `App.tsx` 中编排注入成功/失败提示**

```ts
const result = await fillReleaseFormInActiveTab({
  repositoryUrl: selectedProject.httpCloneUrl,
  branch: selectedBranchName,
  commitHash: latestCommitHash,
});

setAutofillStatusMessage(result.ok ? '已填入 git 链接、分支和 hash' : `自动填入失败：${result.reason}`);
```

- [ ] **Step 5: 运行相关测试并确认通过**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: PASS

- [ ] **Step 6: 提交侧边栏一键填入交互**

```bash
git add src/sidepanel/components/ResultSummary.tsx src/sidepanel/App.tsx src/sidepanel/app.css src/sidepanel/App.test.tsx
git commit -m "feat(ui): 增加发布表单一键填入按钮"
```

### Task 4: 补充失败分支和边界处理

**Files:**
- Modify: `src/lib/autofill/releaseForm.test.ts`
- Modify: `src/lib/autofill/releaseForm.ts`
- Modify: `src/lib/tabs/fillReleaseForm.ts`
- Modify: `src/sidepanel/App.test.tsx`
- Modify: `src/sidepanel/App.tsx`

- [ ] **Step 1: 为注入失败场景增加失败测试**

```ts
test('当前页面找不到仓库类型下拉时返回失败结果', () => {
  document.body.innerHTML = '<div>空页面</div>';
  expect(autofillReleaseForm(payload)).toEqual({
    ok: false,
    reason: '未找到仓库类型下拉框',
  });
});
```

```tsx
test('注入失败时显示具体错误信息', async () => {
  vi.mocked(chrome.scripting.executeScript).mockResolvedValue([
    { result: { ok: false, reason: '未找到仓库类型下拉框' } },
  ]);

  render(<App />);
  await prepareConnectedState();
  await user.click(screen.getByRole('button', { name: '一键填入' }));

  expect(await screen.findByText('自动填入失败：未找到仓库类型下拉框')).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/lib/autofill/releaseForm.test.ts src/sidepanel/App.test.tsx`
Expected: FAIL，提示失败路径尚未实现

- [ ] **Step 3: 在自动填入模块和桥接层补足失败保护**

```ts
if (!tab?.id) {
  return { ok: false, reason: '未找到当前活动页面' };
}
```

```ts
if (!field) {
  return { ok: false, reason: '未找到仓库类型下拉框' };
}
```

- [ ] **Step 4: 运行测试并确认通过**

Run: `npm test -- --run src/lib/autofill/releaseForm.test.ts src/sidepanel/App.test.tsx`
Expected: PASS

- [ ] **Step 5: 运行最小相关测试集**

Run: `npm test -- --run src/lib/autofill/releaseForm.test.ts src/sidepanel/App.test.tsx`
Expected: PASS，输出无新的失败

- [ ] **Step 6: 提交失败处理与边界保护**

```bash
git add src/lib/autofill/releaseForm.ts src/lib/autofill/releaseForm.test.ts src/lib/tabs/fillReleaseForm.ts src/sidepanel/App.tsx src/sidepanel/App.test.tsx
git commit -m "fix(core): 补充发布表单自动填入失败处理"
```
