import type { Preview } from "@storybook/react";
import StorybookAutodocs from './StorybookAutodocs';
import './storybook-styles.css';

const preview: Preview = {
  parameters: {
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
