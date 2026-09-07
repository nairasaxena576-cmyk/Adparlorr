import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/lib/prisma';
import { app, registerAndLogin, createAdminAndLogin } from './helpers';
import { WAITING_NOTICE_TEXT } from '../src/services/supportChat.service';

type Session = Awaited<ReturnType<typeof registerAndLogin>>;

async function sendCustomerMessage(customer: Session, text: string) {
  return customer.agent
    .post('/api/support/messages')
    .set('X-CSRF-Token', customer.csrfToken)
    .send({ text });
}

async function getCustomerMessages(customer: Session) {
  return customer.agent.get('/api/support/messages');
}

async function sendAdminReply(admin: Awaited<ReturnType<typeof createAdminAndLogin>>, userId: string, text: string) {
  return admin.agent
    .post(`/api/admin/support/conversations/${userId}/messages`)
    .set('X-CSRF-Token', admin.csrfToken)
    .send({ text });
}

async function getAdminConversationMessages(admin: Awaited<ReturnType<typeof createAdminAndLogin>>, userId: string) {
  return admin.agent.get(`/api/admin/support/conversations/${userId}/messages`);
}

async function getAdminConversations(admin: Awaited<ReturnType<typeof createAdminAndLogin>>) {
  return admin.agent.get('/api/admin/support/conversations');
}

describe('support chat — authentication / authorization', () => {
  it('rejects an unauthenticated customer reading messages', async () => {
    const res = await request(app).get('/api/support/messages');
    expect(res.status).toBe(401);
  });

  it('rejects an unauthenticated customer sending a message', async () => {
    const res = await request(app).post('/api/support/messages').send({ text: 'hi' });
    expect(res.status).toBe(401);
  });

  it('rejects an unauthenticated user from admin support routes', async () => {
    const res = await request(app).get('/api/admin/support/conversations');
    expect(res.status).toBe(401);
  });

  it('rejects an authenticated non-admin from admin support routes', async () => {
    const customer = await registerAndLogin();
    const res = await customer.agent.get('/api/admin/support/conversations');
    expect(res.status).toBe(403);
  });

  it('allows an authenticated admin to access admin support routes', async () => {
    const admin = await createAdminAndLogin();
    const res = await getAdminConversations(admin);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.conversations)).toBe(true);
  });
});

describe('support chat — customer message persistence', () => {
  it('lets a customer send a message and persists it as CUSTOMER', async () => {
    const customer = await registerAndLogin();
    const res = await sendCustomerMessage(customer, 'Hello there');
    expect(res.status).toBe(201);

    const customerMsg = res.body.data.messages.find((m: { sender: string }) => m.sender === 'CUSTOMER');
    expect(customerMsg).toBeDefined();
    expect(customerMsg.text).toBe('Hello there');

    const row = await prisma.supportMessage.findUnique({ where: { id: customerMsg.id } });
    expect(row?.sender).toBe('CUSTOMER');
    expect(row?.userId).toBe(customer.body.data.user.id);
  });

  it("GET /api/support/messages returns the customer's own messages in chronological order", async () => {
    const customer = await registerAndLogin();
    await sendCustomerMessage(customer, 'first message');
    await sendCustomerMessage(customer, 'second message');

    const res = await getCustomerMessages(customer);
    expect(res.status).toBe(200);
    const texts = res.body.data.messages.map((m: { text: string }) => m.text);
    // Each send also produces a bot reply (no admin has taken over yet), so
    // just assert the two customer messages appear in the order sent.
    const customerTexts = res.body.data.messages
      .filter((m: { sender: string }) => m.sender === 'CUSTOMER')
      .map((m: { text: string }) => m.text);
    expect(customerTexts).toEqual(['first message', 'second message']);

    const createdAts = res.body.data.messages.map((m: { createdAt: string }) => new Date(m.createdAt).getTime());
    const sorted = [...createdAts].sort((a, b) => a - b);
    expect(createdAts).toEqual(sorted);
    expect(texts.length).toBeGreaterThanOrEqual(2);
  });

  it("one customer cannot see another customer's conversation", async () => {
    const customerA = await registerAndLogin();
    const customerB = await registerAndLogin();
    await sendCustomerMessage(customerA, 'A-only message');
    await sendCustomerMessage(customerB, 'B-only message');

    const resA = await getCustomerMessages(customerA);
    const textsA = resA.body.data.messages.map((m: { text: string }) => m.text);
    expect(textsA).toContain('A-only message');
    expect(textsA).not.toContain('B-only message');

    const resB = await getCustomerMessages(customerB);
    const textsB = resB.body.data.messages.map((m: { text: string }) => m.text);
    expect(textsB).toContain('B-only message');
    expect(textsB).not.toContain('A-only message');
  });
});

