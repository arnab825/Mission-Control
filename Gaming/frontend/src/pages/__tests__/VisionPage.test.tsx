import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import VisionPage from '../VisionPage';
import type { TelemetryState } from '../../types/telemetry';

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    userId: 'mock_user_123',
  }),
}));

describe('VisionPage Component', () => {
  const mockSendCommand = vi.fn();
  const mockActiveState = {
    is_game_active: true,
    current_game: 'Elden Ring',
    annotated_frame: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // mock 1x1 pixel base64 image
    vision_fps: 45,
    detections_count: 2,
    health: 85,
    vision_profiling: {
      inference: 3.1
    }
  } as unknown as TelemetryState;

  const mockStandbyState = {
    is_game_active: false,
    current_game: null,
    annotated_frame: null,
    vision_fps: 0,
    detections_count: 0,
    health: 100
  } as unknown as TelemetryState;

  it('renders Pipeline Standby mode when state is null or game is inactive', () => {
    const { rerender } = render(<VisionPage state={null} sendCommand={mockSendCommand} />);

    // Header title should render
    expect(screen.getByText('Vision Command Center')).toBeInTheDocument();
    
    // Pipeline state badge should show Standby
    expect(screen.getByText('Pipeline Standby')).toBeInTheDocument();
    
    // Welcome standby text should render
    expect(screen.getByText('Awaiting Game Launch')).toBeInTheDocument();
    expect(screen.getByText(/Mission Control activates automatically when a game is in the foreground/i)).toBeInTheDocument();

    // Rerender with inactive game state
    rerender(<VisionPage state={mockStandbyState} sendCommand={mockSendCommand} />);
    expect(screen.getByText('Pipeline Standby')).toBeInTheDocument();
    expect(screen.getByText('Awaiting Game Launch')).toBeInTheDocument();
    
    // Status metrics should say standby/offline
    expect(screen.getAllByText('Offline')).toHaveLength(2);
    expect(screen.getAllByText('Standby').length).toBeGreaterThanOrEqual(1); // Health
  });

  it('renders Pipeline Active mode and tactical overlay details when game is active', () => {
    render(<VisionPage state={mockActiveState} sendCommand={mockSendCommand} />);

    // Pipeline state badge should show Active
    expect(screen.getByText('Pipeline Active')).toBeInTheDocument();

    // The Awaiting Game Launch banner should not be there
    expect(screen.queryByText('Awaiting Game Launch')).toBeNull();

    // Live Tactical Feed label should exist with game name
    expect(screen.getByText(/Live · Elden Ring/i)).toBeInTheDocument();

    // Detections counts and FPS should render in overlay tag
    expect(screen.getByText((_, element) => 
      element?.tagName.toLowerCase() === 'div' && 
      element.textContent?.replace(/\s+/g, ' ').trim() === 'VIS: 45 fps'
    )).toBeInTheDocument();
    expect(screen.getByText((_, element) => 
      element?.tagName.toLowerCase() === 'div' && 
      element.textContent?.replace(/\s+/g, ' ').trim() === 'TARGETS: 2'
    )).toBeInTheDocument();
    
    // Target Tracking status should show target count
    expect(screen.getByText('Active · 2 Targets')).toBeInTheDocument();

    // Health Status should show numerical value
    expect(screen.getByText('85%')).toBeInTheDocument();

    // Latency should render inference profiling details
    expect(screen.getByText('3.1 ms')).toBeInTheDocument();

    // Tactical frame image should render base64 payload
    const image = screen.getByAltText('Tactical Vision Feed');
    expect(image).toBeInTheDocument();
    expect(image.getAttribute('src')).toContain('data:image/jpeg;base64,');
  });

  it('renders varying threat levels based on target detections', () => {
    const { rerender } = render(
      <VisionPage state={{ ...mockActiveState, detections_count: 0 } as any} sendCommand={mockSendCommand} />
    );
    expect(screen.getByText('NONE')).toBeInTheDocument();

    rerender(
      <VisionPage state={{ ...mockActiveState, detections_count: 2 } as any} sendCommand={mockSendCommand} />
    );
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();

    rerender(
      <VisionPage state={{ ...mockActiveState, detections_count: 5 } as any} sendCommand={mockSendCommand} />
    );
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });
});
