export type ReleaseFormAutofillPayload = {
  repositoryUrl: string;
  branch: string;
  commitHash: string;
};

export type ReleaseFormAutofillResult =
  | { ok: true }
  | { ok: false; reason: string };

function normalizeText(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

function findFieldContainer(labelText: string): HTMLElement | null {
  const labels = Array.from(document.querySelectorAll('label'));
  const matchingLabel = labels.find((label) => normalizeText(label.textContent).includes(labelText));

  return matchingLabel instanceof HTMLElement ? matchingLabel : null;
}

function dispatchFieldEvents(element: HTMLElement) {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
}

function setInputValue(input: HTMLInputElement, value: string) {
  input.value = value;
  dispatchFieldEvents(input);
}

function setSelectValue(select: HTMLSelectElement, value: string) {
  select.value = value;
  dispatchFieldEvents(select);
}

export function autofillReleaseForm(payload: ReleaseFormAutofillPayload): ReleaseFormAutofillResult {
  const repositoryTypeField = findFieldContainer('仓库类型')?.querySelector('select');
  if (!(repositoryTypeField instanceof HTMLSelectElement)) {
    return { ok: false, reason: '未找到仓库类型下拉框' };
  }

  const repositoryUrlField = findFieldContainer('svn/git代码路径')?.querySelector('input');
  if (!(repositoryUrlField instanceof HTMLInputElement)) {
    return { ok: false, reason: '未找到 svn/git代码路径 输入框' };
  }

  const branchField = findFieldContainer('git分支')?.querySelector('input');
  if (!(branchField instanceof HTMLInputElement)) {
    return { ok: false, reason: '未找到 git分支 输入框' };
  }

  const commitHashField = findFieldContainer('svn/git修订号')?.querySelector('input');
  if (!(commitHashField instanceof HTMLInputElement)) {
    return { ok: false, reason: '未找到 svn/git修订号 输入框' };
  }

  setSelectValue(repositoryTypeField, 'git');
  setInputValue(repositoryUrlField, payload.repositoryUrl);
  setInputValue(branchField, payload.branch);
  setInputValue(commitHashField, payload.commitHash);

  return { ok: true };
}
