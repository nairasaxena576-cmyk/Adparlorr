import type { Prisma, PrismaClient } from '@prisma/client';

// The production Workbench product catalog — real, verifiable electronic
// components (distributor: chipspulse.com), NOT invented part numbers or
// manufacturers. Every manufacturer/part number below was confirmed to
// exist as an actual chipspulse.com listing before being added here.
//
// This is entirely separate from src/lib/productCatalog.ts's
// buildSyntheticProducts(), which remains the generic 45-item fixture used
// only by the test suite's global per-file seed (tests/setup.ts) — that
// file is untouched by this catalog and continues to seed its own
// generic/cheap placeholder data for tests that don't care about real
// product identity. Nothing here changes what tests already rely on.
//
// Cumulative Workbench tier bands (see utils/tiers.ts / config/simulation.ts
// production defaults): Bronze 1-40, Silver 41-45, Gold 46-50, Platinum
// 51-55 — encoded here purely by array order (first 40 entries are Bronze,
// next 5 Silver, next 5 Gold, last 5 Platinum), never by a second hardcoded
// displayOrder map, so there is exactly one place that can drift.

type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

interface CatalogEntry {
  manufacturer: string;
  partNumber: string;
  spec: string;
  componentType: string;
  category: string;
  price: number;
  imageGroup: ImageGroup;
}

type ImageGroup = 'RES' | 'CAP' | 'IND' | 'LOG' | 'PRO' | 'ANA' | 'ITF' | 'DSP' | 'SEN' | 'PWR';

// A small, fixed set of clean, generated (not scraped/copyrighted) SVG
// component glyphs, inlined as data: URIs — stable by construction (no
// network dependency, nothing to go down or rot) and well under the admin
// product schema's 500-character imageUrl cap (see
// schemas/productAdmin.schema.ts). Colors distinguish component families;
// the short label mirrors the category. This satisfies "every product has
// a stable image" without hotlinking unstable URLs or redistributing any
// manufacturer's copyrighted product photography.
const IMAGE_GROUPS: Record<ImageGroup, { bg: string; fg: string; label: string }> = {
  RES: { bg: '#78350f', fg: '#fcd34d', label: 'RES' },
  CAP: { bg: '#1e3a8a', fg: '#93c5fd', label: 'CAP' },
  IND: { bg: '#14532d', fg: '#86efac', label: 'IND' },
  LOG: { bg: '#4c1d95', fg: '#c4b5fd', label: 'LOG' },
  PRO: { bg: '#7f1d1d', fg: '#fca5a5', label: 'ESD' },
  ANA: { bg: '#164e63', fg: '#67e8f9', label: 'ANA' },
  ITF: { bg: '#134e4a', fg: '#5eead4', label: 'ITF' },
  DSP: { bg: '#312e81', fg: '#a5b4fc', label: 'DSP' },
  SEN: { bg: '#3f6212', fg: '#d9f99d', label: 'SEN' },
  PWR: { bg: '#7c2d12', fg: '#fdba74', label: 'PWR' },
};

