import React from 'react';
import { renderServerSide } from '../../test-utils.server';
import ClarificationQuiz from '../../../src/components/Chat/ClarificationQuiz';
import { sewingQuiz } from '../../utils/chatFixtures';

describe('ClarificationQuiz (SSR)', () => {
  it('renders the first question and its progress into the server markup', () => {
    const html = renderServerSide(<ClarificationQuiz quiz={sewingQuiz} onSubmit={jest.fn()} />);

    expect(html).toContain('Question 1 of 3');
    expect(html).toContain('How long have you been sewing?');
    expect(html).toContain('aria-label="A few questions"');
  });
});
