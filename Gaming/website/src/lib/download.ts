import { APP_VERSION } from "./version";

const GITHUB_REPO = "arnab825/Mission-Control";
const GITHUB_BASE = `https://github.com/${GITHUB_REPO}/releases/latest/download`;

export const AUTO_DOWNLOAD_URL = `${GITHUB_BASE}/MissionControl-Setup.exe`;
export const WINDOWS_INSTALLER_URL = `${GITHUB_BASE}/MissionControl-Setup.exe`;
export const WINDOWS_MSI_URL = `${GITHUB_BASE}/MissionControl-Setup.msi`;
export const WINDOWS_ZIP_URL = `${GITHUB_BASE}/MissionControl-Portable.zip`;

export const LINUX_APPIMAGE_URL = `${GITHUB_BASE}/MissionControl-Linux-${APP_VERSION}.AppImage`;
export const LINUX_DEB_URL = `${GITHUB_BASE}/MissionControl-Linux-${APP_VERSION}.deb`;
export const LINUX_RPM_URL = `${GITHUB_BASE}/MissionControl-Linux-${APP_VERSION}.rpm`;
export const LINUX_TAR_URL = `${GITHUB_BASE}/MissionControl-Linux-${APP_VERSION}.tar.gz`;
export const LINUX_ZIP_URL = `${GITHUB_BASE}/MissionControl-Linux-${APP_VERSION}.zip`;
export const LINUX_INSTALLER_URL = `${GITHUB_BASE}/MissionControl-Linux-${APP_VERSION}.AppImage`;

