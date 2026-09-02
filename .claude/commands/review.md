# Code review

Perform a review of the changes in this branch (or the specified PR).

The general review guidelines come from the shared Claude review workflow
(`Constructor-io/shared-claude-code-resources-public`). This file adds the
repository-specific rules on top of them.

## Repository context

This is a published React component library. Two things follow from that:

- **The public surface is a contract.** Renamed or removed props, changed default
  prop values, changed CSS class names and changed translation keys are breaking
  changes for consumers even when nothing in this repo fails. Call them out.
- **Every user-facing string goes through `translate()`** with the key added to
  `defaultTranslations` (`src/utils/translate.ts`) and to the `Translations` type
  (`src/types.ts`). A hardcoded English string is a bug, not a nit.

## Accessibility

If the diff touches JSX/TSX, HTML, or CSS, read `.claude/a11y.md` and apply its rules.

Report accessibility findings as **Important Issue** or **Suggestion** — never
**Critical Issue**. The merge gate for accessibility is `npm run lint` (jsx-a11y)
plus `npm run test-storybook:ci` (axe-core in a real browser); this review layer is
advisory and covers the semantic judgement those tools cannot make.
