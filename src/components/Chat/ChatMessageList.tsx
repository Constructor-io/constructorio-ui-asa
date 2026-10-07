import React, { useEffect, useRef, useCallback } from 'react';
import {
  AiMessageOverrides,
  AssistantSubmitSource,
  ChatMessage,
  ComponentOverrideProps,
  ResultGroupMeta,
  ResultsBlockOverrides,
  Translations,
  UserMessageRenderProps,
} from '../../types';
import translate from '../../utils/translate';
import { Product, NormalizeOptions } from '../../utils/productNormalizer';
import ResultsBlock, { AspectRatio } from '../ResultsBlock/ResultsBlock';
import UserMessage from './UserMessage';
import AiMessage from './AiMessage';
import FollowUpRefinement from './FollowUpRefinement';

interface ChatMessageListProps {
  messages: ChatMessage[];
  onProductClick?: (product: Product) => void;
  onViewMore?: (group: ResultGroupMeta) => void;
  onAddToCart?: (product: Product) => void;
  aspectRatio?: AspectRatio;
  currency?: string;
  normalizeItem?: (item: any, options?: NormalizeOptions) => Product;
  addToCartText?: string;
  viewMoreText?: string;
  aiMessageOverrides?: AiMessageOverrides;
  userMessageOverrides?: ComponentOverrideProps<UserMessageRenderProps>;
  resultsBlockOverrides?: ResultsBlockOverrides;
  translations?: Translations;
  /** Sends a refinement option as a follow-up message. Chips are hidden when omitted. */
  onSend?: (text: string, source?: AssistantSubmitSource) => void;
  /** Disables refinement chips while a response is streaming. */
  isStreaming?: boolean;
}

export default function ChatMessageList({
  messages,
  onProductClick,
  onViewMore,
  onAddToCart,
  aspectRatio,
  currency,
  normalizeItem,
  addToCartText,
  viewMoreText,
  aiMessageOverrides,
  userMessageOverrides,
  resultsBlockOverrides,
  translations,
  onSend,
  isStreaming = false,
}: ChatMessageListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(messages.length);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const threshold = 100;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  useEffect(() => {
    const isNewMessage = messages.length > prevMessageCountRef.current;
    prevMessageCountRef.current = messages.length;

    if (!isNearBottomRef.current) return;
    const el = listRef.current;
    if (!el) return;

    // Smooth-scroll only when a new message is added; use 'auto' for the frequent
    // updates during SSE streaming to avoid restarting the animation on every chunk.
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: isNewMessage ? 'smooth' : 'auto' });
    });
  }, [messages]);

  return (
    <div
      className='cio-asa-chat-message-list'
      ref={listRef}
      onScroll={handleScroll}
      role='log'
      aria-live='off'
      tabIndex={0}
      aria-label={translate('CioAsa.messageList.ariaLabel', translations)}>
      {messages.map((message, index) => {
        if (message.role === 'user') {
          return (
            <UserMessage
              key={message.id}
              text={message.text}
              translations={translations}
              componentOverrides={userMessageOverrides}
            />
          );
        }

        const hasGroups = !!message.groups?.length;
        const isLatest = index === messages.length - 1;
        const refinement = onSend ? message.refinement : undefined;

        return (
          <div key={message.id} className='cio-asa-ai-message-group'>
            <AiMessage
              message={message}
              componentOverrides={aiMessageOverrides}
              translations={translations}
            />
            {hasGroups && (
              <ResultsBlock
                groups={message.groups!}
                intent={message.intent}
                intentResultId={message.intentResultId}
                threadId={message.threadId}
                onProductClick={onProductClick}
                onViewMore={onViewMore}
                onAddToCart={onAddToCart}
                aspectRatio={aspectRatio}
                currency={currency}
                normalizeItem={normalizeItem}
                addToCartText={addToCartText}
                viewMoreText={viewMoreText}
                saleBadgeText={translate('CioAsa.results.saleBadge', translations)}
                componentOverrides={resultsBlockOverrides}
              />
            )}
            {refinement && (
              <FollowUpRefinement
                refinement={refinement}
                onOptionClick={(option) => onSend!(option, 'refinement')}
                isDisabled={!isLatest || isStreaming}
                translations={translations}
                componentOverrides={aiMessageOverrides?.followUpRefinement}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

ChatMessageList.displayName = 'ChatMessageList';
