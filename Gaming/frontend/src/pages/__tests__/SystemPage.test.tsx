import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import SystemPage from '../SystemPage';
import type { TelemetryState } from '../../types/telemetry';

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    userId: 'mock_user_123',
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = MockResizeObserver;

describe('SystemPage Component', () => {
  const mockSendCommand = vi.fn();
  const mockState = {
    cpu_pct: 45.0,
    cpu_temp: 70.0,
    mem_pct: 60.0,
    gpu_metrics: {
      utilization: 80.0,
      temp: 75.0,
      vram_used: 4000.0,
      vram_total: 8000.0,
      vram_percent: 50.0
    },
    disk_util: 12.0,
    net_util: 5.0,
    session_history: [
      {
        game_name: "Cyberpunk 2077",
        duration_secs: 1200,
        start_time: Date.now() - 1200 * 1000,
        end_time: Date.now(),
        perf_score_avg: 90.0,
        fps: { avg: 95.0, min: 55.0, max: 120.0 },
        gpu: { utilization: { avg: 85 }, temperature: { max: 80 } },
        cpu: { utilization: { avg: 60 }, temperature: { max: 75 } },
        findings: [
          "FPS fell to 55.0 during combat.",
          "CPU temperature reached 75°C."
        ],
        events: [
          {
            type: "frame_spike",
            timestamp: Date.now() - 600 * 1000,
            data: {
              message: "Instant FPS dropped to 55.0",
              scene_type: "combat",
              location: "Watson District",
              active_quests: ["The Rescue"],
              dialogue: "",
              hardware_metrics: { capture_fps: 55.0, cpu_temp: 75.0, gpu_temp: 78.0, vram_used_mb: 4000.0, vram_total_mb: 8000.0 }
            }
          }
        ]
      }
    ]
  } as unknown as TelemetryState;

  it('renders default system telemetry details', () => {
    render(<SystemPage state={mockState} sendCommand={mockSendCommand} />);

    // Header title should render
    expect(screen.getByText('System Telemetry')).toBeInTheDocument();
    expect(screen.getByText('Monitor Active')).toBeInTheDocument();
    
    // CPU Utilization text should render
    expect(screen.getByText('CPU Utilization')).toBeInTheDocument();
  });

  it('switches to Performance Intel view and requests session history', () => {
    render(<SystemPage state={mockState} sendCommand={mockSendCommand} />);

    // Select the button by its text content (unique before switching)
    const intelBtn = screen.getByText('Performance Intel');
    expect(intelBtn).toBeInTheDocument();

    fireEvent.click(intelBtn);

    // Should render performance intel title specifically as heading
    expect(screen.getByRole('heading', { name: 'Performance Intel' })).toBeInTheDocument();

    // Should call get_session_history command
    expect(mockSendCommand).toHaveBeenCalledWith('get_session_history', { userId: 'guest' });

    // Should render Findings from state session history
    expect(screen.getByText('FPS fell to 55.0 during combat.')).toBeInTheDocument();
    expect(screen.getByText('CPU temperature reached 75°C.')).toBeInTheDocument();
  });

  it('shows stress map bars correctly', () => {
    render(<SystemPage state={mockState} sendCommand={mockSendCommand} />);

    const intelBtn = screen.getByText('Performance Intel');
    fireEvent.click(intelBtn);

    // Verify stress map labels exist
    expect(screen.getByText('CPU Core Temp')).toBeInTheDocument();
    expect(screen.getByText('GPU Core Temp')).toBeInTheDocument();
    expect(screen.getByText('VRAM Footprint')).toBeInTheDocument();
    expect(screen.getByText('RAM Saturation')).toBeInTheDocument();
  });

  it('opens and closes Wrapped modal', () => {
    render(<SystemPage state={mockState} sendCommand={mockSendCommand} />);

    const intelBtn = screen.getByText('Performance Intel');
    fireEvent.click(intelBtn);

    const wrappedBtn = screen.getByText('View Session Wrapped');
    expect(wrappedBtn).toBeInTheDocument();

    fireEvent.click(wrappedBtn);

    // Wrapped modal should be visible
    expect(screen.getByText('Cyberpunk 2077 Summary')).toBeInTheDocument();
    expect(screen.getByText('95')).toBeInTheDocument(); // Avg FPS
    expect(screen.getByText('Balanced Load')).toBeInTheDocument(); // Bottleneck

    const doneBtn = screen.getByText('Done');
    fireEvent.click(doneBtn);

    // Modal should close
    expect(screen.queryByText('Cyberpunk 2077 Summary')).toBeNull();
  });

  it('renders dual GPU detection and MUX switch controls in Details view', () => {
    const dualGpuState = {
      ...mockState,
      system_specs: {
        hardware: {
          cpu: '13th Gen Intel Core i7-13620H',
          gpu: 'NVIDIA GeForce RTX 5050 Laptop GPU',
          ram: '16GB',
          storage: '512GB NVMe SSD',
          gpus: [
            {
              index: '0000',
              name: 'Intel(R) UHD Graphics',
              vendor: 'Intel',
              type: 'integrated',
              driver_version: '32.0.101.7088',
              vram_mb: 2048,
              vram_gb: 2.0,
              is_primary: true,
              is_display_active: true,
              active_displays: ['\\\\.\\DISPLAY1']
            },
            {
              index: '0001',
              name: 'NVIDIA GeForce RTX 5050 Laptop GPU',
              vendor: 'NVIDIA',
              type: 'discrete',
              driver_version: '32.0.16.2124',
              vram_mb: 8151,
              vram_gb: 8.0,
              is_primary: false,
              is_display_active: false,
              active_displays: []
            }
          ],
          mux_switch: {
            has_mux: true,
            current_mode: 'hybrid',
            user_preferred_mode: 'hybrid',
            display_routing: 'Internal Panel -> Intel(R) UHD Graphics (Optimus PCIe pass-through buffer)',
            latency_mode: 'standard_hybrid',
            active_display_gpu: 'Intel(R) UHD Graphics',
            dgpu_name: 'NVIDIA GeForce RTX 5050 Laptop GPU',
            igpu_name: 'Intel(R) UHD Graphics',
            supports_advanced_optimus: true,
            form_factor: 'laptop',
            architecture_type: 'hybrid_mux',
            primary_oem: {
              id: 'hp_omen',
              name: 'HP OMEN Gaming Hub',
              brand: 'HP',
              category: 'oem_suite',
              protocol: 'omencommandcenter:'
            },
            installed_oem_suites: [
              {
                id: 'hp_omen',
                name: 'HP OMEN Gaming Hub',
                brand: 'HP',
                category: 'oem_suite',
                protocol: 'omencommandcenter:'
              }
            ],
            brand_vocabulary: {
              discrete: 'OMEN Discrete Mode',
              hybrid: 'OMEN Hybrid Mode',
              igpu_only: 'OMEN Eco Mode',
              auto: 'OMEN Auto Switch'
            }
          }
        },
        displays: [{ resolution: '1920x1080', refresh: '144Hz' }]
      }
    } as unknown as TelemetryState;

    render(<SystemPage state={dualGpuState} sendCommand={mockSendCommand} />);

    // Header MUX chip should be present
    expect(screen.getByText('MUX ROUTING')).toBeInTheDocument();
    expect(screen.getByText('HYBRID (OPTIMUS)')).toBeInTheDocument();

    // Switch to Details view
    const detailsBtn = screen.getByText('Details');
    fireEvent.click(detailsBtn);

    // MUX Switch card should be rendered
    expect(screen.getByText('GPU Architecture & MUX Switch')).toBeInTheDocument();
    expect(screen.getByText('Hybrid MUX Capable')).toBeInTheDocument();
    expect(screen.getByText('Live Display Pipeline')).toBeInTheDocument();

    // Both dGPU and iGPU cards should be rendered
    expect(screen.getByText('Discrete Graphics (dGPU)')).toBeInTheDocument();
    expect(screen.getByText('Integrated Graphics (iGPU)')).toBeInTheDocument();
    expect(screen.getAllByText('Intel(R) UHD Graphics').length).toBeGreaterThan(0);

    // Clicking a MUX switch mode should trigger set_gpu_working_mode command
    const dgpuDirectBtn = screen.getByText('dGPU Direct');
    fireEvent.click(dgpuDirectBtn);
    expect(mockSendCommand).toHaveBeenCalledWith('set_gpu_working_mode', { mode: 'discrete' });

    // OEM Companion buttons and Display Switcher should trigger bridge commands
    const oemBtn = screen.getByTitle('Launch HP OMEN Gaming Hub');
    expect(oemBtn).toBeInTheDocument();
    fireEvent.click(oemBtn);
    expect(mockSendCommand).toHaveBeenCalledWith('open_oem_software', { protocol: 'omencommandcenter:', suite_id: 'hp_omen' });

    const switcherBtn = screen.getByText('Display Switcher');
    fireEvent.click(switcherBtn);
    expect(mockSendCommand).toHaveBeenCalledWith('open_display_switcher', {});
  });
});
