import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { EmulatorLogo } from '../EmulatorLogo';

const EMULATOR_IDS = [
  'rpcs3', 'pcsx2', 'duckstation', 'dolphin', 'cemu', 'ryujinx',
  'citra', 'ppsspp', 'xenia', 'xemu', 'retroarch', 'mgba',
  'snes9x', 'melonds', 'flycast', 'vita3k', 'mupen64plus'
];

describe('EmulatorLogo Component', () => {
  EMULATOR_IDS.forEach((id) => {
    it(`renders a valid vector SVG logo for emulator "${id}"`, () => {
      const { container } = render(<EmulatorLogo emuId={id} size={32} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.getAttribute('width')).toBe('32');
      expect(svg?.getAttribute('height')).toBe('32');
    });
  });

  it('renders generic fallback gamepad SVG for unknown emulator IDs', () => {
    const { container } = render(<EmulatorLogo emuId="unknown_emulator" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
  });
});

