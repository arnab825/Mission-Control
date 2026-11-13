/**
 * Avatar validation and isolation utilities for Google vs Discord profiles.
 * Prevents Clerk proxy images (https://img.clerk.com/<base64>) from leaking
 * across OAuth provider boundaries.
 */

export function isDiscordAvatarUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Direct known Google hosts are never Discord avatars
  if (trimmed.includes('googleusercontent.com') || trimmed.includes('accounts.google.com')) {
    return false;
  }

  // Direct known Discord hosts
  if (trimmed.includes('cdn.discordapp.com') || trimmed.includes('discordapp.com') || trimmed.includes('discord.com')) {
    return true;
  }

  // Clerk proxied avatars (img.clerk.com/<base64>)
  if (trimmed.includes('img.clerk.com/')) {
    try {
      const b64 = trimmed.split('img.clerk.com/')[1].split('/')[0].split('?')[0];
      const decoded = typeof atob === 'function' ? atob(b64) : '';
      return decoded.includes('discord') && !decoded.includes('googleusercontent');
    } catch (_) {
      return false;
    }
  }

  return false;
}

export function isGoogleAvatarUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Direct known Discord hosts are never Google avatars
  if (trimmed.includes('cdn.discordapp.com') || trimmed.includes('discordapp.com') || trimmed.includes('discord.com')) {
    return false;
  }

  // Direct known Google hosts
  if (trimmed.includes('googleusercontent.com') || trimmed.includes('accounts.google.com')) {
    return true;
  }

  // Clerk proxied avatars (img.clerk.com/<base64>)
  if (trimmed.includes('img.clerk.com/')) {
    try {
      const b64 = trimmed.split('img.clerk.com/')[1].split('/')[0].split('?')[0];
      const decoded = typeof atob === 'function' ? atob(b64) : '';
      return decoded.includes('google') && !decoded.includes('discord');
    } catch (_) {
      return false;
    }
  }

  return false;
}
