import React, { useEffect, useState } from "react";
import { LayoutDashboard, Building2, Users, ClipboardCheck, LogOut, Contact, Menu, X, Briefcase, CalendarDays, ShieldCheck , ListTodo, Wallet, KeyRound, RefreshCw } from "lucide-react";
import CrmTab from "./CrmTab";
import UsersTab from "./UsersTab";
import JobsTab from "./JobsTab";
import SchedulesTab from "./SchedulesTab";
import FreelanceModerationTab from "./FreelanceModerationTab";
import TeamTasksTab from "./TeamTasksTab";
import PaymentsTab from "./PaymentsTab";
import { OfferSection } from "../recruiter/PreselectionByOffer";
import type {
  PreselectionByOfferResult,
  PreselectionCandidateRow,
} from "../../services/preselectionByOffer.service";
import AdminAccessTab from "./AdminAccessTab";
import api from "../../services/api";
import adminService, {
  AdminStats,
  Company,
  CorporatePendingApplication,
} from "../../services/admin.service";

type Tab = "overview" | "plans" | "payments" | "users" | "jobs" | "schedules" | "crm" | "preselection" | "freelance-moderation" | "team-tasks" | "admin-access";

/**
 * What this administrator may reach.
 *
 * Read from /auth/me rather than carried in the token: a JWT here lasts
 * thirty days, so a revoked permission would keep its menu entry for a month.
 * Null while it is being fetched — the sidebar renders nothing rather than
 * flashing entries that are about to disappear.
 */
interface AdminAccess {
  isSuperAdmin: boolean;
  scopes: string[];
}

/** The scope each tab needs. The server enforces the same mapping per route;
 *  this only avoids offering a page that would answer 403. */
const TAB_SCOPE: Record<Exclude<Tab, "admin-access">, string> = {
  overview: "overview",
  plans: "plans",
  payments: "payments",
  users: "users",
  jobs: "jobs",
  schedules: "schedules",
  crm: "crm",
  preselection: "preselection",
  "freelance-moderation": "freelance_moderation",
  "team-tasks": "team_tasks",
};

interface AdminDashboardProps {
  onGoHome: () => void;
}

