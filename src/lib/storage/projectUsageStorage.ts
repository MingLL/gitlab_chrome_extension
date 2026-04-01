import type { ProjectUsageRecord } from '../types';

export const PROJECT_USAGE_KEY = 'projectUsage';

type ProjectUsageStorageRecord = Partial<Record<typeof PROJECT_USAGE_KEY, ProjectUsageRecord[]>>;

type UpsertProjectUsageInput = {
  gitlabBaseUrl: string;
  projectId: number;
  projectName: string;
  usedAt: string;
};

function getProjectUsageKey(record: Pick<ProjectUsageRecord, 'gitlabBaseUrl' | 'projectId'>): string {
  return `${record.gitlabBaseUrl}::${record.projectId}`;
}

export function upsertProjectUsage(
  existing: ProjectUsageRecord[],
  input: UpsertProjectUsageInput
): ProjectUsageRecord[] {
  const recordKey = getProjectUsageKey(input);
  const nextRecords = existing.map((record) => ({ ...record }));
  const existingIndex = nextRecords.findIndex((record) => getProjectUsageKey(record) === recordKey);

  if (existingIndex === -1) {
    return [
      {
        gitlabBaseUrl: input.gitlabBaseUrl,
        projectId: input.projectId,
        projectName: input.projectName,
        lastUsedAt: input.usedAt,
        useCount: 1
      },
      ...nextRecords
    ];
  }

  const current = nextRecords[existingIndex];

  nextRecords[existingIndex] = {
    ...current,
    projectName: input.projectName,
    lastUsedAt: input.usedAt,
    useCount: current.useCount + 1
  };

  return nextRecords.sort((left, right) => {
    if (right.useCount !== left.useCount) {
      return right.useCount - left.useCount;
    }

    return new Date(right.lastUsedAt).getTime() - new Date(left.lastUsedAt).getTime();
  });
}

export async function loadProjectUsage(): Promise<ProjectUsageRecord[]> {
  const stored = (await chrome.storage.local.get(PROJECT_USAGE_KEY)) as ProjectUsageStorageRecord;

  return stored[PROJECT_USAGE_KEY] ?? [];
}

export async function saveProjectUsage(records: ProjectUsageRecord[]): Promise<void> {
  await chrome.storage.local.set({ [PROJECT_USAGE_KEY]: records });
}
