import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Lock } from "lucide-react";
import freelanceService, {
  CreditCosts,
  CreditPack,
  FreelancePlan,
} from "../freelance.service";
import { Badge, Card, EmptyState, ErrorState, Loading, Price, Tabs, Wrap, btn } from "../ui";
import { useI18n } from "../i18n";

/**
 * What it costs to sell on the marketplace.
 *
 * Every figure is read from the database. The specification is explicit that
 * its prices are opening proposals to test, so hardcoding them in this page
 * would make changing them a deploy — and would let the page disagree with
 * what the server actually charges. The tariff table below is the same
 * settings the server charges against, which is why it is a table of real
 * numbers rather than the canvas's "[N] crédits" placeholders.
 *
 * Buying is built, and the page links to it rather than describing it: the
 * packs here are the same rows the checkout charges, so the two cannot
 * disagree about what something costs.
 */

type View = "packs" | "plans";

const unlimited = (n: number | null, t: (k: string) => string) =>
  n === null ? t("pricing.unlimited") : String(n);

/**
 * One plan or pack card.
 *
 * The canvas paints the middle one navy and the others white. Which one is
 * the middle one is not a design decision here — it is whichever the
 * database marks most popular, and absent that, the one in the middle of
 * however many came back.
 */
const CARD = {
  light: "bg-surface text-primary",
  dark: "bg-primary text-white",
};

