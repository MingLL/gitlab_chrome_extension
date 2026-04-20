import { afterEach, describe, expect, it, vi } from 'vitest';

import { autofillReleaseForm } from './releaseForm';

describe('autofillReleaseForm', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('selects git before filling repository url, branch, and hash', () => {
    const events: string[] = [];
    document.body.innerHTML = `
      <label>
        仓库类型
        <select>
          <option value="svn">svn</option>
          <option value="git">git</option>
        </select>
      </label>
      <label>
        svn/git代码路径
        <input />
      </label>
      <label>
        git分支
        <input />
      </label>
      <label>
        svn/git修订号
        <input />
      </label>
    `;

    const repositoryType = document.querySelector('select');
    const repositoryUrl = document.querySelectorAll('input')[0];
    const branch = document.querySelectorAll('input')[1];
    const commitHash = document.querySelectorAll('input')[2];

    repositoryType?.addEventListener('change', () => {
      events.push(`type:${(repositoryType as HTMLSelectElement).value}`);
    });
    repositoryUrl?.addEventListener('input', () => {
      events.push(`url:${(repositoryUrl as HTMLInputElement).value}`);
    });
    branch?.addEventListener('input', () => {
      events.push(`branch:${(branch as HTMLInputElement).value}`);
    });
    commitHash?.addEventListener('change', () => {
      events.push(`hash:${(commitHash as HTMLInputElement).value}`);
    });

    const result = autofillReleaseForm({
      repositoryUrl: 'https://gitlab.example.com/group/app.git',
      branch: 'release/1.0.0',
      commitHash: 'abc123456'
    });

    expect(result).toEqual({ ok: true });
    expect((repositoryType as HTMLSelectElement).value).toBe('git');
    expect((repositoryUrl as HTMLInputElement).value).toBe('https://gitlab.example.com/group/app.git');
    expect((branch as HTMLInputElement).value).toBe('release/1.0.0');
    expect((commitHash as HTMLInputElement).value).toBe('abc123456');
    expect(events).toEqual([
      'type:git',
      'url:https://gitlab.example.com/group/app.git',
      'branch:release/1.0.0',
      'hash:abc123456'
    ]);
  });

  it('returns a clear error when the branch input is missing', () => {
    document.body.innerHTML = `
      <label>
        仓库类型
        <select>
          <option value="git">git</option>
        </select>
      </label>
      <label>
        svn/git代码路径
        <input />
      </label>
      <label>
        svn/git修订号
        <input />
      </label>
    `;

    expect(
      autofillReleaseForm({
        repositoryUrl: 'https://gitlab.example.com/group/app.git',
        branch: 'release/1.0.0',
        commitHash: 'abc123456'
      })
    ).toEqual({
      ok: false,
      reason: '定位发布表单字段失败：未找到 git分支 输入框'
    });
  });

  it('returns a clear error when the repository type selector is missing', () => {
    document.body.innerHTML = '<div>empty page</div>';

    expect(
      autofillReleaseForm({
        repositoryUrl: 'https://gitlab.example.com/group/app.git',
        branch: 'release/1.0.0',
        commitHash: 'abc123456'
      })
    ).toEqual({
      ok: false,
      reason: '定位发布表单字段失败：未找到仓库类型下拉框'
    });
  });
});
