import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { userEvent, within, waitFor } from '@storybook/testing-library';
import Chat from '../../components/Chat/Chat';
import CioAsaProvider from '../../components/CioAsaProvider/CioAsaProvider';
import createMockAgentClient, { StreamEvent } from './mockAgentClient';
import { functionArgTypes } from '../fixtures';

const QUIZ_INTENT = 'I want to buy a sewing machine';

/** The quiz the live `general_conversational_quiz` domain sends, then a plain reply to the answers. */
function quizTurn(intent: string): StreamEvent[] {
  const start = { type: 'start', data: { thread_id: 'story-thread', intent_result_id: 'ir-quiz' } };
  if (intent !== QUIZ_INTENT) {
    return [
      start,
      { type: 'message', data: { text: 'Thanks! Here is what I would pick for you.' } },
    ];
  }
  return [
    start,
    {
      type: 'clarification_quiz',
      data: {
        quiz_id: 'story-quiz',
        questions: [
          {
            id: 'question_1',
            question: 'How long have you been sewing?',
            answer_type: 'single_select',
            options: [
              { id: 'option_1', label: "I'm just starting" },
              { id: 'option_2', label: 'A little while' },
              { id: 'option_3', label: 'For years' },
            ],
            allow_free_text: false,
          },
          {
            id: 'question_2',
            question: 'What do you want to make?',
            answer_type: 'multi_select',
            options: [
              { id: 'option_1', label: 'Clothes' },
              { id: 'option_2', label: 'Quilts' },
              { id: 'option_3', label: 'Home decor' },
              { id: 'option_4', label: 'Mending and hems' },
            ],
            allow_free_text: true,
          },
          {
            id: 'question_3',
            question: 'What would you like to spend?',
            answer_type: 'single_select',
            options: [
              { id: 'option_1', label: 'Under $300' },
              { id: 'option_2', label: '$300-$700' },
              { id: 'option_3', label: 'Over $700' },
            ],
            allow_free_text: false,
          },
        ],
      },
    },
  ];
}

const mockClient = createMockAgentClient({ script: quizTurn });

const decorator = (Story: React.ComponentType) => (
  <CioAsaProvider cioClient={mockClient} staticRequestConfigs={{ domain: 'story' }}>
    <div style={{ width: '504px', height: '700px', borderRadius: '12px', overflow: 'hidden' }}>
      <Story />
    </div>
  </CioAsaProvider>
);

const meta = {
  title: 'Examples/Clarification Quiz',
  component: Chat,
  parameters: {
    a11y: { test: 'error' },
    layout: 'centered',
    docs: {
      description: {
        component:
          'When the agent sends a `clarification_quiz` event, its questions render as a step-by-step quiz. ' +
          "Submitting sends every answer as one follow-up message. These stories replay a scripted stream, so they don't need network access.",
      },
    },
  },
  argTypes: functionArgTypes,
  tags: ['!dev'],
} satisfies Meta<typeof Chat>;

export default meta;
type Story = StoryObj<typeof meta>;

const WAIT = { timeout: 5000 };

async function askAndWaitForQuiz(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.type(canvas.getByRole('textbox'), `${QUIZ_INTENT}{Enter}`);
  await waitFor(() => {
    const send = canvas.getByRole('button', { name: 'Send answers' }) as HTMLButtonElement;
    if (send.disabled) throw new Error('quiz should be enabled once the stream ends');
  }, WAIT);
  return canvas;
}

export const Default: Story = {
  decorators: [decorator],
  args: { onClose: () => alert('Close') },
  play: async ({ canvasElement }) => {
    await askAndWaitForQuiz(canvasElement);
  },
};

export const AfterSubmitting: Story = {
  decorators: [decorator],
  args: { onClose: () => alert('Close') },
  play: async ({ canvasElement }) => {
    const canvas = await askAndWaitForQuiz(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: "I'm just starting" }));
    await userEvent.click(canvas.getByRole('button', { name: 'Next question' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Clothes' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Mending and hems' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Next question' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Under $300' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Send answers' }));
    await waitFor(() => {
      canvas.getByText(
        "How long have you been sewing? I'm just starting; What do you want to make? Clothes | Mending and hems; What would you like to spend? Under $300",
      );
      canvas.getByText('Thanks! Here is what I would pick for you.');
    }, WAIT);
  },
};
