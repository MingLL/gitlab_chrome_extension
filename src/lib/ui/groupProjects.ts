import type { GitLabProject, RecentProject } from '../types';

export type ProjectOption = {
  id: number;
  label: string;
  pathWithNamespace: string;
  webUrl: string;
};

export type ProjectGroup = {
  label: string;
  options: ProjectOption[];
};

export function groupProjects(
  allProjects: GitLabProject[],
  recentProjects: RecentProject[],
  baseUrl: string
): ProjectGroup[] {
  const recentForBaseUrl = recentProjects.filter((project) => project.gitlabBaseUrl === baseUrl);
  const recentIds = new Set(recentForBaseUrl.map((project) => project.projectId));
  const allProjectsById = new Map(allProjects.map((project) => [project.id, project] as const));
  const recentOptions = recentForBaseUrl.flatMap((project) => {
    const match = allProjectsById.get(project.projectId);

    if (!match) {
      return [];
    }

    return [{
      id: match.id,
      label: project.projectName,
      pathWithNamespace: match.pathWithNamespace,
      webUrl: match.webUrl
    }];
  });

  const groups: ProjectGroup[] = [];

  if (recentOptions.length > 0) {
    groups.push({
      label: 'Recent',
      options: recentOptions
    });
  }

  const allProjectOptions = allProjects
    .filter((project) => !recentIds.has(project.id))
    .map((project) => ({
      id: project.id,
      label: project.name,
      pathWithNamespace: project.pathWithNamespace,
      webUrl: project.webUrl
    }));

  if (allProjectOptions.length > 0) {
    groups.push({
      label: 'All Projects',
      options: allProjectOptions
    });
  }

  return groups;
}
