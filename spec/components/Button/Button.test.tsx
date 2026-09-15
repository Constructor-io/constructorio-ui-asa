import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import Button from '../../../src/components/Button/Button';
import CioAsaProvider from '../../../src/components/CioAsaProvider/CioAsaProvider';
import { createMockCioClient } from '../../local_examples/mockCioClient';

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

  describe('tracking', () => {
    it('sends ai_agent_button_click with the provider domain and placement props', async () => {
      const { client, tracker } = createMockCioClient();
      const onClick = jest.fn();
      render(
        <CioAsaProvider cioClient={client} staticRequestConfigs={{ domain: 'explorer' }}>
          <Button onClick={onClick} positionOnPage='header' pageType='pdp' instanceId={1} />
        </CioAsaProvider>,
      );

      await userEvent.click(screen.getByRole('button'));

      expect(tracker.trackAgentButtonClick).toHaveBeenCalledWith({
        mode: 'chat',
        domain: 'explorer',
        positionOnPage: 'header',
        pageType: 'pdp',
        instanceId: 1,
        section: 'Products',
      });
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('falls back to the default chatbot domain and omits placement when not provided', async () => {
      const { client, tracker } = createMockCioClient();
      render(
        <CioAsaProvider cioClient={client}>
          <Button />
        </CioAsaProvider>,
      );

      await userEvent.click(screen.getByRole('button'));

      expect(tracker.trackAgentButtonClick).toHaveBeenCalledWith({
        mode: 'chat',
        domain: 'chatbot',
        section: 'Products',
      });
    });

    it('fires the onAgentButtonClick callback with the tracked payload', async () => {
      const { client } = createMockCioClient();
      const onAgentButtonClick = jest.fn();
      render(
        <CioAsaProvider cioClient={client} callbacks={{ onAgentButtonClick }}>
          <Button positionOnPage='search_bar' />
        </CioAsaProvider>,
      );

      await userEvent.click(screen.getByRole('button'));

      expect(onAgentButtonClick).toHaveBeenCalledWith({
        mode: 'chat',
        domain: 'chatbot',
        positionOnPage: 'search_bar',
      });
    });

    it('still calls onClick without tracking when rendered outside a provider', async () => {
      const onClick = jest.fn();
      render(<Button onClick={onClick} positionOnPage='header' />);

      await expect(userEvent.click(screen.getByRole('button'))).resolves.not.toThrow();
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});
