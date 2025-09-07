import {useTranslations} from 'next-intl';
import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <ChatInterface />
    </main>
  );
}