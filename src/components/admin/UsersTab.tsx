import React, { useEffect, useState } from "react";
import { FileCheck2, FileText, Minus, Pencil, RefreshCw, Search, Trash2, X } from "lucide-react";
import adminService, {
  AdminAccountStatus,
  AdminRole,
  AdminUser,
} from "../../services/admin.service";

/**
 * Accounts, for the super admin.
 *
 * "Delete" here marks the account rather than removing it. A user is attached
 * to their applications, their company and the orders raised for them, so
 * removing the row would take a recruiter's candidates with it. The list shows
 * the deleted ones greyed out rather than hiding them, because an account that
 * can be restored should be visible to restore.
 */

const ROLES: AdminRole[] = ["CANDIDATE", "RECRUITER", "ADMIN"];
const STATUSES: AdminAccountStatus[] = ["PENDING", "ACTIVE", "SUSPENDED", "DELETED"];

const ROLE_LABEL: Record<AdminRole, string> = {
  CANDIDATE: "Candidat",
  RECRUITER: "Recruteur",
  ADMIN: "Admin",
};

/** "" = no filter, "yes" = has it, "no" = does not. */
type CvFilter = "" | "yes" | "no";

/** True when the row should be dropped for this filter. */
const matches = (filter: Exclude<CvFilter, "">, has: boolean | undefined) =>
  filter === "yes" ? !has : Boolean(has);

const STATUS_STYLE: Record<AdminAccountStatus, string> = {
  PENDING: "bg-amber-50 text-amber-600 border-amber-200",
  ACTIVE: "bg-emerald-50 text-emerald-600 border-emerald-200",
  SUSPENDED: "bg-red-50 text-red-500 border-red-200",
  DELETED: "bg-gray-100 text-gray-400 border-gray-200",
};

