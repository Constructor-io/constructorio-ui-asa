import type { ChatMessage, PersistedChat } from '../../src/types';
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
