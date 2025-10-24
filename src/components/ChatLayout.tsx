'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import ConversationSidebar from './ConversationSidebar';
import ChatArea from './ChatArea';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface ChatLayoutProps {
  // Optional prop to receive conversation message deletion callback
  onDeleteConversationMessages?: (conversationId: string) => void;
}

export default function ChatLayout() {
  const t = useTranslations('chat');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversationMessages, setConversationMessages] = useState<Record<string, any[]>>({});
  const [currentModel, setCurrentModel] = useState('gemini');

  const handleNewConversation = (): string => {
    const newId = Date.now().toString();
    const newConversation: Conversation = {
      id: newId,
      title: t('interface.newConversation'),
      updatedAt: new Date().toLocaleDateString('es-ES')
    };
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newId);
    return newId; // Return the new conversation ID
  };

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  const handleDeleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    
    // Clear messages for the deleted conversation
    setConversationMessages(prev => {
      const newMessages = { ...prev };
      delete newMessages[conversationId];
      return newMessages;
    });
    
    // If we're deleting the active conversation, clear the active conversation
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
    }
  };

  const updateConversationTitle = (conversationId: string, newTitle: string) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, title: newTitle, updatedAt: new Date().toLocaleDateString('es-ES') }
          : conv
      )
    );
  };

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Determine the upload URL based on the selected model
      let uploadUrl = 'https://sswebhookss.andresblanco.website/form/945669b3-e73b-43f3-9ba1-e69de817c628';
      if (currentModel === 'openai') {
        uploadUrl = 'https://ssn8nss.andresblanco.website/form-test/9d5d7c81-fdf7-4e81-97cd-c5719371e590';
      }

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed with status ${response.status}: ${errorText || response.statusText}`);
      }

      // Show success message
      alert('Archivo subido correctamente');
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error(`File upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <ConversationSidebar 
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onFileUpload={handleFileUpload}
      />
      
      {/* Main Chat Area */}
      <ChatArea 
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewConversation={handleNewConversation}
        onUpdateConversationTitle={updateConversationTitle}
        conversationMessages={conversationMessages}
        setConversationMessages={setConversationMessages}
        currentModel={currentModel}
        onModelChange={setCurrentModel}
      />
    </div>
  );
}