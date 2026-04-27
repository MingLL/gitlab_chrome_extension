import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTaskSystemClient, DEFAULT_TASK_QUERY_BODY } from './client';
import {
  TaskSystemRequestError,
  TaskSystemResponseError,
  TaskSystemTransportError
} from './errors';

describe('task system client', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('fetches verification code, logs in with realcode, and syncs the token cookie', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { uuid: 'vc-1', realcode: '5007' }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { xaccessToken: 'token-123' }
        })
      });

    vi.stubGlobal('fetch', fetchMock);
    const setCookieMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', {
      cookies: {
        set: setCookieMock
      }
    });

    const client = createTaskSystemClient('http://10.254.239.10:10086/');

    await expect(
      client.login({ loginName: 'liminglei', loginPwd: 'secret' })
    ).resolves.toEqual({ token: 'token-123' });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://10.254.239.10:10086/session/verificationCode',
      expect.objectContaining({
        method: 'GET'
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://10.254.239.10:10086/session/login',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
          code: '5007',
          codeUuid: 'vc-1',
          loginName: 'liminglei',
          loginPwd: 'secret'
        })
      })
    );
    expect(setCookieMock).toHaveBeenCalledWith({
      url: 'http://10.254.239.10:10086',
      name: 'token',
      value: 'token-123',
      path: '/'
    });
  });

  it('queries my dev tasks after syncing the token cookie and with browser-managed credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          list: [
            {
              id: 7,
              proposalid: 'REQ-7',
              proposalname: '任务 A',
              completed: 0
            }
          ],
          pageNum: 1,
          pageSize: 18,
          total: 1,
          pages: 1
        }
      })
    });

    vi.stubGlobal('fetch', fetchMock);
    const setCookieMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', {
      cookies: {
        set: setCookieMock
      }
    });

    const client = createTaskSystemClient('http://10.254.239.10:10086');

    await expect(client.queryMyDevTasks({ token: 'token-123' })).resolves.toEqual([
      expect.objectContaining({
        id: '7',
        proposalId: 'REQ-7',
        proposalName: '任务 A',
        completed: false
      })
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://10.254.239.10:10086/task/page/querymydevtask',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Access-Token': 'token-123'
        }),
        body: JSON.stringify(DEFAULT_TASK_QUERY_BODY)
      })
    );
    expect(setCookieMock).toHaveBeenCalledWith({
      url: 'http://10.254.239.10:10086',
      name: 'token',
      value: 'token-123',
      path: '/'
    });
  });

  it('re-logs in and retries the task query once after a 401 query failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { uuid: 'vc-1', realcode: '5007' }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { xaccessToken: 'token-1' }
        })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { uuid: 'vc-2', realcode: '9012' }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { xaccessToken: 'token-2' }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            list: [{ id: 9, proposalid: 'REQ-9', proposalname: '重试成功', completed: 0 }],
            pageNum: 1,
            pageSize: 18,
            total: 1,
            pages: 1
          }
        })
      });

    vi.stubGlobal('fetch', fetchMock);

    const client = createTaskSystemClient('http://10.254.239.10:10086');

    await expect(
      client.loginAndQueryMyDevTasks({
        baseUrl: 'http://10.254.239.10:10086',
        loginName: 'liminglei',
        loginPwd: 'secret'
      })
    ).resolves.toEqual([
      expect.objectContaining({
        id: '9',
        proposalId: 'REQ-9',
        proposalName: '重试成功'
      })
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://10.254.239.10:10086/task/page/querymydevtask',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          'X-Access-Token': 'token-1'
        })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      'http://10.254.239.10:10086/task/page/querymydevtask',
      expect.objectContaining({
        credentials: 'include',
        headers: expect.objectContaining({
          'X-Access-Token': 'token-2'
        })
      })
    );
  });

  it('does not retry when the query fails with a non-auth request error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { uuid: 'vc-1', realcode: '5007' }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { xaccessToken: 'token-1' }
        })
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500
      });

    vi.stubGlobal('fetch', fetchMock);

    const client = createTaskSystemClient('http://10.254.239.10:10086');

    await expect(
      client.loginAndQueryMyDevTasks({
        baseUrl: 'http://10.254.239.10:10086',
        loginName: 'liminglei',
        loginPwd: 'secret'
      })
    ).rejects.toEqual(new TaskSystemRequestError(500, '/task/page/querymydevtask'));

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry when the query fails with a non-retriable response error', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { uuid: 'vc-1', realcode: '5007' }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { xaccessToken: 'token-1' }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true
        })
      });

    vi.stubGlobal('fetch', fetchMock);

    const client = createTaskSystemClient('http://10.254.239.10:10086');

    await expect(
      client.loginAndQueryMyDevTasks({
        baseUrl: 'http://10.254.239.10:10086',
        loginName: 'liminglei',
        loginPwd: 'secret'
      })
    ).rejects.toEqual(new TaskSystemResponseError('/task/page/querymydevtask', '缺少 data 字段'));

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('raises a readable request error when login query fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403
    });

    vi.stubGlobal('fetch', fetchMock);

    const client = createTaskSystemClient('http://10.254.239.10:10086');

    await expect(client.login({ loginName: 'liminglei', loginPwd: 'secret' })).rejects.toEqual(
      new TaskSystemRequestError(403, '/session/verificationCode')
    );
  });

  it('wraps fetch rejections with path-aware transport errors', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));

    vi.stubGlobal('fetch', fetchMock);

    const client = createTaskSystemClient('http://10.254.239.10:10086');

    await expect(client.queryMyDevTasks({ token: 'token-123' })).rejects.toMatchObject({
      name: 'TaskSystemTransportError',
      path: '/task/page/querymydevtask',
      phase: 'request'
    });
  });

  it('wraps json parse failures with path-aware transport errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON');
      }
    });

    vi.stubGlobal('fetch', fetchMock);

    const client = createTaskSystemClient('http://10.254.239.10:10086');

    await expect(client.queryMyDevTasks({ token: 'token-123' })).rejects.toMatchObject({
      name: 'TaskSystemTransportError',
      path: '/task/page/querymydevtask',
      phase: 'parse'
    });
  });
});
