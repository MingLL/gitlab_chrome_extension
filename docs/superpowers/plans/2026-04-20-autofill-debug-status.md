# Autofill Debug Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one-click autofill report clear progress and failure reasons instead of failing silently.

**Architecture:** Keep the existing autofill flow, but surface each stage from the side panel. Catch scripting injection errors, convert them into user-facing Chinese messages, and preserve the existing field-level failure reporting from the injected page script.

**Tech Stack:** React, TypeScript, Vitest, Chrome Extensions Manifest V3

---

### Task 1: Cover silent autofill failures with tests

**Files:**
- Modify: `src/sidepanel/App.test.tsx`
- Modify: `src/lib/autofill/releaseForm.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests for:
- showing a clear message when autofill is triggered without complete selection state
- surfacing an injection exception as a Chinese error
- including stage context when field lookup fails inside the page

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npm test -- --run src/sidepanel/App.test.tsx src/lib/autofill/releaseForm.test.ts`

- [ ] **Step 3: Implement the minimal production changes**

Update the autofill flow to emit progress text, guard messages, and translated injection errors.

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `npm test -- --run src/sidepanel/App.test.tsx src/lib/autofill/releaseForm.test.ts`

- [ ] **Step 5: Run broader verification**

Run: `npm test -- --run`
