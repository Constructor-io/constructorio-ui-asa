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
    expect(onSend).toHaveBeenCalledWith('Suggest me', 'suggestion');
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

  it('does not render the suggestions group when there are none', () => {
    render(<WelcomeScreen onSend={jest.fn()} />);
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  describe('accessibility', () => {
    it('exposes the suggestions as a named group, not a navigation landmark', () => {
      render(<WelcomeScreen onSend={jest.fn()} suggestions={['A']} />);
      expect(screen.getByRole('group', { name: 'Suggested questions' })).toBeInTheDocument();
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });

    it('translates the suggestions group label', () => {
      render(
        <WelcomeScreen
          onSend={jest.fn()}
          suggestions={['A']}
          translations={{ 'CioAsa.welcome.suggestionsAriaLabel': 'Preguntas sugeridas' }}
        />,
      );
      expect(screen.getByRole('group', { name: 'Preguntas sugeridas' })).toBeInTheDocument();
    });

    it('names the send button by its visible label (WCAG 2.5.3 Label in Name)', () => {
      render(<WelcomeScreen onSend={jest.fn()} />);

      const sendButton = screen.getByRole('button', { name: 'Chat' });
      expect(sendButton).not.toHaveAttribute('aria-label');
    });

    it('keeps the send button name in sync with the translated visible label', () => {
      render(
        <WelcomeScreen
          onSend={jest.fn()}
          translations={{ 'CioAsa.welcome.sendButton': 'Enviar' }}
        />,
      );
      expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
    });

    it('hides the decorative send icon from assistive technology', () => {
      render(<WelcomeScreen onSend={jest.fn()} />);

      const icon = screen.getByRole('button', { name: 'Chat' }).querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
      expect(icon).toHaveAttribute('focusable', 'false');
    });
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