function buildImageUrl(group: ImageGroup): string {
  const { bg, fg, label } = IMAGE_GROUPS[group];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64">` +
    `<rect width="64" height="64" rx="8" fill="${bg}"/>` +
    `<rect x="6" y="26" width="52" height="14" rx="3" fill="${fg}"/>` +
    `<text x="32" y="36" font-size="11" fill="${bg}" text-anchor="middle">${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function buildName(entry: CatalogEntry): string {
  return `${entry.manufacturer} ${entry.partNumber} ${entry.spec} ${entry.componentType}`;
}

// ---------------------------------------------------------------------------
// BRONZE — 40 passive components (resistors, capacitors, one ferrite bead).
// ---------------------------------------------------------------------------
const BRONZE: CatalogEntry[] = [
  { manufacturer: 'CAL-CHIP', partNumber: 'RN10D1211CT5-50', spec: '1.21KΩ ±0.5% 1/10W 0805', componentType: 'Thin Film Resistor', category: 'Resistor', price: 9.5, imageGroup: 'RES' },
  { manufacturer: 'CAL-CHIP', partNumber: 'RN04B4751CT10-25', spec: '4.75KΩ ±0.1% 1/16W 0402', componentType: 'Thin Film Resistor', category: 'Resistor', price: 10.75, imageGroup: 'RES' },
  { manufacturer: 'CAL-CHIP', partNumber: 'RM10F2371CT', spec: '2.37KΩ ±1% 1/8W 0805', componentType: 'SMD Resistor', category: 'Resistor', price: 8.25, imageGroup: 'RES' },
  { manufacturer: 'CAL-CHIP', partNumber: 'RN06F3322CT5-50', spec: '33.2KΩ ±1% 0603', componentType: 'Thin Film Resistor', category: 'Resistor', price: 11.0, imageGroup: 'RES' },
  { manufacturer: 'CAL-CHIP', partNumber: 'RM06F1072CT', spec: '10.7KΩ ±1% 1/10W 0603', componentType: 'SMD Resistor', category: 'Resistor', price: 8.75, imageGroup: 'RES' },
  { manufacturer: 'CAL-CHIP', partNumber: 'RM04J162CT', spec: '1.6KΩ ±5% 1/16W 0402', componentType: 'SMD Resistor', category: 'Resistor', price: 7.5, imageGroup: 'RES' },
  { manufacturer: 'CAL-CHIP', partNumber: 'RM25J332CT', spec: '3.3KΩ ±5% 1W 2512', componentType: 'SMD Resistor', category: 'Resistor', price: 12.5, imageGroup: 'RES' },
  { manufacturer: 'CAL-CHIP', partNumber: 'GMC04X7R221K50NT', spec: '220PF 50V X7R 0402', componentType: 'Ceramic Capacitor', category: 'Capacitor', price: 9.0, imageGroup: 'CAP' },
  { manufacturer: 'CAL-CHIP', partNumber: 'GMC10X6S226M6R3NT', spec: '22UF ±20% 6.3V 0603', componentType: 'Ceramic Capacitor', category: 'Capacitor', price: 13.25, imageGroup: 'CAP' },
  { manufacturer: 'CAL-CHIP', partNumber: 'GMC55Z5U105M50NT', spec: '1UF 50V Z5U 2220', componentType: 'Ceramic Capacitor', category: 'Capacitor', price: 14.5, imageGroup: 'CAP' },
  { manufacturer: 'CAL-CHIP', partNumber: 'GMC10CG181J50NT', spec: '180PF 50V C0G/NP0 0603', componentType: 'Ceramic Capacitor', category: 'Capacitor', price: 9.75, imageGroup: 'CAP' },
  { manufacturer: 'CAL-CHIP', partNumber: 'GMC04CG221G16NT', spec: '220PF 16V C0G/NP0 0402', componentType: 'Ceramic Capacitor', category: 'Capacitor', price: 8.5, imageGroup: 'CAP' },
  { manufacturer: 'CAL-CHIP', partNumber: 'GMC10X7R223J16NT', spec: '0.022UF 16V X7R 0603', componentType: 'Ceramic Capacitor', category: 'Capacitor', price: 9.25, imageGroup: 'CAP' },
  { manufacturer: 'CAL-CHIP', partNumber: 'GMC10CG470K100NT', spec: '47PF 100V C0G/NP0 0603', componentType: 'Ceramic Capacitor', category: 'Capacitor', price: 10.0, imageGroup: 'CAP' },
  { manufacturer: 'CAL-CHIP', partNumber: 'GMC10CG681G100NT', spec: '680PF 100V C0G/NP0 0603', componentType: 'Ceramic Capacitor', category: 'Capacitor', price: 10.5, imageGroup: 'CAP' },
  { manufacturer: 'Panasonic', partNumber: 'ERJ-P03F4022V', spec: '40.2KΩ ±1%', componentType: 'Anti-Surge Thick Film Resistor', category: 'Resistor', price: 15.0, imageGroup: 'RES' },
  { manufacturer: 'Yageo', partNumber: 'RC0603FR-0780R6L', spec: '80.6Ω ±1% 0603', componentType: 'Thick Film Resistor', category: 'Resistor', price: 8.0, imageGroup: 'RES' },
  { manufacturer: 'Murata', partNumber: 'GRM188R61A106KE69D', spec: '10UF 10V X5R 0603', componentType: 'MLCC Capacitor', category: 'Capacitor', price: 12.0, imageGroup: 'CAP' },
  { manufacturer: 'Vishay/Dale', partNumber: 'CRCW04021K00FKED', spec: '1KΩ ±1% 0402', componentType: 'Thick Film Resistor', category: 'Resistor', price: 8.9, imageGroup: 'RES' },
  { manufacturer: 'Vishay/Dale', partNumber: 'CRCW0402100RFKEDC', spec: '100Ω ±1% 0402', componentType: 'Thick Film Resistor', category: 'Resistor', price: 8.6, imageGroup: 'RES' },
  { manufacturer: 'ROHM', partNumber: 'MCR01MZPJ273', spec: '27KΩ ±5% 0402', componentType: 'Thick Film Resistor', category: 'Resistor', price: 8.4, imageGroup: 'RES' },
  { manufacturer: 'Panasonic', partNumber: 'ERJP06F2202V', spec: '22KΩ ±1% 1/2W', componentType: 'Thick Film Resistor', category: 'Resistor', price: 13.75, imageGroup: 'RES' },
  { manufacturer: 'Panasonic', partNumber: 'ERJ2GEJ561X', spec: '560Ω ±5% 0402', componentType: 'Thick Film Resistor', category: 'Resistor', price: 8.1, imageGroup: 'RES' },
  { manufacturer: 'Panasonic', partNumber: 'ERJ3GEYJ104V', spec: '100KΩ ±5% 0603', componentType: 'Thick Film Resistor', category: 'Resistor', price: 8.3, imageGroup: 'RES' },
  { manufacturer: 'Panasonic', partNumber: 'ERJ-S06F1333V', spec: '133KΩ ±1%', componentType: 'Anti-Sulfur Thick Film Resistor', category: 'Resistor', price: 16.5, imageGroup: 'RES' },
  { manufacturer: 'Panasonic', partNumber: 'ERJ2RKF3482X', spec: '34.8KΩ ±1% 0402', componentType: 'Thick Film Resistor', category: 'Resistor', price: 8.2, imageGroup: 'RES' },
  { manufacturer: 'Samsung Electro-Mechanics', partNumber: 'CL05B472KB5VPNC', spec: '4.7NF 50V X7R 0402', componentType: 'MLCC Capacitor', category: 'Capacitor', price: 8.7, imageGroup: 'CAP' },
  { manufacturer: 'Samsung Electro-Mechanics', partNumber: 'CL31B106KBHNNNE', spec: '10UF 50V X7R 1206', componentType: 'MLCC Capacitor', category: 'Capacitor', price: 15.25, imageGroup: 'CAP' },
  { manufacturer: 'Samsung Electro-Mechanics', partNumber: 'CL21A226KOQNNNG', spec: '22UF 16V X5R 0805', componentType: 'MLCC Capacitor', category: 'Capacitor', price: 13.9, imageGroup: 'CAP' },
  { manufacturer: 'Samsung Electro-Mechanics', partNumber: 'CL21Y105KCYVPNE', spec: '1UF 100V X7S 0805', componentType: 'MLCC Capacitor', category: 'Capacitor', price: 14.1, imageGroup: 'CAP' },
  { manufacturer: 'Samsung Electro-Mechanics', partNumber: 'CL03A105KP3NSNC', spec: '1UF 0201', componentType: 'MLCC Capacitor', category: 'Capacitor', price: 11.5, imageGroup: 'CAP' },
  { manufacturer: 'Samsung Electro-Mechanics', partNumber: 'CL21B104KBCNNNC', spec: '0.1UF 50V X7R 0805', componentType: 'MLCC Capacitor', category: 'Capacitor', price: 9.4, imageGroup: 'CAP' },
  { manufacturer: 'Walsin', partNumber: '0201N4R7B500CT', spec: '4.7PF 50V C0G 0201', componentType: 'MLCC Capacitor', category: 'Capacitor', price: 7.9, imageGroup: 'CAP' },
  { manufacturer: 'Walsin', partNumber: '1206B475K250CT', spec: '4.7UF 25V X7R 1206', componentType: 'MLCC Capacitor', category: 'Capacitor', price: 15.75, imageGroup: 'CAP' },
  { manufacturer: 'Walsin', partNumber: '0402B104K160CT', spec: '0.1UF 16V X7R 0402', componentType: 'MLCC Capacitor', category: 'Capacitor', price: 8.6, imageGroup: 'CAP' },
  { manufacturer: 'Walsin', partNumber: '0603B474J160CT', spec: '0.47UF 16V X7R 0603', componentType: 'MLCC Capacitor', category: 'Capacitor', price: 10.25, imageGroup: 'CAP' },
  { manufacturer: 'Walsin', partNumber: '0805B104K201CT', spec: '0.1UF 200V X7R 0805', componentType: 'MLCC Capacitor', category: 'Capacitor', price: 16.9, imageGroup: 'CAP' },
  { manufacturer: 'Walsin', partNumber: 'WLBD1608HCU601TH', spec: '600Ω @100MHz 1608', componentType: 'Ferrite Bead', category: 'Inductor', price: 9.9, imageGroup: 'IND' },
  { manufacturer: 'Walsin', partNumber: 'WR06X363-JTL', spec: '36KΩ ±5% 0603', componentType: 'Thick Film Resistor', category: 'Resistor', price: 8.15, imageGroup: 'RES' },
  { manufacturer: 'Walsin', partNumber: 'WR08X121-JTL', spec: '120Ω ±5% 0805', componentType: 'Thick Film Resistor', category: 'Resistor', price: 8.05, imageGroup: 'RES' },
];

// ---------------------------------------------------------------------------
// SILVER — 5 logic/protection ICs.
// ---------------------------------------------------------------------------
const SILVER: CatalogEntry[] = [
  { manufacturer: 'Texas Instruments', partNumber: 'CD74HCT00M96', spec: 'Quad 2-Input', componentType: 'NAND Gate', category: 'Logic IC', price: 165.0, imageGroup: 'LOG' },
  { manufacturer: 'Texas Instruments', partNumber: 'SN74AUP1G08DCKT', spec: 'Single 2-Input, Ultra-Low-Power', componentType: 'AND Gate', category: 'Logic IC', price: 172.5, imageGroup: 'LOG' },
  { manufacturer: 'Texas Instruments', partNumber: 'TPD1E10B06DPYR', spec: 'Single-Channel', componentType: 'ESD Protection Diode', category: 'Protection IC', price: 158.0, imageGroup: 'PRO' },
  { manufacturer: 'Texas Instruments', partNumber: 'TPD4E001QDBVRQ1', spec: '4-Channel, Automotive-Grade', componentType: 'ESD Protection Array', category: 'Protection IC', price: 189.0, imageGroup: 'PRO' },
  { manufacturer: 'Texas Instruments', partNumber: 'SN74F283N', spec: '4-Bit Binary', componentType: 'Full Adder', category: 'Logic IC', price: 198.5, imageGroup: 'LOG' },
];

// ---------------------------------------------------------------------------
// GOLD — 5 analog/interface ICs.
// ---------------------------------------------------------------------------
const GOLD: CatalogEntry[] = [
  { manufacturer: 'Texas Instruments', partNumber: 'CD4046BE', spec: 'CMOS Micropower', componentType: 'Phase-Locked Loop', category: 'Analog IC', price: 445.0, imageGroup: 'ANA' },
  { manufacturer: 'Texas Instruments', partNumber: 'TL074IDE4', spec: 'Quad JFET-Input', componentType: 'Operational Amplifier', category: 'Analog IC', price: 468.0, imageGroup: 'ANA' },
  { manufacturer: 'Texas Instruments', partNumber: 'LM361MX-NOPB', spec: 'High-Speed Differential', componentType: 'Voltage Comparator', category: 'Analog IC', price: 512.0, imageGroup: 'ANA' },
  { manufacturer: 'Texas Instruments', partNumber: 'PCA9306TDCURQ1', spec: 'Dual-Bit I2C-Bus, Automotive-Grade', componentType: 'Voltage-Level Translator', category: 'Interface IC', price: 549.0, imageGroup: 'ITF' },
  { manufacturer: 'Texas Instruments', partNumber: 'SN75158DR', spec: 'RS-422/RS-423 Quad', componentType: 'Line Driver', category: 'Interface IC', price: 610.0, imageGroup: 'ITF' },
];

// ---------------------------------------------------------------------------
// PLATINUM — 5 high-complexity ICs.
// ---------------------------------------------------------------------------
const PLATINUM: CatalogEntry[] = [
  { manufacturer: 'Texas Instruments', partNumber: 'TMP117NAIDRVR', spec: '±0.1°C High-Accuracy', componentType: 'Digital Temperature Sensor', category: 'Sensor IC', price: 945.0, imageGroup: 'SEN' },
  { manufacturer: 'Texas Instruments', partNumber: 'TPS54061DRBR', spec: '60V Input, 100mA Synchronous', componentType: 'Step-Down Converter', category: 'Power IC', price: 1085.0, imageGroup: 'PWR' },
  { manufacturer: 'FTDI', partNumber: 'FT232RL-REEL', spec: 'USB to UART', componentType: 'Serial Interface IC', category: 'Interface IC', price: 1180.0, imageGroup: 'ITF' },
  { manufacturer: 'Texas Instruments', partNumber: 'SRC4382IPFBR', spec: 'Stereo, 24-Bit', componentType: 'Audio Sample Rate Converter', category: 'Audio IC', price: 1340.0, imageGroup: 'ANA' },
  { manufacturer: 'Texas Instruments', partNumber: 'TMS320C6416TBGLZA8', spec: 'Fixed-Point', componentType: 'Digital Signal Processor', category: 'DSP', price: 1550.0, imageGroup: 'DSP' },
];

const TIER_BANDS: { tier: Tier; entries: CatalogEntry[] }[] = [
  { tier: 'Bronze', entries: BRONZE },
  { tier: 'Silver', entries: SILVER },
  { tier: 'Gold', entries: GOLD },
  { tier: 'Platinum', entries: PLATINUM },
];

export interface WorkbenchCatalogProduct {
  displayOrder: number;
  name: string;
  category: string;
  reward: number;
  cost: number;
  price: number;
  tierEligibility: Tier;
  imageUrl: string;
  isActive: boolean;
}

// The complete, real, verified 55-product Workbench catalog — exactly 40
// Bronze + 5 Silver + 5 Gold + 5 Platinum, matching the fixed cumulative
// band sizes in config/simulation.ts's production defaults
// (SIMULATION_*_ORDER_BAND). displayOrder is assigned purely by position in
// this list (1-55), never derived from catalog size elsewhere.
export function buildWorkbenchCatalog(): WorkbenchCatalogProduct[] {
  const products: WorkbenchCatalogProduct[] = [];
  let displayOrder = 0;
  for (const { tier, entries } of TIER_BANDS) {
    for (const entry of entries) {
      displayOrder += 1;
      products.push({
        displayOrder,
        name: buildName(entry),
        category: entry.category,
        // reward/cost predate the workbench redesign and are never used for
        // commission math (see order.service.ts) — kept small and roughly
        // tier-scaled purely so the legacy /api/products list still shows
        // sane, non-zero values.
        reward: Math.round(entry.price * 0.01 * 100) / 100 || 0.5,
        cost: Math.round(entry.price * 0.003 * 100) / 100 || 0.2,
        price: entry.price,
        tierEligibility: tier,
        imageUrl: buildImageUrl(entry.imageGroup),
        isActive: true,
      });
    }
  }
  return products;
}

export function asPrismaCreateInput(product: WorkbenchCatalogProduct): Prisma.ProductCreateInput {
  return {
    displayOrder: product.displayOrder,
    name: product.name,
    category: product.category,
    reward: product.reward,
    cost: product.cost,
    price: product.price,
    tierEligibility: product.tierEligibility,
    imageUrl: product.imageUrl,
    isActive: product.isActive,
  };
}

// The actual DB-writing half of the seed — shared by prisma/seed.ts
// (production) and the automated test suite (tests/workbenchCatalog.test.ts),
// so what's tested is the exact same code that runs in production, not a
// re-implementation of it. Upserts by displayOrder (a unique column):
// running this any number of times never creates duplicates, never deletes
// a row, and preserves every existing row's id (and therefore any
// historical TaskSubmission referencing it) — only the listed fields are
// overwritten in place.
export async function seedWorkbenchCatalog(
  client: Pick<PrismaClient, 'product'>
): Promise<WorkbenchCatalogProduct[]> {
  const products = buildWorkbenchCatalog();
  for (const product of products) {
    const data = asPrismaCreateInput(product);
    await client.product.upsert({
      where: { displayOrder: product.displayOrder },
      update: data,
      create: data,
    });
  }
  return products;
}
