import type { Prisma, PrismaClient, SupportSender } from '@prisma/client';
import { prisma } from '../lib/prisma';

type Client = PrismaClient | Prisma.TransactionClient;

export function createSupportMessage(
  data: { userId: string; sender: SupportSender; text: string; isWaitingNotice?: boolean },
  client: Client = prisma
) {
  return client.supportMessage.create({ data });
}

export function listMessagesForUser(userId: string, client: Client = prisma) {
  return client.supportMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
}

export function hasAdminMessageForUser(userId: string, client: Client = prisma) {
  return client.supportMessage
    .count({ where: { userId, sender: 'ADMIN' } })
    .then((count) => count > 0);
}

export function hasWaitingNoticeForUser(userId: string, client: Client = prisma) {
  return client.supportMessage
    .count({ where: { userId, isWaitingNotice: true } })
    .then((count) => count > 0);
}

// Called when the CUSTOMER views their own thread — marks every
// admin/bot message they haven't seen yet as read.
export function markReadByCustomer(userId: string, client: Client = prisma) {
  return client.supportMessage.updateMany({
    where: { userId, sender: { in: ['ADMIN', 'BOT'] }, readByCustomer: false },
    data: { readByCustomer: true },
  });
}

// Called when an ADMIN opens a customer's thread — marks every customer
// message not yet seen by an admin as read (drives the inbox unread badge).
export function markReadByAdmin(userId: string, client: Client = prisma) {
  return client.supportMessage.updateMany({
    where: { userId, sender: 'CUSTOMER', readByAdmin: false },
    data: { readByAdmin: true },
  });
}

export function countUnreadByAdmin(userId: string, client: Client = prisma) {
  return client.supportMessage.count({ where: { userId, sender: 'CUSTOMER', readByAdmin: false } });
}

// One row per customer who has ever sent/received a support message — the
// most recent message for each (Prisma's distinct+orderBy returns exactly
// the first row per distinct userId when ordered the same way), so this
// doubles as both "who has a conversation" and "their last message
// preview," sorted by most recently active first.
export function listLatestMessagePerConversation(client: Client = prisma) {
  return client.supportMessage.findMany({
    distinct: ['userId'],
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });
}
