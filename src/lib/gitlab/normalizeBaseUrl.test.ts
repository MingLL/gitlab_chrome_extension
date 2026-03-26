import { describe, expect, it } from 'vitest';
import { normalizeBaseUrl } from './normalizeBaseUrl';

describe('normalizeBaseUrl', () => {
  it('removes a trailing slash from a domain URL', () => {
    expect(normalizeBaseUrl('https://gitlab.example.com/')).toBe('https://gitlab.example.com');
  });

  it('keeps path prefixes', () => {
    expect(normalizeBaseUrl('https://gitlab.example.com/gitlab/')).toBe(
      'https://gitlab.example.com/gitlab'
    );
  });

  it('accepts an IPv4 host without a path prefix', () => {
    expect(normalizeBaseUrl('https://192.168.0.10/')).toBe('https://192.168.0.10');
  });
});
