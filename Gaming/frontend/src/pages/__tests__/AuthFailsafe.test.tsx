import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import AuthPage from '../AuthPage';

vi.mock('@clerk/clerk-react', () => ({
  useSignIn: () => ({
    isLoaded: true,
    signIn: {
      create: vi.fn(),
      authenticateWithRedirect: vi.fn(),
    },
    setActive: vi.fn(),
  }),
  useSignUp: () => ({
    isLoaded: true,
    signUp: {
      create: vi.fn(),
      authenticateWithRedirect: vi.fn(),
    },
    setActive: vi.fn(),
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Authentication Failsafe & Browser Redirection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the Browser Auth failsafe button on AuthPage', () => {
    render(<AuthPage />);
    const failsafeButton = screen.getByText(/Trouble Signing In\? Use Browser Auth/i);
    expect(failsafeButton).toBeInTheDocument();
  });

  it('triggers browser-based authentication redirection when failsafe button is clicked', async () => {
    const mockOpenBrowserAuth = vi.fn().mockResolvedValue({ success: true, url: 'http://127.0.0.1:43221/?browser_auth=1' });
    window.electronAPI = {
      ...(window.electronAPI || ({} as any)),
      openBrowserAuth: mockOpenBrowserAuth,
    };

    render(<AuthPage />);
    const failsafeButton = screen.getByText(/Trouble Signing In\? Use Browser Auth/i);
    fireEvent.click(failsafeButton);

    await waitFor(() => {
      expect(mockOpenBrowserAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy: 'oauth_google',
          mode: 'login',
          reason: 'user_selected_browser_failsafe',
        })
      );
    });
  });

  it('automatically triggers browser auth failsafe when in-app auth popup fails to load', async () => {
    const mockOpenAuthPopup = vi.fn().mockResolvedValue({
      success: false,
      error: 'ERR_CONNECTION_REFUSED (-102)',
    });
    const mockOpenBrowserAuth = vi.fn().mockResolvedValue({ success: true });

    window.electronAPI = {
      ...(window.electronAPI || ({} as any)),
      openAuthPopup: mockOpenAuthPopup,
      openBrowserAuth: mockOpenBrowserAuth,
    };

    render(<AuthPage />);
    const buttons = screen.getAllByRole('button');
    // First SSO button is Google OAuth
    const googleButton = buttons.find((b) => b.querySelector('svg path[d*="22.56"]'));
    expect(googleButton).toBeDefined();

    if (googleButton) {
      fireEvent.click(googleButton);
      await waitFor(() => {
        expect(mockOpenAuthPopup).toHaveBeenCalled();
        expect(mockOpenBrowserAuth).toHaveBeenCalledWith(
          expect.objectContaining({
            strategy: 'oauth_google',
            mode: 'login',
            reason: expect.stringContaining('ERR_CONNECTION_REFUSED'),
          })
        );
      });
    }
  });
});

