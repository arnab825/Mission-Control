import type { ForgeConfig } from '@electron-forge/shared-types';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    extraResource: ['backend', 'app-update.yml'],
    icon: './public/favicon',
    win32metadata: {
      'requested-execution-level': 'requireAdministrator'
    },
    // Electron Roadmap Item 7: Signing Windows Builds (Authenticode)
    // Automatically signs the output binary if certificate variables are supplied in the build environment.
    ...(process.env.WINDOWS_CERT_PATH ? {
      certificateFile: process.env.WINDOWS_CERT_PATH,
      certificatePassword: process.env.WINDOWS_CERT_PASSWORD || ''
    } : {}),
    // Ignore raw developer source files and configuration scripts in the packaged app
    ignore: [
      /^[/\\]?src($|[/\\])/,
      /^[/\\]?electron($|[/\\])/,
      /^[/\\]?tsconfig\./,
      /^[/\\]?eslint\./,
      /^[/\\]?vite\./,
      /^[/\\]?README\.md$/,
      /^[/\\]?\.git($|[/\\])/,
      /^[/\\]?tests($|[/\\])/,
      /^[/\\]?node_modules($|[/\\])/,
      /^[/\\]?backend($|[/\\])/,
      /^[/\\]?backend-bin($|[/\\])/,
      /^[/\\]?backend-build($|[/\\])/
    ]
  },
  rebuildConfig: {},
  makers: [
    // NSIS installer is built via electron-builder directly in the CI workflow.
    // See .github/workflows/release.yml "Build NSIS installer" step.
    // 2. DEB maker generates the .deb package for Ubuntu/Debian Linux
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: {
        options: {
          maintainer: 'Arnab Roy and Anirudha Basu Thakur <support@yourdomain.com>',
          homepage: 'https://github.com/arnab825/AiAssistant'
        }
      }
    },
    // 3. RPM maker generates the .rpm package for Fedora/RHEL Linux
    {
      name: '@electron-forge/maker-rpm',
      platforms: ['linux'],
      config: {}
    }
  ]
};

export default config;
