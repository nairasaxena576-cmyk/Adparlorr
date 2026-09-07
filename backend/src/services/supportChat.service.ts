import type { SupportMessage } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { findUserById } from '../repositories/user.repository';
import {
  createSupportMessage,
  listMessagesForUser,
  hasAdminMessageForUser,
  markReadByCustomer,
  markReadByAdmin,
  countUnreadByAdmin,
  listLatestMessagePerConversation,
} from '../repositories/supportMessage.repository';

const FAKE_ADDRESS = 'TX9z8mK2nLp4qR7vB3cF6dH1jW5yG0sA8b';

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

// The automatic first-responder — ported from the previous client-side-only
// bot (src/pages/Support.tsx). Only ever used before an admin has replied
// in a given thread (see sendCustomerMessage below); once a human takes
// over, this is never consulted again for that customer.
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

// ---- Customer side ----

export async function getMyMessages(userId: string): Promise<SupportMessageDto[]> {
  const messages = await listMessagesForUser(userId);
  await markReadByCustomer(userId);
  return messages.map(toDto);
}

export async function sendCustomerMessage(userId: string, text: string): Promise<SupportMessageDto[]> {
  const user = await findUserById(userId);
  if (!user) throw AppError.unauthorized();

  const created: SupportMessage[] = [];
  created.push(await createSupportMessage({ userId, sender: 'CUSTOMER', text }));

  // Bot auto-replies only until a human admin has engaged with this
  // customer's thread — after that, the customer just waits for the admin.
  const adminEngaged = await hasAdminMessageForUser(userId);
  if (!adminEngaged) {
    const reply = getBotReply(text, Number(user.balance));
    created.push(await createSupportMessage({ userId, sender: 'BOT', text: reply }));
  }

  return created.map(toDto);
}

// ---- Admin side ----

export interface AdminSupportConversationDto {
  userId: string;
  fullName: string;
  email: string;
  lastMessage: { text: string; sender: 'CUSTOMER' | 'BOT' | 'ADMIN'; createdAt: string };
  unreadCount: number;
}

export async function listConversationsForAdmin(): Promise<AdminSupportConversationDto[]> {
  const latest = await listLatestMessagePerConversation();
  const rows: AdminSupportConversationDto[] = [];
  for (const message of latest) {
    const unreadCount = await countUnreadByAdmin(message.userId);
    rows.push({
      userId: message.user.id,
      fullName: message.user.fullName,
      email: message.user.email,
      lastMessage: { text: message.text, sender: message.sender, createdAt: message.createdAt.toISOString() },
      unreadCount,
    });
  }
  return rows;
}

export async function getConversationForAdmin(userId: string): Promise<SupportMessageDto[]> {
  const messages = await listMessagesForUser(userId);
  await markReadByAdmin(userId);
  return messages.map(toDto);
}

export async function sendAdminReply(userId: string, text: string): Promise<SupportMessageDto> {
  const user = await findUserById(userId);
  if (!user) throw AppError.notFound('User not found.');

  const message = await createSupportMessage({ userId, sender: 'ADMIN', text });
  return toDto(message);
}
