import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import * as icons from '../../../src/components/icons';

const iconNames = Object.keys(icons) as (keyof typeof icons)[];

// Every icon this library renders is decorative: each one sits next to a
// visible text label or inside a control that carries its own accessible name.
const decorativeIcons = iconNames;

describe('icons', () => {
  it('exports every icon the library renders', () => {
    expect(iconNames.sort()).toEqual([
      'ArrowRightIcon',
      'ChatBubbleDarkIcon',
      'ChatBubbleLightIcon',
      'SendArrowIcon',
      'SendPlaneIcon',
    ]);
  });

  it.each(iconNames)('%s renders an svg', (name) => {
    const Icon = icons[name];
    const { container } = render(<Icon />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox');
  });

  it.each(decorativeIcons)('%s is hidden from assistive technology', (name) => {
    const Icon = icons[name as keyof typeof icons];
    const { container } = render(<Icon />);

    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
  });

  it.each(iconNames)('%s exposes no accessible name of its own', (name) => {
    const Icon = icons[name];
    const { container } = render(<Icon />);

    const svg = container.querySelector('svg') as SVGElement;
    expect(svg).not.toHaveAttribute('aria-label');
    expect(container.querySelector('title')).not.toBeInTheDocument();
  });

  it.each(iconNames)('%s has no accessibility violations', async (name) => {
    const Icon = icons[name];
    const { container } = render(<Icon />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
