import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import ClarificationQuiz from '../../../src/components/Chat/ClarificationQuiz';
import { sewingQuiz } from '../../utils/chatFixtures';

const next = () => userEvent.click(screen.getByRole('button', { name: 'Next question' }));
const submit = () => userEvent.click(screen.getByRole('button', { name: 'Send answers' }));

describe('ClarificationQuiz', () => {
  it('shows one question at a time with its progress', async () => {
    render(<ClarificationQuiz quiz={sewingQuiz} onSubmit={jest.fn()} />);
    expect(screen.getByRole('group', { name: 'A few questions' })).toBeInTheDocument();
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous question' })).toBeDisabled();

    await next();
    expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'What do you want to make?' })).toBeInTheDocument();

    await next();
    expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
    expect(
      screen.getByRole('textbox', { name: 'What would you like to spend?' }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Previous question' }));
    expect(screen.getByText('Question 2 of 3')).toBeInTheDocument();
  });

  it('marks picks as pressed and keeps one pick on a single-select question', async () => {
    render(<ClarificationQuiz quiz={sewingQuiz} onSubmit={jest.fn()} />);
    const starting = screen.getByRole('button', { name: "I'm just starting" });
    const years = screen.getByRole('button', { name: 'For years' });

    await userEvent.click(starting);
    expect(starting).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(years);
    expect(starting).toHaveAttribute('aria-pressed', 'false');
    expect(years).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(years);
    expect(years).toHaveAttribute('aria-pressed', 'false');
  });

  it('lets typed text and a single pick replace each other', async () => {
    render(<ClarificationQuiz quiz={sewingQuiz} onSubmit={jest.fn()} />);
    const pick = screen.getByRole('button', { name: 'For years' });
    const other = screen.getByRole('textbox', { name: 'Something else?' });

    await userEvent.click(pick);
    await userEvent.type(other, 'Since school');
    expect(pick).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(pick);
    expect(other).toHaveValue('');
  });

  it('keeps answers when moving between questions', async () => {
    render(<ClarificationQuiz quiz={sewingQuiz} onSubmit={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'For years' }));
    await next();
    await userEvent.click(screen.getByRole('button', { name: 'Previous question' }));
    expect(screen.getByRole('button', { name: 'For years' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('submits every answer as one line', async () => {
    const onSubmit = jest.fn();
    render(<ClarificationQuiz quiz={sewingQuiz} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: "I'm just starting" }));
    await next();
    await userEvent.click(screen.getByRole('button', { name: 'Clothes' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mending and hems' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Something else?' }), 'Bags');
    await next();
    await userEvent.type(screen.getByRole('textbox'), 'Under $300');
    await submit();
    expect(onSubmit).toHaveBeenCalledWith(
      "How long have you been sewing? I'm just starting; What do you want to make? Clothes | Mending and hems | Bags; What would you like to spend? Under $300",
    );
  });

  it('can be submitted with every question skipped', async () => {
    const onSubmit = jest.fn();
    render(<ClarificationQuiz quiz={sewingQuiz} onSubmit={onSubmit} />);
    await submit();
    expect(onSubmit).toHaveBeenCalledWith('No preference');
  });

  it('disables answering and submitting when isDisabled', async () => {
    const onSubmit = jest.fn();
    render(<ClarificationQuiz quiz={sewingQuiz} onSubmit={onSubmit} isDisabled />);
    expect(screen.getByRole('button', { name: 'For years' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Something else?' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send answers' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next question' })).toBeEnabled();
  });

  it('uses translations, filling in the progress numbers', () => {
    render(
      <ClarificationQuiz
        quiz={sewingQuiz}
        onSubmit={jest.fn()}
        translations={{ 'CioAsa.quiz.progress': '{current}/{total}', 'CioAsa.quiz.submit': 'Go' }}
      />,
    );
    expect(screen.getByText('1/3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
  });

  it('supports a component override with render props', async () => {
    const onSubmit = jest.fn();
    render(
      <ClarificationQuiz
        quiz={sewingQuiz}
        onSubmit={onSubmit}
        componentOverrides={{
          reactNode: ({ quiz, onSubmit: submitAnswers }) => (
            <button
              type='button'
              onClick={() =>
                submitAnswers({ [quiz.questions[2].id]: { optionIds: [], text: 'Cheap' } })
              }>
              {quiz.questions.length} questions
            </button>
          ),
        }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '3 questions' }));
    expect(onSubmit).toHaveBeenCalledWith('What would you like to spend? Cheap');
  });

  it('has no a11y violations', async () => {
    const { container } = render(<ClarificationQuiz quiz={sewingQuiz} onSubmit={jest.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
