import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import manifest from '../../manifest.config';
import * as configStorage from '../lib/storage/configStorage';
import { loadConfig, requestHostPermission, saveConfig } from '../lib/storage/configStorage';
import * as recentProjectsStorage from '../lib/storage/recentProjectsStorage';
import { loadRecentProjects, saveRecentProjects } from '../lib/storage/recentProjectsStorage';
import { App } from './App';

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

function mockGitLabConnectSequence(input?: {
  projects?: Array<{
    id: number;
    name: string;
    path_with_namespace: string;
    web_url: string;
  }>;
  branchResponses?: Array<Array<{ name: string; commit: { id: string } }>>;
}) {
  const projects = input?.projects ?? [
    {
      id: 1,
      name: 'Alpha',
      path_with_namespace: 'group/alpha',
      web_url: 'https://gitlab.example.com/group/alpha',
    },
  ];
  const branchResponses = input?.branchResponses ?? [[{ name: 'main', commit: { id: 'abcdef123456' } }]];
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'alice' }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => projects,
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

  for (const branches of branchResponses) {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => branches,
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
  }

  vi.stubGlobal('fetch', fetchMock);
}

async function connectApp() {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/gitlab base url/i), 'https://gitlab.example.com');
  await userEvent.type(screen.getByLabelText(/token/i), 'secret');
  await userEvent.click(screen.getByRole('button', { name: /connect/i }));

  expect(await screen.findByDisplayValue(/group\/alpha/i)).toBeInTheDocument();
}

afterEach(() => {
  cleanup();
});

describe('manifest configuration', () => {
  it('uses Manifest V3 side panel settings', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toContain('sidePanel');
    expect(manifest.minimum_chrome_version).toBe('114');
  });

  it('points the unpacked extension at the built side panel and service worker', () => {
    expect(manifest.background?.service_worker).toBe('background/service-worker.js');
    expect(manifest.side_panel?.default_path).toBe('sidepanel/index.html');
  });
});

describe('config storage', () => {
  const config = {
    baseUrl: 'https://gitlab.example.com/gitlab/',
    token: 'token-123'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads saved config from chrome.storage.local', async () => {
    const chromeStorage = chrome.storage.local;
    chromeStorage.get.mockResolvedValueOnce({ gitlabConfig: config });

    await expect(loadConfig()).resolves.toEqual(config);
    expect(chromeStorage.get).toHaveBeenCalledWith('gitlabConfig');
  });

  it('requests host permission for the normalized GitLab origin and path prefix', async () => {
    await expect(requestHostPermission('https://gitlab.example.com/gitlab/')).resolves.toBeUndefined();
    expect(chrome.permissions.request).toHaveBeenCalledWith({
      origins: ['https://gitlab.example.com/gitlab/*']
    });
  });

  it('rejects when host permission is denied', async () => {
    const chromeStorage = chrome.storage.local;
    chrome.permissions.request.mockResolvedValueOnce(false);

    await expect(requestHostPermission(config.baseUrl)).rejects.toThrow('Host permission request was denied.');
    expect(chromeStorage.set).not.toHaveBeenCalled();
  });

  it('persists the normalized config after permission has already been granted', async () => {
    const chromeStorage = chrome.storage.local;

    await expect(saveConfig(config)).resolves.toBeUndefined();
    expect(chromeStorage.set).toHaveBeenCalledWith({
      gitlabConfig: {
        baseUrl: 'https://gitlab.example.com/gitlab',
        token: 'token-123'
      }
    });
  });
});

describe('recent projects storage', () => {
  const recentProjects = [
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
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads recent projects from chrome.storage.local', async () => {
    const chromeStorage = chrome.storage.local;
    chromeStorage.get.mockResolvedValueOnce({ recentProjects });

    await expect(loadRecentProjects()).resolves.toEqual(recentProjects);
    expect(chromeStorage.get).toHaveBeenCalledWith('recentProjects');
  });

  it('saves recent projects to chrome.storage.local', async () => {
    const chromeStorage = chrome.storage.local;

    await expect(saveRecentProjects(recentProjects)).resolves.toBeUndefined();
    expect(chromeStorage.set).toHaveBeenCalledWith({ recentProjects });
  });
});

