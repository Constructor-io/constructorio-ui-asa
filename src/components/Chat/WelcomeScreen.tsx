import React, { useState } from 'react';

interface WelcomeScreenProps {
  title?: string;
  suggestions?: string[];
  onSend: (text: string) => void;
  termsText?: string;
  placeholder?: string;
  sendButtonText?: string;
  disabled?: boolean;
}

const DEFAULT_SUGGESTIONS = [
  'I need luggage suitable for holiday travel',
  "I'm looking for stylish gifts that fit my budget",
  "What's good, quality watch to invest in?",
  'What should I wear to a holiday party?',
];

export default function WelcomeScreen({
  title = 'Shopping Assistant',
  suggestions = DEFAULT_SUGGESTIONS,
  onSend,
  termsText,
  placeholder = 'Ask anything',
  sendButtonText = 'Chat',
  disabled = false,
}: WelcomeScreenProps) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    onSend(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className='cio-asa-welcome-screen'>
      <div className='cio-asa-welcome-screen__content'>
        <h2 className='cio-asa-welcome-screen__title'>{title}</h2>
        <div
          className={`cio-asa-welcome-screen__input-row${disabled ? ' cio-asa-welcome-screen__input-row--disabled' : ''}`}>
          <input
            type='text'
            className='cio-asa-welcome-screen__input'
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            aria-label='Type your question'
          />
          <button
            type='button'
            className='cio-asa-welcome-screen__send-btn'
            onClick={handleSubmit}
            disabled={!inputValue.trim()}
            aria-label='Send message'>
            {sendButtonText}
            <svg
              width='16'
              height='16'
              viewBox='0 0 16 16'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
              aria-hidden='true'>
              <path
                d='M14.8934 7.09539L14.8884 7.0932L1.54219 1.55758C1.42993 1.51059 1.30778 1.49217 1.18666 1.50395C1.06554 1.51573 0.949225 1.55734 0.848125 1.62508C0.741311 1.69507 0.653573 1.79052 0.592805 1.90283C0.532037 2.01515 0.500145 2.14081 0.5 2.26852V5.80883C0.50006 5.98341 0.561019 6.15249 0.67237 6.28695C0.783722 6.4214 0.938491 6.5128 1.11 6.54539L8.38906 7.89133C8.41767 7.89675 8.44348 7.91199 8.46205 7.93441C8.48062 7.95683 8.49078 7.98503 8.49078 8.01414C8.49078 8.04325 8.48062 8.07145 8.46205 8.09387C8.44348 8.11629 8.41767 8.13153 8.38906 8.13695L1.11031 9.48289C0.938851 9.51539 0.784092 9.60667 0.67269 9.741C0.561288 9.87534 0.500219 10.0443 0.5 10.2188V13.7598C0.499917 13.8817 0.530111 14.0018 0.587871 14.1092C0.645632 14.2166 0.729152 14.3079 0.830938 14.3751C0.953375 14.4564 1.09706 14.4999 1.24406 14.5001C1.34626 14.5 1.4474 14.4795 1.54156 14.4398L14.8875 8.9357L14.8934 8.93289C15.0731 8.85569 15.2262 8.72751 15.3337 8.56421C15.4413 8.40092 15.4986 8.20968 15.4986 8.01414C15.4986 7.81861 15.4413 7.62736 15.3337 7.46407C15.2262 7.30077 15.0731 7.1726 14.8934 7.09539Z'
                fill='white'
              />
            </svg>
          </button>
        </div>
        <nav className='cio-asa-welcome-screen__suggestions' aria-label='Suggested questions'>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type='button'
              className='cio-asa-welcome-screen__suggestion-chip'
              onClick={() => onSend(suggestion)}>
              {suggestion}
            </button>
          ))}
        </nav>
      </div>
      {termsText && <div className='cio-asa-welcome-screen__terms'>{termsText}</div>}
    </div>
  );
}

WelcomeScreen.displayName = 'WelcomeScreen';
