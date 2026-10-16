import React from "react";
import { Link } from "react-router-dom";
import { BarChart3, Check, Globe2, Lock, Rocket, Zap } from "lucide-react";
import type { Entitlements } from "../../useWorkspace";

/**
 * The account's plan, and what it currently allows.
 *
 * Shows usage against the limit rather than the limit alone: "3 / 5 services"
 * answers the question a freelancer actually has, which is whether they can
 * publish another one now.
 *
 * Nothing here decides anything. Every limit was computed by the server and
 * is enforced there too — this is the readable version of a rule that holds
 * whether or not the page agrees with it.
 */

const TIER_STYLE: Record<string, { ring: string; chip: string; label: string }> = {
  FREE: {
    ring: "border-[#173E7D]/15",
    chip: "bg-[#173E7D]/8 text-[#173E7D]",
    label: "Gratuit",
  },
  PRO: {
    ring: "border-[#173E7D]/40",
    chip: "bg-[#173E7D] text-white",
    label: "Pro",
  },
  PREMIUM: {
    ring: "border-[#D4AF37]",
    chip: "bg-gradient-to-r from-[#D4AF37] to-[#F0D989] text-[#0B1E3D]",
    label: "Premium",
  },
  AGENCY: {
    ring: "border-[#D4AF37]",
    chip: "bg-gradient-to-r from-[#D4AF37] to-[#F0D989] text-[#0B1E3D]",
    label: "Agence",
  },
};

/** Usage against a limit. `null` means unlimited, which has no bar to fill. */
const Meter: React.FC<{ label: string; used: number; limit: number | null }> = ({
  label,
  used,
  limit,
}) => {
  const unlimited = limit === null;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100));
  const full = !unlimited && used >= limit;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50">
          {label}
        </span>
        <span
          className={`text-sm font-bold ${full ? "text-amber-600" : "text-[#173E7D]"}`}
          dir="ltr"
        >
          {unlimited ? `${used} · illimité` : `${used} / ${limit}`}
        </span>
      </div>

      {!unlimited && (
        <div className="mt-1.5 h-1.5 rounded-full bg-[#173E7D]/10 overflow-hidden">
          <div
            className={`h-full transition-all ${full ? "bg-amber-500" : "bg-[#173E7D]"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
};

/** A paid-only capability, shown either way so the difference is visible. */
const Perk: React.FC<{ on: boolean; icon: React.ReactNode; children: React.ReactNode }> = ({
  on,
  icon,
  children,
}) => (
  <li
    className={`flex items-center gap-2 text-sm ${
      on ? "text-[#2B3442]" : "text-[#2B3442]/35"
    }`}
  >
    <span className={on ? "text-emerald-600" : "text-[#2B3442]/25"}>
      {on ? <Check size={15} /> : <Lock size={13} />}
    </span>
    <span className="text-[#173E7D]/50">{icon}</span>
    {children}
  </li>
);

const PlanCard: React.FC<{ e: Entitlements }> = ({ e }) => {
  const style = TIER_STYLE[e.tier] ?? TIER_STYLE.FREE;
  const paid = e.tier !== "FREE";

  const renews = e.renewsAt
    ? new Date(e.renewsAt).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <section className={`rounded-2xl border-2 bg-white p-5 ${style.ring}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`text-[11px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full ${style.chip}`}
        >
          {style.label}
        </span>
        <span className="text-sm text-[#2B3442]/60">
          {paid && renews ? `Renouvellement le ${renews}` : "Formule gratuite"}
        </span>

        <Link
          to="/tarifs"
          className={`ms-auto rounded-full px-5 py-2 text-sm font-bold ${
            paid
              ? "border-2 border-[#173E7D]/20 text-[#173E7D]"
              : "bg-[#173E7D] text-white"
          }`}
        >
          {paid ? "Changer de formule" : "Passer à Pro"}
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Meter label="Services en ligne" used={e.activeServices} limit={e.maxActiveServices} />

        {/* A free account has no monthly quota at all — its proposals come
            out of credits — so a meter would imply a limit that is not
            there. */}
        {e.monthlyProposals === null ? (
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50">
              Propositions
            </span>
            <p className="mt-1 text-sm text-[#2B3442]/60">Payées en crédits</p>
          </div>
        ) : (
          <Meter
            label="Propositions ce mois"
            used={e.proposalsUsedThisPeriod}
            limit={e.monthlyProposals}
          />
        )}

        <Meter
          label="Réalisations du portfolio"
          used={e.portfolioProjects}
          limit={e.maxPortfolioProjects}
        />

        {e.weeklyBoosts > 0 && (
          <Meter label="Boosts cette semaine" used={e.boostsUsedThisWeek} limit={e.weeklyBoosts} />
        )}
      </div>

      <ul className="mt-5 pt-5 border-t border-[#173E7D]/10 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Perk on={e.prioritySearch} icon={<Rocket size={14} />}>
          Priorité dans la recherche
        </Perk>
        <Perk on={e.stats !== "none"} icon={<BarChart3 size={14} />}>
          Statistiques {e.stats === "full" ? "complètes" : e.stats === "basic" ? "de base" : ""}
        </Perk>
        <Perk on={e.weeklyBoosts > 0} icon={<Zap size={14} />}>
          {e.weeklyBoosts > 0 ? `${e.weeklyBoosts} boost / semaine` : "Boosts inclus"}
        </Perk>
        <Perk on={e.customSubdomain} icon={<Globe2 size={14} />}>
          Adresse personnalisée
        </Perk>
      </ul>

      {!e.canPublishService && (
        <p className="mt-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">
          Vous avez atteint la limite de services en ligne de votre formule. Mettez un service en
          pause, ou passez à une formule supérieure.
        </p>
      )}
    </section>
  );
};

export default PlanCard;
