import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import Button from '../../../components/Button/Button';
import '../../../styles.css';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Floating action button that opens the AI Shopping Assistant chat.\n\n' +
          'Place it fixed in the corner of the viewport. Supports dark/light themes and two sizes.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Button text content.',
      table: { category: 'Appearance' },
    },
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
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Shopping assistant',
    theme: 'dark',
    size: 'sm',
  },
  tags: ['!autodocs'],
};

export const ThemeDark: Story = {
  args: {
    theme: 'dark',
  },
  name: 'theme - Dark',
  tags: ['!dev'],
};

export const ThemeLight: Story = {
  args: {
    theme: 'light',
  },
  name: 'theme - Light',
  tags: ['!dev'],
};

export const SizeSmall: Story = {
  args: {
    size: 'sm',
  },
  name: 'size - Small',
  tags: ['!dev'],
};

export const SizeLarge: Story = {
  args: {
    size: 'lg',
  },
  name: 'size - Large',
  tags: ['!dev'],
};

export const CustomLabel: Story = {
  args: {
    label: 'My custom button name',
  },
  name: 'label - Custom',
  tags: ['!dev'],
};

export const PlacementDesktop: Story = {
  name: 'Placement - Desktop',
  parameters: {
    docs: {
      description: {
        story: 'Button is placed in the bottom-right edge of the viewport. Recommended offset: 32px from both edges.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '700px', height: '450px', border: '1px solid #e0e0e0', borderRadius: '12px', background: '#fff' }}>
        <div style={{ position: 'absolute', bottom: '32px', right: '32px' }}>
          <Button />
        </div>
      </div>
    </div>
  ),
  tags: ['!dev'],
};

export const PlacementMobile: Story = {
  name: 'Placement - Mobile',
  parameters: {
    docs: {
      description: {
        story: 'On mobile, button is centered at the bottom of the viewport. Recommended offset: 24px from bottom. It displays initially with a slide-up animation.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: '375px', height: '600px', border: '1px solid #e0e0e0', borderRadius: '24px', background: '#fff' }}>
        <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)' }}>
          <Button />
        </div>
      </div>
    </div>
  ),
  tags: ['!dev'],
};
