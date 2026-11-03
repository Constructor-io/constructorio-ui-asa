import formatQuizAnswer from '../../src/utils/quizAnswer';
import type { ClarificationQuiz } from '../../src/types';
import { sewingQuiz } from './chatFixtures';

const quiz: ClarificationQuiz = {
  ...sewingQuiz,
  questions: [
    sewingQuiz.questions[0],
    sewingQuiz.questions[1],
    {
      id: 'question_3',
      question: 'What would you like to spend?',
      answerType: 'single_select',
      options: [
        { id: 'option_1', label: 'Under $300' },
        { id: 'option_2', label: '$300-$700' },
      ],
      allowFreeText: false,
    },
  ],
};

describe('formatQuizAnswer', () => {
  it('writes the answers as the one line the agent expects', () => {
    expect(
      formatQuizAnswer(quiz, {
        question_1: { optionIds: ['option_1'], text: '' },
        question_2: { optionIds: ['option_4', 'option_1'], text: '' },
        question_3: { optionIds: ['option_1'], text: '' },
      }),
    ).toBe(
      "How long have you been sewing? I'm just starting; What do you want to make? Clothes | Mending and hems; What would you like to spend? Under $300",
    );
  });

  it('uses typed text in place of a single pick', () => {
    expect(
      formatQuizAnswer(quiz, { question_1: { optionIds: ['option_1'], text: 'Since school' } }),
    ).toBe('How long have you been sewing? Since school');
  });

  it('adds typed text after several picks', () => {
    expect(formatQuizAnswer(quiz, { question_2: { optionIds: ['option_2'], text: 'Bags' } })).toBe(
      'What do you want to make? Quilts | Bags',
    );
  });

  it('sends a free-text answer as typed', () => {
    expect(
      formatQuizAnswer(sewingQuiz, { question_3: { optionIds: [], text: 'About $500' } }),
    ).toBe('What would you like to spend? About $500');
  });

  it('leaves out skipped questions', () => {
    expect(
      formatQuizAnswer(quiz, {
        question_1: { optionIds: [], text: '   ' },
        question_3: { optionIds: ['option_2'], text: '' },
      }),
    ).toBe('What would you like to spend? $300-$700');
  });

  it('sends No preference when every question is skipped', () => {
    expect(formatQuizAnswer(quiz, {})).toBe('No preference');
    expect(formatQuizAnswer(quiz, { question_2: { optionIds: [], text: '' } })).toBe(
      'No preference',
    );
  });

  it('keeps the message on one line', () => {
    expect(
      formatQuizAnswer(sewingQuiz, { question_3: { optionIds: [], text: '  about\n\n $500\t ' } }),
    ).toBe('What would you like to spend? about $500');
  });
});
