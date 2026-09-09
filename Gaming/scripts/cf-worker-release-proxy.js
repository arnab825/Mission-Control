/**
 * Cloudflare Worker: Mission Control Direct Release Proxy
 * 
 * Solves Microsoft Store Partner Center's requirement:
 * "The package URL redirects to another URL. Provide a download URL without redirection."
 *
 * GitHub Releases respond with HTTP 302 Found redirecting to Azure/AWS blob URLs.
 * This worker intercepts the request at Cloudflare's edge, resolves the redirect
 * internally, and streams the binary directly back to Microsoft Store as HTTP 200 OK.
 *
 * Deployment (Free Tier):
 * 1. Log in to Cloudflare Dashboard (dash.cloudflare.com) -> Workers & Pages -> Create application -> Create Worker
 * 2. Name it: `mission-control-release-proxy` -> Deploy
 * 3. Click "Edit Code", replace with this file's code, and click "Deploy".
 * 4. Your direct download URL in Partner Center will be:
 *    https://<your-worker-name>.<your-subdomain>.workers.dev/v3.6.3/MissionControl-Setup.exe
 */

const GITHUB_REPO = 'arnab825/Mission-Control';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Root / Health check response
    if (pathname === '/' || pathname === '') {
      return new Response(
        JSON.stringify({
          status: 'online',
          service: 'Mission Control Release Proxy',
          repository: GITHUB_REPO,
          usage: '/<version>/<filename> (e.g. /v3.6.3/MissionControl-Setup.exe)'
        }, null, 2),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Clean leading prefixes if passed
    const cleanPath = pathname
      .replace(/^\/releases\/download\//, '')
      .replace(/^\/download\//, '')
      .replace(/^\//, '');

    const parts = cleanPath.split('/');
    let targetUrl;

    if (parts.length >= 2) {
      const version = parts[0];
      const filename = parts.slice(1).join('/');
      targetUrl = `https://github.com/${GITHUB_REPO}/releases/download/${version}/${filename}`;
    } else if (parts.length === 1 && parts[0].endsWith('.exe')) {
      // Default to version v3.6.3 if only the executable filename is requested
      targetUrl = `https://github.com/${GITHUB_REPO}/releases/download/v3.6.3/${parts[0]}`;
    } else {
      return new Response('Invalid release asset path. Expected: /:version/:filename (e.g. /v3.6.3/MissionControl-Setup.exe)', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Prepare headers to forward upstream
    const forwardHeaders = new Headers();
    forwardHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MissionControlProxy/3.6.3');
    
    // Crucial: Forward byte-range requests if Microsoft Store checks resumable downloads
    if (request.headers.has('range')) {
      forwardHeaders.set('range', request.headers.get('range'));
    }

    try {
      // Step 1: Follow GitHub 302 redirect manually to obtain the true storage CDN URL
      const githubRes = await fetch(targetUrl, {
        method: request.method,
        headers: forwardHeaders,
        redirect: 'manual'
      });

      let downloadUrl = targetUrl;
      if (githubRes.status === 301 || githubRes.status === 302) {
        const location = githubRes.headers.get('location');
        if (location) {
          downloadUrl = location;
        }
      }

      // Step 2: Stream the binary directly from storage CDN to caller with zero client redirection
      const cdnRes = await fetch(downloadUrl, {
        method: request.method,
        headers: forwardHeaders,
        redirect: 'follow'
      });

      // Step 3: Mirror standard download headers for Microsoft Store verification
      const responseHeaders = new Headers();
      const headersToMirror = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'last-modified',
        'etag',
        'cache-control'
      ];

      for (const h of headersToMirror) {
        if (cdnRes.headers.has(h)) {
          responseHeaders.set(h, cdnRes.headers.get(h));
        }
      }

      // Ensure appropriate binary Content-Type
      if (!responseHeaders.has('content-type')) {
        responseHeaders.set('content-type', 'application/octet-stream');
      }

      const filename = parts[parts.length - 1];
      responseHeaders.set('content-disposition', `attachment; filename="${filename}"`);
      responseHeaders.set('access-control-allow-origin', '*');

      // Return direct HTTP 200 OK (or 206 Partial Content) with binary stream
      return new Response(request.method === 'HEAD' ? null : cdnRes.body, {
        status: cdnRes.status,
        statusText: cdnRes.statusText,
        headers: responseHeaders
      });
    } catch (err) {
      return new Response(`Proxy Error: ${err.message}`, {
        status: 502,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
};
