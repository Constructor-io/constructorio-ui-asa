describe('bundled entry (SSR)', () => {
  it('is browser-only and cannot be imported on the server', () => {
    // The module assigns `window.CioAsa` at module scope, with no `typeof`
    // guard, so importing it in a Node environment throws. This is expected
    // for the standalone script-tag build — SSR consumers must import the
    // package entry point instead.
    expect(typeof window).toBe('undefined');

    expect(() => {
      jest.isolateModules(() => {
        // eslint-disable-next-line global-require
        require('../src/bundled');
      });
    }).toThrow(ReferenceError);
  });
});
