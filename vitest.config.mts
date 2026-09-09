import { defineConfig } from 'vitest/config';

// Scoped deliberately to pure-logic modules — content layer (calendar,
// zmanim, eligibility engine, pool safety) plus a couple of standalone
// non-RN helpers elsewhere (e.g. prayer word tokenization) — these have no
// React Native/JSX dependency and run under plain Node, unlike the rest of
// the app. Testing UI components would need a full RN test environment
// (jest + react-test-renderer or similar), which is a separate, larger setup
// this project doesn't have yet — out of scope for this pass; see the
// research doc.
export default defineConfig({
  test: {
    include: ['src/content/**/*.test.ts', 'src/screens/LockContentFlow/tokenizePrayer.test.ts'],
  },
});
