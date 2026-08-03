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
