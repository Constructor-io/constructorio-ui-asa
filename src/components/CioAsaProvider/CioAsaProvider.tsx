import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ConstructorClientOptions } from '@constructor-io/constructorio-client-javascript/lib/types';
import useCioClient from '../../hooks/useCioClient';
import {
  AsaContextValue,
  ChatPersistence,
  IncludeRenderProps,
  CioAsaProviderProps,
  StorageArea,
} from '../../types';
import { AsaContext } from '../../hooks/useCioAsaContext';
import * as defaultFormatters from '../../utils/formatters';
import * as defaultUrlHelpers from '../../utils/urlHelpers';
import { readClientOptions } from '../../utils/clientOptions';
import {
  createLocalStoragePersistence,
  isGuest,
  persistenceNamespace,
  storageAreaFor,
} from '../../utils/localStoragePersistence';

const normalizeUserId = (value: string | number | null | undefined): string | undefined =>
  isGuest(value) ? undefined : String(value);

// One store per key for the page, so a chat mounted again finds the answers still streaming into it.
// Not on the server, where the map would outlive the request and grow with every shopper.
const sharedStores = new Map<string, ChatPersistence>();
function sharedStore(namespace: string, storageArea: StorageArea): ChatPersistence {
  if (typeof window === 'undefined')
    return createLocalStoragePersistence({ namespace, storageArea });
  const id = `${storageArea}:${namespace}`;
  const existing = sharedStores.get(id);
  if (existing) return existing;
  const store = createLocalStoragePersistence({ namespace, storageArea });
  sharedStores.set(id, store);
  return store;
}

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
    persistConversation: persistenceEnabled,
    userId: userIdProp,
    children,
  } = props;

  const [cioClientOptions, setCioClientOptions] = useState({});
  const initialUserId = useRef(userIdProp).current;
  const clientInit = useMemo(
    () =>
      initialUserId === undefined
        ? cioClientOptions
        : { ...cioClientOptions, userId: initialUserId ?? undefined },
    [cioClientOptions, initialUserId],
  );
  const cioClient = useCioClient({
    apiKey,
    cioClient: customCioClient,
    cioClientOptions: clientInit,
    testCells,
  });

  const controlledRef = useRef(userIdProp !== undefined);
  if (userIdProp !== undefined) controlledRef.current = true;
  const controlled = controlledRef.current;

  useEffect(() => {
    if (customCioClient || !cioClient || !controlled) {
      return;
    }

    cioClient.setClientOptions({ userId: userIdProp ?? undefined } as ConstructorClientOptions);
  }, [cioClient, customCioClient, controlled, userIdProp]);

  const clientOptions = readClientOptions(cioClient);
  const resolvedApiKey = apiKey ?? clientOptions?.apiKey;
  const clientUserId = normalizeUserId(clientOptions?.userId);
  const userId = controlled ? normalizeUserId(userIdProp) : clientUserId;
  const { domain } = staticRequestConfigs;

  const persistence = useMemo(() => {
    // Without an api key the store could not be scoped to this index, so there is none.
    if (!persistenceEnabled || resolvedApiKey === undefined) return undefined;
    // Per-user namespace so a shared browser never shows the previous shopper's chat.
    return sharedStore(
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
