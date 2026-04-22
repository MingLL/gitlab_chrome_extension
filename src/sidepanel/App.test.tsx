import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import manifest from '../../manifest.config';
import packageJson from '../../package.json';
import * as configStorage from '../lib/storage/configStorage';
import { loadConfig, requestHostPermission, saveConfig } from '../lib/storage/configStorage';
import * as recentProjectsStorage from '../lib/storage/recentProjectsStorage';
import * as projectUsageStorage from '../lib/storage/projectUsageStorage';
import { loadRecentProjects, saveRecentProjects } from '../lib/storage/recentProjectsStorage';
import { App } from './App';

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

async function findProjectSelect() {
  return (await screen.findByRole('combobox', { name: '仓库选择' })) as HTMLSelectElement;
}

async function findBranchSelect() {
  return (await screen.findByRole('combobox', { name: '分支选择' })) as HTMLSelectElement;
}

async function expectSelectedProject(projectId: string, projectName: string) {
  expect(await findProjectSelect()).toHaveValue(projectId);
  expect(screen.getAllByText(projectName).length).toBeGreaterThan(0);
}

async function expectSelectedBranch(branchName: string) {
  expect(await findBranchSelect()).toHaveValue(branchName);
  expect(screen.getAllByText(branchName).length).toBeGreaterThan(0);
}

async function selectProject(projectId: string) {
  await userEvent.selectOptions(await findProjectSelect(), projectId);
}

