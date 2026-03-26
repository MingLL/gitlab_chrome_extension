export function normalizeBaseUrl(input: string): string {
  const parsed = new URL(input.trim());
  const pathname = parsed.pathname.endsWith('/') && parsed.pathname.length > 1
    ? parsed.pathname.slice(0, -1)
    : parsed.pathname;

  return `${parsed.origin}${pathname === '/' ? '' : pathname}`;
}
