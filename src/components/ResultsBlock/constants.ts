export type AspectRatio = '1:1' | '3:4' | '9:16' | '4:3' | '16:9';

export const PEEK_FRACTION = 0.3;

export const aspectRatioMap: Record<AspectRatio, string> = {
  '1:1': '1 / 1',
  '3:4': '3 / 4',
  '9:16': '9 / 16',
  '4:3': '4 / 3',
  '16:9': '16 / 9',
};
