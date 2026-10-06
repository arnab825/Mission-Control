/**
 * Centralized site URL helper reading from environment variables
 * with reliable fallbacks for production, preview, and local development.
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  // Cloudflare Workers / Pages standard hostname
  if (process.env.CF_PAGES_URL) {
    return process.env.CF_PAGES_URL.replace(/\/$/, "");
  }
  // Azure App Service / Azure Functions standard hostname
  if (process.env.WEBSITE_HOSTNAME) {
    return `https://${process.env.WEBSITE_HOSTNAME.replace(/\/$/, "")}`;
  }
  // Azure Static Web Apps hostname
  if (process.env.AZURE_STATIC_WEB_APPS_HOSTNAME) {
    return `https://${process.env.AZURE_STATIC_WEB_APPS_HOSTNAME.replace(/\/$/, "")}`;
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://mission-control.rarnab225.workers.dev";
}

export const BASE_SITE_URL = getBaseUrl();
