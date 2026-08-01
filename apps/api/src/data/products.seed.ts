/**
 * Catalogue de démarrage — unique source de vérité du catalogue.
 *
 * Conventions :
 *  - `price`    : prix effectivement payé aujourd'hui.
 *  - `oldPrice` : ancien prix barré, TOUJOURS supérieur à `price`.
 *  - `flags`    : vocabulaire fermé, cf. PRODUCT_FLAGS ci-dessous.
 */

export const PRODUCT_FLAGS = [
  'bestseller',
  'new',
  'promo',
  'pack',
  'chaine-froid',
  'retrait-uniquement',
  'ordonnance',
] as const;

export type ProductFlag = (typeof PRODUCT_FLAGS)[number];

export type ProductSeed = {
  id: string;
  slug: string;
  cat: { fr: string; en: string };
  name: { fr: string; en: string };
  price: number;
  oldPrice?: number;
  flags: ProductFlag[];
  delay: string;
  rating: number;
  reviews: number;
  desc: { fr: string; en: string };
  variants: Record<string, string[]>;
  images: string[];
  poids_kg: number;
  est_fragile: boolean;
  necessite_chaine_froid: boolean;
  livraison_autorisee: boolean;
  necessite_ordonnance: boolean;
};

export const PRODUCT_SEED: ProductSeed[] = [
  {
    id: 'p1',
    slug: 'concentrateur-oxygene-portable',
    cat: { fr: 'Respiratoire', en: 'Respiratory' },
    name: { fr: "Concentrateur d'oxygène portable", en: 'Portable oxygen concentrator' },
    price: 180000,
    oldPrice: 220000,
    flags: ['promo'],
    delay: '2-3 jours',
    rating: 4.7,
    reviews: 38,
    desc: {
      fr: "Concentrateur d'oxygène compact pour usage à domicile, facile à transporter. Débit réglable de 1 à 5 L/min.",
      en: 'Compact oxygen concentrator for home use, easy to transport. Adjustable flow from 1 to 5 L/min.',
    },
    variants: {},
    images: ['/products/p1.svg'],
    poids_kg: 12,
    est_fragile: true,
    necessite_chaine_froid: false,
    livraison_autorisee: true,
    necessite_ordonnance: true,
  },
  {
    id: 'p2',
    slug: 'moniteur-signes-vitaux',
    cat: { fr: 'Diagnostic', en: 'Diagnostics' },
    name: { fr: 'Moniteur de signes vitaux', en: 'Vital signs monitor' },
    price: 95000,
    flags: ['new'],
    delay: '1-2 jours',
    rating: 4.5,
    reviews: 24,
    desc: {
      fr: 'Moniteur tout-en-un avec ECG, tension artérielle et saturation SpO2. Écran couleur 8 pouces.',
      en: 'All-in-one monitor with ECG, blood pressure and SpO2 saturation. 8-inch color screen.',
    },
    variants: {},
    images: ['/products/p2.svg'],
    poids_kg: 4,
    est_fragile: true,
    necessite_chaine_froid: false,
    livraison_autorisee: true,
    necessite_ordonnance: false,
  },
  {
    id: 'p3',
    slug: 'fauteuil-roulant-electrique',
    cat: { fr: 'Mobilité', en: 'Mobility' },
    name: { fr: 'Fauteuil roulant électrique', en: 'Electric wheelchair' },
    price: 280000,
    oldPrice: 320000,
    flags: ['bestseller', 'promo'],
    delay: '3-5 jours',
    rating: 4.8,
    reviews: 16,
    desc: {
      fr: 'Fauteuil roulant motorisé léger avec autonomie longue durée, accoudoirs amovibles et dossier inclinable.',
      en: 'Lightweight powered wheelchair with long-range battery, removable armrests and reclining backrest.',
    },
    variants: { size: ['Standard', 'Large'] },
    images: ['/products/p3.svg'],
    poids_kg: 45,
    est_fragile: false,
    necessite_chaine_froid: false,
    livraison_autorisee: true,
    necessite_ordonnance: false,
  },
  {
    id: 'p4',
    slug: 'masques-chirurgicaux-boite-50',
    cat: { fr: 'Hygiène', en: 'Hygiene' },
    name: { fr: 'Masques chirurgicaux (boîte de 50)', en: 'Surgical masks (box of 50)' },
    price: 16000,
    flags: ['bestseller'],
    delay: '24h',
    rating: 4.3,
    reviews: 52,
    desc: {
      fr: 'Boîte de 50 masques chirurgicaux stériles type IIR pour usage quotidien.',
      en: 'Box of 50 sterile type IIR surgical masks for daily use.',
    },
    variants: {},
    images: ['/products/p4.svg'],
    poids_kg: 0.5,
    est_fragile: false,
    necessite_chaine_froid: false,
    livraison_autorisee: true,
    necessite_ordonnance: false,
  },
  {
    id: 'p5',
    slug: 'boite-refrigerante-insuline-vaccins',
    cat: { fr: 'Chaîne du froid', en: 'Cold chain' },
    name: {
      fr: 'Boîte réfrigérante insuline / vaccins',
      en: 'Insulin / vaccine cool box',
    },
    price: 25000,
    oldPrice: 30000,
    flags: ['promo', 'chaine-froid'],
    delay: '24h',
    rating: 4.8,
    reviews: 12,
    desc: {
      fr: "Boîte isotherme pour le transport sécurisé d'insuline ou de vaccins, maintien 2-8 °C pendant 24h.",
      en: 'Isothermal box for the secure transport of insulin or vaccines, holds 2-8 °C for 24h.',
    },
    variants: {},
    images: ['/products/p5.svg'],
    poids_kg: 2,
    est_fragile: false,
    necessite_chaine_froid: true,
    livraison_autorisee: true,
    necessite_ordonnance: false,
  },
  {
    id: 'p6',
    slug: 'stethoscope-cardiologie-littmann',
    cat: { fr: 'Diagnostic', en: 'Diagnostics' },
    name: {
      fr: 'Stéthoscope de cardiologie 3M Littmann',
      en: '3M Littmann cardiology stethoscope',
    },
    price: 85000,
    flags: ['retrait-uniquement'],
    delay: 'retrait direct',
    rating: 4.9,
    reviews: 24,
    desc: {
      fr: 'Stéthoscope professionnel haute sensibilité, double pavillon. Retrait obligatoire en boutique (contrôle du numéro de série).',
      en: 'High-sensitivity professional stethoscope, dual head. In-store pickup mandatory (serial number check).',
    },
    variants: { color: ['Noir', 'Bordeaux'] },
    images: ['/products/p6.svg'],
    poids_kg: 1.5,
    est_fragile: true,
    necessite_chaine_froid: false,
    livraison_autorisee: false,
    necessite_ordonnance: false,
  },
  {
    id: 'p7',
    slug: 'tensiometre-digital-automatique',
    cat: { fr: 'Diagnostic', en: 'Diagnostics' },
    name: {
      fr: 'Tensiomètre digital automatique',
      en: 'Automatic digital blood pressure monitor',
    },
    price: 21000,
    oldPrice: 25000,
    flags: ['bestseller', 'promo'],
    delay: '24-48h',
    rating: 4.6,
    reviews: 23,
    desc: {
      fr: 'Mesure automatique au bras, écran large, mémoire de 60 lectures. Idéal pour un suivi à domicile.',
      en: 'Automatic upper-arm measurement, large screen, 60-reading memory. Ideal for home monitoring.',
    },
    variants: { color: ['Blanc', 'Gris'] },
    images: ['/products/p7.svg'],
    poids_kg: 0.8,
    est_fragile: true,
    necessite_chaine_froid: false,
    livraison_autorisee: true,
    necessite_ordonnance: false,
  },
  {
    id: 'p8',
    slug: 'oxymetre-de-pouls',
    cat: { fr: 'Diagnostic', en: 'Diagnostics' },
    name: { fr: 'Oxymètre de pouls', en: 'Pulse oximeter' },
    price: 8000,
    flags: ['bestseller'],
    delay: '24-48h',
    rating: 4.7,
    reviews: 88,
    desc: {
      fr: "Mesure la saturation en oxygène et le pouls en quelques secondes via le bout du doigt.",
      en: 'Measures oxygen saturation and pulse in seconds via the fingertip.',
    },
    variants: { color: ['Bleu', 'Noir'] },
    images: ['/products/p8.svg'],
    poids_kg: 0.2,
    est_fragile: true,
    necessite_chaine_froid: false,
    livraison_autorisee: true,
    necessite_ordonnance: false,
  },
  {
    id: 'p9',
    slug: 'thermometre-infrarouge-sans-contact',
    cat: { fr: 'Diagnostic', en: 'Diagnostics' },
    name: {
      fr: 'Thermomètre infrarouge sans contact',
      en: 'Contactless infrared thermometer',
    },
    price: 12000,
    flags: ['new'],
    delay: '24-48h',
    rating: 4.8,
    reviews: 41,
    desc: {
      fr: 'Mesure de température frontale en 1 seconde, sans contact, adaptée à toute la famille.',
      en: '1-second forehead temperature reading, contactless, suitable for the whole family.',
    },
    variants: {},
    images: ['/products/p9.svg'],
    poids_kg: 0.3,
    est_fragile: true,
    necessite_chaine_froid: false,
    livraison_autorisee: true,
    necessite_ordonnance: false,
  },
  {
    id: 'p10',
    slug: 'lit-medicalise-electrique',
    cat: { fr: 'Mobilité', en: 'Mobility' },
    name: { fr: 'Lit médicalisé électrique', en: 'Electric medical bed' },
    price: 350000,
    flags: [],
    delay: '72h',
    rating: 4.5,
    reviews: 6,
    desc: {
      fr: 'Lit médicalisé à réglage électrique 3 sections, barrières de sécurité incluses, pour soins à domicile.',
      en: '3-section electrically adjustable medical bed with safety rails, for home care.',
    },
    variants: {},
    images: ['/products/p10.svg'],
    poids_kg: 90,
    est_fragile: false,
    necessite_chaine_froid: false,
    livraison_autorisee: true,
    necessite_ordonnance: false,
  },
  {
    id: 'pack-cabinet',
    slug: 'pack-cabinet-medical',
    cat: { fr: 'Packs médicaux', en: 'Medical packs' },
    name: {
      fr: 'Pack cabinet médical (tensiomètre + oxymètre + thermomètre)',
      en: 'Medical practice pack (monitor + oximeter + thermometer)',
    },
    price: 38000,
    oldPrice: 45000,
    flags: ['pack', 'promo', 'bestseller'],
    delay: '24h',
    rating: 4.8,
    reviews: 29,
    desc: {
      fr: 'Équipez votre cabinet : tensiomètre digital automatique, oxymètre de pouls et thermomètre infrarouge sans contact.',
      en: 'Equip your practice: automatic blood pressure monitor, pulse oximeter and contactless infrared thermometer.',
    },
    variants: {},
    images: ['/products/pack-cabinet.svg'],
    poids_kg: 1.3,
    est_fragile: true,
    necessite_chaine_froid: false,
    livraison_autorisee: true,
    necessite_ordonnance: false,
  },
  {
    id: 'pack-secours',
    slug: 'pack-secours-urgence',
    cat: { fr: 'Packs médicaux', en: 'Medical packs' },
    name: { fr: "Pack secours d'urgence", en: 'Emergency & rescue pack' },
    price: 20000,
    oldPrice: 25000,
    flags: ['pack', 'promo'],
    delay: '24h',
    rating: 4.7,
    reviews: 9,
    desc: {
      fr: "Trousse de premiers secours complète pour véhicule et maison, avec tensiomètre manuel de secours.",
      en: 'Complete first aid kit for vehicle and home, with a manual backup blood pressure monitor.',
    },
    variants: {},
    images: ['/products/pack-secours.svg'],
    poids_kg: 2.5,
    est_fragile: false,
    necessite_chaine_froid: false,
    livraison_autorisee: true,
    necessite_ordonnance: false,
  },
];
