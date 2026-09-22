import React, { useEffect, useState } from "react";
import { RefreshCw, Search, Star, Trash2 } from "lucide-react";
import adminService, { AdminJob, AdminJobStatus } from "../../services/admin.service";

/**
 * Job offers, for the super admin.
 *
 * Applications cascade off a Job, so deleting one removes the people who
 * applied to it. The candidate count is in the table for that reason, and the
 * server refuses a delete that would destroy applications until it is
 * confirmed — archiving takes an offer out of circulation without losing
 * anyone's history, and is offered first.
 */

const STATUSES: AdminJobStatus[] = ["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"];

const STATUS_STYLE: Record<AdminJobStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-500 border-gray-200",
  PUBLISHED: "bg-emerald-50 text-emerald-600 border-emerald-200",
  CLOSED: "bg-amber-50 text-amber-600 border-amber-200",
  ARCHIVED: "bg-gray-100 text-gray-400 border-gray-200",
};

const JobsTab: React.FC = () => {
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | AdminJobStatus>("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    adminService
      .getJobs(statusFilter ? { status: statusFilter } : undefined)
      .then(setJobs)
      .catch((e) => setError(e?.response?.data?.message || "Échec du chargement des offres"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  const patch = async (job: AdminJob, changes: { status?: AdminJobStatus; featured?: boolean }) => {
    setBusyId(job.id);
    try {
      const updated = await adminService.updateJob(job.id, changes);
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, ...updated } : j)));
    } catch (e: any) {
      alert(e?.response?.data?.message || "Échec de la mise à jour");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (job: AdminJob) => {
    const count = job._count.applications;

    if (count > 0) {
      const archive = window.confirm(
        `« ${job.title} » a ${count} candidature(s).\n\n` +
          `La supprimer effacera aussi ces candidatures — les candidats disparaîtront ` +
          `du dossier du recruteur.\n\n` +
          `OK = archiver l'offre (elle disparaît du site, les candidatures sont conservées)\n` +
          `Annuler = choisir la suppression définitive`
      );
      if (archive) {
        await patch(job, { status: "ARCHIVED" });
        return;
      }
      if (
        !window.confirm(
          `Supprimer définitivement « ${job.title} » et ses ${count} candidature(s) ? Cette action est irréversible.`
        )
      ) {
        return;
      }
    } else if (!window.confirm(`Supprimer « ${job.title} » ?`)) {
      return;
    }

    setBusyId(job.id);
    try {
      await adminService.deleteJob(job.id, count > 0);
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch (e: any) {
      alert(e?.response?.data?.message || "Échec de la suppression");
    } finally {
      setBusyId(null);
    }
  };

  const visible = jobs.filter((j) => {
    if (!search.trim()) return true;
    const haystack = `${j.title} ${j.company?.name ?? ""} ${j.location ?? ""}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">{error}</div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-display mb-2">Offres d’emploi</h1>
      <p className="text-sm text-primary/60 mb-6">
        Archiver retire une offre du site en conservant ses candidatures. Supprimer efface les deux.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-full sm:min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par titre, entreprise ou lieu…"
            className="w-full border border-primary/20 rounded-lg pl-9 pr-3 py-2 text-sm"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | AdminJobStatus)}
          className="border border-primary/20 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Tous les statuts</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button
          onClick={load}
          disabled={loading}
          className="p-2.5 rounded-lg border border-primary/20 text-primary/60 hover:text-primary disabled:opacity-50"
          aria-label="Actualiser"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-primary/50">Chargement…</div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-primary/50">Aucune offre.</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-primary/5 text-left text-primary/60 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Offre</th>
                <th className="px-4 py-3">Entreprise</th>
                <th className="px-4 py-3">Lieu</th>
                <th className="px-4 py-3">Candidatures</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">À la une</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((j) => (
                <tr key={j.id} className="border-t border-primary/10">
                  <td className="px-4 py-3 font-medium max-w-[240px] break-words">{j.title}</td>
                  <td className="px-4 py-3">{j.company?.name ?? "—"}</td>
                  <td className="px-4 py-3">{j.wilaya || j.location || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={j._count.applications > 0 ? "font-bold text-primary" : "text-primary/40"}>
                      {j._count.applications}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={j.status}
                      disabled={busyId === j.id}
                      onChange={(e) => patch(j, { status: e.target.value as AdminJobStatus })}
                      className={`border rounded-lg px-2 py-1.5 text-[11px] font-black uppercase tracking-widest disabled:opacity-50 ${STATUS_STYLE[j.status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => patch(j, { featured: !j.featured })}
                      disabled={busyId === j.id}
                      aria-pressed={j.featured}
                      aria-label="Mettre à la une"
                      className={`p-2 rounded-lg border disabled:opacity-50 ${
                        j.featured
                          ? "bg-[#F68D58] text-white border-[#F68D58]"
                          : "border-primary/20 text-primary/30 hover:text-primary/60"
                      }`}
                    >
                      <Star size={15} fill={j.featured ? "currentColor" : "none"} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => remove(j)}
                      disabled={busyId === j.id}
                      className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-40"
                      aria-label="Supprimer"
                    >
                      <Trash2 size={15} />
                    </button>
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

export default JobsTab;
