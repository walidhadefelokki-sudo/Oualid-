import React from "react";
import { Link } from "react-router-dom";
import { BarChart3, Check, Globe2, Lock, Rocket, Zap } from "lucide-react";
import type { Entitlements } from "../../useWorkspace";
import { Badge, BadgeTone, Card, btn } from "../../ui";

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

const TIERS: Record<string, { tone: BadgeTone; label: string }> = {
  FREE: { tone: "neutral", label: "Gratuit" },
  PRO: { tone: "info", label: "Pro" },
  PREMIUM: { tone: "accent", label: "Premium" },
  AGENCY: { tone: "accent", label: "Agence" },
};

/**
 * Usage against a limit. `null` means unlimited, which has no bar to fill.
 *
 * A full meter turns orange, and says so in the figure beside it as well —
 * a bar that is merely a different colour is not a message to someone who
 * cannot tell the two colours apart.
 */
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
        <span className="text-sm text-muted">{label}</span>
        <span
          className={"text-sm font-bold " + (full ? "text-accent-ink" : "text-primary")}
          dir="ltr"
        >
          {unlimited ? `${used} · illimité` : `${used} / ${limit}`}
        </span>
      </div>

      {!unlimited && (
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-ground"
          role="progressbar"
          aria-label={label}
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
        >
          <div
            className={"h-full rounded-full transition-all " + (full ? "bg-secondary" : "bg-primary")}
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
  <li className={"flex items-center gap-2 text-sm " + (on ? "text-body" : "text-muted")}>
    {on ? (
      <Check size={15} className="shrink-0 text-success" aria-hidden="true" />
    ) : (
      <Lock size={13} className="shrink-0 text-muted" aria-hidden="true" />
    )}
    <span className="shrink-0 text-primary" aria-hidden="true">
      {icon}
    </span>
    {children}
  </li>
);

const PlanCard: React.FC<{ e: Entitlements }> = ({ e }) => {
  const tier = TIERS[e.tier] ?? TIERS.FREE;
  const paid = e.tier !== "FREE";

  const renews = e.renewsAt
    ? new Date(e.renewsAt).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Card as="section" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={tier.tone}>{tier.label}</Badge>
        <span className="text-sm text-muted">
          {paid && renews ? `Renouvellement le ${renews}` : "Formule gratuite"}
        </span>

        <Link to="/tarifs" className={btn(paid ? "ghost" : "primary", "ms-auto")}>
          {paid ? "Changer de formule" : "Passer à Pro"}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Meter label="Services en ligne" used={e.activeServices} limit={e.maxActiveServices} />

        {/* A free account has no monthly quota at all — its proposals come
            out of credits — so a meter would imply a limit that is not
            there. */}
        {e.monthlyProposals === null ? (
          <div>
            <span className="text-sm text-muted">Propositions</span>
            <p className="mt-1 text-sm font-bold text-primary">Payées en crédits</p>
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

      <ul className="grid list-none grid-cols-1 gap-2.5 border-t border-line-soft p-0 pt-5 sm:grid-cols-2">
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
        <p className="rounded-field bg-tint-orange p-4 text-sm leading-relaxed text-warn">
          Vous avez atteint la limite de services en ligne de votre formule. Mettez un service en
          pause, ou passez à une formule supérieure.
        </p>
      )}
    </Card>
  );
};

export default PlanCard;
