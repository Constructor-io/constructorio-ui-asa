import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import WelcomeScreen from '../../../src/components/Chat/WelcomeScreen';

describe('WelcomeScreen', () => {
  it('renders the title and suggestion chips', () => {
    render(<WelcomeScreen onSend={jest.fn()} suggestions={['A', 'B']} />);
    expect(screen.getByRole('heading', { name: 'Shopping Assistant' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'B' })).toBeInTheDocument();
  });

  it('calls onSend when a suggestion chip is clicked', async () => {
    const onSend = jest.fn();
    render(<WelcomeScreen onSend={onSend} suggestions={['Suggest me']} />);
    await userEvent.click(screen.getByRole('button', { name: 'Suggest me' }));
    expect(onSend).toHaveBeenCalledWith('Suggest me');
  });

  it('calls onSend from the input on submit', async () => {
    const onSend = jest.fn();
    render(<WelcomeScreen onSend={onSend} />);
    await userEvent.type(screen.getByRole('textbox'), 'query{Enter}');
    expect(onSend).toHaveBeenCalledWith('query');
  });

  it('renders a close button only when onClose is provided', () => {
    const { rerender } = render(<WelcomeScreen onSend={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();

    rerender(<WelcomeScreen onSend={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('renders terms text when provided', () => {
    render(<WelcomeScreen onSend={jest.fn()} termsText={<span>Terms apply</span>} />);
    expect(screen.getByText('Terms apply')).toBeInTheDocument();
  });

  it('disables inputs and chips when disabled', () => {
    render(<WelcomeScreen onSend={jest.fn()} suggestions={['A']} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'A' })).toBeDisabled();
  });

  it('does not render the suggestions nav when there are none', () => {
    render(<WelcomeScreen onSend={jest.fn()} />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('renders a title override', () => {
    render(
      <WelcomeScreen
        onSend={jest.fn()}
        componentOverrides={{ title: { reactNode: ({ text }) => <h2>{`custom ${text}`}</h2> } }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'custom Shopping Assistant' })).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <WelcomeScreen onSend={jest.fn()} suggestions={['A', 'B']} onClose={jest.fn()} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
