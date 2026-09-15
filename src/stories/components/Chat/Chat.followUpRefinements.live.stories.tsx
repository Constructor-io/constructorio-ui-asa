import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Chat from '../../../components/Chat/Chat';
import CioAsaProvider from '../../../components/CioAsaProvider/CioAsaProvider';

// TEMP: local-only story against a real index to test follow_up_refinement events
// cspell:disable-next-line
const TEST_API_KEY = 'key_xT77K5VmpiVduqnj';

const meta = {
  title: 'Components/Chat/Follow-up Refinements (Live, temp)',
  component: Chat,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <CioAsaProvider
        apiKey={TEST_API_KEY}
        staticRequestConfigs={{ domain: 'assistant_conversational' }}>
        <div style={{ width: '504px', height: '800px', borderRadius: '12px', overflow: 'hidden' }}>
          <Story />
        </div>
      </CioAsaProvider>
    ),
  ],
} satisfies Meta<typeof Chat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Live: Story = {
  args: {
    onClose: () => alert('Close'),
    aspectRatio: '3:4',
    currency: '$',
    initialSuggestions: ['running shoes', 'a jacket for autumn', 'gift under $50'],
  },
};
