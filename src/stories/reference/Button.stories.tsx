import type { Meta, StoryObj } from '@storybook/react';
import Button from '../../components/Button/Button';
import '../../styles.css';

const meta = {
  title: 'Components & Utilities/Button',
  component: Button,
  parameters: {
    a11y: { test: 'error' },
    layout: 'centered',
    docs: {
      description: {
        component:
          'Floating action button that opens the AI Shopping Assistant chat.\n\n' +
          'Place it fixed in a corner of the viewport: bottom-right, 32px from both edges, on desktop; ' +
          'centered at the bottom, 24px up, on mobile. Supports dark/light themes and two sizes. ' +
          'Clicks are tracked; see [Callbacks & Tracking](./?path=/docs/guides-callbacks-tracking--variants#launcher-clicks).',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    theme: {
      control: 'radio',
      options: ['dark', 'light'],
      description: 'Color scheme: `dark` for light backgrounds, `light` for dark backgrounds.',
      table: { category: 'Appearance' },
    },
    size: {
      control: 'radio',
      options: ['sm', 'lg'],
      description: 'Button size: `sm` (small) or `lg` (large).',
      table: { category: 'Appearance' },
    },
    onClick: {
      description: 'Click handler. Use this to open the chat window.',
      table: { category: 'Callbacks' },
    },
    label: {
      control: 'text',
      description: 'Button label text.',
      table: { category: 'Appearance' },
    },
    positionOnPage: {
      control: 'text',
      description:
        'Stable label for where the CTA sits (e.g. `header`, `search_bar`). Sent with the `ai_agent_button_click` event.',
      table: { category: 'Tracking' },
    },
    pageType: {
      control: 'select',
      options: ['home', 'plp', 'pdp', 'search', 'collection', 'email_campaign', 'cart'],
      description:
        'Page surface the CTA is rendered on. Sent with the `ai_agent_button_click` event.',
      table: { category: 'Tracking' },
    },
    instanceId: {
      control: 'number',
      description: '1-based index when several CTAs share the same position on one page.',
      table: { category: 'Tracking' },
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    theme: 'dark',
    size: 'sm',
  },
};
