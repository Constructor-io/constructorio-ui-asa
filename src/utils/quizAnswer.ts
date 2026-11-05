import type { ClarificationQuiz, ClarificationQuizAnswers } from '../types';

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();

/**
 * The quiz answers as the one-line shopper message the agent expects: `<question> <answer>` per
 * answered question, joined with `; `, several picks joined with ` | `, or `No preference`.
 */
export default function formatQuizAnswer(
  quiz: ClarificationQuiz,
  answers: ClarificationQuizAnswers,
): string {
  const lines = quiz.questions.flatMap((q) => {
    const text = oneLine(answers[q.id]?.text ?? '');
    const picks = q.options
      .filter((o) => answers[q.id]?.optionIds.includes(o.id))
      .map((o) => oneLine(o.label));
    // A typed answer replaces a single pick and adds to several.
    const parts = q.answerType === 'multi_select' ? [...picks, text] : [text || picks[0]];
    const answer = parts.filter(Boolean).join(' | ');
    return answer ? [`${oneLine(q.question)} ${answer}`] : [];
  });
  return lines.length ? lines.join('; ') : 'No preference';
}
