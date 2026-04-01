# Release Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manually triggered GitHub Actions workflow that creates `release/<tag>` from `dev`, creates the matching tag, and opens a PR to `main`.

**Architecture:** The workflow lives in `.github/workflows` and runs on `workflow_dispatch`. It validates the requested version string, checks for existing remote refs and PRs to prevent duplicates, then uses git plus `gh` to publish the branch, tag, and PR.

**Tech Stack:** GitHub Actions, git, GitHub CLI (`gh`)

---

### Task 1: Add the workflow file

**Files:**
- Create: `.github/workflows/create-release.yml`

- [ ] **Step 1: Draft the workflow structure**

Define `workflow_dispatch`, the `tag` input, action permissions, and the Ubuntu runner.

- [ ] **Step 2: Add validation and duplicate checks**

Validate the tag format and fail if the remote branch, tag, or PR already exists.

- [ ] **Step 3: Add release creation steps**

Create `release/<tag>` from `origin/dev`, create the same tag, push both, and open the PR to `main`.

### Task 2: Verify the workflow change

**Files:**
- Modify: `.github/workflows/create-release.yml`

- [ ] **Step 1: Review the generated YAML**

Check indentation, shell quoting, environment usage, and permissions.

- [ ] **Step 2: Run the smallest relevant validation**

Use repository-local commands to inspect the new file and confirm the worktree only contains the expected release workflow changes.