function mockGitLabConnectSequence(input?: {
  projects?: Array<{
    id: number;
    name: string;
    path_with_namespace: string;
    web_url: string;
    http_url_to_repo?: string;
  }>;
  branchResponses?: Array<Array<{ name: string; commit: { id: string; committed_date?: string } }>>;
}) {
  const projects = input?.projects ?? [
    {
      id: 1,
      name: 'Alpha',
      path_with_namespace: 'group/alpha',
      web_url: 'https://gitlab.example.com/group/alpha',
      http_url_to_repo: 'https://gitlab.example.com/group/alpha.git',
    },
  ];
  const branchResponses = input?.branchResponses ?? [[{
    name: 'main',
    commit: { id: 'abcdef123456', committed_date: '2026-03-27T09:30:00Z' }
  }]];
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

async function connectApp(input?: {
  recentProjects?: Array<{
    gitlabBaseUrl: string;
    projectId: number;
    projectName: string;
    lastUsedAt: string;
  }>;
}) {
  vi.spyOn(recentProjectsStorage, 'loadRecentProjects').mockResolvedValue(
    input?.recentProjects ?? [
      {
        gitlabBaseUrl: 'https://gitlab.example.com',
        projectId: 1,
        projectName: 'Alpha',
        lastUsedAt: '2026-03-30T09:30:00.000Z'
      }
    ]
  );
  render(<App />);

  await userEvent.type(screen.getByLabelText(/gitlab 地址/i), 'https://gitlab.example.com');
  await userEvent.type(screen.getByLabelText(/token/i), 'secret');
  await userEvent.click(screen.getByRole('button', { name: '连接' }));

  await findProjectSelect();
}

afterEach(() => {
  cleanup();
});

describe('manifest configuration', () => {
  it('uses Manifest V3 side panel settings', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toContain('sidePanel');
    expect(manifest.permissions).toContain('scripting');
    expect(manifest.minimum_chrome_version).toBe('114');
  });

  it('uses the package version for the extension manifest', () => {
    expect(manifest.version).toBe(packageJson.version);
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
    vi.spyOn(projectUsageStorage, 'loadProjectUsage').mockResolvedValue([]);
    vi.spyOn(projectUsageStorage, 'saveProjectUsage').mockResolvedValue(undefined);
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

    expect(screen.getByLabelText(/gitlab 地址/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/token/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '仓库' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '分支' })).toBeInTheDocument();
    expect(screen.getByText('Hash 信息')).toBeInTheDocument();
    expect(screen.getByText('尚未配置，请输入 GitLab 地址和 Token 后连接。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '一键填入' })).toBeDisabled();
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

    await userEvent.type(screen.getByLabelText(/gitlab 地址/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: '连接' }));

    expect(await screen.findByText('正在连接 GitLab...')).toBeInTheDocument();
    expect(screen.getByText('正在加载仓库...')).toBeInTheDocument();

    pendingProjectsResponse.resolve({
      ok: true,
      json: async () => [],
    });

    expect(await screen.findByText('当前账号下没有可访问的仓库。')).toBeInTheDocument();
  });

  it('shows a connection error when the GitLab token is invalid', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab 地址/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'bad-token');
    await userEvent.click(screen.getByRole('button', { name: '连接' }));

    expect(
      await screen.findByText('连接失败：GitLab request failed with status 401 for /user')
    ).toBeInTheDocument();
  });

  it('shows a controlled error when the GitLab base URL is invalid', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab 地址/i), 'gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: '连接' }));

    expect(await screen.findByText('连接失败：GitLab 地址无效。')).toBeInTheDocument();
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

    await userEvent.type(screen.getByLabelText(/gitlab 地址/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: '连接' }));

    expect(await screen.findByText('当前账号下没有可访问的仓库。')).toBeInTheDocument();
    expect(callOrder[0]).toBe('permission');
    expect(callOrder[1]).toContain('fetch:https://gitlab.example.com/api/v4/user');
  });

  it('shows a connection error and skips GitLab fetches when host permission is denied before first connect', async () => {
    vi.mocked(configStorage.requestHostPermission).mockRejectedValueOnce(new Error('Host permission request was denied.'));
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab 地址/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: '连接' }));

    expect(await screen.findByText('连接失败：Host permission request was denied.')).toBeInTheDocument();
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

    await userEvent.type(screen.getByLabelText(/gitlab 地址/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: '连接' }));

    expect(await screen.findByText('当前标签页与已配置的 GitLab 不匹配，请手动选择仓库。')).toBeInTheDocument();
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
      branchResponses: [[{ name: 'main', commit: { id: 'abcdef123456', committed_date: '2026-03-27T09:30:00Z' } }]],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://example.com/outside-gitlab' } as chrome.tabs.Tab,
    ]);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab 地址/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: '连接' }));

    expect(await screen.findByText('当前标签页与已配置的 GitLab 不匹配，请手动选择仓库。')).toBeInTheDocument();

    await selectProject('1');

    await expectSelectedBranch('main');
    expect(screen.queryByText('当前标签页与已配置的 GitLab 不匹配，请手动选择仓库。')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '清空仓库选择' }));

    expect(await screen.findByText('当前标签页与已配置的 GitLab 不匹配，请手动选择仓库。')).toBeInTheDocument();
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

    await userEvent.type(screen.getByLabelText(/gitlab 地址/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: '连接' }));

    expect(await findProjectSelect()).toBeInTheDocument();

    await selectProject('1');

    expect(await screen.findByText('正在加载分支...')).toBeInTheDocument();

    pendingBranchResponse.resolve({
      ok: true,
      json: async () => [],
    });

    expect(await screen.findByText('当前仓库下没有分支。')).toBeInTheDocument();
  });

  it('does not preselect the current tab project when there is no recent project', async () => {
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
      branchResponses: [[{ name: 'main', commit: { id: 'abcdef123456', committed_date: '2026-03-27T09:30:00Z' } }]],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab
    ]);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab 地址/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: '连接' }));

    expect(await findProjectSelect()).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: '分支选择' })).not.toBeInTheDocument();
    expect(screen.getByText('请先选择仓库后再加载分支。')).toBeInTheDocument();
    expect(screen.getAllByText('尚未加载')).toHaveLength(3);
  });

  it('stores a manually selected project in recent projects', async () => {
    const saveRecentProjectsSpy = vi.mocked(recentProjectsStorage.saveRecentProjects);
    const saveProjectUsageSpy = vi.mocked(projectUsageStorage.saveProjectUsage);
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
      branchResponses: [[{ name: 'release', commit: { id: 'fedcba654321', committed_date: '2026-03-27T09:30:00Z' } }]],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://gitlab.example.com/group/other' } as chrome.tabs.Tab
    ]);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab 地址/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: '连接' }));
    await selectProject('2');

    expect(saveRecentProjectsSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          gitlabBaseUrl: 'https://gitlab.example.com',
          projectId: 2,
          projectName: 'Beta'
        })
      ])
    );
    expect(saveProjectUsageSpy).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          gitlabBaseUrl: 'https://gitlab.example.com',
          projectId: 2,
          projectName: 'Beta',
          useCount: 1
        })
      ])
    );
  });

  it('renders branches in latest-commit order and supports search filtering', async () => {
    mockGitLabConnectSequence({
      projects: [
        {
          id: 1,
          name: 'Alpha',
          path_with_namespace: 'group/alpha',
          web_url: 'https://gitlab.example.com/group/alpha',
        }
      ],
      branchResponses: [[
        { name: 'feature/login', commit: { id: 'aaa111', committed_date: '2026-03-24T10:00:00Z' } },
        { name: 'release/1.2.0', commit: { id: 'ccc333', committed_date: '2026-03-27T09:00:00Z' } },
        { name: 'main', commit: { id: 'bbb222', committed_date: '2026-03-26T12:00:00Z' } }
      ]],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab,
    ]);

    await connectApp();

    const branchSelect = await findBranchSelect();
    const branchOptions = Array.from(branchSelect.options).map((option) => option.text);
    expect(branchOptions).toEqual(['release/1.2.0', 'main', 'feature/login']);

    await userEvent.type(screen.getByLabelText('分支搜索'), 'release');

    expect(await findBranchSelect()).toHaveValue('release/1.2.0');
    expect(Array.from((await findBranchSelect()).options).map((option) => option.text)).toEqual(['release/1.2.0']);
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
        json: async () => [{ name: 'main', commit: { id: 'abcdef123456', committed_date: '2026-03-27T09:30:00Z' } }],
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
        json: async () => [{ name: 'main', commit: { id: 'abcdef123456', committed_date: '2026-03-27T09:30:00Z' } }],
      });
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab
    ]);
    vi.spyOn(recentProjectsStorage, 'loadRecentProjects').mockResolvedValue([
      {
        gitlabBaseUrl: 'https://gitlab.example.com',
        projectId: 1,
        projectName: 'Alpha',
        lastUsedAt: '2026-03-30T09:30:00.000Z'
      }
    ]);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab 地址/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: '连接' }));

    await expectSelectedProject('1', 'Alpha');
    await expectSelectedBranch('main');
    expect(screen.getByText('abcdef123456')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '连接' }));

    expect(await screen.findByText('连接失败：Host permission request was denied.')).toBeInTheDocument();
    await expectSelectedProject('1', 'Alpha');
    await expectSelectedBranch('main');
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
        json: async () => [{ name: 'main', commit: { id: 'abcdef123456', committed_date: '2026-03-27T09:30:00Z' } }],
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
    vi.spyOn(recentProjectsStorage, 'loadRecentProjects').mockResolvedValue([
      {
        gitlabBaseUrl: 'https://gitlab.example.com',
        projectId: 1,
        projectName: 'Alpha',
        lastUsedAt: '2026-03-30T09:30:00.000Z'
      }
    ]);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab 地址/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: '连接' }));

    await expectSelectedProject('1', 'Alpha');
    expect(saveConfigSpy).toHaveBeenCalledTimes(1);
    expect(saveConfigSpy).toHaveBeenLastCalledWith({ baseUrl: 'https://gitlab.example.com', token: 'secret' });

    await userEvent.clear(screen.getByLabelText(/gitlab 地址/i));
    await userEvent.type(screen.getByLabelText(/gitlab 地址/i), 'https://bad.example.com');
    await userEvent.clear(screen.getByLabelText(/token/i));
    await userEvent.type(screen.getByLabelText(/token/i), 'bad-token');
    await userEvent.click(screen.getByRole('button', { name: '连接' }));

    expect(
      await screen.findByText('连接失败：GitLab request failed with status 401 for /user')
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
        json: async () => [{ name: 'main', commit: { id: 'abcdef123456', committed_date: '2026-03-27T09:30:00Z' } }],
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
    vi.spyOn(recentProjectsStorage, 'loadRecentProjects').mockResolvedValue([
      {
        gitlabBaseUrl: 'https://gitlab.example.com',
        projectId: 1,
        projectName: 'Alpha',
        lastUsedAt: '2026-03-30T09:30:00.000Z'
      }
    ]);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab 地址/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: '连接' }));

    await expectSelectedProject('1', 'Alpha');
    await expectSelectedBranch('main');
    expect(screen.getByText('abcdef123456')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '连接' }));

    expect(await screen.findByText('连接失败：Branch lookup failed.')).toBeInTheDocument();
    await expectSelectedProject('1', 'Alpha');
    await expectSelectedBranch('main');
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
        json: async () => [{ name: 'main', commit: { id: 'abcdef123456', committed_date: '2026-03-27T09:30:00Z' } }],
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
    vi.spyOn(recentProjectsStorage, 'loadRecentProjects').mockResolvedValue([
      {
        gitlabBaseUrl: 'https://gitlab.example.com',
        projectId: 1,
        projectName: 'Alpha',
        lastUsedAt: '2026-03-30T09:30:00.000Z'
      }
    ]);

    render(<App />);

    await userEvent.type(screen.getByLabelText(/gitlab 地址/i), 'https://gitlab.example.com');
    await userEvent.type(screen.getByLabelText(/token/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: '连接' }));

    await expectSelectedProject('1', 'Alpha');
    await expectSelectedBranch('main');
    expect(screen.getByText('abcdef123456')).toBeInTheDocument();

    await selectProject('2');

    expect(await screen.findByText('Branch lookup failed.')).toBeInTheDocument();
    await expectSelectedProject('1', 'Alpha');
    await expectSelectedBranch('main');
    expect(screen.getByText('abcdef123456')).toBeInTheDocument();
  });

  it('copies the project web url from the result summary', async () => {
    mockGitLabConnectSequence({
      projects: [
        {
          id: 1,
          name: 'Alpha',
          path_with_namespace: 'group/alpha',
          web_url: 'https://gitlab.example.com/group/alpha',
          http_url_to_repo: 'https://gitlab.example.com/group/alpha.git',
        },
      ],
      branchResponses: [[{ name: 'main', commit: { id: 'abcdef123456', committed_date: '2026-03-27T09:30:00Z' } }]],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab,
    ]);

    await connectApp();
    await userEvent.click(screen.getByRole('button', { name: '复制链接' }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://gitlab.example.com/group/alpha.git');
  });

  it('copies the project clone url without the .git suffix from the result summary', async () => {
    mockGitLabConnectSequence({
      projects: [
        {
          id: 1,
          name: 'Alpha',
          path_with_namespace: 'group/alpha',
          web_url: 'https://gitlab.example.com/group/alpha',
          http_url_to_repo: 'https://gitlab.example.com/group/alpha.git',
        },
      ],
      branchResponses: [[{ name: 'main', commit: { id: 'abcdef123456', committed_date: '2026-03-27T09:30:00Z' } }]],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab,
    ]);

    await connectApp();
    await userEvent.click(screen.getByRole('button', { name: '复制无 .git 链接' }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://gitlab.example.com/group/alpha');
  });

  it('copies the selected branch from the result summary', async () => {
    mockGitLabConnectSequence({
      branchResponses: [[{ name: 'main', commit: { id: 'abcdef123456', committed_date: '2026-03-27T09:30:00Z' } }]],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab,
    ]);

    await connectApp();
    await userEvent.click(screen.getByRole('button', { name: '复制分支' }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('main');
  });

  it('copies the latest commit hash from the result summary', async () => {
    mockGitLabConnectSequence({
      branchResponses: [[{ name: 'main', commit: { id: 'abcdef123456', committed_date: '2026-03-27T09:30:00Z' } }]],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab,
    ]);

    await connectApp();
    await userEvent.click(screen.getByRole('button', { name: '复制 Hash' }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('abcdef123456');
  });

  it('shows copy feedback after copying a field', async () => {
    mockGitLabConnectSequence({
      branchResponses: [[{ name: 'main', commit: { id: 'abcdef123456', committed_date: '2026-03-27T09:30:00Z' } }]],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab,
    ]);
    await connectApp();
    await userEvent.click(screen.getByRole('button', { name: '复制链接' }));

    expect(await screen.findByRole('button', { name: '已复制' })).toBeInTheDocument();

    await new Promise((resolve) => window.setTimeout(resolve, 1600));

    expect(screen.getByRole('button', { name: '复制链接' })).toBeInTheDocument();
  });

  it('autofill button stays disabled until repository, branch, and hash are ready', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: '一键填入' })).toBeDisabled();
  });

  it('injects the release form autofill script into the active tab', async () => {
    mockGitLabConnectSequence({
      projects: [
        {
          id: 1,
          name: 'Alpha',
          path_with_namespace: 'group/alpha',
          web_url: 'https://gitlab.example.com/group/alpha',
          http_url_to_repo: 'https://gitlab.example.com/group/alpha.git',
        },
      ],
      branchResponses: [[{ name: 'main', commit: { id: 'abcdef123456', committed_date: '2026-03-27T09:30:00Z' } }]],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { id: 7, url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab,
    ]);
    vi.mocked(chrome.scripting.executeScript).mockResolvedValue([
      { result: { ok: true } } as chrome.scripting.InjectionResult<{ ok: true }>
    ]);

    await connectApp();
    await userEvent.click(screen.getByRole('button', { name: '一键填入' }));

    expect(chrome.scripting.executeScript).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('已填入 git 链接、分支和 hash')).toBeInTheDocument();
  });

  it('shows the detailed autofill failure reason when injection fails', async () => {
    mockGitLabConnectSequence({
      projects: [
        {
          id: 1,
          name: 'Alpha',
          path_with_namespace: 'group/alpha',
          web_url: 'https://gitlab.example.com/group/alpha',
          http_url_to_repo: 'https://gitlab.example.com/group/alpha.git',
        },
      ],
      branchResponses: [[{ name: 'main', commit: { id: 'abcdef123456', committed_date: '2026-03-27T09:30:00Z' } }]],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { id: 7, url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab,
    ]);
    vi.mocked(chrome.scripting.executeScript).mockResolvedValue([
      {
        result: { ok: false, reason: '定位发布表单字段失败：未找到仓库类型下拉框' }
      } as chrome.scripting.InjectionResult<{ ok: false; reason: string }>
    ]);

    await connectApp();
    await userEvent.click(screen.getByRole('button', { name: '一键填入' }));

    expect(await screen.findByText('自动填入失败：定位发布表单字段失败：未找到仓库类型下拉框')).toBeInTheDocument();
  });

  it('shows a clear message when script injection throws', async () => {
    mockGitLabConnectSequence({
      projects: [
        {
          id: 1,
          name: 'Alpha',
          path_with_namespace: 'group/alpha',
          web_url: 'https://gitlab.example.com/group/alpha',
          http_url_to_repo: 'https://gitlab.example.com/group/alpha.git',
        },
      ],
      branchResponses: [[{ name: 'main', commit: { id: 'abcdef123456', committed_date: '2026-03-27T09:30:00Z' } }]],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { id: 7, url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab,
    ]);
    vi.mocked(chrome.scripting.executeScript).mockRejectedValue(new Error('Cannot access contents of the page'));

    await connectApp();
    await userEvent.click(screen.getByRole('button', { name: '一键填入' }));

    expect(
      await screen.findByText('自动填入失败：向页面注入脚本时出错：Cannot access contents of the page')
    ).toBeInTheDocument();
  });

  it('clears the autofill status after switching to another project', async () => {
    mockGitLabConnectSequence({
      projects: [
        {
          id: 1,
          name: 'Alpha',
          path_with_namespace: 'group/alpha',
          web_url: 'https://gitlab.example.com/group/alpha',
          http_url_to_repo: 'https://gitlab.example.com/group/alpha.git',
        },
        {
          id: 2,
          name: 'Beta',
          path_with_namespace: 'group/beta',
          web_url: 'https://gitlab.example.com/group/beta',
          http_url_to_repo: 'https://gitlab.example.com/group/beta.git',
        }
      ],
      branchResponses: [
        [{ name: 'main', commit: { id: 'abcdef123456', committed_date: '2026-03-27T09:30:00Z' } }],
        [{ name: 'release', commit: { id: 'fedcba654321', committed_date: '2026-03-28T09:30:00Z' } }]
      ],
    });
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { id: 7, url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab,
    ]);
    vi.mocked(chrome.scripting.executeScript).mockResolvedValue([
      { result: { ok: true } } as chrome.scripting.InjectionResult<{ ok: true }>
    ]);

    await connectApp();
    await userEvent.click(screen.getByRole('button', { name: '一键填入' }));

    expect(await screen.findByText('已填入 git 链接、分支和 hash')).toBeInTheDocument();
    await selectProject('2');

    await expectSelectedBranch('release');
    expect(screen.queryByText('已填入 git 链接、分支和 hash')).not.toBeInTheDocument();
  });

  it('preselects the most recently used project when the current tab does not match', async () => {
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
      branchResponses: [[{ name: 'release', commit: { id: 'fedcba654321', committed_date: '2026-03-28T09:30:00Z' } }]],
    });
    vi.spyOn(recentProjectsStorage, 'loadRecentProjects').mockResolvedValue([
      {
        gitlabBaseUrl: 'https://gitlab.example.com',
        projectId: 2,
        projectName: 'Beta',
        lastUsedAt: '2026-03-30T09:30:00.000Z'
      }
    ]);
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://example.com/outside-gitlab' } as chrome.tabs.Tab,
    ]);

    await connectApp({
      recentProjects: [
        {
          gitlabBaseUrl: 'https://gitlab.example.com',
          projectId: 2,
          projectName: 'Beta',
          lastUsedAt: '2026-03-30T09:30:00.000Z'
        }
      ]
    });

    await expectSelectedProject('2', 'Beta');
    await expectSelectedBranch('release');
    expect(screen.getByText('fedcba654321')).toBeInTheDocument();
  });

  it('preselects the most recently used project even when the current tab matches another project', async () => {
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
      branchResponses: [[{ name: 'release', commit: { id: 'fedcba654321', committed_date: '2026-03-28T09:30:00Z' } }]],
    });
    vi.spyOn(recentProjectsStorage, 'loadRecentProjects').mockResolvedValue([
      {
        gitlabBaseUrl: 'https://gitlab.example.com',
        projectId: 2,
        projectName: 'Beta',
        lastUsedAt: '2026-03-30T09:30:00.000Z'
      }
    ]);
    vi.mocked(chrome.tabs.query).mockResolvedValue([
      { url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab,
    ]);

    await connectApp({
      recentProjects: [
        {
          gitlabBaseUrl: 'https://gitlab.example.com',
          projectId: 2,
          projectName: 'Beta',
          lastUsedAt: '2026-03-30T09:30:00.000Z'
        }
      ]
    });

    await expectSelectedProject('2', 'Beta');
    await expectSelectedBranch('release');
    expect(screen.getByText('fedcba654321')).toBeInTheDocument();
  });
});
