import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import ChatInput from '../../../src/components/Chat/ChatInput';

describe('ChatInput', () => {
  it('submits typed text via the send button', async () => {
    const onSubmit = jest.fn();
    render(<ChatInput onSubmit={onSubmit} />);

    await userEvent.type(screen.getByRole('textbox'), 'hello');
    await userEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(onSubmit).toHaveBeenCalledWith('hello');
  });

  it('submits on Enter', async () => {
    const onSubmit = jest.fn();
    render(<ChatInput onSubmit={onSubmit} />);
    await userEvent.type(screen.getByRole('textbox'), 'hi{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('hi');
  });

  it('disables the send button while the input is empty', () => {
    render(<ChatInput onSubmit={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });

  it('disables the input and button when isDisabled is true', () => {
    render(<ChatInput onSubmit={jest.fn()} isDisabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });

  describe('stop button', () => {
    it('replaces the send button while a reply is streaming', () => {
      render(<ChatInput onSubmit={jest.fn()} isDisabled isStreaming onAbort={jest.fn()} />);

      expect(screen.getByRole('button', { name: 'Stop response' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Send message' })).not.toBeInTheDocument();
    });

    it('stays actionable even though the input itself is disabled', async () => {
      const onAbort = jest.fn();
      render(<ChatInput onSubmit={jest.fn()} isDisabled isStreaming onAbort={onAbort} />);

      const stop = screen.getByRole('button', { name: 'Stop response' });
      expect(stop).not.toBeDisabled();
      await userEvent.click(stop);
      expect(onAbort).toHaveBeenCalledTimes(1);
    });

    it('keeps the send button when showStopButton is false', () => {
      render(
        <ChatInput
          onSubmit={jest.fn()}
          isDisabled
          isStreaming
          onAbort={jest.fn()}
          showStopButton={false}
        />,
      );

      expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
      expect(screen.queryByRole('button', { name: 'Stop response' })).not.toBeInTheDocument();
    });

    it('still gives an override a working onAbort when showStopButton is false', async () => {
      const onAbort = jest.fn();
      render(
        <ChatInput
          onSubmit={jest.fn()}
          isStreaming
          onAbort={onAbort}
          showStopButton={false}
          componentOverrides={{
            reactNode: ({ isStreaming: streaming, onAbort: abort }) => (
              <button type='button' onClick={abort}>
                {streaming ? 'My stop' : 'My send'}
              </button>
            ),
          }}
        />,
      );

      // Opting out of the built-in control must not disable cancelling for a custom one.
      await userEvent.click(screen.getByRole('button', { name: 'My stop' }));
      expect(onAbort).toHaveBeenCalledTimes(1);
    });

    it('keeps the send button when no onAbort is wired up', () => {
      render(<ChatInput onSubmit={jest.fn()} isDisabled isStreaming />);
      expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
    });

    it('returns to the send button once streaming ends', () => {
      const { rerender } = render(
        <ChatInput onSubmit={jest.fn()} isDisabled isStreaming onAbort={jest.fn()} />,
      );
      rerender(<ChatInput onSubmit={jest.fn()} isStreaming={false} onAbort={jest.fn()} />);

      expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Stop response' })).not.toBeInTheDocument();
    });

    it('translates its accessible name', () => {
      render(
        <ChatInput
          onSubmit={jest.fn()}
          isStreaming
          onAbort={jest.fn()}
          translations={{ 'CioAsa.input.stopAriaLabel': 'Cancel the reply' }}
        />,
      );
      expect(screen.getByRole('button', { name: 'Cancel the reply' })).toBeInTheDocument();
    });

    it('has no accessibility violations', async () => {
      const { container } = render(
        <ChatInput onSubmit={jest.fn()} isDisabled isStreaming onAbort={jest.fn()} />,
      );
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  it('uses translation overrides for the placeholder and aria-labels', () => {
    render(
      <ChatInput
        onSubmit={jest.fn()}
        translations={{
          'CioAsa.input.placeholder': 'Type here',
          'CioAsa.input.ariaLabel': 'Message field',
        }}
      />,
    );
    expect(screen.getByPlaceholderText('Type here')).toBeInTheDocument();
    expect(screen.getByLabelText('Message field')).toBeInTheDocument();
  });

  it('renders a custom override node', () => {
    render(
      <ChatInput
        onSubmit={jest.fn()}
        componentOverrides={{ reactNode: () => <div>custom input</div> }}
      />,
    );
    expect(screen.getByText('custom input')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ChatInput onSubmit={jest.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
