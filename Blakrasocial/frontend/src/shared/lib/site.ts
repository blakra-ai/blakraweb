/** Public facts about the operator, set at build time (VITE_COMPANY_NAME, VITE_CONTACT_EMAIL). */
export const site = {
  company: import.meta.env.VITE_COMPANY_NAME || "Blakra",
  contactEmail: import.meta.env.VITE_CONTACT_EMAIL || "",
} as const;
