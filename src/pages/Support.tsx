import { useState, useRef, useEffect } from 'react';
import { Send, HeadphonesIcon, MessageCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';

const POLL_INTERVAL_MS = 4000;

export function Support() {
  const supportSettings = useStore((s) => s.supportSettings);
  const fetchSupportSettings = useStore((s) => s.fetchSupportSettings);
  const messages = useStore((s) => s.supportMessages);
  const fetchSupportMessages = useStore((s) => s.fetchSupportMessages);
  const sendSupportMessage = useStore((s) => s.sendSupportMessage);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSupportSettings();
    fetchSupportMessages();
    const interval = setInterval(fetchSupportMessages, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    await sendSupportMessage(text);
    setSending(false);
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
          {messages.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-500">
              Send a message below to start a conversation with our support team.
            </p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === 'CUSTOMER' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.sender === 'CUSTOMER' ? 'bg-brand-500 text-white' : 'bg-pink-50 text-ink-800'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))
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
          <button type="submit" className="btn-brand !px-4" disabled={!input.trim() || sending}>
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
