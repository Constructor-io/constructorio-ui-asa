import React, { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Chat, { ChatHandle } from '../../../components/Chat/Chat';
import CioAsaProvider from '../../../components/CioAsaProvider/CioAsaProvider';
import type { ConstructorIOClient } from '../../../types';
import createMockAgentClient from './mockAgentClient';

const mockClient = createMockAgentClient() as unknown as ConstructorIOClient;
(mockClient as unknown as { options: { apiKey: string } }).options = { apiKey: 'story-key' };

function PersistenceDemo() {
  const [mountKey, setMountKey] = useState(0);
  const chatRef = useRef<ChatHandle>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type='button' onClick={() => setMountKey((k) => k + 1)}>
          Simulate page reload
        </button>
        <button type='button' onClick={() => chatRef.current?.clearHistory()}>
          Clear history
        </button>
      </div>
      <CioAsaProvider
        key={mountKey}
        cioClient={mockClient}
        staticRequestConfigs={{ domain: 'chatbot' }}
        persistence>
        <div style={{ width: '504px', height: '800px', borderRadius: '12px', overflow: 'hidden' }}>
          <Chat
            ref={chatRef}
            initialSuggestions={['running shoes', 'a jacket for autumn']}
            aspectRatio='3:4'
            currency='$'
          />
        </div>
      </CioAsaProvider>
    </div>
  );
}

const meta = {
  title: 'Components/Chat/Persistent Chat',
  component: Chat,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Enable `persistence` on `CioAsaProvider` and the conversation survives page ' +
          'loads. Send a message, then press **Simulate page reload**: the transcript and thread id are ' +
          'restored from `localStorage`. **Clear history** calls `clearHistory()` on the chat ref and ' +
          'deletes the stored thread.',
      },
    },
  },
  render: () => <PersistenceDemo />,
} satisfies Meta<typeof Chat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LocalStorage: Story = {};
