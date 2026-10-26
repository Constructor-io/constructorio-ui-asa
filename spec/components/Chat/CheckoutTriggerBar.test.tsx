import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import CheckoutTriggerBar from '../../../src/components/Chat/CheckoutTriggerBar';
import { CheckoutTrigger, CheckoutTriggerState, ChatMessage } from '../../../src/types';

const message: ChatMessage = { id: 'a1', role: 'assistant', text: 'Here you go', status: 'done' };
const state: CheckoutTriggerState = {
  message,
  products: [{ id: '1', name: 'Sneaker', price: 120 }],
  messages: [message],
  isLatest: true,
  isStreaming: false,
};

describe('CheckoutTriggerBar', () => {
  it('renders the default label and calls onTrigger with the state', async () => {
    const onTrigger = jest.fn();
    render(<CheckoutTriggerBar triggers={[{ id: 'checkout', onTrigger }]} state={state} />);
    const button = screen.getByRole('button', { name: 'Checkout' });
    await userEvent.click(button);
    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(onTrigger).toHaveBeenCalledWith(state);
  });

  it('labels the group for screen readers and translates both strings', () => {
    render(
      <CheckoutTriggerBar
        triggers={[{ id: 'checkout', onTrigger: jest.fn() }]}
        state={state}
        translations={{
          'CioAsa.checkout.ariaLabel': 'Payment options',
          'CioAsa.checkout.triggerLabel': 'Pay now',
        }}
      />,
    );
    expect(screen.getByRole('group', { name: 'Payment options' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pay now' })).toBeInTheDocument();
  });

  it('uses the trigger label over the default', () => {
    render(
      <CheckoutTriggerBar
        triggers={[{ id: 'buy', label: 'Buy now', onTrigger: jest.fn() }]}
        state={state}
      />,
    );
    expect(screen.getByRole('button', { name: 'Buy now' })).toBeInTheDocument();
  });

  it('renders triggers in the order given', () => {
    const triggers: CheckoutTrigger[] = [
      { id: 'first', label: 'First', onTrigger: jest.fn() },
      { id: 'second', label: 'Second', onTrigger: jest.fn() },
    ];
    render(<CheckoutTriggerBar triggers={triggers} state={state} />);
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['First', 'Second']);
  });

  it('hides a trigger whose triggerWhen returns false, and renders nothing when all are hidden', () => {
    const triggerWhen = jest.fn().mockReturnValue(false);
    const { container } = render(
      <CheckoutTriggerBar
        triggers={[{ id: 'checkout', triggerWhen, onTrigger: jest.fn() }]}
        state={state}
      />,
    );
    expect(triggerWhen).toHaveBeenCalledWith(state);
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps only the triggers whose triggerWhen returns true', () => {
    const triggers: CheckoutTrigger[] = [
      {
        id: 'shown',
        label: 'Shown',
        triggerWhen: (s) => s.products.length > 0,
        onTrigger: jest.fn(),
      },
      {
        id: 'hidden',
        label: 'Hidden',
        triggerWhen: (s) => s.products.length > 5,
        onTrigger: jest.fn(),
      },
    ];
    render(<CheckoutTriggerBar triggers={triggers} state={state} />);
    expect(screen.getByRole('button', { name: 'Shown' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hidden' })).not.toBeInTheDocument();
  });

  it('disables the default button and does not fire onTrigger', async () => {
    const onTrigger = jest.fn();
    render(
      <CheckoutTriggerBar
        triggers={[{ id: 'checkout', disabled: true, onTrigger }]}
        state={state}
      />,
    );
    const button = screen.getByRole('button', { name: 'Checkout' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('uses renderButton when given and forwards onClick, label, disabled and id', async () => {
    const onTrigger = jest.fn();
    const renderButton = jest.fn(({ onClick, label, disabled, id }) => (
      <button type='button' data-testid={`custom-${id}`} disabled={disabled} onClick={onClick}>
        {label}
      </button>
    ));
    render(
      <CheckoutTriggerBar
        triggers={[{ id: 'buy', label: 'Go', disabled: false, renderButton, onTrigger }]}
        state={state}
      />,
    );
    expect(document.querySelector('.cio-asa-checkout-trigger')).not.toBeInTheDocument();
    const custom = screen.getByTestId('custom-buy');
    expect(custom).toHaveTextContent('Go');
    expect(custom).toBeEnabled();
    await userEvent.click(custom);
    expect(onTrigger).toHaveBeenCalledWith(state);
  });

  it('has no axe violations', async () => {
    const { container } = render(
      <CheckoutTriggerBar
        triggers={[
          { id: 'buy', label: 'Buy now', onTrigger: jest.fn() },
          { id: 'off', label: 'Out of stock', disabled: true, onTrigger: jest.fn() },
        ]}
        state={state}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
