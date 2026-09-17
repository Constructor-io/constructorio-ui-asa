import React, { useEffect, useMemo, useState } from 'react';
import useCioClient from '../../hooks/useCioClient';
import { AsaContextValue, IncludeRenderProps, CioAsaProviderProps } from '../../types';
import { AsaContext } from '../../hooks/useCioAsaContext';
import * as defaultFormatters from '../../utils/formatters';
import * as defaultUrlHelpers from '../../utils/urlHelpers';
import {
  createLocalStoragePersistence,
  persistenceNamespace,
} from '../../utils/localStoragePersistence';

const normalizeUserId = (value: string | number | null | undefined): string | undefined =>
  value == null || value === '' ? undefined : String(value);

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
    persistConversation: persistenceEnabled,
    userId: userIdProp,
    children,
  } = props;

  const [cioClientOptions, setCioClientOptions] = useState({});
  // With `apiKey` the client is built here, so the prop reaches it too and requests and storage agree.
  const clientInit = useMemo(
    () =>
      userIdProp === undefined
        ? cioClientOptions
        : { ...cioClientOptions, userId: userIdProp ?? undefined },
    [cioClientOptions, userIdProp],
  );
  const cioClient = useCioClient({
    apiKey,
    cioClient: customCioClient,
    cioClientOptions: clientInit,
  });

  const clientOptions = (
    cioClient as unknown as { options?: { apiKey?: string; userId?: string | number } } | null
  )?.options;
  const resolvedApiKey = apiKey ?? clientOptions?.apiKey;
  const clientUserId = normalizeUserId(clientOptions?.userId);
  const userId = userIdProp === undefined ? clientUserId : normalizeUserId(userIdProp);
  const { domain } = staticRequestConfigs;

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (userIdProp === undefined || !clientOptions || clientUserId === userId) return;
    // eslint-disable-next-line no-console
    console.warn(
      `[cio-asa] userId "${userId ?? 'none'}" differs from the client's "${clientUserId ?? 'none'}". Agent requests use the client's id, stored chats use userId: set both to the same value.`,
    );
  }, [userIdProp, clientOptions, clientUserId, userId]);

  const persistence = useMemo(() => {
    if (!persistenceEnabled) return undefined;
    // Per-user namespace so a shared browser never shows the previous shopper's chat.
    return createLocalStoragePersistence({
      namespace: persistenceNamespace({ apiKey: resolvedApiKey, domain, userId }),
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
