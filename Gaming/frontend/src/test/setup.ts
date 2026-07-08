import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extends Vitest's expect method with custom matchers from jest-dom (like toBeInTheDocument)
expect.extend(matchers);

afterEach(() => {
  cleanup();
});
