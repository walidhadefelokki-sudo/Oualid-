import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Crown, Check, ArrowRight, X } from 'lucide-react';

export type RecruiterTier = 'free' | 'paid' | 'corporate';

interface SubscriptionBannerProps {
  tier: RecruiterTier;
  language: 'fr' | 'ar' | 'en';
  /** Opens the subscription page. */
  onUpgrade: () => void;
  /**
   * Hides the banner on the subscription page itself — the plans are already
   * on screen there, and advertising them above their own cards is noise.
   */
  hidden?: boolean;
}

/**
 * How long a dismissal lasts.
 *
 * Not forever: a recruiter who closes this while busy should not lose sight of
 * the paid plans permanently. Not session-only either, which would put it back
 * on every page load and read as nagging. A week is long enough to be a real
 * dismissal and short enough that the offer comes back.
 */
const DISMISS_DAYS = 7;
const STORAGE_KEY = 'dl_subscription_banner_dismissed_until';

const readDismissedUntil = (): number => {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    // Private browsing and blocked site data both throw here. Showing the
    // banner is the safe default.
    return 0;
  }
};

/**
 * Promotes the next paid tier up from wherever the recruiter is now.
 *
 * Deliberately one step at a time: a free recruiter is sold Annonces, not
 * Corporate. Pitching the top plan to someone who has not paid at all reads as
 * an advert; pitching the next step reads as a suggestion, and it is the step
 * they are actually likely to take.
 *
 * Corporate recruiters see nothing — there is nothing left to sell them, and a
 * banner offering an upgrade they already have looks broken.
 */
