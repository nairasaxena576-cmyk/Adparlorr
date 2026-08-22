const TELEGRAM_USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/;

export function normalizeTelegramUsername(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim().replace(/^@+/, '');
  return trimmed.length > 0 ? trimmed : null;
}

export function isValidTelegramUsername(username: string): boolean {
  return TELEGRAM_USERNAME_REGEX.test(username);
}

export function buildTelegramUrl(username: string): string {
  return `https://t.me/${username}`;
}
