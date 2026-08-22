// Mirrors the synthetic catalog previously generated client-side in
// src/data/products.ts, so seeded data matches what the UI has always shown.
const PREFIXES = [
  'MedX', 'BioHealth', 'PharmaPlus', 'NeoMed', 'VitaCore',
  'OptiCare', 'HealthMax', 'PureLab', 'MedTech', 'BioSync',
];
const SUFFIXES = [
  '-100', ' Plus', '-200', ' Pro', '-500', ' Elite', '-300', ' Max', '-150', ' Care',
];
const CATEGORIES = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Drops'];

export interface SyntheticProduct {
  displayOrder: number;
  name: string;
  category: string;
  reward: number;
  cost: number;
}

export function buildSyntheticProducts(): SyntheticProduct[] {
  return Array.from({ length: 45 }, (_, i) => {
    const prefix = PREFIXES[i % PREFIXES.length];
    const suffix = SUFFIXES[Math.floor(i / PREFIXES.length) % SUFFIXES.length];
    const num = 100 + i * 7;
    return {
      displayOrder: i + 1,
      name: `${prefix}${suffix} ${num}`,
      category: CATEGORIES[i % 5],
      reward: 0.8 + (i % 5) * 0.2,
      cost: 0.3 + (i % 3) * 0.1,
    };
  });
}
