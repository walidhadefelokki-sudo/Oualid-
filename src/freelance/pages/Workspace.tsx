import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Coins, FileText, Inbox, Send, ShoppingBag, Sparkles } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { ErrorState, Loading, Price } from "../ui";
import Activate from "./Activate";

/**
 * The freelancer's dashboard.
 *
 * Every number is counted in the database by the workspace endpoint. None of
 * it is derived from an array held in the browser, which is the thing the
 * brief rules out and the thing that quietly stops being true the moment the
 * page is paginated.
 */

interface Workspace {
  active: boolean;
  profile?: {
    username: string;
    displayName: string;
    title: string | null;
    level: string;
    identityVerified: boolean;
    ratingAverage: string | null;
    ratingCount: number;
    completedOrders: number;
    portfolioPublished: boolean;
  };
  stats?: {
    published: number;
    pending: number;
    drafts: number;
    expired: number;
    proposalsSent: number;
    proposalsShortlisted: number;
    activeOrders: number;
    completedOrders: number;
  };
  wallet?: {
    balance: number;
    costs: {
      servicePublication: number;
      proposal: number;
      serviceDurationDays: number;
    };
  };
}

const Stat: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number | string;
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

const Workspace: React.FC = () => {
  const { t } = useI18n();
  const { user, loading: authLoading, signedIn } = useAuth();

  const [data, setData] = useState<Workspace | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    api
      .get("/freelance/me/workspace")
      .then((r) => setData(r.data.data))
      .catch(() => setFailed(true));
  };

  useEffect(() => {
    if (signedIn) load();
  }, [signedIn]);

  if (authLoading) return <Loading />;

  // Not signed in: the recruitment app owns the login screen, so send them
  // there rather than building a second one.
  if (!signedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-display font-bold text-[#173E7D]">{t("nav.signin")}</h1>
        <p className="mt-2 text-[#2B3442]/60">
          Connectez-vous avec votre compte Dar L'Emploi pour accéder à votre espace freelance.
        </p>
        <a
          href="/"
          className="inline-block mt-6 rounded-full px-6 py-3 bg-[#173E7D] text-white font-bold"
        >
          {t("nav.signin")}
        </a>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <ErrorState onRetry={load} />
      </div>
    );
  }

  if (!data) return <Loading />;

  // Signed in with no freelance profile yet: activation is the page.
  if (!data.active) return <Activate onActivated={load} />;

  const p = data.profile!;
  const s = data.stats!;
  const w = data.wallet!;

  const lowBalance = w.balance < w.costs.servicePublication;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <header className="flex flex-wrap items-center gap-4 mb-8">
        <div className="min-w-0">
          <h1 className="text-3xl font-display font-bold text-[#173E7D] break-words">
            {p.displayName}
          </h1>
          <p className="text-[#2B3442]/60">
            {p.title || user?.email}
            {" · "}
            <Link to={`/@${p.username}`} className="text-[#173E7D] font-semibold hover:underline">
              /@{p.username}
            </Link>
          </p>
        </div>

        <div className="ms-auto flex items-center gap-2">
          <Link
            to="/freelance-espace/services/nouveau"
            className="rounded-full px-5 py-2.5 bg-[#173E7D] text-white text-sm font-bold"
          >
            {t("home.ctaPublishService")}
          </Link>
        </div>
      </header>

      <div
        className={`rounded-2xl p-5 mb-8 flex flex-wrap items-center gap-4 ${
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
          Publication : {w.costs.servicePublication} crédits ({w.costs.serviceDurationDays} jours)
          {" · "}
          Proposition : {w.costs.proposal} crédits
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<FileText size={15} />} label="Services en ligne" value={s.published} />
        <Stat
          icon={<Inbox size={15} />}
          label="En modération"
          value={s.pending}
          tone={s.pending > 0 ? "warn" : "default"}
        />
        <Stat icon={<FileText size={15} />} label="Brouillons" value={s.drafts} />
        <Stat
          icon={<Sparkles size={15} />}
          label="Expirés"
          value={s.expired}
          tone={s.expired > 0 ? "warn" : "default"}
        />
        <Stat icon={<Send size={15} />} label="Propositions" value={s.proposalsSent} />
        <Stat
          icon={<Sparkles size={15} />}
          label="Présélectionnées"
          value={s.proposalsShortlisted}
        />
        <Stat icon={<ShoppingBag size={15} />} label="Commandes actives" value={s.activeOrders} />
        <Stat icon={<ShoppingBag size={15} />} label="Terminées" value={s.completedOrders} />
      </div>

      {!p.portfolioPublished && (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-[#173E7D]/20 bg-white p-6">
          <h2 className="font-display text-lg font-bold text-[#173E7D]">
            Votre mini portfolio n'est pas encore publié
          </h2>
          <p className="mt-1 text-sm text-[#2B3442]/60">
            Une page personnelle à l'adresse /@{p.username}, à partager sur les réseaux et dans
            votre CV.
          </p>
        </div>
      )}
    </div>
  );
};

export default Workspace;
