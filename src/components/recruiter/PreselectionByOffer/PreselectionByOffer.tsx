import React, { useState } from "react";
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Github,
  GraduationCap,
  Languages,
  Linkedin,
  MapPin,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Star,
  ThumbsDown,
  Users,
  Video,
  XCircle,
} from "lucide-react";

import type {
  PreselectionByOfferResult,
  PreselectionCandidateRow,
  PreselectionOffer,
} from "../../../services/preselectionByOffer.service";

/**
 * Preselection, one offer at a time.
 *
 * The screen this replaces was a flat list: every applicant the recruiter had,
 * ranked against each other, with no mention of which offer anyone had
 * answered. Applicants to a developer post and applicants to an accountant
 * post sat in one table sorted by score, which is not a decision anybody can
 * make — a 70 for the accountant post says nothing about a 90 for the
 * developer one.
 *
 * So each offer is its own section, with its own counts and its own ranking.
 * Offers with candidates come first; the empty ones are still listed, because
 * the offer nobody answered is the one that needs rewriting and hiding it
 * would be hiding the problem.
 *
 * Each candidate carries what a decision actually needs — the last job, the
 * highest qualification, the skills, the scores and the reasons behind
 * them — rather than a name and a number.
 */

interface Props {
  data: PreselectionByOfferResult | null;
  loading?: boolean;
  error?: string | null;

  search: string;
  onSearchChange: (value: string) => void;

  status: string;
  onStatusChange: (value: string) => void;

  preselectedOnly: boolean;
  onPreselectedOnlyChange: (value: boolean) => void;

  onRefresh?: () => void;
  onOpenCV?: (candidate: PreselectionCandidateRow) => void;
  onShortlist?: (candidate: PreselectionCandidateRow) => void;
  onReject?: (candidate: PreselectionCandidateRow) => void;
  /** The application currently being acted on, so its buttons can wait. */
  busyApplicationId?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente",
  REVIEWING: "En cours d'examen",
  SHORTLISTED: "Présélectionné",
  INTERVIEW: "Entretien",
  HIRED: "Embauché",
  REJECTED: "Refusé",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-600",
  REVIEWING: "bg-sky-50 text-sky-700 border border-sky-200",
  SHORTLISTED: "bg-amber-50 text-amber-700 border border-amber-200",
  INTERVIEW: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  HIRED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  REJECTED: "bg-red-50 text-red-600 border border-red-200",
};

const JOB_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: "Temps plein",
  PART_TIME: "Temps partiel",
  CONTRACT: "CDD",
  FREELANCE: "Freelance",
  INTERNSHIP: "Stage",
  TEMPORARY: "Temporaire",
};

const STATUS_CHOICES = [
  { value: "", label: "Tous les statuts" },
  { value: "PENDING", label: "En attente" },
  { value: "SHORTLISTED", label: "Présélectionnés" },
  { value: "INTERVIEW", label: "En entretien" },
  { value: "HIRED", label: "Embauchés" },
  { value: "REJECTED", label: "Refusés" },
];

const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—";

/** Green above 80, amber above 60, grey below — the usual reading. */
const scoreTone = (score: number) =>
  score >= 80
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : score >= 60
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-gray-100 text-gray-500 border-gray-200";

/** One figure on the offer card, with what it counts written under it. */
const Count: React.FC<{
  value: number | string;
  label: string;
  tone?: "gold" | "plain";
}> = ({ value, label, tone = "plain" }) => (
  <div className="text-center px-3 min-w-[4.5rem]">
    <p
      className={`text-2xl font-display font-bold leading-none ${
        tone === "gold" ? "text-[#D4AF37]" : "text-white"
      }`}
    >
      {value}
    </p>
    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-white/45">
      {label}
    </p>
  </div>
);

