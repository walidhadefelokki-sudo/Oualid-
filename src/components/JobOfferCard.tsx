import { motion } from 'motion/react';
import { Bookmark, Building2, ChevronRight, Clock, MapPin, Share2 } from 'lucide-react';

/**
 * One job offer, in the Corporate livery.
 *
 * Shared by the home page and the candidate dashboard, which had drifted into
 * two copies of nearly the same card: the same design applied twice, then
 * changed once. Whatever an offer looks like, it now looks like it in both.
 */

export interface OfferCardJob {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  remote: string;
  description: string;
  requirements: string[];
  /** Company logo. May be absent — see the fallback below. */
  logo?: string | null;
  /** Real publication date. Omitted from the card when there is not one. */
  publishedAt?: string | null;
  featured?: boolean;
}

interface Props {
  job: OfferCardJob;
  language: 'fr' | 'ar' | 'en';
  onOpen: (job: OfferCardJob) => void;
  onShare?: (job: OfferCardJob) => void;
  /** Saving is a dashboard feature; the public page passes neither. */
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
}

const lt = (language: string, en: string, fr: string, ar: string) =>
  language === 'ar' ? ar : language === 'en' ? en : fr;

/** "Il y a 3j" from a stored date. Empty string when there is no date. */
const timeAgo = (language: string, iso?: string | null): string => {
  if (!iso) return '';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (Number.isNaN(minutes)) return '';
  if (minutes < 1) return lt(language, 'just now', "à l'instant", 'الآن');
  if (minutes < 60) return lt(language, `${minutes}m ago`, `Il y a ${minutes} min`, `منذ ${minutes} د`);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lt(language, `${hours}h ago`, `Il y a ${hours}h`, `منذ ${hours} س`);
  const days = Math.floor(hours / 24);
  return lt(language, `${days}d ago`, `Il y a ${days}j`, `منذ ${days} ي`);
};

