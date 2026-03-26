const SUPPORTED_PROTOCOLS = new Set(['http:', 'https:']);
const NON_PROJECT_PATHS = new Set(['dashboard/projects', 'explore/projects', 'admin/projects']);

function isSupportedHttpUrl(url: URL): boolean {
  return SUPPORTED_PROTOCOLS.has(url.protocol);
}

function hasPathBoundary(tabPath: string, basePath: string): boolean {
  if (basePath === '') {
    return true;
  }

  return tabPath === basePath || tabPath.startsWith(`${basePath}/`);
}

function safeDecode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

export function matchProjectPathFromTab(tabUrl: string, baseUrl: string): string | null {
  let tab: URL;
  let base: URL;

  try {
    tab = new URL(tabUrl);
    base = new URL(baseUrl);
  } catch {
    return null;
  }

  if (!isSupportedHttpUrl(tab) || !isSupportedHttpUrl(base)) {
    return null;
  }

  if (tab.origin !== base.origin) {
    return null;
  }

  const basePath = base.pathname === '/' ? '' : base.pathname.replace(/\/$/, '');
  const tabPath = tab.pathname;

  if (!hasPathBoundary(tabPath, basePath)) {
    return null;
  }

  const strippedPath = basePath === '' ? tabPath : tabPath.slice(basePath.length);
  const rawSegments = strippedPath.split('/').filter(Boolean);
  const segments: string[] = [];

  for (const segment of rawSegments) {
    const decoded = safeDecode(segment);
    if (decoded === null) {
      return null;
    }
    segments.push(decoded);
  }

  if (segments.length < 2) {
    return null;
  }

  const markerIndex = segments.indexOf('-');
  if (markerIndex === 0) {
    return null;
  }

  const projectSegments = markerIndex === -1 ? segments : segments.slice(0, markerIndex);
  if (projectSegments.length < 2) {
    return null;
  }

  const candidate = projectSegments.join('/');
  if (NON_PROJECT_PATHS.has(candidate)) {
    return null;
  }

  return candidate;
}
