import React from 'react';
import CioAsaProvider from '../CioAsaProvider/CioAsaProvider';
import Chat, { ChatHandle, ChatProps } from '../Chat/Chat';
import { CioAsaProviderProps } from '../../types';

export type CioAsaProps = CioAsaProviderProps & ChatProps;

/**
 * The whole agent in one component: the provider and the chat UI composed together.
 *
 * Consumers that need to place `Chat` inside their own tree, or render several
 * components against one client, should compose `CioAsaProvider` and `Chat`
 * directly. This is the single-entry-point convenience wrapper, and it is what the
 * standalone browser bundle (`src/bundled.jsx`) mounts.
 */
const CioAsa = React.forwardRef<ChatHandle, CioAsaProps>((props, ref) => {
  const {
    // Provider configuration — everything else belongs to Chat.
    apiKey,
    cioClient,
    testCells,
    staticRequestConfigs,
    formatters,
    urlHelpers,
    callbacks,
    section,
    persistConversation,
    userId,
    ...chatProps
  } = props;

  return (
    <CioAsaProvider
      apiKey={apiKey}
      cioClient={cioClient}
      testCells={testCells}
      staticRequestConfigs={staticRequestConfigs}
      formatters={formatters}
      urlHelpers={urlHelpers}
      callbacks={callbacks}
      section={section}
      persistConversation={persistConversation}
      userId={userId}>
      <Chat {...chatProps} ref={ref} />
    </CioAsaProvider>
  );
});

CioAsa.displayName = 'CioAsa';

export default CioAsa;
