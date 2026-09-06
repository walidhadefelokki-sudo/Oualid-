import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle } from 'lucide-react';
import { getDomainRoles } from '../constants/domainRoles';

interface DomainModalProps {
  /** Sector slug ("it", "health", …). Null closes the modal. */
  slug: string | null;
  /** Already-translated sector label, so the modal matches the card clicked. */
  label: string;
  /** Sector description, already loaded with the categories on the page. */
  description?: string | null;
  language: 'fr' | 'ar';
  onClose: () => void;
}

/**
 * Explains one activity sector: what the field is, and the kind of roles it
 * contains.
 *
 * Deliberately shows no job listings. The roles below come from editorial
 * reference data, so the modal is equally useful for a sector with fifty open
 * positions and one with none — which is most of them today. Someone browsing
 * domains is orienting themselves, not shopping; the job list belongs in the
 * search results they go to next.
 */
export default function DomainModal({ slug, label, description, language, onClose }: DomainModalProps) {
  const isRTL = language === 'ar';
  const t = (fr: string, ar: string) => (isRTL ? ar : fr);

  const roles = slug ? getDomainRoles(slug, language) : [];

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
            className="bg-white w-full max-w-2xl my-auto rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden"
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

              {description && (
                <p className={`text-blue-100/80 mt-3 max-w-xl font-medium leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                  {description}
                </p>
              )}
            </div>

            {/* Body — the roles found in this field */}
            <div className="p-8 md:p-12">
              {roles.length > 0 ? (
                <>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-5">
                    {t('Métiers de ce domaine', 'مهن هذا المجال')}
                  </p>
                  <div className={`flex flex-wrap gap-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {roles.map((role) => (
                      <span
                        key={role}
                        className="px-4 py-2.5 bg-gray-50 text-[#173E7D] text-[12.5px] font-bold rounded-xl border border-gray-100"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                // Reached only if a sector slug has no roles listed yet.
                <div className="py-8 flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-300 flex items-center justify-center">
                    <AlertCircle size={22} />
                  </div>
                  <p className="text-sm text-gray-400 font-medium">
                    {t(
                      'Les métiers de ce domaine seront bientôt détaillés.',
                      'سيتم تفصيل مهن هذا المجال قريبًا.'
                    )}
                  </p>
                </div>
              )}

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
