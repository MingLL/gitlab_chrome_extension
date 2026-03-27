# Chrome Extension Package Design

## Goal

Add a release-packaging capability that produces a zip archive suitable for manual upload to the Chrome Web Store.

The project already supports local extension builds through `npm run build`, which generates an unpacked extension under `dist/`. This work adds the missing distribution step for store submission without introducing automated store publishing.

## Scope

In scope:

- add a packaging script that creates a Chrome Web Store upload zip
- ensure the zip contains the built extension files directly, not an extra top-level `dist/` folder
- derive the archive file name from the project version
- store packaged artifacts in a dedicated release directory
- document the packaging workflow

Out of scope:

- automated upload to the Chrome Web Store
- Chrome Web Store API integration
- signing, credential storage, or release-channel automation
- changes to extension runtime behavior

## Recommended Approach

Use the existing `build` pipeline as the source of truth, then add a separate Node packaging script invoked by a new npm script.

Recommended flow:

1. Run the existing build to refresh `dist/`
2. Ensure a `release/` directory exists
3. Read the extension version from `package.json`
4. Create `release/gitlab-chrome-extension-<version>.zip`
5. Zip the contents of `dist/` directly so the uploaded archive has the correct root layout

This keeps packaging isolated from the app code and avoids changing the current extension build structure.

## Alternatives Considered

### 1. Recommended: dedicated packaging script

Add `scripts/package-extension.mjs` and a `package:extension` npm script.

Pros:

- minimal change to the existing build flow
- easy for humans to understand and run
- keeps packaging concerns out of Vite config

Cons:

- still requires manual store upload

### 2. Fold packaging into `npm run build`

Pros:

- one command for everything

Cons:

- mixes local-development build output with release concerns
- creates release artifacts even when developers only want unpacked output

### 3. Introduce a full release toolchain

Pros:

- future automation path

Cons:

- unnecessary complexity for the current need

## Design Details

### Scripts

Add:

- `npm run package:extension`

Behavior:

- executes the existing build
- creates or refreshes a versioned zip artifact under `release/`

### Packaging Script

Create:

- `scripts/package-extension.mjs`

Responsibilities:

- read `package.json`
- compute the zip output path from `name` and `version`
- create the `release/` directory if missing
- remove any stale archive with the same name before creating a new one
- run a zip command against the contents of `dist/`
- print the final output path for operator feedback

Implementation choice:

- prefer a small Node wrapper that shells out to the system `zip` command

Reasoning:

- the workspace already uses Node scripts for build support
- this avoids adding a new npm dependency only for packaging
- the wrapper can control output naming and directory layout more reliably than a README-only manual step

### Output Layout

Archive path:

- `release/gitlab-chrome-extension-<version>.zip`

Archive contents:

- `manifest.json`
- `background/service-worker.js`
- `sidepanel/index.html`
- `assets/*`
- `icons/*`

Important:

- the zip must contain extension files at its root
- it must not wrap everything inside `dist/`

### Documentation

Update `README.md` to explain:

- `npm run package:extension`
- where the zip is written
- that the generated archive is intended for Chrome Web Store manual upload

## Error Handling

The packaging command should fail with clear messages when:

- `dist/` is missing because the build did not run or failed
- `zip` is unavailable on the machine
- `package.json` lacks a usable `name` or `version`

The script should surface command failures directly so release issues are easy to diagnose.

## Testing And Verification

Verification should include:

- existing unit tests still pass
- build still succeeds
- packaging command succeeds and produces the expected zip file
- the archive file name includes the current package version
- the archive contains root-level extension files rather than a nested `dist/` directory

Suggested verification commands:

```bash
npm test -- --run
npm run build
npm run package:extension
unzip -l release/gitlab-chrome-extension-<version>.zip
```

## Risks

### Environment dependency on `zip`

The packaging script depends on the host machine having the `zip` command available.

Mitigation:

- fail fast with a clear error
- document the expectation in the README if needed

### Incorrect archive layout

If the script zips the `dist/` directory itself instead of its contents, Chrome Web Store upload may reject the package or produce a broken install.

Mitigation:

- explicitly zip from inside `dist/`
- verify archive listing in the release workflow

## Success Criteria

The work is complete when:

- a maintainer can run `npm run package:extension`
- a versioned zip appears under `release/`
- the zip is suitable for manual upload to Chrome Web Store
- current build and test workflows still succeed
