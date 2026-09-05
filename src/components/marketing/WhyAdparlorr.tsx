const REASONS = [
  {
    number: '01',
    title: 'Visibility',
    description: 'Help products get discovered where audiences are already searching and browsing.',
  },
  {
    number: '02',
    title: 'Audience Reach',
    description: 'Connect products with relevant audiences across digital channels.',
  },
  {
    number: '03',
    title: 'Product Engagement',
    description: 'Turn visibility into meaningful interactions with products.',
  },
  {
    number: '04',
    title: 'Performance Focus',
    description: 'Use measurable results to refine and improve marketing efforts.',
  },
];

export function WhyAdparlorr() {
  return (
    <section id="why" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-600">Why Adparlorr</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Why Brands Choose Adparlorr
          </h2>
        </div>

        <div className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2">
          {REASONS.map((reason) => (
            <div key={reason.number} className="flex gap-5">
              <span className="text-4xl font-extrabold text-pink-200 sm:text-5xl">{reason.number}</span>
              <div className="pt-1">
                <h3 className="text-xl font-bold text-slate-900">{reason.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{reason.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
