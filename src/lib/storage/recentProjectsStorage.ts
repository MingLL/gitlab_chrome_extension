import type { RecentProject } from '../types';

export const RECENT_LIMIT = 8;
export const RECENT_PROJECTS_KEY = 'recentProjects';

type RecentProjectsStorageRecord = Partial<Record<typeof RECENT_PROJECTS_KEY, RecentProject[]>>;

function getRecentProjectKey(project: RecentProject): string {
  return `${project.gitlabBaseUrl}::${project.projectId}`;
}

function isNewerProject(candidate: RecentProject, current: RecentProject): boolean {
  return new Date(candidate.lastUsedAt).getTime() > new Date(current.lastUsedAt).getTime();
}

export function upsertRecentProject(existing: RecentProject[], next: RecentProject): RecentProject[] {
  const deduped = new Map<string, RecentProject>();

  for (const project of [...existing, next]) {
    const key = getRecentProjectKey(project);
    const current = deduped.get(key);

    if (!current || isNewerProject(project, current)) {
      deduped.set(key, project);
    }
  }

  return Array.from(deduped.values())
    .sort((left, right) => new Date(right.lastUsedAt).getTime() - new Date(left.lastUsedAt).getTime())
    .slice(0, RECENT_LIMIT);
}

export async function loadRecentProjects(): Promise<RecentProject[]> {
  const storedProjects = (await chrome.storage.local.get(RECENT_PROJECTS_KEY)) as RecentProjectsStorageRecord;

  return storedProjects[RECENT_PROJECTS_KEY] ?? [];
}

export async function saveRecentProjects(projects: RecentProject[]): Promise<void> {
  await chrome.storage.local.set({ [RECENT_PROJECTS_KEY]: projects });
}
