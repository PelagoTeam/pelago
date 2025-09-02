// Minimal set — add more as you need
export type TranscribeCode = "en-US" | "ms-MY" | "zh-CN" | "th-TH";

export const LANGUAGES: Array<{ label: string; code: TranscribeCode }> = [
  { label: "English (US)", code: "en-US" },
  { label: "Malay (Malaysia)", code: "ms-MY" },
  { label: "Chinese (Mainland)", code: "zh-CN" },
  { label: "Thai", code: "th-TH" },
];

// Lookups by friendly label or by common locale-ish strings
export const CODE_BY_LABEL: Record<string, TranscribeCode> = Object.fromEntries(
  LANGUAGES.map((l) => [l.label.toLowerCase(), l.code]),
);

export const CODE_BY_LOCALE: Record<string, TranscribeCode> = {
  en: "en-US",
  "en-us": "en-US",
  ms: "ms-MY",
  "ms-my": "ms-MY",
  zh: "zh-CN",
  "zh-cn": "zh-CN",
  th: "th-TH",
  "th-th": "th-TH",
};

export function resolveTranscribeCode(
  profileLanguage?: string | null,
): TranscribeCode | null {
  if (!profileLanguage) return null;
  const key = profileLanguage.toLowerCase();
  return CODE_BY_LABEL[key] ?? CODE_BY_LOCALE[key] ?? null;
}

export function buildWsUrlFromProfile(
  profile: { language?: string | null } | null,
) {
  const baseWsUrl = process.env.NEXT_PUBLIC_STT_WS_URL;
  const code = resolveTranscribeCode(profile?.language);
  if (code) {
    // return `${baseWsUrl}?language=${encodeURIComponent(code)}`;
    return `${baseWsUrl}?language=en-US`;
  }
  // fallback
  return `${baseWsUrl}?language=${encodeURIComponent("en-US")}`;
}
