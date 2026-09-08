import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Facebook, Instagram, Linkedin, ArrowRight } from 'lucide-react';
import { CONTACT_EMAIL, mailtoHref } from '@/data/marketingContact';
import { Logo } from '@/components/branding/Logo';

// Items with a real destination in this app are links; items the reference
// structure calls for that have no corresponding page (no Careers page, no
// Insights/Guides/FAQ content, no Privacy/Terms/Cookies documents) render
// as plain text instead of dead or fake links.
const SERVICE_LINKS = [
  { label: 'Product Promotion', href: '#services' },
  { label: 'Product Visibility', href: '#services' },
  { label: 'Audience Engagement', href: '#services' },
  { label: 'Marketing Optimization', href: '#services' },
];

const COMPANY_LINKS: { label: string; href?: string }[] = [
  { label: 'About Us', href: '#why' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Contact', href: '#contact' },
  { label: 'Careers' },
];

const RESOURCE_ITEMS = ['Insights', 'Marketing Guides', 'Success Stories', 'FAQ'];

const LEGAL_ITEMS = ['Privacy Policy', 'Terms', 'Cookies'];

export function MarketingFooter() {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    window.location.href = mailtoHref('Newsletter Signup', `Please add ${email.trim()} to the newsletter list.`);
  };

  return (
    <footer className="border-t border-slate-100 bg-neutral-50">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link to="/">
              <Logo variant="light" size="lg" />
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-600">
              Digital product marketing designed to increase visibility, reach, and engagement.
            </p>
            <div className="mt-5 flex gap-3">
              {[Twitter, Facebook, Instagram, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Social link"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-pink-300 hover:text-pink-600"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900">Services</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              {SERVICE_LINKS.map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="hover:text-pink-600">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900">Company</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              {COMPANY_LINKS.map((item) =>
                item.href ? (
                  <li key={item.label}>
                    <a href={item.href} className="hover:text-pink-600">
                      {item.label}
                    </a>
                  </li>
                ) : (
                  <li key={item.label} className="text-slate-400">
                    {item.label}
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900">Resources</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
              {RESOURCE_ITEMS.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-900">Contact</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
              <li>
                <a href={mailtoHref('General Inquiry')} className="hover:text-pink-600">
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-slate-200 pt-10">
          <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Stay ahead of product marketing trends.</h4>
              <p className="mt-1 text-xs text-slate-500">Opens your email client — no spam, no fine print.</p>
            </div>
            <form onSubmit={handleSubscribe} className="flex w-full max-w-sm gap-2 sm:w-auto">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-full border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-pink-600 text-white transition hover:bg-pink-700"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:justify-between">
          <p className="text-xs text-slate-500">© 2026 Adparlorr. All rights reserved.</p>
          <div className="flex gap-5 text-xs text-slate-400">
            {LEGAL_ITEMS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </div>
        <p className="mt-4 text-center text-[10px] text-slate-400">
          This is an authorized security awareness training simulation. Not for real-world use.
        </p>
      </div>
    </footer>
  );
}
