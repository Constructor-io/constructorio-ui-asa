import { renderHook, act } from '@testing-library/react';
import React from 'react';
import useMessageInput from './useMessageInput';

function keyEvent(overrides: Partial<React.KeyboardEvent>): React.KeyboardEvent {
  return {
    key: 'Enter',
    shiftKey: false,
    preventDefault: jest.fn(),
    ...overrides,
  } as unknown as React.KeyboardEvent;
}

describe('useMessageInput', () => {
  it('tracks the input value', () => {
    const { result } = renderHook(() => useMessageInput({ onSend: jest.fn() }));
    act(() => result.current.setValue('hello'));
    expect(result.current.value).toBe('hello');
  });

  describe('handleSubmit', () => {
    it('trims and sends the value, then clears the input', () => {
      const onSend = jest.fn();
      const { result } = renderHook(() => useMessageInput({ onSend }));

      act(() => result.current.setValue('  hi  '));
      act(() => result.current.handleSubmit());

      expect(onSend).toHaveBeenCalledWith('hi');
      expect(result.current.value).toBe('');
    });

    it('does nothing when the value is empty / whitespace', () => {
      const onSend = jest.fn();
      const { result } = renderHook(() => useMessageInput({ onSend }));
      act(() => result.current.setValue('   '));
      act(() => result.current.handleSubmit());
      expect(onSend).not.toHaveBeenCalled();
    });

    it('does nothing when disabled', () => {
      const onSend = jest.fn();
      const { result } = renderHook(() => useMessageInput({ onSend, isDisabled: true }));
      act(() => result.current.setValue('hi'));
      act(() => result.current.handleSubmit());
      expect(onSend).not.toHaveBeenCalled();
    });
  });

  describe('handleKeyDown', () => {
    it('submits on Enter', () => {
      const onSend = jest.fn();
      const { result } = renderHook(() => useMessageInput({ onSend }));
      act(() => result.current.setValue('go'));

      const event = keyEvent({ key: 'Enter' });
      act(() => result.current.handleKeyDown(event));

      expect(event.preventDefault).toHaveBeenCalled();
      expect(onSend).toHaveBeenCalledWith('go');
    });

    it('ignores non-Enter keys', () => {
      const onSend = jest.fn();
      const { result } = renderHook(() => useMessageInput({ onSend }));
      act(() => result.current.setValue('go'));

      const event = keyEvent({ key: 'a' });
      act(() => result.current.handleKeyDown(event));

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(onSend).not.toHaveBeenCalled();
    });

    it('inserts a newline on Shift+Enter when submitOnEnterOnly is true', () => {
      const onSend = jest.fn();
      const { result } = renderHook(() => useMessageInput({ onSend, submitOnEnterOnly: true }));
      act(() => result.current.setValue('go'));

      const event = keyEvent({ key: 'Enter', shiftKey: true });
      act(() => result.current.handleKeyDown(event));

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(onSend).not.toHaveBeenCalled();
    });

    it('submits on Shift+Enter when submitOnEnterOnly is false', () => {
      const onSend = jest.fn();
      const { result } = renderHook(() => useMessageInput({ onSend, submitOnEnterOnly: false }));
      act(() => result.current.setValue('go'));

      const event = keyEvent({ key: 'Enter', shiftKey: true });
      act(() => result.current.handleKeyDown(event));

      expect(onSend).toHaveBeenCalledWith('go');
    });
  });
});
