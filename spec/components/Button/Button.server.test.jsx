import React from 'react';
import { renderServerSide } from '../../test-utils.server';
import Button from '../../../src/components/Button/Button';

describe('Button (SSR)', () => {
  it('renders the default label into the server markup', () => {
    const html = renderServerSide(<Button />);

    expect(html).toContain('Shopping assistant');
    expect(html).toContain('cio-asa-button--dark');
    expect(html).toContain('cio-asa-button--sm');
  });

  it('renders a custom label', () => {
    const html = renderServerSide(<Button label='Need help?' />);

    expect(html).toContain('Need help?');
  });

  it('reflects theme and size in the server markup', () => {
    const html = renderServerSide(<Button theme='light' size='lg' />);

    expect(html).toContain('cio-asa-button--light');
    expect(html).toContain('cio-asa-button--lg');
  });

  it('renders an icon without needing a DOM', () => {
    const html = renderServerSide(<Button />);

    expect(html).toContain('<svg');
  });

  it('does not invoke onClick during server rendering', () => {
    const onClick = jest.fn();

    renderServerSide(<Button onClick={onClick} />);

    expect(onClick).not.toHaveBeenCalled();
  });
});
