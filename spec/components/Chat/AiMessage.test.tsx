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
    expect(screen.getByRole('status')).toHaveTextContent('Assistant is typing');
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

  it('remounts the bubble when a streamed reply turns into an error', () => {
    // A role added to a node already on screen is not announced; the alert has to be a
    // newly inserted node for assistive tech to pick it up.
    const { rerender } = render(
      <AiMessage message={makeMessage({ status: 'streaming', text: 'partial answer' })} />,
    );
    const streamingBubble = screen.getByText('partial answer').parentElement;

    rerender(<AiMessage message={makeMessage({ status: 'error', text: 'partial answer' })} />);
    const alert = screen.getByRole('alert');

    expect(alert).toHaveTextContent('partial answer');
    expect(alert).not.toBe(streamingBubble);
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
