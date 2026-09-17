# spec

All tests live here, mirroring the `src/` tree. Nothing under `src/` is a test file, so
the published package source stays clean.

```
src/components/Chat/ChatInput.tsx
spec/components/Chat/ChatInput.test.tsx         # client (jsdom)
spec/components/Chat/ChatInput.server.test.jsx  # server (node / SSR)
```

## The two Jest projects

`jest.config.js` defines two projects, distinguished purely by filename:

| Project  | Files                  | Environment | Setup                    |
| -------- | ---------------------- | ----------- | ------------------------ |
| `client` | `*.test.{ts,tsx,js,jsx}` | `jsdom`   | `spec/setupTests.ts`        |
| `server` | `*.server.test.{ts,tsx,js,jsx}` | `node` | `spec/setupTests.server.ts` |

Run one at a time with `npx jest --selectProjects client` / `--selectProjects server`.

Server tests are written as `.jsx` (not `.tsx`) so they can import the JSX helpers in
`test-utils.server.jsx` without type-declaration friction.

## What we test

Follow the [React Testing Library guiding principles][rtl]: assert on what a user can
see and do, not on implementation details.

- **Components** — rendering, user-visible state, and interaction outcomes. Prefer
  `toBeInTheDocument()`, `toHaveAttribute()`, `toHaveTextContent()`, `toBeVisible()`
  over reaching into state or props.
- **Hooks** — tested separately from the components that consume them, via
  `renderHook`. Assert on the values and methods a consumer receives.
- **Unit tests are the main coverage layer.** Integration tests stay to a simple happy
  path proving the whole chain works.

[rtl]: https://testing-library.com/docs/guiding-principles

## Server (SSR) tests

Every component and function also has a `.server.test.jsx` covering server-side
rendering — the library ships to Next.js/Remix consumers, so a stray `window` or
`document` reference at render time is a real bug.

There is no DOM in the `server` project, so these assert on the HTML string returned by
`ReactDOMServer.renderToString`. Helpers live in `test-utils.server.jsx`:

- `renderServerSide(element)` — render an element, return its HTML.
- `renderServerSideWithCioAsa(element, providerProps)` — same, wrapped in `CioAsaProvider`.
- `renderHookServerSide(cb)` / `renderHookServerSideWithCioAsa(cb, providerProps)` —
  render a hook, return `{ html, result }`.
- `textOf(html)` — reduce markup to user-visible text. Use it when adjacent JSX
  expressions would otherwise be split by React's `<!-- -->` separator comments.

## Mocking

Mock only external boundaries:

- API responses and Constructor client JS methods (see `local_examples/mockCioClient.ts`)
- third-party libraries
- browser globals such as `window.location`
- network side effects

Never make real network requests — mock the API response instead. Only mock a hook when
testing a component that consumes it.

Mocks are cleared and restored automatically between tests (`clearMocks` / `restoreMocks`
in `jest.config.js`). Anything else you set up needs its own `beforeEach` / `afterEach`.
