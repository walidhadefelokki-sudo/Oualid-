import React, { useEffect, useState } from "react";
import { LayoutDashboard, Building2, Users, ClipboardCheck, LogOut } from "lucide-react";
import adminService, {
  AdminStats,
  Company,
  CorporatePendingApplication,
} from "../../services/admin.service";

type Tab = "overview" | "plans" | "preselection";

interface AdminDashboardProps {
  onGoHome: () => void;
}

const PLAN_OPTIONS: Array<"FREE" | "PREMIUM" | "CORPORATE"> = ["FREE", "PREMIUM", "CORPORATE"];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onGoHome }) => {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="min-h-screen bg-accent flex">
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-white flex flex-col p-4 shrink-0">
        <div className="flex items-center gap-2 mb-8 px-2">
          <LayoutDashboard size={22} />
          <span className="font-display text-lg">Admin</span>
        </div>

        <nav className="flex flex-col gap-1">
          <SidebarItem icon={<LayoutDashboard size={18} />} label="Aperçu" active={tab === "overview"} onClick={() => setTab("overview")} />
          <SidebarItem icon={<Building2 size={18} />} label="Plans recruteurs" active={tab === "plans"} onClick={() => setTab("plans")} />
          <SidebarItem icon={<ClipboardCheck size={18} />} label="Présélection Corporate" active={tab === "preselection"} onClick={() => setTab("preselection")} />
        </nav>

        <button onClick={onGoHome} className="mt-auto flex items-center gap-2 px-3 py-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition">
          <LogOut size={16} />
          <span className="text-sm">Retour au site</span>
        </button>
      </aside>

      {/* Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {tab === "overview" && <OverviewTab />}
        {tab === "plans" && <PlansTab />}
        {tab === "preselection" && <PreselectionTab />}
      </main>
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
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-primary/5 text-left text-primary/60 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Entreprise</th>
                <th className="px-4 py-3">Recruteurs</th>
                <th className="px-4 py-3">Offres</th>
                <th className="px-4 py-3">Plan actuel</th>
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

const PreselectionTab: React.FC = () => {
  const [apps, setApps] = useState<CorporatePendingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    adminService
      .getCorporatePendingPreselections()
      .then(setApps)
      .catch((e) => setError(e?.response?.data?.message || "Échec du chargement des candidatures"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const decide = async (applicationId: string, status: "SHORTLISTED" | "REJECTED") => {
    const comment = window.prompt("Commentaire facultatif pour cette décision :") || undefined;
    setActingId(applicationId);
    try {
      await adminService.adminPreselect(applicationId, { status, comment });
      setApps((prev) => prev.filter((a) => a.id !== applicationId));
    } catch (e: any) {
      alert(e?.response?.data?.message || "Échec de l'enregistrement de la décision");
    } finally {
      setActingId(null);
    }
  };

  if (error) return <ErrorBox message={error} />;

  return (
    <div>
      <h1 className="text-2xl font-display mb-2">Présélection Corporate</h1>
      <p className="text-sm text-primary/60 mb-6">
        Candidatures des entreprises au plan CORPORATE en attente d'une décision admin.
      </p>

      {loading ? (
        <LoadingBox />
      ) : apps.length === 0 ? (
        <EmptyBox message="Rien en attente — tout est à jour." />
      ) : (
        <div className="flex flex-col gap-3">
          {apps.map((a) => (
            <div key={a.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {a.candidate.user.firstName || ""} {a.candidate.user.lastName || ""}
                  <span className="text-primary/50 font-normal"> — {a.candidate.user.email}</span>
                </p>
                <p className="text-sm text-primary/70">
                  {a.job.title} @ {a.job.company.name}
                </p>
                <p className="text-xs text-primary/40 mt-1">Candidature déposée le {new Date(a.appliedAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={actingId === a.id}
                  onClick={() => decide(a.id, "SHORTLISTED")}
                  className="px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50"
                >
                  Présélectionner
                </button>
                <button
                  disabled={actingId === a.id}
                  onClick={() => decide(a.id, "REJECTED")}
                  className="px-3 py-1.5 rounded-lg bg-white border border-primary/20 text-primary text-sm font-semibold disabled:opacity-50"
                >
                  Rejeter
                </button>
              </div>
            </div>
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
