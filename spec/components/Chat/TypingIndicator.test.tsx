import React from 'react';
import { render, screen } from '@testing-library/react';
import TypingIndicator from '../../../src/components/Chat/TypingIndicator';

describe('TypingIndicator', () => {
  it('announces the typing state as text inside the status region', () => {
    render(<TypingIndicator />);
    expect(screen.getByRole('status')).toHaveTextContent('Assistant is typing');
  });

  it('does not mark the status region busy, which would suppress the announcement', () => {
    render(<TypingIndicator />);
    expect(screen.getByRole('status')).not.toHaveAttribute('aria-busy');
  });

  it('hides the decorative dots from assistive technology', () => {
    render(<TypingIndicator />);
    const dots = screen.getByRole('status').querySelector('.cio-asa-typing-indicator__dots');
    expect(dots).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies a translation override for the announcement', () => {
    render(
      <TypingIndicator translations={{ 'CioAsa.typingIndicator.ariaLabel': 'Loading reply' }} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading reply');
  });
});
