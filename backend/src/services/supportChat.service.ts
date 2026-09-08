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

// The one and only automatic message a customer/guest ever receives,
// created exactly once per conversation on the first customer message —
// see sendCustomerMessage below. There is no keyword-based bot reply
// system anymore: every message after this one just waits for a human
// admin. Exported so tests can assert on it without duplicating the
// literal string.
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

// ---- Customer / guest side ----

export async function getMyMessages(identity: SupportIdentity): Promise<SupportMessageDto[]> {
  const messages = await listMessagesForIdentity(identity);
  await markReadByCustomer(identity);
  return messages.map(toDto);
}

export async function sendCustomerMessage(identity: SupportIdentity, text: string): Promise<SupportMessageDto[]> {
  if (identity.type === 'user') {
    const user = await findUserById(identity.userId);
    if (!user) throw AppError.unauthorized();
  }

  const created: SupportMessage[] = [];
  created.push(await createSupportMessage({ identity, sender: 'CUSTOMER', text }));

  // The one-time "an agent will review this" notice — identified by the
  // isWaitingNotice flag (never by matching message text), so it can never
  // be duplicated. Sent once per conversation, only on the very first
  // customer message, and only until an admin has taken over. There is no
  // keyword-based auto-reply anymore: every message after this one is
  // simply stored and waits for a human admin.
  const adminEngaged = await hasAdminMessageForIdentity(identity);
  if (!adminEngaged) {
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
