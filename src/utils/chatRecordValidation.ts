import type { ChatMessage, FollowUpRefinement, PersistedChat, ResultGroup } from '../types';
import { PERSISTED_CHAT_VERSION } from './chatThreads';

const MESSAGE_ROLES = new Set(['user', 'assistant']);
const MESSAGE_STATUSES = new Set(['idle', 'loading', 'streaming', 'done', 'error']);

function isResultGroup(value: unknown): value is ResultGroup {
  if (!value || typeof value !== 'object') return false;
  const g = value as Partial<ResultGroup>;
  return (
    Boolean(g.group) &&
    typeof g.group === 'object' &&
    typeof g.group.display_name === 'string' &&
    Array.isArray(g.searchResults) &&
    g.searchResults.every((r) => Boolean(r) && typeof r === 'object')
  );
}

function isRefinement(value: unknown): value is FollowUpRefinement {
  if (!value || typeof value !== 'object') return false;
  const r = value as Partial<FollowUpRefinement>;
  return (
    typeof r.question === 'string' &&
    Array.isArray(r.options) &&
    r.options.every((o) => typeof o === 'string')
  );
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const m = value as Partial<ChatMessage>;
  return (
    typeof m.id === 'string' &&
    MESSAGE_ROLES.has(m.role as string) &&
    typeof m.text === 'string' &&
    MESSAGE_STATUSES.has(m.status as string) &&
    (m.groups === undefined || (Array.isArray(m.groups) && m.groups.every(isResultGroup))) &&
    (m.refinement === undefined || isRefinement(m.refinement))
  );
}

export default function isPersistedChat(value: unknown): value is PersistedChat {
  if (!value || typeof value !== 'object') return false;
  const chat = value as Partial<PersistedChat>;
  return (
    chat.version === PERSISTED_CHAT_VERSION &&
    typeof chat.threadId === 'string' &&
    Array.isArray(chat.messages) &&
    chat.messages.every(isChatMessage) &&
    typeof chat.createdAt === 'number' &&
    typeof chat.updatedAt === 'number' &&
    (chat.owner === undefined || typeof chat.owner === 'string')
  );
}
