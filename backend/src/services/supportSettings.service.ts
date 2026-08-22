import { findSettings, createSettings, updateSettingsById } from '../repositories/supportSettings.repository';
import { buildTelegramUrl } from '../utils/telegram';

export interface SupportSettingsDto {
  telegramEnabled: boolean;
  telegramUsername: string | null;
  telegramUrl: string | null;
}

function toDto(row: { telegramEnabled: boolean; telegramUsername: string | null }): SupportSettingsDto {
  const showTelegram = row.telegramEnabled && !!row.telegramUsername;
  return {
    telegramEnabled: row.telegramEnabled,
    telegramUsername: row.telegramUsername,
    telegramUrl: showTelegram ? buildTelegramUrl(row.telegramUsername as string) : null,
  };
}

async function getOrCreateRow() {
  const existing = await findSettings();
  if (existing) return existing;
  return createSettings();
}

export async function getSupportSettings(): Promise<SupportSettingsDto> {
  const row = await getOrCreateRow();
  return toDto(row);
}

export interface UpdateSupportSettingsInput {
  telegramUsername: string | null;
  telegramEnabled: boolean;
}

export async function updateSupportSettings(input: UpdateSupportSettingsInput): Promise<SupportSettingsDto> {
  const row = await getOrCreateRow();
  const updated = await updateSettingsById(row.id, {
    telegramUsername: input.telegramUsername,
    telegramEnabled: input.telegramEnabled,
  });
  return toDto(updated);
}
