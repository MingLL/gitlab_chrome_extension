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

  it('rejects non-project GitLab pages', () => {
    expect(
      matchProjectPathFromTab(
        'https://gitlab.example.com/dashboard/projects',
        'https://gitlab.example.com'
      )
    ).toBeNull();
  });

  it('safely returns null for invalid or unsupported tab URLs', () => {
    expect(matchProjectPathFromTab('chrome://settings', 'https://gitlab.example.com')).toBeNull();
    expect(matchProjectPathFromTab('about:blank', 'https://gitlab.example.com')).toBeNull();
  });
});
