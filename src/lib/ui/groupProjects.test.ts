import { describe, expect, it } from 'vitest';
import { groupProjects } from './groupProjects';

describe('groupProjects', () => {
  it('puts matching recent projects into a Recent group for the current base URL', () => {
    const groups = groupProjects(
      [
        { id: 1, name: 'Alpha', pathWithNamespace: 'group/alpha', webUrl: 'https://gitlab.example.com/group/alpha' },
        { id: 2, name: 'Beta', pathWithNamespace: 'group/beta', webUrl: 'https://gitlab.example.com/group/beta' }
      ],
      [
        {
          gitlabBaseUrl: 'https://gitlab.example.com',
          projectId: 2,
          projectName: 'Beta',
          lastUsedAt: '2024-01-02T00:00:00.000Z'
        },
        {
          gitlabBaseUrl: 'https://other.example.com',
          projectId: 1,
          projectName: 'Alpha',
          lastUsedAt: '2024-01-03T00:00:00.000Z'
        }
      ],
      'https://gitlab.example.com'
    );

    expect(groups).toEqual([
      {
        label: '最近使用',
        options: [{ id: 2, label: 'Beta', pathWithNamespace: 'group/beta', webUrl: 'https://gitlab.example.com/group/beta' }]
      },
      {
        label: '全部项目',
        options: [{ id: 1, label: 'Alpha', pathWithNamespace: 'group/alpha', webUrl: 'https://gitlab.example.com/group/alpha' }]
      }
    ]);
  });

  it('excludes recent projects from the All Projects group', () => {
    const groups = groupProjects(
      [
        { id: 1, name: 'Alpha', pathWithNamespace: 'group/alpha', webUrl: 'https://gitlab.example.com/group/alpha' },
        { id: 2, name: 'Beta', pathWithNamespace: 'group/beta', webUrl: 'https://gitlab.example.com/group/beta' }
      ],
      [
        {
          gitlabBaseUrl: 'https://gitlab.example.com',
          projectId: 1,
          projectName: 'Alpha',
          lastUsedAt: '2024-01-02T00:00:00.000Z'
        }
      ],
      'https://gitlab.example.com'
    );

    expect(groups).toEqual([
      {
        label: '最近使用',
        options: [{ id: 1, label: 'Alpha', pathWithNamespace: 'group/alpha', webUrl: 'https://gitlab.example.com/group/alpha' }]
      },
      {
        label: '全部项目',
        options: [{ id: 2, label: 'Beta', pathWithNamespace: 'group/beta', webUrl: 'https://gitlab.example.com/group/beta' }]
      }
    ]);
  });

  it('omits the Recent group when no recent projects resolve to allProjects entries', () => {
    const groups = groupProjects(
      [{ id: 2, name: 'Beta', pathWithNamespace: 'group/beta', webUrl: 'https://gitlab.example.com/group/beta' }],
      [
        {
          gitlabBaseUrl: 'https://gitlab.example.com',
          projectId: 1,
          projectName: 'Alpha',
          lastUsedAt: '2024-01-02T00:00:00.000Z'
        }
      ],
      'https://gitlab.example.com'
    );

    expect(groups).toEqual([
      {
        label: '全部项目',
        options: [{ id: 2, label: 'Beta', pathWithNamespace: 'group/beta', webUrl: 'https://gitlab.example.com/group/beta' }]
      }
    ]);
  });
});
