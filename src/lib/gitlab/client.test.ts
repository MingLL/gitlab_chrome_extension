import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGitLabClient } from './client';

describe('createGitLabClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetchCurrentUser calls /api/v4/user with Private-Token header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 7, username: 'alice' })
    });

    vi.stubGlobal('fetch', fetchMock);

    const client = createGitLabClient('https://gitlab.example.com/gitlab/', 'secret-token');

    await expect(client.fetchCurrentUser()).resolves.toEqual({ id: 7, username: 'alice' });
    expect(fetchMock).toHaveBeenCalledWith('https://gitlab.example.com/gitlab/api/v4/user', {
      headers: {
        'Private-Token': 'secret-token'
      }
    });
  });

  it('fetchAllProjects requests subsequent pages and stops at the first empty page', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 1,
            name: 'Alpha',
            path_with_namespace: 'group/alpha',
            web_url: 'https://gitlab.example.com/group/alpha',
            http_url_to_repo: 'https://gitlab.example.com/group/alpha.git'
          }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 2,
            name: 'Beta',
            path_with_namespace: 'group/beta',
            web_url: 'https://gitlab.example.com/group/beta'
          }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

    vi.stubGlobal('fetch', fetchMock);

    const client = createGitLabClient('https://gitlab.example.com', 'secret-token');

    await expect(client.fetchAllProjects()).resolves.toEqual([
      {
        httpCloneUrl: 'https://gitlab.example.com/group/alpha.git',
        id: 1,
        name: 'Alpha',
        pathWithNamespace: 'group/alpha',
        webUrl: 'https://gitlab.example.com/group/alpha'
      },
      {
        httpCloneUrl: 'https://gitlab.example.com/group/beta.git',
        id: 2,
        name: 'Beta',
        pathWithNamespace: 'group/beta',
        webUrl: 'https://gitlab.example.com/group/beta'
      }
    ]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://gitlab.example.com/api/v4/projects?simple=true&per_page=100&page=1',
      {
        headers: {
          'Private-Token': 'secret-token'
        }
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://gitlab.example.com/api/v4/projects?simple=true&per_page=100&page=2',
      {
        headers: {
          'Private-Token': 'secret-token'
        }
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://gitlab.example.com/api/v4/projects?simple=true&per_page=100&page=3',
      {
        headers: {
          'Private-Token': 'secret-token'
        }
      }
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('fetchBranches requests subsequent pages and stops at the first empty page', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            name: 'main',
            commit: { id: 'abc123', committed_date: '2026-03-27T09:30:00Z' }
          }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            name: 'release',
            commit: { id: 'def456', committed_date: '2026-03-26T18:00:00Z' }
          }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

    vi.stubGlobal('fetch', fetchMock);

    const client = createGitLabClient('https://gitlab.example.com/root', 'secret-token');

    await expect(client.fetchBranches(42)).resolves.toEqual([
      {
        name: 'main',
        commitId: 'abc123',
        committedDate: '2026-03-27T09:30:00Z'
      },
      {
        name: 'release',
        commitId: 'def456',
        committedDate: '2026-03-26T18:00:00Z'
      }
    ]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://gitlab.example.com/root/api/v4/projects/42/repository/branches?per_page=100&page=1',
      {
        headers: {
          'Private-Token': 'secret-token'
        }
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://gitlab.example.com/root/api/v4/projects/42/repository/branches?per_page=100&page=2',
      {
        headers: {
          'Private-Token': 'secret-token'
        }
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://gitlab.example.com/root/api/v4/projects/42/repository/branches?per_page=100&page=3',
      {
        headers: {
          'Private-Token': 'secret-token'
        }
      }
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