describe('support chat — bot behavior', () => {
  it('produces a BOT reply when no admin has taken over the thread', async () => {
    const customer = await registerAndLogin();
    const res = await sendCustomerMessage(customer, 'hello');
    expect(res.status).toBe(201);

    const botMsg = res.body.data.messages.find((m: { sender: string }) => m.sender === 'BOT');
    expect(botMsg).toBeDefined();
    expect(botMsg.text).toContain('Adparlor Support');

    const row = await prisma.supportMessage.findUnique({ where: { id: botMsg.id } });
    expect(row?.sender).toBe('BOT');
    expect(row?.userId).toBe(customer.body.data.user.id);
  });

  it('matches the "deposit" keyword reply from the actual service logic', async () => {
    const customer = await registerAndLogin();
    const res = await sendCustomerMessage(customer, 'How do I deposit funds?');
    const botMsg = res.body.data.messages.find((m: { sender: string }) => m.sender === 'BOT');
    expect(botMsg.text).toContain('USDT or BTC');
  });

  it('matches the "withdraw" keyword reply from the actual service logic', async () => {
    const customer = await registerAndLogin();
    const res = await sendCustomerMessage(customer, "I can't withdraw my funds");
    const botMsg = res.body.data.messages.find((m: { sender: string }) => m.sender === 'BOT');
    expect(botMsg.text).toContain('You need at least $100 balance to withdraw');
  });

  it('matches the "tier" keyword reply from the actual service logic', async () => {
    const customer = await registerAndLogin();
    // Must avoid every keyword checked in an earlier branch of
    // getBotReply's if/else chain (e.g. "how", "deposit", "pay" all match
    // the deposit branch before the tier/upgrade check is ever reached).
    const res = await sendCustomerMessage(customer, 'I want to upgrade my tier level');
    const botMsg = res.body.data.messages.find((m: { sender: string }) => m.sender === 'BOT');
    expect(botMsg.text).toContain('upgrade your tier');
  });

  it('falls back to the generic reply when no keyword matches', async () => {
    const customer = await registerAndLogin();
    const res = await sendCustomerMessage(customer, 'zzz unrelated gibberish zzz');
    const botMsg = res.body.data.messages.find((m: { sender: string }) => m.sender === 'BOT');
    expect(botMsg.text).toContain('I understand your concern');
  });

  it("bot replies belong to the same customer's thread", async () => {
    const customer = await registerAndLogin();
    const sendRes = await sendCustomerMessage(customer, 'hello');
    const botMsg = sendRes.body.data.messages.find((m: { sender: string }) => m.sender === 'BOT');

    const listRes = await getCustomerMessages(customer);
    const found = listRes.body.data.messages.find((m: { id: string }) => m.id === botMsg.id);
    expect(found).toBeDefined();
  });
});

