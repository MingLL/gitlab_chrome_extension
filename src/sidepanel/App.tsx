import { useEffect, useRef, useState } from 'react';

import { createGitLabClient } from '../lib/gitlab/client';
import { normalizeBaseUrl } from '../lib/gitlab/normalizeBaseUrl';
import { loadConfig, requestHostPermission, saveConfig } from '../lib/storage/configStorage';
import { loadProjectUsage, saveProjectUsage, upsertProjectUsage } from '../lib/storage/projectUsageStorage';
import { loadRecentProjects, saveRecentProjects, upsertRecentProject } from '../lib/storage/recentProjectsStorage';
import { loadTaskSystemConfig, saveTaskSystemConfig } from '../lib/storage/taskSystemConfigStorage';
import { createTaskSystemClient } from '../lib/task-system/client';
import { filterIncompleteTasks } from '../lib/task-system/mappers';
import { getActiveTabUrl } from '../lib/tabs/currentTab';
import { fillReleaseFormInActiveTab } from '../lib/tabs/fillReleaseForm';
import { matchProjectPathFromTab } from '../lib/tabs/projectMatcher';
import type { GitLabBranch, GitLabConfig, GitLabProject, ProjectUsageRecord, RecentProject, TaskSummary } from '../lib/types';
import { rankBranches } from '../lib/ui/branchSearch';
import { rankProjects } from '../lib/ui/projectSearch';
import './app.css';
import { BranchSelect } from './components/BranchSelect';
import { ConnectionForm } from './components/ConnectionForm';
import { ProjectSelect } from './components/ProjectSelect';
import { ResultSummary } from './components/ResultSummary';
import { SelectedTaskSummary } from './components/SelectedTaskSummary';
import type { StatusNoticeTone } from './components/StatusNotice';
import { TaskList } from './components/TaskList';
import { TaskSystemForm } from './components/TaskSystemForm';

const EMPTY_HASH = '尚未加载';
const NOT_CONFIGURED_MESSAGE = '尚未配置，请输入 GitLab 地址和 Token 后连接。';

type CurrentTabMatchState = 'unknown' | 'matched' | 'mismatched';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '发生了未知错误。';
}

function getAutofillPrecheckMessage(params: {
  selectedProject: GitLabProject | null;
  selectedBranchName: string;
  latestCommitHash: string;
}): string | null {
  if (!params.selectedProject) {
    return '自动填入前请先选择仓库。';
  }

  if (params.selectedProject.httpCloneUrl == null || params.selectedProject.httpCloneUrl === '') {
    return '自动填入前请先拿到仓库 git 链接。';
  }

  if (params.selectedBranchName === '') {
    return '自动填入前请先选择分支。';
  }

  if (params.latestCommitHash === EMPTY_HASH) {
    return '自动填入前请先拿到最新提交 hash。';
  }

  return null;
}

function getMostRecentProjectForBaseUrl(
  projects: GitLabProject[],
  recentProjects: RecentProject[],
  baseUrl: string
): GitLabProject | null {
  for (const recentProject of recentProjects) {
    if (recentProject.gitlabBaseUrl !== baseUrl) {
      continue;
    }

    const matchedProject = projects.find((project) => project.id === recentProject.projectId);
    if (matchedProject) {
      return matchedProject;
    }
  }

  return null;
}

