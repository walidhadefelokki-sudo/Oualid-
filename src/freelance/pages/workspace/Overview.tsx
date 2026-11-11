import React from "react";
import { Link } from "react-router-dom";
import { FileText, Inbox, Send, ShoppingBag, Sparkles } from "lucide-react";
import { useI18n } from "../../i18n";
import { useWorkspaceContext } from "../../useWorkspace";
import { Badge, Card, PageHead, Stat, btn } from "../../ui";
import PlanCard from "./PlanCard";

/**
 * The dashboard overview.
 *
 * Every number is counted in the database by the workspace endpoint, never
 * derived from an array held in the browser. Each tile that can lead
 * somewhere does: a count the reader cannot act on is decoration.
 *
 * The canvas puts the credit balance in a navy tile at the head of the row
 * of figures, with the three ordinary counts in white beside it. That is
 * the one number with an action attached, which is why it gets the colour.
 */

/** One of the eight counts. White card, navy number, a link if it leads anywhere. */
const Count: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  to?: string;
  flag?: boolean;
}> = ({ icon, label, value, to, flag }) => {
  const body = (
    <div className="flex h-full flex-col gap-2 rounded-card bg-surface p-5 transition-shadow hover:shadow-[0_8px_30px_rgba(23,62,125,0.10)]">
      <span className="flex items-center gap-2 text-sm text-muted">
        {icon}
        {label}
      </span>
      <span className="text-3xl font-bold text-primary" dir="ltr">
        {value}
      </span>
      {/* Only when there is something to do about it. A badge on every tile
          is a badge on none. */}
      {flag && value > 0 && <Badge tone="warn">{label}</Badge>}
    </div>
  );

  return to ? <Link to={to}>{body}</Link> : body;
};

const Overview: React.FC = () => {
  const { t } = useI18n();
  const { data } = useWorkspaceContext();

  const p = data.profile!;
  const s = data.stats!;
  const w = data.wallet!;
  const e = data.entitlements;

  const lowBalance = w.balance < w.costs.servicePublication;

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        title={`${t("ws.hello")} ${p.displayName}`}
        lede={p.title || undefined}
      >
        <Link to="/freelance-espace/services/nouveau" className={btn("accent")}>
          + {t("home.ctaPublishService")}
        </Link>
      </PageHead>

      {/* --------------------------- the figures ------------------------ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("ws.balance")} value={w.balance} feature>
          <Link to="/acheter-credits" className={btn("accent", "mt-1 self-start px-3.5 py-2.5")}>
            {t("ws.topUp")}
          </Link>
        </Stat>

        <Count
          icon={<FileText size={15} aria-hidden="true" />}
          label={t("ws.live")}
          value={s.published}
          to="/freelance-espace/services"
        />
        <Count
          icon={<Inbox size={15} aria-hidden="true" />}
          label={t("ws.inModeration")}
          value={s.pending}
          to="/freelance-espace/services"
        />
        <Count
          icon={<Sparkles size={15} aria-hidden="true" />}
          label={t("ws.expired")}
          value={s.expired}
          to="/freelance-espace/services"
          flag
        />
      </div>

      {/* The tariff, stated once. It is what the two counts above cost. */}
      <p className="text-sm text-muted">
        {t("pricing.rowPublish")} : <b className="text-primary">{w.costs.servicePublication}</b>{" "}
        {t("ws.credits")} ({w.costs.serviceDurationDays} {t("service.days")}) ·{" "}
        {t("pricing.rowProposal")} : <b className="text-primary">{w.costs.proposal}</b>{" "}
        {t("ws.credits")}
        {lowBalance && (
          <>
            {" — "}
            <Link to="/acheter-credits" className="font-bold text-accent-ink hover:underline">
              {t("ws.lowBalance")}
            </Link>
          </>
        )}
      </p>

      {e && <PlanCard e={e} />}

      {/* ------------------------- the other counts --------------------- */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Count
          icon={<FileText size={15} aria-hidden="true" />}
          label={t("ws.drafts")}
          value={s.drafts}
          to="/freelance-espace/services"
        />
        <Count
          icon={<Send size={15} aria-hidden="true" />}
          label={t("ws.proposalsSent")}
          value={s.proposalsSent}
          to="/freelance-espace/propositions"
        />
        <Count
          icon={<ShoppingBag size={15} aria-hidden="true" />}
          label={t("ws.ordersActive")}
          value={s.activeOrders}
          to="/freelance-espace/commandes"
        />
        <Count
          icon={<ShoppingBag size={15} aria-hidden="true" />}
          label={t("ws.ordersDone")}
          value={s.completedOrders}
          to="/freelance-espace/commandes"
        />
      </div>

      {/* --------------------------- the nudge -------------------------- */}
      {!p.portfolioPublished && (
        <Card className="flex flex-col gap-3 border-2 border-dashed border-line bg-surface">
          <h2 className="text-xl font-bold text-primary">{t("ws.portfolioOff")}</h2>
          <p className="text-[15px] leading-relaxed text-body">
            {t("ws.portfolioOffLede")} <span dir="ltr">/@{p.username}</span>
          </p>
          <Link to="/freelance-espace/portfolio" className={btn("primary", "self-start")}>
            {t("ws.portfolioSetUp")}
          </Link>
        </Card>
      )}
    </div>
  );
};

export default Overview;
