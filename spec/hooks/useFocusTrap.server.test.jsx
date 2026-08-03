import React, { useRef } from 'react';
import { renderServerSide } from '../test-utils.server';
import useFocusTrap from '../../src/hooks/useFocusTrap';

function TrappedDialog({ onEscape }) {
  const containerRef = useRef(null);
  useFocusTrap(containerRef, { onEscape });

  return (
    <div ref={containerRef}>
      <button type='button'>First</button>
      <button type='button'>Last</button>
    </div>
  );
}

describe('useFocusTrap (SSR)', () => {
  it('renders the trapped container without a DOM', () => {
    const html = renderServerSide(<TrappedDialog onEscape={jest.fn()} />);

    expect(html).toContain('First');
    expect(html).toContain('Last');
  });

  it('does not attach key handlers or call onEscape on the server', () => {
    const onEscape = jest.fn();

    renderServerSide(<TrappedDialog onEscape={onEscape} />);

    expect(onEscape).not.toHaveBeenCalled();
  });

  it('tolerates a missing onEscape handler', () => {
    expect(() => renderServerSide(<TrappedDialog />)).not.toThrow();
  });

  it('does not touch `document`, which does not exist on the server', () => {
    expect(typeof document).toBe('undefined');
    expect(() => renderServerSide(<TrappedDialog onEscape={jest.fn()} />)).not.toThrow();
  });
});
