# GitLab Chrome Extension Design

## Overview

Build a Chrome extension with a `Side Panel` UI for browsing GitLab data from a user-configured GitLab instance running `11.11.3-ee`.

Minimum supported browser version: `Chrome 114` with `Manifest V3`.

The extension should let the user:

- Configure `GitLab Base URL`
- Configure a `Personal Access Token`
- Browse all projects the current user can access through the GitLab projects API for that authenticated user
- Select a project
- Select one of its branches
- View the latest commit hash for the selected branch
- Copy the project web URL, branch name, and hash individually

The side panel should also detect the current browser tab. If the tab is a page on the configured GitLab instance and maps to a known project, that project should be preselected.

The extension should remember recently used repositories and show them in a `Recent` group at the top of the project selector.

## Goals

- Provide a narrow, efficient sidebar workflow inside Chrome
- Explicitly target `Chrome 114+` because `chrome.sidePanel` is available from Chrome 114 in MV3
- Work reliably against GitLab `11.11.3-ee`
- Avoid DOM scraping of GitLab pages
- Keep the interaction linear and easy to scan
- Store user configuration and recent-project history locally in the browser
- Support GitLab base URLs expressed as domain names, IP addresses, or IP:port endpoints

## Non-Goals

- Editing branches, commits, or repository data
- Supporting multiple auth modes beyond `Base URL + Token`
- Copying all fields at once
- Auto-selecting recent projects when there is no current-page match
- Deep integration with GitLab page DOM
- Copying clone URLs such as SSH or HTTPS clone endpoints

## Chosen UI Structure

Use a single-column `Form Stack` side panel.

Top to bottom sections:

1. `Connection`
   - GitLab base URL input
   - token input
   - connect button
   - connection status or error message

2. `Project Selection`
   - project dropdown
   - recent projects grouped at the top
   - current-page matched project highlighted or preselected when possible

3. `Branch Selection`
   - branch dropdown
   - latest commit hash display after branch selection

4. `Result Summary`
   - project name
   - project web URL
   - branch name
   - latest commit hash
   - per-field copy buttons

This layout is intentionally linear:

`Connect -> Select project -> Select branch -> Copy output`

That flow fits a Chrome side panel better than split-pane layouts.

## User Flow

1. User opens the extension side panel.
2. If no saved config exists, the panel asks for `GitLab Base URL` and `Token`.
3. User clicks `Connect`.
4. The extension validates the config by calling the GitLab user API.
5. On success, the extension loads all accessible projects.
6. The extension checks the current tab URL.
7. If the URL belongs to the configured GitLab instance and maps to one of the loaded projects, that project is preselected.
8. Otherwise, the user manually chooses a project.
9. After project selection, the extension loads all branches for that project.
10. User selects a branch.
11. The latest commit hash for that branch is shown.
12. The result panel shows project name, project web URL, branch name, and hash with individual copy buttons.
13. When the user selects a project manually, that project is saved into the recent-projects list.

## Architecture

## Extension Surfaces

- `sidepanel page`
  - main UI
  - owns form state and rendering

- `service worker`
  - optional central place for storage helpers, current-tab inspection, and GitLab API helpers
  - can also host shared message handlers if UI and tab logic are separated

- `storage`
  - `chrome.storage.local` for config and recent-project history

## Extension Permissions

Initial required permissions:

- `sidePanel`
- `storage`
- `tabs`

Host access model:

- use `optional_host_permissions` for `http://*/*` and `https://*/*`
- when the user saves a GitLab base URL, request host permission for that configured instance
- only perform GitLab API requests after that host permission is granted

Rationale:

- the GitLab host is user-configured, so it cannot be hard-coded in the initial manifest
- the side panel needs `tabs` access to inspect the active tab URL for current-project matching
- optional host permissions keep the initial permission surface narrower than broad static host permissions

The implementation can keep API logic in shared modules, used by the side panel directly or through the background worker. The key boundary is to keep GitLab API access, storage logic, and UI state management separate.

## Main Modules

- `config storage`
  - load and save GitLab base URL and token

- `gitlab client`
  - normalize base URL
  - attach `Private-Token` header
  - fetch current user
  - fetch paginated projects
  - fetch paginated branches

- `current tab matcher`
  - inspect active tab URL
  - verify domain matches configured GitLab base URL
  - parse project path candidate
  - match against `path_with_namespace`

