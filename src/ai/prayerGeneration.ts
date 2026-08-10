import type { ContentItem, ContentType, Mood } from '../content/types';
import { pickContentForMood } from '../content';

// Set this once a backend is deployed (see server/generatePrayer.example.ts
// for a reference implementation). The client NEVER calls the Anthropic API
// directly and NEVER holds an Anthropic API key: that key grants full
// account billing access, and anything shipped inside a mobile app bundle
// can be extracted by anyone who downloads it. This must stay a thin proxy
// to a server you control, the same way RevenueCat's API keys are the only
// secret this app embeds (see src/subscriptions/revenueCatConfig.ts) — an
// LLM provider key is not designed to be client-safe the way a mobile SDK
// key is, so it can't follow that same pattern.
const PRAYER_API_BASE_URL = 'REPLACE_WITH_YOUR_BACKEND_URL';

const REQUEST_TIMEOUT_MS = 8000;

interface GeneratePrayerResponse {
  hebrewText: string;
  translation?: string;
  source?: string;
}

/**
 * Asks the backend for a prayer generated from today's two check-in answers.
 * Returns null (never throws) whenever the backend isn't configured, is
 * unreachable, or errors — callers should fall back to the curated content
 * pool, exactly like RevenueCat's preview mode or MMKV's in-memory fallback
 * elsewhere in this app. A locked-out user must never be stuck because an
 * API call failed.
 */
export async function generatePersonalizedPrayer(
  connectionRating: number,
  mood: Mood,
  preferredContentTypes: ContentType[]
): Promise<ContentItem | null> {
  if (PRAYER_API_BASE_URL.startsWith('REPLACE_WITH_')) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${PRAYER_API_BASE_URL}/generate-prayer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionRating, mood, preferredContentTypes }),
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const data = (await response.json()) as GeneratePrayerResponse;
    if (!data.hebrewText) return null;

    return {
      id: `ai-${Date.now()}`,
      hebrewText: data.hebrewText,
      translation: data.translation,
      source: data.source ?? 'תפילה אישית',
      moods: [mood],
      contentTypes: ['personal_prayers'],
      length: data.hebrewText.length > 200 ? 'medium' : 'short',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Personalized prayer with a curated fallback — the single entry point the lock flow should call. */
export async function pickPersonalizedPrayer(
  connectionRating: number,
  mood: Mood,
  preferredContentTypes: ContentType[]
): Promise<ContentItem | null> {
  const generated = await generatePersonalizedPrayer(connectionRating, mood, preferredContentTypes);
  return generated ?? pickContentForMood(mood, preferredContentTypes);
}
