import React, { useRef } from 'react';
import { render, fireEvent } from '@testing-library/react';
import useFocusTrap from '../../src/hooks/useFocusTrap';

function TrapFixture({ onEscape }: { onEscape?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, { onEscape });
  return (
    <div ref={ref} data-testid='container'>
      <button type='button'>first</button>
      <button type='button'>middle</button>
      <button type='button'>last</button>
    </div>
  );
}

function EmptyTrapFixture() {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref);
  return <div ref={ref} data-testid='container' />;
}

function UnattachedTrapFixture() {
  // The ref is never wired to a rendered node, so containerRef.current stays null.
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref);
  return <div data-testid='container' />;
}

describe('useFocusTrap', () => {
  it('does not throw when the container ref is never attached', () => {
    const { getByTestId } = render(<UnattachedTrapFixture />);
    expect(() => fireEvent.keyDown(getByTestId('container'), { key: 'Tab' })).not.toThrow();
  });

  it('does nothing on Tab when the container has no focusable elements', () => {
    const { getByTestId } = render(<EmptyTrapFixture />);
    const previouslyFocused = document.activeElement;
    expect(() => fireEvent.keyDown(getByTestId('container'), { key: 'Tab' })).not.toThrow();
    expect(document.activeElement).toBe(previouslyFocused);
  });

  it('wraps focus from the last element back to the first on Tab', () => {
    const { getByText, getByTestId } = render(<TrapFixture />);
    const first = getByText('first');
    const last = getByText('last');
    last.focus();
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(getByTestId('container'), { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  it('wraps focus from the first element to the last on Shift+Tab', () => {
    const { getByText, getByTestId } = render(<TrapFixture />);
    const first = getByText('first');
    const last = getByText('last');
    first.focus();

    fireEvent.keyDown(getByTestId('container'), { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('invokes onEscape when Escape is pressed', () => {
    const onEscape = jest.fn();
    const { getByTestId } = render(<TrapFixture onEscape={onEscape} />);
    fireEvent.keyDown(getByTestId('container'), { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('does not throw on Escape when no onEscape is provided', () => {
    const { getByTestId } = render(<TrapFixture />);
    expect(() => fireEvent.keyDown(getByTestId('container'), { key: 'Escape' })).not.toThrow();
  });

  it('removes the listener on unmount', () => {
    const onEscape = jest.fn();
    const { getByTestId, unmount } = render(<TrapFixture onEscape={onEscape} />);
    const container = getByTestId('container');
    unmount();
    fireEvent.keyDown(container, { key: 'Escape' });
    expect(onEscape).not.toHaveBeenCalled();
  });
});
