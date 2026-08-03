import {
  sleep,
  tryCatchify,
  rgbToHsl,
  convertPrimaryColorsToString,
  isHexColor,
  getPreferredColorScheme,
} from '../src/utils';

describe('utils (SSR / node environment)', () => {
  it('sleep resolves without browser timers', async () => {
    await expect(sleep(1)).resolves.toBeUndefined();
  });

  it('tryCatchify returns the wrapped result', () => {
    expect(tryCatchify((a, b) => a + b)(2, 3)).toBe(5);
  });

  it('tryCatchify swallows errors and returns undefined', () => {
    const boom = tryCatchify(() => {
      throw new Error('boom');
    });

    expect(boom()).toBeUndefined();
  });

  it('rgbToHsl converts colors without a canvas', () => {
    expect(rgbToHsl(255, 0, 0)).toEqual([0, 100, 50]);
    expect(rgbToHsl(0, 0, 0)).toEqual([0, 0, 0]);
    expect(rgbToHsl(255, 255, 255)).toEqual([0, 0, 100]);
  });

  it('rgbToHsl normalizes hues in the 270-360° sector to a positive value', () => {
    const [hue] = rgbToHsl(255, 0, 128);

    expect(hue).toBeGreaterThanOrEqual(0);
    expect(hue).toBeLessThan(360);
  });

  it('convertPrimaryColorsToString emits a CSS rule body', () => {
    const css = convertPrimaryColorsToString({
      '--primary-color-h': '210',
      '--primary-color-s': '50%',
      '--primary-color-l': '40%',
    });

    expect(css).toContain('--primary-color-h: 210;');
    expect(css).toContain('--primary-color-s: 50%;');
    expect(css).toContain('--primary-color-l: 40%;');
  });

  it('isHexColor validates 7-character hex strings', () => {
    expect(isHexColor('#ff0000')).toBe(true);
    expect(isHexColor('#zzzzzz')).toBe(false);
    expect(isHexColor('ff0000')).toBe(false);
    expect(isHexColor(undefined)).toBe(false);
  });

  it('getPreferredColorScheme is browser-only and must not be called during SSR', () => {
    // Documents the constraint: it reads window.matchMedia with no guard, so
    // server-side callers have to branch on `typeof window` themselves.
    expect(typeof window).toBe('undefined');
    expect(() => getPreferredColorScheme()).toThrow(ReferenceError);
  });
});
