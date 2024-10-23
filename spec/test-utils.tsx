import { render, renderHook } from '@testing-library/react';
import React from 'react';
import CioAsaProvider from '../src/components/CioAsaProvider/CioAsaProvider';
import { DEMO_API_KEY } from '../src/constants';

const customRender = (ui, options) => render(ui, { wrapper: CioAsaProvider, ...options });

const customRenderHook: typeof renderHook = (callback, options) =>
  renderHook(callback, {
    wrapper: ({ children }) => (
      <CioAsaProvider apiKey={DEMO_API_KEY} {...options?.initialProps}>
        {children}
      </CioAsaProvider>
    ),
  });

export { customRender as renderWithCioAsa, customRenderHook as renderHookWithCioAsa };
