import React from 'react';
import { renderServerSide } from '../../test-utils.server';
import UserMessage from '../../../src/components/Chat/UserMessage';

describe('UserMessage (SSR)', () => {
  it('renders the message text into the server markup', () => {
    const html = renderServerSide(<UserMessage text='Show me running shoes' />);

    expect(html).toContain('Show me running shoes');
    expect(html).toContain('aria-label="You said"');
  });

  it('escapes user-supplied text so it cannot inject markup', () => {
    const html = renderServerSide(<UserMessage text='<img src=x onerror="alert(1)">' />);

    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });

  it('uses a component override in place of the default bubble', () => {
    const html = renderServerSide(
      <UserMessage
        text='Hello'
        componentOverrides={{ reactNode: ({ text }) => <p data-custom='yes'>{text}</p> }}
      />,
    );

    expect(html).toContain('data-custom="yes"');
    expect(html).toContain('Hello');
    expect(html).not.toContain('cio-asa-user-message__bubble');
  });
});
