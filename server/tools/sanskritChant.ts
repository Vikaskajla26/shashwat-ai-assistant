import {
  CANONICAL_SHLOKA_LIBRARY,
  analyzeMatraAndMeter,
  analyzePhonetics,
  convertScript,
  evaluateRecitation,
  TransliterationScheme
} from '../sanskritEngine';

export async function analyzeSanskritShloka(args: { shlokaText?: string; shlokaId?: string; targetScheme?: string }) {
  let shlokaText = args.shlokaText;
  let item = CANONICAL_SHLOKA_LIBRARY.find(s => s.id === args.shlokaId);

  if (!shlokaText && item) {
    shlokaText = item.devanagari;
  }

  if (!shlokaText) {
    shlokaText = CANONICAL_SHLOKA_LIBRARY[0].devanagari;
    item = CANONICAL_SHLOKA_LIBRARY[0];
  }

  const matraInfo = analyzeMatraAndMeter(shlokaText);
  const phonetics = analyzePhonetics(shlokaText);
  const scheme = (args.targetScheme || 'iast') as TransliterationScheme;
  const transliterated = convertScript(shlokaText, 'devanagari', scheme);

  return {
    status: 'success',
    shlokaTitle: item ? item.title : 'Custom Sanskrit Text',
    shlokaText,
    transliteratedText: transliterated,
    targetScheme: scheme,
    matraAnalysis: matraInfo,
    phonetics,
    wordBreakdown: item ? item.wordBreakdown : [],
    meaning: item ? item.meaning : 'Sanskrit Shloka Analysis',
  };
}

export async function evaluateSanskritRecitation(args: { spokenText: string; shlokaId?: string; durationSeconds?: number }) {
  const item = CANONICAL_SHLOKA_LIBRARY.find(s => s.id === args.shlokaId) || CANONICAL_SHLOKA_LIBRARY[0];
  const evalResult = evaluateRecitation(args.spokenText, item, args.durationSeconds || 5.0);

  return {
    status: 'success',
    shlokaTitle: item.title,
    evaluation: evalResult,
  };
}
