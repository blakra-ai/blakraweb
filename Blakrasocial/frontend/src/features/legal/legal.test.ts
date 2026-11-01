import { describe, expect, it } from "vitest";
import { legalText, type LegalDoc } from "./content";

const vars = { company: "Blakra", email: "privacy@blakra.example", site: "app.blakra.example" };

describe("legal texts", () => {
  it.each<[LegalDoc, string]>([
    ["privacy", "en"],
    ["privacy", "fa"],
    ["terms", "en"],
    ["terms", "fa"],
    ["deletion", "en"],
    ["deletion", "fa"],
  ])("%s (%s) names the contact address", (doc, lang) => {
    const text = legalText(doc, lang, vars);
    expect(text.sections.length).toBeGreaterThan(2);
    expect(JSON.stringify(text)).toContain(vars.email);
  });
});
