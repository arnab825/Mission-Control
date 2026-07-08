import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../SidebarLeft';

const mockUseUser = vi.fn();
const mockUseClerk = vi.fn();
const mockSignOut = vi.fn();

// Mock Clerk hooks cleanly
vi.mock('@clerk/clerk-react', () => ({
  useUser: () => mockUseUser(),
  useClerk: () => mockUseClerk(),
}));

describe('SidebarLeft Component', () => {
  const mockOnClose = vi.fn();
  const mockOnNavigate = vi.fn();
  const mockOnTriggerUpdateCheck = vi.fn();
  const mockOnTriggerChangelogs = vi.fn();

  const mockState = {
    version: '1.3.0'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseClerk.mockReturnValue({
      signOut: mockSignOut,
    });
  });

  it('renders navigation links and highlights active page', () => {
    mockUseUser.mockReturnValue({
      isSignedIn: false,
      user: null,
    });

    render(
      <Sidebar
        isOpen={true}
        onClose={mockOnClose}
        activePage="dashboard"
        onNavigate={mockOnNavigate}
        state={mockState}
        onTriggerUpdateCheck={mockOnTriggerUpdateCheck}
        onTriggerChangelogs={mockOnTriggerChangelogs}
      />
    );

    // Verify all navigation items exist
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Vision')).toBeInTheDocument();
    expect(screen.getByText('Stability Lab')).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();

    // Verify that active page has the active style classes
    const activeBtn = screen.getByText('Dashboard').closest('button');
    expect(activeBtn?.className).toContain('bg-white/10');
  });

  it('calls onNavigate callback when clicking a navigation link', () => {
    mockUseUser.mockReturnValue({
      isSignedIn: false,
      user: null,
    });

    render(
      <Sidebar
        isOpen={true}
        onClose={mockOnClose}
        activePage="dashboard"
        onNavigate={mockOnNavigate}
        state={mockState}
        onTriggerUpdateCheck={mockOnTriggerUpdateCheck}
        onTriggerChangelogs={mockOnTriggerChangelogs}
      />
    );

    const settingsBtn = screen.getByText('Settings').closest('button');
    fireEvent.click(settingsBtn!);

    expect(mockOnNavigate).toHaveBeenCalledWith('settings');
  });

  it('renders Clerk profile information and handles disconnect when signed in', () => {
    mockUseUser.mockReturnValue({
      isSignedIn: true,
      user: {
        id: 'user_arnab123',
        firstName: 'Arnab',
        username: 'arnab825',
        primaryEmailAddress: { emailAddress: 'arnab@gmail.com' },
        imageUrl: 'http://example.com/avatar.png',
      },
    });

    render(
      <Sidebar
        isOpen={true}
        onClose={mockOnClose}
        activePage="dashboard"
        onNavigate={mockOnNavigate}
        state={mockState}
        onTriggerUpdateCheck={mockOnTriggerUpdateCheck}
        onTriggerChangelogs={mockOnTriggerChangelogs}
      />
    );

    // Verify authentication badge is active
    expect(screen.getByText('Active')).toBeInTheDocument();

    // Verify user information is rendered
    expect(screen.getByText('arnab825')).toBeInTheDocument();
    expect(screen.getByText('arnab@gmail.com')).toBeInTheDocument();
    const avatar = screen.getByAltText('Avatar');
    expect(avatar).toBeInTheDocument();
    expect(avatar.getAttribute('src')).toBe('http://example.com/avatar.png');

    // Trigger Sign Out
    const disconnectBtn = screen.getByTitle('Sign Out');
    fireEvent.click(disconnectBtn);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('renders sign in prompt when signed out', () => {
    mockUseUser.mockReturnValue({
      isSignedIn: false,
      user: null,
    });

    render(
      <Sidebar
        isOpen={true}
        onClose={mockOnClose}
        activePage="dashboard"
        onNavigate={mockOnNavigate}
        state={mockState}
        onTriggerUpdateCheck={mockOnTriggerUpdateCheck}
        onTriggerChangelogs={mockOnTriggerChangelogs}
      />
    );

    // Check status badge
    expect(screen.getByText('Offline')).toBeInTheDocument();
    
    // Check "Link Neural Node" CTA button is rendered
    expect(screen.getByText('Link Neural Node')).toBeInTheDocument();
    expect(screen.getByText('Sign in to sync your library')).toBeInTheDocument();
  });

  it('triggers update check and changelog functions on button click', () => {
    mockUseUser.mockReturnValue({
      isSignedIn: false,
      user: null,
    });

    render(
      <Sidebar
        isOpen={true}
        onClose={mockOnClose}
        activePage="dashboard"
        onNavigate={mockOnNavigate}
        state={mockState}
        onTriggerUpdateCheck={mockOnTriggerUpdateCheck}
        onTriggerChangelogs={mockOnTriggerChangelogs}
      />
    );

    // Verify version code renders
    expect(screen.getByText('v1.3.0')).toBeInTheDocument();

    // Trigger Check updates
    const checkBtn = screen.getByText('Check').closest('button');
    fireEvent.click(checkBtn!);
    expect(mockOnTriggerUpdateCheck).toHaveBeenCalledTimes(1);

    // Trigger changelogs
    const changelogBtn = screen.getByText('Notes').closest('button');
    fireEvent.click(changelogBtn!);
    expect(mockOnTriggerChangelogs).toHaveBeenCalledTimes(1);
  });
});
