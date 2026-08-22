import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  UserPlus,
  Briefcase,
  Wallet,
  ChevronDown,
  Star,
  ShieldCheck,
  Users,
  TrendingUp,
} from 'lucide-react';
import { Footer } from '@/components/Footer';

const STEPS = [
  { Icon: UserPlus, title: 'Register', desc: 'Create your free account in seconds and get instant access to our task platform.' },
  { Icon: Briefcase, title: 'Work', desc: 'Complete simple product submission tasks from your dashboard — anytime, anywhere.' },
  { Icon: Wallet, title: 'Earn', desc: 'Get paid for every completed task. Withdraw your earnings directly to your wallet.' },
];

const TESTIMONIALS = [
  { name: 'Sarah M.', role: 'Freelancer', text: 'I started with Adparlorr three months ago and now earn consistently from home. The platform is so easy to use!', rating: 5 },
  { name: 'James K.', role: 'Student', text: 'Flexible hours and real income. I work between classes and it pays better than my part-time job.', rating: 5 },
  { name: 'Linda T.', role: 'Stay-at-home parent', text: 'Best decision I made this year. The referral program alone covers my grocery bills every week.', rating: 5 },
];

const FAQS = [
  { q: 'How do I get started?', a: 'Simply click "Apply Now" and fill out the registration form. You can start working within minutes.' },
  { q: 'Is there a fee to join?', a: 'No — registration is completely free. You only need a valid email address to create your account.' },
  { q: 'How much can I earn?', a: 'Earnings depend on the number of tasks you complete. Most active members earn daily.' },
  { q: 'How do I withdraw my earnings?', a: 'Once you reach the minimum balance threshold, you can request a withdrawal to your preferred crypto wallet.' },
  { q: 'What is the referral program?', a: 'Share your unique referral code with friends. You earn bonuses when they join and start working.' },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-semibold text-ink-100">{q}</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-ink-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-all duration-300 ${open ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <p className="overflow-hidden text-sm leading-relaxed text-ink-400">{a}</p>
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <div className="min-h-screen bg-ink-900">
      {/* Nav */}
      <nav className="sticky top-9 z-40 border-b border-ink-700 bg-ink-900/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <span className="text-xl font-extrabold text-brand-400">Adparlorr</span>
          <div className="hidden items-center gap-6 sm:flex">
            <a href="#about" className="text-sm text-ink-300 hover:text-brand-400">About</a>
            <a href="#how" className="text-sm text-ink-300 hover:text-brand-400">How It Works</a>
            <a href="#faq" className="text-sm text-ink-300 hover:text-brand-400">FAQ</a>
            <Link to="/register" className="btn-brand">Apply Now</Link>
          </div>
          <Link to="/register" className="btn-brand sm:hidden">Apply</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -right-20 top-0 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
          <div className="absolute -left-20 top-40 h-80 w-80 rounded-full bg-brand-700/15 blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:py-36">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold text-brand-300">
              <ShieldCheck className="h-3.5 w-3.5" /> Trusted by 50,000+ members
            </div>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Turn your time into{' '}
              <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">real income</span>
            </h1>
            <p className="mt-5 text-lg text-ink-300 sm:text-xl">
              Digital Marketing Solutions. Complete simple tasks from anywhere and get paid daily.
              Join thousands earning with Adparlorr.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="btn-brand px-7 py-3.5 text-base">
                Apply Now <ArrowRight className="h-5 w-5" />
              </Link>
              <a href="#how" className="btn-ghost px-7 py-3.5 text-base">Learn More</a>
            </div>
            <div className="mt-10 flex gap-8">
              {[
                { Icon: Users, label: '50K+ Members' },
                { Icon: TrendingUp, label: '$2M+ Paid Out' },
                { Icon: ShieldCheck, label: '100% Secure' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-ink-400">
                  <s.Icon className="h-5 w-5 text-brand-400" /> {s.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="border-t border-ink-700 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">About Us</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              We connect people with opportunity
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-300">
              Adparlorr is a digital marketing platform that empowers individuals to earn income by
              completing simple product submission tasks. Since 2021, we've helped over 50,000
              members generate consistent income from the comfort of their homes.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              { Icon: ShieldCheck, title: 'Secure Platform', desc: 'Your data and earnings are protected with enterprise-grade security.' },
              { Icon: Users, title: 'Growing Community', desc: 'Join a thriving community of earners from across the globe.' },
              { Icon: TrendingUp, title: 'Real Earnings', desc: 'Get paid fairly for every task you complete, with transparent tracking.' },
            ].map((item, i) => (
              <div key={i} className="card">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500/15">
                  <item.Icon className="h-6 w-6 text-brand-400" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-ink-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="bg-ink-950 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">How It Works</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Three simple steps to start earning
            </h2>
          </div>
          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={i} className="relative text-center">
                <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-brand-500/15">
                  <step.Icon className="h-9 w-9 text-brand-400" />
                  <span className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-sm font-bold text-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-sm text-ink-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-t border-ink-700 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">Testimonials</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              What our members say
            </h2>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card">
                <div className="flex gap-1">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-ink-300">"{t.text}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-500/20 text-sm font-bold text-brand-300">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-ink-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-ink-950 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">FAQ</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Frequently asked questions
            </h2>
          </div>
          <div className="mt-10 space-y-3">
            {FAQS.map((faq, i) => (
              <FaqItem key={i} {...faq} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-14 text-center shadow-2xl shadow-brand-500/20 sm:px-16">
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">Ready to start earning?</h2>
            <p className="mt-4 text-lg text-brand-50/90">Join thousands of members earning daily with Adparlorr.</p>
            <Link to="/register" className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-brand-700 transition hover:-translate-y-0.5">
              Apply Now <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
