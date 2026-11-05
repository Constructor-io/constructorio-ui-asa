import React, { useState } from 'react';
import { RenderPropsWrapper } from '@constructor-io/constructorio-ui-components';
import {
  ClarificationQuiz as ClarificationQuizData,
  ClarificationQuizAnswers,
  ClarificationQuizRenderProps,
  ComponentOverrideProps,
  Translations,
} from '../../types';
import translate from '../../utils/translate';
import formatQuizAnswer from '../../utils/quizAnswer';
import { ArrowRightIcon } from '../icons';

export interface ClarificationQuizProps {
  quiz: ClarificationQuizData;
  /** Receives the answers as one line of text. */
  onSubmit: (text: string) => void;
  isDisabled?: boolean;
  translations?: Translations;
  componentOverrides?: ComponentOverrideProps<ClarificationQuizRenderProps>;
}

export default function ClarificationQuiz({
  quiz,
  onSubmit,
  isDisabled = false,
  translations,
  componentOverrides,
}: ClarificationQuizProps) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<ClarificationQuizAnswers>({});
  const { questions } = quiz;
  const question = questions[current];
  const answer = answers[question.id] ?? { optionIds: [], text: '' };
  const isSingle = question.answerType === 'single_select';
  const questionId = `cio-asa-quiz-${quiz.quizId}-${question.id}`;

  const setAnswer = (optionIds: string[], text: string) =>
    setAnswers((prev) => ({ ...prev, [question.id]: { optionIds, text } }));

  // On a single-select question a pick and typed text replace each other.
  const togglePick = (optionId: string) => {
    const picked = answer.optionIds.includes(optionId);
    if (isSingle) setAnswer(picked ? [] : [optionId], '');
    else
      setAnswer(
        picked ? answer.optionIds.filter((id) => id !== optionId) : [...answer.optionIds, optionId],
        answer.text,
      );
  };
  const setText = (text: string) => setAnswer(isSingle && text ? [] : answer.optionIds, text);

  const handleSubmit = (submitted: ClarificationQuizAnswers) => {
    if (isDisabled) return;
    onSubmit(formatQuizAnswer(quiz, submitted));
  };

  const renderProps: ClarificationQuizRenderProps = {
    quiz,
    onSubmit: handleSubmit,
    isDisabled,
  };

  const textInput = (placeholder: string, labelProps: Record<string, string>) => (
    <input
      type='text'
      className='cio-asa-clarification-quiz__input'
      value={answer.text}
      placeholder={placeholder}
      disabled={isDisabled}
      onChange={(e) => setText(e.target.value)}
      {...labelProps}
    />
  );

  return (
    <RenderPropsWrapper override={componentOverrides?.reactNode} props={renderProps}>
      <div
        className={[
          'cio-asa-clarification-quiz',
          isDisabled && 'cio-asa-clarification-quiz--disabled',
        ]
          .filter(Boolean)
          .join(' ')}
        role='group'
        aria-label={translate('CioAsa.quiz.ariaLabel', translations)}>
        <div className='cio-asa-clarification-quiz__header'>
          <p className='cio-asa-clarification-quiz__progress' aria-live='polite'>
            {translate('CioAsa.quiz.progress', translations)
              .replace('{current}', String(current + 1))
              .replace('{total}', String(questions.length))}
          </p>
          <div className='cio-asa-clarification-quiz__nav'>
            <button
              type='button'
              className='cio-asa-clarification-quiz__nav-button cio-asa-clarification-quiz__nav-button--previous'
              aria-label={translate('CioAsa.quiz.previous', translations)}
              disabled={current === 0}
              onClick={() => setCurrent(current - 1)}>
              <ArrowRightIcon />
            </button>
            <button
              type='button'
              className='cio-asa-clarification-quiz__nav-button'
              aria-label={translate('CioAsa.quiz.next', translations)}
              disabled={current === questions.length - 1}
              onClick={() => setCurrent(current + 1)}>
              <ArrowRightIcon />
            </button>
          </div>
        </div>
        <p id={questionId} className='cio-asa-clarification-quiz__question'>
          {question.question}
        </p>
        {question.answerType === 'free_text' ? (
          textInput(translate('CioAsa.quiz.freeTextPlaceholder', translations), {
            'aria-labelledby': questionId,
          })
        ) : (
          <div
            className='cio-asa-clarification-quiz__options'
            role='group'
            aria-labelledby={questionId}>
            {question.options.map((option) => (
              <button
                key={option.id}
                type='button'
                className='cio-asa-clarification-quiz__chip'
                aria-pressed={answer.optionIds.includes(option.id)}
                disabled={isDisabled}
                onClick={() => togglePick(option.id)}>
                {option.label}
              </button>
            ))}
          </div>
        )}
        {question.allowFreeText &&
          textInput(translate('CioAsa.quiz.otherPlaceholder', translations), {
            'aria-label': translate('CioAsa.quiz.otherPlaceholder', translations),
          })}
        <button
          type='button'
          className='cio-asa-clarification-quiz__submit'
          disabled={isDisabled}
          onClick={() => handleSubmit(answers)}>
          {translate('CioAsa.quiz.submit', translations)}
        </button>
      </div>
    </RenderPropsWrapper>
  );
}

ClarificationQuiz.displayName = 'ClarificationQuiz';
