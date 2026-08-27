import React, { createRef } from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import Chat, { ChatHandle } from '../../../src/components/Chat/Chat';
import CioAsaProvider from '../../../src/components/CioAsaProvider/CioAsaProvider';
import { createMockCioClient, StreamEvent } from '../../local_examples/mockCioClient';

function renderChat(
  props: React.ComponentProps<typeof Chat> = {},
  events: StreamEvent[] = [{ type: 'message', data: { text: 'An answer' } }],
  ref?: React.Ref<ChatHandle>,
) {
  const { client } = createMockCioClient({ events });
  return render(
    <CioAsaProvider cioClient={client} staticRequestConfigs={{ domain: 'chatbot' }}>
      <Chat {...props} ref={ref} />
    </CioAsaProvider>,
  );
}

describe('Chat', () => {
  it('renders the welcome screen when there are no messages', () => {
    renderChat();
    expect(screen.getByRole('heading', { name: 'Shopping Assistant' })).toBeInTheDocument();
  });

  it('exposes a dialog role with an accessible name', () => {
    renderChat();
    expect(screen.getByRole('dialog', { name: 'Shopping Assistant' })).toBeInTheDocument();
  });

  it('declares the dialog modal to match its focus trap when it is dismissible', () => {
    renderChat({ onClose: jest.fn() });
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('omits aria-modal when embedded inline, so the host page stays readable', () => {
    renderChat();
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-modal');
  });

  it('keeps an accessible dialog name when the title is overridden', () => {
    renderChat({
      componentOverrides: {
        welcomeScreen: { title: { reactNode: () => <div>Custom title</div> } },
      },
    });

    expect(screen.getByRole('dialog', { name: 'Shopping Assistant' })).toBeInTheDocument();
  });

  it('announces the sent message, the typing state, and then the reply', async () => {
    renderChat();

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const statusTexts = screen.getAllByRole('status').map((el) => el.textContent);
    expect(statusTexts).toContain('You said: hello. Assistant is typing');

    await waitFor(() => expect(screen.getByText('An answer')).toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Assistant said: An answer');
  });

  it('switches to the chat view after sending a message', async () => {
    renderChat({}, [{ type: 'message', data: { text: 'An answer' } }]);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'hello{Enter}');

    expect(await screen.findByText('hello')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('An answer')).toBeInTheDocument());
  });

  it('renders suggestions on the welcome screen', () => {
    renderChat({ initialSuggestions: ['Suggestion 1'] });
    expect(screen.getByRole('button', { name: 'Suggestion 1' })).toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed (focus trap)', () => {
    const onClose = jest.fn();
    renderChat({ onClose });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clears history via the imperative ref handle', async () => {
    const ref = createRef<ChatHandle>();
    renderChat({}, [{ type: 'message', data: { text: 'An answer' } }], ref);

    await userEvent.type(screen.getByRole('textbox'), 'hello{Enter}');
    expect(await screen.findByText('hello')).toBeInTheDocument();

    act(() => ref.current!.clearHistory());

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Shopping Assistant' })).toBeInTheDocument(),
    );
  });

  it('has no accessibility violations on the welcome screen', async () => {
    const { container } = renderChat({ onClose: jest.fn(), initialSuggestions: ['A'] });
    expect(await axe(container)).toHaveNoViolations();
  });
});
