import type { GitLabBranch } from '../types';

function normalizeQuery(query: string): string {
  return query.trim().toLocaleLowerCase();
}

function matchesBranch(branch: GitLabBranch, query: string): boolean {
  if (query === '') {
    return true;
  }

  return branch.name.toLocaleLowerCase().includes(query);
}

export function rankBranches(branches: GitLabBranch[], query: string): GitLabBranch[] {
  const normalizedQuery = normalizeQuery(query);

  return branches
    .filter((branch) => matchesBranch(branch, normalizedQuery))
    .slice()
    .sort((left, right) => {
      const leftTime = new Date(left.committedDate).getTime();
      const rightTime = new Date(right.committedDate).getTime();

      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      return left.name.localeCompare(right.name);
    });
}
