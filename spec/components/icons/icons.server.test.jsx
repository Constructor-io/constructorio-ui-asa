import React from 'react';
import { renderServerSide } from '../../test-utils.server';
import * as icons from '../../../src/components/icons';

const iconNames = Object.keys(icons);

describe('icons (SSR)', () => {
  it('exports every icon used by the library', () => {
    expect(iconNames).toEqual(
      expect.arrayContaining([
        'ChatBubbleDarkIcon',
        'ChatBubbleLightIcon',
        'SendArrowIcon',
        'SendPlaneIcon',
        'ArrowRightIcon',
      ]),
    );
  });

  it.each(iconNames)('%s renders inline SVG markup on the server', (name) => {
    const Icon = icons[name];

    const html = renderServerSide(<Icon />);

    expect(html).toContain('<svg');
    expect(html).toContain('</svg>');
  });
});
