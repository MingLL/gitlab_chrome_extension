import { describe, expect, test } from 'vitest';

import type { ProjectUsageRecord } from '../types';
import { upsertProjectUsage } from './projectUsageStorage';

describe('upsertProjectUsage', () => {
  test('记录仓库使用次数并更新时间', () => {
    const next = upsertProjectUsage([], {
      gitlabBaseUrl: 'https://gitlab.example.com',
      projectId: 1,
      projectName: 'api',
      usedAt: '2026-03-27T10:00:00.000Z'
    });

    expect(next).toEqual<ProjectUsageRecord[]>([
      {
        gitlabBaseUrl: 'https://gitlab.example.com',
        projectId: 1,
        projectName: 'api',
        lastUsedAt: '2026-03-27T10:00:00.000Z',
        useCount: 1
      }
    ]);
  });

  test('再次使用同一仓库时累计次数', () => {
    const current: ProjectUsageRecord[] = [
      {
        gitlabBaseUrl: 'https://gitlab.example.com',
        projectId: 1,
        projectName: 'api',
        lastUsedAt: '2026-03-26T10:00:00.000Z',
        useCount: 1
      }
    ];

    const next = upsertProjectUsage(current, {
      gitlabBaseUrl: 'https://gitlab.example.com',
      projectId: 1,
      projectName: 'api',
      usedAt: '2026-03-27T10:00:00.000Z'
    });

    expect(next[0]?.useCount).toBe(2);
    expect(next[0]?.lastUsedAt).toBe('2026-03-27T10:00:00.000Z');
  });
});
