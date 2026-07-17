import type { Translations } from '../types';

const defaultTranslations: Translations = {
  'CioAsa.header.title': 'Shopping Assistant',
  'CioAsa.header.close': 'Close',
  'CioAsa.input.placeholder': 'Ask a question about this product',
  'CioAsa.input.ariaLabel': 'Type your message',
  'CioAsa.input.sendAriaLabel': 'Send message',
  'CioAsa.welcome.title': 'Shopping Assistant',
  'CioAsa.welcome.placeholder': 'Ask anything',
  'CioAsa.welcome.sendButton': 'Chat',
  'CioAsa.welcome.inputAriaLabel': 'Type your question',
  'CioAsa.welcome.sendAriaLabel': 'Send message',
  'CioAsa.welcome.suggestionsAriaLabel': 'Suggested questions',
  'CioAsa.messageList.ariaLabel': 'Chat messages',
  'CioAsa.typingIndicator.ariaLabel': 'Assistant is typing',
  'CioAsa.userMessage.ariaLabel': 'You said',
  'CioAsa.results.viewMore': 'View more products',
  'CioAsa.results.addToCart': 'Add to cart',
};

export default function translate(key: keyof Translations, translations?: Translations): string {
  if (translations?.[key] !== undefined) {
    return translations[key] as string;
  }

  return defaultTranslations[key] || key;
}
