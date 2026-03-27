import { describe, expect, test } from 'vitest';

import type { GitLabBranch } from '../types';
import { rankBranches } from './branchSearch';

const branches: GitLabBranch[] = [
  {
    name: 'feature/login',
    commitId: 'aaa111',
    committedDate: '2026-03-24T10:00:00Z'
  },
  {
    name: 'main',
    commitId: 'bbb222',
    committedDate: '2026-03-26T12:00:00Z'
  },
  {
    name: 'release/1.2.0',
    commitId: 'ccc333',
    committedDate: '2026-03-27T09:00:00Z'
  }
];

describe('rankBranches', () => {
  test('按最新提交时间倒序排列分支', () => {
    const result = rankBranches(branches, '');

    expect(result.map((item) => item.name)).toEqual(['release/1.2.0', 'main', 'feature/login']);
  });

  test('分支搜索按名称过滤但保持时间排序', () => {
    const result = rankBranches(branches, 'release');

    expect(result.map((item) => item.name)).toEqual(['release/1.2.0']);
  });
});
