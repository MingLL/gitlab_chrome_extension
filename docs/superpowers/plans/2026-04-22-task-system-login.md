# 任务系统登录与未完成任务列表 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Chrome 插件侧边栏中新增任务系统配置、自动登录与未完成任务列表，让用户无需离开插件即可拉取并选择自己的开发任务。

**Architecture:** 复用当前侧边栏单页面结构，在 `App.tsx` 中接入新的任务系统状态编排。新增独立的任务系统 client 和存储模块，负责验证码、登录、token 兼容头与任务查询；UI 侧通过独立组件渲染配置表单、任务列表和已选任务摘要，并将“未完成任务过滤”封装为可测试的纯函数。

**Tech Stack:** React、TypeScript、Chrome Extensions Manifest V3、Vitest、Testing Library

---

### Task 1: 定义任务系统类型与映射边界

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/task-system/types.ts`
- Create: `src/lib/task-system/mappers.ts`
- Create: `src/lib/task-system/mappers.test.ts`
- Test: `src/lib/task-system/mappers.test.ts`

- [ ] **Step 1: 编写任务对象映射与未完成过滤的失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { filterIncompleteTasks, mapTaskSummary } from './mappers';

describe('task-system mappers', () => {
  it('maps raw task fields into stable task summary fields', () => {
    expect(
      mapTaskSummary({
        id: 101,
        proposalid: 'P-001',
        proposalname: '上线核心服务',
        proposaltype: 'deploy',
        proposalstatusdetail: '开发中',
        system: 'trade',
        env: 'test',
        taskjobid: 'JOB-9',
        testmanager: 'alice',
        starttime: '2026-04-22 10:00:00',
        endtime: '2026-04-22 12:00:00',
        completed: '0'
      })
    ).toEqual({
      id: '101',
      proposalId: 'P-001',
      proposalName: '上线核心服务',
      proposalType: 'deploy',
      proposalStatusDetail: '开发中',
      system: 'trade',
      env: 'test',
      taskJobId: 'JOB-9',
      testManager: 'alice',
      startTime: '2026-04-22 10:00:00',
      endTime: '2026-04-22 12:00:00',
      completed: '0'
    });
  });

  it('filters out completed tasks', () => {
    expect(
      filterIncompleteTasks([
        { id: '1', proposalName: 'A', completed: '0' },
        { id: '2', proposalName: 'B', completed: '1' }
      ] as never)
    ).toEqual([{ id: '1', proposalName: 'A', completed: '0' }]);
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/lib/task-system/mappers.test.ts`
Expected: FAIL，提示任务系统映射模块尚未实现

- [ ] **Step 3: 增加独立任务系统类型与最小映射实现**

```ts
export type TaskSystemTaskResponse = {
  id: string | number;
  proposalid?: string;
  proposalname?: string;
  proposaltype?: string;
  proposalstatusdetail?: string;
  system?: string;
  env?: string;
  taskjobid?: string;
  testmanager?: string;
  starttime?: string;
  endtime?: string;
  completed?: string | number | boolean | null;
};

export function mapTaskSummary(task: TaskSystemTaskResponse): TaskSummary {
  return {
    id: String(task.id),
    proposalId: task.proposalid ?? '',
    proposalName: task.proposalname ?? '',
    proposalType: task.proposaltype ?? '',
    proposalStatusDetail: task.proposalstatusdetail ?? '',
    system: task.system ?? '',
    env: task.env ?? '',
    taskJobId: task.taskjobid ?? '',
    testManager: task.testmanager ?? '',
    startTime: task.starttime ?? '',
    endTime: task.endtime ?? '',
    completed: task.completed ?? null
  };
}
```

- [ ] **Step 4: 实现独立的未完成过滤函数**

```ts
export function isCompletedTask(task: Pick<TaskSummary, 'completed'>): boolean {
  return task.completed === true || task.completed === 1 || task.completed === '1';
}

export function filterIncompleteTasks(tasks: TaskSummary[]): TaskSummary[] {
  return tasks.filter((task) => !isCompletedTask(task));
}
```

- [ ] **Step 5: 运行测试并确认通过**

Run: `npm test -- --run src/lib/task-system/mappers.test.ts`
Expected: PASS

- [ ] **Step 6: 提交类型与映射基础**

```bash
git add src/lib/types.ts src/lib/task-system/types.ts src/lib/task-system/mappers.ts src/lib/task-system/mappers.test.ts
git commit -m "feat(core): 增加任务系统任务映射模型"
```

### Task 2: 为任务系统配置存储补测试与实现

**Files:**
- Create: `src/lib/storage/taskSystemConfigStorage.ts`
- Create: `src/lib/storage/taskSystemConfigStorage.test.ts`
- Modify: `src/test/setup.ts`
- Test: `src/lib/storage/taskSystemConfigStorage.test.ts`

