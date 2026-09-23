import { act, screen, waitFor } from '@testing-library/react';
import CioAsa from '../src/bundled';
import { createMockCioClient } from './local_examples/mockCioClient';

const SELECTOR = '#cio-asa-root';

function mountTarget() {
  const container = document.createElement('div');
  container.id = 'cio-asa-root';
  document.body.appendChild(container);
  return container;
}

function mountStylesheet() {
  const style = document.createElement('style');
  style.id = 'cio-asa-styles';
  document.head.appendChild(style);
  return style;
}

/** The bundle needs a client; a mock keeps these tests off the network. */
function mount(options = {}) {
  const { client } = createMockCioClient({
    events: [{ type: 'message', data: { text: 'An answer' } }],
  });

  act(() => {
    CioAsa({ selector: SELECTOR, cioClient: client, ...options });
  });
}

describe('bundled entry (standalone browser build)', () => {
  let consoleError;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('publishes itself on window so script-tag consumers can call it', () => {
    expect(window.CioAsa).toBe(CioAsa);
  });

  it('renders the chat UI into the element matched by the selector', async () => {
    mountTarget();

    mount();

    await waitFor(() => {
      expect(screen.getByText('Shopping Assistant')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('Ask anything')).toBeInTheDocument();
  });

  /**
   * Regression: the bundle shipped a placeholder that rendered `<div {...rest} />`,
   * so a script-tag consumer got an empty div carrying the API key as an attribute
   * and no UI at all.
   */
  // cspell:ignore apikey
  it('renders the agent, not a bare div carrying the options as attributes', async () => {
    const container = mountTarget();

    mount({ apiKey: 'key_test' });

    await waitFor(() => {
      expect(screen.getByText('Shopping Assistant')).toBeInTheDocument();
    });
    expect(container.querySelector('[apikey]')).not.toBeInTheDocument();
    expect(container.textContent).not.toBe('');
  });

  it('forwards chat options through to the Chat component', async () => {
    mountTarget();

    mount({ initialSuggestions: ['Show me winter boots'] });

    await waitFor(() => {
      expect(screen.getByText('Show me winter boots')).toBeInTheDocument();
    });
  });

  it('forwards persistConversation to the provider and restores the stored conversation', async () => {
    const now = Date.now();
    const thread = {
      version: 1,
      threadId: 't',
      messages: [
        { id: 'u1', role: 'user', text: 'Stored question', status: 'done' },
        { id: 'a1', role: 'assistant', text: 'Stored answer', status: 'done' },
      ],
      createdAt: now,
      updatedAt: now,
    };
    window.sessionStorage.setItem(
      'cio-asa:chat:v1:key_test:chatbot',
      JSON.stringify({ version: 1, threads: { t: thread }, deleted: {} }),
    );
    mountTarget();

    mount({ apiKey: 'key_test', persistConversation: true });

    await waitFor(() => {
      expect(screen.getByText('Stored question')).toBeInTheDocument();
    });
    window.sessionStorage.clear();
  });

  it('does not treat `selector` or `includeCSS` as component props', async () => {
    const container = mountTarget();

    mount({ includeCSS: true });

    await waitFor(() => {
      expect(screen.getByText('Shopping Assistant')).toBeInTheDocument();
    });
    expect(container.querySelector('[selector]')).not.toBeInTheDocument();
    expect(container.querySelector('[includeCSS]')).not.toBeInTheDocument();
  });

  it('logs an error and renders nothing when the selector matches no element', () => {
    act(() => {
      CioAsa({ selector: '#does-not-exist' });
    });

    expect(consoleError).toHaveBeenCalledWith(
      'CioAsa: There were no elements found for the provided selector',
    );
    expect(document.body).toBeEmptyDOMElement();
  });

  it('disables the bundled stylesheet when includeCSS is false', () => {
    mountTarget();
    const stylesheet = mountStylesheet();

    mount({ includeCSS: false });

    expect(stylesheet.disabled).toBe(true);
  });

  it('keeps the bundled stylesheet enabled by default', () => {
    mountTarget();
    const stylesheet = mountStylesheet();
    stylesheet.disabled = true;

    mount();

    expect(stylesheet.disabled).toBe(false);
  });

  it('renders even when the bundled stylesheet is absent', async () => {
    mountTarget();

    expect(() => mount({ includeCSS: false })).not.toThrow();

    await waitFor(() => {
      expect(screen.getByText('Shopping Assistant')).toBeInTheDocument();
    });
  });
});
