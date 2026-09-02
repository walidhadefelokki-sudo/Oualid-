import { User, Briefcase, FileText, MapPin, Mail, Phone } from 'lucide-react';

/**
 * The normalised shape every CV is rendered from.
 *
 * Both the candidate's CV Maker and the recruiter's candidate viewer feed
 * this same structure, which is what makes one design serve both. Demo data
 * and real data differ only in the values here — never in the markup.
 */
export interface CVDocumentData {
  name: string;
  /** Professional title. Falls back to the most recent role when empty. */
  title?: string;
  email?: string;
  phone?: string;
  address?: string;
  summary?: string;
  experiences: { company?: string; role?: string; period?: string; desc?: string; missions?: string }[];
  education: { school?: string; degree?: string; year?: string }[];
  skills: string[];
  languages: { name: string; level: string }[];
}

/** Proficiency wording -> bar width, in French and Arabic. */
const LEVELS: { labels: string[]; percent: number }[] = [
  { labels: ['Natif', 'أصلي'], percent: 100 },
  { labels: ['Courant', 'بطلاقة'], percent: 85 },
  { labels: ['Intermédiaire', 'متوسط'], percent: 60 },
  { labels: ['Débutant', 'مبتدئ'], percent: 30 },
];

export const languageLevelPercent = (level: string): number =>
  LEVELS.find((l) => l.labels.includes(level))?.percent ?? 60;

interface CVDocumentProps {
  data: CVDocumentData;
  language: 'fr' | 'ar';
  /** Photo shown in the header; falls back to a placeholder icon. */
  photoUrl?: string | null;
  /** DOM id, so the PDF exporter can find this element. */
  id?: string;
  /** Shown in the footer strip. Hidden for the in-app recruiter viewer. */
  showFooter?: boolean;
  className?: string;
}

/**
 * The one CV design used everywhere in the product.
 *
 * Previously the candidate preview and the recruiter viewer were two separate
 * blocks of markup, and the recruiter one rendered a hardcoded summary,
 * experience list, skill set and language list — so every candidate looked
 * identical. This component replaces both.
 */
