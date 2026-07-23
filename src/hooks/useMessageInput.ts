import React, { useState } from 'react';

interface UseMessageInputOptions {
  onSend: (text: string) => void;
  isDisabled?: boolean;
  /** When true, Shift+Enter will not submit (allowing a newline in multiline inputs). */
  submitOnEnterOnly?: boolean;
}

interface UseMessageInput {
  value: string;
  setValue: (value: string) => void;
  handleSubmit: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

export default function useMessageInput({
  onSend,
  isDisabled = false,
  submitOnEnterOnly = false,
}: UseMessageInputOptions): UseMessageInput {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (isDisabled || !value.trim()) return;
    onSend(value.trim());
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    if (submitOnEnterOnly && e.shiftKey) return;
    e.preventDefault();
    handleSubmit();
  };

  return { value, setValue, handleSubmit, handleKeyDown };
}
