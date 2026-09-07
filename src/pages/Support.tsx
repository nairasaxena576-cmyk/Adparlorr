import { useState, useRef, useEffect } from 'react';
import { Send, HeadphonesIcon, MessageCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { ChatMessage } from '@/types';

const FAKE_ADDRESS = 'TX9z8mK2nLp4qR7vB3cF6dH1jW5yG0sA8b';

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function getBotResponse(text: string, userBalance: number): string {
  const lower = text.toLowerCase();

  if (lower.includes('merged') || lower.includes('merge') || lower.includes('product issue')) {
    const needed = Math.max(50, (100 - userBalance).toFixed(0) === '0' ? 50 : 100 - Math.floor(userBalance));
    return `Please deposit $${needed} to clear the merged product and continue working. Here is the deposit address: ${FAKE_ADDRESS}`;
  }
  if (lower.includes("can't withdraw") || lower.includes('cannot withdraw') || lower.includes('withdraw')) {
    return `You need at least $100 balance to withdraw. Your current balance is $${userBalance.toFixed(2)}. Please deposit more to reach the minimum.`;
  }
  if (lower.includes('deposit') || lower.includes('how') || lower.includes('pay')) {
    return `You can deposit using USDT or BTC. Send your payment to: ${FAKE_ADDRESS}. Once confirmed, your balance will be updated automatically.`;
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return `Hello! Welcome to Adparlor Support. How can I help you today? If you have a merged product issue, please let me know.`;
  }
  if (lower.includes('tier') || lower.includes('upgrade')) {
    return `To upgrade your tier, you need to complete more orders and increase your total deposits. Keep working and depositing to reach Silver!`;
  }
  if (lower.includes('balance') || lower.includes('money') || lower.includes('account')) {
    return `Your current balance is $${userBalance.toFixed(2)}. If you need to continue working, please make a deposit to unlock your tasks.`;
  }
  return `I understand your concern. To resolve this issue, please make a deposit of $50 or more. Once your payment is confirmed, your account will be fully restored. Deposit address: ${FAKE_ADDRESS}`;
}

export function Support() {
  const user = useStore((s) => s.getCurrentUser())!;
  const supportSettings = useStore((s) => s.supportSettings);
  const fetchSupportSettings = useStore((s) => s.fetchSupportSettings);

  useEffect(() => {
    fetchSupportSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: genId(),
      sender: 'bot',
      text: 'Hello! Welcome to Adparlor Support. How can I help you today?',
      createdAt: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const userMsg: ChatMessage = { id: genId(), sender: 'user', text, createdAt: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    const response = getBotResponse(text, user.balance);
    const delay = 1200 + Math.random() * 800;

    setTimeout(() => {
      const botMsg: ChatMessage = { id: genId(), sender: 'bot', text: response, createdAt: Date.now() };
      setMessages((prev) => [...prev, botMsg]);
      setTyping(false);
    }, delay);
  };

  const quickPrompts = ['I have a merged product issue', "I can't withdraw", 'How do I deposit?'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-900">Support</h1>
        <p className="mt-1 text-sm text-ink-500">Chat with our support team. We're here to help.</p>
      </div>

      <div className="card-c flex h-[calc(100vh-16rem)] min-h-[400px] flex-col !p-0">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-pink-100 px-5 py-4">
          <div className="relative">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-500/20">
              <HeadphonesIcon className="h-5 w-5 text-brand-500" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-ink-900">Adparlor Support</p>
            <p className="text-xs text-green-600">Online now</p>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.sender === 'user'
                  ? 'bg-brand-500 text-white'
                  : 'bg-pink-50 text-ink-800'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-2xl bg-pink-50 px-4 py-3">
                <span className="h-2 w-2 rounded-full bg-ink-400 animate-blink" style={{ animationDelay: '0s' }} />
                <span className="h-2 w-2 rounded-full bg-ink-400 animate-blink" style={{ animationDelay: '0.2s' }} />
                <span className="h-2 w-2 rounded-full bg-ink-400 animate-blink" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          )}
        </div>

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-2 border-t border-pink-100 px-5 py-3">
          {quickPrompts.map((p) => (
            <button
              key={p}
              onClick={() => setInput(p)}
              className="rounded-full border border-pink-200 px-3 py-1.5 text-xs text-ink-600 transition hover:border-brand-500 hover:text-brand-600"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-pink-100 px-5 py-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="input-base-c flex-1"
          />
          <button type="submit" className="btn-brand !px-4" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {supportSettings?.telegramEnabled && supportSettings.telegramUrl && (
        <div className="card-c flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-bold text-ink-900">Prefer Telegram?</h3>
            <p className="mt-1 text-sm text-ink-500">Chat directly with our support team.</p>
          </div>
          <a
            href={supportSettings.telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-brand"
          >
            <MessageCircle className="h-4 w-4" /> Contact us on Telegram
          </a>
        </div>
      )}
    </div>
  );
}
