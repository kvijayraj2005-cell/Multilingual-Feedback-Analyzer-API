export type DetectedLanguage =
  | 'tamil'
  | 'sinhala'
  | 'english'
  | 'tanglish'
  | 'singlish'
  | 'mixed_other'
  | 'unknown';

export type Script = 'tamil_native' | 'sinhala_native' | 'latin' | 'mixed';

export interface LanguageResult {
  detectedLang: DetectedLanguage;
  script: Script;
  containsCodeMix: boolean;
}

// Unicode ranges for quick heuristic pre-checks (not used for classification — Gemini does the real work)
const TAMIL_RANGE = /[஀-௿]/;
const SINHALA_RANGE = /[඀-෿]/;

export function heuristicScript(text: string): Script {
  const hasTamil = TAMIL_RANGE.test(text);
  const hasSinhala = SINHALA_RANGE.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);

  if (hasTamil && !hasSinhala && !hasLatin) return 'tamil_native';
  if (hasSinhala && !hasTamil && !hasLatin) return 'sinhala_native';
  if ((hasTamil || hasSinhala) && hasLatin) return 'mixed';
  return 'latin';
}
