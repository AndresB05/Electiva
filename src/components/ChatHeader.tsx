'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface ChatHeaderProps {
  settings: {
    topK: number;
    temperature: number;
  };
  onSettingsChange: (settings: { topK: number; temperature: number }) => void;
  currentModel: string;
  onModelChange: (model: string) => void;
}

export default function ChatHeader({ settings, onSettingsChange, currentModel, onModelChange }: ChatHeaderProps) {
  const t = useTranslations('chat');
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'MiChat';
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const modelOptions = [
    { id: 'gemini', name: 'Gemini' },
    { id: 'openai', name: 'OpenAI (n8n)' },
    { id: 'python', name: 'Python (Local)' }
  ];

  const selectedModel = modelOptions.find(model => model.id === currentModel) || modelOptions[0];

  return (
    <div className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            {appName}
          </h1>
          
          {/* Model Selector Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <span>{selectedModel.name}</span>
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isModelDropdownOpen && (
              <div className="absolute left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="py-1">
                  {modelOptions.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        onModelChange(model.id);
                        setIsModelDropdownOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                        currentModel === model.id ? 'bg-gray-100 font-medium' : ''
                      }`}
                    >
                      {model.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">Conversación</span>
          <button className="p-2 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}