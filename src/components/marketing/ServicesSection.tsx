import { Megaphone, Eye, Heart, BarChart3 } from 'lucide-react';

const SERVICES = [
  {
    Icon: Megaphone,
    title: 'Product Promotion',
    description: 'Strategic campaigns designed to put products in front of the right audiences.',
  },
  {
    Icon: Eye,
    title: 'Product Visibility',
    description: "Improve discoverability and strengthen your product's online presence.",
  },
  {
    Icon: Heart,
    title: 'Audience Engagement',
    description: 'Connect products with audiences and encourage meaningful interaction.',
  },
  {
    Icon: BarChart3,
    title: 'Marketing Optimization',
    description: 'Use performance insights to refine campaigns and improve results.',
  },
];

export function ServicesSection() {
  return (
    <section id="services" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-600">Our Services</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            How We Help Products Get Noticed
          </h2>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service) => (
            <div
              key={service.title}
              className="rounded-2xl border border-slate-200 bg-white p-7 transition hover:border-pink-200 hover:shadow-lg hover:shadow-pink-900/5"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-pink-50">
                <service.Icon className="h-6 w-6 text-pink-600" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">{service.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
