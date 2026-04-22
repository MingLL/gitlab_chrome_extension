import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadTaskSystemConfig, saveTaskSystemConfig } from './taskSystemConfigStorage';

describe('task system config storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads saved task system config from chrome.storage.local', async () => {
    const chromeStorage = chrome.storage.local;
    chromeStorage.get.mockResolvedValueOnce({
      taskSystemConfig: {
        baseUrl: 'http://10.254.239.10:10086',
        loginName: 'liminglei',
        loginPwd: 'secret'
      }
    });

    await expect(loadTaskSystemConfig()).resolves.toEqual({
      baseUrl: 'http://10.254.239.10:10086',
      loginName: 'liminglei',
      loginPwd: 'secret'
    });
    expect(chromeStorage.get).toHaveBeenCalledWith('taskSystemConfig');
  });

  it('returns null when taskSystemConfig is missing from chrome.storage.local', async () => {
    const chromeStorage = chrome.storage.local;
    chromeStorage.get.mockResolvedValueOnce({});

    await expect(loadTaskSystemConfig()).resolves.toBeNull();
    expect(chromeStorage.get).toHaveBeenCalledWith('taskSystemConfig');
  });

  it('saves task system config to chrome.storage.local', async () => {
    const chromeStorage = chrome.storage.local;
    const config = {
      baseUrl: 'http://10.254.239.10:10086',
      loginName: 'liminglei',
      loginPwd: 'secret'
    };

    await expect(saveTaskSystemConfig(config)).resolves.toBeUndefined();
    expect(chromeStorage.set).toHaveBeenCalledWith({
      taskSystemConfig: config
    });
  });
});
