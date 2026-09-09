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
