# Constructor.io AI Shopping Agent (ASA) UI Library

[![npm](https://img.shields.io/npm/v/@constructor-io/constructorio-ui-asa)](https://www.npmjs.com/package/@constructor-io/constructorio-ui-asa)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Constructor-io/constructorio-ui-asa/blob/main/LICENSE)

React components for [Constructor.io's AI Shopping Agent](https://constructor.com/solutions/ai-shopping-agent/): a conversational shopping assistant.

**[Documentation →](https://constructor-io.github.io/constructorio-ui-asa/)**

## Install

```bash
npm i @constructor-io/constructorio-ui-asa
```

## Usage

```jsx
import { CioAsaProvider, Chat } from '@constructor-io/constructorio-ui-asa';
import '@constructor-io/constructorio-ui-asa/styles.css';

<CioAsaProvider apiKey='YOUR_API_KEY'>
  <Chat onClose={() => setIsOpen(false)} />
</CioAsaProvider>;
```

Peer dependencies, layout, product results, tracking, customization and every prop are in the [docs](https://constructor-io.github.io/constructorio-ui-asa/).

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

## Related Libraries

- [@constructor-io/constructorio-client-javascript](https://github.com/Constructor-io/constructorio-client-javascript) - JavaScript client for Constructor.io API
- [@constructor-io/constructorio-ui-autocomplete](https://github.com/Constructor-io/constructorio-ui-autocomplete) - Autocomplete UI library
- [@constructor-io/constructorio-ui-plp](https://github.com/Constructor-io/constructorio-ui-plp) - Product Listing Page UI library
- [@constructor-io/constructorio-ui-quizzes](https://github.com/Constructor-io/constructorio-ui-quizzes) - Quizzes UI library

## Contributing

1. Fork the repo and create a new branch.
2. Run `npm ci` to install dependencies.
3. Make your changes.
4. Run `npm run lint` and `npm run test` to verify. For docs changes, follow [`.claude/docs.md`](.claude/docs.md).
5. Submit a PR for review.

## License

MIT &copy; [Constructor.io Corporation](https://constructor.io/)
