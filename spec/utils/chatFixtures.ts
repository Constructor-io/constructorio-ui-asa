import type { ChatMessage, ClarificationQuiz, PersistedChat } from '../../src/types';
import { PERSISTED_CHAT_VERSION } from '../../src/utils/chatThreads';

export class FakeStorage implements Storage {
  private map = new Map<string, string>();

  quotaBytes = Infinity;

  beforeGetItem?: () => void;

  get length() {
    return this.map.size;
  }

  key(index: number) {
    return Array.from(this.map.keys())[index] ?? null;
  }

  getItem(key: string) {
    this.beforeGetItem?.();
    return this.map.get(key) ?? null;
  }

  poke(key: string, value: string) {
    this.map.set(key, value);
  }

  setItem(key: string, value: string) {
    if (value.length > this.quotaBytes) throw new DOMException('quota', 'QuotaExceededError');
    this.map.set(key, value);
  }

  removeItem(key: string) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }
}

let counter = 0;
export function msg(
  role: ChatMessage['role'],
  text: string,
  status: ChatMessage['status'] = 'done',
): ChatMessage {
  counter += 1;
  return { id: `m${counter}`, role, text, status };
}

export function turns(n: number): ChatMessage[] {
  return Array.from({ length: n }).flatMap((_, i) => [
    msg('user', `q${i + 1}`),
    msg('assistant', `a${i + 1}`),
  ]);
}

export function chat(
  threadId: string,
  messages: ChatMessage[],
  updatedAt = Date.now(),
): PersistedChat {
  return { version: PERSISTED_CHAT_VERSION, threadId, messages, createdAt: updatedAt, updatedAt };
}

/** The quiz the live sewing-machine domain sends, as the library stores it. */
export const sewingQuiz: ClarificationQuiz = {
  quizId: 'quiz-1',
  questions: [
    {
      id: 'question_1',
      question: 'How long have you been sewing?',
      answerType: 'single_select',
      options: [
        { id: 'option_1', label: "I'm just starting" },
        { id: 'option_2', label: 'A little while' },
        { id: 'option_3', label: 'For years' },
      ],
      allowFreeText: true,
    },
    {
      id: 'question_2',
      question: 'What do you want to make?',
      answerType: 'multi_select',
      options: [
        { id: 'option_1', label: 'Clothes' },
        { id: 'option_2', label: 'Quilts' },
        { id: 'option_3', label: 'Home decor' },
        { id: 'option_4', label: 'Mending and hems' },
      ],
      allowFreeText: true,
    },
    {
      id: 'question_3',
      question: 'What would you like to spend?',
      answerType: 'free_text',
      options: [],
      allowFreeText: false,
    },
  ],
};
