import type { Industry } from '@/data/industries';

export function IndustryCard({ industry }: { industry: Industry }) {
  return (
    <div className="flex flex-col rounded-2xl border border-pink-200 bg-white p-8 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-900/10 sm:p-9">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-pink-50">
        <industry.Icon className="h-7 w-7 text-pink-600" aria-hidden="true" />
      </div>
      <h3 className="mt-7 text-xl font-extrabold uppercase tracking-wide text-slate-900">{industry.title}</h3>
      <div className="mt-4 h-px w-12 bg-pink-200" />
      <p className="mt-4 text-sm leading-relaxed text-slate-600">{industry.description}</p>
    </div>
  );
}
