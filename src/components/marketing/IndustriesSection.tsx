import { INDUSTRIES } from '@/data/industries';
import { IndustryCard } from './IndustryCard';

export function IndustriesSection() {
  return (
    <section id="industries" className="bg-neutral-50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-600">Industries</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Products We Help Promote
          </h2>
          <p className="mt-4 text-base text-slate-600">
            Adparlorr works across a range of product categories — bringing the same focus on
            visibility, reach, and engagement to every one of them.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {INDUSTRIES.map((industry) => (
            <IndustryCard key={industry.id} industry={industry} />
          ))}
        </div>
      </div>
    </section>
  );
}
