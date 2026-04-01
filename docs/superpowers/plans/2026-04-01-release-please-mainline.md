# Release Please Mainline Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual `dev -> release -> main` release workflow with a single-mainline `main` release flow powered by `release-please`.

**Architecture:** The repository will keep one long-lived release branch, `main`. A GitHub Actions workflow on `main` will run `release-please` to maintain a release PR and create tags/releases from conventional commits. The existing manual release workflow will be removed to avoid conflicting release paths.

**Tech Stack:** GitHub Actions, release-please-action, Conventional Commits

---

### Task 1: Add release-please configuration

**Files:**
- Create: `.github/release-please-config.json`
- Create: `.github/.release-please-manifest.json`

- [ ] **Step 1: Configure package metadata and release type**

Set the release-please manifest releaser type for this repository and the root package path.

- [ ] **Step 2: Configure changelog sections**

Map commit types such as `feat`, `fix`, `docs`, and `ci` to readable changelog sections and hide low-signal entries when appropriate.

### Task 2: Replace the manual release workflow

**Files:**
- Delete: `.github/workflows/create-release.yml`
- Create: `.github/workflows/release-please.yml`

- [ ] **Step 1: Add the release-please workflow**

Run on pushes to `main` with the required permissions so release-please can open and update release PRs and tags.

- [ ] **Step 2: Remove the old manual release entrypoint**

Delete the manual workflow to prevent duplicate release mechanisms in the same repository.

### Task 3: Document and verify the migration

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a short release process note**

Explain that releases now come from merges to `main` and are managed by release-please.

- [ ] **Step 2: Run the smallest relevant validation**

Check workflow syntax and inspect the diff to confirm only the intended release automation changes are present.
