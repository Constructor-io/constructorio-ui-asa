# Constructor.io AI Shopping Agent (ASA) UI Library

[![npm](https://img.shields.io/npm/v/@constructor-io/constructorio-ui-asa)](https://www.npmjs.com/package/@constructor-io/constructorio-ui-asa)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Constructor-io/constructorio-ui-asa/blob/main/LICENSE)

A UI library that provides React components to manage the fetching and rendering logic for [Constructor.io's AI Shopping Agent](https://constructor.com/solutions/ai-shopping-agent/). TypeScript support is available.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Usage](#usage)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)
- [Local Development](#local-development)
- [Publishing New Versions](#publishing-new-versions)
- [Supporting Docs](#supporting-docs)
- [Related Libraries](#related-libraries)
- [License](#license)

## Overview

[Constructor.io's AI Shopping Agent](https://constructor.com/solutions/ai-shopping-agent/) is a conversational shopping experience that helps shoppers discover products through natural-language chat. This UI library simplifies the integration process by providing React components that handle the fetching and rendering logic for the AI Shopping Agent.

[Our Storybook Docs](https://constructor-io.github.io/constructorio-ui-asa/?path=/docs/general-introduction--variants) are the best place to explore the behavior and the available configuration options for this UI library.

## Installation

```bash
npm i @constructor-io/constructorio-ui-asa
```

### Prerequisites

This library declares the following as peer dependencies, so they must be present in your project:

| Package | Version |
|---------|---------|
| `@constructor-io/constructorio-client-javascript` | `^2.88.0` |
| `@constructor-io/constructorio-ui-components` | `^1.6.0` |
| `react` | `>=16.12.0` |
| `react-dom` | `>=16.12.0` |
| `tslib` | `^2.4.0` |

On npm 7+ these are installed automatically. If your package manager doesn't install peer dependencies automatically (yarn, pnpm, npm 6 and below), install any that are missing:

```bash
npm install \
  @constructor-io/constructorio-client-javascript \
  @constructor-io/constructorio-ui-components \
  react react-dom tslib
```

## Usage

### Using the React Components

Wrap your application (or the relevant subtree) with `CioAsaProvider` to supply the Constructor client and configuration, then render the `Chat` component for a full conversational UI.

```jsx
import { CioAsaProvider, Chat } from '@constructor-io/constructorio-ui-asa';
import '@constructor-io/constructorio-ui-asa/styles.css';

function ShoppingAgent() {
  return (
    <CioAsaProvider apiKey='YOUR_API_KEY'>
      <Chat
        onClose={() => {}}
        onProductClick={(product) => (window.location.href = product.url)}
        currency='$'
        initialSuggestions={['Show me summer dresses', 'Best running shoes under $100']}
      />
    </CioAsaProvider>
  );
}
```

`CioAsaProvider` accepts:

| Prop | Type | Description |
|------|------|-------------|
| `apiKey` | `string` | Your Constructor index key. Required unless you pass your own `cioClient`. |
| `cioClient` | `ConstructorIOClient` | A pre-configured Constructor client. Provide this instead of `apiKey` when you need to customize client options (e.g. `serviceUrl`, `segments`, `userId`). |
| `staticRequestConfigs` | `RequestConfigs` | Request-level config passed to the ASA agent. Defaults to `{ domain: 'chatbot' }`. |
| `formatters` | `Formatters` | Override built-in formatters (e.g. `formatPrice`). Merged over the defaults. |
| `urlHelpers` | `UrlHelpers` | Override built-in URL read/write helpers. Merged over the defaults. |

> **Where do I get `apiKey`?** This is your Constructor index key (the same key used by other Constructor client integrations), available in your Constructor dashboard. The AI Shopping Agent must be enabled for your account — contact your Constructor representative if agent requests return errors.

> **Server-side rendering.** The Constructor client is only instantiated in the browser, so `Chat` and `useAsaResults` must run client-side only. In Next.js App Router, add `'use client'` and defer rendering until mounted (or load with `next/dynamic` and `{ ssr: false }`). See the [Integration Guide](https://constructor-io.github.io/constructorio-ui-asa/?path=/docs/general-integration-guide--variants) for a full example.

### Using the Hook Directly

For custom UI implementations, use the `useAsaResults` hook. It takes no arguments — all configuration comes from the surrounding `CioAsaProvider`.

```jsx
import { useAsaResults } from '@constructor-io/constructorio-ui-asa';

function CustomChat() {
  const { messages, sendMessage, isStreaming, clearHistory } = useAsaResults();

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>
          <strong>{msg.role}:</strong> {msg.text}
        </div>
      ))}
      <button onClick={() => sendMessage('Show me running shoes')} disabled={isStreaming}>
        Send
      </button>
      <button onClick={clearHistory}>Reset</button>
    </div>
  );
}
```

The hook returns `messages` (the full conversation), `sendMessage(text)`, `isStreaming`, and `clearHistory()`. Product results arrive on assistant messages in `msg.groups` and can be rendered with the exported `ResultsBlock` component.

## Customization

### Styling

By default, importing React components from this library does not pull any CSS into your project.

If you wish to use the starter styles from this library, add an import statement similar to the example below:

```js
import '@constructor-io/constructorio-ui-asa/styles.css';
```

- These starter styles can be used as a foundation to build on top of, or just as a reference for you to replace completely.
- To opt out of all default styling, do not import the `styles.css` stylesheet.
- All components use BEM-style class names prefixed with `cio-asa-` for easy style overrides.

### Translations

All user-facing text can be customized via the `translations` prop for internationalization. Pass only the keys you want to override — all others fall back to English defaults.

```jsx
<Chat
  translations={{
    'CioAsa.welcome.title': 'Style Advisor',
    'CioAsa.welcome.placeholder': 'What are you looking for?',
    'CioAsa.results.addToCart': 'Add to bag',
  }}
/>
```

### Component Overrides

You can override individual sub-components using the `componentOverrides` prop with render props. See our [Storybook Docs](https://constructor-io.github.io/constructorio-ui-asa/?path=/docs/general-introduction--variants) for available override slots.

```jsx
<Chat
  componentOverrides={{
    header: {
      reactNode: ({ title, onClose }) => (
        <div className='my-header'>
          <h1>{title}</h1>
          <button onClick={onClose}>Close</button>
        </div>
      ),
    },
  }}
/>
```

## Troubleshooting

### Known Issues

**Older JavaScript environments**

The library provides two builds: CommonJS (cjs) and ECMAScript Modules (mjs).

The ECMAScript Modules (mjs) build targets ESNext, which might not be supported by your environment. If your environment uses an older JavaScript version like ES6 (ES2015), you may get an error such as:

`Module parse failed: Unexpected token`

To solve this you can import the CommonJS (cjs) build, which supports ES6 (ES2015) syntax:

`import { Chat } from '@constructor-io/constructorio-ui-asa/cjs'`

**ESLint**

There is a known issue with ESLint where it fails to resolve the paths exposed in the `exports` statement of NPM packages. If you receive an error like the one below, you can safely disable ESLint using `// eslint-disable-line` for that line.

`Unable to resolve path to module '@constructor-io/constructorio-ui-asa/styles.css'`

Relevant open issues: [Issue 1868](https://github.com/import-js/eslint-plugin-import/issues/1868), [Issue 1810](https://github.com/import-js/eslint-plugin-import/issues/1810)

## Local Development

### Development Scripts

```bash
npm ci                  # Install dependencies for local dev
npm run dev             # Start a local dev server for Storybook
npm run lint            # Run lint
npm run test            # Run tests
npm run check-types     # Run TypeScript type checking
```

### Library Maintenance

```bash
npm run compile           # Generate lib folder for publishing to npm
npm run build-storybook   # Generate Storybook static bundle for deploy with GitHub Pages
```

## Publishing New Versions

Dispatch the [Publish](https://github.com/Constructor-io/constructorio-ui-asa/actions/workflows/publish.yml) workflow in GitHub Actions. You're required to provide two arguments:

- **Version Strategy**: `major`, `minor`, or `patch`.
- **Title**: A title for the release.

This workflow will automatically:

1. Bump the library version using the provided strategy.
2. Create a new git tag.
3. Create a new GitHub release.
4. Compile the library.
5. Publish the new version to NPM.
6. Publish the bundled version to the CDN.
7. Deploy the Storybook docs to GitHub Pages.

#### Note: Please don't manually increase the package.json version or create new git tags.

## Supporting Docs

- [Storybook Docs](https://constructor-io.github.io/constructorio-ui-asa/?path=/docs/general-introduction--variants)
- [Constructor.io API Documentation](https://docs.constructor.io/)

## Related Libraries

- [@constructor-io/constructorio-client-javascript](https://github.com/Constructor-io/constructorio-client-javascript) - JavaScript client for Constructor.io API
- [@constructor-io/constructorio-ui-autocomplete](https://github.com/Constructor-io/constructorio-ui-autocomplete) - Autocomplete UI library
- [@constructor-io/constructorio-ui-plp](https://github.com/Constructor-io/constructorio-ui-plp) - Product Listing Page UI library
- [@constructor-io/constructorio-ui-quizzes](https://github.com/Constructor-io/constructorio-ui-quizzes) - Quizzes UI library

## Contributing

1. Fork the repo and create a new branch.
2. Run `npm ci` to install dependencies.
3. Make your changes.
4. Run `npm run lint` and `npm run test` to verify.
5. Submit a PR for review.

## License

MIT &copy; [Constructor.io Corporation](https://constructor.io/)