- [ ] **Step 1: 编写任务系统配置存储的失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { loadTaskSystemConfig, saveTaskSystemConfig } from './taskSystemConfigStorage';

describe('task system config storage', () => {
  it('loads saved task system config', async () => {
    chrome.storage.local.get.mockResolvedValueOnce({
      taskSystemConfig: {
        baseUrl: 'http://10.254.239.10:10086',
        loginName: 'liminglei',
        loginPwd: 'secret'
      }
    });

    await expect(loadTaskSystemConfig()).resolves.toEqual({
      baseUrl: 'http://10.254.239.10:10086',
      loginName: 'liminglei',
      loginPwd: 'secret'
    });
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/lib/storage/taskSystemConfigStorage.test.ts`
Expected: FAIL，提示任务系统配置存储模块尚未实现

- [ ] **Step 3: 实现任务系统配置存储**

```ts
export const TASK_SYSTEM_CONFIG_KEY = 'taskSystemConfig';

export async function loadTaskSystemConfig(): Promise<TaskSystemCredentials | null> {
  const stored = await chrome.storage.local.get(TASK_SYSTEM_CONFIG_KEY);
  return stored[TASK_SYSTEM_CONFIG_KEY] ?? null;
}

export async function saveTaskSystemConfig(config: TaskSystemCredentials): Promise<void> {
  await chrome.storage.local.set({ [TASK_SYSTEM_CONFIG_KEY]: config });
}
```

- [ ] **Step 4: 在测试环境中确认 `chrome.storage.local` mock 可覆盖新 key**

```ts
beforeEach(() => {
  chrome.storage.local.get.mockResolvedValue({});
});
```

- [ ] **Step 5: 运行测试并确认通过**

Run: `npm test -- --run src/lib/storage/taskSystemConfigStorage.test.ts`
Expected: PASS

- [ ] **Step 6: 提交任务系统配置存储**

```bash
git add src/lib/storage/taskSystemConfigStorage.ts src/lib/storage/taskSystemConfigStorage.test.ts src/test/setup.ts
git commit -m "feat(config): 增加任务系统配置存储"
```

### Task 3: 为任务系统 client 编写失败测试并实现验证码、登录、查任务链路

**Files:**
- Create: `src/lib/task-system/errors.ts`
- Create: `src/lib/task-system/client.ts`
- Create: `src/lib/task-system/client.test.ts`
- Test: `src/lib/task-system/client.test.ts`

- [ ] **Step 1: 编写验证码、登录与任务查询的失败测试**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createTaskSystemClient } from './client';

describe('task system client', () => {
  it('fetches verification code and logs in with realcode', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { uuid: 'vc-1', realcode: '5007' }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { xaccessToken: 'token-123' }
        })
      });

    vi.stubGlobal('fetch', fetchMock);

    const client = createTaskSystemClient('http://10.254.239.10:10086');
    await expect(
      client.login({ loginName: 'liminglei', loginPwd: 'secret' })
    ).resolves.toEqual({ token: 'token-123' });
  });

  it('queries my dev tasks with both token header and cookie', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { list: [], pageNum: 1, pageSize: 18, total: 0, pages: 0 }
      })
    });

    vi.stubGlobal('fetch', fetchMock);

    const client = createTaskSystemClient('http://10.254.239.10:10086');
    await client.queryMyDevTasks({ token: 'token-123' });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://10.254.239.10:10086/task/page/querymydevtask',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Access-Token': 'token-123',
          Cookie: 'token=token-123'
        })
      })
    );
  });
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/lib/task-system/client.test.ts`
Expected: FAIL，提示任务系统 client 尚未实现

- [ ] **Step 3: 实现统一请求错误类型**

```ts
export class TaskSystemRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string
  ) {
    super(`任务系统请求失败：${path} (${status})`);
  }
}
```

- [ ] **Step 4: 实现验证码、登录与查询 client**

```ts
export function createTaskSystemClient(baseUrl: string) {
  async function fetchVerificationCode() { /* GET /session/verificationCode */ }
  async function login(credentials: Pick<TaskSystemCredentials, 'loginName' | 'loginPwd'>) {
    const verification = await fetchVerificationCode();
    return requestLogin({
      code: verification.realcode,
      codeUuid: verification.uuid,
      loginName: credentials.loginName,
      loginPwd: credentials.loginPwd
    });
  }

  async function queryMyDevTasks(session: TaskSystemSession) {
    return requestTaskPage('/task/page/querymydevtask', session.token, DEFAULT_TASK_QUERY_BODY);
  }

  return { login, queryMyDevTasks };
}
```

- [ ] **Step 5: 实现“一次重登录后重试查询”的入口方法**

```ts
async function loginAndQueryMyDevTasks(credentials: TaskSystemCredentials) {
  const session = await login(credentials);

  try {
    return await queryMyDevTasks(session);
  } catch (error) {
    const nextSession = await login(credentials);
    return queryMyDevTasks(nextSession);
  }
}
```

- [ ] **Step 6: 运行测试并确认通过**

Run: `npm test -- --run src/lib/task-system/client.test.ts`
Expected: PASS

- [ ] **Step 7: 提交任务系统 client**

```bash
git add src/lib/task-system/errors.ts src/lib/task-system/client.ts src/lib/task-system/client.test.ts
git commit -m "feat(core): 增加任务系统登录与查询客户端"
```

### Task 4: 在侧边栏接入任务系统配置表单

**Files:**
- Create: `src/sidepanel/components/TaskSystemForm.tsx`
- Modify: `src/sidepanel/App.tsx`
- Modify: `src/sidepanel/app.css`
- Modify: `src/sidepanel/App.test.tsx`
- Test: `src/sidepanel/App.test.tsx`

- [ ] **Step 1: 编写任务系统配置加载与输入的失败测试**

```tsx
test('loads saved task system credentials into the side panel form', async () => {
  vi.spyOn(taskSystemConfigStorage, 'loadTaskSystemConfig').mockResolvedValue({
    baseUrl: 'http://10.254.239.10:10086',
    loginName: 'liminglei',
    loginPwd: 'secret'
  });

  render(<App />);

  expect(await screen.findByLabelText('任务系统地址')).toHaveValue('http://10.254.239.10:10086');
  expect(screen.getByLabelText('登录账号')).toHaveValue('liminglei');
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: FAIL，提示任务系统表单尚未渲染

- [ ] **Step 3: 新增 `TaskSystemForm` 组件并接入 `App.tsx`**

```tsx
<TaskSystemForm
  baseUrl={taskSystemBaseUrl}
  loginName={taskSystemLoginName}
  loginPwd={taskSystemLoginPwd}
  isLoading={isLoadingTasks}
  onBaseUrlChange={setTaskSystemBaseUrl}
  onLoginNameChange={setTaskSystemLoginName}
  onLoginPwdChange={setTaskSystemLoginPwd}
  onRefresh={handleRefreshTasks}
/>
```

- [ ] **Step 4: 在初始化逻辑中加载任务系统配置**

```ts
const [storedConfig, storedTaskSystemConfig] = await Promise.all([
  loadConfig(),
  loadTaskSystemConfig()
]);
```

- [ ] **Step 5: 为任务系统表单补充基础样式**

```css
.task-system-section {
  display: grid;
  gap: 12px;
}
```

- [ ] **Step 6: 运行相关测试并确认通过**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: PASS，且能看到任务系统输入区域

- [ ] **Step 7: 提交侧边栏任务系统配置表单**

```bash
git add src/sidepanel/components/TaskSystemForm.tsx src/sidepanel/App.tsx src/sidepanel/app.css src/sidepanel/App.test.tsx
git commit -m "feat(ui): 增加任务系统配置表单"
```

### Task 5: 在侧边栏接入刷新任务、未完成列表与选中任务摘要

**Files:**
- Create: `src/sidepanel/components/TaskList.tsx`
- Create: `src/sidepanel/components/SelectedTaskSummary.tsx`
- Modify: `src/sidepanel/App.tsx`
- Modify: `src/sidepanel/app.css`
- Modify: `src/sidepanel/App.test.tsx`
- Test: `src/sidepanel/App.test.tsx`

- [ ] **Step 1: 编写刷新任务成功渲染与任务选择的失败测试**

```tsx
test('refreshes my incomplete tasks and lets the user choose one', async () => {
  vi.spyOn(taskSystemConfigStorage, 'loadTaskSystemConfig').mockResolvedValue({
    baseUrl: 'http://10.254.239.10:10086',
    loginName: 'liminglei',
    loginPwd: 'secret'
  });
  vi.spyOn(taskSystemClient, 'createTaskSystemClient').mockReturnValue({
    loginAndQueryMyDevTasks: vi.fn().mockResolvedValue([
      {
        id: '101',
        proposalName: '上线核心服务',
        taskJobId: 'JOB-9',
        env: 'test',
        system: 'trade',
        startTime: '2026-04-22 10:00:00',
        endTime: '2026-04-22 12:00:00',
        completed: '0'
      }
    ])
  } as never);

  render(<App />);
  await user.click(await screen.findByRole('button', { name: '刷新任务' }));
  await user.click(await screen.findByRole('button', { name: /上线核心服务/i }));

  expect(await screen.findByText('当前任务')).toBeInTheDocument();
  expect(screen.getByText('JOB-9')).toBeInTheDocument();
});
```

- [ ] **Step 2: 编写空列表和错误提示的失败测试**

```tsx
test('shows empty state when no incomplete tasks are returned', async () => {
  vi.spyOn(taskSystemClient, 'createTaskSystemClient').mockReturnValue({
    loginAndQueryMyDevTasks: vi.fn().mockResolvedValue([])
  } as never);

  render(<App />);
  await user.click(await screen.findByRole('button', { name: '刷新任务' }));

  expect(await screen.findByText('当前没有未完成任务。')).toBeInTheDocument();
});
```

- [ ] **Step 3: 运行测试并确认失败**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: FAIL，提示刷新任务交互与列表尚未实现

- [ ] **Step 4: 在 `App.tsx` 中实现刷新任务编排**

```ts
async function handleRefreshTasks() {
  setTaskErrorMessage(null);
  setIsLoadingTasks(true);

  try {
    const credentials = { baseUrl: taskSystemBaseUrl, loginName: taskSystemLoginName, loginPwd: taskSystemLoginPwd };
    await saveTaskSystemConfig(credentials);
    const client = createTaskSystemClient(credentials.baseUrl);
    const tasks = await client.loginAndQueryMyDevTasks(credentials);
    setTasks(filterIncompleteTasks(tasks));
  } catch (error) {
    setTaskErrorMessage(getErrorMessage(error));
  } finally {
    setIsLoadingTasks(false);
  }
}
```

- [ ] **Step 5: 新增任务列表与已选任务摘要组件**

```tsx
<TaskList
  tasks={tasks}
  selectedTaskId={selectedTaskId}
  onSelectTask={setSelectedTaskId}
/>
<SelectedTaskSummary task={selectedTask} />
```

- [ ] **Step 6: 为列表和摘要补充必要样式**

```css
.task-list {
  display: grid;
  gap: 8px;
}
```

- [ ] **Step 7: 运行相关测试并确认通过**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: PASS

- [ ] **Step 8: 提交任务列表交互**

```bash
git add src/sidepanel/components/TaskList.tsx src/sidepanel/components/SelectedTaskSummary.tsx src/sidepanel/App.tsx src/sidepanel/app.css src/sidepanel/App.test.tsx
git commit -m "feat(ui): 增加未完成任务列表与选择摘要"
```

### Task 6: 补齐集成验证与回归测试

**Files:**
- Modify: `src/sidepanel/App.test.tsx`
- Modify: `src/lib/task-system/client.test.ts`
- Modify: `src/lib/task-system/mappers.test.ts`
- Test: `src/lib/task-system/client.test.ts`
- Test: `src/lib/task-system/mappers.test.ts`
- Test: `src/lib/storage/taskSystemConfigStorage.test.ts`
- Test: `src/sidepanel/App.test.tsx`

- [ ] **Step 1: 增加认证失败、查询失败与重试分支测试**

```ts
it('retries task query once after re-login when the first query fails', async () => {
  // first login ok -> first task query throws -> second login ok -> second task query ok
});
```

- [ ] **Step 2: 增加侧边栏错误提示回归测试**

```tsx
test('shows login failure message when task refresh fails', async () => {
  vi.spyOn(taskSystemClient, 'createTaskSystemClient').mockReturnValue({
    loginAndQueryMyDevTasks: vi.fn().mockRejectedValue(new Error('登录失败：账号或密码错误'))
  } as never);

  render(<App />);
  await user.click(await screen.findByRole('button', { name: '刷新任务' }));

  expect(await screen.findByText('登录失败：账号或密码错误')).toBeInTheDocument();
});
```

- [ ] **Step 3: 运行最小相关测试集**

Run: `npm test -- --run src/lib/task-system/mappers.test.ts src/lib/storage/taskSystemConfigStorage.test.ts src/lib/task-system/client.test.ts src/sidepanel/App.test.tsx`
Expected: PASS

- [ ] **Step 4: 运行完整测试集确认无回归**

Run: `npm test -- --run`
Expected: PASS

- [ ] **Step 5: 运行构建验证**

Run: `npm run build`
Expected: PASS，生成 `dist/`

- [ ] **Step 6: 提交最终整合与测试更新**

```bash
git add src/lib/task-system src/lib/storage/taskSystemConfigStorage.ts src/lib/storage/taskSystemConfigStorage.test.ts src/sidepanel/App.tsx src/sidepanel/components src/sidepanel/app.css src/lib/types.ts
git commit -m "feat(ui): 增加任务系统登录与未完成任务列表"
```
