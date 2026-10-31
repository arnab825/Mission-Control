import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ThemeQuickMenu } from '../ThemeQuickMenu';
import { ThemeProvider } from '../../context/ThemeContext';

describe('ThemeQuickMenu Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders trigger button with current active theme name', () => {
    render(
      <ThemeProvider>
        <ThemeQuickMenu />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: /app themes/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Emerald Protocol')).toBeInTheDocument();
  });

  it('opens popover on click and shows gamer call-sign, faction and curated themes', () => {
    render(
      <ThemeProvider>
        <ThemeQuickMenu />
      </ThemeProvider>
    );

    const button = screen.getByRole('button', { name: /app themes/i });
    fireEvent.click(button);

    expect(screen.getByText('OPERATIVE-01')).toBeInTheDocument();
    expect(screen.getByText('Cyberpunk 2077')).toBeInTheDocument();
    expect(screen.getByText('Crimson Fury')).toBeInTheDocument();
    expect(screen.getByText('Quantum Cobalt')).toBeInTheDocument();
  });

  it('toggles Game Sync adaptive setting when button clicked', () => {
    render(
      <ThemeProvider>
        <ThemeQuickMenu />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /app themes/i }));

    const gameSyncBtn = screen.getByText(/game sync:/i).closest('button');
    expect(gameSyncBtn).toBeInTheDocument();
    fireEvent.click(gameSyncBtn!);

    // Should now toggle
    expect(screen.getByText(/game sync: off/i)).toBeInTheDocument();
  });

  it('switches theme when an option is clicked', () => {
    render(
      <ThemeProvider>
        <ThemeQuickMenu />
      </ThemeProvider>
    );

    // Open menu
    fireEvent.click(screen.getByRole('button', { name: /app themes/i }));

    // Click Crimson Fury
    const crimsonBtn = screen.getByText('Crimson Fury').closest('button');
    expect(crimsonBtn).toBeInTheDocument();
    fireEvent.click(crimsonBtn!);

    // Trigger button should now show Crimson Fury
    expect(screen.getByText('Crimson Fury')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('crimson');
  });

  it('calls onOpenAppearanceSettings when Personalization Studio button is clicked', () => {
    const handleOpen = vi.fn();
    render(
      <ThemeProvider>
        <ThemeQuickMenu onOpenAppearanceSettings={handleOpen} />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /app themes/i }));

    const customizeBtn = screen.getByText(/open personalization studio/i).closest('button');
    expect(customizeBtn).toBeInTheDocument();
    fireEvent.click(customizeBtn!);

    expect(handleOpen).toHaveBeenCalledTimes(1);
  });
});
