import { renderHookServerSide } from '../test-utils.server';
import useMessageInput from '../../src/hooks/useMessageInput';

describe('useMessageInput (SSR)', () => {
  it('starts empty on the server so the markup matches the client first paint', () => {
    const { result } = renderHookServerSide(() => useMessageInput({ onSend: jest.fn() }));

    expect(result.value).toBe('');
  });

  it('exposes the consumer API on the server', () => {
    const { result } = renderHookServerSide(() => useMessageInput({ onSend: jest.fn() }));

    expect(typeof result.setValue).toBe('function');
    expect(typeof result.handleSubmit).toBe('function');
    expect(typeof result.handleKeyDown).toBe('function');
  });

  it('does not send while the input is empty', () => {
    const onSend = jest.fn();
    const { result } = renderHookServerSide(() => useMessageInput({ onSend }));

    result.handleSubmit();

    expect(onSend).not.toHaveBeenCalled();
  });

  it('does not send when disabled', () => {
    const onSend = jest.fn();
    const { result } = renderHookServerSide(() => useMessageInput({ onSend, isDisabled: true }));

    result.handleSubmit();

    expect(onSend).not.toHaveBeenCalled();
  });

  it('renders no markup of its own', () => {
    const { html } = renderHookServerSide(() => useMessageInput({ onSend: jest.fn() }));

    expect(html).toBe('');
  });
});