export default function SubscriptionBanner({
  tier,
  language,
  onUpgrade,
  hidden = false,
}: SubscriptionBannerProps) {
  const [dismissedUntil, setDismissedUntil] = useState(readDismissedUntil);

  const isRTL = language === 'ar';
  const t = (fr: string, ar: string) => (isRTL ? ar : fr);

  const dismiss = () => {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    setDismissedUntil(until);
    try {
      localStorage.setItem(STORAGE_KEY, String(until));
    } catch {
      // Dismissal still applies for this session even if it cannot persist.
    }
  };

  if (hidden || tier === 'corporate' || Date.now() < dismissedUntil) return null;

  const promotingCorporate = tier === 'paid';

  const content = promotingCorporate
    ? {
        badge: t('Corporate', 'كوربوريت'),
        badgeIcon: <Crown size={12} className="shrink-0" />,
        title: t('Passez à Corporate', 'انتقل إلى كوربوريت'),
        pitch: t(
          'Publication illimitée, filtrage par IA Gemini, quiz, présentation orale et présélection automatique.',
          'نشر غير محدود، فرز بالذكاء الاصطناعي، اختبارات، عرض شفهي وانتقاء تلقائي.'
        ),
        features: [
          t('Publication illimitée', 'نشر غير محدود'),
          t('Filtrage par IA Gemini', 'فرز بالذكاء الاصطناعي'),
          t('Répertoire CV & Support', 'دليل السير الذاتية والدعم'),
        ],
        price: t('Sur mesure', 'حسب الطلب'),
        priceSuffix: '',
        cta: t('Contactez-nous', 'اتصل بنا'),
      }
    : {
        badge: t('Plus populaire', 'الأكثر شيوعًا'),
        badgeIcon: <Sparkles size={12} className="shrink-0" />,
        title: t('Passez à Annonces', 'انتقل إلى الإعلانات'),
        pitch: t(
          'Votre offre gratuite est limitée à une publication. Passez à Annonces pour publier sans limite et gérer votre équipe.',
          'عرضك المجاني محدود بإعلان واحد. انتقل إلى الإعلانات للنشر بلا حدود وإدارة فريقك.'
        ),
        features: [
          t("Publication d'offres payantes", 'نشر عروض مدفوعة'),
          t('Multi-comptes (Gestionnaire)', 'حسابات متعددة'),
          t('Candidatures illimitées', 'ترشيحات غير محدودة'),
        ],
        price: '5 900',
        priceSuffix: 'DA',
        cta: t('Choisir ce plan', 'اختر هذه الباقة'),
      };

  // Corporate keeps the navy-and-gold treatment it has on the home page and in
  // the plan chooser; the Annonces promotion keeps the orange accent. Reusing
  // the palettes means the banner reads as the same offer, not a new one.
  const shell = promotingCorporate
    ? 'bg-gradient-to-br from-[#0B1E3D] to-[#173E7D] border-[#D4AF37]/40'
    : 'bg-gradient-to-br from-white to-[#FFF6F1] border-[#F68D58]/40';

  const titleColor = promotingCorporate ? 'text-white' : 'text-[#173E7D]';
  const bodyColor = promotingCorporate ? 'text-white/70' : 'text-gray-500';
  const featureColor = promotingCorporate ? 'text-white/85' : 'text-gray-600';
  const checkColor = promotingCorporate ? 'text-[#D4AF37]' : 'text-[#F68D58]';

  const badgeStyle = promotingCorporate
    ? 'bg-gradient-to-r from-[#D4AF37] to-[#F0D989] text-[#0B1E3D]'
    : 'bg-[#F68D58] text-white';

  const buttonStyle = promotingCorporate
    ? 'bg-gradient-to-r from-[#D4AF37] to-[#F0D989] text-[#0B1E3D] hover:brightness-105 shadow-lg shadow-black/30'
    : 'bg-[#F68D58] text-white hover:bg-[#173E7D] shadow-lg shadow-orange-500/20';

  return (
    <AnimatePresence>
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.25 }}
        dir={isRTL ? 'rtl' : 'ltr'}
        aria-label={content.title}
        className={`relative overflow-hidden rounded-[2rem] border p-7 md:p-8 mb-8 ${shell}`}
      >
        <button
          onClick={dismiss}
          aria-label={t('Masquer', 'إخفاء')}
          className={`absolute top-5 w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
            isRTL ? 'left-5' : 'right-5'
          } ${
            promotingCorporate
              ? 'text-white/50 hover:text-white hover:bg-white/10'
              : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'
          }`}
        >
          <X size={16} />
        </button>

        <div
          className={`flex flex-col lg:flex-row lg:items-center gap-7 ${
            isRTL ? 'lg:flex-row-reverse' : ''
          }`}
        >
          <div className="flex-1 min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${badgeStyle}`}
            >
              {content.badgeIcon}
              {content.badge}
            </span>

            <h2 className={`text-2xl md:text-3xl font-display font-black tracking-tight mt-4 ${titleColor}`}>
              {content.title}
            </h2>

            <p className={`mt-2 max-w-xl font-medium leading-relaxed ${bodyColor}`}>
              {content.pitch}
            </p>

            <ul
              className={`flex flex-wrap gap-x-6 gap-y-2 mt-5 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              {content.features.map((feature) => (
                <li
                  key={feature}
                  className={`flex items-center gap-2 text-[13px] font-bold ${featureColor}`}
                >
                  <Check size={15} className={`shrink-0 ${checkColor}`} />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Price and CTA, kept together so the offer and the action read as
              one unit rather than two separate things on the same row. */}
          <div
            className={`shrink-0 flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-5 ${
              isRTL ? 'flex-row-reverse' : ''
            }`}
          >
            <div className={isRTL ? 'text-right' : 'lg:text-right'}>
              <p className={`text-3xl md:text-4xl font-display font-black leading-none ${titleColor}`}>
                {content.price}
                {content.priceSuffix && (
                  <span className={`text-base font-bold ${bodyColor} ml-1.5`}>
                    {content.priceSuffix}
                  </span>
                )}
              </p>
              {!promotingCorporate && (
                <p className={`text-[11px] font-bold uppercase tracking-widest mt-1.5 ${bodyColor}`}>
                  {t('Par offre', 'لكل عرض')}
                </p>
              )}
            </div>

            <button
              onClick={onUpgrade}
              className={`px-7 py-4 rounded-full font-black text-[13px] uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${buttonStyle}`}
            >
              {content.cta}
              <ArrowRight size={16} className={isRTL ? 'rotate-180' : ''} />
            </button>
          </div>
        </div>
      </motion.section>
    </AnimatePresence>
  );
}
