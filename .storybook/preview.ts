import type { Preview } from "@storybook/react";
import StorybookAutodocs from './StorybookAutodocs';
import './storybook-styles.css';

const preview: Preview = {
  parameters: {
    a11y: {
      // Report-only by default; stories opt into blocking with `test: 'error'`.
      test: 'todo',
      options: {
        runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
        rules: {
          // Colors come from the design system.
          'color-contrast': { enabled: false },
          'target-size': { enabled: true },
          'aria-dialog-name': { enabled: true },
          'aria-allowed-role': { enabled: true },
          'presentation-role-conflict': { enabled: true },
          'focus-order-semantics': { enabled: true },
          tabindex: { enabled: true },
        },
      },
    },
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    docs: {
      page: StorybookAutodocs,
    },
    options: {
      storySort: {
        order: ['General', ['Introduction'], 'Components', 'Hooks'],
      },
    },
  },
};

export default preview;
