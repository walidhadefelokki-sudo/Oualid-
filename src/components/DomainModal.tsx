import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Briefcase, Clock, Building2, ChevronRight, AlertCircle, Search } from 'lucide-react';
import categoryService, { CategoryDetail, CategoryJob } from '../services/category.service';

interface DomainModalProps {
  /** Sector slug ("it", "health", …). Null closes the modal. */
  slug: string | null;
  /** Already-translated sector label, so the modal matches the card clicked. */
  label: string;
  language: 'fr' | 'ar';
  onClose: () => void;
}

// Backend JobType -> the wording used everywhere else in the product.
const TYPE_LABEL: Record<string, { fr: string; ar: string }> = {
  FULL_TIME: { fr: 'Temps plein', ar: 'دوام كامل' },
  PART_TIME: { fr: 'Temps partiel', ar: 'دوام جزئي' },
  CONTRACT: { fr: 'CDD', ar: 'عقد محدد' },
  FREELANCE: { fr: 'Freelance', ar: 'عمل حر' },
  INTERNSHIP: { fr: 'Stage', ar: 'تدريب' },
  TEMPORARY: { fr: 'Temporaire', ar: 'مؤقت' },
};

const formatSalary = (job: CategoryJob, isRTL: boolean) => {
  if (job.salaryMin == null && job.salaryMax == null) return null;
  const fmt = (n: number) => n.toLocaleString(isRTL ? 'ar-DZ' : 'fr-DZ');
  if (job.salaryMin != null && job.salaryMax != null) {
    return `${fmt(job.salaryMin)} – ${fmt(job.salaryMax)} ${job.currency}`;
  }
  return `${fmt((job.salaryMin ?? job.salaryMax)!)} ${job.currency}`;
};

