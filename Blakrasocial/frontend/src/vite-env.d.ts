/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PROFILE_KEY_CLAIM?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_COMPANY_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