const Chip: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${className}`}
  >
    {children}
  </span>
);

/** A labelled line, shown only when there is something to put in it. */
const Detail: React.FC<{
  icon: React.ReactNode;
  children?: React.ReactNode;
}> = ({ icon, children }) =>
  children ? (
    <p className="flex items-start gap-2 text-sm text-[#2B3442]/75 min-w-0">
      <span className="mt-0.5 shrink-0 text-[#173E7D]/40">{icon}</span>
      <span className="min-w-0 break-words">{children}</span>
    </p>
  ) : null;

/* -------------------------------------------------------------------------- */
/*                               One candidate                                */
/* -------------------------------------------------------------------------- */

const CandidateCard: React.FC<{
  candidate: PreselectionCandidateRow;
  rank: number;
  busy: boolean;
  onOpenCV?: Props["onOpenCV"];
  onShortlist?: Props["onShortlist"];
  onReject?: Props["onReject"];
}> = ({ candidate: c, rank, busy, onOpenCV, onShortlist, onReject }) => {
  const [open, setOpen] = useState(false);

  const hasReasons =
    c.strengths.length > 0 || c.weaknesses.length > 0 || c.recommendations.length > 0;

  return (
    <article className="rounded-2xl border-2 border-[#173E7D]/12 bg-white p-5">
      <div className="flex flex-wrap items-start gap-4">
        {/* Rank inside this offer, which is the only place it means
            anything. */}
        <span className="shrink-0 w-9 h-9 grid place-items-center rounded-xl bg-[#173E7D]/8 text-[#173E7D] text-sm font-black">
          {rank}
        </span>

        {c.avatarUrl ? (
          <img src={c.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
        ) : (
          <span className="w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-[#0B1E3D] to-[#173E7D] text-white grid place-items-center font-display">
            {c.fullName.charAt(0).toUpperCase()}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-[#173E7D] break-words inline-flex items-center gap-2">
            {c.fullName}
            {c.isPreselected && <Star size={14} className="text-[#D4AF37]" fill="currentColor" />}
          </h4>
          {c.position && (
            <p className="text-sm text-[#2B3442]/60 break-words">{c.position}</p>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip className={STATUS_STYLE[c.status] ?? "bg-gray-100 text-gray-600"}>
              {STATUS_LABEL[c.status] ?? c.status}
            </Chip>
            <Chip className={`border ${scoreTone(c.aiScore)}`}>
              <Star size={11} /> IA {c.aiScore}
            </Chip>
            {c.quizScore !== null && (
              <Chip className="bg-[#173E7D]/8 text-[#173E7D]">Quiz {c.quizScore}</Chip>
            )}
            {c.oralPresentationScore !== null && (
              <Chip className="bg-[#173E7D]/8 text-[#173E7D]">Oral {c.oralPresentationScore}</Chip>
            )}
            {c.availableNow && (
              <Chip className="bg-emerald-50 text-emerald-700">Disponible</Chip>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {(c.hasCv || c.cvUrl) && (
            <button
              onClick={() => onOpenCV?.(c)}
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#173E7D]/20 px-3 py-1.5 text-xs font-bold text-[#173E7D] hover:bg-[#173E7D]/5"
            >
              <FileText size={13} /> CV
            </button>
          )}
          {!c.isPreselected && c.status !== "REJECTED" && (
            <button
              onClick={() => onShortlist?.(c)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#173E7D] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            >
              <CheckCircle2 size={13} /> Présélectionner
            </button>
          )}
          {c.status !== "REJECTED" && (
            <button
              onClick={() => onReject?.(c)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border-2 border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <ThumbsDown size={13} /> Refuser
            </button>
          )}
        </div>
      </div>

      {/* What the old list left out entirely. */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Detail icon={<Briefcase size={14} />}>
          {c.lastRole ?? (c.experience ? `${c.experience} an(s) d'expérience` : null)}
        </Detail>
        <Detail icon={<GraduationCap size={14} />}>{c.education}</Detail>
        <Detail icon={<MapPin size={14} />}>{c.location}</Detail>
        <Detail icon={<Calendar size={14} />}>Postulé le {date(c.appliedAt)}</Detail>
        <Detail icon={<Mail size={14} />}>{c.email}</Detail>
        <Detail icon={<Phone size={14} />}>{c.phone || null}</Detail>
        <Detail icon={<Languages size={14} />}>
          {c.languages.length ? c.languages.join(", ") : null}
        </Detail>
        {c.experience > 0 && c.lastRole && (
          <Detail icon={<Users size={14} />}>{c.experience} an(s) d'expérience</Detail>
        )}
      </div>

      {c.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {c.skills.map((s) => (
            <Chip key={s} className="bg-[#173E7D]/6 text-[#173E7D]">
              {s}
            </Chip>
          ))}
          {/* Capped server-side; saying so beats silently showing twelve. */}
          {c.skillsTotal > c.skills.length && (
            <Chip className="text-[#2B3442]/50">
              +{c.skillsTotal - c.skills.length}
            </Chip>
          )}
        </div>
      )}

      {(c.links.linkedin || c.links.github || c.links.portfolio || c.hasPresentation) && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-[#173E7D]">
          {c.links.linkedin && (
            <a href={c.links.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:underline">
              <Linkedin size={13} /> LinkedIn
            </a>
          )}
          {c.links.github && (
            <a href={c.links.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:underline">
              <Github size={13} /> GitHub
            </a>
          )}
          {c.links.portfolio && (
            <a href={c.links.portfolio} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:underline">
              <ExternalLink size={13} /> Portfolio
            </a>
          )}
          {c.hasPresentation && (
            <span className="inline-flex items-center gap-1.5 text-[#2B3442]/50">
              <Video size={13} /> Présentation orale
            </span>
          )}
        </div>
      )}

      {/* The reasoning behind the score, and the letter. A number with
          nothing behind it is not something a recruiter can defend. */}
      {(hasReasons || c.coverLetter || c.preselectionComment) && (
        <>
          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[#173E7D]/60 hover:text-[#173E7D]"
          >
            <ChevronDown size={14} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
            {open ? "Masquer le détail" : "Voir le détail"}
          </button>

          {open && (
            <div className="mt-3 space-y-3 rounded-xl bg-[#F7F9FC] p-4">
              {c.strengths.length > 0 && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700">
                    Points forts
                  </p>
                  <ul className="mt-1 space-y-1">
                    {c.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-[#2B3442]/80 flex gap-2">
                        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                        <span className="break-words">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {c.weaknesses.length > 0 && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-amber-700">
                    Points de vigilance
                  </p>
                  <ul className="mt-1 space-y-1">
                    {c.weaknesses.map((s, i) => (
                      <li key={i} className="text-sm text-[#2B3442]/80 flex gap-2">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                        <span className="break-words">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {c.recommendations.length > 0 && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#173E7D]/60">
                    Recommandation
                  </p>
                  <p className="mt-1 text-sm text-[#2B3442]/80 break-words">
                    {c.recommendations.join(" · ")}
                  </p>
                </div>
              )}

              {c.coverLetter && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#173E7D]/60">
                    Lettre de motivation
                  </p>
                  <p className="mt-1 text-sm text-[#2B3442]/80 whitespace-pre-wrap break-words">
                    {c.coverLetter}
                  </p>
                </div>
              )}

              {c.preselectionComment && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#173E7D]/60">
                    Votre note
                  </p>
                  <p className="mt-1 text-sm text-[#2B3442]/80 break-words">
                    {c.preselectionComment}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
};

/* -------------------------------------------------------------------------- */
/*                                 One offer                                  */
/* -------------------------------------------------------------------------- */

const OfferSection: React.FC<{
  offer: PreselectionOffer;
  defaultOpen: boolean;
  busyApplicationId?: string | null;
  onOpenCV?: Props["onOpenCV"];
  onShortlist?: Props["onShortlist"];
  onReject?: Props["onReject"];
}> = ({ offer, defaultOpen, busyApplicationId, onOpenCV, onShortlist, onReject }) => {
  const [open, setOpen] = useState(defaultOpen);
  const c = offer.counts;

  /* The offer is a card in the platform's own livery — the navy and gold a
     recruiter already recognises from the public offer cards — and the
     candidatures sit inside it. One card per offer, so it is always obvious
     which post a candidate answered. */
  return (
    <section className="rounded-3xl border-2 border-[#D4AF37]/50 bg-white overflow-hidden shadow-[0_18px_40px_-24px_rgba(11,30,61,0.45)]">
      {/* ----------------------------- the offer ----------------------------- */}
      <div className="relative bg-gradient-to-br from-[#0B1E3D] to-[#173E7D] text-white overflow-hidden">
        {/* pointer-events-none so the decoration cannot swallow the click. */}
        <div className="pointer-events-none absolute -top-20 -right-16 h-44 w-44 rounded-full bg-[#D4AF37]/20 blur-3xl" />

        <div className="relative z-10 p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-4">
            <span className="w-12 h-12 shrink-0 rounded-2xl bg-white/10 border border-white/20 grid place-items-center">
              <Briefcase size={20} className="text-[#D4AF37]" />
            </span>

            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-display font-bold break-words leading-tight">
                {offer.title}
              </h3>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold uppercase tracking-wider text-white/55">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={12} className="text-[#D4AF37]" />
                  {offer.wilaya || offer.location}
                </span>
                <span>{JOB_TYPE_LABEL[offer.type] ?? offer.type}</span>
                {offer.sector && <span>{offer.sector}</span>}
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={12} className="text-[#D4AF37]" />
                  {date(offer.publishedAt)}
                </span>
              </div>
            </div>

            {/* An expired offer still collecting applications is worth
                noticing, so it is said on the card rather than worked out. */}
            {offer.expired && (
              <Chip className="bg-red-500/20 text-red-200 border border-red-400/40">
                <AlertTriangle size={11} /> Expirée
              </Chip>
            )}
          </div>

          {/* Where this offer stands, in figures rather than chips. */}
          <div className="mt-5 flex flex-wrap items-center gap-y-3 divide-x divide-white/10">
            <Count value={c.total} label="candidats" />
            <Count value={c.preselected} label="présél." tone="gold" />
            {c.interview > 0 && <Count value={c.interview} label="entretiens" />}
            {c.hired > 0 && <Count value={c.hired} label="embauchés" />}
            {/* Null, not zero, when nothing is scored yet — so an unanalysed
                offer does not read as a weak one. */}
            <Count value={c.averageScore ?? "—"} label="score moyen" />

            <button
              onClick={() => setOpen((v) => !v)}
              className="ms-auto inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-xs font-bold hover:bg-white/10 transition-colors"
              aria-expanded={open}
            >
              {open ? "Masquer" : "Voir"} les candidatures
              <ChevronDown
                size={14}
                className={`transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* -------------------------- the candidatures ------------------------- */}
      {open && (
        <div className="bg-[#F7F9FC] p-5 sm:p-6">
          {offer.candidates.length === 0 ? (
            <p className="rounded-2xl border-2 border-dashed border-[#173E7D]/15 bg-white px-4 py-8 text-center text-sm text-[#2B3442]/55">
              {c.total === 0
                ? "Aucune candidature pour cette offre."
                : "Aucune candidature ne correspond à ces filtres."}
            </p>
          ) : (
            <>
              <p className="mb-4 text-[11px] font-black uppercase tracking-widest text-[#173E7D]/45">
                {offer.candidates.length} candidature
                {offer.candidates.length > 1 ? "s" : ""} — classées pour ce poste
              </p>
              <div className="space-y-4">
                {offer.candidates.map((candidate, i) => (
                  <CandidateCard
                    key={candidate.applicationId}
                    candidate={candidate}
                    rank={i + 1}
                    busy={busyApplicationId === candidate.applicationId}
                    onOpenCV={onOpenCV}
                    onShortlist={onShortlist}
                    onReject={onReject}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/*                                 The screen                                 */
/* -------------------------------------------------------------------------- */

const StatTile: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="rounded-2xl border-2 border-[#173E7D]/12 bg-white px-4 py-3">
    <p className="text-[11px] font-black uppercase tracking-widest text-[#173E7D]/45">{label}</p>
    <p className="mt-1 text-2xl font-display font-bold text-[#173E7D]">{value}</p>
  </div>
);

const PreselectionByOffer: React.FC<Props> = ({
  data,
  loading = false,
  error = null,
  search,
  onSearchChange,
  status,
  onStatusChange,
  preselectedOnly,
  onPreselectedOnlyChange,
  onRefresh,
  onOpenCV,
  onShortlist,
  onReject,
  busyApplicationId,
}) => {
  const totals = data?.totals;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-[#173E7D]">
            Présélection par offre
          </h1>
          <p className="text-sm text-[#2B3442]/55 mt-0.5">
            Les candidats sont classés au sein de chaque offre — comparer deux
            candidats n'a de sens que pour un même poste.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          aria-label="Actualiser"
          className="p-2.5 rounded-xl border-2 border-[#173E7D]/15 text-[#173E7D]/60 hover:text-[#173E7D] disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatTile label="Offres" value={totals.offersWithCandidates} />
          <StatTile label="Candidats" value={totals.candidates} />
          <StatTile label="Présélectionnés" value={totals.preselected} />
          <StatTile label="Entretiens" value={totals.interview} />
          <StatTile label="Score moyen" value={totals.averageScore ?? "—"} />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[14rem] flex items-center gap-2 rounded-xl border-2 border-[#173E7D]/15 bg-white px-3.5">
          <Search size={16} className="text-[#173E7D]/40 shrink-0" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Nom, poste ou compétence…"
            className="w-full py-2.5 outline-none text-sm bg-transparent"
          />
        </div>

        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          aria-label="Filtrer par statut"
          className="rounded-xl border-2 border-[#173E7D]/15 bg-white px-3 py-2.5 text-sm"
        >
          {STATUS_CHOICES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <label className="inline-flex items-center gap-2 rounded-xl border-2 border-[#173E7D]/15 bg-white px-4 py-2.5 text-sm font-semibold text-[#173E7D] cursor-pointer">
          <input
            type="checkbox"
            checked={preselectedOnly}
            onChange={(e) => onPreselectedOnlyChange(e.target.checked)}
            className="w-4 h-4 accent-[#173E7D]"
          />
          Présélectionnés seulement
        </label>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}

      {loading && !data ? (
        <p className="rounded-2xl border-2 border-dashed border-[#173E7D]/15 px-6 py-16 text-center text-sm text-[#2B3442]/50">
          Chargement…
        </p>
      ) : !data || data.offers.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#173E7D]/15 px-6 py-16 text-center">
          <XCircle size={28} className="mx-auto text-[#173E7D]/25" />
          <p className="mt-3 font-bold text-[#173E7D]/70">Aucune offre publiée</p>
          <p className="mt-1 text-sm text-[#2B3442]/50">
            Publiez une offre pour commencer à recevoir des candidatures.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.offers.map((offer, i) => (
            <OfferSection
              key={offer.id}
              offer={offer}
              /* The first offer with candidates is open; the rest are folded,
                 so a recruiter with twenty offers is not handed a page
                 thousands of pixels long. */
              defaultOpen={i === 0 && offer.counts.total > 0}
              busyApplicationId={busyApplicationId}
              onOpenCV={onOpenCV}
              onShortlist={onShortlist}
              onReject={onReject}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PreselectionByOffer;