export function App() {
  const [baseUrl, setBaseUrl] = useState('');
  const [token, setToken] = useState('');
  const [connectedConfig, setConnectedConfig] = useState<GitLabConfig | null>(null);
  const [projects, setProjects] = useState<GitLabProject[]>([]);
  const [branches, setBranches] = useState<GitLabBranch[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedBranchName, setSelectedBranchName] = useState('');
  const [latestCommitHash, setLatestCommitHash] = useState(EMPTY_HASH);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [projectUsageRecords, setProjectUsageRecords] = useState<ProjectUsageRecord[]>([]);
  const [connectionErrorMessage, setConnectionErrorMessage] = useState<string | null>(null);
  const [branchErrorMessage, setBranchErrorMessage] = useState<string | null>(null);
  const [hasFetchedProjects, setHasFetchedProjects] = useState(false);
  const [currentTabMatchState, setCurrentTabMatchState] = useState<CurrentTabMatchState>('unknown');
  const [matchedProjectId, setMatchedProjectId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [projectQuery, setProjectQuery] = useState('');
  const [branchQuery, setBranchQuery] = useState('');
  const [autofillStatusMessage, setAutofillStatusMessage] = useState<string | null>(null);
  const [taskSystemBaseUrl, setTaskSystemBaseUrl] = useState('');
  const [taskSystemLoginName, setTaskSystemLoginName] = useState('');
  const [taskSystemLoginPwd, setTaskSystemLoginPwd] = useState('');
  const [taskSystemStatusMessage, setTaskSystemStatusMessage] = useState<string | null>(null);
  const [taskSystemStatusTone, setTaskSystemStatusTone] = useState<StatusNoticeTone>('info');
  const [isRefreshingTasks, setIsRefreshingTasks] = useState(false);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskSummary | null>(null);
  const recentProjectsRef = useRef<RecentProject[]>([]);
  const projectUsageRef = useRef<ProjectUsageRecord[]>([]);
  const hasInitializedTaskSystemConfigRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const [storedConfig, storedRecentProjects, storedProjectUsage, storedTaskSystemConfig] = await Promise.all([
          loadConfig(),
          loadRecentProjects(),
          loadProjectUsage(),
          loadTaskSystemConfig()
        ]);

        if (cancelled) {
          return;
        }

        if (storedConfig) {
          setBaseUrl(storedConfig.baseUrl);
          setToken(storedConfig.token);
          setConnectedConfig(storedConfig);
        }

        if (storedTaskSystemConfig) {
          setTaskSystemBaseUrl(storedTaskSystemConfig.baseUrl);
          setTaskSystemLoginName(storedTaskSystemConfig.loginName);
          setTaskSystemLoginPwd(storedTaskSystemConfig.loginPwd);
        }

        recentProjectsRef.current = storedRecentProjects;
        setRecentProjects(storedRecentProjects);
        projectUsageRef.current = storedProjectUsage;
        setProjectUsageRecords(storedProjectUsage);
      } catch (error) {
        if (!cancelled) {
          setConnectionErrorMessage(getErrorMessage(error));
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasInitializedTaskSystemConfigRef.current) {
      return;
    }

    void saveTaskSystemConfig({
      baseUrl: taskSystemBaseUrl,
      loginName: taskSystemLoginName,
      loginPwd: taskSystemLoginPwd
    });
  }, [taskSystemBaseUrl, taskSystemLoginName, taskSystemLoginPwd]);

  useEffect(() => {
    hasInitializedTaskSystemConfigRef.current = true;
  }, []);

  async function loadBranchesForProject(project: GitLabProject, config: GitLabConfig, persistRecent: boolean) {
    setBranchErrorMessage(null);
    setIsLoadingBranches(true);

    try {
      const client = createGitLabClient(config.baseUrl, config.token);
      const nextBranches = await client.fetchBranches(project.id);
      const initialBranch = nextBranches[0] ?? null;

      setSelectedProjectId(String(project.id));
      setBranches(nextBranches);
      setBranchQuery('');
      setSelectedBranchName(initialBranch?.name ?? '');
      setLatestCommitHash(initialBranch?.commitId ?? EMPTY_HASH);

      if (!persistRecent) {
        return;
      }

      const nextRecentProjects = upsertRecentProject(recentProjectsRef.current, {
        gitlabBaseUrl: config.baseUrl,
        projectId: project.id,
        projectName: project.name,
        lastUsedAt: new Date().toISOString()
      });

      recentProjectsRef.current = nextRecentProjects;
      setRecentProjects(nextRecentProjects);
      await saveRecentProjects(nextRecentProjects);

      const nextProjectUsage = upsertProjectUsage(projectUsageRef.current, {
        gitlabBaseUrl: config.baseUrl,
        projectId: project.id,
        projectName: project.name,
        usedAt: new Date().toISOString()
      });

      projectUsageRef.current = nextProjectUsage;
      setProjectUsageRecords(nextProjectUsage);
      await saveProjectUsage(nextProjectUsage);
    } catch (error) {
      setBranchErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoadingBranches(false);
    }
  }

  async function handleConnect() {
    setIsConnecting(true);
    setIsLoadingBranches(false);
    setConnectionErrorMessage(null);
    setBranchErrorMessage(null);
    setAutofillStatusMessage(null);

    try {
      let normalizedBaseUrl: string;

      try {
        normalizedBaseUrl = normalizeBaseUrl(baseUrl);
      } catch {
        throw new Error('GitLab 地址无效。');
      }

      const nextConfig = { baseUrl: normalizedBaseUrl, token };

      await requestHostPermission(nextConfig.baseUrl);

      const client = createGitLabClient(nextConfig.baseUrl, nextConfig.token);
      const [_, loadedProjects, activeTabUrl] = await Promise.all([
        client.fetchCurrentUser(),
        client.fetchAllProjects(),
        getActiveTabUrl()
      ]);

      const matchedPath = activeTabUrl ? matchProjectPathFromTab(activeTabUrl, nextConfig.baseUrl) : null;
      const matchedProject = matchedPath
        ? loadedProjects.find((project) => project.pathWithNamespace === matchedPath) ?? null
        : null;
      let nextSelectedProjectId = '';
      let nextBranches: GitLabBranch[] = [];
      let nextSelectedBranchName = '';
      let nextLatestCommitHash = EMPTY_HASH;
      let nextCurrentTabMatchState: CurrentTabMatchState = activeTabUrl ? 'mismatched' : 'unknown';
      let nextMatchedProjectId: number | null = null;

      const defaultProject = getMostRecentProjectForBaseUrl(loadedProjects, recentProjectsRef.current, nextConfig.baseUrl);

      if (defaultProject) {
        setIsLoadingBranches(true);

        try {
          nextBranches = await client.fetchBranches(defaultProject.id);
        } finally {
          setIsLoadingBranches(false);
        }

        const initialBranch = nextBranches[0] ?? null;
        nextSelectedProjectId = String(defaultProject.id);
        nextSelectedBranchName = initialBranch?.name ?? '';
        nextLatestCommitHash = initialBranch?.commitId ?? EMPTY_HASH;
        nextCurrentTabMatchState = matchedProject ? 'matched' : nextCurrentTabMatchState;
        nextMatchedProjectId = matchedProject?.id ?? null;

        const nextRecentProjects = upsertRecentProject(recentProjectsRef.current, {
          gitlabBaseUrl: nextConfig.baseUrl,
          projectId: defaultProject.id,
          projectName: defaultProject.name,
          lastUsedAt: new Date().toISOString()
        });

        recentProjectsRef.current = nextRecentProjects;
        setRecentProjects(nextRecentProjects);
        await saveRecentProjects(nextRecentProjects);

        const nextProjectUsage = upsertProjectUsage(projectUsageRef.current, {
          gitlabBaseUrl: nextConfig.baseUrl,
          projectId: defaultProject.id,
          projectName: defaultProject.name,
          usedAt: new Date().toISOString()
        });

        projectUsageRef.current = nextProjectUsage;
        setProjectUsageRecords(nextProjectUsage);
        await saveProjectUsage(nextProjectUsage);
      } else if (loadedProjects.length === 0) {
        nextCurrentTabMatchState = 'unknown';
      }

      await saveConfig(nextConfig);

      setBaseUrl(normalizedBaseUrl);
      setConnectedConfig(nextConfig);
      setHasFetchedProjects(true);
      setCurrentTabMatchState(nextCurrentTabMatchState);
      setMatchedProjectId(nextMatchedProjectId);
      setProjects(loadedProjects);
      setBranches(nextBranches);
      setProjectQuery('');
      setBranchQuery('');
      setSelectedProjectId(nextSelectedProjectId);
      setSelectedBranchName(nextSelectedBranchName);
      setLatestCommitHash(nextLatestCommitHash);
    } catch (error) {
      setConnectionErrorMessage(`连接失败：${getErrorMessage(error)}`);
    } finally {
      setIsLoadingBranches(false);
      setIsConnecting(false);
    }
  }

  async function handleProjectChange(projectId: string) {
    setAutofillStatusMessage(null);

    if (projectId === '') {
      setSelectedProjectId('');
      setBranches([]);
      setBranchQuery('');
      setSelectedBranchName('');
      setLatestCommitHash(EMPTY_HASH);
      setBranchErrorMessage(null);
      return;
    }

    if (!connectedConfig) {
      return;
    }

    const selectedProject = projects.find((project) => String(project.id) === projectId);
    if (!selectedProject) {
      return;
    }

    await loadBranchesForProject(selectedProject, connectedConfig, true);
  }

  function handleBranchChange(branchName: string) {
    setSelectedBranchName(branchName);
    setAutofillStatusMessage(null);

    const selectedBranch = branches.find((branch) => branch.name === branchName);
    setLatestCommitHash(selectedBranch?.commitId ?? EMPTY_HASH);
  }

  async function handleAutofill() {
    const selectedProject = projects.find((project) => String(project.id) === selectedProjectId) ?? null;
    const precheckMessage = getAutofillPrecheckMessage({
      selectedProject,
      selectedBranchName,
      latestCommitHash
    });

    if (precheckMessage) {
      setAutofillStatusMessage(precheckMessage);
      return;
    }

    setAutofillStatusMessage('正在向页面注入脚本...');

    try {
      const result = await fillReleaseFormInActiveTab({
        repositoryUrl: selectedProject.httpCloneUrl,
        branch: selectedBranchName,
        commitHash: latestCommitHash
      });

      setAutofillStatusMessage(result.ok ? '已填入 git 链接、分支和 hash' : `自动填入失败：${result.reason}`);
    } catch (error) {
      setAutofillStatusMessage(`自动填入失败：${getErrorMessage(error)}`);
    }
  }

  async function handleTaskRefresh() {
    const credentials = {
      baseUrl: taskSystemBaseUrl.trim(),
      loginName: taskSystemLoginName.trim(),
      loginPwd: taskSystemLoginPwd
    };

    if (credentials.baseUrl === '' || credentials.loginName === '' || credentials.loginPwd.trim() === '') {
      return;
    }

    setIsRefreshingTasks(true);
    setTaskSystemStatusMessage('正在刷新任务...');
    setTaskSystemStatusTone('info');

    try {
      await saveTaskSystemConfig(credentials);

      const client = createTaskSystemClient(credentials.baseUrl);
      const allTasks = await client.loginAndQueryMyDevTasks(credentials);
      const incompleteTasks = filterIncompleteTasks(allTasks);

      setTasks(incompleteTasks);
      setSelectedTask(incompleteTasks[0] ?? null);
      setTaskSystemStatusMessage(
        incompleteTasks.length === 0 ? '当前没有未完成的开发任务。' : `已刷新 ${incompleteTasks.length} 条未完成任务。`
      );
      setTaskSystemStatusTone(incompleteTasks.length === 0 ? 'warning' : 'info');
    } catch (error) {
      setTasks([]);
      setSelectedTask(null);
      setTaskSystemStatusMessage(`刷新任务失败：${getErrorMessage(error)}`);
      setTaskSystemStatusTone('error');
    } finally {
      setIsRefreshingTasks(false);
    }
  }

  const recentProjectIds = new Set(
    recentProjects
      .filter((project) => project.gitlabBaseUrl === (connectedConfig?.baseUrl ?? ''))
      .map((project) => project.projectId)
  );
  const rankedProjects = rankProjects(projects, projectUsageRecords, {
    matchedProjectId,
    query: projectQuery,
    baseUrl: connectedConfig?.baseUrl ?? ''
  }).map((project) => ({
    ...project,
    badge: recentProjectIds.has(project.id) ? '最近使用' : undefined
  }));
  const rankedBranches = rankBranches(branches, branchQuery);
  let connectionStatusMessage: string | null = null;
  let connectionStatusTone: StatusNoticeTone = 'info';
  if (connectionErrorMessage) {
    connectionStatusMessage = connectionErrorMessage;
    connectionStatusTone = 'error';
  } else if (isConnecting) {
    connectionStatusMessage = '正在连接 GitLab...';
  } else if (!connectedConfig) {
    connectionStatusMessage = NOT_CONFIGURED_MESSAGE;
    connectionStatusTone = 'warning';
  }

  let projectStatusMessage: string | null = null;
  let projectStatusTone: StatusNoticeTone = 'info';
  if (isConnecting) {
    projectStatusMessage = '正在加载仓库...';
  } else if (!connectedConfig) {
    projectStatusMessage = '尚未配置。';
    projectStatusTone = 'warning';
  } else if (!hasFetchedProjects) {
    projectStatusMessage = '请先连接后再加载仓库。';
    projectStatusTone = 'warning';
  } else if (projects.length === 0) {
    projectStatusMessage = '当前账号下没有可访问的仓库。';
    projectStatusTone = 'warning';
  } else if (selectedProjectId === '' && currentTabMatchState === 'mismatched') {
    projectStatusMessage = '当前标签页与已配置的 GitLab 不匹配，请手动选择仓库。';
    projectStatusTone = 'warning';
  }

  let branchStatusMessage: string | null = null;
  let branchStatusTone: StatusNoticeTone = 'info';
  if (branchErrorMessage) {
    branchStatusMessage = branchErrorMessage;
    branchStatusTone = 'error';
  } else if (isLoadingBranches) {
    branchStatusMessage = '正在加载分支...';
  } else if (!connectedConfig) {
    branchStatusMessage = '尚未配置。';
    branchStatusTone = 'warning';
  } else if (!hasFetchedProjects) {
    branchStatusMessage = '请先连接并加载仓库。';
    branchStatusTone = 'warning';
  } else if (selectedProjectId === '') {
    branchStatusMessage = '请先选择仓库后再加载分支。';
    branchStatusTone = 'warning';
  } else if (branches.length === 0) {
    branchStatusMessage = '当前仓库下没有分支。';
    branchStatusTone = 'warning';
  }
  const selectedProject = projects.find((project) => String(project.id) === selectedProjectId) ?? null;
  const isAutofillDisabled =
    selectedProject?.httpCloneUrl == null || selectedProject.httpCloneUrl === '' || selectedBranchName === '' || latestCommitHash === EMPTY_HASH;
  const isTaskRefreshDisabled =
    isRefreshingTasks || taskSystemBaseUrl.trim() === '' || taskSystemLoginName.trim() === '' || taskSystemLoginPwd.trim() === '';

  return (
    <main className="sidepanel">
      <header className="sidepanel__header">
        <h1>GitLab 仓库助手</h1>
        <p>连接 GitLab，选择仓库和分支，并查看最新提交信息。</p>
      </header>

      <div className="sidepanel__stack">
        <ConnectionForm
          baseUrl={baseUrl}
          token={token}
          isConnecting={isConnecting}
          onBaseUrlChange={setBaseUrl}
          onTokenChange={setToken}
          onConnect={() => {
            void handleConnect();
          }}
          statusMessage={connectionStatusMessage}
          statusTone={connectionStatusTone}
        />
        <TaskSystemForm
          baseUrl={taskSystemBaseUrl}
          loginName={taskSystemLoginName}
          loginPwd={taskSystemLoginPwd}
          isRefreshDisabled={isTaskRefreshDisabled}
          onBaseUrlChange={setTaskSystemBaseUrl}
          onLoginNameChange={setTaskSystemLoginName}
          onLoginPwdChange={setTaskSystemLoginPwd}
          onRefresh={() => {
            void handleTaskRefresh();
          }}
          statusMessage={taskSystemStatusMessage}
          statusTone={taskSystemStatusTone}
        />
        {tasks.length > 0 ? <TaskList tasks={tasks} selectedTaskId={selectedTask?.id ?? null} onSelect={setSelectedTask} /> : null}
        {tasks.length > 0 || selectedTask ? <SelectedTaskSummary task={selectedTask} /> : null}
        <ProjectSelect
          projects={rankedProjects}
          value={selectedProjectId}
          query={projectQuery}
          disabled={isConnecting || projects.length === 0}
          onQueryChange={setProjectQuery}
          onChange={(projectId) => {
            void handleProjectChange(projectId);
          }}
          statusMessage={projectStatusMessage}
          statusTone={projectStatusTone}
        />
        <BranchSelect
          branches={rankedBranches}
          value={selectedBranchName}
          query={branchQuery}
          disabled={selectedProjectId === '' || isLoadingBranches || branches.length === 0}
          onQueryChange={setBranchQuery}
          onChange={handleBranchChange}
          statusMessage={branchStatusMessage}
          statusTone={branchStatusTone}
        />
        <ResultSummary
          projectCloneUrl={selectedProject?.httpCloneUrl ?? ''}
          selectedBranchName={selectedBranchName}
          latestCommitHash={latestCommitHash}
          statusMessage={autofillStatusMessage}
          isAutofillDisabled={isAutofillDisabled}
          onAutofill={() => {
            void handleAutofill();
          }}
        />
      </div>
    </main>
  );
}
