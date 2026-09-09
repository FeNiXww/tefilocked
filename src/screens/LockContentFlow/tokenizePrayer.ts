import type { Verse } from '../../content/types';

export interface PrayerWordToken {
  key: string;
  text: string;
  globalIndex: number;
}

export interface TokenizedVerse {
  verse: Verse;
  words: PrayerWordToken[];
  /** Global word index of this verse's first word (undefined-safe: only meaningful when words.length > 0). */
  startIndex: number;
  /** Global word index of this verse's last word (inclusive). */
  endIndex: number;
}

export interface TokenizedPrayer {
  verses: TokenizedVerse[];
  totalWords: number;
}

/**
 * Splits each verse into words on whitespace only — niqqud (combining marks
 * are part of the preceding letter, never separated by a space in this data),
 * punctuation, and God's-name abbreviations (ה' / ה׳) stay attached to their
 * word exactly as authored. No re-formatting of the source text.
 */
export function tokenizePrayer(verses: Verse[]): TokenizedPrayer {
  let globalIndex = 0;
  const tokenizedVerses: TokenizedVerse[] = verses.map((verse) => {
    const rawWords = verse.hebrewText.split(/\s+/).filter(Boolean);
    const startIndex = globalIndex;
    const words: PrayerWordToken[] = rawWords.map((text, i) => ({
      key: `${verse.number}-${i}`,
      text,
      globalIndex: globalIndex++,
    }));
    return { verse, words, startIndex, endIndex: globalIndex - 1 };
  });
  return { verses: tokenizedVerses, totalWords: globalIndex };
}
