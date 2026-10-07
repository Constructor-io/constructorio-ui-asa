import type { ChatMessage, ChatPersistence } from '../../types';
import type { LiveTurn, TurnOwner } from '../agentStream';
import { ChatSession, prepareSnapshot } from '../../utils/chatSession';
import {
  normalizeHydratedMessages,
  saveThreadAndRetireStale,
  settleCancelledReply,
} from '../../utils/chatThreads';

const turns = new Set<BackgroundTurn>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** An answer that went on after its conversation left the screen, until it is stored or shown again. */
export class BackgroundTurn {
  readonly turn: LiveTurn;

  store: ChatPersistence;

  /** The conversation's own session, forked from the chat that sent the message. */
  readonly session: ChatSession;

  messages: ChatMessage[];

  streaming = true;

  /** Whether the latest snapshot is known to be stored. */
  saved = false;

  /** Every id the conversation was stored under, so a list read before a re-key still finds it. */
  readonly ids = new Set<string>();

  /** Its writes, in order; a chat that takes the turn back writes after them. */
  writes: Promise<void>;

  private stopListening?: () => void;

  constructor(
    turn: LiveTurn,
    params: {
      store: ChatPersistence;
      session: ChatSession;
      messages: ChatMessage[];
      after: Promise<void>;
    },
  ) {
    this.turn = turn;
    this.store = params.store;
    this.session = params.session;
    this.messages = params.messages;
    this.writes = params.after;
    if (this.session.storageThreadId) this.ids.add(this.session.storageThreadId);
    this.turn.owner = {
      setMessages: (action) => {
        this.messages = typeof action === 'function' ? action(this.messages) : action;
      },
      onStart: (threadId) => {
        if (threadId) this.session.serverThreadId = threadId;
        this.save().then(notify);
      },
      onDone: () => {
        if (!this.streaming) return;
        this.release();
        this.streaming = false;
        this.messages = normalizeHydratedMessages(this.messages);
        this.save().then(() => {
          if (this.saved) turns.delete(this);
          notify();
        });
      },
    };
  }

  save(): Promise<void> {
    const { snapshot, staleIds } = prepareSnapshot(this.session, this.messages);
    const { store } = this;
    this.ids.add(snapshot.threadId);
    this.saved = false;
    this.writes = this.writes
      .then(() => saveThreadAndRetireStale(store, snapshot, staleIds))
      .then(({ saved, leftover }) => {
        if (leftover.length > 0) {
          this.session.orphanIds = Array.from(new Set([...this.session.orphanIds, ...leftover]));
        }
        if (this.session.lastSyncedAt === snapshot.updatedAt) this.saved = saved;
      })
      .catch(() => {});
    return this.writes;
  }

  /** Later writes go into `store`. */
  moveTo(store: ChatPersistence): void {
    this.store = store;
    if (this.streaming) this.listen();
  }

  /** Stops the answer when another tab asks to, through the store it is saved into. */
  listen(): void {
    this.release();
    this.stopListening = this.store.subscribeAbort?.(({ messageId }) => {
      if (messageId === this.turn.assistantId) this.abort();
    });
  }

  release(): void {
    this.stopListening?.();
    this.stopListening = undefined;
  }

  /** Stops the answer and stores it settled, as the stop button does on screen. */
  abort(): void {
    if (!this.streaming) return;
    this.streaming = false;
    this.release();
    this.turn.cancel();
    this.messages = settleCancelledReply(this.messages, this.turn.assistantId);
    this.save().then(() => {
      if (this.saved) turns.delete(this);
      notify();
    });
  }

  /** Stores the conversation settled, without awaiting: the page is going away. */
  flush(): void {
    if (!this.streaming && this.saved) return;
    const { snapshot, staleIds } = prepareSnapshot(
      this.session,
      normalizeHydratedMessages(this.messages),
    );
    if (this.store.saveThreadSync) this.store.saveThreadSync(snapshot, staleIds);
    else this.store.saveThread(snapshot).catch(() => {});
  }
}

let listeningForPagehide = false;

/**
 * Keeps `turn` streaming with no chat showing it. It is saved into `store` at once, on `start`
 * and when done, each write queued behind `after`, and is dropped from here once the last one landed.
 */
export function continueInBackground(
  turn: LiveTurn,
  params: ConstructorParameters<typeof BackgroundTurn>[1],
): void {
  const bg = new BackgroundTurn(turn, params);
  turns.add(bg);
  bg.listen();
  if (!listeningForPagehide && typeof window !== 'undefined') {
    listeningForPagehide = true;
    window.addEventListener('pagehide', () => turns.forEach((t) => t.flush()));
  }
  bg.save().then(notify);
}

/**
 * Takes back the background turn stored in `store` under `threadId` for a chat to show, handing an
 * unfinished one to `createOwner`; `null` if there is none.
 */
export function resumeBackgroundTurn(
  store: ChatPersistence,
  threadId: string,
  createOwner: (turn: LiveTurn) => TurnOwner,
): BackgroundTurn | null {
  const bg = Array.from(turns).find((t) => t.store === store && t.ids.has(threadId));
  if (!bg) return null;
  turns.delete(bg);
  bg.release();
  if (bg.streaming) bg.turn.owner = createOwner(bg.turn);
  return bg;
}

/** Points the background turns of `from` at `to`; resolves once their writes into `from` settled. */
export function moveBackgroundTurns(from: ChatPersistence, to: ChatPersistence): Promise<void> {
  const moving = Array.from(turns).filter((bg) => bg.store === from);
  const settled = Promise.all(moving.map((bg) => bg.writes)).then(() => {});
  moving.forEach((bg) => bg.moveTo(to));
  return settled;
}

/** Called whenever a background turn is stored or finishes. */
export function subscribeBackgroundTurns(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
