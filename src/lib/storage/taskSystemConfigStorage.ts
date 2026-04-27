import type { TaskSystemCredentials } from '../task-system/types';

export const TASK_SYSTEM_CONFIG_KEY = 'taskSystemConfig';

type TaskSystemConfigStorageRecord = Partial<Record<typeof TASK_SYSTEM_CONFIG_KEY, TaskSystemCredentials>>;

export async function loadTaskSystemConfig(): Promise<TaskSystemCredentials | null> {
  const storedConfig = (await chrome.storage.local.get(TASK_SYSTEM_CONFIG_KEY)) as TaskSystemConfigStorageRecord;

  return storedConfig[TASK_SYSTEM_CONFIG_KEY] ?? null;
}

export async function saveTaskSystemConfig(config: TaskSystemCredentials): Promise<void> {
  await chrome.storage.local.set({ [TASK_SYSTEM_CONFIG_KEY]: config });
}
