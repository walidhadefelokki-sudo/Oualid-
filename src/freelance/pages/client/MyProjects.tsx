import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../auth";
import { EmptyState, ErrorState, Loading, Price } from "../../ui";
import SignIn from "../SignIn";

/**
 * A client's own projects.
 *
 * Any signed-in account sees this. There is no client profile to activate —
 * posting work needs nothing but an account, which is what "gratuit pour les
 * clients" means in practice.
 */

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  OPEN: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  IN_PROGRESS: "bg-sky-50 text-sky-700",
  CLOSED: "bg-gray-100 text-gray-500",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-600 border border-red-200",
};

const LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING: "En validation",
  OPEN: "Ouvert",
  IN_PROGRESS: "En cours",
  CLOSED: "Clôturé",
  COMPLETED: "Terminé",
  REJECTED: "Refusé",
};

const MyProjects: React.FC = () => {
  const { signedIn, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<any[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    api
      .get("/freelance/me/projects")
      .then((r) => setProjects(r.data.data.projects))
      .catch(() => setFailed(true));
  };

  useEffect(() => {
    if (signedIn) load();
  }, [signedIn]);

  if (authLoading) return <Loading />;
  if (!signedIn) return <SignIn />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-display font-bold text-[#173E7D]">Mes projets</h1>
        <Link
          to="/client/projets/nouveau"
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 bg-[#173E7D] text-white text-sm font-bold"
        >
          <Plus size={15} /> Publier un projet
        </Link>
      </div>

      {failed ? (
        <ErrorState onRetry={load} />
      ) : projects === null ? (
        <Loading />
      ) : projects.length === 0 ? (
        <div className="text-center">
          <EmptyState message="Vous n'avez pas encore publié de projet." />
          <Link
            to="/client/projets/nouveau"
            className="inline-block mt-4 rounded-full px-6 py-3 bg-[#173E7D] text-white font-bold"
          >
            Publier mon premier projet
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/client/projets/${p.id}`}
              className="rounded-2xl border-2 border-[#173E7D]/15 bg-white p-4 flex flex-wrap items-center gap-4 hover:border-[#173E7D]/40 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#173E7D] break-words">{p.title}</p>
                <p className="text-xs text-[#2B3442]/50 mt-0.5">
                  {p.category ?? "—"}
                  {" · "}
                  {p.proposalCount} proposition{p.proposalCount > 1 ? "s" : ""}
                  {p.remote ? " · à distance" : p.wilaya ? ` · ${p.wilaya}` : ""}
                </p>
                {p.rejectionReason && (
                  <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    {p.rejectionReason}
                  </p>
                )}
              </div>

              {(p.budgetMin || p.budgetMax) && <Price value={p.budgetMax ?? p.budgetMin} />}

              <span
                className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                  STATUS_STYLE[p.status] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {LABEL[p.status] ?? p.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyProjects;
