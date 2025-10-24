'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import ChatHeader from './ChatHeader';

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
  currentModel: string;
  onModelChange: (model: string) => void;
  chatbotId?: string | null;
  isBuildingChatbot?: boolean;
}

export default function ChatArea({ conversations, activeConversationId, onNewConversation, onUpdateConversationTitle, conversationMessages, setConversationMessages, currentModel, onModelChange, chatbotId, isBuildingChatbot }: ChatAreaProps) {
  const t = useTranslations('chat');
  // Remove local state as it's now passed from parent
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [settings, setSettings] = useState({ topK: 5, temperature: 0.7 });
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get messages for the active conversation, or default conversation if none selected
  const currentConversationId = activeConversationId || 'default';
  const messages = conversationMessages[currentConversationId] || [];

  const handleSettingsChange = (newSettings: { topK: number; temperature: number }) => {
    setSettings(newSettings);
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    // If Python model is selected, handle it differently
    if (currentModel === 'python') {
      if (isBuildingChatbot) {
        // Add a message to the chat indicating the model is building
        const targetConversationId = currentConversationId === 'default' ? 'default' : currentConversationId;
        const assistantMessageId = Date.now().toString();
        const assistantMessage: Message = {
          id: assistantMessageId,
          type: 'assistant',
          content: 'El chatbot se está construyendo. Por favor, espera un momento.',
          conversationId: targetConversationId,
        };
        
        setConversationMessages(prev => ({
          ...prev,
          [targetConversationId]: [...(prev[targetConversationId] || []), assistantMessage]
        }));
        return;
      }
      
      if (!chatbotId) {
        // Add a message to the chat indicating no document has been uploaded
        const targetConversationId = currentConversationId === 'default' ? 'default' : currentConversationId;
        const assistantMessageId = Date.now().toString();
        const assistantMessage: Message = {
          id: assistantMessageId,
          type: 'assistant',
          content: 'Por favor, sube un documento PDF primero antes de hacer preguntas.',
          conversationId: targetConversationId,
        };
        
        setConversationMessages(prev => ({
          ...prev,
          [targetConversationId]: [...(prev[targetConversationId] || []), assistantMessage]
        }));
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      conversationId: currentConversationId,
    };

    // Check if we need to create a new conversation and update title
    let targetConversationId = currentConversationId;
    const isFirstMessage = currentConversationId === 'default' && (conversationMessages[currentConversationId] || []).length === 0;
    
    if (isFirstMessage) {
      // Create new conversation and get its ID
      targetConversationId = onNewConversation();
      
      // Generate a title from the user's message
      const title = message.length > 30 ? message.substring(0, 30) + '...' : message;
      
      // Update the conversation title immediately
      if (onUpdateConversationTitle) {
        onUpdateConversationTitle(targetConversationId, title);
      }
      
      // Update the user message with the correct conversation ID
      userMessage.conversationId = targetConversationId;
    }

    // Update messages for the current conversation (which could be 'default' or the new one)
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

    try {
      if (currentModel === 'python' && chatbotId) {
        // Handle Python backend chat
        const response = await fetch(`http://localhost:5000/ask_chatbot/${chatbotId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: message
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const responseContent = data.answer || 'No se pudo obtener una respuesta.';
        
        setConversationMessages(prev => ({
          ...prev,
          [targetConversationId]: (prev[targetConversationId] || []).map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: responseContent }
              : msg
          )
        }));
      } else {
        // Determine the webhook URL based on the selected model
        let webhookUrl = 'https://sswebhookss.andresblanco.website/webhook/55a9690e-b300-4e78-9911-8ecca6fa44b1';
        if (currentModel === 'openai') {
          webhookUrl = 'https://sswebhookss.andresblanco.website/webhook/61bd55ad-d3f7-4ea3-b5fd-5295bd1de5d7';
        }

        // Send message to the appropriate webhook
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: message,
            topK: settings.topK,
            temperature: settings.temperature,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        let data;
        try {
          // Check if response has content before parsing
          const responseText = await response.text();
          if (!responseText) {
            data = { response: 'Received empty response from webhook' };
          } else {
            try {
              data = JSON.parse(responseText);
            } catch (jsonError) {
              // Handle case where response is not valid JSON
              console.error('Failed to parse JSON response:', jsonError);
              data = { response: responseText };
            }
          }
        } catch (error) {
          console.error('Error reading response:', error);
          data = { response: 'Error reading response from webhook' };
        }
        
        // Display the response as assistant message
        // Handle various possible response formats from n8n
        let responseContent = '';
        if (Array.isArray(data) && data.length > 0) {
          // Handle array response format
          const firstItem = data[0];
          responseContent = firstItem.output || firstItem.response || firstItem.message || firstItem.text || '';
        } else {
          // Handle object response format
          responseContent = data.output || data.response || data.message || data.text || '';
        }
        
        setConversationMessages(prev => ({
          ...prev,
          [targetConversationId]: (prev[targetConversationId] || []).map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: responseContent || 'Response received' }
              : msg
          )
        }));
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
    // Since we're not using streaming anymore, this can be simplified
    setIsLoading(false);
    setStreamingMessage('');
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header */}
      <ChatHeader 
        settings={settings} 
        onSettingsChange={handleSettingsChange}
        currentModel={currentModel}
        onModelChange={onModelChange}
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