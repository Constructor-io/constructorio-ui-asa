import ReactDOMServer from 'react-dom/server';
import React from 'react';
import CioAsaProvider from '../src/components/CioAsaProvider/CioAsaProvider';

/**
 * Renders an element the way a server framework (Next.js, Remix, …) would and
 * returns the HTML string. SSR tests assert against this markup because there
 * is no DOM to query in the `server` Jest project.
 */
export function renderServerSide(element) {
  return ReactDOMServer.renderToString(element);
}

/** Same as renderServerSide, but wrapped in the provider that supplies context. */
export function renderServerSideWithCioAsa(element, cioAsaProps) {
  return ReactDOMServer.renderToString(<CioAsaProvider {...cioAsaProps}>{element}</CioAsaProvider>);
}

/**
 * Reduces server-rendered markup to the text a user would actually see:
 * strips tags, React's `<!-- -->` text separators, and HTML entities.
 * Use this instead of raw `toContain` when adjacent JSX expressions would
 * otherwise be split by a separator comment.
 */
export function textOf(html) {
  return html
    .replace(/<!--.*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function RenderHookServerSideWrapper({
  renderCallback,
  renderCallbackProps = {},
  onRenderHookValue,
}) {
  const hookValue = renderCallback(renderCallbackProps.initialProps);
  // expose the hook value to the test by testing what is passed to onRenderHookValue
  onRenderHookValue(hookValue);
  return null;
}

export function renderHookServerSide(
  renderCallback,
  renderCallbackProps,
  onRenderHookValue = jest.fn(),
) {
  return {
    html: ReactDOMServer.renderToString(
      <RenderHookServerSideWrapper
        renderCallback={renderCallback}
        renderCallbackProps={renderCallbackProps}
        onRenderHookValue={onRenderHookValue}
      />,
    ),
    onRenderHookValue,
    result: onRenderHookValue.mock.calls[0][0],
  };
}

export function renderHookServerSideWithCioAsa(
  renderCallback,
  cioAsaProps,
  renderCallbackProps,
  onRenderHookValue = jest.fn(),
) {
  return {
    html: ReactDOMServer.renderToString(
      <CioAsaProvider {...cioAsaProps}>
        <RenderHookServerSideWrapper
          renderCallback={renderCallback}
          renderCallbackProps={renderCallbackProps}
          onRenderHookValue={onRenderHookValue}
        />
      </CioAsaProvider>,
    ),
    onRenderHookValue,
    result: onRenderHookValue.mock.calls[0][0],
  };
}
