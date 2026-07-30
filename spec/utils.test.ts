import {
  sleep,
  tryCatchify,
  rgbToHsl,
  convertPrimaryColorsToString,
  isHexColor,
  getPreferredColorScheme,
} from '../src/utils';

describe('sleep', () => {
  it('resolves after the given delay', async () => {
    jest.useFakeTimers();
    const spy = jest.fn();
    sleep(1000).then(spy);
    expect(spy).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(spy).toHaveBeenCalled();
    jest.useRealTimers();
  });
});

// eslint-disable-next-line @cspell/spellchecker
describe('tryCatchify', () => {
  it('returns the wrapped function result on success', () => {
    const wrapped = tryCatchify((a: number, b: number) => a + b);
    expect(wrapped(2, 3)).toBe(5);
  });

  it('swallows thrown errors and returns undefined', () => {
    const wrapped = tryCatchify(() => {
      throw new Error('boom');
    });
    expect(wrapped()).toBeUndefined();
  });
});

describe('rgbToHsl', () => {
  it('converts primary colors correctly', () => {
    expect(rgbToHsl(255, 0, 0)).toEqual([0, 100, 50]); // red
    expect(rgbToHsl(0, 255, 0)).toEqual([120, 100, 50]); // green
    expect(rgbToHsl(0, 0, 255)).toEqual([240, 100, 50]); // blue
  });

  it('normalizes red-dominant hues in the 270-360° sector', () => {
    expect(rgbToHsl(255, 0, 128)).toEqual([330, 100, 50]); // rose
    expect(rgbToHsl(255, 0, 255)).toEqual([300, 100, 50]); // magenta
  });

  it('returns zero saturation for grayscale', () => {
    expect(rgbToHsl(255, 255, 255)).toEqual([0, 0, 100]); // white
    expect(rgbToHsl(0, 0, 0)).toEqual([0, 0, 0]); // black
  });
});

describe('convertPrimaryColorsToString', () => {
  it('embeds the CSS custom properties', () => {
    const result = convertPrimaryColorsToString({
      '--primary-color-h': '200',
      '--primary-color-s': '50%',
      '--primary-color-l': '40%',
    });
    expect(result).toContain('--primary-color-h: 200;');
    expect(result).toContain('--primary-color-s: 50%;');
    expect(result).toContain('--primary-color-l: 40%;');
  });
});

describe('isHexColor', () => {
  it('accepts a 7-char hex color', () => {
    expect(isHexColor('#ff0000')).toBe(true);
    expect(isHexColor('#ABCDEF')).toBe(true);
  });

  it('rejects non-hex strings and wrong lengths', () => {
    expect(isHexColor('#fff')).toBe(false);
    expect(isHexColor('red')).toBe(false);
    expect(isHexColor(undefined)).toBe(false);
    expect(isHexColor('#gggggg')).toBe(false);
  });
});

describe('getPreferredColorScheme', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns "dark" when the dark media query matches', () => {
    jest.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    expect(getPreferredColorScheme()).toBe('dark');
  });

  it('returns "light" otherwise', () => {
    jest.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
    expect(getPreferredColorScheme()).toBe('light');
  });
});
