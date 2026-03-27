import type { GitLabProject, ProjectUsageRecord } from '../types';

type RankProjectsOptions = {
  matchedProjectId: number | null;
  query: string;
  baseUrl: string;
};

function normalizeQuery(query: string): string {
  return query.trim().toLocaleLowerCase();
}

function matchesProject(project: GitLabProject, query: string): boolean {
  if (query === '') {
    return true;
  }

  const normalizedName = project.name.toLocaleLowerCase();
  const normalizedPath = project.pathWithNamespace.toLocaleLowerCase();

  return normalizedName.includes(query) || normalizedPath.includes(query);
}

export function rankProjects(
  projects: GitLabProject[],
  usageRecords: ProjectUsageRecord[],
  options: RankProjectsOptions
): GitLabProject[] {
  const normalizedQuery = normalizeQuery(options.query);
  const usageById = new Map(
    usageRecords
      .filter((record) => record.gitlabBaseUrl === options.baseUrl)
      .map((record) => [record.projectId, record] as const)
  );

  return projects
    .filter((project) => matchesProject(project, normalizedQuery))
    .slice()
    .sort((left, right) => {
      const leftMatched = left.id === options.matchedProjectId;
      const rightMatched = right.id === options.matchedProjectId;

      if (leftMatched !== rightMatched) {
        return leftMatched ? -1 : 1;
      }

      const leftUsage = usageById.get(left.id);
      const rightUsage = usageById.get(right.id);
      const leftCount = leftUsage?.useCount ?? 0;
      const rightCount = rightUsage?.useCount ?? 0;

      if (rightCount !== leftCount) {
        return rightCount - leftCount;
      }

      const leftLastUsed = leftUsage ? new Date(leftUsage.lastUsedAt).getTime() : 0;
      const rightLastUsed = rightUsage ? new Date(rightUsage.lastUsedAt).getTime() : 0;

      if (rightLastUsed !== leftLastUsed) {
        return rightLastUsed - leftLastUsed;
      }

      return left.name.localeCompare(right.name);
    });
}