const UsersTab: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | AdminRole>("");
  /** "" = no filter, "yes"/"no" = has it / does not. */
  const [uploadFilter, setUploadFilter] = useState<CvFilter>("");
  const [builtFilter, setBuiltFilter] = useState<CvFilter>("");
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    adminService
      .getUsers(roleFilter ? { role: roleFilter } : undefined)
      .then(setUsers)
      .catch((e) => setError(e?.response?.data?.message || "Échec du chargement des comptes"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [roleFilter]);

  const remove = async (user: AdminUser) => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
    if (
      !window.confirm(
        `Supprimer le compte de ${name} ?\n\nLe compte est marqué supprimé et ne pourra plus se connecter. ` +
          `Ses candidatures et son historique sont conservés, et vous pouvez le réactiver depuis cette page.`
      )
    ) {
      return;
    }

    setBusyId(user.id);
    try {
      const updated = await adminService.deleteUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
    } catch (e: any) {
      alert(e?.response?.data?.message || "Échec de la suppression");
    } finally {
      setBusyId(null);
    }
  };

  /* Filtered here rather than on the server: both flags are already on every
     row, and "built one" is decided in JS server-side anyway (JSON emptiness
     is not something Prisma can filter on), so a round trip would buy nothing
     and cost a wait. */
  const cvFiltered = uploadFilter !== "" || builtFilter !== "";

  const visible = users.filter((u) => {
    if (search.trim()) {
      const haystack = `${u.email} ${u.firstName ?? ""} ${u.lastName ?? ""}`.toLowerCase();
      if (!haystack.includes(search.trim().toLowerCase())) return false;
    }

    // A CV filter is a question about candidates. Recruiters and admins have
    // no CV to have, so they drop out rather than answering "non".
    if (cvFiltered && u.role !== "CANDIDATE") return false;

    if (uploadFilter && matches(uploadFilter, u.candidateProfile?.hasUploadedCv)) return false;
    if (builtFilter && matches(builtFilter, u.candidateProfile?.hasBuiltCv)) return false;

    return true;
  });

  // Counts for the whole loaded set, so the filters say what they would find.
  const candidates = users.filter((u) => u.role === "CANDIDATE");
  const withUpload = candidates.filter((u) => u.candidateProfile?.hasUploadedCv).length;
  const withBuilt = candidates.filter((u) => u.candidateProfile?.hasBuiltCv).length;
  const withNeither = candidates.filter(
    (u) => !u.candidateProfile?.hasUploadedCv && !u.candidateProfile?.hasBuiltCv
  ).length;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">{error}</div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-display mb-6">Comptes</h1>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-full sm:min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="w-full border border-primary/20 rounded-lg pl-9 pr-3 py-2 text-sm"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "" | AdminRole)}
          className="border border-primary/20 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Tous les rôles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>

        <select
          value={uploadFilter}
          onChange={(e) => setUploadFilter(e.target.value as CvFilter)}
          className="border border-primary/20 rounded-lg px-3 py-2 text-sm"
          aria-label="Filtrer par CV téléversé"
        >
          <option value="">CV téléversé : tous</option>
          <option value="yes">A téléversé un CV</option>
          <option value="no">N’a pas téléversé de CV</option>
        </select>

        <select
          value={builtFilter}
          onChange={(e) => setBuiltFilter(e.target.value as CvFilter)}
          className="border border-primary/20 rounded-lg px-3 py-2 text-sm"
          aria-label="Filtrer par CV Maker"
        >
          <option value="">CV Maker : tous</option>
          <option value="yes">A créé un CV</option>
          <option value="no">N’a pas créé de CV</option>
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

      {/* Counts for the whole loaded set, so the filters say what they would
          find before anyone clicks one. Hidden while a role filter has already
          narrowed the list, where these totals would not mean what they say. */}
      {!loading && !roleFilter && candidates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5 text-[11px] font-semibold">
          <span className="text-primary/50">{candidates.length} candidat(s) —</span>
          <button
            onClick={() => {
              setUploadFilter("yes");
              setBuiltFilter("");
            }}
            className="px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 hover:border-emerald-400"
          >
            {withUpload} avec CV téléversé
          </button>
          <button
            onClick={() => {
              setBuiltFilter("yes");
              setUploadFilter("");
            }}
            className="px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-primary hover:border-primary/40"
          >
            {withBuilt} avec CV Maker
          </button>
          <button
            onClick={() => {
              setUploadFilter("no");
              setBuiltFilter("no");
            }}
            className="px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400"
          >
            {withNeither} sans aucun CV
          </button>
          {(uploadFilter || builtFilter) && (
            <button
              onClick={() => {
                setUploadFilter("");
                setBuiltFilter("");
              }}
              className="px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-gray-400"
            >
              Réinitialiser
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-primary/50">Chargement…</div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-primary/50">Aucun compte.</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="bg-primary/5 text-left text-primary/60 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">CV</th>
                <th className="px-4 py-3">Inscrit le</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((u) => {
                const deleted = u.status === "DELETED";
                return (
                  <tr
                    key={u.id}
                    className={`border-t border-primary/10 ${deleted ? "opacity-50" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium">
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-4 py-3 break-all">{u.email}</td>
                    <td className="px-4 py-3">{ROLE_LABEL[u.role]}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${STATUS_STYLE[u.status]}`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <CvState user={u} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditing(u)}
                          className="p-2 rounded-lg border border-primary/20 text-primary/70 hover:text-primary"
                          aria-label="Modifier"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => remove(u)}
                          disabled={deleted || busyId === u.id}
                          className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
};

/**
 * Whether a candidate has a CV, and which kind.
 *
 * The two are independent: a candidate can upload a PDF, build one in the CV
 * maker, do both, or neither. Recruiters only see a CV when one of the two
 * exists, so "aucun" is the number worth chasing.
 *
 * Nothing is shown for recruiters and admins — they have no CV to have.
 */
const CvState: React.FC<{ user: AdminUser }> = ({ user }) => {
  if (user.role !== "CANDIDATE") {
    return <Minus size={14} className="text-primary/20" />;
  }

  const uploaded = user.candidateProfile?.hasUploadedCv ?? false;
  const built = user.candidateProfile?.hasBuiltCv ?? false;

  if (!uploaded && !built) {
    return (
      <span className="px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
        Aucun CV
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {uploaded && (
        <span
          title="A téléversé un CV"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
        >
          <FileCheck2 size={12} /> Téléversé
        </span>
      )}
      {built && (
        <span
          title="A créé un CV avec le CV Maker"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-primary text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
        >
          <FileText size={12} /> CV Maker
        </span>
      )}
    </div>
  );
};

const EditUserModal: React.FC<{
  user: AdminUser;
  onClose: () => void;
  onSaved: (u: AdminUser) => void;
}> = ({ user, onClose, onSaved }) => {
  const [form, setForm] = useState({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email,
    role: user.role,
    status: user.status,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onSaved(await adminService.updateUser(user.id, form));
    } catch (err: any) {
      // The server refuses self-demotion and the last admin; show its reason.
      setError(err?.response?.data?.message || "Échec de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display">Modifier le compte</h2>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={20} className="text-primary/50" />
          </button>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm p-3">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="text-primary/60">Prénom</span>
            <input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="mt-1 w-full border border-primary/20 rounded-lg px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-primary/60">Nom</span>
            <input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="mt-1 w-full border border-primary/20 rounded-lg px-3 py-2"
            />
          </label>
        </div>

        <label className="text-sm block">
          <span className="text-primary/60">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full border border-primary/20 rounded-lg px-3 py-2"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="text-primary/60">Rôle</span>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}
              className="mt-1 w-full border border-primary/20 rounded-lg px-3 py-2"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-primary/60">Statut</span>
            <select
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as AdminAccountStatus })
              }
              className="mt-1 w-full border border-primary/20 rounded-lg px-3 py-2"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="text-xs text-primary/50">
          SUSPENDU et SUPPRIMÉ empêchent la connexion. EN ATTENTE est le statut
          par défaut à l’inscription et n’empêche rien.
        </p>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-primary/20 text-primary/70 text-sm font-semibold"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UsersTab;
