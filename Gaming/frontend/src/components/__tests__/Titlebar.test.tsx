import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Titlebar from '../Titlebar';

describe('Titlebar Component', () => {
  const mockWindowControls = vi.fn();
  const mockToggleHUD = vi.fn();

  beforeAll(() => {
    // Mock the Electron IPC API available on the window object
    (window as any).electronAPI = {
      windowControls: mockWindowControls,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with default state', () => {
    render(<Titlebar showHUD={false} onToggleHUD={mockToggleHUD} />);
    
    // Check that application title is present
    expect(screen.getByText('Mission Control')).toBeInTheDocument();
    
    // Check that HUD button is present
    const hudBtn = screen.getByRole('button', { name: /hud/i });
    expect(hudBtn).toBeInTheDocument();
    expect(hudBtn.className).toContain('text-zinc-500'); // inactive color
  });

  it('reflects showHUD active state class change', () => {
    render(<Titlebar showHUD={true} onToggleHUD={mockToggleHUD} />);
    
    const hudBtn = screen.getByRole('button', { name: /hud/i });
    expect(hudBtn.className).toContain('text-neon-green'); // active color
    expect(hudBtn.className).toContain('glow-green');
  });

  it('calls onToggleHUD when clicked', () => {
    render(<Titlebar showHUD={false} onToggleHUD={mockToggleHUD} />);
    
    const hudBtn = screen.getByRole('button', { name: /hud/i });
    fireEvent.click(hudBtn);
    
    expect(mockToggleHUD).toHaveBeenCalledTimes(1);
  });

  it('triggers window control commands correctly', () => {
    render(<Titlebar showHUD={false} onToggleHUD={mockToggleHUD} />);
    
    // Find minimize, maximize, close buttons
    // Since they only contain icons, we retrieve them by their buttons/actions
    const buttons = screen.getAllByRole('button');
    // Index mapping in Titlebar:
    // buttons[0] = HUD
    // buttons[1] = Minimize
    // buttons[2] = Maximize
    // buttons[3] = Close
    
    expect(buttons).toHaveLength(4);
    
    // Click Minimize
    fireEvent.click(buttons[1]);
    expect(mockWindowControls).toHaveBeenCalledWith('minimize');
    
    // Click Maximize
    fireEvent.click(buttons[2]);
    expect(mockWindowControls).toHaveBeenCalledWith('maximize');
    
    // Click Close
    fireEvent.click(buttons[3]);
    expect(mockWindowControls).toHaveBeenCalledWith('close');
  });
});
