# 🛡️ Security Policy — Mission Control

## Supported Versions

We actively provide security patches, secret scanning audits, and dependency vulnerability updates for the following releases:

| Version | Supported          |
| ------- | ------------------ |
| 3.7.x   | :white_check_mark: |
| 3.6.x   | :x:                |
| < 3.6   | :x:                |

---

## 🔒 Reporting a Vulnerability

The Mission Control team takes the security of our gaming assistant, desktop application, web platform, and distributed node mesh seriously.

If you believe you have discovered a security vulnerability—such as credential exposure, improper input handling, injection vectors, or remote code execution:

1. **Do NOT open a public GitHub issue.** Publicly disclosing vulnerabilities puts the community and users at risk before a fix can be deployed.
2. **Submit a Private Vulnerability Report:**
   * Use GitHub's [Private Security Advisories](https://github.com/arnab825/Mission-Control/security/advisories/new) feature directly on this repository.
   * Or email the maintainers directly at: **security@missioncontrol.app** (or **support@missioncontrol.app**).
3. **What to Include:**
   * A detailed description of the vulnerability.
   * Step-by-step reproduction steps or a minimal Proof of Concept (PoC).
   * Affected sub-project (`Gaming/frontend`, `Gaming/backend`, `Gaming/website`, or `Gaming/distributed_node`).
   * Potential impact and any suggested mitigations.

### Response Timeline
* **Initial Acknowledgment:** Within 48 hours.
* **Assessment & Confirmation:** Within 5 business days.
* **Patch Release & Advisory:** Coordinated release once verified, with credit given to the reporter (unless anonymity is requested).

---

## 🔑 Secrets, Environment Variables & Credential Safety

Mission Control enforces a strict **Zero-Secrets Policy** across all public git branches:

1. **Gitignored Secret Files:**
   * `.env`, `.env.local`, `.env.*.local`, `.env.development`, and `.env.production` are strictly blocked in `.gitignore` and must never be staged or committed.
2. **Contributor Safe Templates:**
   * Only `.env.example` templates containing harmless placeholders and local fallback URLs are committed.
   * Contributors are never asked to provide or receive production credentials.
3. **Production Isolation:**
   * All production tokens (MongoDB Atlas, Clerk Secret Keys, Vercel Blob read/write tokens, NVIDIA NIM API keys, and Azure service secrets) live exclusively in protected cloud deployment dashboards and CI/CD secret vaults.
4. **Accidental Exposure Protocol:**
   * If any sensitive token or API credential is ever inadvertently committed, consider it immediately compromised. Maintainers will promptly rotate/revoke the credential, purge the commit history, and release an advisory.
