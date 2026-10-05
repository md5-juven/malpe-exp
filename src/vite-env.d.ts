/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_SCRIPT_URL?: string;
  readonly VITE_BASE_PATH?: string;
  readonly VITE_ADMIN_USERS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
