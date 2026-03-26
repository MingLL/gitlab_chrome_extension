# GitLab Chrome Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome 114+ Manifest V3 side-panel extension that connects to a user-configured GitLab 11.11.3-ee instance, lists accessible projects, shows branches and the latest commit hash, and supports individual copy actions.

**Architecture:** Use a Manifest V3 extension with a persistent side panel page as the primary UI, a small service worker for action-click behavior and tab utilities, and shared TypeScript modules for GitLab API access, storage, current-tab matching, and UI state helpers. Keep network logic, storage logic, and view logic separate so the side panel stays thin and testable.

**Tech Stack:** TypeScript, Vite, React, Chrome Extensions Manifest V3, Vitest, Testing Library, chrome types

---

## Planned File Structure

### Extension Manifest and Build

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `manifest.base.json`
- Create: `manifest.config.ts`
- Create: `.gitignore`
- Create: `src/test/setup.ts`
- Create: `src/test/mocks/gitlab.ts`
- Create: `scripts/generate-manifest.mjs`
- Create: `public/icons/icon-16.png`
- Create: `public/icons/icon-32.png`
- Create: `public/icons/icon-48.png`
- Create: `public/icons/icon-128.png`

### Extension Runtime

- Create: `src/background/service-worker.ts`
- Create: `src/sidepanel/index.html`
- Create: `src/sidepanel/main.tsx`
- Create: `src/sidepanel/App.tsx`
- Create: `src/sidepanel/app.css`

### Shared Domain Modules

- Create: `src/lib/types.ts`
- Create: `src/lib/gitlab/client.ts`
- Create: `src/lib/gitlab/normalizeBaseUrl.ts`
- Create: `src/lib/gitlab/mappers.ts`
- Create: `src/lib/gitlab/errors.ts`
- Create: `src/lib/storage/configStorage.ts`
- Create: `src/lib/storage/recentProjectsStorage.ts`
- Create: `src/lib/tabs/currentTab.ts`
- Create: `src/lib/tabs/projectMatcher.ts`
- Create: `src/lib/ui/groupProjects.ts`
- Create: `src/lib/ui/copy.ts`

### Side Panel UI Components

- Create: `src/sidepanel/components/ConnectionForm.tsx`
- Create: `src/sidepanel/components/ProjectSelect.tsx`
- Create: `src/sidepanel/components/BranchSelect.tsx`
- Create: `src/sidepanel/components/ResultSummary.tsx`
- Create: `src/sidepanel/components/StatusNotice.tsx`

### Tests

- Create: `src/lib/gitlab/normalizeBaseUrl.test.ts`
- Create: `src/lib/storage/recentProjectsStorage.test.ts`
- Create: `src/lib/tabs/projectMatcher.test.ts`
- Create: `src/lib/ui/groupProjects.test.ts`
- Create: `src/lib/gitlab/client.test.ts`
- Create: `src/sidepanel/App.test.tsx`

### Documentation

- Create: `README.md`

## Implementation Notes

- Prefer direct side-panel use of shared modules for the first version.
- Keep the service worker limited to `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` and optional active-tab helpers.
- Pin recent-project history to `8` entries to make storage behavior deterministic.
- The copied repository link must be the GitLab API project `web_url` field, not a clone URL.
- Support GitLab base URLs with domain names, IPv4 addresses, ports, and optional path prefixes.
- Use optional host permissions for the configured GitLab instance.

