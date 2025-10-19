'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  usage?: {
    tokensInput: number;
    tokensOutput: number;
  };
}

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const t = useTranslations('chat');
  const [showSources, setShowSources] = useState(false);

  return (
    <div className="flex gap-4">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
        {message.type === 'user' ? 'U' : 'A'}
      </div>
      
      {/* Message Content */}
      <div className="flex-1" data-testid={`message-${message.type}`}>
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap mb-4">{message.content}</p>
        </div>
        
        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-4">
            <button
              data-testid="view-sources"
              onClick={() => setShowSources(!showSources)}
              className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {t('interface.viewSources')}
            </button>
            
            {showSources && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                <h4 className="font-medium text-sm mb-2">Fuentes:</h4>
                <div className="space-y-2">
                  {message.sources.map((source, index) => (
                    <div key={index} className="text-sm">
                      <a 
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {source.title}
                      </a>
                      {source.snippet && (
                        <p className="text-gray-600 mt-1">{source.snippet}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Usage */}
        {message.usage && (
          <div className="mt-2 text-xs text-gray-500">
            Tokens: {message.usage.tokensInput + message.usage.tokensOutput} 
            ({message.usage.tokensInput} entrada + {message.usage.tokensOutput} salida)
          </div>
        )}
      </div>
    </div>
  );
}