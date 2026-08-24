import * as publicApi from '../src/index';

describe('public API barrel', () => {
  it('exports all documented components', () => {
    expect(publicApi.CioAsaProvider).toBeDefined();
    expect(publicApi.Chat).toBeDefined();
    expect(publicApi.ResultsBlock).toBeDefined();
    expect(publicApi.Button).toBeDefined();
  });

  it('exports the public hooks', () => {
    expect(publicApi.useAsaResults).toBeDefined();
    expect(typeof publicApi.useAsaResults).toBe('function');
    expect(typeof publicApi.useAsaTracking).toBe('function');
    expect(typeof publicApi.useCioAsaContext).toBe('function');
  });

  it('exports the product normalizer util', () => {
    expect(typeof publicApi.normalizeItemToProduct).toBe('function');
  });

  it('re-exports the ConstructorIOClient value', () => {
    expect(publicApi.ConstructorIOClient).toBeDefined();
  });
});
