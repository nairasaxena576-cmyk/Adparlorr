import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { prisma } from '../src/lib/prisma';
import { app, registerAndLogin, createAdminAndLogin, extractCsrfToken } from './helpers';
import { WAITING_NOTICE_TEXT } from '../src/services/supportChat.service';

type Session = Awaited<ReturnType<typeof registerAndLogin>>;
type AdminSession = Awaited<ReturnType<typeof createAdminAndLogin>>;

// The admin-facing conversationId is always "user:<uuid>" or
// "guest:<token>" (see supportChat.service.ts's toConversationId) — this
// mirrors that for authenticated-customer test call sites.
function userConvId(userId: string): string {
  return `user:${userId}`;
}

async function sendCustomerMessage(customer: Session, text: string) {
  return customer.agent
    .post('/api/support/messages')
    .set('X-CSRF-Token', customer.csrfToken)
    .send({ text });
}

async function getCustomerMessages(customer: Session) {
  return customer.agent.get('/api/support/messages');
}

async function sendAdminReply(admin: AdminSession, conversationId: string, text: string) {
  return admin.agent
    .post(`/api/admin/support/conversations/${conversationId}/messages`)
    .set('X-CSRF-Token', admin.csrfToken)
    .send({ text });
}

async function getAdminConversationMessages(admin: AdminSession, conversationId: string) {
  return admin.agent.get(`/api/admin/support/conversations/${conversationId}/messages`);
}

async function getAdminConversations(admin: AdminSession) {
  return admin.agent.get('/api/admin/support/conversations');
}

// A guest never registers/logs in — the returned supertest agent picks up
// whatever guest-identity + CSRF cookies the server sets on first contact
// (see middleware/supportIdentity.ts), exactly the way a real browser would.
async function startGuestAgent() {
  const agent = request.agent(app);
  const first = await agent.get('/api/support/messages');
  expect(first.status).toBe(200);
  const csrfToken = extractCsrfToken(first);
  return { agent, csrfToken };
}

async function sendGuestMessage(guest: Awaited<ReturnType<typeof startGuestAgent>>, text: string) {
  return guest.agent.post('/api/support/messages').set('X-CSRF-Token', guest.csrfToken).send({ text });
}

