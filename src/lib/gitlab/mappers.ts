import type { GitLabBranch, GitLabProject } from '../types';

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
    committed_date?: string;
  };
};

export function mapProject(project: GitLabProjectResponse): GitLabProject {
  return {
    id: project.id,
    name: project.name,
    pathWithNamespace: project.path_with_namespace,
    webUrl: project.web_url,
    httpCloneUrl: project.http_url_to_repo ?? `${project.web_url}.git`
  };
}

export function mapBranch(branch: GitLabBranchResponse): GitLabBranch {
  return {
    name: branch.name,
    commitId: branch.commit.id,
    committedDate: branch.commit.committed_date ?? ''
  };
}
