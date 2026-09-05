/**
 * Representative job titles for each activity sector.
 *
 * Editorial reference content, not live data: it tells a visitor what kind of
 * work exists in a domain even when nothing is currently posted there. Kept
 * frontend-side and keyed by the JobCategory `slug`, matching how the sector
 * icon, photo and translated label are already handled — the database stays
 * the source of truth for which domains exist and how many real openings
 * each one has.
 *
 * To add a domain here, use the same slug seeded in
 * prisma/migrations/20260902090000_seed_job_categories.
 */
export interface DomainRoles {
  fr: string[];
  ar: string[];
}

export const DOMAIN_ROLES: Record<string, DomainRoles> = {
  it: {
    fr: [
      'Développeur Full Stack',
      'Ingénieur DevOps',
      'Administrateur systèmes & réseaux',
      'Data Analyst',
      'Ingénieur cybersécurité',
      'Chef de projet IT',
      'Designer UI/UX',
      'Technicien support informatique',
    ],
    ar: [
      'مطور full stack',
      'مهندس DevOps',
      'مسؤول الأنظمة والشبكات',
      'محلل بيانات',
      'مهندس أمن سيبراني',
      'مدير مشاريع تقنية',
      'مصمم واجهات UI/UX',
      'تقني دعم معلوماتي',
    ],
  },
  health: {
    fr: [
      'Médecin généraliste',
      'Infirmier(ère) diplômé(e)',
      'Pharmacien(ne)',
      'Technicien de laboratoire',
      'Sage-femme',
      'Kinésithérapeute',
      'Aide-soignant(e)',
      'Responsable qualité santé',
    ],
    ar: [
      'طبيب عام',
      'ممرض(ة) مجاز(ة)',
      'صيدلي(ة)',
      'تقني مخبر',
      'قابلة',
      'أخصائي علاج طبيعي',
      'مساعد(ة) تمريض',
      'مسؤول جودة صحية',
    ],
  },
  finance: {
    fr: [
      'Comptable',
      'Contrôleur de gestion',
      'Chargé de clientèle bancaire',
      'Auditeur financier',
      'Analyste crédit',
      'Responsable financier',
      'Conseiller en assurance',
      'Trésorier',
    ],
    ar: [
      'محاسب',
      'مراقب تسيير',
      'مكلف بالزبائن البنكيين',
      'مدقق مالي',
      'محلل قروض',
      'مسؤول مالي',
      'مستشار تأمينات',
      'أمين خزينة',
    ],
  },
  construction: {
    fr: [
      'Ingénieur génie civil',
      'Conducteur de travaux',
      'Architecte',
      'Chef de chantier',
      'Métreur / Économiste de la construction',
      'Topographe',
      'Électricien bâtiment',
      'Responsable HSE',
    ],
    ar: [
      'مهندس هندسة مدنية',
      'مسير أشغال',
      'مهندس معماري',
      'رئيس ورشة',
      'مقتصد في البناء',
      'مساح طبوغرافي',
      'كهربائي بناء',
      'مسؤول الوقاية والأمن',
    ],
  },
  education: {
    fr: [
      'Enseignant(e)',
      'Formateur professionnel',
      'Professeur de langues',
      'Conseiller d’orientation',
      'Directeur d’établissement',
      'Assistant pédagogique',
      'Concepteur de formation',
      'Surveillant scolaire',
    ],
    ar: [
      'أستاذ(ة)',
      'مكوّن مهني',
      'أستاذ لغات',
      'مستشار توجيه',
      'مدير مؤسسة تعليمية',
      'مساعد بيداغوجي',
      'مصمم برامج تكوين',
      'مشرف تربوي',
    ],
  },
  tourism: {
    fr: [
      'Réceptionniste d’hôtel',
      'Chef de cuisine',
      'Serveur / Serveuse',
      'Agent de voyage',
      'Guide touristique',
      'Responsable hébergement',
      'Gouvernante d’étage',
      'Chargé d’événementiel',
    ],
    ar: [
      'مستقبل في فندق',
      'رئيس طباخين',
      'نادل / نادلة',
      'وكيل أسفار',
      'مرشد سياحي',
      'مسؤول الإقامة',
      'مشرفة طوابق',
      'مكلف بالتنظيم والفعاليات',
    ],
  },
  industry: {
    fr: [
      'Technicien de maintenance',
      'Ingénieur production',
      'Responsable qualité',
      'Opérateur de production',
      'Ingénieur méthodes',
      'Responsable logistique',
      'Électromécanicien',
      'Responsable HSE industriel',
    ],
    ar: [
      'تقني صيانة',
      'مهندس إنتاج',
      'مسؤول الجودة',
      'عامل إنتاج',
      'مهندس مناهج',
      'مسؤول اللوجستيك',
      'كهروميكانيكي',
      'مسؤول الوقاية الصناعية',
    ],
  },
  commerce: {
    fr: [
      'Commercial terrain',
      'Responsable de magasin',
      'Chargé de marketing digital',
      'Community Manager',
      'Chef de produit',
      'Vendeur(se)',
      'Responsable achats',
      'Chargé de relation client',
    ],
    ar: [
      'مندوب تجاري',
      'مسؤول محل',
      'مكلف بالتسويق الرقمي',
      'مسؤول وسائل التواصل',
      'مدير منتج',
      'بائع(ة)',
      'مسؤول المشتريات',
      'مكلف بعلاقات الزبائن',
    ],
  },
};

/** Roles for a domain in the active language; empty when the slug is unknown. */
export const getDomainRoles = (slug: string, language: 'fr' | 'ar'): string[] =>
  DOMAIN_ROLES[slug]?.[language] ?? [];
