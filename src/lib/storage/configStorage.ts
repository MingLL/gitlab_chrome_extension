import { normalizeBaseUrl } from '../gitlab/normalizeBaseUrl';
import type { GitLabConfig } from '../types';

export const CONFIG_KEY = 'gitlabConfig';

type ConfigStorageRecord = Partial<Record<typeof CONFIG_KEY, GitLabConfig>>;

function getHostPermissionPattern(baseUrl: string): string {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const parsedBaseUrl = new URL(normalizedBaseUrl);

  return parsedBaseUrl.pathname === '/' ? `${parsedBaseUrl.origin}/*` : `${parsedBaseUrl.origin}${parsedBaseUrl.pathname}/*`;
}

export async function loadConfig(): Promise<GitLabConfig | null> {
  const storedConfig = (await chrome.storage.local.get(CONFIG_KEY)) as ConfigStorageRecord;

  return storedConfig[CONFIG_KEY] ?? null;
}

export async function requestHostPermission(baseUrl: string): Promise<void> {
  const permissionGranted = await chrome.permissions.request({
    origins: [getHostPermissionPattern(baseUrl)]
  });

  if (!permissionGranted) {
    throw new Error('Host permission request was denied.');
  }
}

export async function saveConfig(config: GitLabConfig): Promise<void> {
  const normalizedConfig: GitLabConfig = {
    ...config,
    baseUrl: normalizeBaseUrl(config.baseUrl)
  };

  await chrome.storage.local.set({ [CONFIG_KEY]: normalizedConfig });
}
