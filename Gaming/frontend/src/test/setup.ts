import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import '@testing-library/jest-dom/vitest';

// Extends Vitest's expect method with custom matchers from jest-dom (like toBeInTheDocument)
expect.extend(matchers);

// Provide robust in-memory localStorage polyfill for test environment
if (typeof window !== 'undefined') {
  const storage: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => (key in storage ? storage[key] : null),
    setItem: (key: string, value: string) => {
      storage[key] = String(value);
    },
    removeItem: (key: string) => {
      delete storage[key];
    },
    clear: () => {
      Object.keys(storage).forEach((k) => delete storage[k]);
    },
    key: (i: number) => Object.keys(storage)[i] ?? null,
    get length() {
      return Object.keys(storage).length;
    },
  };
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).localStorage = mockLocalStorage;
  }
}

afterEach(() => {
  cleanup();
});