describe('support chat — waiting/status notice', () => {
  it('creates exactly one waiting/status BOT message alongside the normal keyword reply on the first customer message', async () => {
    const customer = await registerAndLogin();
    const res = await sendCustomerMessage(customer, 'How do I deposit?');
    expect(res.status).toBe(201);

    const botMessages = res.body.data.messages.filter((m: { sender: string }) => m.sender === 'BOT');
    expect(botMessages).toHaveLength(2);

    const keywordReply = botMessages.find((m: { text: string }) => m.text !== WAITING_NOTICE_TEXT);
    const waitingNotice = botMessages.find((m: { text: string }) => m.text === WAITING_NOTICE_TEXT);
    expect(keywordReply).toBeDefined();
    expect(keywordReply.text).toContain('USDT or BTC'); // existing keyword behavior still works
    expect(waitingNotice).toBeDefined();

    const row = await prisma.supportMessage.findUnique({ where: { id: waitingNotice.id } });
    expect(row?.sender).toBe('BOT');
    expect(row?.isWaitingNotice).toBe(true);
    expect(row?.userId).toBe(customer.body.data.user.id);
  });

  it('does not create a second waiting/status message on a subsequent customer message', async () => {
    const customer = await registerAndLogin();
    await sendCustomerMessage(customer, 'hello');
    const secondRes = await sendCustomerMessage(customer, 'still there?');
    expect(secondRes.status).toBe(201);

    const waitingInSecondResponse = secondRes.body.data.messages.filter(
      (m: { text: string }) => m.text === WAITING_NOTICE_TEXT
    );
    expect(waitingInSecondResponse).toHaveLength(0);

    const allWaitingRows = await prisma.supportMessage.findMany({
      where: { userId: customer.body.data.user.id, isWaitingNotice: true },
    });
    expect(allWaitingRows).toHaveLength(1);
  });

  it('the waiting/status message persists and appears in GET /api/support/messages after a refresh', async () => {
    const customer = await registerAndLogin();
    await sendCustomerMessage(customer, 'hello');

    const res = await getCustomerMessages(customer);
    const found = res.body.data.messages.find((m: { text: string }) => m.text === WAITING_NOTICE_TEXT);
    expect(found).toBeDefined();
    expect(found.sender).toBe('BOT');
  });

  it('the waiting/status message appears in the admin conversation view', async () => {
    const customer = await registerAndLogin();
    await sendCustomerMessage(customer, 'hello');
    const admin = await createAdminAndLogin();

    const res = await getAdminConversationMessages(admin, customer.body.data.user.id);
    const found = res.body.data.messages.find((m: { text: string }) => m.text === WAITING_NOTICE_TEXT);
    expect(found).toBeDefined();
  });

  it('admin takeover prevents any future waiting/status message for that customer', async () => {
    const customer = await registerAndLogin();
    await sendCustomerMessage(customer, 'hello'); // creates the one waiting notice
    const admin = await createAdminAndLogin();
    await sendAdminReply(admin, customer.body.data.user.id, 'human here now');

    const afterTakeover = await sendCustomerMessage(customer, 'still need help');
    const waitingAfterTakeover = afterTakeover.body.data.messages.filter(
      (m: { text: string }) => m.text === WAITING_NOTICE_TEXT
    );
    expect(waitingAfterTakeover).toHaveLength(0);

    const allWaitingRows = await prisma.supportMessage.findMany({
      where: { userId: customer.body.data.user.id, isWaitingNotice: true },
    });
    expect(allWaitingRows).toHaveLength(1); // the original notice, never duplicated
  });

  it('the waiting/status notice is isolated per customer — takeover for A does not affect B', async () => {
    const customerA = await registerAndLogin();
    const customerB = await registerAndLogin();
    const admin = await createAdminAndLogin();

    await sendCustomerMessage(customerA, 'hello from A');
    await sendAdminReply(admin, customerA.body.data.user.id, 'admin for A');

    const bRes = await sendCustomerMessage(customerB, 'hello from B');
    const bWaitingNotice = bRes.body.data.messages.find((m: { text: string }) => m.text === WAITING_NOTICE_TEXT);
    expect(bWaitingNotice).toBeDefined();

    const aWaitingRows = await prisma.supportMessage.findMany({
      where: { userId: customerA.body.data.user.id, isWaitingNotice: true },
    });
    const bWaitingRows = await prisma.supportMessage.findMany({
      where: { userId: customerB.body.data.user.id, isWaitingNotice: true },
    });
    expect(aWaitingRows).toHaveLength(1);
    expect(bWaitingRows).toHaveLength(1);
  });
});

