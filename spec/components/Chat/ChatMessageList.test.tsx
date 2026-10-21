import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatMessageList from '../../../src/components/Chat/ChatMessageList';
import { ChatMessage } from '../../../src/types';

function setScrollGeometry(
  el: HTMLElement,
  { scrollHeight, scrollTop, clientHeight }: Record<string, number>,
) {
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true });
  Object.defineProperty(el, 'scrollTop', { value: scrollTop, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true });
}

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
  it('keeps the log silent — announcements come from the Chat-level announcer', () => {
    render(<ChatMessageList messages={[]} />);
    const log = screen.getByRole('log', { name: 'Chat messages' });
    expect(log).toHaveAttribute('aria-live', 'off');
  });

  it('makes the scrollable message list reachable by keyboard', () => {
    render(<ChatMessageList messages={[]} />);
    expect(screen.getByRole('log')).toHaveAttribute('tabindex', '0');
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

  describe('follow-up refinements', () => {
    const refinement = { question: 'Who are you shopping for?', options: ['Women', 'Men'] };
    const aiWithRefinement: ChatMessage = { ...aiMsg, id: 'r1', refinement };

    it('renders the refinement below the results of its turn', () => {
      render(<ChatMessageList messages={[{ ...aiWithGroups, refinement }]} onSend={jest.fn()} />);
      const group = screen.getByRole('group', { name: 'Refine your results' });
      const results = document.querySelector('.cio-asa-results-block')!;
      expect(results.nextElementSibling).toBe(group);
    });

    it('sends the clicked option as a refinement follow-up', () => {
      const onSend = jest.fn();
      render(<ChatMessageList messages={[aiWithRefinement]} onSend={onSend} />);
      fireEvent.click(screen.getByRole('button', { name: 'Men' }));
      expect(onSend).toHaveBeenCalledWith('Men', 'refinement');
    });

    it('keeps only the latest refinement actionable', () => {
      const older: ChatMessage = { ...aiWithRefinement, id: 'r0' };
      const laterUser: ChatMessage = { ...userMsg, id: 'u2', text: 'Men' };
      render(
        <ChatMessageList messages={[older, laterUser, aiWithRefinement]} onSend={jest.fn()} />,
      );
      const [oldChip, newChip] = screen.getAllByRole('button', { name: 'Men' });
      expect(oldChip).toBeDisabled();
      expect(newChip).toBeEnabled();
    });

    it('disables the latest refinement while streaming', () => {
      render(<ChatMessageList messages={[aiWithRefinement]} onSend={jest.fn()} isStreaming />);
      expect(screen.getByRole('button', { name: 'Men' })).toBeDisabled();
    });

    it('hides refinements when no onSend handler is provided', () => {
      render(<ChatMessageList messages={[aiWithRefinement]} />);
      expect(screen.queryByRole('group', { name: 'Refine your results' })).not.toBeInTheDocument();
    });
  });

  describe('auto-scroll', () => {
    it('scrolls to the bottom when a new message arrives while near the bottom', () => {
      const { rerender } = render(<ChatMessageList messages={[userMsg]} />);
      const log = screen.getByRole('log', { name: 'Chat messages' });
      log.scrollTo = jest.fn();

      rerender(<ChatMessageList messages={[userMsg, aiMsg]} />);

      expect(log.scrollTo).toHaveBeenCalledWith({ top: log.scrollHeight, behavior: 'smooth' });
    });

    it('does not scroll on message updates once the user has scrolled up', () => {
      const { rerender } = render(<ChatMessageList messages={[userMsg]} />);
      const log = screen.getByRole('log', { name: 'Chat messages' });
      log.scrollTo = jest.fn();

      setScrollGeometry(log, { scrollHeight: 1000, scrollTop: 0, clientHeight: 300 });
      fireEvent.scroll(log);

      rerender(<ChatMessageList messages={[userMsg, aiMsg]} />);

      expect(log.scrollTo).not.toHaveBeenCalled();
    });

    it('resumes auto-scrolling once the user scrolls back near the bottom', () => {
      const { rerender } = render(<ChatMessageList messages={[userMsg]} />);
      const log = screen.getByRole('log', { name: 'Chat messages' });
      log.scrollTo = jest.fn();

      setScrollGeometry(log, { scrollHeight: 1000, scrollTop: 0, clientHeight: 300 });
      fireEvent.scroll(log);
      setScrollGeometry(log, { scrollHeight: 1000, scrollTop: 950, clientHeight: 300 });
      fireEvent.scroll(log);

      rerender(<ChatMessageList messages={[userMsg, aiMsg]} />);

      expect(log.scrollTo).toHaveBeenCalledWith({ top: log.scrollHeight, behavior: 'smooth' });
    });
  });
});
