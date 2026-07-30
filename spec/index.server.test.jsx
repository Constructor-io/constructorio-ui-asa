import * as publicApi from '../src/index';

describe('public entry point (SSR)', () => {
  it('imports in a Node environment without touching browser globals', () => {
    expect(typeof window).toBe('undefined');
    expect(publicApi).toBeDefined();
  });

  it('exports the public components', () => {
    expect(typeof publicApi.CioAsaProvider).toBe('function');
    expect(publicApi.Chat).toBeDefined();
    expect(publicApi.ResultsBlock).toBeDefined();
    expect(typeof publicApi.Button).toBe('function');
  });

  it('exports the public hook and utils', () => {
    expect(typeof publicApi.useAsaResults).toBe('function');
    expect(typeof publicApi.normalizeItemToProduct).toBe('function');
  });

  it('re-exports the Constructor JS client', () => {
    expect(typeof publicApi.ConstructorIOClient).toBe('function');
  });

  it('does not leak internal helpers into the public surface', () => {
    expect(publicApi.useCioClient).toBeUndefined();
    expect(publicApi.translate).toBeUndefined();
    expect(publicApi.ChatInput).toBeUndefined();
  });
});
