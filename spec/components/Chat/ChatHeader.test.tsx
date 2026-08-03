import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatHeader from '../../../src/components/Chat/ChatHeader';

describe('ChatHeader', () => {
  it('renders the default title', () => {
    render(<ChatHeader />);
    expect(screen.getByText('Shopping Assistant')).toBeInTheDocument();
  });

  it('renders a close button only when onClose is provided and calls it', async () => {
    const { rerender } = render(<ChatHeader />);
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();

    const onClose = jest.fn();
    rerender(<ChatHeader onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('applies translation overrides', () => {
    render(<ChatHeader translations={{ 'CioAsa.header.title': 'Custom Assistant' }} />);
    expect(screen.getByText('Custom Assistant')).toBeInTheDocument();
  });

  it('renders a custom override node', () => {
    render(
      <ChatHeader componentOverrides={{ reactNode: ({ title }) => <div>{`H: ${title}`}</div> }} />,
    );
    expect(screen.getByText('H: Shopping Assistant')).toBeInTheDocument();
  });
});
