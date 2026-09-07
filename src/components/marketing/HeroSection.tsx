import { ArrowRight, Package, ShoppingBag, Sparkles, TrendingUp, Users } from 'lucide-react';
import { mailtoHref } from '@/data/marketingContact';

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:items-center lg:py-28">
        <div className="max-w-xl animate-fadeInUp">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-600">
            Digital Product Marketing
          </p>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]">
            Turn Great Products Into <span className="text-pink-600">Greater Visibility</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-600">
            Adparlor helps brands and product owners increase online visibility, reach the right
            audiences, and turn product attention into meaningful engagement.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href={mailtoHref('Product Promotion Inquiry')}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-pink-600 px-7 py-3.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-pink-700"
            >
              Promote Your Product <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#services"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-7 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              Explore Our Services
            </a>
          </div>
        </div>

        {/* Illustrative composition — no photography, no fabricated stats;
            purely decorative iconography implying reach/engagement. */}
        <div className="relative mx-auto h-[420px] w-full max-w-md animate-fadeInUp lg:h-[480px] lg:max-w-none">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-pink-100/70 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-slate-100 blur-3xl" />
          </div>

          <div className="absolute left-1/2 top-1/2 w-72 -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-pink-100 bg-white p-6 shadow-xl shadow-pink-900/5 sm:w-80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Campaign Overview
              </span>
              <TrendingUp className="h-4 w-4 text-pink-600" />
            </div>
            <div className="mt-5 flex items-end gap-2.5">
              {[40, 65, 50, 85, 70, 95].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-pink-200 to-pink-500"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-xs text-slate-500">Visibility</span>
              <span className="text-xs text-slate-500">Engagement</span>
            </div>
          </div>

          <div className="absolute left-2 top-4 w-44 -rotate-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-lg shadow-slate-900/5 sm:left-0">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-pink-50">
              <Package className="h-5 w-5 text-pink-600" />
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-800">Featured Product</p>
            <p className="text-[11px] text-slate-400">Now trending</p>
          </div>

          <div className="absolute bottom-6 right-0 w-44 rotate-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-lg shadow-slate-900/5 sm:right-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900">
              <Users className="h-5 w-5 text-white" />
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-800">Audience Reach</p>
            <p className="text-[11px] text-slate-400">Across channels</p>
          </div>

          <div className="absolute right-8 top-8 grid h-14 w-14 place-items-center rounded-2xl border border-pink-100 bg-white shadow-md shadow-pink-900/5">
            <Sparkles className="h-6 w-6 text-pink-600" />
          </div>
          <div className="absolute bottom-16 left-8 grid h-12 w-12 place-items-center rounded-2xl border border-slate-100 bg-white shadow-md shadow-slate-900/5">
            <ShoppingBag className="h-5 w-5 text-slate-700" />
          </div>
        </div>
      </div>
    </section>
  );
}
