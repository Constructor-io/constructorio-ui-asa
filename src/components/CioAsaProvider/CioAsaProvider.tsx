import React, { useMemo, useState } from 'react';
import useCioClient from '../../hooks/useCioClient';
import { AsaContextValue, IncludeRenderProps, CioAsaProviderProps } from '../../types';
import { AsaContext } from '../../hooks/useCioAsaContext';
import * as defaultFormatters from '../../utils/formatters';
import * as defaultUrlHelpers from '../../utils/urlHelpers';
import { createLocalStoragePersistence } from '../../utils/localStoragePersistence';

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
    persistence: persistenceEnabled,
    children,
  } = props;

  const [cioClientOptions, setCioClientOptions] = useState({});
  const cioClient = useCioClient({ apiKey, cioClient: customCioClient, cioClientOptions });

  const clientOptions = (
    cioClient as unknown as { options?: { apiKey?: string; userId?: string | number } } | null
  )?.options;
  const resolvedApiKey = apiKey ?? clientOptions?.apiKey;
  const rawUserId = clientOptions?.userId;
  const userId = rawUserId != null && rawUserId !== '' ? String(rawUserId) : undefined;
  const { domain } = staticRequestConfigs;
  const persistence = useMemo(() => {
    if (!persistenceEnabled) return undefined;
    // Per-user namespace so a shared browser never shows the previous shopper's chat.
    return createLocalStoragePersistence({
      namespace: [resolvedApiKey ?? 'default', domain ?? 'default', userId]
        .filter((part): part is string => part !== undefined)
        .map(encodeURIComponent)
        .join(':'),
    });
  }, [persistenceEnabled, resolvedApiKey, domain, userId]);

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
