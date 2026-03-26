export class GitLabRequestError extends Error {
  readonly status: number;

  constructor(status: number, path: string) {
    super(`GitLab request failed with status ${status} for ${path}`);
    this.name = 'GitLabRequestError';
    this.status = status;
  }
}