export default function DomainModal({ slug, label, language, onClose }: DomainModalProps) {
  const isRTL = language === 'ar';
  const t = (fr: string, ar: string) => (isRTL ? ar : fr);

  const [data, setData] = useState<CategoryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reload whenever a different domain is opened. `cancelled` guards against a
  // slow response for a domain the user has already navigated away from
  // overwriting the one they are now looking at.
  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    categoryService
      .getCategory(slug)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        console.error('Failed to load domain:', err);
        if (!cancelled) {
          setError(t('Impossible de charger ce domaine.', 'تعذر تحميل هذا المجال.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Escape closes, matching the backdrop click.
  useEffect(() => {
    if (!slug) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slug, onClose]);

  return (
    <AnimatePresence>
      {slug && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[95] bg-[#0A1118]/50 backdrop-blur-sm flex items-start md:items-center justify-center p-4 md:p-8 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            dir={isRTL ? 'rtl' : 'ltr'}
            className="bg-white w-full max-w-3xl my-auto rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#173E7D] px-8 md:px-12 py-10 text-white relative">
              <button
                onClick={onClose}
                aria-label={t('Fermer', 'إغلاق')}
                className={`absolute top-6 w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center ${isRTL ? 'left-6' : 'right-6'}`}
              >
                <X size={20} />
              </button>

              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-200">
                {t('Domaine', 'المجال')}
              </p>
              <h2 className={`text-3xl md:text-4xl font-display font-black tracking-tight mt-2 ${isRTL ? 'text-right' : ''}`}>
                {label}
              </h2>

              {data?.category.description && (
                <p className="text-blue-100/80 mt-3 max-w-xl font-medium leading-relaxed">
                  {data.category.description}
                </p>
              )}

              <div className={`flex items-center gap-3 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="px-5 py-2 bg-white/10 border border-white/10 rounded-full text-xs font-black uppercase tracking-widest">
                  {loading
                    ? t('Chargement…', 'جار التحميل…')
                    : `${data?.category.jobCount ?? 0} ${t('offres disponibles', 'عرض متاح')}`}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 md:p-10 max-h-[55vh] overflow-y-auto">
              {loading && (
                <div className="py-16 flex flex-col items-center gap-4 text-gray-400">
                  <div className="w-10 h-10 border-4 border-gray-100 border-t-[#F68D58] rounded-full animate-spin" />
                  <p className="font-bold text-xs uppercase tracking-widest">
                    {t('Chargement des offres…', 'جار تحميل العروض…')}
                  </p>
                </div>
              )}

              {!loading && error && (
                <div className="py-16 flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-400 flex items-center justify-center">
                    <AlertCircle size={26} />
                  </div>
                  <p className="font-bold text-[#173E7D]">{error}</p>
                  <p className="text-sm text-gray-400 font-medium">
                    {t('Vérifiez votre connexion et réessayez.', 'تحقق من اتصالك وحاول مرة أخرى.')}
                  </p>
                </div>
              )}

              {!loading && !error && data && data.jobs.length === 0 && (
                <div className="py-16 flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-300 flex items-center justify-center">
                    <Search size={26} />
                  </div>
                  <p className="font-bold text-[#173E7D]">
                    {t('Aucune offre pour le moment', 'لا توجد عروض حاليًا')}
                  </p>
                  <p className="text-sm text-gray-400 font-medium max-w-sm">
                    {t(
                      'Ce domaine n’a pas encore d’offre publiée. Revenez bientôt, de nouvelles opportunités arrivent chaque semaine.',
                      'لا توجد عروض منشورة في هذا المجال بعد. عد قريبًا، تُضاف فرص جديدة كل أسبوع.'
                    )}
                  </p>
                </div>
              )}

              {!loading && !error && data && data.jobs.length > 0 && (
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">
                    {t('Opportunités récentes', 'أحدث الفرص')}
                  </p>

                  {data.jobs.map((job) => {
                    const salary = formatSalary(job, isRTL);
                    return (
                      <div
                        key={job.id}
                        className="p-6 rounded-[1.75rem] border border-gray-100 hover:border-[#173E7D]/30 hover:shadow-lg transition-all duration-300 bg-white group"
                      >
                        <div className={`flex items-start justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-start gap-4 min-w-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-12 h-12 shrink-0 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center text-[#173E7D]">
                              {job.company.logo?.url ? (
                                <img
                                  src={job.company.logo.url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <Building2 size={20} />
                              )}
                            </div>
                            <div className={`min-w-0 ${isRTL ? 'text-right' : ''}`}>
                              <h3 className="font-black text-[#173E7D] text-lg leading-snug group-hover:text-[#F68D58] transition-colors">
                                {job.title}
                              </h3>
                              <p className="text-sm text-gray-500 font-bold mt-0.5">{job.company.name}</p>
                            </div>
                          </div>

                          {job.featured && (
                            <span className="shrink-0 bg-[#F68D58] text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                              {t('À la une', 'مميز')}
                            </span>
                          )}
                        </div>

                        <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className="flex items-center gap-1.5">
                            <MapPin size={14} className="text-[#F68D58]" />
                            {job.wilaya || job.location}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Briefcase size={14} className="text-[#F68D58]" />
                            {TYPE_LABEL[job.type]?.[language] ?? job.type}
                          </span>
                          {job.remote && (
                            <span className="flex items-center gap-1.5">
                              <Clock size={14} className="text-[#F68D58]" />
                              {t('À distance', 'عن بعد')}
                            </span>
                          )}
                          {salary && <span className="text-[#173E7D]">{salary}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {!loading && !error && data && data.jobs.length > 0 && (
              <div className={`px-6 md:px-10 py-6 bg-gray-50 border-t border-gray-100 flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                <button
                  onClick={onClose}
                  className={`bg-[#173E7D] text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-[#F68D58] transition-all flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {t('Voir toutes les offres', 'عرض كل الوظائف')}
                  <ChevronRight size={16} className={isRTL ? 'rotate-180' : ''} />
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
