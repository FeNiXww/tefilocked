import { describe, expect, it } from 'vitest';
import { tokenizePrayer } from './tokenizePrayer';
import type { Verse } from '../../content/types';

describe('tokenizePrayer', () => {
  it('splits on whitespace only, keeping niqqud and punctuation attached to their word', () => {
    const verses: Verse[] = [
      { number: 1, hebrewText: 'מוֹדֶה אֲנִי לְפָנֶיךָ מֶלֶךְ חַי וְקַיָּם שֶׁהֶחֱזַרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה, רַבָּה אֱמוּנָתֶךָ' },
    ];
    const { verses: tokenized, totalWords } = tokenizePrayer(verses);
    expect(totalWords).toBe(12);
    expect(tokenized[0].words.map((w) => w.text)).toEqual([
      'מוֹדֶה',
      'אֲנִי',
      'לְפָנֶיךָ',
      'מֶלֶךְ',
      'חַי',
      'וְקַיָּם',
      'שֶׁהֶחֱזַרְתָּ',
      'בִּי',
      'נִשְׁמָתִי',
      'בְּחֶמְלָה,',
      'רַבָּה',
      'אֱמוּנָתֶךָ',
    ]);
    expect(tokenized[0].startIndex).toBe(0);
    expect(tokenized[0].endIndex).toBe(11);
  });

  it('keeps the divine-name abbreviation (ה\') as a single word', () => {
    const verses: Verse[] = [{ number: 2, hebrewText: "כִּי אִם בְּתוֹרַת ה' חֶפְצוֹ" }];
    const { verses: tokenized } = tokenizePrayer(verses);
    expect(tokenized[0].words.map((w) => w.text)).toEqual(['כִּי', 'אִם', 'בְּתוֹרַת', "ה'", 'חֶפְצוֹ']);
  });

  it('assigns sequential global indices across multiple verses', () => {
    const verses: Verse[] = [
      { number: 1, hebrewText: 'אשרי האיש' },
      { number: 2, hebrewText: 'כי אם בתורת' },
    ];
    const { verses: tokenized, totalWords } = tokenizePrayer(verses);
    expect(totalWords).toBe(5);
    expect(tokenized[0].startIndex).toBe(0);
    expect(tokenized[0].endIndex).toBe(1);
    expect(tokenized[1].startIndex).toBe(2);
    expect(tokenized[1].endIndex).toBe(4);
    expect(tokenized[1].words.map((w) => w.globalIndex)).toEqual([2, 3, 4]);
  });

  it('handles an empty verse list', () => {
    const { verses: tokenized, totalWords } = tokenizePrayer([]);
    expect(tokenized).toEqual([]);
    expect(totalWords).toBe(0);
  });
});
