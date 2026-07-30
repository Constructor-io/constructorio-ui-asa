import React from 'react';
import { renderServerSide } from '../../test-utils.server';
import TypingIndicator from '../../../src/components/Chat/TypingIndicator';

describe('TypingIndicator (SSR)', () => {
  it('renders a status region announcing the assistant is typing', () => {
    const html = renderServerSide(<TypingIndicator />);

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Assistant is typing"');
  });

  it('uses the translation override for the aria label', () => {
    const html = renderServerSide(
      <TypingIndicator translations={{ 'CioAsa.typingIndicator.ariaLabel': 'Asystent pisze' }} />,
    );

    expect(html).toContain('aria-label="Asystent pisze"');
    expect(html).not.toContain('Assistant is typing');
  });
});
