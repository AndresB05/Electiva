'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewConversation: () => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onFileUpload?: (file: File) => Promise<void>; // Add file upload handler
}

export default function ConversationSidebar({
  conversations,
  activeConversationId, 
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onFileUpload
}: ConversationSidebarProps) {
  const t = useTranslations('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false); // Add upload state
  const fileInputRef = useRef<HTMLInputElement>(null); // Add ref for file input

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    e.target.value = ''; // Reset input

    try {
      if (onFileUpload) {
        await onFileUpload(file);
      }
    } catch (error) {
      console.error('File upload failed:', error);
      alert(t('common.error') + ': ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteClick = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation(); // Prevent conversation selection when clicking delete
    if (window.confirm(t('sidebar.deleteConfirm'))) {
      onDeleteConversation(conversationId);
    }
  };

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
      {/* New Conversation Button */}
      <div className="p-3">
        <button
          data-testid="new-conversation"
          onClick={onNewConversation}
          className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-600 hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('interface.newConversation')}
        </button>
      </div>

      {/* File Upload Button */}
      <div className="px-3 mb-3">
        <button
          onClick={handleFileUploadClick}
          disabled={isUploading}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-lg border border-gray-600 hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{t('common.loading')}</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Subir archivo</span>
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept="*/*"
        />
      </div>

      {/* Search */}
      <div className="px-3 mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            data-testid="sidebar-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('sidebar.search')}
            className="w-full bg-gray-800 text-white placeholder-gray-400 pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:border-gray-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Conversations Section */}
      <div className="px-3 mb-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          {t('sidebar.conversations')}
        </h3>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-3">
        {filteredConversations.length === 0 ? (
          <p className="text-gray-400 text-sm">{t('sidebar.noConversations')}</p>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`p-3 rounded-lg cursor-pointer group transition-colors ${
                  activeConversationId === conversation.id
                    ? 'bg-gray-700 border border-gray-600'
                    : 'hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {conversation.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {conversation.updatedAt}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleDeleteClick(e, conversation.id)}
                      className="p-1 rounded hover:bg-gray-700 hover:text-red-400"
                      title={t('interface.delete')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}