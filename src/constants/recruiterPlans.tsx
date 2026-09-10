import { motion } from 'motion/react';
import { Check, X, Sparkles, Crown, LayoutDashboard } from 'lucide-react';

/**
 * The recruiter plans, and the card that renders them.
 *
 * Extracted from App.tsx so the home page, the login form's demo chooser and
 * the dashboard's Abonnement page all draw the same cards from the same data.
 * They had drifted: the dashboard had its own hand-written markup listing
 * different plan names ("Annonces" against "Premium"), different features and
 * a different layout, so the plans a recruiter compared before signing up were
 * not the plans they saw once inside.
 */

export type RecruiterTier = 'free' | 'paid' | 'corporate';

export interface PlanFeature {
  label: string;
  included: boolean;
}

export interface RecruiterPlan {
  tier: RecruiterTier;
  name: string;
  nameAr: string;
  tagline: string;
  taglineAr: string;
  badge: string | null;
  badgeIcon: React.ReactNode;
  features: PlanFeature[];
  cta: string;
  ctaAr: string;
  accent: {
    cardBg: string;
    border: string;
    hoverBorder: string;
    badgeBg: string;
    button: string;
    icon: string;
    glow: string;
  };
}

export const RECRUITER_PLANS: RecruiterPlan[] = [
  {
    tier: 'free',
    name: 'Gratuit',
    nameAr: 'مجاني',
    tagline: 'Recruteur basique',
    taglineAr: 'حساب أساسي',
    badge: null,
    badgeIcon: null,
    features: [
      { label: 'Tableau de bord', included: true },
      { label: 'Publier des offres', included: true },
      { label: 'Gérer les offres', included: true },
      { label: 'Candidatures', included: true },
      { label: 'Filtre IA', included: false },
      { label: 'Répertoire de CV', included: false },
      { label: 'Quiz', included: false },
      { label: 'Présentation orale', included: false },
      { label: 'Présélection', included: false },
    ],
    cta: 'Explorer Gratuit',
    ctaAr: 'جرب المجاني',
    accent: {
      cardBg: 'bg-white',
      border: 'border-gray-200',
      hoverBorder: 'hover:border-gray-300',
      badgeBg: 'bg-gray-100 text-gray-500',
      button: 'bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-none',
      icon: 'text-gray-400',
      glow: '',
    },
  },
  {
    tier: 'paid',
    name: 'Premium',
    nameAr: 'بريميوم',
    tagline: 'Pour les recruteurs actifs',
    taglineAr: 'لأصحاب العمل النشطين',
    badge: 'Premium',
    badgeIcon: <Sparkles size={11} className="shrink-0" />,
    features: [
      { label: 'Tableau de bord', included: true },
      { label: 'Publier des offres', included: true },
      { label: 'Gérer les offres', included: true },
      { label: 'Candidatures', included: true },
      { label: 'Filtre IA', included: true },
      { label: 'Répertoire de CV', included: true },
      { label: 'Quiz', included: false },
      { label: 'Présentation orale', included: false },
      { label: 'Présélection', included: false },
    ],
    cta: 'Explorer Premium',
    ctaAr: 'جرب البريميوم',
    accent: {
      cardBg: 'bg-gradient-to-b from-[#EFF5FF] to-white',
      border: 'border-[#173E7D]/15',
      hoverBorder: 'hover:border-[#173E7D]/40',
      badgeBg: 'bg-[#173E7D] text-white',
      button: 'bg-[#173E7D] text-white hover:bg-[#F68D58] shadow-lg shadow-blue-900/20',
      icon: 'text-[#173E7D]',
      glow: 'shadow-[0_0_0_1px_rgba(23,62,125,0.06),0_20px_40px_-15px_rgba(23,62,125,0.25)]',
    },
  },
  {
    tier: 'corporate',
    name: 'Corporate',
    nameAr: 'كوربوريت',
    tagline: 'Suite de recrutement complète',
    taglineAr: 'الحل الكامل للتوظيف',
    badge: 'Corporate',
    badgeIcon: <Crown size={11} className="shrink-0" />,
    features: [
      { label: 'Tableau de bord', included: true },
      { label: 'Publier des offres', included: true },
      { label: 'Gérer les offres', included: true },
      { label: 'Candidatures', included: true },
      { label: 'Filtre IA', included: true },
      { label: 'Répertoire de CV', included: true },
      { label: 'Quiz', included: true },
      { label: 'Présentation orale', included: true },
      { label: 'Présélection', included: true },
    ],
    cta: 'Explorer Corporate',
    ctaAr: 'جرب كوربوريت',
    accent: {
      cardBg: 'bg-gradient-to-b from-[#0B1E3D] to-[#173E7D]',
      border: 'border-[#D4AF37]/40',
      hoverBorder: 'hover:border-[#D4AF37]/80',
      badgeBg: 'bg-gradient-to-r from-[#D4AF37] to-[#F0D989] text-[#0B1E3D]',
      button:
        'bg-gradient-to-r from-[#D4AF37] to-[#F0D989] text-[#0B1E3D] hover:brightness-105 shadow-lg shadow-black/30',
      icon: 'text-[#D4AF37]',
      glow: 'shadow-[0_0_0_1px_rgba(212,175,55,0.15),0_25px_50px_-15px_rgba(0,0,0,0.5)]',
    },
  },
];

