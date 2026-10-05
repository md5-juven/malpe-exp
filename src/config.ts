export const SHEETS_CONFIG = {
  scriptUrl: import.meta.env.VITE_GOOGLE_SCRIPT_URL as string | undefined,
};

/** @deprecated kept for migration cleanup */
export const USER_STORAGE_KEY = "tabcheck-user";
export const AUTH_SESSION_KEY = "tabcheck-auth";
export const AUTH_TOKEN_KEY = "tabcheck-token";

export function isSheetsConfigured(): boolean {
  return Boolean(SHEETS_CONFIG.scriptUrl?.trim());
}

export function getAdminUsers(): string[] {
  const raw = import.meta.env.VITE_ADMIN_USERS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
