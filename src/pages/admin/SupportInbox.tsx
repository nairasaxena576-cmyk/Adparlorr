import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Search, Send, User as UserIcon, Check, CheckCheck } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/components/Toast';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { SupportMessageDto } from '@/types';

const CONVERSATIONS_POLL_MS = 5000;
const MESSAGES_POLL_MS = 3000;

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminSupportInbox() {
  const authStatus = useStore((s) => s.authStatus);
  const currentUser = useStore((s) => s.currentUser);
  const login = useStore((s) => s.login);
  const logout = useStore((s) => s.logout);
  const showToast = useToast();

  const isAdmin = currentUser?.role === 'ADMIN';
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    const result = await login(email, pass);
    if (!result.ok) {
      setLoggingIn(false);
      setLoginError(result.error || 'Invalid credentials.');
      return;
    }
    if (useStore.getState().currentUser?.role !== 'ADMIN') {
      await logout();
      setLoggingIn(false);
      setLoginError('Invalid credentials.');
      return;
    }
    setLoggingIn(false);
    showToast('Admin login successful.', 'success');
  };

  if (authStatus === 'idle' || authStatus === 'loading') return <LoadingScreen />;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#0b1330]">
        <div className="mx-auto flex max-w-md flex-col items-center px-5 py-16 sm:px-8">
          <div className="w-full rounded-2xl border border-white/10 bg-[#0e1a3d] p-8">
            <h2 className="text-center text-2xl font-bold text-white">Admin Panel</h2>
            <p className="mt-1 text-center text-sm text-slate-400">Authorized personnel only.</p>
            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0b1330] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Password</label>
                <input
                  type="password"
                  required
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0b1330] px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>
              {loginError && <p className="rounded-lg bg-red-500/15 px-4 py-2.5 text-sm text-red-300">{loginError}</p>}
              <button
                type="submit"
                disabled={loggingIn}
                className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {loggingIn ? 'Logging In…' : 'Log In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return <InboxView />;
}

function InboxView() {
  const conversations = useStore((s) => s.adminSupportConversations);
  const fetchAdminSupportConversations = useStore((s) => s.fetchAdminSupportConversations);
  const messages = useStore((s) => s.adminSupportMessages);
  const fetchAdminSupportConversationMessages = useStore((s) => s.fetchAdminSupportConversationMessages);
  const sendAdminSupportReply = useStore((s) => s.sendAdminSupportReply);
  const showToast = useToast();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAdminSupportConversations();
    const interval = setInterval(fetchAdminSupportConversations, CONVERSATIONS_POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    fetchAdminSupportConversationMessages(selectedUserId);
    const interval = setInterval(() => fetchAdminSupportConversationMessages(selectedUserId), MESSAGES_POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) => c.fullName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const selected = conversations.find((c) => c.userId === selectedUserId) ?? null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);
    const result = await sendAdminSupportReply(selectedUserId, text);
    setSending(false);
    if (!result.ok) {
      showToast(result.error || 'Failed to send reply.', 'error');
      return;
    }
    fetchAdminSupportConversations();
  };

  return (
    <div className="flex h-screen bg-[#0b1330] text-white">
      {/* Sidebar */}
      <aside className="flex w-full max-w-xs shrink-0 flex-col border-r border-white/10 bg-[#0e1a3d]">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
          <Link to="/admin" className="grid h-8 w-8 place-items-center rounded-lg text-slate-300 hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-bold text-white">Customer Support</h1>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-2 rounded-lg bg-[#0b1330] px-3 py-2">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No conversations yet.</p>
          ) : (
            filtered.map((c) => {
              const isSelected = c.userId === selectedUserId;
              return (
                <button
                  key={c.userId}
                  onClick={() => setSelectedUserId(c.userId)}
                  className={`flex w-full items-start gap-3 border-l-4 px-4 py-3 text-left transition ${
                    isSelected ? 'border-blue-500 bg-blue-900/30' : 'border-transparent hover:bg-white/5'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-600/30 text-blue-300">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {c.unreadCount > 9 ? '9+' : c.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{c.fullName}</p>
                    <p className="truncate text-xs text-slate-400">ID: {c.userId.slice(0, 8)}</p>
                    <span className="mt-1 inline-block max-w-full truncate rounded bg-amber-400 px-2 py-0.5 text-xs font-medium text-slate-900">
                      {c.lastMessage.text}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Conversation panel */}
      <section className="flex flex-1 flex-col">
        {!selected ? (
          <div className="grid flex-1 place-items-center text-slate-500">
            Select a customer to view the conversation.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <p className="text-lg font-bold text-white">{selected.fullName}</p>
                <p className="text-xs text-slate-400">ID : {selected.userId.slice(0, 8)}</p>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>

            <form onSubmit={handleSend} className="flex items-center gap-3 border-t border-white/10 px-6 py-4">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-full bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function MessageBubble({ message }: { message: SupportMessageDto }) {
  const isCustomer = message.sender === 'CUSTOMER';
  return (
    <div className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
      <div className="max-w-[70%]">
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm ${
            isCustomer ? 'bg-white/10 text-white' : 'bg-blue-600 text-white'
          }`}
        >
          {message.text}
        </div>
        <div className={`mt-1 flex items-center gap-1 text-[11px] text-slate-500 ${isCustomer ? '' : 'justify-end'}`}>
          <span>{formatTimestamp(message.createdAt)}</span>
          {!isCustomer && (message.readByCustomer ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />)}
        </div>
      </div>
    </div>
  );
}
