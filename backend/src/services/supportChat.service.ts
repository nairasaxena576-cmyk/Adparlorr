import type { SupportMessage } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { findUserById } from '../repositories/user.repository';
import type { SupportIdentity } from '../middleware/supportIdentity';
import {
  createSupportMessage,
  listMessagesForIdentity,
  hasAdminMessageForIdentity,
  hasWaitingNoticeForIdentity,
  markReadByCustomer,
  markReadByAdmin,
  countUnreadByAdmin,
  listLatestMessagePerConversation,
  listLatestGuestMessagePerConversation,
} from '../repositories/supportMessage.repository';

const FAKE_ADDRESS = 'TX9z8mK2nLp4qR7vB3cF6dH1jW5yG0sA8b';

// Sent once per thread, right after the first bot reply, as long as no
// admin has taken over yet — see sendCustomerMessage below. Exported so
// tests can assert on it without duplicating the literal string.
export const WAITING_NOTICE_TEXT =
  'Thanks for contacting Adparlorr Support. Please wait a moment while a support agent reviews your request and gets back to you.';

export interface SupportMessageDto {
  id: string;
  sender: 'CUSTOMER' | 'BOT' | 'ADMIN';
  text: string;
  createdAt: string;
  readByAdmin: boolean;
  readByCustomer: boolean;
}

function toDto(message: SupportMessage): SupportMessageDto {
  return {
    id: message.id,
    sender: message.sender,
    text: message.text,
    createdAt: message.createdAt.toISOString(),
    readByAdmin: message.readByAdmin,
    readByCustomer: message.readByCustomer,
  };
}

// The admin-facing conversation id is always one of these two exact forms —
// never a bare uuid/token — so a route param unambiguously says which kind
// of identity it names without any guessing/format-sniffing. Parsing rejects
// anything else, which is what makes the admin routes' Zod schema safe.
export function toConversationId(identity: SupportIdentity): string {
  return identity.type === 'user' ? `user:${identity.userId}` : `guest:${identity.guestId}`;
}

export function parseConversationId(conversationId: string): SupportIdentity {
  if (conversationId.startsWith('user:')) {
    return { type: 'user', userId: conversationId.slice('user:'.length) };
  }
  if (conversationId.startsWith('guest:')) {
    return { type: 'guest', guestId: conversationId.slice('guest:'.length) };
  }
  throw AppError.badRequest('Invalid conversation id.');
}

// The automatic first-responder — ported from the previous client-side-only
// bot (src/pages/Support.tsx). Only ever used before an admin has replied
// in a given thread (see sendCustomerMessage below); once a human takes
// over, this is never consulted again for that conversation.
function getBotReply(text: string, userBalance: number): string {
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
    return `Hello! Welcome to Adparlorr Support. How can I help you today? If you have a merged product issue, please let me know.`;
  }
  if (lower.includes('tier') || lower.includes('upgrade')) {
    return `To upgrade your tier, you need to complete more orders and increase your total deposits. Keep working and depositing to reach Silver!`;
  }
  if (lower.includes('balance') || lower.includes('money') || lower.includes('account')) {
    return `Your current balance is $${userBalance.toFixed(2)}. If you need to continue working, please make a deposit to unlock your tasks.`;
  }
  return `I understand your concern. To resolve this issue, please make a deposit of $50 or more. Once your payment is confirmed, your account will be fully restored. Deposit address: ${FAKE_ADDRESS}`;
}

// ---- Customer / guest side ----

export async function getMyMessages(identity: SupportIdentity): Promise<SupportMessageDto[]> {
  const messages = await listMessagesForIdentity(identity);
  await markReadByCustomer(identity);
  return messages.map(toDto);
}

export async function sendCustomerMessage(identity: SupportIdentity, text: string): Promise<SupportMessageDto[]> {
  // A guest has no real balance — the bot's balance-mentioning replies use
  // $0.00 for them, which is simply true (no account, no deposits).
  let userBalance = 0;
  if (identity.type === 'user') {
    const user = await findUserById(identity.userId);
    if (!user) throw AppError.unauthorized();
    userBalance = Number(user.balance);
  }

  const created: SupportMessage[] = [];
  created.push(await createSupportMessage({ identity, sender: 'CUSTOMER', text }));

  // Bot auto-replies only until a human admin has engaged with this
  // conversation — after that, the customer/guest just waits for the admin.
  const adminEngaged = await hasAdminMessageForIdentity(identity);
  if (!adminEngaged) {
    const reply = getBotReply(text, userBalance);
    created.push(await createSupportMessage({ identity, sender: 'BOT', text: reply }));

    // The one-time "an agent will review this" notice — identified by the
    // isWaitingNotice flag (never by matching message text), so it can
    // never be duplicated and is unaffected by which keyword reply fired.
    const alreadyNotified = await hasWaitingNoticeForIdentity(identity);
    if (!alreadyNotified) {
      created.push(
        await createSupportMessage({ identity, sender: 'BOT', text: WAITING_NOTICE_TEXT, isWaitingNotice: true })
      );
    }
  }

  return created.map(toDto);
}

// ---- Admin side ----

export interface AdminSupportConversationDto {
  conversationId: string;
  isGuest: boolean;
  // Only ever populated for an authenticated customer — a guest has no
  // account, so these stay undefined rather than being filled with any
  // invented placeholder.
  username?: string;
  fullName?: string;
  email?: string;
  lastMessage: { text: string; sender: 'CUSTOMER' | 'BOT' | 'ADMIN'; createdAt: string };
  unreadCount: number;
}

export async function listConversationsForAdmin(): Promise<AdminSupportConversationDto[]> {
  const [userMessages, guestMessages] = await Promise.all([
    listLatestMessagePerConversation(),
    listLatestGuestMessagePerConversation(),
  ]);

  const rows: AdminSupportConversationDto[] = [];

  for (const message of userMessages) {
    const identity: SupportIdentity = { type: 'user', userId: message.user!.id };
    rows.push({
      conversationId: toConversationId(identity),
      isGuest: false,
      username: message.user!.username,
      fullName: message.user!.fullName,
      email: message.user!.email,
      lastMessage: { text: message.text, sender: message.sender, createdAt: message.createdAt.toISOString() },
      unreadCount: await countUnreadByAdmin(identity),
    });
  }

  for (const message of guestMessages) {
    const identity: SupportIdentity = { type: 'guest', guestId: message.guestId! };
    rows.push({
      conversationId: toConversationId(identity),
      isGuest: true,
      lastMessage: { text: message.text, sender: message.sender, createdAt: message.createdAt.toISOString() },
      unreadCount: await countUnreadByAdmin(identity),
    });
  }

  rows.sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());
  return rows;
}

export async function getConversationForAdmin(conversationId: string): Promise<SupportMessageDto[]> {
  const identity = parseConversationId(conversationId);
  const messages = await listMessagesForIdentity(identity);
  await markReadByAdmin(identity);
  return messages.map(toDto);
}

export async function sendAdminReply(conversationId: string, text: string): Promise<SupportMessageDto> {
  const identity = parseConversationId(conversationId);
  if (identity.type === 'user') {
    const user = await findUserById(identity.userId);
    if (!user) throw AppError.notFound('User not found.');
  }

  const message = await createSupportMessage({ identity, sender: 'ADMIN', text });
  return toDto(message);
}