describe('support chat — admin takeover', () => {
  it('lets admin list support conversations', async () => {
    const customer = await registerAndLogin();
    await sendCustomerMessage(customer, 'need help');
    const admin = await createAdminAndLogin();

    const res = await getAdminConversations(admin);
    expect(res.status).toBe(200);
    const conv = res.body.data.conversations.find((c: { userId: string }) => c.userId === customer.body.data.user.id);
    expect(conv).toBeDefined();
  });

  it("lets admin open a customer's conversation", async () => {
    const customer = await registerAndLogin();
    await sendCustomerMessage(customer, 'need help');
    const admin = await createAdminAndLogin();

    const res = await getAdminConversationMessages(admin, customer.body.data.user.id);
    expect(res.status).toBe(200);
    expect(res.body.data.messages.length).toBeGreaterThanOrEqual(2); // customer msg + bot reply
  });

  it('lets admin send a message and persists it as ADMIN', async () => {
    const customer = await registerAndLogin();
    await sendCustomerMessage(customer, 'need help');
    const admin = await createAdminAndLogin();

    const res = await sendAdminReply(admin, customer.body.data.user.id, 'A human is here to help.');
    expect(res.status).toBe(201);
    expect(res.body.data.message.sender).toBe('ADMIN');
    expect(res.body.data.message.text).toBe('A human is here to help.');

    const row = await prisma.supportMessage.findUnique({ where: { id: res.body.data.message.id } });
    expect(row?.sender).toBe('ADMIN');
    expect(row?.userId).toBe(customer.body.data.user.id);
  });

  it('stops auto-bot-replies for a thread once an ADMIN message exists, while preserving prior BOT history', async () => {
    const customer = await registerAndLogin();
    const firstSend = await sendCustomerMessage(customer, 'hello');
    const priorBotMsg = firstSend.body.data.messages.find((m: { sender: string }) => m.sender === 'BOT');
    expect(priorBotMsg).toBeDefined();

    const admin = await createAdminAndLogin();
    await sendAdminReply(admin, customer.body.data.user.id, 'Taking over now.');

    const afterTakeover = await sendCustomerMessage(customer, 'are you still there?');
    expect(afterTakeover.status).toBe(201);
    const newBotMsg = afterTakeover.body.data.messages.find((m: { sender: string }) => m.sender === 'BOT');
    expect(newBotMsg).toBeUndefined();
    expect(afterTakeover.body.data.messages).toHaveLength(1);
    expect(afterTakeover.body.data.messages[0].sender).toBe('CUSTOMER');

    // Prior bot history remains intact in the DB.
    const stillThere = await prisma.supportMessage.findUnique({ where: { id: priorBotMsg.id } });
    expect(stillThere).not.toBeNull();
    expect(stillThere?.sender).toBe('BOT');
  });

  it("another customer's thread still receives BOT replies after a different customer's admin takeover", async () => {
    const customerA = await registerAndLogin();
    const customerB = await registerAndLogin();
    const admin = await createAdminAndLogin();

    await sendCustomerMessage(customerA, 'hello from A');
    await sendAdminReply(admin, customerA.body.data.user.id, 'Admin here for A.');

    const bRes = await sendCustomerMessage(customerB, 'hello from B');
    const bBotMsg = bRes.body.data.messages.find((m: { sender: string }) => m.sender === 'BOT');
    expect(bBotMsg).toBeDefined();
  });
});

