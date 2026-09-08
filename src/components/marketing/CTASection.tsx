import { useEffect } from 'react';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { mailtoHref } from '@/data/marketingContact';
import { useStore } from '@/store/useStore';

export function CTASection() {
  const supportSettings = useStore((s) => s.supportSettings);
  const fetchSupportSettings = useStore((s) => s.fetchSupportSettings);

  // Public contact info only (telegramEnabled/telegramUrl) — the same
  // /api/support/telegram endpoint the guest Support Chat's own "Prefer
  // Telegram?" button uses, never the admin settings endpoint.
  useEffect(() => {
    fetchSupportSettings();
  }, [fetchSupportSettings]);

  const showTelegram = supportSettings?.telegramEnabled && !!supportSettings.telegramUrl;

  return (
    <section id="contact" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="rounded-3xl bg-slate-900 px-6 py-14 text-center shadow-2xl shadow-slate-900/20 sm:px-16 sm:py-20">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Have a Product to Promote?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
            Put your product in front of the right audience with Adparlorr.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={mailtoHref('Product Promotion Inquiry')}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-pink-600 px-8 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-pink-700 sm:w-auto"
            >
              Promote Your Product <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href={mailtoHref('General Inquiry')}
              className="inline-flex w-full items-center justify-center rounded-full border border-slate-600 px-8 py-3.5 text-sm font-semibold text-white transition hover:border-slate-400 sm:w-auto"
            >
              Contact Us
            </a>
            {showTelegram && (
              <a
                href={supportSettings!.telegramUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-600 px-8 py-3.5 text-sm font-semibold text-white transition hover:border-slate-400 sm:w-auto"
              >
                <MessageCircle className="h-4 w-4" /> Contact us on Telegram
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
