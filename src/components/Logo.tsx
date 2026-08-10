import { Image, StyleSheet } from 'react-native';

const MARK = require('../../assets/brand/logo-mark.png');
const FULL = require('../../assets/brand/logo-full.png');

interface LogoProps {
  /** "mark" is the icon alone (rings + tefillin cube + lock); "full" adds the wordmark + tagline. */
  variant?: 'mark' | 'full';
  size?: number;
}

/**
 * Cropped straight from the brand banner (assets/brand/source-banner.png),
 * not a clean transparent asset — rendered with rounded corners so any
 * residual background texture at the crop edges reads as an intentional
 * soft frame rather than a mistake.
 */
export function Logo({ variant = 'mark', size = 96 }: LogoProps) {
  const source = variant === 'mark' ? MARK : FULL;
  const aspectRatio = variant === 'mark' ? 1 : 590 / 575;
  return (
    <Image
      source={source}
      // Explicit height alongside aspectRatio — react-native-web doesn't
      // reliably derive a container height from aspectRatio alone, and
      // without one the absolutely-positioned inner <img> (object-fit:cover)
      // stretches to fill the nearest ancestor that does have a height,
      // which on Home ends up being the whole page.
      style={[styles.image, { width: size, height: size / aspectRatio, aspectRatio, borderRadius: variant === 'mark' ? size / 2 : 20 }]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    overflow: 'hidden',
  },
});