describe('support chat — conversation isolation', () => {
  it('keeps two customer conversations fully separate, including in the admin list and per-conversation views', async () => {
    const customerA = await registerAndLogin();
    const customerB = await registerAndLogin();
    await sendCustomerMessage(customerA, 'A message one');
    await sendCustomerMessage(customerB, 'B message one');
    const admin = await createAdminAndLogin();

    const resA = await getCustomerMessages(customerA);
    expect(resA.body.data.messages.every((m: { text: string }) => !m.text.includes('B message'))).toBe(true);

    const resB = await getCustomerMessages(customerB);
    expect(resB.body.data.messages.every((m: { text: string }) => !m.text.includes('A message'))).toBe(true);

    const conversations = await getAdminConversations(admin);
    const userIds = conversations.body.data.conversations.map((c: { userId: string }) => c.userId);
    expect(userIds).toContain(customerA.body.data.user.id);
    expect(userIds).toContain(customerB.body.data.user.id);
    expect(new Set(userIds).size).toBe(userIds.length); // no duplicate/merged conversations

    const adminViewA = await getAdminConversationMessages(admin, customerA.body.data.user.id);
    expect(adminViewA.body.data.messages.every((m: { text: string }) => !m.text.includes('B message'))).toBe(true);

    const adminViewB = await getAdminConversationMessages(admin, customerB.body.data.user.id);
    expect(adminViewB.body.data.messages.every((m: { text: string }) => !m.text.includes('A message'))).toBe(true);
  });
});

describe('support chat — read receipts', () => {
  it('a freshly created message starts with both read flags false', async () => {
    const customer = await registerAndLogin();
    const res = await sendCustomerMessage(customer, 'hello');
    const customerMsg = res.body.data.messages.find((m: { sender: string }) => m.sender === 'CUSTOMER');
    expect(customerMsg.readByAdmin).toBe(false);
    expect(customerMsg.readByCustomer).toBe(false);
  });

  it("admin opening a conversation marks the customer's messages readByAdmin on the NEXT fetch", async () => {
    const customer = await registerAndLogin();
    const sendRes = await sendCustomerMessage(customer, 'hello');
    const customerMsg = sendRes.body.data.messages.find((m: { sender: string }) => m.sender === 'CUSTOMER');
    expect(customerMsg.readByAdmin).toBe(false);

    const admin = await createAdminAndLogin();
    // First admin fetch returns the pre-read state, then marks it read as a
    // side effect (see supportChat.service.ts's getConversationForAdmin).
    const firstOpen = await getAdminConversationMessages(admin, customer.body.data.user.id);
    const firstOpenMsg = firstOpen.body.data.messages.find((m: { id: string }) => m.id === customerMsg.id);
    expect(firstOpenMsg.readByAdmin).toBe(false);

    const secondOpen = await getAdminConversationMessages(admin, customer.body.data.user.id);
    const secondOpenMsg = secondOpen.body.data.messages.find((m: { id: string }) => m.id === customerMsg.id);
    expect(secondOpenMsg.readByAdmin).toBe(true);

    const row = await prisma.supportMessage.findUnique({ where: { id: customerMsg.id } });
    expect(row?.readByAdmin).toBe(true);
  });

  it("customer fetching their messages marks admin/bot messages readByCustomer on the NEXT fetch", async () => {
    const customer = await registerAndLogin();
    const sendRes = await sendCustomerMessage(customer, 'hello');
    const botMsg = sendRes.body.data.messages.find((m: { sender: string }) => m.sender === 'BOT');
    expect(botMsg.readByCustomer).toBe(false);

    const firstFetch = await getCustomerMessages(customer);
    const firstFetchMsg = firstFetch.body.data.messages.find((m: { id: string }) => m.id === botMsg.id);
    expect(firstFetchMsg.readByCustomer).toBe(false);

    const secondFetch = await getCustomerMessages(customer);
    const secondFetchMsg = secondFetch.body.data.messages.find((m: { id: string }) => m.id === botMsg.id);
    expect(secondFetchMsg.readByCustomer).toBe(true);
  });

  it('unread count in the admin conversation list reflects actual unread CUSTOMER messages', async () => {
    const customer = await registerAndLogin();
    await sendCustomerMessage(customer, 'first');
    await sendCustomerMessage(customer, 'second');
    const admin = await createAdminAndLogin();

    const before = await getAdminConversations(admin);
    const convBefore = before.body.data.conversations.find(
      (c: { userId: string }) => c.userId === customer.body.data.user.id
    );
    expect(convBefore.unreadCount).toBe(2);

    await getAdminConversationMessages(admin, customer.body.data.user.id); // marks read as a side effect

    const after = await getAdminConversations(admin);
    const convAfter = after.body.data.conversations.find(
      (c: { userId: string }) => c.userId === customer.body.data.user.id
    );
    expect(convAfter.unreadCount).toBe(0);
  });

  it('reading one conversation does not mark another conversation as read', async () => {
    const customerA = await registerAndLogin();
    const customerB = await registerAndLogin();
    await sendCustomerMessage(customerA, 'A message');
    await sendCustomerMessage(customerB, 'B message');
    const admin = await createAdminAndLogin();

    await getAdminConversationMessages(admin, customerA.body.data.user.id);

    const conversations = await getAdminConversations(admin);
    const convA = conversations.body.data.conversations.find(
      (c: { userId: string }) => c.userId === customerA.body.data.user.id
    );
    const convB = conversations.body.data.conversations.find(
      (c: { userId: string }) => c.userId === customerB.body.data.user.id
    );
    expect(convA.unreadCount).toBe(0);
    expect(convB.unreadCount).toBe(1);
  });
});

