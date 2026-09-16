import React, { useMemo, useState } from 'react';
import useCioClient from '../../hooks/useCioClient';
import { AsaContextValue, IncludeRenderProps, CioAsaProviderProps } from '../../types';
import { AsaContext } from '../../hooks/useCioAsaContext';
import * as defaultFormatters from '../../utils/formatters';
import * as defaultUrlHelpers from '../../utils/urlHelpers';
import { createLocalStoragePersistence } from '../../utils/chatPersistence';

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
    persistence: persistenceOption,
    children,
  } = props;

  const [cioClientOptions, setCioClientOptions] = useState({});
  const cioClient = useCioClient({ apiKey, cioClient: customCioClient, cioClientOptions });

  const clientOptions = (
    cioClient as unknown as { options?: { apiKey?: string; userId?: string | number } } | null
  )?.options;
  const resolvedApiKey = apiKey ?? clientOptions?.apiKey;
  const userId = clientOptions?.userId != null ? String(clientOptions.userId) : undefined;
  const { domain } = staticRequestConfigs;
  const persistence = useMemo(() => {
    if (!persistenceOption) return undefined;
    if (persistenceOption === true) {
      // Scoped per user when the client carries one, so a shared browser never shows
      // the previous shopper's conversation after a login change.
      return createLocalStoragePersistence({
        namespace: [resolvedApiKey ?? 'default', domain ?? 'default', userId]
          .filter(Boolean)
          .join(':'),
      });
    }
    return persistenceOption;
  }, [persistenceOption, resolvedApiKey, domain, userId]);

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
      persistence,
    }),
    [
      cioClient,
      cioClientOptions,
      formatters,
      urlHelpers,
      staticRequestConfigs,
      callbacks,
      section,
      persistence,
    ],
  );

  return (
    <AsaContext.Provider value={contextValue}>
      {typeof children === 'function' ? children(contextValue) : children}
    </AsaContext.Provider>
  );
}
