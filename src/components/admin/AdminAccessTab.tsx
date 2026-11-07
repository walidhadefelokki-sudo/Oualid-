import React, { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, RefreshCw, ShieldAlert, ShieldCheck, User } from "lucide-react";
import adminService, { AdminAccessRow, AdminScopeInfo } from "../../services/admin.service";

/**
 * Who may administer what.
 *
 * `restrictTo("ADMIN")` was the only check on the whole admin surface, so
 * every administrator could change anyone's role, delete accounts, grant
 * annonce credits, approve transfers and mail the entire database. There was
 * no way to hand somebody the moderation queue without handing them that too.
 *
 * This screen is itself reserved to an unrestricted administrator: one who
 * could edit their own permissions would not be limited. The server enforces
 * that; the sidebar only avoids offering a page that would answer 403.
 *
 * Enabling an account is deliberately two separate acts — making it an
 * administrator happens on Comptes, where the role change is visible as what
 * it is, and choosing what it may touch happens here.
 */

const name = (a: AdminAccessRow) =>
  `${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() || a.email;

const AdminAccessTab: React.FC = () => {
  const [scopes, setScopes] = useState<AdminScopeInfo[]>([]);
  const [admins, setAdmins] = useState<AdminAccessRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const [list, areas] = await Promise.all([
        adminService.listAdminAccess(),
        adminService.listAdminScopes(),
      ]);
      setAdmins(list);
      setScopes(areas);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Le chargement a échoué.");
      setAdmins([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (
    admin: AdminAccessRow,
    changes: { isSuperAdmin?: boolean; scopes?: string[] }
  ) => {
    setBusyId(admin.id);
    setError(null);
    setNotice(null);
    try {
      const updated = await adminService.updateAdminAccess(admin.id, changes);
      setAdmins((prev) =>
        prev
          ? prev.map((a) =>
              a.id === admin.id
                ? { ...a, ...updated, hasNoAccess: !updated.isSuperAdmin && updated.adminScopes.length === 0 }
                : a
            )
          : prev
      );
      setNotice(`Autorisations de ${name(admin)} enregistrées.`);
    } catch (e: any) {
      setError(e?.response?.data?.message || "L'enregistrement a échoué.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleScope = (admin: AdminAccessRow, key: string) => {
    const next = admin.adminScopes.includes(key)
      ? admin.adminScopes.filter((s) => s !== key)
      : [...admin.adminScopes, key];
    save(admin, { scopes: next });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-display">Accès administrateur</h1>
        <button
          onClick={load}
          aria-label="Rafraîchir"
          className="p-2 rounded-lg border border-primary/20 text-primary/60 hover:text-primary"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <p className="text-sm text-primary/55 mb-6 max-w-3xl">
        Un administrateur est soit <strong>sans restriction</strong>, soit limité aux
        sections qui lui sont accordées ici. Pour nommer un nouvel administrateur,
        changez d'abord son rôle depuis <strong>Comptes</strong> — il n'aura alors accès à
        rien jusqu'à ce que vous choisissiez ses sections.
      </p>

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 inline-flex items-center gap-2">
          <Check size={15} /> {notice}
        </p>
      )}

      {!admins ? (
        <div className="bg-white rounded-xl p-10 text-center text-primary/50">Chargement…</div>
      ) : admins.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-primary/50">
          Aucun administrateur.
        </div>
      ) : (
        <div className="space-y-4">
          {admins.map((admin) => {
            const busy = busyId === admin.id;

            return (
              <article
                key={admin.id}
                className={`rounded-2xl border-2 bg-white p-5 ${
                  admin.hasNoAccess ? "border-amber-200" : "border-primary/12"
                }`}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <span className="w-10 h-10 shrink-0 rounded-full bg-primary/8 text-primary grid place-items-center">
                    {admin.isSuperAdmin ? <ShieldCheck size={18} /> : <User size={18} />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-primary break-words">
                      {name(admin)}
                      {admin.isMe && (
                        <span className="ms-2 text-[11px] font-black uppercase tracking-widest text-primary/40">
                          vous
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-primary/50 break-all">{admin.email}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
                        admin.isSuperAdmin
                          ? "bg-primary/8 text-primary border-primary/20"
                          : "bg-gray-100 text-gray-600 border-gray-200"
                      }`}
                    >
                      {admin.isSuperAdmin ? "Sans restriction" : "Limité"}
                    </span>

                    {/* Editing your own access is refused by the server; the
                        control is absent rather than present and failing. */}
                    {!admin.isMe && (
                      <button
                        onClick={() => save(admin, { isSuperAdmin: !admin.isSuperAdmin })}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-lg border-2 border-primary/20 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 disabled:opacity-50"
                      >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : null}
                        {admin.isSuperAdmin ? "Limiter" : "Retirer les restrictions"}
                      </button>
                    )}
                  </div>
                </div>

                {/* An account that can sign in and reach nothing is easy to
                    create by accident, so it is called out rather than left to
                    be discovered. */}
                {admin.hasNoAccess && (
                  <p className="mt-3 inline-flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <AlertTriangle size={14} className="mt-px shrink-0" />
                    Ce compte peut se connecter mais n'a accès à aucune section. Cochez
                    ce qu'il doit pouvoir faire.
                  </p>
                )}

                {admin.isSuperAdmin ? (
                  <p className="mt-4 inline-flex items-start gap-2 rounded-xl bg-primary/5 border border-primary/15 px-3 py-2 text-xs text-primary/70">
                    <ShieldAlert size={14} className="mt-px shrink-0" />
                    Accès à toutes les sections, y compris celle-ci. Les cases ci-dessous
                    s'appliqueront si vous le limitez.
                  </p>
                ) : null}

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {scopes.map((scope) => {
                    const on = admin.adminScopes.includes(scope.key);

                    return (
                      <label
                        key={scope.key}
                        className={`flex items-start gap-3 rounded-xl border-2 px-3.5 py-3 cursor-pointer transition-colors ${
                          on ? "border-primary/40 bg-primary/[0.03]" : "border-primary/12"
                        } ${admin.isSuperAdmin ? "opacity-60" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          disabled={busy}
                          onChange={() => toggleScope(admin, scope.key)}
                          className="mt-0.5 w-4 h-4 accent-primary shrink-0"
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-primary">
                            {scope.label}
                          </span>
                          {/* What it actually lets somebody do, said where the
                              decision is made rather than in a manual. */}
                          <span className="block text-xs text-primary/55 break-words">
                            {scope.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminAccessTab;
