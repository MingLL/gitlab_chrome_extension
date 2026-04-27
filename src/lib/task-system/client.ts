import { normalizeBaseUrl } from '../gitlab/normalizeBaseUrl';
import { mapTaskSummary } from './mappers';
import {
  TaskSystemRequestError,
  TaskSystemResponseError,
  TaskSystemTransportError
} from './errors';
import type {
  TaskSummary,
  TaskSystemCredentials,
  TaskSystemSession,
  TaskSystemTaskQueryBody,
  TaskSystemTaskResponse,
  TaskSystemVerificationCode
} from './types';

type TaskSystemEnvelope<T> = {
  success?: boolean;
  msg?: string;
  message?: string;
  data?: T;
};

type LoginResponse = {
  xaccessToken?: string;
};

type TaskQueryResponse = {
  list?: TaskSystemTaskResponse[];
};

export const DEFAULT_TASK_QUERY_BODY: TaskSystemTaskQueryBody = {
  startDeploytime: '',
  endDeploytime: '',
  endOnlinedate: '',
  startOnlinedate: '',
  actualName: '',
  filterType: '0',
  pageNum: 1,
  pageSize: 18,
  proposal: '',
  searchCount: true,
  taskjobid: '',
  titletype: ''
};

export function createTaskSystemClient(baseUrl: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const cookieScope = new URL(normalizedBaseUrl);

  async function syncSessionCookie(token: string): Promise<void> {
    const cookiesApi = globalThis.chrome?.cookies;

    if (!cookiesApi?.set) {
      return;
    }

    try {
      await cookiesApi.set({
        url: normalizedBaseUrl,
        name: 'token',
        value: token,
        path: cookieScope.pathname === '' ? '/' : cookieScope.pathname
      });
    } catch {
      // Keep login usable even when cookie syncing is unavailable in the current runtime.
    }
  }

  async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
    let response: Response;
    const requestInit: RequestInit = {
      credentials: 'include',
      ...init
    };

    try {
      response = await fetch(`${normalizedBaseUrl}${path}`, requestInit);
    } catch (error) {
      throw new TaskSystemTransportError(path, 'request', error);
    }

    if (!response.ok) {
      throw new TaskSystemRequestError(response.status, path);
    }

    let payload: TaskSystemEnvelope<T>;

    try {
      payload = (await response.json()) as TaskSystemEnvelope<T>;
    } catch (error) {
      throw new TaskSystemTransportError(path, 'parse', error);
    }

    if (payload.success === false) {
      throw new TaskSystemResponseError(path, payload.msg ?? payload.message ?? '接口返回失败');
    }

    if (payload.data === undefined) {
      throw new TaskSystemResponseError(path, '缺少 data 字段');
    }

    return payload.data;
  }

  async function fetchVerificationCode(): Promise<TaskSystemVerificationCode> {
    const data = await requestJson<TaskSystemVerificationCode>('/session/verificationCode', {
      method: 'GET'
    });

    if (!data.uuid || !data.realcode) {
      throw new TaskSystemResponseError('/session/verificationCode', '缺少 uuid 或 realcode');
    }

    return data;
  }

  async function login(
    credentials: Pick<TaskSystemCredentials, 'loginName' | 'loginPwd'>
  ): Promise<TaskSystemSession> {
    const verification = await fetchVerificationCode();
    const data = await requestJson<LoginResponse>('/session/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: verification.realcode,
        codeUuid: verification.uuid,
        loginName: credentials.loginName,
        loginPwd: credentials.loginPwd
      })
    });

    if (!data.xaccessToken) {
      throw new TaskSystemResponseError('/session/login', '缺少 xaccessToken');
    }

    await syncSessionCookie(data.xaccessToken);

    return { token: data.xaccessToken };
  }

  async function queryMyDevTasks(
    session: TaskSystemSession,
    body: TaskSystemTaskQueryBody = DEFAULT_TASK_QUERY_BODY
  ): Promise<TaskSummary[]> {
    await syncSessionCookie(session.token);

    const data = await requestJson<TaskQueryResponse>('/task/page/querymydevtask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Token': session.token
      },
      body: JSON.stringify(body)
    });

    return (data.list ?? []).map(mapTaskSummary);
  }

  async function loginAndQueryMyDevTasks(
    credentials: TaskSystemCredentials
  ): Promise<TaskSummary[]> {
    const session = await login(credentials);

    try {
      return await queryMyDevTasks(session);
    } catch (error) {
      if (
        !(error instanceof TaskSystemRequestError) ||
        error.path !== '/task/page/querymydevtask' ||
        (error.status !== 401 && error.status !== 403)
      ) {
        throw error;
      }

      const nextSession = await login(credentials);
      return queryMyDevTasks(nextSession);
    }
  }

  return {
    login,
    queryMyDevTasks,
    loginAndQueryMyDevTasks
  };
}
