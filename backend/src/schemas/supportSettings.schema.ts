import { z } from 'zod';
import { normalizeTelegramUsername, isValidTelegramUsername } from '../utils/telegram';

export const updateSupportSettingsSchema = z
  .object({
    telegramUsername: z.string().max(64).optional().nullable(),
    telegramEnabled: z.boolean(),
  })
  .transform((data) => ({
    telegramEnabled: data.telegramEnabled,
    telegramUsername: normalizeTelegramUsername(data.telegramUsername),
  }))
  .superRefine((data, ctx) => {
    if (data.telegramUsername && !isValidTelegramUsername(data.telegramUsername)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Telegram username must be 5-32 characters, start with a letter, and contain only letters, numbers, and underscores.',
        path: ['telegramUsername'],
      });
    }
    if (data.telegramEnabled && !data.telegramUsername) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A Telegram username is required to enable Telegram support.',
        path: ['telegramUsername'],
      });
    }
  });
