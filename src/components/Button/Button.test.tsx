import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import Button from './Button';

describe('Button', () => {
  it('renders the default label', () => {
    render(<Button />);
    expect(screen.getByText('Shopping assistant')).toBeInTheDocument();
  });

  it('renders a custom label', () => {
    render(<Button label='Chat now' />);
    expect(screen.getByText('Chat now')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies theme and size modifier classes', () => {
    const { container } = render(<Button theme='light' size='lg' />);
    const button = container.querySelector('.cio-asa-button');
    expect(button).toHaveClass('cio-asa-button--light');
    expect(button).toHaveClass('cio-asa-button--lg');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Button />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