- `recent projects store`
  - update recent list on project selection
  - dedupe by project and GitLab instance
  - sort by latest usage
  - trim to max size

- `side panel state`
  - loading states
  - selection states
  - error states
  - derived result summary state

## Data Model

## Config

```ts
type GitLabConfig = {
  baseUrl: string;
  token: string;
};
```

## Project

```ts
type GitLabProject = {
  id: number;
  name: string;
  pathWithNamespace: string;
  webUrl: string;
};
```

Mapped from GitLab fields:

- `id`
- `name`
- `path_with_namespace`
- `web_url`

## Branch

```ts
type GitLabBranch = {
  name: string;
  commitId: string;
};
```

Mapped from GitLab fields:

- `name`
- `commit.id`

## Recent Project

```ts
type RecentProject = {
  gitlabBaseUrl: string;
  projectId: number;
  name: string;
  pathWithNamespace: string;
  webUrl: string;
  lastUsedAt: string;
};
```

## API Design

All API calls use GitLab REST API v4.

### Validate Connection

`GET /api/v4/user`

Purpose:

- verify base URL is reachable
- verify token is valid
- confirm the instance is responding

Header:

- `Private-Token: <token>`

### Fetch Accessible Projects

`GET /api/v4/projects?simple=true&per_page=100&page=N`

Purpose:

- load all projects visible to the authenticated user on the configured GitLab instance
- align with the user requirement of "all projects the current user can access", not only projects where the user is a direct member

Requirements:

- paginate until exhausted
- merge pages into one in-memory list
- map only required fields
- do not apply a `membership=true` filter in the initial implementation

### Fetch Branches

`GET /api/v4/projects/:id/repository/branches?per_page=100&page=N`

Purpose:

- load all branches for the selected project

Requirements:

- paginate until exhausted
- extract branch name and latest commit hash from branch payload

### Latest Commit Hash

Use `branch.commit.id` directly from the branches API response instead of making a separate commits request.

Reason:

- less API traffic
- simpler implementation
- better fit for the requested workflow

## Current Tab Integration

Base URL normalization rules:

- accept a user-entered GitLab base URL with or without trailing slash
- accept hosts expressed as a domain name, an IPv4 address, or a host with explicit port, for example:
  - `https://gitlab.example.com`
  - `http://192.168.1.10`
  - `http://192.168.1.10:8080/gitlab`
- preserve any path prefix in the configured base URL, for example `https://gitlab.example.com/gitlab`
- normalize by removing only the trailing slash
- parse the normalized base URL into `origin + basePath`
- treat `origin + basePath` as a structured match target for API and tab matching, not a raw string prefix
- derive API base as `<normalizedBaseUrl>/api/v4`

When the side panel opens or refreshes project data:

1. inspect the active tab URL
2. parse both the active tab URL and the normalized configured base URL with `URL`
3. require the same `origin`
4. require the active tab pathname to equal the configured `basePath`, or to start with `basePath + '/'`
5. only after that structured path-boundary match, strip the `basePath` portion and parse a project path candidate from the remaining pathname
4. compare that candidate with loaded project `pathWithNamespace`
5. if a match exists, preselect that project

Project-path parsing rule:

- after removing the matched `basePath`, split the remaining pathname into non-empty decoded path segments
- accept only paths that contain at least two path segments before any route suffix
- if the path contains a `-` segment, treat all segments before that `-` segment as the project path candidate
- if the path does not contain a `-` segment, only accept it when exactly two or more segments remain and use the full remaining path as the candidate
- reject paths with fewer than two segments after base removal

Accepted examples:

- `https://gitlab.example.com/group/project` -> `group/project`
- `https://gitlab.example.com/group/project/-/tree/main` -> `group/project`
- `https://gitlab.example.com/group/subgroup/project/-/blob/main/README.md` -> `group/subgroup/project`
- `https://gitlab.example.com/gitlab/group/project/-/commits/main` with base URL `https://gitlab.example.com/gitlab` -> `group/project`

Rejected or non-matching examples:

- `https://gitlab.example.com/` -> no candidate
- `https://gitlab.example.com/gitlabfoo/group/project` with base URL `https://gitlab.example.com/gitlab` -> no candidate
- `https://gitlab.example.com/dashboard/projects` -> likely no matching `pathWithNamespace`, so no preselection
- any URL whose prefix does not match the normalized configured base URL -> no candidate

