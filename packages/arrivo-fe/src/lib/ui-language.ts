export type UiLanguage = "zh" | "en";

export const languagePreferenceKey = "arrivo-ui-language";

export function resolveLanguage(preference: string | null, languages: readonly string[]): UiLanguage {
  if (preference === "zh" || preference === "en") return preference;
  for (const tag of languages) {
    const language = tag.toLowerCase().split(/[-_]/, 1)[0];
    if (language === "zh" || language === "en") return language;
  }
  return "en";
}
