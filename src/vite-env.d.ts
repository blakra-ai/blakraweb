/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Apps Script web app URL that receives the contact form (see server/contact.gs). */
  readonly VITE_CONTACT_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