## Task 1: Bootstrap the Extension Workspace

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `manifest.base.json`
- Create: `manifest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Write the failing build-shape test**

Create `src/lib/gitlab/normalizeBaseUrl.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('workspace bootstrap', () => {
  it('loads the test runner', () => {
    expect(true).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Defer this step until dependencies are installed.

- [ ] **Step 3: Write minimal workspace setup**

Create `package.json` with scripts:

```json
{
  "name": "gitlab-chrome-extension",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build && node scripts/generate-manifest.mjs",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.3.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/chrome": "^0.1.11",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "typescript": "^5.7.2",
    "vite": "^6.0.7",
    "vitest": "^2.1.8"
  }
}
```

Create `tsconfig.json` with strict TypeScript settings and DOM libs, and explicitly enable:

- `resolveJsonModule: true`
- `moduleResolution` compatible with Vite ESM JSON imports

Create `manifest.base.json` as the JSON-safe manifest source shared by tests and the build script.

Create `vite.config.ts` with a build config that emits a loadable unpacked extension structure into `dist/`, including:

- bundled side panel assets
- bundled service worker asset
- copied static icons
- copied manifest JSON generated from `manifest.base.json`

and configures test support:

- `test.environment = 'jsdom'`
- `test.setupFiles = ['src/test/setup.ts']`

and configures stable extension output paths:

- Rollup input for `src/sidepanel/index.html`
- a build entry for `src/background/service-worker.ts`
- output naming that emits `background/service-worker.js`
- output layout that keeps the side panel HTML at `sidepanel/index.html`
- asset copy rules that place icons under `dist/icons/`

Create `.gitignore`:

```gitignore
node_modules
dist
.DS_Store
.superpowers
coverage
```

Create `src/test/setup.ts`:

```ts
import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined)
    }
  },
  permissions: {
    request: vi.fn().mockResolvedValue(true)
  },
  tabs: {
    query: vi.fn().mockResolvedValue([])
  },
  sidePanel: {
    setPanelBehavior: vi.fn().mockResolvedValue(undefined)
  }
});
```

Create `src/test/mocks/gitlab.ts`:

```ts
import { vi } from 'vitest';

export function mockGitLabUserRequest(input: { ok: boolean; status?: number; body?: unknown }) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: input.ok,
      status: input.status ?? 200,
      json: async () => input.body ?? {}
    })
  );
}

export function mockGitLabSuccessSequence() {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'alice' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          {
            id: 1,
            name: 'alpha',
            path_with_namespace: 'group/alpha',
            web_url: 'https://gitlab.example.com/group/alpha'
          }
        ])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ([
          {
            name: 'main',
            commit: { id: 'abcdef123456' }
          }
        ])
      })
      .mockResolvedValue({
        ok: true,
        json: async () => []
      })
  );
}
```

- [ ] **Step 4: Replace the placeholder test with a true smoke assertion**

Update the smoke test:

```ts
describe('workspace bootstrap', () => {
  it('runs vitest', () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: installs the declared runtime and dev dependencies successfully.

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- --run src/lib/gitlab/normalizeBaseUrl.test.ts`
Expected: FAIL because the placeholder expectation is false.

- [ ] **Step 7: Replace the placeholder test with a true smoke assertion**

Update the smoke test:

```ts
describe('workspace bootstrap', () => {
  it('runs vitest', () => {
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- --run src/lib/gitlab/normalizeBaseUrl.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json vite.config.ts .gitignore src/test/setup.ts src/test/mocks/gitlab.ts scripts/generate-manifest.mjs src/lib/gitlab/normalizeBaseUrl.test.ts
git commit -m "chore: bootstrap extension workspace"
```

## Task 2: Add Manifest V3 and Side Panel Wiring

**Files:**
- Create: `manifest.config.ts`
- Create: `src/background/service-worker.ts`
- Create: `src/sidepanel/index.html`
- Create: `src/sidepanel/main.tsx`
- Test: `src/sidepanel/App.test.tsx`

- [ ] **Step 1: Write the failing side-panel manifest test**

Create `src/sidepanel/App.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import manifest from '../../manifest.config';

describe('manifest', () => {
  it('targets chrome side panel on MV3 with Chrome 114+', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toContain('sidePanel');
    expect(manifest.minimum_chrome_version).toBe('114');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: FAIL because `manifest.config.ts` does not exist yet.

- [ ] **Step 3: Write minimal manifest and worker implementation**

Create `manifest.base.json`:

```json
{
  "manifest_version": 3,
  "name": "GitLab Sidebar",
  "version": "0.1.0",
  "minimum_chrome_version": "114",
  "permissions": ["sidePanel", "storage", "tabs"],
  "optional_host_permissions": ["http://*/*", "https://*/*"],
  "background": {
    "service_worker": "src/background/service-worker.ts",
    "type": "module"
  },
  "action": {
    "default_title": "Open GitLab sidebar"
  },
  "side_panel": {
    "default_path": "src/sidepanel/index.html"
  }
}
```

Create `manifest.config.ts`:

```ts
import manifest from './manifest.base.json';

export default manifest;
```

Create `src/background/service-worker.ts`:

```ts
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
```

Create `src/sidepanel/index.html` with a root `<div id="root"></div>`.

Include an explicit module entry:

```html
<script type="module" src="./main.tsx"></script>
```

Create `src/sidepanel/main.tsx` that renders a placeholder `App`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add manifest.base.json manifest.config.ts src/background/service-worker.ts src/sidepanel/index.html src/sidepanel/main.tsx src/sidepanel/App.test.tsx
git commit -m "feat: add mv3 side panel manifest"
```

## Task 3: Make the Build Output Installable as an Unpacked Extension

**Files:**
- Modify: `vite.config.ts`
- Modify: `manifest.base.json`
- Modify: `manifest.config.ts`
- Create: `scripts/generate-manifest.mjs`
- Test: `src/sidepanel/App.test.tsx`

- [ ] **Step 1: Write the failing build-layout test**

Add to `src/sidepanel/App.test.tsx`:

```tsx
import manifest from '../../manifest.config';

describe('build config', () => {
  it('points the side panel and service worker to emitted dist assets', () => {
    expect(manifest.background.service_worker).toBe('background/service-worker.js');
    expect(manifest.side_panel.default_path).toBe('sidepanel/index.html');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: FAIL because the manifest still points at source paths.

- [ ] **Step 3: Write minimal build-pipeline implementation**

Update `manifest.base.json`:

```json
{
  "manifest_version": 3,
  "name": "GitLab Sidebar",
  "version": "0.1.0",
  "minimum_chrome_version": "114",
  "permissions": ["sidePanel", "storage", "tabs"],
  "optional_host_permissions": ["http://*/*", "https://*/*"],
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  "action": {
    "default_title": "Open GitLab sidebar"
  },
  "side_panel": {
    "default_path": "sidepanel/index.html"
  }
}
```

Update `manifest.config.ts`:

```ts
import manifest from './manifest.base.json';
```

Create `scripts/generate-manifest.mjs` that reads `manifest.base.json`, rewrites paths for built assets if needed, and writes `dist/manifest.json`. Do not rely on Node executing TypeScript directly.

Update `vite.config.ts` so build output includes:

- `dist/sidepanel/index.html`
- `dist/background/service-worker.js`
- copied icons under `dist/icons/`

and update `scripts/generate-manifest.mjs` so it is invoked by `npm run build` and writes `dist/manifest.json` after Vite emits the rest of the extension output.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts manifest.base.json manifest.config.ts scripts/generate-manifest.mjs src/sidepanel/App.test.tsx
git commit -m "build: emit installable extension output"
```

## Task 4: Implement Base URL Normalization

**Files:**
- Create: `src/lib/gitlab/normalizeBaseUrl.ts`
- Modify: `src/lib/gitlab/normalizeBaseUrl.test.ts`

- [ ] **Step 1: Write the failing normalization tests**

Replace the smoke test with:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeBaseUrl } from './normalizeBaseUrl';

describe('normalizeBaseUrl', () => {
  it('removes a trailing slash from a domain URL', () => {
    expect(normalizeBaseUrl('https://gitlab.example.com/')).toBe('https://gitlab.example.com');
  });

  it('keeps path prefixes', () => {
    expect(normalizeBaseUrl('http://192.168.1.10:8080/gitlab/')).toBe('http://192.168.1.10:8080/gitlab');
  });

  it('accepts an IPv4 host without a path prefix', () => {
    expect(normalizeBaseUrl('http://192.168.1.10')).toBe('http://192.168.1.10');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/gitlab/normalizeBaseUrl.test.ts`
Expected: FAIL because `normalizeBaseUrl` is undefined.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/gitlab/normalizeBaseUrl.ts`:

```ts
export function normalizeBaseUrl(input: string): string {
  const url = new URL(input.trim());
  const normalizedPath = url.pathname.replace(/\/$/, '');
  return `${url.origin}${normalizedPath}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/gitlab/normalizeBaseUrl.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/gitlab/normalizeBaseUrl.ts src/lib/gitlab/normalizeBaseUrl.test.ts
git commit -m "feat: normalize configured gitlab base urls"
```

## Task 5: Implement Recent Projects Storage Rules

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/storage/recentProjectsStorage.ts`
- Create: `src/lib/storage/recentProjectsStorage.test.ts`

- [ ] **Step 1: Write the failing recent-project tests**

Create `src/lib/storage/recentProjectsStorage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { upsertRecentProject } from './recentProjectsStorage';

const projectA = {
  gitlabBaseUrl: 'https://gitlab.example.com',
  projectId: 1,
  name: 'alpha',
  pathWithNamespace: 'group/alpha',
  webUrl: 'https://gitlab.example.com/group/alpha',
  lastUsedAt: '2026-03-26T10:00:00.000Z'
};

describe('upsertRecentProject', () => {
  it('moves an existing project to the front instead of duplicating it', () => {
    const result = upsertRecentProject([projectA], {
      ...projectA,
      lastUsedAt: '2026-03-26T10:01:00.000Z'
    });

    expect(result).toHaveLength(1);
    expect(result[0].lastUsedAt).toBe('2026-03-26T10:01:00.000Z');
  });

  it('keeps only eight projects', () => {
    const projects = Array.from({ length: 8 }, (_, index) => ({
      ...projectA,
      projectId: index + 1,
      name: `p-${index + 1}`,
      pathWithNamespace: `group/p-${index + 1}`,
      webUrl: `https://gitlab.example.com/group/p-${index + 1}`,
      lastUsedAt: `2026-03-26T10:0${index}:00.000Z`
    }));

    const result = upsertRecentProject(projects, {
      ...projectA,
      projectId: 99,
      name: 'latest',
      pathWithNamespace: 'group/latest',
      webUrl: 'https://gitlab.example.com/group/latest',
      lastUsedAt: '2026-03-26T10:59:00.000Z'
    });

    expect(result).toHaveLength(8);
    expect(result[0].projectId).toBe(99);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/storage/recentProjectsStorage.test.ts`
Expected: FAIL because `upsertRecentProject` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/types.ts`:

```ts
export type RecentProject = {
  gitlabBaseUrl: string;
  projectId: number;
  name: string;
  pathWithNamespace: string;
  webUrl: string;
  lastUsedAt: string;
};
```

Create `src/lib/storage/recentProjectsStorage.ts`:

```ts
import type { RecentProject } from '../types';

const RECENT_LIMIT = 8;

export function upsertRecentProject(
  existing: RecentProject[],
  next: RecentProject
): RecentProject[] {
  return [next, ...existing.filter((item) => !(item.gitlabBaseUrl === next.gitlabBaseUrl && item.projectId === next.projectId))]
    .sort((a, b) => b.lastUsedAt.localeCompare(a.lastUsedAt))
    .slice(0, RECENT_LIMIT);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/storage/recentProjectsStorage.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/storage/recentProjectsStorage.ts src/lib/storage/recentProjectsStorage.test.ts
git commit -m "feat: add recent project storage rules"
```

## Task 6: Add Config Storage with Load and Save Helpers

**Files:**
- Create: `src/lib/storage/configStorage.ts`
- Modify: `src/lib/types.ts`
- Test: `src/sidepanel/App.test.tsx`

- [ ] **Step 1: Write the failing config-storage tests**

Add to `src/sidepanel/App.test.tsx`:

```tsx
import { loadConfig, saveConfig } from '../lib/storage/configStorage';

describe('config storage', () => {
  it('loads saved config from chrome storage', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            gitlabConfig: { baseUrl: 'https://gitlab.example.com', token: 'secret' }
          })
        }
      }
    });

    const result = await loadConfig();
    expect(result?.baseUrl).toBe('https://gitlab.example.com');
  });

  it('does not persist the config when host permission is denied', async () => {
    const set = vi.fn().mockResolvedValue(undefined);
    const permissions = {
      request: vi.fn().mockResolvedValue(false)
    };

    vi.stubGlobal('chrome', {
      permissions,
      storage: {
        local: {
          set
        }
      }
    });

    await expect(
      saveConfig({
        baseUrl: 'https://gitlab.example.com',
        token: 'secret'
      })
    ).rejects.toThrow(/permission denied/i);

    expect(set).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: FAIL because `configStorage.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

Extend `src/lib/types.ts`:

```ts
export type GitLabConfig = {
  baseUrl: string;
  token: string;
};
```

Create `src/lib/storage/configStorage.ts`:

```ts
import type { GitLabConfig } from '../types';
import { normalizeBaseUrl } from '../gitlab/normalizeBaseUrl';

const CONFIG_KEY = 'gitlabConfig';

function toOriginPattern(baseUrl: string): string {
  const url = new URL(normalizeBaseUrl(baseUrl));
  const normalizedPath = url.pathname.replace(/\/$/, '');
  return normalizedPath ? `${url.origin}${normalizedPath}/*` : `${url.origin}/*`;
}

export async function loadConfig(): Promise<GitLabConfig | null> {
  const result = await chrome.storage.local.get(CONFIG_KEY);
  return result[CONFIG_KEY] ?? null;
}

export async function saveConfig(config: GitLabConfig): Promise<void> {
  const normalizedBaseUrl = normalizeBaseUrl(config.baseUrl);
  const granted = await chrome.permissions.request({ origins: [toOriginPattern(normalizedBaseUrl)] });
  if (!granted) {
    throw new Error('Host permission denied');
  }
  await chrome.storage.local.set({
    [CONFIG_KEY]: {
      ...config,
      baseUrl: normalizedBaseUrl
    }
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage/configStorage.ts src/lib/types.ts src/sidepanel/App.test.tsx
git commit -m "feat: add gitlab config storage"
```

## Task 7: Persist Recent Projects in chrome.storage.local

**Files:**
- Modify: `src/lib/storage/recentProjectsStorage.ts`
- Test: `src/sidepanel/App.test.tsx`

- [ ] **Step 1: Write the failing persistence tests**

Add to `src/sidepanel/App.test.tsx`:

```tsx
import { loadRecentProjects, saveRecentProjects } from '../lib/storage/recentProjectsStorage';

describe('recent project persistence', () => {
  it('loads recent projects from chrome storage', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            recentProjects: [{ projectId: 1, gitlabBaseUrl: 'https://gitlab.example.com' }]
          })
        }
      }
    });

    const result = await loadRecentProjects();
    expect(result).toHaveLength(1);
  });

  it('saves recent projects back to chrome storage', async () => {
    const set = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          set
        }
      }
    });

    await saveRecentProjects([]);
    expect(set).toHaveBeenCalledWith({ recentProjects: [] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: FAIL because `loadRecentProjects` and `saveRecentProjects` do not exist.

- [ ] **Step 3: Write minimal persistence implementation**

Update `src/lib/storage/recentProjectsStorage.ts`:

```ts
import type { RecentProject } from '../types';

const RECENT_PROJECTS_KEY = 'recentProjects';

export async function loadRecentProjects(): Promise<RecentProject[]> {
  const result = await chrome.storage.local.get(RECENT_PROJECTS_KEY);
  return result[RECENT_PROJECTS_KEY] ?? [];
}

export async function saveRecentProjects(projects: RecentProject[]): Promise<void> {
  await chrome.storage.local.set({
    [RECENT_PROJECTS_KEY]: projects
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage/recentProjectsStorage.ts src/sidepanel/App.test.tsx
git commit -m "feat: persist recent projects"
```

## Task 8: Implement Current-Tab Project Matching

**Files:**
- Create: `src/lib/tabs/projectMatcher.ts`
- Create: `src/lib/tabs/projectMatcher.test.ts`

- [ ] **Step 1: Write the failing matcher tests**

Create `src/lib/tabs/projectMatcher.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { matchProjectPathFromTab } from './projectMatcher';

describe('matchProjectPathFromTab', () => {
  it('matches a plain project page', () => {
    expect(
      matchProjectPathFromTab(
        'https://gitlab.example.com/group/project',
        'https://gitlab.example.com'
      )
    ).toBe('group/project');
  });

  it('matches a project route behind a path prefix', () => {
    expect(
      matchProjectPathFromTab(
        'http://192.168.1.10:8080/gitlab/group/project/-/tree/main',
        'http://192.168.1.10:8080/gitlab'
      )
    ).toBe('group/project');
  });

  it('rejects sibling prefixes', () => {
    expect(
      matchProjectPathFromTab(
        'https://gitlab.example.com/gitlabfoo/group/project',
        'https://gitlab.example.com/gitlab'
      )
    ).toBeNull();
  });

  it('rejects non-project gitlab pages', () => {
    expect(
      matchProjectPathFromTab(
        'https://gitlab.example.com/dashboard/projects',
        'https://gitlab.example.com'
      )
    ).toBeNull();
  });

  it('matches the spec example with a path-prefix installation', () => {
    expect(
      matchProjectPathFromTab(
        'https://gitlab.example.com/gitlab/group/project/-/commits/main',
        'https://gitlab.example.com/gitlab'
      )
    ).toBe('group/project');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/tabs/projectMatcher.test.ts`
Expected: FAIL because `matchProjectPathFromTab` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/tabs/projectMatcher.ts`:

```ts
export function matchProjectPathFromTab(tabUrl: string, baseUrl: string): string | null {
  let tab: URL;
  let base: URL;

  try {
    tab = new URL(tabUrl);
    base = new URL(baseUrl);
  } catch {
    return null;
  }

  if (!['http:', 'https:'].includes(tab.protocol) || !['http:', 'https:'].includes(base.protocol)) {
    return null;
  }

  if (tab.origin !== base.origin) return null;

  const basePath = base.pathname.replace(/\/$/, '');
  const tabPath = tab.pathname;

  if (!(tabPath === basePath || tabPath.startsWith(`${basePath}/`) || basePath === '')) {
    return null;
  }

  const stripped = basePath === '' ? tabPath : tabPath.slice(basePath.length);
  const segments = stripped.split('/').filter(Boolean).map(decodeURIComponent);
  if (segments.length < 2) return null;

  const markerIndex = segments.indexOf('-');
  const projectSegments = markerIndex === -1 ? segments : segments.slice(0, markerIndex);

  if (markerIndex === 0) return null;
  if (projectSegments.length < 2) return null;

  const disallowedExactCandidates = new Set([
    'dashboard/projects',
    'explore/projects',
    'admin/projects'
  ]);

  const candidate = projectSegments.join('/');
  if (disallowedExactCandidates.has(candidate)) return null;
  return candidate;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/tabs/projectMatcher.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/tabs/projectMatcher.ts src/lib/tabs/projectMatcher.test.ts
git commit -m "feat: parse gitlab project path from active tabs"
```

## Task 9: Implement GitLab Client for User, Projects, and Branches

**Files:**
- Create: `src/lib/gitlab/client.ts`
- Create: `src/lib/gitlab/mappers.ts`
- Create: `src/lib/gitlab/errors.ts`
- Create: `src/lib/gitlab/client.test.ts`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Write the failing client tests**

Create `src/lib/gitlab/client.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGitLabClient } from './client';

describe('createGitLabClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls /api/v4/user to validate the token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, username: 'alice' })
    }));

    const client = createGitLabClient('https://gitlab.example.com', 'token');
    await client.fetchCurrentUser();

    expect(fetch).toHaveBeenCalledWith(
      'https://gitlab.example.com/api/v4/user',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Private-Token': 'token' })
      })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/gitlab/client.test.ts`
Expected: FAIL because `createGitLabClient` does not exist.

- [ ] **Step 3: Write minimal implementation**

Update `src/lib/types.ts`:

```ts
export type GitLabProject = {
  id: number;
  name: string;
  pathWithNamespace: string;
  webUrl: string;
};

export type GitLabBranch = {
  name: string;
  commitId: string;
};
```

Create `src/lib/gitlab/mappers.ts`:

```ts
export function mapProject(input: any) {
  return {
    id: input.id,
    name: input.name,
    pathWithNamespace: input.path_with_namespace,
    webUrl: input.web_url
  };
}

export function mapBranch(input: any) {
  return {
    name: input.name,
    commitId: input.commit.id
  };
}
```

Create `src/lib/gitlab/errors.ts`:

```ts
export class GitLabRequestError extends Error {}
```

Create `src/lib/gitlab/client.ts`:

```ts
import { normalizeBaseUrl } from './normalizeBaseUrl';
import { mapBranch, mapProject } from './mappers';

export function createGitLabClient(baseUrl: string, token: string) {
  const normalized = normalizeBaseUrl(baseUrl);
  const apiBase = `${normalized}/api/v4`;

  async function request(path: string) {
    const response = await fetch(`${apiBase}${path}`, {
      headers: {
        'Private-Token': token
      }
    });

    if (!response.ok) {
      throw new Error(`GitLab request failed: ${response.status}`);
    }

    return response.json();
  }

  return {
    fetchCurrentUser() {
      return request('/user');
    }
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/gitlab/client.test.ts`
Expected: PASS

- [ ] **Step 5: Extend the tests for project and branch pagination**

Add tests that verify:

```ts
await client.fetchAllProjects();
await client.fetchBranches(123);
```

should request:

- `/projects?simple=true&per_page=100&page=1`
- additional pages until empty results
- `/projects/123/repository/branches?per_page=100&page=1`

- [ ] **Step 6: Run test to verify the new tests fail**

Run: `npm test -- --run src/lib/gitlab/client.test.ts`
Expected: FAIL because the pagination methods do not exist yet.

- [ ] **Step 7: Implement the pagination methods**

Add to `client.ts`:

```ts
async function requestAllPages(pathFactory: (page: number) => string) {
  const results: any[] = [];

  for (let page = 1; ; page += 1) {
    const pageItems = await request(pathFactory(page));
    if (!Array.isArray(pageItems) || pageItems.length === 0) break;
    results.push(...pageItems);
  }

  return results;
}

return {
  fetchCurrentUser() {
    return request('/user');
  },
  async fetchAllProjects() {
    const items = await requestAllPages((page) => `/projects?simple=true&per_page=100&page=${page}`);
    return items.map(mapProject);
  },
  async fetchBranches(projectId: number) {
    const items = await requestAllPages(
      (page) => `/projects/${projectId}/repository/branches?per_page=100&page=${page}`
    );
    return items.map(mapBranch);
  }
};
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- --run src/lib/gitlab/client.test.ts`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/lib/gitlab/client.ts src/lib/gitlab/mappers.ts src/lib/gitlab/errors.ts src/lib/gitlab/client.test.ts src/lib/types.ts
git commit -m "feat: add gitlab api client"
```

## Task 10: Implement Project Grouping for Recent + All Projects

**Files:**
- Create: `src/lib/ui/groupProjects.ts`
- Create: `src/lib/ui/groupProjects.test.ts`
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Write the failing grouping tests**

Create `src/lib/ui/groupProjects.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { groupProjects } from './groupProjects';

const allProjects = [
  { id: 1, name: 'alpha', pathWithNamespace: 'group/alpha', webUrl: 'https://gitlab/group/alpha' },
  { id: 2, name: 'beta', pathWithNamespace: 'group/beta', webUrl: 'https://gitlab/group/beta' }
];

const recentProjects = [
  {
    gitlabBaseUrl: 'https://gitlab',
    projectId: 2,
    name: 'beta',
    pathWithNamespace: 'group/beta',
    webUrl: 'https://gitlab/group/beta',
    lastUsedAt: '2026-03-26T10:00:00.000Z'
  }
];

describe('groupProjects', () => {
  it('places recent projects in a recent group and excludes duplicates from the all group', () => {
    const groups = groupProjects(allProjects, recentProjects, 'https://gitlab');
    expect(groups[0].label).toBe('Recent');
    expect(groups[0].options).toHaveLength(1);
    expect(groups[1].options).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/ui/groupProjects.test.ts`
Expected: FAIL because `groupProjects` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/ui/groupProjects.ts`:

```ts
import type { GitLabProject, RecentProject } from '../types';

export function groupProjects(
  allProjects: GitLabProject[],
  recentProjects: RecentProject[],
  baseUrl: string
) {
  const filteredRecent = recentProjects.filter((item) => item.gitlabBaseUrl === baseUrl);
  const recentIds = new Set(filteredRecent.map((item) => item.projectId));

  return [
    {
      label: 'Recent',
      options: filteredRecent.map((item) => ({
        id: item.projectId,
        name: item.name,
        pathWithNamespace: item.pathWithNamespace,
        webUrl: item.webUrl
      }))
    },
    {
      label: 'All Projects',
      options: allProjects.filter((item) => !recentIds.has(item.id))
    }
  ].filter((group) => group.options.length > 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/lib/ui/groupProjects.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui/groupProjects.ts src/lib/ui/groupProjects.test.ts
git commit -m "feat: group recent and full project lists"
```

## Task 11: Build the Side Panel UI Shell

**Files:**
- Create: `src/sidepanel/App.tsx`
- Create: `src/sidepanel/app.css`
- Create: `src/sidepanel/components/ConnectionForm.tsx`
- Create: `src/sidepanel/components/ProjectSelect.tsx`
- Create: `src/sidepanel/components/BranchSelect.tsx`
- Create: `src/sidepanel/components/ResultSummary.tsx`
- Create: `src/sidepanel/components/StatusNotice.tsx`
- Modify: `src/sidepanel/App.test.tsx`

- [ ] **Step 1: Write the failing render test**

Add:

```tsx
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the stacked connection, project, branch, and result sections', () => {
    render(<App />);

    expect(screen.getByLabelText(/gitlab base url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/token/i)).toBeInTheDocument();
    expect(screen.getByText(/project/i)).toBeInTheDocument();
    expect(screen.getByText(/branch/i)).toBeInTheDocument();
    expect(screen.getByText(/latest commit hash/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: FAIL because `App` and the sections do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `App.tsx` that renders the four stacked sections with placeholder state.

Create `ConnectionForm.tsx`:

```tsx
type Props = {
  baseUrl: string;
  token: string;
  onBaseUrlChange: (value: string) => void;
  onTokenChange: (value: string) => void;
  onSubmit: () => void;
};

export function ConnectionForm(props: Props) {
  return (
    <section>
      <h2>Connection</h2>
      <label>
        GitLab Base URL
        <input value={props.baseUrl} onChange={(e) => props.onBaseUrlChange(e.target.value)} />
      </label>
      <label>
        Token
        <input type="password" value={props.token} onChange={(e) => props.onTokenChange(e.target.value)} />
      </label>
      <button onClick={props.onSubmit}>Connect</button>
    </section>
  );
}
```

Create minimal components for project, branch, status, and result sections.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/sidepanel/App.tsx src/sidepanel/app.css src/sidepanel/components/*.tsx src/sidepanel/App.test.tsx
git commit -m "feat: add side panel ui shell"
```

## Task 12: Connect the UI to Config, Projects, Branches, and Results

**Files:**
- Modify: `src/sidepanel/App.tsx`
- Modify: `src/lib/storage/configStorage.ts`
- Modify: `src/lib/storage/recentProjectsStorage.ts`
- Modify: `src/lib/gitlab/client.ts`
- Modify: `src/lib/tabs/currentTab.ts`
- Modify: `src/lib/tabs/projectMatcher.ts`
- Modify: `src/sidepanel/App.test.tsx`

- [ ] **Step 1: Write the failing integration-style UI test**

Add:

```tsx
import userEvent from '@testing-library/user-event';
import { mockGitLabSuccessSequence } from '../test/mocks/gitlab';

it('preselects the current tab project when the tab matches a loaded project', async () => {
  mockGitLabSuccessSequence();
  vi.mocked(chrome.tabs.query).mockResolvedValue([
    { url: 'https://gitlab.example.com/group/alpha/-/tree/main' } as chrome.tabs.Tab
  ]);
  render(<App />);

  await userEvent.type(screen.getByLabelText(/gitlab base url/i), 'https://gitlab.example.com');
  await userEvent.type(screen.getByLabelText(/token/i), 'secret');
  await userEvent.click(screen.getByRole('button', { name: /connect/i }));

  expect(await screen.findByDisplayValue(/group\/alpha/i)).toBeInTheDocument();
});

it('stores a manually selected project in recent projects', async () => {
  mockGitLabSuccessSequence();
  vi.mocked(chrome.tabs.query).mockResolvedValue([
    { url: 'https://gitlab.example.com/group/alpha' } as chrome.tabs.Tab
  ]);
  render(<App />);
  await userEvent.type(screen.getByLabelText(/gitlab base url/i), 'https://gitlab.example.com');
  await userEvent.type(screen.getByLabelText(/token/i), 'secret');
  await userEvent.click(screen.getByRole('button', { name: /connect/i }));

  await userEvent.selectOptions(screen.getByLabelText(/project/i), '2');

  expect(chrome.storage.local.set).toHaveBeenCalledWith(
    expect.objectContaining({
      recentProjects: expect.arrayContaining([
        expect.objectContaining({ projectId: 2 })
      ])
    })
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: FAIL because `App` does not load config or GitLab data yet.

- [ ] **Step 3: Implement the minimal state flow**

Add to `App.tsx`:

- controlled config state
- connect action
- loading and error states
- project list state
- branch list state
- selected branch hash state
- recent-project list state
- automatic current-tab project preselection after project load when a matched `pathWithNamespace` is present in the loaded project list

Add to `configStorage.ts`:

- `loadConfig()`

Create `src/lib/tabs/currentTab.ts`:

```ts
export async function getActiveTabUrl(): Promise<string | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url ?? null;
}
```

Wire:

- `saveConfig`
- `loadConfig`
- `createGitLabClient`
- `loadRecentProjects`
- `saveRecentProjects`
- `getActiveTabUrl`
- `matchProjectPathFromTab`
- `groupProjects`
- `upsertRecentProject` on manual project selection only

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/sidepanel/App.tsx src/lib/storage/configStorage.ts src/lib/storage/recentProjectsStorage.ts src/lib/gitlab/client.ts src/lib/tabs/currentTab.ts src/lib/tabs/projectMatcher.ts src/sidepanel/App.test.tsx
git commit -m "feat: wire gitlab data into side panel"
```

## Task 13: Add Copy Actions and Result Feedback

**Files:**
- Create: `src/lib/ui/copy.ts`
- Modify: `src/sidepanel/components/ResultSummary.tsx`
- Modify: `src/sidepanel/App.test.tsx`

- [ ] **Step 1: Write the failing copy test**

Add:

```tsx
it('copies the project web url, branch, and hash individually', async () => {
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined)
    }
  });

  render(
    <ResultSummary
      projectName="alpha"
      webUrl="https://gitlab.example.com/group/alpha"
      branchName="main"
      commitHash="abcdef123"
    />
  );

  await userEvent.click(screen.getByRole('button', { name: /copy url/i }));
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://gitlab.example.com/group/alpha');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: FAIL because `ResultSummary` does not implement copy behavior.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/ui/copy.ts`:

```ts
export async function copyText(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
}
```

Update `ResultSummary.tsx` to render three buttons:

- `Copy URL`
- `Copy Branch`
- `Copy Hash`

Each button should call `copyText` with the correct field and briefly switch its label to `Copied`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/ui/copy.ts src/sidepanel/components/ResultSummary.tsx src/sidepanel/App.test.tsx
git commit -m "feat: add field-level copy actions"
```

## Task 14: Add Error States, Empty States, and README

**Files:**
- Modify: `src/sidepanel/App.tsx`
- Modify: `src/sidepanel/components/StatusNotice.tsx`
- Create: `README.md`
- Test: `src/sidepanel/App.test.tsx`

- [ ] **Step 1: Write the failing error-state test**

Add:

```tsx
import userEvent from '@testing-library/user-event';
import { mockGitLabUserRequest } from '../test/mocks/gitlab';

it('shows a connection error when the gitlab token is invalid', async () => {
  mockGitLabUserRequest({ ok: false, status: 401 });
  vi.mocked(chrome.tabs.query).mockResolvedValue([]);
  render(<App />);
  await userEvent.type(screen.getByLabelText(/gitlab base url/i), 'https://gitlab.example.com');
  await userEvent.type(screen.getByLabelText(/token/i), 'bad-token');
  await userEvent.click(screen.getByRole('button', { name: /connect/i }));

  expect(await screen.findByText(/invalid token or gitlab request failed/i)).toBeInTheDocument();
});
``` 

- [ ] **Step 2: Run test to verify it fails for the right reason**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: FAIL because error-state rendering is incomplete.

- [ ] **Step 3: Implement minimal status messaging**

Support these states in `App.tsx` and `StatusNotice.tsx`:

- not configured
- connecting
- connection failed
- loading projects
- no accessible projects
- loading branches
- selected project has no branches
- current tab does not match configured GitLab

Create `README.md` with:

- install dependencies
- build command
- how to load unpacked extension
- required Chrome version: 114+
- required GitLab setup: base URL + personal access token

- [ ] **Step 4: Run the UI tests to verify they pass**

Run: `npm test -- --run src/sidepanel/App.test.tsx`
Expected: PASS

- [ ] **Step 5: Run the full test suite**

Run: `npm test -- --run`
Expected: PASS across all tests

- [ ] **Step 6: Build the extension**

Run: `npm run build`
Expected: successful production build with emitted extension assets

- [ ] **Step 7: Verify the unpacked extension output**

Run: `ls dist && test -f dist/manifest.json && test -f dist/sidepanel/index.html`
Expected: emitted dist layout contains the manifest and side panel entrypoint

- [ ] **Step 8: Commit**

```bash
git add src/sidepanel/App.tsx src/sidepanel/components/StatusNotice.tsx README.md
git add src/sidepanel/App.test.tsx
git commit -m "feat: finalize gitlab side panel states"
```

## Verification Checklist

- `npm test -- --run` passes
- `npm run build` passes
- Manifest declares `minimum_chrome_version: "114"`
- Manifest declares `sidePanel`, `storage`, and `tabs`
- Manifest uses `optional_host_permissions` for user-configured GitLab hosts
- Base URL normalization supports domain, IP, IP:port, and path prefix forms
- Current-tab matching rejects sibling path prefixes like `/gitlabfoo`
- Project list groups recent items separately from the full list
- Recent-project history caps at `8`
- Result summary copies `web_url`, branch, and hash individually

## Manual QA

1. Install dependencies with `npm install`.
2. Build with `npm run build`.
3. Load the unpacked extension into Chrome 114+.
4. Click the toolbar icon and confirm the side panel opens.
5. Enter a GitLab domain URL and token; verify connection succeeds.
6. Enter an IP-based GitLab URL and token; verify connection succeeds.
7. Verify the extension requests host permission for the configured instance.
8. Open a matching GitLab project page and confirm the project is preselected.
9. Open a non-matching tab and confirm the extension still works without preselection.
10. Select several projects and confirm the `Recent` group updates and caps at `8`.
11. Select a branch and confirm the latest commit hash appears.
12. Verify `Copy URL`, `Copy Branch`, and `Copy Hash` each copy the expected value.
