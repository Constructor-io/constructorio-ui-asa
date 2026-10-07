import React from 'react';
import { renderServerSide } from '../../test-utils.server';
import FollowUpRefinement from '../../../src/components/Chat/FollowUpRefinement';

const refinement = {
  question: 'Who are you shopping for?',
  options: ["Women's styles", 'Kids and baby'],
};

describe('FollowUpRefinement (SSR)', () => {
  it('renders the question and every chip into the server markup', () => {
    const html = renderServerSide(
      <FollowUpRefinement refinement={refinement} onOptionClick={jest.fn()} />,
    );

    expect(html).toContain('Who are you shopping for?');
    expect(html).toContain('Kids and baby');
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Refine your results"');
  });

  it('marks chips disabled when inert', () => {
    const html = renderServerSide(
      <FollowUpRefinement refinement={refinement} onOptionClick={jest.fn()} isDisabled />,
    );

    expect(html).toContain('cio-asa-follow-up-refinement--disabled');
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });
});
