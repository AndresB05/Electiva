'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onStop: () => void;
  isLoading: boolean;
}

export default function ChatInput({ onSendMessage, onStop, isLoading }: ChatInputProps) {
  const t = useTranslations('chat');
  const [inputValue, setInputValue] = useState('');

  const isInputDisabled = isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isInputDisabled) return;
    
    onSendMessage(inputValue);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                data-testid="chat-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('interface.placeholder')}
                disabled={isInputDisabled}
                rows={1}
                className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                style={{
                  minHeight: '52px',
                  maxHeight: '200px',
                }}
              />
              
              {/* Send Button */}
              <button
                type="submit"
                data-testid="send-button"
                disabled={!inputValue.trim() || isInputDisabled}
                className="absolute right-2 bottom-2 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            
            {/* Stop Button (when loading) */}
            {isLoading && (
              <button
                type="button"
                onClick={onStop}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Detener
              </button>
            )}
          </div>
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="mt-2 text-sm text-gray-500 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
              {t('interface.thinking')}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}