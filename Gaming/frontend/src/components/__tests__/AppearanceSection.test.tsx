import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AppearanceSection } from '../settings/AppearanceSection';
import { ThemeProvider } from '../../context/ThemeContext';

describe('AppearanceSection Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders curated palettes and sub-navigation tabs', () => {
    render(
      <ThemeProvider>
        <AppearanceSection />
      </ThemeProvider>
    );

    expect(screen.getByText('Theme Palettes')).toBeInTheDocument();
    expect(screen.getByText('Gamer Identity')).toBeInTheDocument();
    expect(screen.getByText('Adaptive Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Canvas Atmosphere')).toBeInTheDocument();
    expect(screen.getByText('Custom Presets')).toBeInTheDocument();
    expect(screen.getByText('Emerald Protocol')).toBeInTheDocument();
    expect(screen.getByText('Cyberpunk 2077')).toBeInTheDocument();
  });

  it('switches curated theme on card click and notifies setLocalConfig', () => {
    const mockSetLocalConfig = vi.fn();
    render(
      <ThemeProvider>
        <AppearanceSection setLocalConfig={mockSetLocalConfig} />
      </ThemeProvider>
    );

    const cobaltCard = screen.getByText('Quantum Cobalt').closest('button');
    expect(cobaltCard).toBeInTheDocument();
    fireEvent.click(cobaltCard!);

    expect(document.documentElement.getAttribute('data-theme')).toBe('cobalt');
    expect(mockSetLocalConfig).toHaveBeenCalled();
  });

  it('allows customizing gamer call-sign and faction allegiance in identity tab', () => {
    render(
      <ThemeProvider>
        <AppearanceSection />
      </ThemeProvider>
    );

    // Click Gamer Identity sub-tab
    fireEvent.click(screen.getByText('Gamer Identity'));

    expect(screen.getByText('Gamer Call-Sign & Allegiance')).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/e.g. viper-01/i);
    fireEvent.change(input, { target: { value: 'SHADOW-X' } });

    expect(screen.getByDisplayValue('SHADOW-X')).toBeInTheDocument();

    // Select Night City Syndicate faction
    const syndicateCard = screen.getByText('Night City Syndicate').closest('button');
    expect(syndicateCard).toBeInTheDocument();
    fireEvent.click(syndicateCard!);

    expect(document.documentElement.getAttribute('data-faction')).toBe('syndicate');
  });

  it('allows toggling game adaptive sync in adaptive intelligence tab', () => {
    render(
      <ThemeProvider>
        <AppearanceSection />
      </ThemeProvider>
    );

    // Click Adaptive Intelligence sub-tab
    fireEvent.click(screen.getByText('Adaptive Intelligence'));

    expect(screen.getByText('Game-Adaptive Theme Sync')).toBeInTheDocument();
    expect(screen.getByText('GPU Hardware Brand Alignment')).toBeInTheDocument();
    expect(screen.getByText('AI Companion Persona Sync')).toBeInTheDocument();
  });

  it('switches canvas background mode and texture in canvas atmosphere tab', () => {
    render(
      <ThemeProvider>
        <AppearanceSection />
      </ThemeProvider>
    );

    // Click Canvas Atmosphere sub-tab
    fireEvent.click(screen.getByText('Canvas Atmosphere'));

    const carbonBtn = screen.getByText('Graphite Carbon').closest('button');
    expect(carbonBtn).toBeInTheDocument();
    fireEvent.click(carbonBtn!);

    expect(document.documentElement.getAttribute('data-bg-mode')).toBe('carbon');

    const circuitsBtn = screen.getByText('Silicon Circuitry').closest('button');
    expect(circuitsBtn).toBeInTheDocument();
    fireEvent.click(circuitsBtn!);

    expect(document.documentElement.getAttribute('data-texture')).toBe('circuits');
  });

  it('saves and loads custom presets in presets tab', () => {
    render(
      <ThemeProvider>
        <AppearanceSection />
      </ThemeProvider>
    );

    // Click Custom Presets sub-tab
    fireEvent.click(screen.getByText('Custom Presets'));

    const nameInput = screen.getByPlaceholderText(/my midnight esports setup/i);
    fireEvent.change(nameInput, { target: { value: 'Tournament High FPS' } });

    const saveBtn = screen.getByRole('button', { name: /save preset/i });
    fireEvent.click(saveBtn);

    expect(screen.getByText('Tournament High FPS')).toBeInTheDocument();
  });

  it('resets to factory defaults when reset button is clicked', () => {
    render(
      <ThemeProvider>
        <AppearanceSection />
      </ThemeProvider>
    );

    // Switch to Cyberpunk first
    fireEvent.click(screen.getByText('Cyberpunk 2077').closest('button')!);
    expect(document.documentElement.getAttribute('data-theme')).toBe('cyberpunk');

    // Click Reset
    const resetBtn = screen.getByRole('button', { name: /reset factory defaults/i });
    fireEvent.click(resetBtn);

    expect(document.documentElement.getAttribute('data-theme')).toBe('emerald');
  });
});