describe('side panel app shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(configStorage, 'loadConfig').mockResolvedValue(null);
    vi.spyOn(configStorage, 'requestHostPermission').mockResolvedValue(undefined);
    vi.spyOn(configStorage, 'saveConfig').mockResolvedValue(undefined);
    vi.spyOn(recentProjectsStorage, 'loadRecentProjects').mockResolvedValue([]);
    vi.spyOn(recentProjectsStorage, 'saveRecentProjects').mockResolvedValue(undefined);
    vi.mocked(chrome.tabs.query).mockResolvedValue([]);
    vi.stubGlobal('navigator', {
      ...window.navigator,
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders the stacked connection, project, branch, and latest commit sections', () => {
    render(<App />);

    expect(screen.getByLabelText(/gitlab base url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/token/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /project/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /branch/i })).toBeInTheDocument();
    expect(screen.getByText(/^latest commit hash$/i)).toBeInTheDocument();
    expect(screen.getByText('Not configured. Enter your GitLab base URL and token to connect.')).toBeInTheDocument();
  });

  it('shows connecting and loading-project status messages while a connection is in flight', async () => {
    const pendingProjectsResponse = createDeferred<{
      ok: boolean;
      json: () => Promise<Array<never>>;
    }>();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'alice' }),
      })
      .mockImplementationOnce(() => pendingProjectsResponse.promise);
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab base url/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /connect/i }));

    expect(await screen.findByText('Connecting to GitLab...')).toBeInTheDocument();
    expect(screen.getByText('Loading projects...')).toBeInTheDocument();

    pendingProjectsResponse.resolve({
      ok: true,
      json: async () => [],
    });

    expect(await screen.findByText('No accessible projects found for this account.')).toBeInTheDocument();
  });

  it('shows a connection error when the GitLab token is invalid', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab base url/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'bad-token');
    await userEvent.click(screen.getByRole('button', { name: /connect/i }));

    expect(
      await screen.findByText('Connection failed. GitLab request failed with status 401 for /user')
    ).toBeInTheDocument();
  });

  it('shows a controlled error when the GitLab base URL is invalid', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab base url/i), 'gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /connect/i }));

    expect(await screen.findByText('Connection failed. Invalid GitLab base URL.')).toBeInTheDocument();
    expect(configStorage.requestHostPermission).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requests host permission before the first GitLab API fetch', async () => {
    const callOrder: string[] = [];
    vi.mocked(configStorage.requestHostPermission).mockImplementation(async () => {
      callOrder.push('permission');
    });
    const fetchMock = vi.fn().mockImplementation(async (input: string | URL | Request) => {
      callOrder.push(`fetch:${String(input)}`);

      if (String(input).includes('/user')) {
        return {
          ok: true,
          json: async () => ({ id: 1, username: 'alice' }),
        };
      }

      return {
        ok: true,
        json: async () => [],
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab base url/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /connect/i }));

    expect(await screen.findByText('No accessible projects found for this account.')).toBeInTheDocument();
    expect(callOrder[0]).toBe('permission');
    expect(callOrder[1]).toContain('fetch:https://gitlab.example.com/api/v4/user');
  });

  it('shows a connection error and skips GitLab fetches when host permission is denied before first connect', async () => {
    vi.mocked(configStorage.requestHostPermission).mockRejectedValueOnce(new Error('Host permission request was denied.'));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab base url/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /connect/i }));

    expect(await screen.findByText('Connection failed. Host permission request was denied.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows a current-tab mismatch status when no loaded project matches the configured GitLab tab', async () => {
    mockGitLabConnectSequence({
      projects: [
        {
          id: 1,
          name: 'Alpha',
          path_with_namespace: 'group/alpha',
          web_url: 'https://gitlab.example.com/group/alpha',
        },
      ],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://example.com/outside-gitlab' } as chrome.tabs.Tab,
    ]);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab base url/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /connect/i }));

    expect(await screen.findByText('Current tab does not match the configured GitLab. Select a project manually.')).toBeInTheDocument();
  });

  it('restores the current-tab mismatch status after a manual project selection is cleared', async () => {
    mockGitLabConnectSequence({
      projects: [
        {
          id: 1,
          name: 'Alpha',
          path_with_namespace: 'group/alpha',
          web_url: 'https://gitlab.example.com/group/alpha',
        },
      ],
      branchResponses: [[{ name: 'main', commit: { id: 'abcdef123456' } }]],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://example.com/outside-gitlab' } as chrome.tabs.Tab,
    ]);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab base url/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /connect/i }));

    expect(await screen.findByText('Current tab does not match the configured GitLab. Select a project manually.')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /^project$/i }), '1');

    expect(await screen.findByDisplayValue('main')).toBeInTheDocument();
    expect(screen.queryByText('Current tab does not match the configured GitLab. Select a project manually.')).not.toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /^project$/i }), '');

    expect(await screen.findByText('Current tab does not match the configured GitLab. Select a project manually.')).toBeInTheDocument();
  });

  it('shows loading-branches and no-branches statuses for a selected project with no branches', async () => {
    const pendingBranchResponse = createDeferred<{
      ok: boolean;
      json: () => Promise<Array<never>>;
    }>();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'alice' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 1,
            name: 'Alpha',
            path_with_namespace: 'group/alpha',
            web_url: 'https://gitlab.example.com/group/alpha',
          },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockImplementationOnce(() => pendingBranchResponse.promise);
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://example.com/outside-gitlab' } as chrome.tabs.Tab,
    ]);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab base url/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /connect/i }));

    expect(await screen.findByDisplayValue('Select a project')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /^project$/i }), '1');

    expect(await screen.findByText('Loading branches...')).toBeInTheDocument();

    pendingBranchResponse.resolve({
      ok: true,
      json: async () => [],
    });

    expect(await screen.findByText('Selected project has no branches.')).toBeInTheDocument();
  });

  it('preselects the current tab project when the tab matches a loaded project', async () => {
    mockGitLabConnectSequence({
      projects: [
        {
          id: 1,
          name: 'Alpha',
          path_with_namespace: 'group/alpha',
          web_url: 'https://gitlab.example.com/group/alpha',
        },
        {
          id: 2,
          name: 'Beta',
          path_with_namespace: 'group/beta',
          web_url: 'https://gitlab.example.com/group/beta',
        }
      ],
      branchResponses: [[{ name: 'main', commit: { id: 'abcdef123456' } }]],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab
    ]);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab base url/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /connect/i }));

    expect(await screen.findByDisplayValue(/group\/alpha/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('main')).toBeInTheDocument();
    expect(screen.getByText('abcdef123456')).toBeInTheDocument();
  });

  it('stores a manually selected project in recent projects', async () => {
    const saveRecentProjectsSpy = vi.mocked(recentProjectsStorage.saveRecentProjects);
    mockGitLabConnectSequence({
      projects: [
        {
          id: 1,
          name: 'Alpha',
          path_with_namespace: 'group/alpha',
          web_url: 'https://gitlab.example.com/group/alpha',
        },
        {
          id: 2,
          name: 'Beta',
          path_with_namespace: 'group/beta',
          web_url: 'https://gitlab.example.com/group/beta',
        }
      ],
      branchResponses: [[{ name: 'release', commit: { id: 'fedcba654321' } }]],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://gitlab.example.com/group/other' } as chrome.tabs.Tab
    ]);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab base url/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /connect/i }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /^project$/i }), '2');

    expect(saveRecentProjectsSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          gitlabBaseUrl: 'https://gitlab.example.com',
          projectId: 2,
          projectName: 'Beta'
        })
      ])
    );
  });

  it('keeps the existing loaded state when a later connect attempt fails', async () => {
    vi.spyOn(configStorage, 'requestHostPermission')
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Host permission request was denied.'));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'alice' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 1,
            name: 'Alpha',
            path_with_namespace: 'group/alpha',
            web_url: 'https://gitlab.example.com/group/alpha',
          }
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: 'main', commit: { id: 'abcdef123456' } }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'alice' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 1,
            name: 'Alpha',
            path_with_namespace: 'group/alpha',
            web_url: 'https://gitlab.example.com/group/alpha',
          }
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: 'main', commit: { id: 'abcdef123456' } }],
      });
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab
    ]);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab base url/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /connect/i }));

    expect(await screen.findByDisplayValue(/group\/alpha/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('main')).toBeInTheDocument();
    expect(screen.getByText('abcdef123456')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /connect/i }));

    expect(await screen.findByText('Connection failed. Host permission request was denied.')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/group\/alpha/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('main')).toBeInTheDocument();
    expect(screen.getByText('abcdef123456')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('does not save a new config when connection validation fails', async () => {
    const saveConfigSpy = vi.mocked(configStorage.saveConfig);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'alice' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 1,
            name: 'Alpha',
            path_with_namespace: 'group/alpha',
            web_url: 'https://gitlab.example.com/group/alpha',
          }
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: 'main', commit: { id: 'abcdef123456' } }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
      });
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab
    ]);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab base url/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /connect/i }));

    expect(await screen.findByDisplayValue(/group\/alpha/i)).toBeInTheDocument();
    expect(saveConfigSpy).toHaveBeenCalledTimes(1);
    expect(saveConfigSpy).toHaveBeenLastCalledWith({ baseUrl: 'https://gitlab.example.com', token: 'secret' });

    await userEvent.clear(screen.getByLabelText(/gitlab base url/i));
    await userEvent.type(screen.getByLabelText(/gitlab base url/i), 'https://bad.example.com');
    await userEvent.clear(screen.getByLabelText(/token/i));
    await userEvent.type(screen.getByLabelText(/token/i), 'bad-token');
    await userEvent.click(screen.getByRole('button', { name: /connect/i }));

    expect(
      await screen.findByText('Connection failed. GitLab request failed with status 401 for /user')
    ).toBeInTheDocument();
    expect(saveConfigSpy).toHaveBeenCalledTimes(1);
    expect(saveConfigSpy).toHaveBeenLastCalledWith({ baseUrl: 'https://gitlab.example.com', token: 'secret' });
  });

  it('keeps the existing project, branch, and hash when matched-project branch loading fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'alice' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 1,
            name: 'Alpha',
            path_with_namespace: 'group/alpha',
            web_url: 'https://gitlab.example.com/group/alpha',
          }
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: 'main', commit: { id: 'abcdef123456' } }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'alice' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 1,
            name: 'Alpha',
            path_with_namespace: 'group/alpha',
            web_url: 'https://gitlab.example.com/group/alpha',
          }
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockRejectedValueOnce(new Error('Branch lookup failed.'));
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab
    ]);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab base url/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /connect/i }));

    expect(await screen.findByDisplayValue(/group\/alpha/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('main')).toBeInTheDocument();
    expect(screen.getByText('abcdef123456')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /connect/i }));

    expect(await screen.findByText('Connection failed. Branch lookup failed.')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/group\/alpha/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('main')).toBeInTheDocument();
    expect(screen.getByText('abcdef123456')).toBeInTheDocument();
  });

  it('keeps the previous selection and hash when a manual project switch fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'alice' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: 1,
            name: 'Alpha',
            path_with_namespace: 'group/alpha',
            web_url: 'https://gitlab.example.com/group/alpha',
          },
          {
            id: 2,
            name: 'Beta',
            path_with_namespace: 'group/beta',
            web_url: 'https://gitlab.example.com/group/beta',
          }
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: 'main', commit: { id: 'abcdef123456' } }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockRejectedValueOnce(new Error('Branch lookup failed.'));
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab
    ]);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab base url/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /connect/i }));

    expect(await screen.findByDisplayValue(/group\/alpha/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('main')).toBeInTheDocument();
    expect(screen.getByText('abcdef123456')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByRole('combobox', { name: /^project$/i }), '2');

    expect(await screen.findByText('Branch lookup failed.')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/group\/alpha/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('main')).toBeInTheDocument();
    expect(screen.getByText('abcdef123456')).toBeInTheDocument();
  });

  it('copies the project web url from the result summary', async () => {
    mockGitLabConnectSequence({
      branchResponses: [[{ name: 'main', commit: { id: 'abcdef123456' } }]],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab,
    ]);

    await connectApp();
    await userEvent.click(screen.getByRole('button', { name: /copy url/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://gitlab.example.com/group/alpha');
  });

  it('copies the selected branch from the result summary', async () => {
    mockGitLabConnectSequence({
      branchResponses: [[{ name: 'main', commit: { id: 'abcdef123456' } }]],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab,
    ]);

    await connectApp();
    await userEvent.click(screen.getByRole('button', { name: /copy branch/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('main');
  });

  it('copies the latest commit hash from the result summary', async () => {
    mockGitLabConnectSequence({
      branchResponses: [[{ name: 'main', commit: { id: 'abcdef123456' } }]],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab,
    ]);

    await connectApp();
    await userEvent.click(screen.getByRole('button', { name: /copy hash/i }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('abcdef123456');
  });

  it('shows copy feedback after copying a field', async () => {
    mockGitLabConnectSequence({
      branchResponses: [[{ name: 'main', commit: { id: 'abcdef123456' } }]],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab,
    ]);
    await connectApp();
    await userEvent.click(screen.getByRole('button', { name: /copy url/i }));

    expect(await screen.findByRole('button', { name: /^copied$/i })).toBeInTheDocument();

    await new Promise((resolve) => window.setTimeout(resolve, 1600));

    expect(screen.getByRole('button', { name: /copy url/i })).toBeInTheDocument();
  });
});
