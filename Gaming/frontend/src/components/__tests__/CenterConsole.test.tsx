import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CenterConsole from '../CenterConsole';
import type { ChatMessage } from '../CenterConsole';

// Simple mock for framer-motion to avoid animation overhead and potential jsdom layout issues
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('CenterConsole Component', () => {
  beforeAll(() => {
    // Mock scrollTo since JSDOM does not implement it on HTMLElements
    HTMLElement.prototype.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const mockChat: ChatMessage[] = [
    { role: 'agent', text: 'Hello, how can I assist your gameplay?', time: '10:00 AM' },
    { role: 'user', text: 'Analyze my combat strategy.', time: '10:01 AM' },
  ];

  const mockOnSendMessage = vi.fn();
  const mockToggleMic = vi.fn();

  it('renders messages correctly with roles and times', () => {
    render(
      <CenterConsole
        chat={mockChat}
        onSendMessage={mockOnSendMessage}
        isListening={false}
        toggleMic={mockToggleMic}
      />
    );

    // Verify agent message text
    expect(screen.getByText('Hello, how can I assist your gameplay?')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('10:00 AM')).toBeInTheDocument();

    // Verify user message text
    expect(screen.getByText('Analyze my combat strategy.')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('10:01 AM')).toBeInTheDocument();
  });

  it('calls onSendMessage when form is submitted with non-empty input', () => {
    render(
      <CenterConsole
        chat={mockChat}
        onSendMessage={mockOnSendMessage}
        isListening={false}
        toggleMic={mockToggleMic}
      />
    );

    const input = screen.getByPlaceholderText('Send a command...');
    const form = input.closest('form');

    expect(form).not.toBeNull();

    // Type a command
    fireEvent.change(input, { target: { value: 'optimize_graphics' } });
    expect((input as HTMLInputElement).value).toBe('optimize_graphics');

    // Submit form
    fireEvent.submit(form!);

    expect(mockOnSendMessage).toHaveBeenCalledWith('optimize_graphics');
    // Value should be cleared after submit
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('does not call onSendMessage when input is empty or whitespace only', () => {
    render(
      <CenterConsole
        chat={mockChat}
        onSendMessage={mockOnSendMessage}
        isListening={false}
        toggleMic={mockToggleMic}
      />
    );

    const input = screen.getByPlaceholderText('Send a command...');
    const form = input.closest('form');

    // Try submitting empty
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.submit(form!);
    expect(mockOnSendMessage).not.toHaveBeenCalled();

    // Try submitting whitespace
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(form!);
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('calls toggleMic when mic button is clicked', () => {
    render(
      <CenterConsole
        chat={mockChat}
        onSendMessage={mockOnSendMessage}
        isListening={false}
        toggleMic={mockToggleMic}
      />
    );

    // The microphone button is the button containing the mic icon or retrieved by finding the button that is not submit (type=submit)
    const buttons = screen.getAllByRole('button');
    // buttons[0] is the mic toggle, buttons[1] is the submit button
    const micButton = buttons[0];
    
    fireEvent.click(micButton);
    expect(mockToggleMic).toHaveBeenCalledTimes(1);
  });

  it('applies glowing styles to mic button when active (isListening=true)', () => {
    const { rerender } = render(
      <CenterConsole
        chat={mockChat}
        onSendMessage={mockOnSendMessage}
        isListening={false}
        toggleMic={mockToggleMic}
      />
    );

    const buttonsInactive = screen.getAllByRole('button');
    expect(buttonsInactive[0].className).toContain('text-zinc-600');
    expect(buttonsInactive[0].className).not.toContain('text-neon-green');

    rerender(
      <CenterConsole
        chat={mockChat}
        onSendMessage={mockOnSendMessage}
        isListening={true}
        toggleMic={mockToggleMic}
      />
    );

    const buttonsActive = screen.getAllByRole('button');
    expect(buttonsActive[0].className).toContain('text-neon-green');
    expect(buttonsActive[0].className).toContain('glow-green');
  });
});
