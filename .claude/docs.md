# Documentation rules

Storybook is the product documentation. The published site is built with
`storybook build --docs`, so only docs pages ship: MDX files and auto-generated
(`autodocs`) pages. Stories never appear on their own.

## One home per fact

| Content | Lives in |
|---|---|
| How to do something | a guide: `src/stories/guides/*.mdx`, title `Guides/<Name>` |
| What a prop or export is | `Components & Utilities`: `argTypes` / JSDoc on `reference/<Component>.stories.tsx`, or a `reference/*.mdx` page for exports with nothing to render (provider, hooks, utilities) |
| Install, one snippet, contributing, publishing | `README.md` |

Never restate a fact in a second place: link to its home. The README never
documents props or features.

## Public API only

Customers can import only what `src/index.ts` exports. Docs, snippets and
"Show code" (`parameters.docs.source.code`) use those exports, never internal
components such as the `Dialogue` pieces.

## Writing

- Brief. Lead with the snippet; one sentence per idea; no "This page covers…".
- Name the prop path exactly (`componentOverrides.aiMessage.followUpRefinement`).
- Every snippet must work if copied.
- A new translation key goes in the table in the Customization guide.

## Stories

- A `reference/<Component>.stories.tsx` has `tags: ['autodocs']` and one story,
  `Default`, which drives the reference page's preview and props table.
- Feature demos go in `src/stories/examples/`; accessibility test cases for
  non-exported components go in `src/stories/internal/`.
- Both are tagged `tags: ['!dev']`: hidden from the sidebar, still embeddable
  with `<Canvas of={…} />`, still run by the axe test-runner. Never give them
  `autodocs`, which would publish them.
- Embed a story only when its effect is visible on screen. Callbacks, network
  requests and tracking get a code snippet instead.
- Shared story code lives in `src/stories/fixtures.tsx`: mock data, the Chat
  decorator, and `functionArgTypes`, which metas whose component takes function
  props set as `argTypes` so those props don't show as `{}` in Controls. Don't
  export non-story values from a stories file.

## Adding a guide

1. `src/stories/guides/<Name>.mdx` with `<Meta title='Guides/<Name>' />`.
2. Add it to `storySort` in `.storybook/preview.ts`.
3. If it is part of a first integration, add a step to the Integration Guide
   that links to it.

## Links

Link with `?path=/docs/<id>`. The id is the title lowercased with
non-alphanumerics turned into `-`, plus `--variants` (this repo's docs page
name): `Guides/Callbacks & Tracking` → `guides-callbacks-tracking--variants`.
Renaming a title breaks every link to it.

## Before merging

- `npm run lint`
- `storybook build --docs`, then check the sidebar shows only Introduction,
  Guides and Components & Utilities, and that every `?path=` link in
  `src/stories` exists in the build's `index.json`
- `npm run test-storybook:ci`
