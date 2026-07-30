import React from 'react';
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import * as icons from '../../../src/components/icons';

const iconNames = Object.keys(icons) as (keyof typeof icons)[];

// Icons rendered next to their own visible label are hidden from assistive
// tech; ArrowRightIcon sits inside a button that already has a text label.
const decorativeIcons = [
  'ChatBubbleDarkIcon',
  'ChatBubbleLightIcon',
  'SendArrowIcon',
  'SendPlaneIcon',
];

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

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
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
