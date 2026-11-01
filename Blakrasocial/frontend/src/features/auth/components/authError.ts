import type { TFunction } from "i18next";
import { ApiError } from "@/shared/api/ApiError";

/** Plain-language message for a failed sign-in / set-password call. */
export function authErrorMessage(error: unknown, t: TFunction): string {
  if (!(error instanceof ApiError)) return t("errors.generic");
  if (error.status === 0) return t("errors.network");
  if (error.status === 429) return t("auth.tooMany");
  if (error.status === 401) return t("auth.badLogin");
  if (error.status === 404) return t("auth.linkExpired");
  if (error.isValidation) {
    const field = error.issues[0]?.field ?? "";
    if (field.toLowerCase().includes("currentpassword")) return t("auth.currentWrong");
    if (field.includes("password")) return t("auth.passwordWeak");
  }
  return error.message || t("errors.generic");
}
