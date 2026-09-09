import React, { useEffect, useState } from "react";
import {
  Search, MapPin, Briefcase, FileText, Mail, Phone, Loader2, AlertCircle,
  Users as UsersIcon, ChevronLeft, ChevronRight, Download,
} from "lucide-react";
import candidateProfileService, {
  DirectoryCandidate,
  DirectoryPagination,
} from "../../services/candidateProfile.service";
import { WILAYAS } from "../../constants";

interface Props {
  isRTL?: boolean;
  lt: (en: string, fr: string, ar: string) => string;
  /** Opens the candidate's uploaded CV in a new tab. */
  onOpenCv: (candidateId: string) => void;
  /** Saves the candidate's uploaded CV to disk. */
  onDownloadCv: (candidate: DirectoryCandidate) => void;
}

/**
 * Corporate: the full CV directory.
 *
 * Distinct from "Répertoire CV", which lists people who applied to this
 * recruiter's own offers. This one covers every candidate on the platform who
 * has uploaded a CV — the point being to reach people who have not applied.
 */
const CandidateDirectory: React.FC<Props> = ({ isRTL, lt, onOpenCv, onDownloadCv }) => {
  const [candidates, setCandidates] = useState<DirectoryCandidate[]>([]);
  const [pagination, setPagination] = useState<DirectoryPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [minExperience, setMinExperience] = useState(0);
  const [page, setPage] = useState(1);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await candidateProfileService.getCandidateDirectory({
        search: search.trim() || undefined,
        wilaya: wilaya || undefined,
        minExperience: minExperience || undefined,
        page,
      });
      setCandidates(data.candidates);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ??
          lt("Could not load the directory.", "Impossible de charger le répertoire.", "تعذر تحميل الدليل.")
      );
    } finally {
      setLoading(false);
    }
  };

  // Debounced on the search box so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, wilaya, minExperience, page]);

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, wilaya, minExperience]);

  const fullName = (c: DirectoryCandidate) =>
    [c.user.firstName, c.user.lastName].filter(Boolean).join(" ").trim() || c.user.email;

  return (
    <div className="space-y-8">
      <div className={isRTL ? "text-right" : ""}>
        <h2 className="text-4xl font-display font-black text-[#173E7D] tracking-tight">
          {lt("CV directory", "Base de CV", "قاعدة السير الذاتية")}
        </h2>
        <p className="text-gray-500 mt-1 font-medium max-w-2xl">
          {lt(
            "Search every candidate on the platform who has uploaded a CV, including those who have not applied to your offers.",
            "Recherchez tous les candidats de la plateforme ayant téléversé un CV, y compris ceux qui n'ont pas postulé à vos offres.",
            "ابحث في كل المترشحين الذين رفعوا سيرة ذاتية، بمن فيهم من لم يترشح لعروضك."
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lt(
              "Job title, skill, name…",
              "Poste, compétence, nom…",
              "الوظيفة، المهارة، الاسم…"
            )}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 outline-none focus:border-[#173E7D] font-bold text-gray-700"
          />
        </div>

        <select
          value={wilaya}
          onChange={(e) => setWilaya(e.target.value)}
          className="px-5 py-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 outline-none focus:border-[#173E7D] font-bold text-gray-700 min-w-[190px]"
        >
          <option value="">{lt("All wilayas", "Toutes les wilayas", "كل الولايات")}</option>
          {WILAYAS.map((w) => (
            <option key={w} value={w.split(" - ")[1] ?? w}>
              {w}
            </option>
          ))}
        </select>

        <select
          value={minExperience}
          onChange={(e) => setMinExperience(Number(e.target.value))}
          className="px-5 py-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 outline-none focus:border-[#173E7D] font-bold text-gray-700"
        >
          {[0, 1, 3, 5, 10].map((y) => (
            <option key={y} value={y}>
              {y === 0
                ? lt("Any experience", "Toute expérience", "أي خبرة")
                : lt(`${y}+ years`, `${y}+ ans`, `${y}+ سنوات`)}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex gap-3 items-start rounded-2xl border border-red-200 bg-red-50 p-5">
          <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={20} />
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="py-24 flex justify-center">
          <Loader2 className="animate-spin text-[#173E7D]" size={32} />
        </div>
      ) : candidates.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-dashed border-gray-200 py-20 text-center">
          <UsersIcon size={32} className="mx-auto text-gray-300" />
          <p className="font-black text-[#173E7D] mt-5">
            {lt("No candidates found", "Aucun candidat trouvé", "لم يتم العثور على مترشحين")}
          </p>
          <p className="text-gray-400 font-medium mt-2 max-w-md mx-auto">
            {search || wilaya || minExperience
              ? lt("Try widening your filters.", "Essayez d'élargir vos filtres.", "جرّب توسيع عوامل التصفية.")
              : lt(
                  "Candidates appear here once they upload a CV.",
                  "Les candidats apparaissent ici dès qu'ils téléversent un CV.",
                  "يظهر المترشحون هنا بمجرد رفع سيرة ذاتية."
                )}
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
            {lt(
              `${pagination?.total ?? 0} candidate(s)`,
              `${pagination?.total ?? 0} candidat(s)`,
              `${pagination?.total ?? 0} مترشح`
            )}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {candidates.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-7 flex flex-col hover:shadow-lg transition-shadow"
              >
                <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-[#173E7D] text-white flex items-center justify-center font-black text-lg">
                    {/* No <img src=""> when there is no photo. */}
                    {c.user.avatarUrl ? (
                      <img src={c.user.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      fullName(c).trim().charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className={`min-w-0 flex-1 ${isRTL ? "text-right" : ""}`}>
                    <p className="font-black text-[#173E7D] truncate">{fullName(c)}</p>
                    <p className="text-sm text-gray-400 font-bold truncate">
                      {c.currentJobTitle || c.headline || lt("Candidate", "Candidat", "مترشح")}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-2 text-sm text-gray-500 font-medium">
                  {(c.city || c.wilaya) && (
                    <p className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <MapPin size={15} className="text-gray-300 shrink-0" />
                      {c.city || c.wilaya}
                    </p>
                  )}
                  {c.yearsExperience ? (
                    <p className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <Briefcase size={15} className="text-gray-300 shrink-0" />
                      {lt(`${c.yearsExperience} years`, `${c.yearsExperience} ans d'expérience`, `${c.yearsExperience} سنوات خبرة`)}
                    </p>
                  ) : null}
                  {c.resume?.fileName && (
                    <p className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <FileText size={15} className="text-gray-300 shrink-0" />
                      <span className="truncate">{c.resume.fileName}</span>
                    </p>
                  )}
                </div>

                {c.skills.length > 0 && (
                  <div className={`flex flex-wrap gap-2 mt-5 ${isRTL ? "flex-row-reverse" : ""}`}>
                    {c.skills.slice(0, 5).map((skill) => (
                      <span
                        key={skill}
                        className="px-3 py-1.5 bg-gray-50 text-[#173E7D] text-[11px] font-bold rounded-lg border border-gray-100"
                      >
                        {skill}
                      </span>
                    ))}
                    {c.skills.length > 5 && (
                      <span className="px-3 py-1.5 text-[11px] font-bold text-gray-400">
                        +{c.skills.length - 5}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-auto pt-6">
                  <button
                    onClick={() => onOpenCv(c.id)}
                    className="flex-1 py-3 rounded-xl bg-[#173E7D] text-white font-black text-[10px] uppercase tracking-widest hover:bg-[#F68D58] transition-all"
                  >
                    {lt("View CV", "Voir le CV", "عرض السيرة")}
                  </button>
                  <button
                    onClick={() => onDownloadCv(c)}
                    title={lt("Download CV", "Télécharger le CV", "تنزيل السيرة")}
                    className="w-11 h-11 rounded-xl border border-gray-200 text-gray-400 hover:text-[#173E7D] hover:border-[#173E7D] transition-all flex items-center justify-center"
                  >
                    <Download size={16} />
                  </button>
                  <a
                    href={`mailto:${c.user.email}`}
                    title={c.user.email}
                    className="w-11 h-11 rounded-xl border border-gray-200 text-gray-400 hover:text-[#173E7D] hover:border-[#173E7D] transition-all flex items-center justify-center"
                  >
                    <Mail size={16} />
                  </a>
                  {c.user.phone && (
                    <a
                      href={`tel:${c.user.phone}`}
                      title={c.user.phone}
                      className="w-11 h-11 rounded-xl border border-gray-200 text-gray-400 hover:text-[#173E7D] hover:border-[#173E7D] transition-all flex items-center justify-center"
                    >
                      <Phone size={16} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="w-11 h-11 rounded-xl border border-gray-200 text-gray-500 disabled:opacity-40 flex items-center justify-center hover:border-[#173E7D] transition"
              >
                <ChevronLeft size={18} className={isRTL ? "rotate-180" : ""} />
              </button>
              <span className="text-sm font-bold text-gray-500">
                {page} / {pagination.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="w-11 h-11 rounded-xl border border-gray-200 text-gray-500 disabled:opacity-40 flex items-center justify-center hover:border-[#173E7D] transition"
              >
                <ChevronRight size={18} className={isRTL ? "rotate-180" : ""} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CandidateDirectory;
