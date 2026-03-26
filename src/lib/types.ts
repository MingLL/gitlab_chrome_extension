export type RecentProject = {
  gitlabBaseUrl: string;
  projectId: number;
  projectName: string;
  lastUsedAt: string;
};

export type GitLabConfig = {
  baseUrl: string;
  token: string;
};

export type GitLabProject = {
  id: number;
  name: string;
  pathWithNamespace: string;
  webUrl: string;
};

export type GitLabBranch = {
  name: string;
  commitId: string;
};
