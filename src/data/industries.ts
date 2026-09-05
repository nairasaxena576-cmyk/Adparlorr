import type { LucideIcon } from 'lucide-react';
import { Home, Cpu, Shirt, Sparkles, Armchair, Dumbbell, UtensilsCrossed, Plane } from 'lucide-react';

// The category cards on the homepage's "Products We Help Promote" section
// are driven entirely from this array — add or remove an entry here to
// change what appears, no JSX duplication required.
export interface Industry {
  id: string;
  title: string;
  description: string;
  Icon: LucideIcon;
}

export const INDUSTRIES: Industry[] = [
  {
    id: 'home-family-pets',
    title: 'Home, Family & Pets',
    description:
      'Build product awareness through targeted content, audience engagement, and performance-focused promotion.',
    Icon: Home,
  },
  {
    id: 'tech-electronics',
    title: 'Tech & Electronics',
    description: 'Help innovative products reach technology-focused audiences through focused digital promotion.',
    Icon: Cpu,
  },
  {
    id: 'fashion-apparel',
    title: 'Fashion & Apparel',
    description: 'Connect products with the audiences and moments that matter through modern digital marketing.',
    Icon: Shirt,
  },
  {
    id: 'health-beauty-cpg',
    title: 'Health, Beauty & CPG',
    description: 'Build product visibility through category-focused campaigns, content, and audience engagement.',
    Icon: Sparkles,
  },
  {
    id: 'home-lifestyle',
    title: 'Home & Lifestyle',
    description: 'Showcase everyday products through campaigns that highlight design, function, and lifestyle appeal.',
    Icon: Armchair,
  },
  {
    id: 'sports-outdoors',
    title: 'Sports & Outdoors',
    description: 'Reach active audiences with promotion strategies built around performance and adventure.',
    Icon: Dumbbell,
  },
  {
    id: 'food-beverage',
    title: 'Food & Beverage',
    description: "Turn flavor and craft into visibility with campaigns that spotlight what makes a product memorable.",
    Icon: UtensilsCrossed,
  },
  {
    id: 'travel-experiences',
    title: 'Travel & Experiences',
    description: 'Promote products and experiences that inspire audiences to explore and engage.',
    Icon: Plane,
  },
];
