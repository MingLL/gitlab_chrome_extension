import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.stubGlobal('chrome', {
  cookies: {
    set: vi.fn().mockResolvedValue(undefined)
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined)
    }
  },
  permissions: {
    request: vi.fn().mockResolvedValue(true)
  },
  tabs: {
    query: vi.fn().mockResolvedValue([])
  },
  scripting: {
    executeScript: vi.fn().mockResolvedValue([])
  },
  sidePanel: {
    setPanelBehavior: vi.fn().mockResolvedValue(undefined)
  }
});
