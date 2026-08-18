import React, { useMemo, useState } from 'react';
import useCioClient from '../../hooks/useCioClient';
import { AsaContextValue, IncludeRenderProps, CioAsaProviderProps } from '../../types';
import { AsaContext } from '../../hooks/useCioAsaContext';
import * as defaultFormatters from '../../utils/formatters';
import * as defaultUrlHelpers from '../../utils/urlHelpers';

export default function CioAsaProvider(
  props: IncludeRenderProps<CioAsaProviderProps, AsaContextValue>,
) {
  const {
    apiKey,
    formatters,
    urlHelpers,
    staticRequestConfigs = { domain: 'chatbot' },
    cioClient: customCioClient,
    callbacks,
    section = 'Products',
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
      formatters: { ...defaultFormatters, ...formatters },
      urlHelpers: { ...defaultUrlHelpers, ...urlHelpers },
      callbacks,
      section,
    }),
    [cioClient, cioClientOptions, formatters, urlHelpers, staticRequestConfigs, callbacks, section],
  );

  return (
    <AsaContext.Provider value={contextValue}>
      {typeof children === 'function' ? children(contextValue) : children}
    </AsaContext.Provider>
  );
}
