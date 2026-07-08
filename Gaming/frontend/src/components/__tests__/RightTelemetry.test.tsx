import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RightTelemetry from '../RightTelemetry';
import type { TelemetryState } from '../../types/telemetry';

describe('RightTelemetry Component', () => {
  const mockState = {
    is_game_active: true,
    system_specs: {
      hardware: {
        gpu: 'NVIDIA GeForce RTX 4090',
        cpu: 'Intel Core i9-14900K',
        ram: '32 GB',
        storage: '1 TB SSD'
      },
      os: 'Windows 11',
      user: 'Administrator'
    },
    gpu_metrics: {
      utilization: 78.5,
      temp: 65,
      vram_used: 10244,
      vram_total: 24576,
      fan_speed: 45,
      vram_percent: 62.1,
      driver_version: '555.85'
    },
    system_metrics: {
      cpu_util: 34.2,
      ram_util: 55.0,
      disk_util: 12.5,
      network_util: 1.2,
      network_speed: '12.4 MB/s',
      cpu_temp: 58.0
    }
  } as unknown as TelemetryState;

  it('contains slide-in and slide-out translate classes depending on isIntelOpen prop', () => {
    const { rerender, container } = render(
      <RightTelemetry
        state={mockState}
        isAgentic={false}
        isListening={false}
        isIntelOpen={false}
      />
    );

    // The root element of RightTelemetry should have transition-transform classes and translate-x-full when closed
    const sidebarElement = container.firstElementChild;
    expect(sidebarElement?.className).toContain('translate-x-full');

    rerender(
      <RightTelemetry
        state={mockState}
        isAgentic={false}
        isListening={false}
        isIntelOpen={true}
      />
    );

    expect(sidebarElement?.className).not.toContain('translate-x-full');
  });

  it('renders status indicators correctly', () => {
    const { rerender } = render(
      <RightTelemetry
        state={mockState}
        isAgentic={true}
        isListening={true}
        isIntelOpen={true}
      />
    );

    // Neural Agent should be active (blinking live state)
    expect(screen.getByText('Neural Agent')).toBeInTheDocument();
    
    // Voice should be active
    expect(screen.getByText('Voice')).toBeInTheDocument();

    // Since mockState.is_game_active is true, Vision should be active
    expect(screen.getByText('Vision')).toBeInTheDocument();

    // Get all 'Live' elements
    const liveBadges = screen.getAllByText('Live');
    // Live badges should exist for Neural Agent, Vision, Bridge, IO Hook, and Voice
    expect(liveBadges.length).toBeGreaterThanOrEqual(3);

    // Render with state.is_game_active = false, isAgentic = false, isListening = false
    const inactiveState = { ...mockState, is_game_active: false };
    rerender(
      <RightTelemetry
        state={inactiveState}
        isAgentic={false}
        isListening={false}
        isIntelOpen={true}
      />
    );

    // Neural Agent, Vision, Voice should now show inactive state (no Live badge)
    // Only Bridge and IO Hook are hardcoded to true
    const newLiveBadges = screen.getAllByText('Live');
    expect(newLiveBadges.length).toBe(2); // Bridge and IO Hook
  });

  it('renders capabilities section correctly', () => {
    render(
      <RightTelemetry
        state={mockState}
        isAgentic={false}
        isListening={false}
        isIntelOpen={true}
      />
    );

    expect(screen.getByText('Story Skip')).toBeInTheDocument();
    expect(screen.getByText('Tactical HUD')).toBeInTheDocument();
    expect(screen.getByText('Sys Tuning')).toBeInTheDocument();
  });

  it('renders reasoning engine metrics properly', () => {
    render(
      <RightTelemetry
        state={mockState}
        isAgentic={false}
        isListening={false}
        isIntelOpen={true}
      />
    );

    expect(screen.getByText('TOK/SEC')).toBeInTheDocument();
    expect(screen.getByText('1,402')).toBeInTheDocument();
    expect(screen.getByText('LATENCY')).toBeInTheDocument();
    expect(screen.getByText('42ms')).toBeInTheDocument();
    expect(screen.getByText('Nemotron')).toBeInTheDocument();
  });
});
