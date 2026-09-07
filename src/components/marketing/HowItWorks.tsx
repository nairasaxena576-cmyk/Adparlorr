const STEPS = [
  { number: '01', title: 'Tell us about your product', description: 'Share what you’re promoting and who it’s for.' },
  { number: '02', title: 'We build the promotion strategy', description: 'A campaign approach tailored to your product and category.' },
  { number: '03', title: 'Our marketing network drives visibility and engagement', description: 'Your product gets in front of the right audiences.' },
  { number: '04', title: 'We measure and optimize performance', description: 'Ongoing refinement based on real campaign performance.' },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-neutral-50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-600">Process</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            How Adparlor Works
          </h2>
        </div>

        <div className="relative mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-slate-200 lg:block" />
          {STEPS.map((step) => (
            <div key={step.number} className="relative text-center">
              <div className="relative z-10 mx-auto grid h-12 w-12 place-items-center rounded-full border border-pink-200 bg-white text-sm font-extrabold text-pink-600">
                {step.number}
              </div>
              <h3 className="mt-5 text-base font-bold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
