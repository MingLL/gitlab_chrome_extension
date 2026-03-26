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
        json: async () => [
          {
            id: 1,
            name: 'alpha',
            path_with_namespace: 'group/alpha',
            web_url: 'https://gitlab.example.com/group/alpha'
          }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            name: 'main',
            commit: { id: 'abcdef123456' }
          }
        ]
      })
      .mockResolvedValue({
        ok: true,
        json: async () => []
      })
  );
}
