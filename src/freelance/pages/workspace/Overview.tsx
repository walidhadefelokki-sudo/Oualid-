import React from "react";
import { Link } from "react-router-dom";
import { Coins, FileText, Inbox, Send, ShoppingBag, Sparkles } from "lucide-react";
import { useI18n } from "../../i18n";
import { useWorkspaceContext } from "../../useWorkspace";
import PlanCard from "./PlanCard";

/**
 * The dashboard overview.
 *
 * Every number is counted in the database by the workspace endpoint, never
 * derived from an array held in the browser. Each tile that can lead
 * somewhere does: a count the reader cannot act on is decoration.
 */

const Stat: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  to?: string;
  tone?: "default" | "warn";
}> = ({ icon, label, value, to, tone = "default" }) => {
  const body = (
    <div
      className={`rounded-2xl border-2 bg-white p-5 h-full transition-all ${
        tone === "warn"
          ? "border-amber-300 hover:border-amber-400"
          : "border-[#173E7D]/15 hover:border-[#173E7D]/40"
      } ${to ? "hover:shadow-lg" : ""}`}
    >
      <div className="flex items-center gap-2 text-[#173E7D]/50">
        {icon}
        <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-display font-bold text-[#173E7D]" dir="ltr">
        {value}
      </p>
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
    <>
      <header className="flex flex-wrap items-center gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-display font-bold text-[#173E7D] break-words">
            {p.displayName}
          </h1>
          <p className="text-sm text-[#2B3442]/60 break-words">
            {p.title || "Profil freelance"}
            {" · "}
            <Link to={`/@${p.username}`} className="text-[#173E7D] font-semibold hover:underline">
              <span dir="ltr">/@{p.username}</span>
            </Link>
          </p>
        </div>
      </header>

      <div
        className={`rounded-2xl p-5 mb-6 flex flex-wrap items-center gap-4 ${
          lowBalance
            ? "bg-amber-50 border-2 border-amber-300"
            : "bg-gradient-to-r from-[#0B1E3D] to-[#173E7D] text-white"
        }`}
      >
        <Coins size={22} className={lowBalance ? "text-amber-600" : "text-[#D4AF37]"} />
        <div className="min-w-0">
          <p
            className={`text-[11px] font-black uppercase tracking-widest ${
              lowBalance ? "text-amber-700" : "text-white/60"
            }`}
          >
            Crédits
          </p>
          <p className="text-2xl font-display font-bold" dir="ltr">
            {w.balance}
          </p>
        </div>
        <p className={`text-sm ${lowBalance ? "text-amber-800" : "text-white/70"}`}>
          Publication {w.costs.servicePublication} crédits ({w.costs.serviceDurationDays} jours)
          {" · "}
          Proposition {w.costs.proposal} crédits
        </p>
        <Link
          to="/tarifs"
          className={`ms-auto rounded-full px-5 py-2 text-sm font-bold ${
            lowBalance ? "bg-amber-500 text-white" : "bg-[#D4AF37] text-[#0B1E3D]"
          }`}
        >
          Acheter des crédits
        </Link>
      </div>

      {e && (
        <div className="mb-6">
          <PlanCard e={e} />
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          icon={<FileText size={15} />}
          label="En ligne"
          value={s.published}
          to="/freelance-espace/services"
        />
        <Stat
          icon={<Inbox size={15} />}
          label="En modération"
          value={s.pending}
          to="/freelance-espace/services"
          tone={s.pending > 0 ? "warn" : "default"}
        />
        <Stat
          icon={<FileText size={15} />}
          label="Brouillons"
          value={s.drafts}
          to="/freelance-espace/services"
        />
        <Stat
          icon={<Sparkles size={15} />}
          label="Expirés"
          value={s.expired}
          to="/freelance-espace/services"
          tone={s.expired > 0 ? "warn" : "default"}
        />
        <Stat
          icon={<Send size={15} />}
          label="Propositions"
          value={s.proposalsSent}
          to="/freelance-espace/propositions"
        />
        <Stat
          icon={<Sparkles size={15} />}
          label="Présélectionnées"
          value={s.proposalsShortlisted}
          to="/freelance-espace/propositions"
        />
        <Stat
          icon={<ShoppingBag size={15} />}
          label="En cours"
          value={s.activeOrders}
          to="/freelance-espace/commandes"
        />
        <Stat
          icon={<ShoppingBag size={15} />}
          label="Terminées"
          value={s.completedOrders}
          to="/freelance-espace/commandes"
        />
      </div>

      {!p.portfolioPublished && (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-[#173E7D]/20 bg-white p-6">
          <h2 className="font-display text-lg font-bold text-[#173E7D]">
            Votre mini portfolio n'est pas encore publié
          </h2>
          <p className="mt-1 text-sm text-[#2B3442]/60">
            Une page personnelle à l'adresse <span dir="ltr">/@{p.username}</span>, à partager sur
            les réseaux et dans votre CV. {t("empty.hint")}
          </p>
        </div>
      )}
    </>
  );
};

export default Overview;
