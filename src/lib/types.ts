export type RecentProject = {
  gitlabBaseUrl: string;
  projectId: number;
  projectName: string;
  lastUsedAt: string;
};

export type ProjectUsageRecord = {
  gitlabBaseUrl: string;
  projectId: number;
  projectName: string;
  lastUsedAt: string;
  useCount: number;
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
  httpCloneUrl: string;
};

export type GitLabBranch = {
  name: string;
  commitId: string;
  committedDate: string;
};
