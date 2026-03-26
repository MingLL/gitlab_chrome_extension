# GitLab Chrome Extension

Chrome side panel extension for connecting to a GitLab instance, selecting a project and branch, and copying the latest commit details.

## Requirements

- Chrome 114 or newer
- A GitLab base URL such as `https://gitlab.example.com`
- GitLab base URLs may also use IPs, ports, or path prefixes:
  - `http://192.168.1.10`
  - `http://192.168.1.10:8080`
  - `http://192.168.1.10:8080/gitlab`
- A GitLab personal access token that can access your projects and branches

## Install dependencies

```bash
npm install
```

## Build

```bash
npm run build
```

The production output is written to `dist/`.

## Load the unpacked extension in Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select the project's `dist/` directory.
6. Confirm the extension card appears without build errors.

## Open the side panel

1. In `chrome://extensions`, open the extension details page.
2. Pin the extension to the toolbar if needed.
3. Click the extension icon, or use Chrome's side panel entry for the extension.
4. Keep the side panel open while testing GitLab project selection and copy actions.

## GitLab setup

Enter these values in the side panel before connecting:

- `GitLab Base URL`: the root URL for your GitLab instance
- `Token`: a personal access token for that GitLab instance

When you connect to a new GitLab host for the first time, Chrome will request host permission for that GitLab origin or path prefix. The extension must be allowed to access that host before it can call the GitLab API.

## Typical usage

1. Enter `GitLab Base URL`.
2. Enter `Token`.
3. Click `Connect`.
4. Approve the Chrome host permission prompt for that GitLab host.
5. Wait for the project list to load.
6. If the active tab already points to a project on the configured GitLab instance, the extension should preselect that project.
7. Otherwise choose a project manually.
8. Choose a branch.
9. Copy the project URL, branch, or latest commit hash from the result summary.

## Manual acceptance checklist

Use this checklist after loading the unpacked extension.

### Connection and permissions

1. Open the side panel with a fresh extension state.
2. Enter a valid GitLab base URL and token.
3. Click `Connect`.
4. Verify Chrome shows a host permission prompt for the configured GitLab host.
5. Approve the prompt.
6. Verify the extension loads projects successfully.

### Base URL compatibility

Verify the extension accepts each format when reachable in your environment:

1. Domain URL such as `https://gitlab.example.com`
2. IP URL such as `http://192.168.1.10`
3. IP with port such as `http://192.168.1.10:8080`
4. URL with path prefix such as `http://192.168.1.10:8080/gitlab`

### Current tab project matching

1. Open a GitLab project page in Chrome before connecting.
2. Connect with the same GitLab base URL.
3. Verify the matching project is preselected automatically.
4. Open a non-GitLab tab or a tab from another host.
5. Verify the extension shows the mismatch notice and still allows manual project selection.

### Project, branch, and hash flow

1. Confirm the project dropdown contains projects the user can access.
2. Select a project manually.
3. Verify the branch dropdown loads.
4. Select a branch.
5. Verify the latest commit hash updates to the selected branch's head commit.

### Recent projects

1. Manually select a project.
2. Reload the extension side panel.
3. Verify the previously selected project appears in the `Recent` group at the top of the project dropdown.
4. Verify `Recent` entries are scoped to the configured GitLab base URL.

### Copy actions

1. After a project and branch are selected, click `Copy URL`.
2. Paste and verify the copied value is the full project web URL.
3. Click `Copy Branch`.
4. Paste and verify the copied value is the selected branch name.
5. Click `Copy Hash`.
6. Paste and verify the copied value is the latest commit hash.
7. Verify the clicked button temporarily changes to `Copied`.

### Error states

1. Enter an invalid base URL such as `gitlab.example.com` and click `Connect`.
2. Verify the side panel shows `Connection failed. Invalid GitLab base URL.`
3. Deny the Chrome host permission prompt for a new GitLab host.
4. Verify the side panel shows `Connection failed. Host permission request was denied.`
5. Enter an invalid token.
6. Verify the side panel shows the GitLab API error state.

## Test and build

Run the full automated checks with:

```bash
npm test -- --run
npm run build
```