describe('support chat — authentication / authorization', () => {
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

describe('support chat — authenticated customer', () => {
  it('opens Support Chat normally and can read/send messages', async () => {
    const customer = await registerAndLogin();
    const getRes = await getCustomerMessages(customer);
    expect(getRes.status).toBe(200);

    const sendRes = await sendCustomerMessage(customer, 'Hello there');
    expect(sendRes.status).toBe(201);
    const customerMsg = sendRes.body.data.messages.find((m: { sender: string }) => m.sender === 'CUSTOMER');
    expect(customerMsg.text).toBe('Hello there');

    const row = await prisma.supportMessage.findUnique({ where: { id: customerMsg.id } });
    expect(row?.sender).toBe('CUSTOMER');
    expect(row?.userId).toBe(customer.body.data.user.id);
    expect(row?.guestId).toBeNull();
  });

  it('shows the real username (and full customer information) in the admin inbox', async () => {
    const customer = await registerAndLogin();
    await sendCustomerMessage(customer, 'need help');
    const admin = await createAdminAndLogin();

    const res = await getAdminConversations(admin);
    const conv = res.body.data.conversations.find(
      (c: { conversationId: string }) => c.conversationId === userConvId(customer.body.data.user.id)
    );
    expect(conv).toBeDefined();
    expect(conv.isGuest).toBe(false);
    expect(conv.username).toBe(customer.body.data.user.username);
    expect(conv.fullName).toBe(customer.body.data.user.fullName);
    expect(conv.email).toBe(customer.body.data.user.email);
  });

  it("GET /api/support/messages returns the customer's own messages in chronological order", async () => {
    const customer = await registerAndLogin();
    await sendCustomerMessage(customer, 'first message');
    await sendCustomerMessage(customer, 'second message');

    const res = await getCustomerMessages(customer);
    expect(res.status).toBe(200);
    const customerTexts = res.body.data.messages
      .filter((m: { sender: string }) => m.sender === 'CUSTOMER')
      .map((m: { text: string }) => m.text);
    expect(customerTexts).toEqual(['first message', 'second message']);

    const createdAts = res.body.data.messages.map((m: { createdAt: string }) => new Date(m.createdAt).getTime());
    const sorted = [...createdAts].sort((a, b) => a - b);
    expect(createdAts).toEqual(sorted);
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

describe('support chat — guest (unauthenticated) conversations', () => {
  it('an unauthenticated visitor can open Support Chat without logging in', async () => {
    const res = await request(app).get('/api/support/messages');
    expect(res.status).toBe(200);
    expect(res.body.data.messages).toEqual([]);
  });

  it('an unauthenticated visitor can send a message without an account', async () => {
    const guest = await startGuestAgent();
    const res = await sendGuestMessage(guest, 'I need help as a guest');
    expect(res.status).toBe(201);

    const customerMsg = res.body.data.messages.find((m: { sender: string }) => m.sender === 'CUSTOMER');
    expect(customerMsg.text).toBe('I need help as a guest');

    const row = await prisma.supportMessage.findUnique({ where: { id: customerMsg.id } });
    expect(row?.userId).toBeNull();
    expect(row?.guestId).not.toBeNull();

    // No account/user was ever created for this visitor.
    const userCount = await prisma.user.count();
    expect(userCount).toBe(0);
  });

  it('a guest keyword message (e.g. "deposit") triggers only the waiting notice, never a keyword auto-reply', async () => {
    const guest = await startGuestAgent();
    const res = await sendGuestMessage(guest, 'How do I deposit funds?');
    const botMessages = res.body.data.messages.filter((m: { sender: string }) => m.sender === 'BOT');
    expect(botMessages).toHaveLength(1);
    expect(botMessages[0].text).toBe(WAITING_NOTICE_TEXT);
  });

  it('the waiting/status notice still fires exactly once for a guest thread', async () => {
    const guest = await startGuestAgent();
    const res = await sendGuestMessage(guest, 'hello');
    const waiting = res.body.data.messages.find((m: { text: string }) => m.text === WAITING_NOTICE_TEXT);
    expect(waiting).toBeDefined();

    await sendGuestMessage(guest, 'still there?');
    const allWaitingRows = await prisma.supportMessage.findMany({
      where: { guestId: { not: null }, isWaitingNotice: true },
    });
    expect(allWaitingRows).toHaveLength(1);
  });

  it('admin sees the guest conversation, labeled "Unknown User", with no invented profile data', async () => {
    const guest = await startGuestAgent();
    await sendGuestMessage(guest, 'guest needs help');
    const admin = await createAdminAndLogin();

    const res = await getAdminConversations(admin);
    const conv = res.body.data.conversations.find((c: { isGuest: boolean }) => c.isGuest === true);
    expect(conv).toBeDefined();
    expect(conv.conversationId).toMatch(/^guest:[0-9a-f]{64}$/);
    expect(conv.username).toBeUndefined();
    expect(conv.fullName).toBeUndefined();
    expect(conv.email).toBeUndefined();
  });

  it('admin can open and reply to a guest conversation, and the guest receives it in the same thread', async () => {
    const guest = await startGuestAgent();
    await sendGuestMessage(guest, 'guest needs help');
    const admin = await createAdminAndLogin();

    const conversations = await getAdminConversations(admin);
    const conv = conversations.body.data.conversations.find((c: { isGuest: boolean }) => c.isGuest === true);

    const opened = await getAdminConversationMessages(admin, conv.conversationId);
    expect(opened.status).toBe(200);
    expect(opened.body.data.messages.some((m: { text: string }) => m.text === 'guest needs help')).toBe(true);

    const reply = await sendAdminReply(admin, conv.conversationId, 'Hello, how can I help you?');
    expect(reply.status).toBe(201);
    expect(reply.body.data.message.sender).toBe('ADMIN');

    const guestView = await guest.agent.get('/api/support/messages');
    expect(guestView.body.data.messages.some((m: { text: string }) => m.text === 'Hello, how can I help you?')).toBe(
      true
    );
  });

  it('the guest can continue the same conversation after the admin reply', async () => {
    const guest = await startGuestAgent();
    await sendGuestMessage(guest, 'guest needs help');
    const admin = await createAdminAndLogin();
    const conversations = await getAdminConversations(admin);
    const conv = conversations.body.data.conversations.find((c: { isGuest: boolean }) => c.isGuest === true);
    await sendAdminReply(admin, conv.conversationId, 'Hello, how can I help you?');

    const replyRes = await sendGuestMessage(guest, 'Thanks, I have a follow-up question.');
    expect(replyRes.status).toBe(201);

    const adminView = await getAdminConversationMessages(admin, conv.conversationId);
    const texts = adminView.body.data.messages.map((m: { text: string }) => m.text);
    expect(texts).toContain('guest needs help');
    expect(texts).toContain('Hello, how can I help you?');
    expect(texts).toContain('Thanks, I have a follow-up question.');
  });

  it('admin takeover silences the bot for a guest thread, same as for an authenticated customer', async () => {
    const guest = await startGuestAgent();
    await sendGuestMessage(guest, 'hello'); // creates the one waiting notice
    const admin = await createAdminAndLogin();
    const conversations = await getAdminConversations(admin);
    const conv = conversations.body.data.conversations.find((c: { isGuest: boolean }) => c.isGuest === true);
    await sendAdminReply(admin, conv.conversationId, 'human here now');

    const afterTakeover = await sendGuestMessage(guest, 'still need help');
    expect(afterTakeover.body.data.messages).toHaveLength(1);
    expect(afterTakeover.body.data.messages[0].sender).toBe('CUSTOMER');
  });

  it('one guest cannot access another guest\'s conversation', async () => {
    const guestA = await startGuestAgent();
    const guestB = await startGuestAgent();
    await sendGuestMessage(guestA, 'A-only guest message');
    await sendGuestMessage(guestB, 'B-only guest message');

    const viewA = await guestA.agent.get('/api/support/messages');
    const textsA = viewA.body.data.messages.map((m: { text: string }) => m.text);
    expect(textsA).toContain('A-only guest message');
    expect(textsA).not.toContain('B-only guest message');

    const viewB = await guestB.agent.get('/api/support/messages');
    const textsB = viewB.body.data.messages.map((m: { text: string }) => m.text);
    expect(textsB).toContain('B-only guest message');
    expect(textsB).not.toContain('A-only guest message');
  });

  it("a guest cannot access an authenticated customer's conversation, and vice versa", async () => {
    const customer = await registerAndLogin();
    const guest = await startGuestAgent();
    await sendCustomerMessage(customer, 'customer-only message');
    await sendGuestMessage(guest, 'guest-only message');

    const guestView = await guest.agent.get('/api/support/messages');
    const guestTexts = guestView.body.data.messages.map((m: { text: string }) => m.text);
    expect(guestTexts).not.toContain('customer-only message');

    const customerView = await getCustomerMessages(customer);
    const customerTexts = customerView.body.data.messages.map((m: { text: string }) => m.text);
    expect(customerTexts).not.toContain('guest-only message');
  });

  it('a guest cannot spoof a userId to attach their message to a real account', async () => {
    const victim = await registerAndLogin();
    const guest = await startGuestAgent();

    const res = await guest.agent
      .post('/api/support/messages')
      .set('X-CSRF-Token', guest.csrfToken)
      .send({ text: 'spoof attempt', userId: victim.body.data.user.id });
    expect(res.status).toBe(201);

    const victimMessages = await prisma.supportMessage.findMany({ where: { userId: victim.body.data.user.id } });
    expect(victimMessages.some((m) => m.text === 'spoof attempt')).toBe(false);

    const guestMessages = await prisma.supportMessage.findMany({ where: { userId: null } });
    expect(guestMessages.some((m) => m.text === 'spoof attempt')).toBe(true);
  });

  it('a non-admin (including a guest) cannot use the admin conversation routes', async () => {
    const guest = await startGuestAgent();
    await sendGuestMessage(guest, 'hello');
    const res = await guest.agent.get('/api/admin/support/conversations');
    expect(res.status).toBe(401); // no session at all — same as any unauthenticated request
  });
});

// Regression coverage for the production bug where the frontend
// (adparlorr.com) and backend (api.adparlorr.com) sit on different hosts:
// a CSRF cookie without a shared COOKIE_DOMAIN is host-only, so
// document.cookie on the frontend page can never see it, even though the
// browser still auto-attaches it to requests. That silently drops the
// X-CSRF-Token header on every POST and 403s. These tests deliberately
// never read the raw Set-Cookie header (the thing supertest's
// extractCsrfToken relies on, and the thing a real cross-origin frontend
// cannot do) — they use ONLY the csrfToken value from the JSON response
// body, exactly like the fixed frontend now does, proving the fix works
// independent of cookie cross-origin visibility.
describe('support chat — CSRF token delivery (cross-origin frontend/backend split)', () => {
  it('an authenticated customer can send a message using only the csrfToken from the messages response body', async () => {
    const customer = await registerAndLogin();
    const getRes = await customer.agent.get('/api/support/messages');
    expect(getRes.status).toBe(200);
    expect(typeof getRes.body.data.csrfToken).toBe('string');
    expect(getRes.body.data.csrfToken.length).toBeGreaterThan(0);

    const postRes = await customer.agent
      .post('/api/support/messages')
      .set('X-CSRF-Token', getRes.body.data.csrfToken)
      .send({ text: 'hello via body-sourced token' });
    expect(postRes.status).toBe(201);
  });

  it("a guest's very first request already returns a usable csrfToken in the body (not just as a Set-Cookie header)", async () => {
    const agent = request.agent(app);
    const firstRes = await agent.get('/api/support/messages');
    expect(firstRes.status).toBe(200);
    expect(typeof firstRes.body.data.csrfToken).toBe('string');
    expect(firstRes.body.data.csrfToken.length).toBeGreaterThan(0);

    // Sent using ONLY the body-supplied token — never touching Set-Cookie.
    const postRes = await agent
      .post('/api/support/messages')
      .set('X-CSRF-Token', firstRes.body.data.csrfToken)
      .send({ text: 'guest first-contact message via body-sourced token' });
    expect(postRes.status).toBe(201);
  });

  it('a guest can keep using the response-body csrfToken across multiple messages in the same conversation', async () => {
    const agent = request.agent(app);
    const firstRes = await agent.get('/api/support/messages');
    const token = firstRes.body.data.csrfToken as string;

    const first = await agent.post('/api/support/messages').set('X-CSRF-Token', token).send({ text: 'message one' });
    expect(first.status).toBe(201);

    // A later GET's echoed token must still work for a subsequent POST.
    const secondGet = await agent.get('/api/support/messages');
    const secondToken = secondGet.body.data.csrfToken as string;
    const second = await agent
      .post('/api/support/messages')
      .set('X-CSRF-Token', secondToken)
      .send({ text: 'message two' });
    expect(second.status).toBe(201);

    const texts = secondGet.body.data.messages.map((m: { text: string }) => m.text);
    expect(texts).toContain('message one');
  });

  it('rejects a POST with a stale/incorrect csrfToken even if it looks well-formed', async () => {
    const agent = request.agent(app);
    await agent.get('/api/support/messages'); // establishes the real guest+csrf cookies
    const forged = 'a'.repeat(48); // same shape as a real token, but not the issued value
    const res = await agent.post('/api/support/messages').set('X-CSRF-Token', forged).send({ text: 'nope' });
    expect(res.status).toBe(403);
  });
});

describe('support chat — no automatic keyword replies (only the one waiting notice)', () => {
  it('produces exactly one BOT message (the waiting notice) when no admin has taken over the thread', async () => {
    const customer = await registerAndLogin();
    const res = await sendCustomerMessage(customer, 'hello');
    expect(res.status).toBe(201);

    const botMessages = res.body.data.messages.filter((m: { sender: string }) => m.sender === 'BOT');
    expect(botMessages).toHaveLength(1);
    expect(botMessages[0].text).toBe(WAITING_NOTICE_TEXT);

    const row = await prisma.supportMessage.findUnique({ where: { id: botMessages[0].id } });
    expect(row?.sender).toBe('BOT');
    expect(row?.userId).toBe(customer.body.data.user.id);
  });

  it('a "deposit" keyword message never triggers an automatic explanatory reply', async () => {
    const customer = await registerAndLogin();
    const res = await sendCustomerMessage(customer, 'How do I deposit funds?');
    const botMessages = res.body.data.messages.filter((m: { sender: string }) => m.sender === 'BOT');
    expect(botMessages).toHaveLength(1);
    expect(botMessages[0].text).toBe(WAITING_NOTICE_TEXT);
  });

  it('a "withdraw" keyword message never triggers an automatic explanatory reply', async () => {
    const customer = await registerAndLogin();
    const res = await sendCustomerMessage(customer, "I can't withdraw my funds");
    const botMessages = res.body.data.messages.filter((m: { sender: string }) => m.sender === 'BOT');
    expect(botMessages).toHaveLength(1);
    expect(botMessages[0].text).toBe(WAITING_NOTICE_TEXT);
  });

  it('a "tier" keyword message never triggers an automatic explanatory reply', async () => {
    const customer = await registerAndLogin();
    const res = await sendCustomerMessage(customer, 'I want to upgrade my tier level');
    const botMessages = res.body.data.messages.filter((m: { sender: string }) => m.sender === 'BOT');
    expect(botMessages).toHaveLength(1);
    expect(botMessages[0].text).toBe(WAITING_NOTICE_TEXT);
  });

  it('a "merged product" keyword message never triggers an automatic explanatory reply', async () => {
    const customer = await registerAndLogin();
    const res = await sendCustomerMessage(customer, 'I have a merged product issue');
    const botMessages = res.body.data.messages.filter((m: { sender: string }) => m.sender === 'BOT');
    expect(botMessages).toHaveLength(1);
    expect(botMessages[0].text).toBe(WAITING_NOTICE_TEXT);
  });

  it('a "balance"/"account" keyword message never triggers an automatic explanatory reply', async () => {
    const customer = await registerAndLogin();
    const res = await sendCustomerMessage(customer, 'What is my account balance?');
    const botMessages = res.body.data.messages.filter((m: { sender: string }) => m.sender === 'BOT');
    expect(botMessages).toHaveLength(1);
    expect(botMessages[0].text).toBe(WAITING_NOTICE_TEXT);
  });

  it('an unrelated/generic message also never triggers an automatic explanatory reply', async () => {
    const customer = await registerAndLogin();
    const res = await sendCustomerMessage(customer, 'zzz unrelated gibberish zzz');
    const botMessages = res.body.data.messages.filter((m: { sender: string }) => m.sender === 'BOT');
    expect(botMessages).toHaveLength(1);
    expect(botMessages[0].text).toBe(WAITING_NOTICE_TEXT);
  });

  it('the second, third, and further customer messages create no BOT message at all', async () => {
    const customer = await registerAndLogin();
    await sendCustomerMessage(customer, 'hello'); // creates the one waiting notice
    const second = await sendCustomerMessage(customer, 'How do I deposit?');
    expect(second.body.data.messages.filter((m: { sender: string }) => m.sender === 'BOT')).toHaveLength(0);
    const third = await sendCustomerMessage(customer, "I can't withdraw");
    expect(third.body.data.messages.filter((m: { sender: string }) => m.sender === 'BOT')).toHaveLength(0);

    const allBotRows = await prisma.supportMessage.findMany({
      where: { userId: customer.body.data.user.id, sender: 'BOT' },
    });
    expect(allBotRows).toHaveLength(1);
    expect(allBotRows[0].text).toBe(WAITING_NOTICE_TEXT);
  });

  it("the one waiting-notice BOT message belongs to the same customer's thread", async () => {
    const customer = await registerAndLogin();
    const sendRes = await sendCustomerMessage(customer, 'hello');
    const botMsg = sendRes.body.data.messages.find((m: { sender: string }) => m.sender === 'BOT');

    const listRes = await getCustomerMessages(customer);
    const found = listRes.body.data.messages.find((m: { id: string }) => m.id === botMsg.id);
    expect(found).toBeDefined();
  });
});

describe('support chat — waiting/status notice', () => {
  it('creates exactly one waiting/status BOT message, and nothing else, on the first customer message', async () => {
    const customer = await registerAndLogin();
    const res = await sendCustomerMessage(customer, 'How do I deposit?');
    expect(res.status).toBe(201);

    const botMessages = res.body.data.messages.filter((m: { sender: string }) => m.sender === 'BOT');
    expect(botMessages).toHaveLength(1);
    expect(botMessages[0].text).toBe(WAITING_NOTICE_TEXT);

    const row = await prisma.supportMessage.findUnique({ where: { id: botMessages[0].id } });
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

    const res = await getAdminConversationMessages(admin, userConvId(customer.body.data.user.id));
    const found = res.body.data.messages.find((m: { text: string }) => m.text === WAITING_NOTICE_TEXT);
    expect(found).toBeDefined();
  });

  it('admin takeover prevents any future waiting/status message for that customer', async () => {
    const customer = await registerAndLogin();
    await sendCustomerMessage(customer, 'hello'); // creates the one waiting notice
    const admin = await createAdminAndLogin();
    await sendAdminReply(admin, userConvId(customer.body.data.user.id), 'human here now');

    const afterTakeover = await sendCustomerMessage(customer, 'still need help');
    const waitingAfterTakeover = afterTakeover.body.data.messages.filter(
      (m: { text: string }) => m.text === WAITING_NOTICE_TEXT
    );
    expect(waitingAfterTakeover).toHaveLength(0);

    const allWaitingRows = await prisma.supportMessage.findMany({
      where: { userId: customer.body.data.user.id, isWaitingNotice: true },
    });
    expect(allWaitingRows).toHaveLength(1);
  });

  it('the waiting/status notice is isolated per customer — takeover for A does not affect B', async () => {
    const customerA = await registerAndLogin();
    const customerB = await registerAndLogin();
    const admin = await createAdminAndLogin();

    await sendCustomerMessage(customerA, 'hello from A');
    await sendAdminReply(admin, userConvId(customerA.body.data.user.id), 'admin for A');

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
    const conv = res.body.data.conversations.find(
      (c: { conversationId: string }) => c.conversationId === userConvId(customer.body.data.user.id)
    );
    expect(conv).toBeDefined();
  });

  it("lets admin open a customer's conversation", async () => {
    const customer = await registerAndLogin();
    await sendCustomerMessage(customer, 'need help');
    const admin = await createAdminAndLogin();

    const res = await getAdminConversationMessages(admin, userConvId(customer.body.data.user.id));
    expect(res.status).toBe(200);
    expect(res.body.data.messages.length).toBeGreaterThanOrEqual(2);
  });

  it('lets admin send a message and persists it as ADMIN', async () => {
    const customer = await registerAndLogin();
    await sendCustomerMessage(customer, 'need help');
    const admin = await createAdminAndLogin();

    const res = await sendAdminReply(admin, userConvId(customer.body.data.user.id), 'A human is here to help.');
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
    await sendAdminReply(admin, userConvId(customer.body.data.user.id), 'Taking over now.');

    const afterTakeover = await sendCustomerMessage(customer, 'are you still there?');
    expect(afterTakeover.status).toBe(201);
    const newBotMsg = afterTakeover.body.data.messages.find((m: { sender: string }) => m.sender === 'BOT');
    expect(newBotMsg).toBeUndefined();
    expect(afterTakeover.body.data.messages).toHaveLength(1);
    expect(afterTakeover.body.data.messages[0].sender).toBe('CUSTOMER');

    const stillThere = await prisma.supportMessage.findUnique({ where: { id: priorBotMsg.id } });
    expect(stillThere).not.toBeNull();
    expect(stillThere?.sender).toBe('BOT');
  });

  it("another customer's thread still receives BOT replies after a different customer's admin takeover", async () => {
    const customerA = await registerAndLogin();
    const customerB = await registerAndLogin();
    const admin = await createAdminAndLogin();

    await sendCustomerMessage(customerA, 'hello from A');
    await sendAdminReply(admin, userConvId(customerA.body.data.user.id), 'Admin here for A.');

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
    const ids = conversations.body.data.conversations.map((c: { conversationId: string }) => c.conversationId);
    expect(ids).toContain(userConvId(customerA.body.data.user.id));
    expect(ids).toContain(userConvId(customerB.body.data.user.id));
    expect(new Set(ids).size).toBe(ids.length);

    const adminViewA = await getAdminConversationMessages(admin, userConvId(customerA.body.data.user.id));
    expect(adminViewA.body.data.messages.every((m: { text: string }) => !m.text.includes('B message'))).toBe(true);

    const adminViewB = await getAdminConversationMessages(admin, userConvId(customerB.body.data.user.id));
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
    const firstOpen = await getAdminConversationMessages(admin, userConvId(customer.body.data.user.id));
    const firstOpenMsg = firstOpen.body.data.messages.find((m: { id: string }) => m.id === customerMsg.id);
    expect(firstOpenMsg.readByAdmin).toBe(false);

    const secondOpen = await getAdminConversationMessages(admin, userConvId(customer.body.data.user.id));
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
      (c: { conversationId: string }) => c.conversationId === userConvId(customer.body.data.user.id)
    );
    expect(convBefore.unreadCount).toBe(2);

    await getAdminConversationMessages(admin, userConvId(customer.body.data.user.id));

    const after = await getAdminConversations(admin);
    const convAfter = after.body.data.conversations.find(
      (c: { conversationId: string }) => c.conversationId === userConvId(customer.body.data.user.id)
    );
    expect(convAfter.unreadCount).toBe(0);
  });

  it('reading one conversation does not mark another conversation as read', async () => {
    const customerA = await registerAndLogin();
    const customerB = await registerAndLogin();
    await sendCustomerMessage(customerA, 'A message');
    await sendCustomerMessage(customerB, 'B message');
    const admin = await createAdminAndLogin();

    await getAdminConversationMessages(admin, userConvId(customerA.body.data.user.id));

    const conversations = await getAdminConversations(admin);
    const convA = conversations.body.data.conversations.find(
      (c: { conversationId: string }) => c.conversationId === userConvId(customerA.body.data.user.id)
    );
    const convB = conversations.body.data.conversations.find(
      (c: { conversationId: string }) => c.conversationId === userConvId(customerB.body.data.user.id)
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
    const conv = res.body.data.conversations.find(
      (c: { conversationId: string }) => c.conversationId === userConvId(customer.body.data.user.id)
    );
    expect(conv.fullName).toBe(customer.body.data.user.fullName);
    expect(conv.email).toBe(customer.body.data.user.email);
    // Only the FIRST customer message gets a BOT (waiting notice) reply —
    // the second one ("latest message") gets no automatic reply at all, so
    // it is itself the most recent message in the thread.
    expect(conv.lastMessage.sender).toBe('CUSTOMER');
    expect(conv.lastMessage.text).toBe('latest message');
    expect(conv.unreadCount).toBe(2);
  });

  it('orders conversations by most recently active first', async () => {
    const customerA = await registerAndLogin();
    const customerB = await registerAndLogin();
    await sendCustomerMessage(customerA, 'older conversation');
    await sendCustomerMessage(customerB, 'newer conversation');
    const admin = await createAdminAndLogin();

    const res = await getAdminConversations(admin);
    const ids = res.body.data.conversations.map((c: { conversationId: string }) => c.conversationId);
    const indexA = ids.indexOf(userConvId(customerA.body.data.user.id));
    const indexB = ids.indexOf(userConvId(customerB.body.data.user.id));
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

    const res = await getCustomerMessages(other);
    const texts = res.body.data.messages.map((m: { text: string }) => m.text);
    expect(texts).not.toContain('private message');
  });

  it('rejects a non-admin from using the admin conversation-reply route', async () => {
    const customer = await registerAndLogin();
    const other = await registerAndLogin();
    await sendCustomerMessage(customer, 'hello');

    const res = await other.agent
      .post(`/api/admin/support/conversations/${userConvId(customer.body.data.user.id)}/messages`)
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

    await sendAdminReply(admin, userConvId(customer.body.data.user.id), 'human here');

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
    await sendAdminReply(admin, userConvId(takenOver.body.data.user.id), 'taking over');

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

  it('rejects a malformed conversationId on the admin conversation routes', async () => {
    const admin = await createAdminAndLogin();
    const res = await getAdminConversationMessages(admin, 'not-a-real-id');
    expect(res.status).toBe(400);
  });

  it('rejects an admin reply with an empty message', async () => {
    const customer = await registerAndLogin();
    const admin = await createAdminAndLogin();
    const res = await sendAdminReply(admin, userConvId(customer.body.data.user.id), '');
    expect(res.status).toBe(400);
  });
});
