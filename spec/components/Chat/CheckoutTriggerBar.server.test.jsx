import React from 'react';
import { renderServerSide } from '../../test-utils.server';
import CheckoutTriggerBar from '../../../src/components/Chat/CheckoutTriggerBar';

const message = { id: 'a1', role: 'assistant', text: 'Here you go', status: 'done' };
const state = { message, products: [], messages: [message], isLatest: true, isStreaming: false };

describe('CheckoutTriggerBar (SSR)', () => {
  it('renders every button into the server markup', () => {
    const html = renderServerSide(
      <CheckoutTriggerBar
        triggers={[
          { id: 'buy', label: 'Buy now', onTrigger: jest.fn() },
          { id: 'checkout', onTrigger: jest.fn() },
        ]}
        state={state}
      />,
    );
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Checkout options"');
    expect(html).toContain('Buy now');
    expect(html).toContain('>Checkout<');
  });

  it('marks a disabled trigger disabled', () => {
    const html = renderServerSide(
      <CheckoutTriggerBar
        triggers={[{ id: 'buy', disabled: true, onTrigger: jest.fn() }]}
        state={state}
      />,
    );
    expect(html).toContain('disabled=""');
  });
});