export default function JobOfferCard({
  job,
  language,
  onOpen,
  onShare,
  isSaved,
  onToggleSave,
}: Props) {
  const isRTL = language === 'ar';
  const t = (en: string, fr: string, ar: string) => lt(language, en, fr, ar);
  const posted = timeAgo(language, job.publishedAt);

  /* The company's own mark, or its initial.
   *
   * Never <img src=""> — an empty src makes the browser re-request the page
   * itself, which is why this is a branch rather than a src with a default. */
  const logoUrl = job.logo?.trim() || null;
  const initial = (job.company || '?').trim().charAt(0).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -12 }}
      onClick={() => onOpen(job)}
      className="bg-gradient-to-b from-[#0B1E3D] to-[#173E7D] p-6 sm:p-8 lg:p-10 rounded-[3.5rem] border-2 border-[#D4AF37] hover:border-[#F0D989] shadow-[0_0_0_1px_rgba(212,175,55,0.35),0_25px_50px_-15px_rgba(0,0,0,0.55)] hover:shadow-[0_0_0_1px_rgba(240,217,137,0.55),0_30px_60px_-15px_rgba(0,0,0,0.6)] transition-all duration-500 group cursor-pointer relative overflow-hidden flex flex-col h-full"
    >
      {/* pointer-events-none, so a blurred decoration cannot swallow a click. */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-[#D4AF37]/20 blur-3xl" />

      {/* Header: logo, badges */}
      <div className={`relative z-10 flex justify-between items-start gap-3 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-white/20 overflow-hidden group-hover:scale-110 transition-transform duration-500 shrink-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={job.company}
              className="w-full h-full object-contain p-1"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // A dead URL falls back to the initial rather than a broken
                // image icon on an otherwise finished card.
                const img = e.currentTarget;
                img.style.display = 'none';
                img.parentElement?.classList.add('bg-[#0B1E3D]');
                const span = img.nextElementSibling as HTMLElement | null;
                if (span) span.style.display = 'flex';
              }}
            />
          ) : null}
          <span
            style={{ display: logoUrl ? 'none' : 'flex' }}
            className="w-full h-full items-center justify-center text-xl font-black text-[#173E7D]"
          >
            {initial}
          </span>
        </div>

        <div className={`flex flex-col gap-2 ${isRTL ? 'items-start' : 'items-end'}`}>
          <span className="px-4 sm:px-5 py-2 bg-gradient-to-r from-[#D4AF37] to-[#F0D989] text-[#0B1E3D] rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
            {job.type}
          </span>
          <span className="px-4 sm:px-5 py-2 bg-white/10 text-white/80 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 whitespace-nowrap">
            {job.remote}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        <h3 className="text-2xl font-black text-white group-hover:text-[#D4AF37] transition-colors leading-tight mb-3 break-words">
          {job.title}
        </h3>

        <div className={`flex items-center gap-2 text-white/50 font-bold uppercase tracking-wider text-[10px] mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Building2 size={14} className="text-[#D4AF37] shrink-0" />
          <span className="truncate">{job.company}</span>
        </div>

        <p className="text-white/60 text-sm leading-relaxed line-clamp-2 font-medium mb-6">
          {job.description}
        </p>

        {job.requirements.length > 0 && (
          <div className={`flex flex-wrap gap-2 pt-2 mb-8 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {job.requirements.slice(0, 3).map((req, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-white/5 text-white/60 text-[10px] font-bold rounded-lg border border-white/10"
              >
                {req}
              </span>
            ))}
            {job.requirements.length > 3 && (
              <span className="px-3 py-1 bg-white/5 text-white/60 text-[10px] font-bold rounded-lg border border-white/10">
                +{job.requirements.length - 3}
              </span>
            )}
          </div>
        )}

        <div
          className={`flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] text-white/50 mb-8 font-bold uppercase tracking-widest mt-auto ${
            isRTL ? 'flex-row-reverse' : ''
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <MapPin size={16} className="text-[#D4AF37] shrink-0" />
            <span className="truncate">{job.location}</span>
          </div>
          {posted && (
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-[#D4AF37] shrink-0" />
              {posted}
            </div>
          )}
        </div>

        {/* Footer: actions */}
        <div
          className={`relative z-10 flex items-center gap-3 pt-6 border-t border-white/10 ${
            isRTL ? 'flex-row-reverse justify-start' : 'justify-end'
          }`}
        >
          {onShare && (
            <button
              onClick={(e) => {
                // Without this the card's own click would also fire and open
                // the offer behind the share sheet.
                e.stopPropagation();
                onShare(job);
              }}
              aria-label={t('Share this offer', "Partager l'offre", 'مشاركة العرض')}
              className="p-4 rounded-2xl bg-white/10 text-white/50 border border-white/20 hover:text-[#D4AF37] hover:border-[#D4AF37]/60 transition-all"
            >
              <Share2 size={20} />
            </button>
          )}

          {onToggleSave && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(job.id);
              }}
              aria-pressed={isSaved}
              aria-label={t('Save this offer', 'Enregistrer cette offre', 'حفظ هذا العرض')}
              className={`p-4 rounded-2xl transition-all ${
                isSaved
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#F0D989] text-[#0B1E3D] shadow-lg shadow-black/30'
                  : 'bg-white/10 text-white/50 border border-white/20 hover:text-[#D4AF37] hover:border-[#D4AF37]/60'
              }`}
            >
              <Bookmark size={20} fill={isSaved ? 'currentColor' : 'none'} />
            </button>
          )}

          <button
            aria-label={t('Open this offer', "Ouvrir l'offre", 'فتح هذا العرض')}
            className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center text-white group-hover:bg-gradient-to-r group-hover:from-[#D4AF37] group-hover:to-[#F0D989] group-hover:text-[#0B1E3D] group-hover:border-transparent transition-all duration-500"
          >
            <ChevronRight size={28} className={isRTL ? 'rotate-180' : ''} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
