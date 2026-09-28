import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ConstructorClientOptions } from '@constructor-io/constructorio-client-javascript/lib/types';
import useCioClient from '../../hooks/useCioClient';
import { AsaContextValue, IncludeRenderProps, CioAsaProviderProps } from '../../types';
import { AsaContext } from '../../hooks/useCioAsaContext';
import * as defaultFormatters from '../../utils/formatters';
import * as defaultUrlHelpers from '../../utils/urlHelpers';
import { readClientOptions } from '../../utils/clientOptions';
import {
  persistenceNamespace,
  sharedLocalStoragePersistence,
  shopperId,
  storageAreaFor,
} from '../../utils/localStoragePersistence';

export default function CioAsaProvider(
  props: IncludeRenderProps<CioAsaProviderProps, AsaContextValue>,
) {
  const {
    apiKey,
    formatters,
    urlHelpers,
    staticRequestConfigs = { domain: 'chatbot' },
    cioClient: customCioClient,
    testCells,
    callbacks,
    section = 'Products',
    persistConversation: persistOptions,
    userId: userIdProp,
    children,
  } = props;

  // Read field by field: an inline options object is a new reference on every render.
  const persistenceEnabled = Boolean(persistOptions?.enabled);
  const [cioClientOptions, setCioClientOptions] = useState({});
  const initialUserId = useRef(userIdProp).current;
  const clientInit = useMemo(
    () =>
      initialUserId === undefined
        ? cioClientOptions
        : { ...cioClientOptions, userId: shopperId(initialUserId) },
    [cioClientOptions, initialUserId],
  );
  const cioClient = useCioClient({
    apiKey,
    cioClient: customCioClient,
    cioClientOptions: clientInit,
    testCells,
  });

  const userId = shopperId(userIdProp);
  const syncUserId = persistenceEnabled || userIdProp !== undefined;
  useEffect(() => {
    if (customCioClient || !cioClient || !syncUserId) return;
    cioClient.setClientOptions({ userId } as ConstructorClientOptions);
  }, [cioClient, customCioClient, syncUserId, userId]);

  const resolvedApiKey = apiKey ?? readClientOptions(cioClient)?.apiKey;
  const { domain } = staticRequestConfigs;

  const persistence = useMemo(() => {
    if (!persistenceEnabled || resolvedApiKey === undefined) return undefined;

    return sharedLocalStoragePersistence(
      persistenceNamespace({ apiKey: resolvedApiKey, domain, userId }),
      storageAreaFor(userId),
    );
  }, [persistenceEnabled, resolvedApiKey, domain, userId]);

  const persistenceScope = persistence && (userId === undefined ? 'guest' : 'user');
  const persistenceIndex =
    persistence && resolvedApiKey !== undefined
      ? persistenceNamespace({ apiKey: resolvedApiKey, domain })
      : undefined;

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
      persistenceScope,
      persistenceIndex,
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
      persistenceScope,
      persistenceIndex,
    ],
  );

  return (
    <AsaContext.Provider value={contextValue}>
      {typeof children === 'function' ? children(contextValue) : children}
    </AsaContext.Provider>
  );
}