const PLAN_OPTIONS: Array<"FREE" | "PREMIUM" | "CORPORATE"> = ["FREE", "PREMIUM", "CORPORATE"];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onGoHome }) => {
  const [tab, setTab] = useState<Tab>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [access, setAccess] = useState<AdminAccess | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/auth/me")
      .then(({ data }) => {
        if (cancelled) return;
        const u = data.data.user;
        setAccess({
          isSuperAdmin: Boolean(u.isSuperAdmin),
          scopes: Array.isArray(u.adminScopes) ? u.adminScopes : [],
        });
      })
      .catch(() => {
        // Fail closed. A failed read must not hand somebody the whole menu;
        // every route checks again anyway, so the worst case is an empty
        // sidebar and a visible reason.
        if (!cancelled) setAccess({ isSuperAdmin: false, scopes: [] });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const allowed = (t: Tab) => {
    if (!access) return false;
    if (access.isSuperAdmin) return true;
    // Granting access is never delegated: see AdminAccessTab.
    if (t === "admin-access") return false;
    return access.scopes.includes(TAB_SCOPE[t]);
  };

  /* Land on something this administrator can actually open. Overview is the
     default and a limited administrator may not have it, in which case the
     first permitted section is a better welcome than a 403. */
  useEffect(() => {
    if (!access || allowed(tab)) return;

    const first = (Object.keys(TAB_SCOPE) as Tab[]).find(allowed);
    if (first) setTab(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access]);

  /* Choosing a section closes the drawer — on a phone it covers the very
     content you just asked to see. On desktop the sidebar is always in the
     layout and this does nothing. */
  const go = (next: Tab) => {
    setTab(next);
    setMenuOpen(false);
  };

  const nav = (
    <>
      <div className="flex items-center gap-2 mb-8 px-2">
        <LayoutDashboard size={22} />
        <span className="font-display text-lg">Admin</span>
      </div>

      <nav className="flex flex-col gap-1">
        {/* Only what this administrator may open. Hiding an entry is not
            access control — every route checks as well — but offering a page
            that answers 403 is not an interface. */}
        {allowed("overview") && <SidebarItem icon={<LayoutDashboard size={18} />} label="Aperçu" active={tab === "overview"} onClick={() => go("overview")} />}
        {allowed("plans") && <SidebarItem icon={<Building2 size={18} />} label="Plans recruteurs" active={tab === "plans"} onClick={() => go("plans")} />}
        {allowed("payments") && <SidebarItem icon={<Wallet size={18} />} label="Paiements" active={tab === "payments"} onClick={() => go("payments")} />}
        {allowed("users") && <SidebarItem icon={<Users size={18} />} label="Comptes" active={tab === "users"} onClick={() => go("users")} />}
        {allowed("jobs") && <SidebarItem icon={<Briefcase size={18} />} label="Offres" active={tab === "jobs"} onClick={() => go("jobs")} />}
        {allowed("schedules") && <SidebarItem icon={<CalendarDays size={18} />} label="Agenda" active={tab === "schedules"} onClick={() => go("schedules")} />}
        {allowed("crm") && <SidebarItem icon={<Contact size={18} />} label="CRM" active={tab === "crm"} onClick={() => go("crm")} />}
        {allowed("preselection") && <SidebarItem icon={<ClipboardCheck size={18} />} label="Présélection Corporate" active={tab === "preselection"} onClick={() => go("preselection")} />}
        {allowed("freelance-moderation") && <SidebarItem icon={<ShieldCheck size={18} />} label="Modération freelance" active={tab === "freelance-moderation"} onClick={() => go("freelance-moderation")} />}
        {allowed("team-tasks") && <SidebarItem icon={<ListTodo size={18} />} label="Tâches d'équipe" active={tab === "team-tasks"} onClick={() => go("team-tasks")} />}
        {allowed("admin-access") && <SidebarItem icon={<KeyRound size={18} />} label="Accès admin" active={tab === "admin-access"} onClick={() => go("admin-access")} />}
      </nav>

      <button onClick={onGoHome} className="mt-auto flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition">
        <LogOut size={16} />
        <span className="text-sm">Retour au site</span>
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-accent flex">
      {/* Desktop sidebar. Was w-64 shrink-0 at every width, so on a 375px
          phone it took two thirds of the screen and left the tables ~119px. */}
      <aside className="hidden lg:flex w-64 bg-primary text-white flex-col p-4 shrink-0">
        {nav}
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="fixed inset-y-0 left-0 w-64 max-w-[85vw] bg-primary text-white flex flex-col p-4 z-50 lg:hidden shadow-2xl">
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white"
              aria-label="Fermer le menu"
            >
              <X size={20} />
            </button>
            {nav}
          </aside>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Only way into the menu once the sidebar is hidden. */}
        <header className="lg:hidden flex items-center gap-3 bg-primary text-white px-4 py-3 sticky top-0 z-30">
          <button onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu">
            <Menu size={22} />
          </button>
          <span className="font-display">Admin</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
          {/* An administrator with no section at all. Says so, rather than
              showing an empty frame they would read as a broken page. */}
          {access && !access.isSuperAdmin && access.scopes.length === 0 && (
            <div className="bg-white rounded-xl p-12 text-center max-w-xl mx-auto">
              <KeyRound size={28} className="mx-auto text-primary/25" />
              <p className="mt-3 font-bold text-primary/70">Aucune section ne vous est accordée</p>
              <p className="mt-1 text-sm text-primary/50">
                Votre compte est administrateur mais aucune section ne lui a encore été
                attribuée. Demandez à un administrateur sans restriction de vous en
                accorder depuis « Accès admin ».
              </p>
            </div>
          )}

          {allowed("overview") && tab === "overview" && <OverviewTab />}
          {allowed("plans") && tab === "plans" && <PlansTab />}
          {allowed("payments") && tab === "payments" && <PaymentsTab />}
          {allowed("users") && tab === "users" && <UsersTab />}
          {allowed("jobs") && tab === "jobs" && <JobsTab />}
          {allowed("schedules") && tab === "schedules" && <SchedulesTab />}
          {allowed("crm") && tab === "crm" && <CrmTab />}
          {allowed("preselection") && tab === "preselection" && <PreselectionTab />}
          {allowed("freelance-moderation") && tab === "freelance-moderation" && <FreelanceModerationTab />}
          {allowed("team-tasks") && tab === "team-tasks" && <TeamTasksTab />}
          {allowed("admin-access") && tab === "admin-access" && <AdminAccessTab />}
        </main>
      </div>
    </div>
  );
};

const SidebarItem: React.FC<{ icon: React.ReactNode; label: string; active: boolean; onClick: () => void }> = ({
  icon,
  label,
  active,
  onClick,
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition ${
      active ? "bg-secondary text-primary font-semibold" : "text-white/80 hover:bg-white/10"
    }`}
  >
    {icon}
    {label}
  </button>
);

// ============================================================
// OVERVIEW
// ============================================================

const OverviewTab: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminService
      .getStats()
      .then(setStats)
      .catch((e) => setError(e?.response?.data?.message || "Échec du chargement des statistiques"));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!stats) return <LoadingBox />;

  const cards = [
    { label: "Utilisateurs au total", value: stats.totalUsers },
    { label: "Recruteurs", value: stats.totalRecruiters },
    { label: "Candidats", value: stats.totalCandidates },
    { label: "Entreprises", value: stats.totalCompanies },
    { label: "Offres publiées", value: stats.totalJobs },
    { label: "Tickets de support ouverts", value: stats.pendingTickets },
  ];

  return (
    <div>
      <h1 className="text-2xl font-display mb-6">Aperçu</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl p-5 shadow-sm">
            <p className="text-sm text-primary/60">{c.label}</p>
            <p className="text-3xl font-display mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-semibold mb-3">Entreprises par plan</h2>
      <div className="flex gap-4">
        {stats.planCounts.map((p) => (
          <div key={p.plan} className="bg-white rounded-xl px-5 py-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-primary/60">{p.plan}</p>
            <p className="text-2xl font-display">{p._count}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// PLAN MANAGEMENT
// ============================================================

const PlansTab: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminService
      .getCompanies()
      .then(setCompanies)
      .catch((e) => setError(e?.response?.data?.message || "Échec du chargement des entreprises"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  /**
   * Sets a company's annonce balance.
   *
   * Sends the number the administrator typed, not a delta: the endpoint's
   * "credits" field replaces the balance. Typing what it should be is the
   * whole point — working out "it says 3, they bought 5, so add 2" by hand is
   * how a balance ends up wrong the other way.
   */
  const handlePostingsChange = async (companyId: string, credits: number) => {
    setSavingId(companyId);
    try {
      const updated = await adminService.setCompanyPostings(companyId, credits);
      setCompanies((prev) =>
        prev.map((c) => (c.id === companyId ? { ...c, postingCredits: updated.postingCredits } : c))
      );
    } catch (e: any) {
      alert(e?.response?.data?.message || "Échec de la mise à jour des annonces");
      load(); // put the input back to what the server actually holds
    } finally {
      setSavingId(null);
    }
  };

  const handlePlanChange = async (companyId: string, plan: "FREE" | "PREMIUM" | "CORPORATE") => {
    setSavingId(companyId);
    try {
      await adminService.updateCompanyPlan(companyId, plan);
      setCompanies((prev) => prev.map((c) => (c.id === companyId ? { ...c, plan } : c)));
    } catch (e: any) {
      alert(e?.response?.data?.message || "Échec de la mise à jour du plan");
    } finally {
      setSavingId(null);
    }
  };

  if (error) return <ErrorBox message={error} />;

  return (
    <div>
      <h1 className="text-2xl font-display mb-6">Plans recruteurs</h1>

      {loading ? (
        <LoadingBox />
      ) : companies.length === 0 ? (
        <EmptyBox message="Aucune entreprise pour le moment." />
      ) : (
        /* overflow-hidden clipped the six columns rather than letting them
           scroll, so on a phone the plan control was simply unreachable. */
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="bg-primary/5 text-left text-primary/60 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Entreprise</th>
                <th className="px-4 py-3">Recruteurs</th>
                <th className="px-4 py-3">Offres publiées</th>
                <th className="px-4 py-3">Plan actuel</th>
                <th className="px-4 py-3">Annonces restantes</th>
                <th className="px-4 py-3">Changer de plan</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-t border-primary/10">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c.members.length}</td>
                  <td className="px-4 py-3">{c.jobs.length}</td>
                  <td className="px-4 py-3">
                    <PlanBadge plan={c.plan} />
                  </td>
                  <td className="px-4 py-3">
                    <PostingsEditor
                      company={c}
                      disabled={savingId === c.id}
                      onSave={(credits) => handlePostingsChange(c.id, credits)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={c.plan}
                      disabled={savingId === c.id}
                      onChange={(e) => handlePlanChange(c.id, e.target.value as any)}
                      className="border border-primary/20 rounded-lg px-2 py-1.5 text-sm disabled:opacity-50"
                    >
                      {PLAN_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/**
 * The annonce balance for one company.
 *
 * Only the Annonces plan spends this balance — FREE is capped at a single
 * offer whatever the number says, and CORPORATE publishes without limit — so
 * on those two the field is shown but labelled as not in use, rather than
 * hidden. An administrator moving a company onto Annonces needs to see the
 * balance they are about to hand over.
 */
const PostingsEditor: React.FC<{
  company: Company;
  disabled: boolean;
  onSave: (credits: number) => void;
}> = ({ company, disabled, onSave }) => {
  const [value, setValue] = useState(String(company.postingCredits ?? 0));

  // Follow the server when the row reloads, but not while it is being edited.
  useEffect(() => {
    setValue(String(company.postingCredits ?? 0));
  }, [company.postingCredits]);

  const parsed = Number(value);
  const valid = Number.isInteger(parsed) && parsed >= 0 && parsed <= 1000;
  const dirty = parsed !== (company.postingCredits ?? 0);
  const spends = company.plan === "PREMIUM";

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        max={1000}
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && valid && dirty) onSave(parsed);
        }}
        className={`w-20 border rounded-lg px-2 py-1.5 text-sm disabled:opacity-50 ${
          valid ? "border-primary/20" : "border-red-400"
        }`}
      />
      <button
        onClick={() => onSave(parsed)}
        disabled={disabled || !valid || !dirty}
        className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold disabled:opacity-40"
      >
        {disabled ? "…" : "OK"}
      </button>
      {!spends && (
        <span className="text-[11px] text-primary/40 whitespace-nowrap">
          {company.plan === "CORPORATE" ? "illimité" : "non utilisé"}
        </span>
      )}
    </div>
  );
};

const PlanBadge: React.FC<{ plan: string }> = ({ plan }) => {
  const styles: Record<string, string> = {
    FREE: "bg-gray-100 text-gray-700",
    PREMIUM: "bg-secondary/20 text-secondary",
    CORPORATE: "bg-primary text-white",
  };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[plan] || ""}`}>{plan}</span>;
};

// ============================================================
// CORPORATE PRESELECTION OVERRIDE
// ============================================================

/**
 * Corporate candidatures waiting on a decision from the platform team.
 *
 * This was a flat list: one row per application, a name, an e-mail,
 * "poste @ entreprise" and two buttons. Candidates for a developer post and
 * for an accountant post sat in one undifferentiated column, and there was
 * nothing to decide on — no CV, no skills, no score, no reason.
 *
 * It is now the offer, as a card, with its candidatures inside it — the same
 * component the recruiter's own preselection screen uses, because it is the
 * same decision taken by a different person.
 */
const PreselectionTab: React.FC = () => {
  const [data, setData] = useState<PreselectionByOfferResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .get("/admin/preselections/corporate-pending/by-offer")
      .then(({ data: body }) => setData(body.data))
      .catch((e) =>
        setError(e?.response?.data?.message || "Échec du chargement des candidatures")
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  /**
   * Records a decision and takes the candidate off the queue.
   *
   * Removed locally rather than refetching: the decision moves them out of
   * PENDING, so the next load would drop them anyway, and a reviewer working
   * through a list should not have it rebuild under them after every click.
   * An offer left with nobody goes too.
   */
  const decide = async (
    candidate: PreselectionCandidateRow,
    status: "SHORTLISTED" | "REJECTED"
  ) => {
    const verb = status === "SHORTLISTED" ? "présélectionner" : "rejeter";
    if (!window.confirm(`Voulez-vous ${verb} ${candidate.fullName} ?`)) return;

    const comment = window.prompt("Commentaire facultatif :") || undefined;

    setActingId(candidate.applicationId);
    try {
      await adminService.adminPreselect(candidate.applicationId, { status, comment });

      setData((prev) =>
        prev
          ? {
              ...prev,
              offers: prev.offers
                .map((o) => ({
                  ...o,
                  candidates: o.candidates.filter(
                    (c) => c.applicationId !== candidate.applicationId
                  ),
                }))
                .filter((o) => o.candidates.length > 0),
              totals: { ...prev.totals, candidates: Math.max(0, prev.totals.candidates - 1) },
            }
          : prev
      );
    } catch (e: any) {
      alert(e?.response?.data?.message || "Échec de l'enregistrement de la décision");
    } finally {
      setActingId(null);
    }
  };

  if (error) return <ErrorBox message={error} />;

  const totals = data?.totals;

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-display">Présélection Corporate</h1>
        <button
          onClick={load}
          aria-label="Rafraîchir"
          className="p-2 rounded-lg border border-primary/20 text-primary/60 hover:text-primary"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <p className="text-sm text-primary/60 mb-6">
        Candidatures des entreprises au plan CORPORATE en attente d'une décision.
        Les candidats sont classés au sein de chaque offre — les comparer d'un poste
        à l'autre n'aurait pas de sens.
      </p>

      {totals && totals.candidates > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6 max-w-lg">
          <div className="rounded-xl border-2 border-primary/12 bg-white px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-primary/45">
              En attente
            </p>
            <p className="mt-1 text-2xl font-display font-bold text-primary">
              {totals.candidates}
            </p>
          </div>
          <div className="rounded-xl border-2 border-primary/12 bg-white px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-primary/45">
              Offres
            </p>
            <p className="mt-1 text-2xl font-display font-bold text-primary">
              {totals.offers}
            </p>
          </div>
          <div className="rounded-xl border-2 border-primary/12 bg-white px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-widest text-primary/45">
              Entreprises
            </p>
            <p className="mt-1 text-2xl font-display font-bold text-primary">
              {(totals as { companies?: number }).companies ?? "—"}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingBox />
      ) : !data || data.offers.length === 0 ? (
        <EmptyBox message="Rien en attente — tout est à jour." />
      ) : (
        <div className="space-y-5">
          {data.offers.map((offer, i) => (
            <OfferSection
              key={offer.id}
              offer={offer}
              /* The first one open: a reviewer is here to work through a
                 queue, not to click an accordion before starting. */
              defaultOpen={i === 0}
              busyApplicationId={actingId}
              onOpenCV={(c) => c.cvUrl && window.open(c.cvUrl, "_blank", "noopener")}
              onShortlist={(c) => decide(c, "SHORTLISTED")}
              onReject={(c) => decide(c, "REJECTED")}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// SHARED
// ============================================================

const LoadingBox: React.FC = () => <div className="text-primary/50 text-sm">Chargement…</div>;
const ErrorBox: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-4">{message}</div>
);
const EmptyBox: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-primary/50 text-sm bg-white rounded-xl p-6 text-center">{message}</div>
);

export default AdminDashboard;
