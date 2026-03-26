import { describe, expect, it } from 'vitest';
import { upsertRecentProject } from './recentProjectsStorage';

describe('upsertRecentProject', () => {
  it('moves an existing project to the front and updates its lastUsedAt', () => {
    const existing = [
      {
        gitlabBaseUrl: 'https://gitlab.example.com',
        projectId: 1,
        projectName: 'Alpha',
        lastUsedAt: '2024-01-01T00:00:00.000Z',
      },
      {
        gitlabBaseUrl: 'https://gitlab.example.com',
        projectId: 2,
        projectName: 'Beta',
        lastUsedAt: '2024-01-02T00:00:00.000Z',
      },
    ];

    const next = upsertRecentProject(existing, {
      gitlabBaseUrl: 'https://gitlab.example.com',
      projectId: 1,
      projectName: 'Alpha',
      lastUsedAt: '2024-01-03T00:00:00.000Z',
    });

    expect(next).toEqual([
      {
        gitlabBaseUrl: 'https://gitlab.example.com',
        projectId: 1,
        projectName: 'Alpha',
        lastUsedAt: '2024-01-03T00:00:00.000Z',
      },
      {
        gitlabBaseUrl: 'https://gitlab.example.com',
        projectId: 2,
        projectName: 'Beta',
        lastUsedAt: '2024-01-02T00:00:00.000Z',
      },
    ]);
  });

  it('keeps only the eight most recently used projects', () => {
    const existing = Array.from({ length: 8 }, (_, index) => ({
      gitlabBaseUrl: 'https://gitlab.example.com',
      projectId: index + 1,
      projectName: `Project ${index + 1}`,
      lastUsedAt: `2024-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
    }));

    const next = upsertRecentProject(existing, {
      gitlabBaseUrl: 'https://gitlab.example.com',
      projectId: 9,
      projectName: 'Project 9',
      lastUsedAt: '2024-02-01T00:00:00.000Z',
    });

    expect(next).toHaveLength(8);
    expect(next[0]).toMatchObject({ projectId: 9 });
    expect(next.map((project) => project.projectId)).toEqual([9, 8, 7, 6, 5, 4, 3, 2]);
  });
});
