import React, { useEffect, useState } from "react";
import { Check, Coins, Lock } from "lucide-react";
import freelanceService, { CreditPack, FreelancePlan } from "../freelance.service";
import { EmptyState, ErrorState, Loading, Price } from "../ui";
import { useI18n } from "../i18n";

/**
 * What it costs to sell on the marketplace.
 *
 * Every figure is read from the database. The specification is explicit that
 * its prices are opening proposals to test, so hardcoding them in this page
 * would make changing them a deploy — and would let the page disagree with
 * what the server actually charges.
 *
 * Buying is not built yet. Rather than a button that does nothing, the page
 * says so: a price list people can read is useful, a checkout that fails is
 * not.
 */

const TIER_STYLE: Record<string, string> = {
  FREE: "border-[#173E7D]/15",
  PRO: "border-[#173E7D]/40",
  PREMIUM: "border-[#D4AF37]",
  AGENCY: "border-[#D4AF37]",
};

const unlimited = (n: number | null) => (n === null ? "Illimité" : String(n));

const Pricing: React.FC = () => {
  const { t } = useI18n();
  const [packs, setPacks] = useState<CreditPack[] | null>(null);
  const [plans, setPlans] = useState<FreelancePlan[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    freelanceService
      .getPricing()
      .then((d) => {
        setPacks(d.packs);
        setPlans(d.plans);
      })
      .catch(() => setFailed(true));
  };

  useEffect(load, []);

  if (failed)
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <ErrorState onRetry={load} />
      </div>
    );

  if (!packs || !plans) return <Loading />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-display font-bold text-[#173E7D]">{t("nav.pricing")}</h1>
      <p className="mt-2 text-[#2B3442]/60">
        Publier un service et répondre à un projet coûtent des crédits. Les clients publient
        gratuitement.
      </p>

      <section className="mt-8">
        <h2 className="text-xl font-display font-bold text-[#173E7D] mb-4 inline-flex items-center gap-2">
          <Coins size={20} className="text-[#D4AF37]" /> Packs de crédits
        </h2>

        {packs.length === 0 ? (
          <EmptyState message="Aucun pack disponible pour le moment." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {packs.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl border-2 border-[#173E7D]/15 bg-white p-5 text-center"
              >
                <p className="text-3xl font-display font-bold text-[#173E7D]" dir="ltr">
                  {p.credits}
                </p>
                <p className="text-[11px] font-black uppercase tracking-widest text-[#173E7D]/40">
                  crédits
                </p>
                <p className="mt-3 text-lg font-bold">
                  <Price value={p.price} currency={p.currency} />
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-display font-bold text-[#173E7D] mb-4">Formules</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border-2 bg-white p-5 flex flex-col ${
                TIER_STYLE[plan.tier] ?? "border-[#173E7D]/15"
              }`}
            >
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-[#173E7D]/50">
                {plan.name}
              </p>
              <p className="mt-2 text-2xl font-display font-bold">
                {Number(plan.price) === 0 ? (
                  t("common.free")
                ) : (
                  <>
                    <Price value={plan.price} currency={plan.currency} />
                    <span className="text-sm font-normal text-[#2B3442]/50"> / mois</span>
                  </>
                )}
              </p>

              <ul className="mt-4 space-y-2 flex-1">
                <li className="text-sm text-[#2B3442]/80 flex gap-2">
                  <Check size={15} className="mt-0.5 text-emerald-600 shrink-0" />
                  {unlimited(plan.maxActiveServices)} service(s) en ligne
                </li>
                <li className="text-sm text-[#2B3442]/80 flex gap-2">
                  <Check size={15} className="mt-0.5 text-emerald-600 shrink-0" />
                  {plan.monthlyProposals === null
                    ? "Propositions payées en crédits"
                    : `${plan.monthlyProposals} propositions / mois`}
                </li>
                <li className="text-sm text-[#2B3442]/80 flex gap-2">
                  <Check size={15} className="mt-0.5 text-emerald-600 shrink-0" />
                  {unlimited(plan.maxPortfolioProjects)} réalisation(s)
                </li>
                <li
                  className={`text-sm flex gap-2 ${
                    plan.prioritySearch ? "text-[#2B3442]/80" : "text-[#2B3442]/35"
                  }`}
                >
                  {plan.prioritySearch ? (
                    <Check size={15} className="mt-0.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Lock size={13} className="mt-0.5 shrink-0" />
                  )}
                  Priorité dans la recherche
                </li>
                <li
                  className={`text-sm flex gap-2 ${
                    plan.weeklyBoosts > 0 ? "text-[#2B3442]/80" : "text-[#2B3442]/35"
                  }`}
                >
                  {plan.weeklyBoosts > 0 ? (
                    <Check size={15} className="mt-0.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Lock size={13} className="mt-0.5 shrink-0" />
                  )}
                  {plan.weeklyBoosts > 0 ? `${plan.weeklyBoosts} boost / semaine` : "Boosts"}
                </li>
                <li
                  className={`text-sm flex gap-2 ${
                    plan.customSubdomain ? "text-[#2B3442]/80" : "text-[#2B3442]/35"
                  }`}
                >
                  {plan.customSubdomain ? (
                    <Check size={15} className="mt-0.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Lock size={13} className="mt-0.5 shrink-0" />
                  )}
                  Adresse personnalisée
                </li>
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Said plainly rather than hidden behind a button that would fail. */}
      <p className="mt-8 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4">
        L'achat en ligne n'est pas encore ouvert. Pour obtenir des crédits, contactez-nous à{" "}
        <a href="mailto:info@darlemploi.dz" className="font-bold underline">
          info@darlemploi.dz
        </a>
        .
      </p>
    </div>
  );
};

export default Pricing;
