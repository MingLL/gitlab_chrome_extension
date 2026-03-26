import { normalizeBaseUrl } from './normalizeBaseUrl';
import { GitLabRequestError } from './errors';
import { mapBranch, mapProject } from './mappers';
import type { GitLabBranch, GitLabProject } from '../types';

type GitLabUser = {
  id: number;
  username: string;
};

type GitLabProjectResponse = {
  id: number;
  name: string;
  path_with_namespace: string;
  web_url: string;
  http_url_to_repo?: string;
};

type GitLabBranchResponse = {
  name: string;
  commit: {
    id: string;
  };
};

export function createGitLabClient(baseUrl: string, token: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const apiBase = `${normalizedBaseUrl}/api/v4`;

  async function request<T>(path: string): Promise<T> {
    const response = await fetch(`${apiBase}${path}`, {
      headers: {
        'Private-Token': token
      }
    });

    if (!response.ok) {
      throw new GitLabRequestError(response.status, path);
    }

    return response.json() as Promise<T>;
  }

  async function requestAllPages<T>(buildPath: (page: number) => string): Promise<T[]> {
    const items: T[] = [];

    for (let page = 1; ; page += 1) {
      const pageItems = await request<T[]>(buildPath(page));

      if (pageItems.length === 0) {
        return items;
      }

      items.push(...pageItems);
    }
  }

  return {
    request,
    fetchCurrentUser() {
      return request<GitLabUser>('/user');
    },
    async fetchAllProjects(): Promise<GitLabProject[]> {
      const projects = await requestAllPages<GitLabProjectResponse>(
        (page) => `/projects?simple=true&per_page=100&page=${page}`
      );

      return projects.map(mapProject);
    },
    async fetchBranches(projectId: number): Promise<GitLabBranch[]> {
      const branches = await requestAllPages<GitLabBranchResponse>(
        (page) => `/projects/${projectId}/repository/branches?per_page=100&page=${page}`
      );

      return branches.map(mapBranch);
    }
  };
}
