import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ConstructorClientOptions } from '@constructor-io/constructorio-client-javascript/lib/types';
import useCioClient from '../../hooks/useCioClient';
import { AsaContextValue, IncludeRenderProps, CioAsaProviderProps } from '../../types';
import { AsaContext } from '../../hooks/useCioAsaContext';
import * as defaultFormatters from '../../utils/formatters';
import * as defaultUrlHelpers from '../../utils/urlHelpers';
import { readClientOptions } from '../../utils/clientOptions';
import {
  createLocalStoragePersistence,
  persistenceNamespace,
  storageAreaFor,
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
  // With `apiKey` the client is built here once, with the id it starts with; later ids are set on it below.
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
  });

  // Once the prop has been given, dropping it means a logout, not "read the id from the client".
  const controlledRef = useRef(userIdProp !== undefined);
  if (userIdProp !== undefined) controlledRef.current = true;
  const controlled = controlledRef.current;

  useEffect(() => {
    if (customCioClient || !cioClient || !controlled) return;
    cioClient.setClientOptions({ userId: userIdProp ?? undefined } as ConstructorClientOptions);
  }, [cioClient, customCioClient, controlled, userIdProp]);

  const clientOptions = readClientOptions(cioClient);
  const resolvedApiKey = apiKey ?? clientOptions?.apiKey;
  const clientUserId = normalizeUserId(clientOptions?.userId);
  const userId = controlled ? normalizeUserId(userIdProp) : clientUserId;
  const { domain } = staticRequestConfigs;

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' || !customCioClient) return;
    if (persistenceEnabled && resolvedApiKey === undefined) {
      // eslint-disable-next-line no-console
      console.warn(
        '[cio-asa] could not read the api key from cioClient, so the conversation is not persisted. Pass apiKey as well.',
      );
    }
    if (!controlled || !clientOptions || clientUserId === userId) return;
    // eslint-disable-next-line no-console
    console.warn(
      `[cio-asa] userId "${userId ?? 'none'}" differs from the client's "${clientUserId ?? 'none'}". Agent requests use the client's id, stored chats use userId: set both to the same value.`,
    );
  }, [
    customCioClient,
    persistenceEnabled,
    resolvedApiKey,
    controlled,
    clientOptions,
    clientUserId,
    userId,
  ]);

  const persistence = useMemo(() => {
    // Without an api key the store could not be scoped to this index, so there is none.
    if (!persistenceEnabled || resolvedApiKey === undefined) return undefined;
    // Per-user namespace so a shared browser never shows the previous shopper's chat.
    return createLocalStoragePersistence({
      namespace: persistenceNamespace({ apiKey: resolvedApiKey, domain, userId }),
      storageArea: storageAreaFor(userId),
    });
  }, [persistenceEnabled, resolvedApiKey, domain, userId]);
  const persistenceScope = persistence && (userId === undefined ? 'guest' : 'user');

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
    ],
  );

  return (
    <AsaContext.Provider value={contextValue}>
      {typeof children === 'function' ? children(contextValue) : children}
    </AsaContext.Provider>
  );
}
