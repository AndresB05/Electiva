'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  conversationId?: string;
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

interface ChatAreaProps {
  conversations: Array<{id: string; title: string; updatedAt: string}>;
  activeConversationId: string | null;
  onNewConversation: () => string; // Return the new conversation ID
  onUpdateConversationTitle?: (conversationId: string, title: string) => void;
  conversationMessages: Record<string, Message[]>;
  setConversationMessages: React.Dispatch<React.SetStateAction<Record<string, Message[]>>>;
}

export default function ChatArea({ conversations, activeConversationId, onNewConversation, onUpdateConversationTitle, conversationMessages, setConversationMessages }: ChatAreaProps) {
  const t = useTranslations('chat');
  // Remove local state as it's now passed from parent
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [settings, setSettings] = useState({
    topK: 5,
    temperature: 0.7
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get messages for the active conversation, or default conversation if none selected
  const currentConversationId = activeConversationId || 'default';
  const messages = conversationMessages[currentConversationId] || [];

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      conversationId: currentConversationId,
    };

    // Check if we need to create a new conversation and update title
    let actualConversationId = currentConversationId;
    const isFirstMessage = currentConversationId === 'default' && (conversationMessages[currentConversationId] || []).length === 0;
    
    if (isFirstMessage) {
      // Create new conversation and get its ID
      actualConversationId = onNewConversation();
      
      // Generate a title from the user's message
      const title = message.length > 30 ? message.substring(0, 30) + '...' : message;
      
      // Update the conversation title immediately
      if (onUpdateConversationTitle) {
        onUpdateConversationTitle(actualConversationId, title);
      }
      
      // Update the user message with the correct conversation ID
      userMessage.conversationId = actualConversationId;
    }

    // Update messages for the current conversation (which could be 'default' or the new one)
    const targetConversationId = isFirstMessage ? actualConversationId : currentConversationId;
    setConversationMessages(prev => ({
      ...prev,
      [targetConversationId]: [...(prev[targetConversationId] || []), userMessage]
    }));
    
    setIsLoading(true);
    setStreamingMessage('');

    // Create assistant message placeholder with the correct conversation ID
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      type: 'assistant',
      content: '',
      conversationId: targetConversationId,
    };
    
    setConversationMessages(prev => ({
      ...prev,
      [targetConversationId]: [...(prev[targetConversationId] || []), assistantMessage]
    }));

    // Remove the old auto-creation logic since we handle it above

    try {
      abortControllerRef.current = new AbortController();
      
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationId: targetConversationId,
          settings
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let currentSources: any[] | undefined;
      let currentUsage: any | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              
              if (eventData.type === 'message') {
                accumulatedContent += eventData.data.content;
                setStreamingMessage(accumulatedContent);
                setConversationMessages(prev => ({
                  ...prev,
                  [targetConversationId]: (prev[targetConversationId] || []).map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                }));
              } else if (eventData.type === 'sources') {
                currentSources = eventData.data.sources;
              } else if (eventData.type === 'usage') {
                currentUsage = eventData.data.usage;
              } else if (eventData.type === 'complete') {
                setConversationMessages(prev => ({
                  ...prev,
                  [targetConversationId]: (prev[targetConversationId] || []).map(msg => 
                    msg.id === assistantMessageId 
                      ? { 
                          ...msg, 
                          content: accumulatedContent,
                          sources: currentSources,
                          usage: currentUsage,
                        }
                      : msg
                  )
                }));
              } else if (eventData.type === 'error') {
                throw new Error(eventData.data.message);
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setConversationMessages(prev => ({
        ...prev,
        [targetConversationId]: (prev[targetConversationId] || []).map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: `${t('common.error')}: ${error instanceof Error ? error.message : 'Unknown error'}` }
            : msg
        )
      }));
    } finally {
      setIsLoading(false);
      setStreamingMessage('');
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      setStreamingMessage('');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <ChatHeader 
        settings={settings} 
        onSettingsChange={setSettings}
      />
      
      {messages.length > 0 ? (
        /* Show messages when they exist */
        <MessageList 
          messages={messages}
          streamingMessage={streamingMessage}
          isLoading={isLoading}
        />
      ) : (
        /* Welcome screen when no messages */
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg font-medium mb-2">¡Bienvenido a tu asistente de chat!</p>
            <p className="text-sm">Escribe un mensaje para comenzar una nueva conversación</p>
          </div>
        </div>
      )}
      
      {/* Input - always enabled and ready to use */}
      <ChatInput 
        onSendMessage={handleSendMessage}
        onStop={handleStop}
        isLoading={isLoading}
      />
    </div>
  );
}