describe('support chat — admin conversation metadata', () => {
  it('returns the correct customer identity, latest message preview, and unread count', async () => {
    const customer = await registerAndLogin();
    await sendCustomerMessage(customer, 'first message');
    await sendCustomerMessage(customer, 'latest message');
    const admin = await createAdminAndLogin();

    const res = await getAdminConversations(admin);
    const conv = res.body.data.conversations.find((c: { userId: string }) => c.userId === customer.body.data.user.id);
    expect(conv.fullName).toBe(customer.body.data.user.fullName);
    expect(conv.email).toBe(customer.body.data.user.email);
    // The latest message overall for this thread is the bot's auto-reply to
    // "latest message" (sent after the customer's own text), per
    // listLatestMessagePerConversation's ordering by createdAt desc.
    expect(conv.lastMessage.sender).toBe('BOT');
    expect(typeof conv.lastMessage.text).toBe('string');
    expect(conv.unreadCount).toBe(2);
  });

  it('orders conversations by most recently active first', async () => {
    const customerA = await registerAndLogin();
    const customerB = await registerAndLogin();
    await sendCustomerMessage(customerA, 'older conversation');
    await sendCustomerMessage(customerB, 'newer conversation');
    const admin = await createAdminAndLogin();

    const res = await getAdminConversations(admin);
    const ids = res.body.data.conversations.map((c: { userId: string }) => c.userId);
    const indexA = ids.indexOf(customerA.body.data.user.id);
    const indexB = ids.indexOf(customerB.body.data.user.id);
    expect(indexB).toBeLessThan(indexA);
  });
});

