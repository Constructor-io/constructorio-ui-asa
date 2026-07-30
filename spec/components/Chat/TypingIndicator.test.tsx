import React from 'react';
import { render, screen } from '@testing-library/react';
import TypingIndicator from '../../../src/components/Chat/TypingIndicator';

describe('TypingIndicator', () => {
  it('renders a status region with the default aria-label', () => {
    render(<TypingIndicator />);
    expect(screen.getByRole('status', { name: 'Assistant is typing' })).toBeInTheDocument();
  });

  it('applies a translation override for the aria-label', () => {
    render(
      <TypingIndicator translations={{ 'CioAsa.typingIndicator.ariaLabel': 'Loading reply' }} />,
    );
    expect(screen.getByRole('status', { name: 'Loading reply' })).toBeInTheDocument();
  });
});
