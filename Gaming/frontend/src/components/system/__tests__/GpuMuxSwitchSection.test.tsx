import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { GpuMuxSwitchSection } from '../GpuMuxSwitchSection';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('GpuMuxSwitchSection Component', () => {
  const defaultSpecs: any = {
    hardware: {
      cpu: 'Intel Core i7-13700H',
      gpu: 'NVIDIA GeForce RTX 5050 Laptop GPU'
    },
    displays: [{ resolution: '1920x1080', refresh: '144Hz' }]
  };

  it('renders multi-manufacturer app vocabulary (NVIDIA App) accurately without hardcoding OMEN', () => {
    const mockMuxInfo: any = {
      has_mux: true,
      has_dgpu: true,
      has_igpu: true,
      current_mode: 'hybrid',
      user_preferred_mode: 'hybrid',
      effective_mode: 'hybrid',
      display_routing: 'Internal Panel -> Intel(R) UHD Graphics (Optimus PCIe buffer)',
      latency_mode: 'standard_hybrid',
      active_display_gpu: 'Intel(R) UHD Graphics',
      dgpu_name: 'NVIDIA GeForce RTX 5050 Laptop GPU',
      igpu_name: 'Intel(R) UHD Graphics',
      form_factor: 'laptop',
      primary_oem: {
        id: 'nvidia_app',
        name: 'NVIDIA App',
        brand: 'NVIDIA',
        category: 'gpu_vendor',
        protocol: 'nvidiaapp:'
      },
      installed_oem_suites: [
        { id: 'nvidia_app', name: 'NVIDIA App', brand: 'NVIDIA', protocol: 'nvidiaapp:' }
      ],
      brand_vocabulary: {
        discrete: 'NVIDIA GPU Only (Direct MUX)',
        hybrid: 'Optimus (Standard Display)',
        igpu_only: 'Integrated Graphics Only',
        integrated: 'Integrated Graphics Only',
        auto: 'Automatic Select (Advanced Optimus)'
      }
    };

    render(
      <GpuMuxSwitchSection
        muxInfo={mockMuxInfo}
        specs={defaultSpecs}
        handleOpenOemSoftware={vi.fn()}
        handleOpenDisplaySwitcher={vi.fn()}
        handleOpenGraphicsSettings={vi.fn()}
        handleSetMuxMode={vi.fn()}
      />
    );

    // Verify NVIDIA App vocabulary is rendered in both the mode card and the active spec row
    expect(screen.getAllByText('Optimus (Standard Display)').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('NVIDIA GPU Only (Direct MUX)')).toBeInTheDocument();
    expect(screen.getByText('Integrated Graphics Only')).toBeInTheDocument();
    expect(screen.getByText('Automatic Select (Advanced Optimus)')).toBeInTheDocument();

    // Verify OMEN is NOT present
    expect(screen.queryByText(/OMEN/i)).toBeNull();
  });

  it('dynamically adapts pipeline when dGPU is turned off completely (Eco mode)', () => {
    const mockMuxInfo: any = {
      has_mux: true,
      has_dgpu: true,
      has_igpu: true,
      current_mode: 'igpu_only',
      user_preferred_mode: 'igpu_only',
      effective_mode: 'igpu_only',
      display_routing: 'Internal Panel -> Intel(R) UHD Graphics (iGPU Eco Mode, dGPU Suspended)',
      latency_mode: 'zero_latency_direct',
      active_display_gpu: 'Intel(R) UHD Graphics',
      dgpu_name: 'NVIDIA GeForce RTX 5050 Laptop GPU',
      igpu_name: 'Intel(R) UHD Graphics',
      form_factor: 'laptop',
      brand_vocabulary: {
        discrete: 'dGPU Direct',
        hybrid: 'Optimus',
        igpu_only: 'Eco Mode (iGPU Only)',
        integrated: 'Eco Mode (iGPU Only)',
        auto: 'Auto Dynamic'
      }
    };

    render(
      <GpuMuxSwitchSection
        muxInfo={mockMuxInfo}
        specs={defaultSpecs}
        handleOpenOemSoftware={vi.fn()}
        handleOpenDisplaySwitcher={vi.fn()}
        handleOpenGraphicsSettings={vi.fn()}
        handleSetMuxMode={vi.fn()}
      />
    );

    // Discrete GPU suspended node
    expect(screen.getByText('Discrete GPU (Suspended)')).toBeInTheDocument();
    expect(screen.getByText('0W Ultra-Low Power State (Offline)')).toBeInTheDocument();

    // Active iGPU render & controller node
    expect(screen.getByText('Active 3D Render & Controller')).toBeInTheDocument();
    expect(screen.getByText('Eco Mode (dGPU Suspended)')).toBeInTheDocument();
  });

  it('renders 2-node direct pipeline when there is only a dGPU and no iGPU', () => {
    const mockMuxInfo: any = {
      has_mux: false,
      has_dgpu: true,
      has_igpu: false,
      current_mode: 'discrete',
      user_preferred_mode: 'discrete',
      effective_mode: 'discrete',
      display_routing: 'Display -> NVIDIA GeForce RTX 5050 Laptop GPU (Direct PCIe Video Bus)',
      latency_mode: 'zero_latency_direct',
      active_display_gpu: 'NVIDIA GeForce RTX 5050 Laptop GPU',
      dgpu_name: 'NVIDIA GeForce RTX 5050 Laptop GPU',
      igpu_name: '',
      form_factor: 'laptop'
    };

    render(
      <GpuMuxSwitchSection
        muxInfo={mockMuxInfo}
        specs={defaultSpecs}
        handleOpenOemSoftware={vi.fn()}
        handleOpenDisplaySwitcher={vi.fn()}
        handleOpenGraphicsSettings={vi.fn()}
        handleSetMuxMode={vi.fn()}
      />
    );

    // Direct 3D Render & Controller without intermediate iGPU
    expect(screen.getByText('Discrete 3D Render & Controller')).toBeInTheDocument();
    expect(screen.getByText('Direct PCIe Display Output (No iGPU)')).toBeInTheDocument();
    expect(screen.queryByText('Display Controller')).toBeNull();

    // iGPU Eco option should be disabled
    const ecoBtn = screen.getByText('iGPU Only (Eco)').closest('button');
    expect(ecoBtn).toBeDisabled();
  });

  it('fires handleSetMuxMode when a mode card is clicked', () => {
    const handleSetMuxMode = vi.fn();
    const mockMuxInfo: any = {
      has_mux: true,
      has_dgpu: true,
      has_igpu: true,
      current_mode: 'hybrid',
      user_preferred_mode: 'hybrid',
      effective_mode: 'hybrid',
      display_routing: 'Internal Panel -> Intel(R) UHD Graphics (Optimus PCIe buffer)',
      latency_mode: 'standard_hybrid',
      active_display_gpu: 'Intel(R) UHD Graphics',
      dgpu_name: 'NVIDIA GeForce RTX 5050 Laptop GPU',
      igpu_name: 'Intel(R) UHD Graphics',
      form_factor: 'laptop'
    };

    render(
      <GpuMuxSwitchSection
        muxInfo={mockMuxInfo}
        specs={defaultSpecs}
        handleOpenOemSoftware={vi.fn()}
        handleOpenDisplaySwitcher={vi.fn()}
        handleOpenGraphicsSettings={vi.fn()}
        handleSetMuxMode={handleSetMuxMode}
      />
    );

    const ecoButton = screen.getByText('iGPU Only (Eco)').closest('button');
    expect(ecoButton).not.toBeNull();
    fireEvent.click(ecoButton!);

    expect(handleSetMuxMode).toHaveBeenCalledWith('integrated');
  });
});
