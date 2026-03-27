import { describe, expect, test } from 'vitest';

import type { GitLabProject, ProjectUsageRecord } from '../types';
import { rankProjects } from './projectSearch';

const projects: GitLabProject[] = [
  {
    id: 1,
    name: 'Web Portal',
    pathWithNamespace: 'team/web-portal',
    webUrl: 'https://gitlab.example.com/team/web-portal',
    httpCloneUrl: 'https://gitlab.example.com/team/web-portal.git'
  },
  {
    id: 2,
    name: 'API Service',
    pathWithNamespace: 'team/api-service',
    webUrl: 'https://gitlab.example.com/team/api-service',
    httpCloneUrl: 'https://gitlab.example.com/team/api-service.git'
  },
  {
    id: 3,
    name: 'Release Tool',
    pathWithNamespace: 'ops/release-tool',
    webUrl: 'https://gitlab.example.com/ops/release-tool',
    httpCloneUrl: 'https://gitlab.example.com/ops/release-tool.git'
  }
];

const usage: ProjectUsageRecord[] = [
  {
    gitlabBaseUrl: 'https://gitlab.example.com',
    projectId: 1,
    projectName: 'Web Portal',
    lastUsedAt: '2026-03-26T10:00:00.000Z',
    useCount: 2
  },
  {
    gitlabBaseUrl: 'https://gitlab.example.com',
    projectId: 3,
    projectName: 'Release Tool',
    lastUsedAt: '2026-03-27T10:00:00.000Z',
    useCount: 4
  }
];

describe('rankProjects', () => {
  test('按当前标签匹配、使用次数和最近使用时间排序仓库', () => {
    const result = rankProjects(projects, usage, {
      matchedProjectId: 2,
      query: '',
      baseUrl: 'https://gitlab.example.com'
    });

    expect(result.map((item) => item.id)).toEqual([2, 3, 1]);
  });

  test('仓库搜索同时匹配名称与路径', () => {
    const result = rankProjects(projects, usage, {
      matchedProjectId: null,
      query: 'team/api',
      baseUrl: 'https://gitlab.example.com'
    });

    expect(result.map((item) => item.pathWithNamespace)).toEqual(['team/api-service']);
  });
});
