export const WILAYAS = [
  "01 - Adrar", "02 - Chlef", "03 - Laghouat", "04 - Oum El Bouaghi", "05 - Batna",
  "06 - Béjaïa", "07 - Biskra", "08 - Béchar", "09 - Blida", "10 - Bouira",
  "11 - Tamanrasset", "12 - Tébessa", "13 - Tlemcen", "14 - Tiaret", "15 - Tizi Ouzou",
  "16 - Alger", "17 - Djelfa", "18 - Jijel", "19 - Sétif", "20 - Saïda",
  "21 - Skikda", "22 - Sidi Bel Abbès", "23 - Annaba", "24 - Guelma", "25 - Constantine",
  "26 - Médéa", "27 - Mostaganem", "28 - M'Sila", "29 - Mascara", "30 - Ouargla",
  "31 - Oran", "32 - El Bayadh", "33 - Illizi", "34 - Bordj Bou Arreridj", "35 - Boumerdès",
  "36 - El Tarf", "37 - Tindouf", "38 - Tissemsilt", "39 - El Oued", "40 - Khenchela",
  "41 - Souk Ahras", "42 - Tipaza", "43 - Mila", "44 - Aïn Defla", "45 - Naâma",
  "46 - Aïn Témouchent", "47 - Ghardaïa", "48 - Relizane", "49 - El M'Ghair", "50 - El Meniaa",
  "51 - Ouled Djellal", "52 - Bordj Baji Mokhtar", "53 - Béni Abbès", "54 - Timimoun",
  "55 - Touggourt", "56 - Djanet", "57 - In Salah", "58 - In Guezzam"
];

export const JOB_KEYWORDS = [
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "UI/UX Designer",
  "Project Manager",
  "Accountant",
  "Sales Representative",
  "Civil Engineer",
  "Doctor",
  "Teacher",
  "Community Manager",
  "Marketing Manager",
  "Maintenance Technician",
  "Driver",
  "Security Guard",
  "Architect",
  "Pharmacist",
  "Lawyer",
  "Nurse",
  "Electrician",
  "Plumber",
  "Mechanic"
];

/**
 * Industry sectors offered on the company profile.
 *
 * A fixed list rather than free text so companies are comparable and can be
 * filtered later — the field was previously an open input pre-filled with
 * "Technologie", which every company inherited.
 */
export const COMPANY_SECTORS = [
  "Agriculture & Agroalimentaire",
  "Architecture & Urbanisme",
  "Artisanat",
  "Assurance",
  "Automobile",
  "Banque & Finance",
  "BTP & Construction",
  "Commerce & Distribution",
  "Conseil & Audit",
  "Éducation & Formation",
  "Énergie & Mines",
  "Environnement",
  "Hôtellerie & Restauration",
  "Immobilier",
  "Import / Export",
  "Industrie & Manufacture",
  "Informatique & Technologie",
  "Juridique",
  "Logistique & Transport",
  "Marketing & Communication",
  "Médias & Culture",
  "ONG & Associations",
  "Pharmaceutique",
  "Santé & Médical",
  "Secteur public",
  "Sécurité",
  "Services aux entreprises",
  "Télécommunications",
  "Textile & Habillement",
  "Tourisme & Loisirs",
  "Autre",
] as const;

/** Company headcount bands, stored as the label shown. */
export const COMPANY_SIZES = [
  "1-10 employés",
  "11-50 employés",
  "51-200 employés",
  "201-500 employés",
  "501+ employés",
] as const;

/**
 * Pay-per-posting packs, an alternative to a subscription.
 *
 * The unit price falls as the pack grows, which is the point of buying one —
 * the saving is shown so the recruiter can see it rather than work it out.
 */
export interface AnnoncePack {
  id: string;
  jobs: number;
  price: number;
  /** Shown as the headline figure; the raw number is used for the total. */
  label: string;
}

export const ANNONCE_PACKS: AnnoncePack[] = [
  { id: 'pack-1', jobs: 1, price: 5900, label: '5 900' },
  { id: 'pack-2', jobs: 2, price: 11000, label: '11 000' },
  { id: 'pack-5', jobs: 5, price: 25000, label: '25 000' },
  { id: 'pack-10', jobs: 10, price: 45000, label: '45 000' },
];

/** Price of one posting inside a pack, for the "saving" badge. */
export const packUnitPrice = (pack: AnnoncePack) => Math.round(pack.price / pack.jobs);

/** How much cheaper per posting than buying singles, as a percentage. */
export const packSavingPercent = (pack: AnnoncePack) => {
  const single = ANNONCE_PACKS[0].price;
  if (pack.jobs === 1) return 0;
  return Math.round((1 - packUnitPrice(pack) / single) * 100);
};
