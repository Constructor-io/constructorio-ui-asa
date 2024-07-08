import React, { useMemo, useState } from 'react';
import useCioClient from '../../hooks/useCioClient';
import { AsaContextValue, IncludeRenderProps, CioAsaProviderProps } from '../../types';
import { AsaContext } from '../../hooks/useCioAsaContext';
import * as defaultGetters from '../../utils/itemFieldGetters';
import * as defaultFormatters from '../../utils/formatters';
import * as defaultUrlHelpers from '../../utils/urlHelpers';

export default function CioAsaProvider(
  props: IncludeRenderProps<CioAsaProviderProps, AsaContextValue>,
) {
  const {
    apiKey,
    formatters,
    callbacks,
    itemFieldGetters,
    urlHelpers,
    staticRequestConfigs = { domain: 'assistant' },
    cioClient: customCioClient,
    children,
  } = props;

  const [cioClientOptions, setCioClientOptions] = useState({});
  const cioClient = useCioClient({ apiKey, cioClient: customCioClient, cioClientOptions });

  const contextValue = useMemo(
    (): AsaContextValue => ({
      cioClient,
      cioClientOptions,
      setCioClientOptions,
      staticRequestConfigs,
      itemFieldGetters: { ...defaultGetters, ...itemFieldGetters },
      formatters: { ...defaultFormatters, ...formatters },
      callbacks: { ...callbacks },
      urlHelpers: { ...defaultUrlHelpers, ...urlHelpers },
    }),
    [
      cioClient,
      cioClientOptions,
      itemFieldGetters,
      formatters,
      callbacks,
      urlHelpers,
      staticRequestConfigs,
    ],
  );

  return (
    <AsaContext.Provider value={contextValue}>
      {typeof children === 'function' ? children(contextValue) : children}
    </AsaContext.Provider>
  );
}