describe('support chat — anti-spoofing', () => {
  it('ignores a client-supplied userId and always uses the authenticated session user', async () => {
    const victim = await registerAndLogin();
    const attacker = await registerAndLogin();

    const res = await attacker.agent
      .post('/api/support/messages')
      .set('X-CSRF-Token', attacker.csrfToken)
      .send({ text: 'spoof attempt', userId: victim.body.data.user.id });
    expect(res.status).toBe(201);

    const victimMessages = await prisma.supportMessage.findMany({ where: { userId: victim.body.data.user.id } });
    expect(victimMessages).toHaveLength(0);

    const attackerMessages = await prisma.supportMessage.findMany({ where: { userId: attacker.body.data.user.id } });
    expect(attackerMessages.some((m) => m.text === 'spoof attempt')).toBe(true);
  });

  it('gives a non-admin no route to read another customer\'s thread', async () => {
    const customer = await registerAndLogin();
    const other = await registerAndLogin();
    await sendCustomerMessage(customer, 'private message');

    // The customer-facing endpoint has no parameter to target another
    // user's thread — it is always scoped to the caller's own session.
    const res = await getCustomerMessages(other);
    const texts = res.body.data.messages.map((m: { text: string }) => m.text);
    expect(texts).not.toContain('private message');
  });

  it('rejects a non-admin from using the admin conversation-reply route', async () => {
    const customer = await registerAndLogin();
    const other = await registerAndLogin();
    await sendCustomerMessage(customer, 'hello');

    const res = await other.agent
      .post(`/api/admin/support/conversations/${customer.body.data.user.id}/messages`)
      .set('X-CSRF-Token', other.csrfToken)
      .send({ text: 'unauthorized reply' });
    expect(res.status).toBe(403);
  });
});

describe('support chat — bot handoff edge cases', () => {
  it('bot responds before takeover, goes silent after ONE admin message, and stays silent across multiple further customer messages', async () => {
    const customer = await registerAndLogin();
    const admin = await createAdminAndLogin();

    const before1 = await sendCustomerMessage(customer, 'msg 1');
    expect(before1.body.data.messages.some((m: { sender: string }) => m.sender === 'BOT')).toBe(true);

    await sendAdminReply(admin, customer.body.data.user.id, 'human here');

    const after1 = await sendCustomerMessage(customer, 'msg 2');
    expect(after1.body.data.messages).toHaveLength(1);
    expect(after1.body.data.messages[0].sender).toBe('CUSTOMER');

    const after2 = await sendCustomerMessage(customer, 'msg 3');
    expect(after2.body.data.messages).toHaveLength(1);
    expect(after2.body.data.messages[0].sender).toBe('CUSTOMER');

    const after3 = await sendCustomerMessage(customer, 'msg 4');
    expect(after3.body.data.messages).toHaveLength(1);
    expect(after3.body.data.messages[0].sender).toBe('CUSTOMER');
  });

  it('a different, untouched customer is unaffected by another thread\'s admin takeover', async () => {
    const takenOver = await registerAndLogin();
    const untouched = await registerAndLogin();
    const admin = await createAdminAndLogin();

    await sendCustomerMessage(takenOver, 'hello');
    await sendAdminReply(admin, takenOver.body.data.user.id, 'taking over');

    const res = await sendCustomerMessage(untouched, 'hello from untouched');
    expect(res.body.data.messages.some((m: { sender: string }) => m.sender === 'BOT')).toBe(true);
  });
});

describe('support chat — error/validation behavior', () => {
  it('rejects an empty message', async () => {
    const customer = await registerAndLogin();
    const res = await sendCustomerMessage(customer, '');
    expect(res.status).toBe(400);
  });

  it('rejects a message body missing the required text field', async () => {
    const customer = await registerAndLogin();
    const res = await customer.agent
      .post('/api/support/messages')
      .set('X-CSRF-Token', customer.csrfToken)
      .send({});
    expect(res.status).toBe(400);
  });

  it('rejects a malformed (non-uuid) userId on the admin conversation routes', async () => {
    const admin = await createAdminAndLogin();
    const res = await getAdminConversationMessages(admin, 'not-a-real-uuid');
    expect(res.status).toBe(400);
  });

  it('rejects an admin reply with an empty message', async () => {
    const customer = await registerAndLogin();
    const admin = await createAdminAndLogin();
    const res = await sendAdminReply(admin, customer.body.data.user.id, '');
    expect(res.status).toBe(400);
  });
});
