import { z } from 'zod';

export const sendSupportMessageSchema = z.object({
  text: z.string().trim().min(1, 'Message cannot be empty.').max(2000, 'Message is too long.'),
});

// Matches supportChat.service.ts's toConversationId/parseConversationId —
// exactly one of these two forms, never a bare id, so the admin route can
// never be tricked into guessing which table column to filter on.
export const supportConversationIdParamsSchema = z.object({
  conversationId: z
    .string()
    .regex(/^(user:[0-9a-f-]{36}|guest:[0-9a-f]{64})$/, 'A valid conversationId is required.'),
});
