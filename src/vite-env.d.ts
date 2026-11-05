/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Apps Script web app URL that receives the contact form (see server/contact.gs). */
  readonly VITE_CONTACT_ENDPOINT?: string
  /** Search Console and Bing Webmaster ownership tokens (FACTS.md, "Search and AI"); unset = no tag. */
  readonly VITE_GOOGLE_SITE_VERIFICATION?: string
  readonly VITE_BING_SITE_VERIFICATION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
