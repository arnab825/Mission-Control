import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NeuralHistory from '../NeuralHistory';
import type { HistoryItem } from '../NeuralHistory';

describe('NeuralHistory Component', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const mockHistoryItems: HistoryItem[] = [
    { id: '1', title: 'Elden Ring Optimization', time: '10:00 AM', preview: 'Configured DLSS 3 and low-latency.' },
    { id: '2', title: 'Valorant Sound Tuning', time: '11:15 AM', preview: 'Isolated high frequencies for footsteps.' },
    { id: '3', title: 'Cyberpunk Vision Pass', time: 'Yesterday', preview: 'Applied TRT vision model overlays.' },
  ];

  const mockOnSelectSession = vi.fn();
  const mockOnClearHistory = vi.fn();
  const mockOnCreateSession = vi.fn();
  const mockOnDeleteSession = vi.fn();
  const mockOnRenameSession = vi.fn();

  it('renders history items lists correctly', () => {
    render(
      <NeuralHistory
        historyItems={mockHistoryItems}
        activeSessionId="2"
        onSelectSession={mockOnSelectSession}
        onClearHistory={mockOnClearHistory}
        onCreateSession={mockOnCreateSession}
        onDeleteSession={mockOnDeleteSession}
        onRenameSession={mockOnRenameSession}
      />
    );

    // Verify all item titles are present
    expect(screen.getByText('Elden Ring Optimization')).toBeInTheDocument();
    expect(screen.getByText('Valorant Sound Tuning')).toBeInTheDocument();
    expect(screen.getByText('Cyberpunk Vision Pass')).toBeInTheDocument();

    // Verify times
    expect(screen.getByText('10:00 AM')).toBeInTheDocument();
    expect(screen.getByText('11:15 AM')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();

    // Check active session class (should have a specific background/border style and cyan indicators)
    const activeBtn = screen.getByText('Valorant Sound Tuning').closest('button');
    expect(activeBtn?.className).toContain('bg-neon-green/4');
    expect(activeBtn?.className).toContain('border-neon-green/20');

    // Inactive button check
    const inactiveBtn = screen.getByText('Elden Ring Optimization').closest('button');
    expect(inactiveBtn?.className).toContain('border-transparent');
  });

  it('filters history list by search query input', () => {
    render(
      <NeuralHistory
        historyItems={mockHistoryItems}
        activeSessionId="1"
        onSelectSession={mockOnSelectSession}
        onClearHistory={mockOnClearHistory}
        onCreateSession={mockOnCreateSession}
        onDeleteSession={mockOnDeleteSession}
        onRenameSession={mockOnRenameSession}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search logs...');
    
    // Type 'sound' to filter
    fireEvent.change(searchInput, { target: { value: 'sound' } });

    // 'Valorant Sound Tuning' should stay
    expect(screen.getByText('Valorant Sound Tuning')).toBeInTheDocument();
    // 'Elden Ring Optimization' should be filtered out
    expect(screen.queryByText('Elden Ring Optimization')).toBeNull();
    expect(screen.queryByText('Cyberpunk Vision Pass')).toBeNull();
  });

  it('renders empty state when history list is empty', () => {
    render(
      <NeuralHistory
        historyItems={[]}
        activeSessionId="1"
        onSelectSession={mockOnSelectSession}
        onClearHistory={mockOnClearHistory}
        onCreateSession={mockOnCreateSession}
        onDeleteSession={mockOnDeleteSession}
        onRenameSession={mockOnRenameSession}
      />
    );

    expect(screen.getByText('No Sessions')).toBeInTheDocument();
    expect(screen.getByText('No neural optimization logs found.')).toBeInTheDocument();
    
    // The clear history button should not be rendered
    const clearBtn = screen.queryByTitle('Clear all sessions');
    expect(clearBtn).toBeNull();
  });

  it('calls callback functions correctly on interactions', () => {
    render(
      <NeuralHistory
        historyItems={mockHistoryItems}
        activeSessionId="1"
        onSelectSession={mockOnSelectSession}
        onClearHistory={mockOnClearHistory}
        onCreateSession={mockOnCreateSession}
        onDeleteSession={mockOnDeleteSession}
        onRenameSession={mockOnRenameSession}
      />
    );

    // 1. Create Session
    const createBtn = screen.getByRole('button', { name: /new session/i });
    fireEvent.click(createBtn);
    expect(mockOnCreateSession).toHaveBeenCalledTimes(1);

    // 2. Select Session
    const sessionBtn = screen.getByText('Cyberpunk Vision Pass');
    fireEvent.click(sessionBtn);
    expect(mockOnSelectSession).toHaveBeenCalledWith('3');

    // 3. Clear History
    const clearBtn = screen.getByTitle('Clear all sessions');
    fireEvent.click(clearBtn);
    expect(mockOnClearHistory).toHaveBeenCalledTimes(1);

    // 4. Delete Session
    // Specific session trash buttons are only visible when hovered (or always rendered in DOM with opacity-0 or similar)
    const deleteButtons = screen.getAllByTitle('Delete session');
    expect(deleteButtons.length).toBe(3); // 3 items, 3 delete buttons
    fireEvent.click(deleteButtons[0]);
    expect(mockOnDeleteSession).toHaveBeenCalledWith('1');
  });
});
