// Single source of truth for the homepage's contact mechanism. There is no
// public "contact us" API in this app (the real Telegram support channel
// requires an authenticated session — see src/pages/Support.tsx) and no
// business-inquiry backend exists, so every marketing CTA on the public
// homepage hands off to a real mailto: link rather than pretending to
// submit somewhere. Reuses the placeholder address the existing footer
// already shipped with, rather than inventing a new one.
export const CONTACT_EMAIL = 'support@adparlorr-demo.com';

export function mailtoHref(subject: string, body?: string): string {
  const params = new URLSearchParams({ subject, ...(body ? { body } : {}) });
  return `mailto:${CONTACT_EMAIL}?${params.toString()}`;
}
