/**
 * Reference server implementation for AI-generated personal prayers.
 *
 * This file is NOT part of the Expo/React Native app bundle — nothing in
 * src/ imports it. It's a starting point for the small backend the app's
 * client (src/ai/prayerGeneration.ts) expects at
 * `${PRAYER_API_BASE_URL}/generate-prayer`. Deploy it (Cloudflare Worker,
 * Vercel/Netlify function, a tiny Node server — anything that can hold an
 * environment variable and answer HTTPS POSTs) and point
 * PRAYER_API_BASE_URL in prayerGeneration.ts at it.
 *
 * Why this can't just run in the React Native app: the Anthropic API key
 * needed to call Claude has full account billing access. Anything shipped
 * inside a mobile app bundle — including "hidden" env vars baked in at
 * build time — can be extracted by anyone who downloads the app. The key
 * must live only in this server's environment, never on-device.
 *
 * Framework-agnostic handler — adapt the request/response plumbing to
 * whatever runtime you deploy this on; the Anthropic call in the middle
 * stays the same.
 *
 * Setup: `npm install @anthropic-ai/sdk` in this backend project, and set
 * ANTHROPIC_API_KEY in its environment (never in the mobile app).
 */

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the server's environment

// Keep this in sync with src/content/types.ts's Mood union and
// src/screens/LockContentFlow/moodLabels.ts.
const MOOD_LABELS_HE: Record<string, string> = {
  stressed: 'לחוץ',
  anxious: 'חרד',
  grateful: 'אסיר תודה',
  lonely: 'בודד',
  happy: 'שמח',
  distracted: 'מוסח דעת',
  tired: 'עייף',
};

const PRAYER_SCHEMA = {
  type: 'object',
  properties: {
    hebrewText: { type: 'string', description: 'The prayer itself, in Hebrew.' },
    translation: { type: 'string', description: 'A brief English translation.' },
    source: { type: 'string', description: 'A short attribution, e.g. a verse or theme it draws on.' },
  },
  required: ['hebrewText', 'translation', 'source'],
  additionalProperties: false,
} as const;

interface GeneratePrayerRequestBody {
  connectionRating: number; // 1-5, from ConnectionCheckIn
  mood: string; // one of the Mood union values
  preferredContentTypes: string[];
}

export async function handleGeneratePrayer(body: GeneratePrayerRequestBody) {
  const moodLabel = MOOD_LABELS_HE[body.mood] ?? body.mood;

  const response = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 400,
    // Short, latency-sensitive, low-complexity generation — low effort is
    // the right tradeoff here, not a downgrade of the model itself.
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: PRAYER_SCHEMA },
    },
    system:
      'את/ה כותב/ת תפילות יהודיות קצרות, אישיות וכנות בעברית, ברוח תהלים ותפילות יומיות מסורתיות. ' +
      'התפילה צריכה להיות 3-6 משפטים, לגעת ברגש שהמשתמש שיתף, ולהוביל אותו לחיבור עם ה׳. ' +
      'הימנע/י מקלישאות. אל תמציא/י פסוקים או תכתוב/י אותם כציטוט מדויק — אפשר להתייחס לרעיון מקראי בעברית חופשית.',
    messages: [
      {
        role: 'user',
        content:
          `המשתמש דירג את הקשר שלו עם ה׳ היום ${body.connectionRating}/5, ` +
          `והרגיש/ה "${moodLabel}". כתוב/י עבורו תפילה אישית קצרה.`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text content in Claude response');
  }

  // With output_config.format set, textBlock.text is already schema-valid JSON.
  return JSON.parse(textBlock.text) as {
    hebrewText: string;
    translation: string;
    source: string;
  };
}

// --- Example: a plain HTTP handler wrapping the function above (adapt to your runtime) ---
//
// export default async function handler(req: Request): Promise<Response> {
//   if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
//   try {
//     const body = (await req.json()) as GeneratePrayerRequestBody;
//     const prayer = await handleGeneratePrayer(body);
//     return Response.json(prayer);
//   } catch (error) {
//     console.error('generatePrayer failed:', error);
//     return new Response('Failed to generate prayer', { status: 500 });
//   }
// }
