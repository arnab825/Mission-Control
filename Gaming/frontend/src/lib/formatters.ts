/**
 * Utility functions for formatting raw telemetry data
 */

/**
 * Formats a number of bytes into a human-readable string (e.g., "1.2 GB")
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Formats CPU frequency in MHz to a cleaner string (either MHz or GHz if it exceeds 1000)
 */
export const formatFrequency = (mhz: number): string => {
  if (mhz >= 1000) {
    return `${(mhz / 1000).toFixed(2)} GHz`;
  }
  return `${mhz.toFixed(0)} MHz`;
};

/**
 * Formats a temperature number to include the Celsius symbol
 */
export const formatTemp = (temp: number | string | null | undefined): string => {
  if (temp == null || temp === '') return '---°C';
  return `${temp}°C`;
};

/**
 * Formats a percentage value cleanly (e.g., 91.23% -> "91.2%")
 */
export const formatPercent = (pct: number | null | undefined, decimals = 1): string => {
  if (pct == null) return '0%';
  return `${pct.toFixed(decimals)}%`;
};
