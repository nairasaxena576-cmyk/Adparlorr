import { ShoppingBag, Camera, Heart, Music2, MessageCircle, Star, Gift, Bookmark } from 'lucide-react';

// Purely decorative — sits behind the customer dashboard's real content
// (see DashboardLayout.tsx, which reserves top padding so this band never
// overlaps the page heading/cards). No live data, no business logic: just
// a smooth pastel gradient plus a handful of soft floating "app icon" style
// orbs, kept pale/translucent so they read as background texture rather
// than competing with real content. Abstract icons only — no reproduction
// of any real third-party logo or brand mark.
const ORBS: Array<{
  Icon: typeof ShoppingBag;
  color: string;
  size: number;
  top: string;
  left: string;
  blur?: boolean;
  delay: number;
}> = [
  { Icon: ShoppingBag, color: 'from-sky-200 to-sky-300', size: 40, top: '4%', left: '10%', delay: 0 },
  { Icon: Heart, color: 'from-rose-200 to-rose-300', size: 30, top: '0%', left: '32%', blur: true, delay: 0.5 },
  { Icon: Camera, color: 'from-fuchsia-200 to-fuchsia-300', size: 34, top: '10%', left: '54%', delay: 0.9 },
  { Icon: Music2, color: 'from-violet-200 to-violet-300', size: 36, top: '2%', left: '76%', blur: true, delay: 0.3 },
  { Icon: Star, color: 'from-emerald-200 to-emerald-300', size: 26, top: '16%', left: '20%', blur: true, delay: 1.3 },
  { Icon: MessageCircle, color: 'from-amber-200 to-amber-300', size: 32, top: '14%', left: '90%', delay: 1.1 },
  { Icon: Gift, color: 'from-pink-200 to-pink-300', size: 28, top: '18%', left: '42%', delay: 1.6 },
  { Icon: Bookmark, color: 'from-orange-200 to-orange-300', size: 24, top: '8%', left: '65%', blur: true, delay: 0.7 },
];

export function CustomerBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Smooth soft pastel gradient — a single blended wash, not layered
          blotches, so it reads as elegant rather than patchy. */}
      <div className="absolute inset-0 bg-gradient-to-b from-rose-100 via-pink-50 to-rose-50/40" />

      {/* Floating orbs — confined to a short band near the very top (well
          clear of the padding-top reserved for real content in
          DashboardLayout.tsx), pale and mostly semi-transparent so they sit
          quietly behind everything rather than drawing the eye. */}
      <div className="relative h-24 w-full sm:h-28">
        {ORBS.map((orb, i) => (
          <div
            key={i}
            className={`absolute animate-fadeInUp rounded-full bg-gradient-to-br opacity-40 shadow-sm shadow-rose-200/40 ${orb.color} ${
              orb.blur ? 'blur-[2px] opacity-30' : ''
            }`}
            style={{
              width: orb.size,
              height: orb.size,
              top: orb.top,
              left: orb.left,
              animationDelay: `${orb.delay}s`,
            }}
          >
            <div className="grid h-full w-full place-items-center">
              <orb.Icon className="h-[42%] w-[42%] text-white" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
