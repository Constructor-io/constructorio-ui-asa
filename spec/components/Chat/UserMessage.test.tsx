import React from 'react';
import { render, screen } from '@testing-library/react';
import UserMessage from '../../../src/components/Chat/UserMessage';

describe('UserMessage', () => {
  it('renders the message text with a group role', () => {
    render(<UserMessage text='Hello world' />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'You said' })).toBeInTheDocument();
  });

  it('renders a custom override node', () => {
    render(
      <UserMessage
        text='Hi'
        componentOverrides={{ reactNode: ({ text }) => <div>{`U: ${text}`}</div> }}
      />,
    );
    expect(screen.getByText('U: Hi')).toBeInTheDocument();
  });
});