Additional accepted host examples:

- `http://192.168.1.10/group/project` with base URL `http://192.168.1.10` -> `group/project`
- `http://192.168.1.10:8080/gitlab/group/project/-/tree/main` with base URL `http://192.168.1.10:8080/gitlab` -> `group/project`

Important constraint:

- do not scrape GitLab DOM
- depend only on URL parsing plus project list matching

This avoids brittle coupling to GitLab `11.11.3-ee` page markup.

## Recent Projects Behavior

The user requested recent-project memory as a grouped list, not auto-selection.

Rules:

- record only manually selected projects
- do not record branches
- keep entries per GitLab base URL
- sort by `lastUsedAt` descending
- dedupe repeated selections of the same project
- keep a fixed max size, recommended initial value: `8`

Display behavior:

- project dropdown contains a `Recent` section at the top
- full project list appears below it
- if the current tab matches a project, that match still has priority for preselection
- if there is no current-tab match, do not auto-select a recent project

## State and Error Handling

### Initial State

- no config saved
- show URL and token inputs
- project and branch controls disabled

### Loading States

- connecting
- loading projects
- loading branches

While loading:

- disable dependent controls
- show inline loading text or spinner

### Error States

- invalid or unreachable GitLab base URL
- invalid token
- network failure
- failed projects request
- failed branches request

The UI should show explicit user-facing messages, not silent failure.

### Empty States

- no accessible projects
- selected project has no branches
- current tab is not on configured GitLab

These are informational states, not fatal errors.

## Result Panel

The result panel should always reflect current valid selection state.

Fields:

- project name
- project web URL
- branch name
- latest commit hash

Copy behavior:

- project web URL has its own copy button
- branch has its own copy button
- hash has its own copy button
- project name is display-only unless implementation later decides it also benefits from copy

Feedback:

- clicked copy button briefly changes to `Copied`

No `copy all` action is included because the user explicitly chose individual-copy behavior only.

## Compatibility Notes for GitLab 11.11.3-ee

To maximize compatibility:

- require `Chrome 114+` and `Manifest V3`
- use the `chrome.sidePanel` feature set available at the Chrome 114 baseline
- avoid depending on newer sidePanel events or APIs added after Chrome 114 unless they are explicitly guarded or excluded
- use REST API v4 only
- keep request parameters simple and conservative
- do not depend on newer GraphQL or newer GitLab-only conveniences
- avoid UI coupling to page DOM
- handle paginated responses explicitly

The design assumes the instance exposes the standard project, branch, and user endpoints available in GitLab `11.11.3-ee`.

Terminology constraint:

- "project web URL" means the `web_url` field returned by the GitLab projects API
- it does not mean Git clone URLs

Chrome compatibility reference:

- Chrome Developers `chrome.sidePanel` API docs state availability as `Chrome 114+ MV3+`: https://developer.chrome.com/docs/extensions/reference/api/sidePanel

## Testing Strategy

### Unit Tests

Test pure logic for:

- base URL normalization
- active-tab URL parsing to project path candidate
- matching `pathWithNamespace`
- recent-project dedupe
- recent-project sorting
- recent-project trimming
- grouping projects into `Recent` and full list display sections

### Integration Tests

Test GitLab client request behavior with mocked fetch:

- successful connection validation
- failed connection validation
- multi-page project loading
- multi-page branch loading
- API error propagation

### Manual Verification

Verify in Chrome:

- side panel opens correctly
- config can be saved and restored
- GitLab `11.11.3-ee` connection succeeds with valid token
- accessible projects load correctly
- current open GitLab project can be preselected
- recent-project section updates after project selection
- branch selection shows latest commit hash
- copy buttons work for URL, branch, and hash

## Open Implementation Decisions

These do not block the design, but should be finalized in implementation planning:

- whether the side panel talks to GitLab directly or through the service worker
- exact UI framework choice, if any
- exact dropdown implementation for grouped recent projects
- exact visual treatment for detected current-page project

## Recommended Initial Implementation Direction

Use:

- Manifest V3
- Chrome Side Panel
- `chrome.storage.local`
- a small shared GitLab API client
- direct URL parsing for current-tab matching
- a simple grouped select for projects with `Recent` at the top

This keeps the first version aligned with the requested workflow and minimizes unnecessary complexity.
