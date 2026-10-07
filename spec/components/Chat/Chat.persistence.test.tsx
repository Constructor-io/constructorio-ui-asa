import React, { createRef } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chat, { ChatHandle } from '../../../src/components/Chat/Chat';
import CioAsa from '../../../src/components/CioAsa/CioAsa';
import CioAsaProvider from '../../../src/components/CioAsaProvider/CioAsaProvider';
import { createControllableStream, createMockCioClient } from '../../local_examples/mockCioClient';

const STORAGE_KEY = 'cio-asa:chat:v1:key_test:chatbot';

function seedStorage() {
  window.sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 1,
      threads: {
        t1: {
          version: 1,
          threadId: 't1',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [
            { id: 'u1', role: 'user', text: 'restored question', status: 'done' },
            { id: 'a1', role: 'assistant', text: 'restored answer', status: 'done', groups: [] },
          ],
        },
      },
    }),
  );
}

function renderChat(ref?: React.Ref<ChatHandle>) {
  const { client } = createMockCioClient({ events: [] });
  (client as unknown as { options: { apiKey: string } }).options = { apiKey: 'key_test' };
  return render(
    <CioAsaProvider
      cioClient={client}
      staticRequestConfigs={{ domain: 'chatbot' }}
      userId={null}
      persistConversation={{ enabled: true }}>
      <Chat ref={ref} />
    </CioAsaProvider>,
  );
}

describe('Chat persistence', () => {
  beforeEach(() => window.sessionStorage.clear());
  afterEach(() => window.sessionStorage.clear());

  it('shows the restored conversation instead of the welcome screen', async () => {
    seedStorage();
    const { container } = renderChat();

    expect(screen.queryByRole('heading', { name: 'Shopping Assistant' })).not.toBeInTheDocument();
    expect(await screen.findByText('restored question')).toBeInTheDocument();
    expect(screen.getByText('restored answer')).toBeInTheDocument();
    expect(container.querySelector('.cio-asa-chat-view--welcome')).toBeNull();
    expect(container.querySelector('.cio-asa-chat-view--chat')).not.toBeNull();
  });

  it('shows the welcome screen once loading finds nothing stored', async () => {
    renderChat();

    expect(await screen.findByRole('heading', { name: 'Shopping Assistant' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveFocus());
  });

  it('clearHistory forgets the stored conversation', async () => {
    seedStorage();
    const ref = createRef<ChatHandle>();
    renderChat(ref);
    await screen.findByText('restored question');

    act(() => ref.current!.clearHistory());

    expect(await screen.findByRole('heading', { name: 'Shopping Assistant' })).toBeInTheDocument();
    await waitFor(() =>
      expect(window.sessionStorage.getItem(STORAGE_KEY)).not.toContain('restored question'),
    );
  });

  it('reports stored threads and switches between them through the handle', async () => {
    seedStorage();
    const ref = createRef<ChatHandle>();
    const onThreadsChange = jest.fn();
    const { client } = createMockCioClient({ events: [] });
    (client as unknown as { options: { apiKey: string } }).options = { apiKey: 'key_test' };
    render(
      <CioAsaProvider
        cioClient={client}
        staticRequestConfigs={{ domain: 'chatbot' }}
        userId={null}
        persistConversation={{ enabled: true }}>
        <Chat ref={ref} onThreadsChange={onThreadsChange} />
      </CioAsaProvider>,
    );
    await screen.findByText('restored question');
    await waitFor(() =>
      expect(onThreadsChange).toHaveBeenLastCalledWith(
        [expect.objectContaining({ threadId: 't1', title: 'restored question' })],
        't1',
      ),
    );
    // No notification is emitted for the empty pre-hydration state.
    expect(onThreadsChange.mock.calls[0][1]).toBe('t1');

    act(() => ref.current!.newThread());
    expect(await screen.findByRole('heading', { name: 'Shopping Assistant' })).toBeInTheDocument();
    await waitFor(() => expect(onThreadsChange).toHaveBeenLastCalledWith(expect.any(Array), null));
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toContain('restored question');

    await act(() => ref.current!.switchThread('t1'));
    expect(await screen.findByText('restored question')).toBeInTheDocument();
  });

  it('keeps the header and close button on screen while another thread loads', async () => {
    seedStorage();
    const ref = createRef<ChatHandle>();
    const onClose = jest.fn();
    const { client } = createMockCioClient({ events: [] });
    (client as unknown as { options: { apiKey: string } }).options = { apiKey: 'key_test' };
    const { container } = render(
      <CioAsaProvider
        cioClient={client}
        staticRequestConfigs={{ domain: 'chatbot' }}
        userId={null}
        persistConversation={{ enabled: true }}>
        <Chat ref={ref} onClose={onClose} />
      </CioAsaProvider>,
    );
    await screen.findByText('restored question');

    let pending!: Promise<void>;
    act(() => {
      pending = ref.current!.switchThread('missing');
    });
    expect(screen.queryByText('restored question')).not.toBeInTheDocument();
    expect(container.querySelector('.cio-asa-chat-view--chat')).not.toBeNull();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeDisabled();

    await act(() => pending);
    expect(await screen.findByRole('heading', { name: 'Shopping Assistant' })).toBeInTheDocument();
  });

  it('streams on in the widget opened again mid-answer', async () => {
    const { client, getAgentResultsStream } = createMockCioClient({ events: [] });
    (client as unknown as { options: { apiKey: string } }).options = { apiKey: 'key_test' };
    const pending = createControllableStream();
    getAgentResultsStream.mockReturnValueOnce(pending.stream);
    const widget = (open: boolean) =>
      open ? (
        <CioAsa
          cioClient={client}
          staticRequestConfigs={{ domain: 'chatbot' }}
          userId={null}
          persistConversation={{ enabled: true }}
        />
      ) : null;
    const view = render(widget(true));
    await screen.findByRole('heading', { name: 'Shopping Assistant' });

    await userEvent.type(screen.getByRole('textbox'), 'running shoes{Enter}');
    await act(async () => {
      pending.push({ type: 'start', data: { thread_id: 't' } });
      pending.push({ type: 'message', data: { text: 'Here are' } });
    });
    expect(await screen.findByText('Here are')).toBeInTheDocument();

    view.rerender(widget(false));
    await act(async () => pending.push({ type: 'message', data: { text: ' some' } }));
    view.rerender(widget(true));
    expect(await screen.findByText('Here are some')).toBeInTheDocument();

    await act(async () => {
      pending.push({ type: 'message', data: { text: ' shoes' } });
      pending.end();
    });
    expect(await screen.findByText('Here are some shoes')).toBeInTheDocument();
    expect(screen.queryByText("I can't assist you with that request.")).not.toBeInTheDocument();
  });

  it('does not fire onThreadsChange when persistence is off', async () => {
    const onThreadsChange = jest.fn();
    const { client } = createMockCioClient({ events: [] });
    render(
      <CioAsaProvider cioClient={client} staticRequestConfigs={{ domain: 'chatbot' }}>
        <Chat onThreadsChange={onThreadsChange} />
      </CioAsaProvider>,
    );

    await screen.findByRole('heading', { name: 'Shopping Assistant' });
    expect(onThreadsChange).not.toHaveBeenCalled();
  });
});