export default function CVDocument({
  data,
  language,
  photoUrl,
  id,
  showFooter = true,
  className = '',
}: CVDocumentProps) {
  const isRTL = language === 'ar';
  const t = (fr: string, ar: string) => (isRTL ? ar : fr);

  const experiences = (data.experiences ?? []).filter((e) => e.role || e.company);
  const education = (data.education ?? []).filter((e) => e.degree || e.school);
  const skills = (data.skills ?? []).filter(Boolean);
  const languages = (data.languages ?? []).filter((l) => l.name);

  const professionalTitle = data.title || experiences[0]?.role || '';

  return (
    <div
      id={id}
      className={`bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-w-5xl mx-auto ${className}`}
    >
      {/* Header — kept compact: on the printed CV this sits at the top of
          page 1, so every millimetre costs a millimetre of experience. */}
      <div className="bg-[#173E7D] px-10 py-8 text-white relative">
        <div className={`flex items-center gap-7 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-28 h-28 shrink-0 rounded-[1.75rem] overflow-hidden border-[3px] border-white/20 shadow-xl bg-white/10 flex items-center justify-center">
            {photoUrl ? (
              <img src={photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <User size={44} className="text-white/25" />
            )}
          </div>
          <div className={`min-w-0 space-y-1.5 ${isRTL ? 'text-right' : ''}`}>
            <h1 className="text-4xl font-display font-black tracking-tight leading-tight">
              {data.name || t('Votre Nom', 'اسمك')}
            </h1>
            <p className="text-blue-200 text-base font-semibold tracking-[0.18em] uppercase">
              {professionalTitle || t('Votre Poste Actuel', 'منصبك الحالي')}
            </p>
            <div className={`flex flex-wrap gap-2 pt-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="px-3.5 py-1 bg-white/10 rounded-full text-[10px] font-bold border border-white/10">
                {t('Profil Candidat', 'ملف مترشح')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={`px-12 py-11 ${isRTL ? 'text-right' : ''}`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-11">

          {/* Main column */}
          <div className="lg:col-span-2 space-y-10">
            {data.summary && (
              <section className="space-y-4 break-inside-avoid">
                <h4 className={`text-[11px] font-black text-gray-400 uppercase tracking-[0.28em] flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <User size={16} className="text-[#F68D58]" /> {t('Résumé Professionnel', 'الملف الشخصي')}
                </h4>
                <p className="text-gray-600 leading-relaxed text-[15px] font-medium">{data.summary}</p>
              </section>
            )}

            {experiences.length > 0 && (
              <section className="space-y-5">
                <h4 className={`text-[11px] font-black text-gray-400 uppercase tracking-[0.28em] flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Briefcase size={16} className="text-[#F68D58]" /> {t('Expériences Professionnelles', 'الخبرة')}
                </h4>
                <div className="space-y-7">
                  {experiences.map((exp, i) => (
                    <div key={i} className={`relative break-inside-avoid pl-7 border-l-2 border-gray-100 ${isRTL ? 'pl-0 pr-7 border-l-0 border-r-2' : ''}`}>
                      <div className={`absolute top-1 w-3.5 h-3.5 bg-[#F68D58] rounded-full border-[3px] border-white shadow-sm ${isRTL ? '-right-[8px]' : '-left-[8px]'}`} />
                      <div className={`flex justify-between items-start gap-4 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <h5 className="text-lg font-black text-[#173E7D] leading-snug">{exp.role || t('Poste', 'المنصب')}</h5>
                        {exp.period && (
                          <span className="shrink-0 text-[10px] font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg whitespace-nowrap">
                            {exp.period}
                          </span>
                        )}
                      </div>
                      {exp.company && <p className="text-[#F68D58] text-sm font-bold mb-2">{exp.company}</p>}
                      {exp.missions && <p className="text-gray-600 text-[13px] font-medium mb-1.5 leading-relaxed">{exp.missions}</p>}
                      {exp.desc && <p className="text-gray-500 text-[13px] leading-relaxed">{exp.desc}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {education.length > 0 && (
              <section className="space-y-5">
                <h4 className={`text-[11px] font-black text-gray-400 uppercase tracking-[0.28em] flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <FileText size={16} className="text-[#F68D58]" /> {t('Formation & Éducation', 'التكوين')}
                </h4>
                <div className="space-y-5">
                  {education.map((edu, i) => (
                    <div key={i} className={`relative break-inside-avoid pl-7 border-l-2 border-gray-100 ${isRTL ? 'pl-0 pr-7 border-l-0 border-r-2' : ''}`}>
                      <div className={`absolute top-1 w-3.5 h-3.5 bg-blue-400 rounded-full border-[3px] border-white shadow-sm ${isRTL ? '-right-[8px]' : '-left-[8px]'}`} />
                      <div className={`flex justify-between items-start gap-4 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <h5 className="text-base font-black text-[#173E7D] leading-snug">{edu.degree || t('Diplôme', 'الشهادة')}</h5>
                        {edu.year && (
                          <span className="shrink-0 text-[10px] font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg whitespace-nowrap">
                            {edu.year}
                          </span>
                        )}
                      </div>
                      {edu.school && <p className="text-gray-500 text-[13px] font-bold">{edu.school}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-9">
            {skills.length > 0 && (
              <section className="space-y-4 break-inside-avoid">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.28em]">
                  {t('Compétences', 'المهارات')}
                </h4>
                <div className={`flex flex-wrap gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {skills.map((skill, i) => (
                    <span key={i} className="px-3.5 py-2 bg-gray-50 text-[#173E7D] text-[11px] font-black rounded-xl border border-gray-100">
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {languages.length > 0 && (
              <section className="space-y-4 break-inside-avoid">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.28em]">
                  {t('Langues', 'اللغات')}
                </h4>
                <div className="space-y-3.5">
                  {languages.map((lang, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className={`flex justify-between items-baseline gap-3 text-[13px] font-black ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-[#173E7D]">{lang.name}</span>
                        <span className="text-gray-400 uppercase tracking-widest text-[9px]">{lang.level}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#F68D58] rounded-full transition-all duration-500"
                          style={{ width: `${languageLevelPercent(lang.level)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(data.address || data.email || data.phone) && (
              <section className="p-6 bg-orange-50 rounded-[1.75rem] border border-orange-100 space-y-3.5 break-inside-avoid">
                <h4 className="text-[11px] font-black text-[#F68D58] uppercase tracking-[0.2em]">Contact</h4>
                <div className="space-y-2.5 text-[13px] font-bold text-gray-600 break-words">
                  {data.address && (
                    <p className={`flex items-start gap-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <MapPin size={15} className="text-[#F68D58] shrink-0 mt-0.5" /> {data.address}
                    </p>
                  )}
                  {data.email && (
                    <p className={`flex items-start gap-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Mail size={15} className="text-[#F68D58] shrink-0 mt-0.5" /> {data.email}
                    </p>
                  )}
                  {data.phone && (
                    <p className={`flex items-start gap-2.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Phone size={15} className="text-[#F68D58] shrink-0 mt-0.5" /> {data.phone}
                    </p>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {showFooter && (
        <div className="px-10 py-6 bg-gray-50 border-t border-gray-100 flex justify-center">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.3em]">
            Généré par Dar L'emploi
          </p>
        </div>
      )}
    </div>
  );
}
