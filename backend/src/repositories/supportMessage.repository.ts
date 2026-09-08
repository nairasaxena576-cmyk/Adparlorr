import type { Prisma, PrismaClient, SupportSender } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { SupportIdentity } from '../middleware/supportIdentity';

type Client = PrismaClient | Prisma.TransactionClient;

// Builds the exact WHERE clause identifying one conversation — exactly one
// of userId/guestId, decided by the caller's already-resolved identity,
// never mixed. This is the single place that translates a SupportIdentity
// into a Prisma filter, so every query below stays isolated by construction.
function identityWhere(identity: SupportIdentity): Prisma.SupportMessageWhereInput {
  return identity.type === 'user' ? { userId: identity.userId } : { guestId: identity.guestId };
}

export function createSupportMessage(
  data: { identity: SupportIdentity; sender: SupportSender; text: string; isWaitingNotice?: boolean },
  client: Client = prisma
) {
  const { identity, ...rest } = data;
  return client.supportMessage.create({
    data: {
      ...rest,
      userId: identity.type === 'user' ? identity.userId : null,
      guestId: identity.type === 'guest' ? identity.guestId : null,
    },
  });
}

export function listMessagesForIdentity(identity: SupportIdentity, client: Client = prisma) {
  return client.supportMessage.findMany({
    where: identityWhere(identity),
    orderBy: { createdAt: 'asc' },
  });
}

export function hasAdminMessageForIdentity(identity: SupportIdentity, client: Client = prisma) {
  return client.supportMessage
    .count({ where: { ...identityWhere(identity), sender: 'ADMIN' } })
    .then((count) => count > 0);
}

export function hasWaitingNoticeForIdentity(identity: SupportIdentity, client: Client = prisma) {
  return client.supportMessage
    .count({ where: { ...identityWhere(identity), isWaitingNotice: true } })
    .then((count) => count > 0);
}

// Called when the CUSTOMER/guest views their own thread — marks every
// admin/bot message they haven't seen yet as read.
export function markReadByCustomer(identity: SupportIdentity, client: Client = prisma) {
  return client.supportMessage.updateMany({
    where: { ...identityWhere(identity), sender: { in: ['ADMIN', 'BOT'] }, readByCustomer: false },
    data: { readByCustomer: true },
  });
}

// Called when an ADMIN opens a conversation — marks every customer message
// not yet seen by an admin as read (drives the inbox unread badge).
export function markReadByAdmin(identity: SupportIdentity, client: Client = prisma) {
  return client.supportMessage.updateMany({
    where: { ...identityWhere(identity), sender: 'CUSTOMER', readByAdmin: false },
    data: { readByAdmin: true },
  });
}

export function countUnreadByAdmin(identity: SupportIdentity, client: Client = prisma) {
  return client.supportMessage.count({ where: { ...identityWhere(identity), sender: 'CUSTOMER', readByAdmin: false } });
}

// One row per authenticated customer who has ever sent/received a support
// message — the most recent message for each (Prisma's distinct+orderBy
// returns exactly the first row per distinct userId when ordered the same
// way). Guests are listed separately by listLatestGuestMessagePerConversation
// below — userId is null for every guest row, so a single distinct(['userId'])
// query would collapse all of them into one indistinguishable bucket.
export function listLatestMessagePerConversation(client: Client = prisma) {
  return client.supportMessage.findMany({
    where: { userId: { not: null } },
    distinct: ['userId'],
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, fullName: true, email: true, username: true } } },
  });
}

// The guest-side equivalent — one row per distinct guestId, most recent
// message first. No user relation to include; the admin UI renders these
// as "Unknown User" (see supportChat.service.ts).
export function listLatestGuestMessagePerConversation(client: Client = prisma) {
  return client.supportMessage.findMany({
    where: { guestId: { not: null } },
    distinct: ['guestId'],
    orderBy: { createdAt: 'desc' },
  });
}
