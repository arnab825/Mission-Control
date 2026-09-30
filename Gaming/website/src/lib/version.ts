import versionData from "../../version.json";

export const APP_VERSION: string = (versionData as { version?: string })?.version || "3.7.9";