const Pricing: React.FC = () => {
  const { t } = useI18n();
  const [view, setView] = useState<View>("packs");
  const [packs, setPacks] = useState<CreditPack[] | null>(null);
  const [plans, setPlans] = useState<FreelancePlan[] | null>(null);
  const [costs, setCosts] = useState<CreditCosts | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    freelanceService
      .getPricing()
      .then((d) => {
        setPacks(d.packs);
        setPlans(d.plans);
        setCosts(d.costs ?? null);
      })
      .catch(() => setFailed(true));
  };

  useEffect(load, []);

  if (failed)
    return (
      <Wrap className="py-16">
        <ErrorState onRetry={load} />
      </Wrap>
    );

  if (!packs || !plans) return <Loading />;

  const list: Array<CreditPack | FreelancePlan> = view === "packs" ? packs : plans;
  /* The one the canvas paints navy. Middle of the row, which is where a
     three-up price table puts the one it wants chosen. */
  const feature = list.length > 1 ? Math.floor((list.length - 1) / 2) : -1;

  return (
    <Wrap className="flex flex-col gap-14 py-12 sm:gap-16 sm:py-16">
      {/* ----------------------------- heading -------------------------- */}
      <section className="flex flex-col items-center gap-5 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.08em] text-accent-ink">
          {t("pricing.eyebrow")}
        </p>
        <h1 className="max-w-4xl text-4xl font-bold leading-tight text-primary sm:text-5xl">
          {t("pricing.title")}
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-body">{t("pricing.lede")}</p>

        <Tabs<View>
          label={t("pricing.mode")}
          value={view}
          onChange={setView}
          options={[
            { value: "packs", label: t("pricing.packs") },
            { value: "plans", label: t("pricing.subscription") },
          ]}
          on="surface"
        />
      </section>

      {/* ------------------------------ cards --------------------------- */}
      <section>
        {list.length === 0 ? (
          <EmptyState message={t("pricing.none")} />
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">
            {view === "packs"
              ? packs.map((p, i) => (
                  <PackCard key={p.id} pack={p} dark={i === feature} popular={i === feature} />
                ))
              : plans.map((p, i) => (
                  <PlanCard key={p.id} plan={p} dark={i === feature} popular={i === feature} />
                ))}
          </div>
        )}
      </section>

      {/* ------------------------- the credit tariff -------------------- */}
      {costs && (
        <Card as="section" className="flex flex-col gap-6 rounded-hero">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-bold text-primary sm:text-3xl">{t("pricing.costTitle")}</h2>
            <span className="text-sm text-muted">{t("pricing.costHint")}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-150 border-collapse text-base">
              <thead>
                <tr className="text-start text-sm text-muted">
                  <th className="border-b-2 border-line-soft px-4 py-3 text-start font-bold">
                    {t("pricing.colAction")}
                  </th>
                  <th className="border-b-2 border-line-soft px-4 py-3 text-start font-bold">
                    {t("pricing.colCredits")}
                  </th>
                  <th className="border-b-2 border-line-soft px-4 py-3 text-start font-bold">
                    {t("pricing.colDuration")}
                  </th>
                </tr>
              </thead>
              <tbody>
                <Tariff
                  name={t("pricing.rowPublish")}
                  note={t("pricing.rowPublishNote")}
                  credits={`${costs.servicePublication} ${t("ws.credits")}`}
                  duration={`${costs.serviceDurationDays} ${t("service.days")}`}
                />
                <Tariff
                  name={t("pricing.rowProposal")}
                  note={t("pricing.rowProposalNote")}
                  credits={`${costs.proposal} ${t("ws.credits")}`}
                  duration="—"
                />
                <Tariff
                  name={t("pricing.rowRenew")}
                  note={t("pricing.rowRenewNote")}
                  credits={`${costs.servicePublication} ${t("ws.credits")}`}
                  duration={`${costs.serviceDurationDays} ${t("service.days")}`}
                />
                {/* The trial, which is the one row that costs nothing. It is
                    a real setting, so it is stated rather than implied. */}
                <Tariff
                  name={t("pricing.rowTrial")}
                  note={t("pricing.rowTrialNote")}
                  credits={t("common.free")}
                  duration={`${costs.trialServices} + ${costs.trialProposals}`}
                  last
                />
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* --------------------------- payment band ----------------------- */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-hero bg-primary p-8 sm:p-9">
          <h2 className="text-2xl font-bold text-white">{t("pricing.payTitle")}</h2>
          <p className="text-base leading-relaxed text-on-navy">{t("pricing.payLede")}</p>
          <div className="flex flex-wrap gap-2.5">
            {["CIB", "EDAHABIA"].map((m) => (
              <span
                key={m}
                className="rounded-xl bg-surface px-4 py-2.5 text-sm font-bold text-primary"
              >
                {m}
              </span>
            ))}
          </div>
          <Link to="/acheter-credits" className={btn("accent", "mt-auto self-start")}>
            {t("pricing.buyCredits")}
          </Link>
        </div>

        <Card className="flex flex-col rounded-hero">
          <h2 className="mb-3 text-2xl font-bold text-primary">{t("service.faq")}</h2>
          {[1, 2, 3].map((n) => (
            <details key={n} className="border-t border-line-soft py-3.5">
              <summary className="cursor-pointer text-base font-bold text-primary">
                {t(`pricing.q${n}`)}
              </summary>
              <p className="mt-2.5 text-[15px] leading-relaxed text-body">{t(`pricing.a${n}`)}</p>
            </details>
          ))}
        </Card>
      </section>
    </Wrap>
  );
};

/* -------------------------------------------------------------------------- */

const Tariff: React.FC<{
  name: string;
  note: string;
  credits: string;
  duration: string;
  last?: boolean;
}> = ({ name, note, credits, duration, last }) => {
  const cell = last ? "px-4 py-4" : "border-b border-line-soft px-4 py-4";
  return (
    <tr>
      <td className={cell}>
        <b className="text-primary">{name}</b>
        <br />
        <span className="text-sm text-muted">{note}</span>
      </td>
      <td className={cell + " font-bold text-primary whitespace-nowrap"}>{credits}</td>
      <td className={cell + " whitespace-nowrap text-body"}>{duration}</td>
    </tr>
  );
};

const PackCard: React.FC<{ pack: CreditPack; dark: boolean; popular: boolean }> = ({
  pack,
  dark,
  popular,
}) => {
  const { t } = useI18n();
  return (
    <div className={`flex flex-col gap-4 rounded-hero p-8 sm:p-9 ${dark ? CARD.dark : CARD.light}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={`text-2xl font-bold ${dark ? "text-white" : "text-primary"}`}>
          {pack.name}
        </h2>
        {popular && <Badge tone="accent">{t("pricing.mostChosen")}</Badge>}
      </div>

      <Price
        value={pack.price}
        currency={pack.currency}
        className={`text-4xl font-bold ${dark ? "text-white" : "text-primary"}`}
      />

      <div className={`text-base font-bold ${dark ? "text-white" : "text-primary"}`} dir="ltr">
        {pack.credits} {t("ws.credits")}
      </div>

      <Link
        to="/acheter-credits"
        className={btn(dark ? "accent" : "ghost", "mt-auto w-full")}
      >
        {t("pricing.buy")}
      </Link>
    </div>
  );
};

const PlanCard: React.FC<{ plan: FreelancePlan; dark: boolean; popular: boolean }> = ({
  plan,
  dark,
  popular,
}) => {
  const { t } = useI18n();
  const free = Number(plan.price) === 0;

  /* Each line says whether the plan has the thing. A locked line stays
     legible rather than fading out — "what this plan does not include" is
     information, and 35 % opacity is not a way to say it. */
  const rows: Array<[boolean, string]> = [
    [true, `${unlimited(plan.maxActiveServices, t)} ${t("pricing.liveServices")}`],
    [
      true,
      plan.monthlyProposals === null
        ? t("pricing.proposalsInCredits")
        : `${plan.monthlyProposals} ${t("pricing.proposalsMonthly")}`,
    ],
    [true, `${unlimited(plan.maxPortfolioProjects, t)} ${t("portfolio.projects")}`],
    [plan.prioritySearch, t("pricing.priority")],
    [
      plan.weeklyBoosts > 0,
      plan.weeklyBoosts > 0
        ? `${plan.weeklyBoosts} ${t("pricing.boostsWeekly")}`
        : t("pricing.boosts"),
    ],
    [plan.customSubdomain, t("pricing.customAddress")],
  ];

  return (
    <div className={`flex flex-col gap-4 rounded-hero p-8 sm:p-9 ${dark ? CARD.dark : CARD.light}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={`text-2xl font-bold ${dark ? "text-white" : "text-primary"}`}>
          {plan.name}
        </h2>
        {popular && <Badge tone="accent">{t("pricing.mostChosen")}</Badge>}
      </div>

      <p className={`flex items-baseline gap-2 ${dark ? "text-white" : "text-primary"}`}>
        {free ? (
          <span className="text-4xl font-bold">{t("common.free")}</span>
        ) : (
          <>
            <Price
              value={plan.price}
              currency={plan.currency}
              className="text-4xl font-bold"
            />
            <span className="text-base font-bold">{t("pricing.perMonth")}</span>
          </>
        )}
      </p>

      <ul className="flex flex-1 list-none flex-col gap-2.5 p-0">
        {rows.map(([on, label]) => (
          <li
            key={label}
            className={`flex gap-2.5 text-[15px] ${dark ? "text-on-navy" : "text-body"}`}
          >
            {on ? (
              <Check
                size={16}
                className={"mt-0.5 shrink-0 " + (dark ? "text-secondary" : "text-success")}
                aria-hidden="true"
              />
            ) : (
              <Lock size={14} className="mt-1 shrink-0 text-muted" aria-hidden="true" />
            )}
            <span className={on ? "" : "text-muted"}>{label}</span>
          </li>
        ))}
      </ul>

      <Link to="/acheter-credits" className={btn(dark ? "accent" : "ghost", "mt-auto w-full")}>
        {free ? t("pricing.start") : t("pricing.subscribe")}
      </Link>
    </div>
  );
};

export default Pricing;