// Commercial pricing shown on the home page only. Kept separate from
// RECRUITER_PLANS (which describes what each tier *does*) so the login form's
// demo chooser stays price-free.
export const HOME_PLAN_PRICING: Record<
  RecruiterTier,
  { price: string; suffix?: string; cta: string; ctaAr: string }
> = {
  free: { price: '0', suffix: 'DA', cta: 'Commencer', ctaAr: 'ابدأ الآن' },
  paid: { price: '5 900', suffix: 'DA', cta: 'Commencer', ctaAr: 'ابدأ الآن' },
  corporate: { price: 'Sur mesure', cta: 'Contactez-nous', ctaAr: 'اتصل بنا' },
};

// Used in two places, driven by the same RECRUITER_PLANS data so the two
// stay in sync: the compact plan chooser in the login form's recruiter demo,
// and the pricing section on the home page. The home page passes `price`
// and `ctaLabel` and sets size="lg"; the demo chooser passes neither.
export default function RecruiterPlanCard({
  plan,
  language,
  onSelect,
  price,
  priceSuffix,
  ctaLabel,
  featuredLabel,
  size = 'sm',
}: {
  plan: RecruiterPlan;
  language: 'fr' | 'ar';
  onSelect: (tier: RecruiterTier) => void;
  price?: string;
  priceSuffix?: string;
  ctaLabel?: string;
  featuredLabel?: string;
  size?: 'sm' | 'lg';
}) {
  const isCorporate = plan.tier === 'corporate';
  const isPaid = plan.tier === 'paid';
  const isLarge = size === 'lg';
  const textPrimary = isCorporate ? 'text-white' : 'text-[#173E7D]';
  const textSecondary = isCorporate ? 'text-white/60' : 'text-gray-400';

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={`relative flex flex-col rounded-[1.75rem] border ${plan.accent.border} ${plan.accent.hoverBorder} ${plan.accent.cardBg} ${plan.accent.glow} ${
        isLarge ? 'p-9 rounded-[2.25rem]' : 'p-6'
      } transition-colors duration-300 overflow-hidden`}
    >
      {featuredLabel && (
        <div className="absolute top-0 right-0 bg-[#F68D58] text-white px-4 py-1.5 rounded-bl-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-lg z-20">
          {featuredLabel}
        </div>
      )}
      {isCorporate && (
        <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[#D4AF37]/20 blur-3xl" />
      )}
      {isPaid && (
        <div className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-[#F68D58]/10 blur-3xl" />
      )}

      <div className="mb-4 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] ${plan.accent.badgeBg}`}
        >
          {plan.badgeIcon}
          {plan.badge ?? (language === 'fr' ? 'Standard' : 'أساسي')}
        </span>
        <LayoutDashboard size={16} className={plan.accent.icon} />
      </div>

      <h4 className={`font-display text-2xl font-black tracking-tighter ${textPrimary}`}>
        {language === 'fr' ? plan.name : plan.nameAr}
      </h4>
      <p className={`mt-1 text-xs font-medium ${textSecondary}`}>
        {language === 'fr' ? plan.tagline : plan.taglineAr}
      </p>

      {price && (
        <div className="mt-6 flex items-baseline gap-2">
          <span className={`font-display font-black tracking-tighter ${textPrimary} ${isLarge ? 'text-3xl sm:text-4xl lg:text-5xl' : 'text-2xl sm:text-3xl'}`}>
            {price}
          </span>
          {priceSuffix && (
            <span className={`font-bold uppercase tracking-widest ${textSecondary} ${isLarge ? 'text-base' : 'text-sm'}`}>
              {priceSuffix}
            </span>
          )}
        </div>
      )}

      <div className={`my-5 h-px w-full ${isCorporate ? 'bg-white/10' : 'bg-gray-100'}`} />

      <ul className="flex-1 space-y-2.5">
        {plan.features.map((feature) => (
          <li
            key={feature.label}
            className={`flex items-center gap-2.5 text-[12.5px] font-semibold ${
              feature.included
                ? isCorporate
                  ? 'text-white/90'
                  : 'text-gray-700'
                : isCorporate
                ? 'text-white/30'
                : 'text-gray-300'
            }`}
          >
            {feature.included ? (
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                  isCorporate
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
                    : isPaid
                    ? 'bg-[#173E7D]/10 text-[#173E7D]'
                    : 'bg-emerald-50 text-emerald-500'
                }`}
              >
                <Check size={11} strokeWidth={3} />
              </span>
            ) : (
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                  isCorporate ? 'bg-white/5' : 'bg-gray-50'
                }`}
              >
                <X size={10} strokeWidth={3} />
              </span>
            )}
            <span className={feature.included ? '' : 'line-through decoration-1'}>
              {feature.label}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan.tier)}
        className={`mt-6 w-full rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${
          isLarge ? 'py-5 rounded-2xl' : 'py-3'
        } ${plan.accent.button}`}
      >
        {ctaLabel ?? (language === 'fr' ? plan.cta : plan.ctaAr)}
      </button>
    </motion.div>
  );
}
