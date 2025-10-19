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

  const handleNewConversation = () => {
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <ConversationSidebar 
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
      />
      
      {/* Main Chat Area */}
      <ChatArea 
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewConversation={handleNewConversation}
        onUpdateConversationTitle={updateConversationTitle}
        conversationMessages={conversationMessages}
        setConversationMessages={setConversationMessages}
      />
    </div>
  );
}