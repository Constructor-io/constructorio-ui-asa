import React from 'react';
import { render, screen } from '@testing-library/react';
import AiMessage from '../../../src/components/Chat/AiMessage';
import { ChatMessage } from '../../../src/types';

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return { id: 'm1', role: 'assistant', text: '', status: 'loading', ...overrides };
}

describe('AiMessage', () => {
  it('shows the typing indicator while loading with no content', () => {
    render(<AiMessage message={makeMessage({ status: 'loading', text: '' })} />);
    expect(screen.getByRole('status', { name: 'Assistant is typing' })).toBeInTheDocument();
  });

  it('renders the text bubble once text arrives', () => {
    render(<AiMessage message={makeMessage({ status: 'streaming', text: 'Answer' })} />);
    expect(screen.getByText('Answer')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('does not show the loader when groups exist even without text', () => {
    render(
      <AiMessage
        message={makeMessage({
          status: 'loading',
          text: '',
          groups: [{ group: { display_name: 'g' }, searchResults: [] }],
        })}
      />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('falls back to the default error message when an error has no partial text', () => {
    render(<AiMessage message={makeMessage({ status: 'error', text: '' })} />);
    expect(screen.getByText("I can't assist you with that request.")).toBeInTheDocument();
  });

  it('announces errors through a live region instead of color alone', () => {
    render(<AiMessage message={makeMessage({ status: 'error', text: '' })} />);
    expect(screen.getByRole('alert')).toHaveTextContent("I can't assist you with that request.");
  });

  it('does not mark regular replies as alerts', () => {
    render(<AiMessage message={makeMessage({ status: 'done', text: 'Answer' })} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the partial text on error instead of the fallback message', () => {
    render(<AiMessage message={makeMessage({ status: 'error', text: 'partial answer' })} />);
    expect(screen.getByText('partial answer')).toBeInTheDocument();
  });

  it('uses a translated error message override when provided', () => {
    render(
      <AiMessage
        message={makeMessage({ status: 'error', text: '' })}
        translations={{ 'CioAsa.error.message': 'Custom error text' }}
      />,
    );
    expect(screen.getByText('Custom error text')).toBeInTheDocument();
  });

  it('renders a text override node', () => {
    render(
      <AiMessage
        message={makeMessage({ status: 'done', text: 'Hi' })}
        componentOverrides={{ text: { reactNode: ({ text }) => <p>{`AI: ${text}`}</p> } }}
      />,
    );
    expect(screen.getByText('AI: Hi')).toBeInTheDocument();
  });
});
