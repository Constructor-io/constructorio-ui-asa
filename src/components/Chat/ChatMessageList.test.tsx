import React from 'react';
import { render, screen } from '@testing-library/react';
import ChatMessageList from './ChatMessageList';
import { ChatMessage } from '../../types';

const userMsg: ChatMessage = { id: 'u1', role: 'user', text: 'question?', status: 'done' };
const aiMsg: ChatMessage = { id: 'a1', role: 'assistant', text: 'answer.', status: 'done' };
const aiWithGroups: ChatMessage = {
  id: 'a2',
  role: 'assistant',
  text: 'here you go',
  status: 'done',
  groups: [
    {
      group: { display_name: 'Shoes', value: 'shoes' },
      searchResults: [{ value: 'Sneaker', data: { id: '1' } }],
    },
  ],
};

describe('ChatMessageList', () => {
  it('is a polite live log region', () => {
    render(<ChatMessageList messages={[]} />);
    const log = screen.getByRole('log', { name: 'Chat messages' });
    expect(log).toHaveAttribute('aria-live', 'polite');
  });

  it('renders user and assistant messages', () => {
    render(<ChatMessageList messages={[userMsg, aiMsg]} />);
    expect(screen.getByText('question?')).toBeInTheDocument();
    expect(screen.getByText('answer.')).toBeInTheDocument();
  });

  it('renders a ResultsBlock only when the assistant message has groups', () => {
    const { rerender } = render(<ChatMessageList messages={[aiMsg]} />);
    expect(document.querySelector('.cio-asa-results-block')).not.toBeInTheDocument();

    rerender(<ChatMessageList messages={[aiWithGroups]} />);
    expect(document.querySelector('.cio-asa-results-block')).toBeInTheDocument();
    expect(screen.getByText('Shoes')).toBeInTheDocument();
  });
});
