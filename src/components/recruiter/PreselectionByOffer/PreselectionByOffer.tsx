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

  return (
    <section className="rounded-2xl border-2 border-[#173E7D]/15 bg-white overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-start px-5 py-4 flex flex-wrap items-center gap-3 hover:bg-[#173E7D]/[0.03]"
      >
        <ChevronDown
          size={18}
          className={`shrink-0 text-[#173E7D]/50 transition-transform ${open ? "rotate-180" : ""}`}
        />

        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-[#173E7D] break-words">{offer.title}</h3>
          <p className="text-xs text-[#2B3442]/50 flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} /> {offer.wilaya || offer.location}
            </span>
            <span>{JOB_TYPE_LABEL[offer.type] ?? offer.type}</span>
            {offer.sector && <span>{offer.sector}</span>}
            <span>Publiée le {date(offer.publishedAt)}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {/* An expired offer still taking applications is worth noticing. */}
          {offer.expired && (
            <Chip className="bg-red-50 text-red-600 border border-red-200">Expirée</Chip>
          )}
          <Chip className="bg-[#173E7D]/8 text-[#173E7D]">
            <Users size={11} /> {c.total}
          </Chip>
          {c.preselected > 0 && (
            <Chip className="bg-[#D4AF37]/15 text-[#8A6D1F]">
              <Star size={11} /> {c.preselected}
            </Chip>
          )}
          {c.interview > 0 && (
            <Chip className="bg-indigo-50 text-indigo-700">{c.interview} entretien(s)</Chip>
          )}
          {c.hired > 0 && (
            <Chip className="bg-emerald-50 text-emerald-700">{c.hired} embauché(s)</Chip>
          )}
          {/* Null, not zero, when nothing is scored yet — so an unanalysed
              offer does not read as a weak one. */}
          {c.averageScore !== null && (
            <Chip className={`border ${scoreTone(c.averageScore)}`}>
              Moy. {c.averageScore}
            </Chip>
          )}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5">
          {offer.candidates.length === 0 ? (
            <p className="rounded-xl bg-[#F7F9FC] px-4 py-6 text-center text-sm text-[#2B3442]/55">
              Aucune candidature pour cette offre
              {c.total === 0 ? "." : " avec ces filtres."}
            </p>
          ) : (
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
