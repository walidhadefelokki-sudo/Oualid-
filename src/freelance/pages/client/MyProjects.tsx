import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../auth";
import { useI18n } from "../../i18n";
import { Badge, BadgeTone, EmptyState, ErrorState, Loading, Price, btn } from "../../ui";
import SignIn from "../SignIn";

/**
 * A client's own projects.
 *
 * Any signed-in account sees this. There is no client profile to activate —
 * posting work needs nothing but an account, which is what "gratuit pour les
 * clients" means in practice, and the canvas says so on the page rather than
 * leaving it to be inferred from the absence of a price.
 */

const STATUS: Record<string, { tone: BadgeTone; label: string }> = {
  DRAFT: { tone: "neutral", label: "Brouillon" },
  PENDING: { tone: "info", label: "En validation" },
  OPEN: { tone: "success", label: "Ouvert" },
  IN_PROGRESS: { tone: "warn", label: "En cours" },
  CLOSED: { tone: "neutral", label: "Clôturé" },
  COMPLETED: { tone: "success", label: "Terminé" },
  REJECTED: { tone: "danger", label: "Refusé" },
};

const MyProjects: React.FC = () => {
  const { signedIn, loading: authLoading, user } = useAuth();
  const { t } = useI18n();
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

  const name = user?.firstName?.trim() || null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-8 sm:py-10">
      {/* --------------------------- the welcome ------------------------ */}
      <section className="flex flex-wrap items-center justify-between gap-6 rounded-hero bg-primary p-7 sm:p-9">
        <div className="flex max-w-xl flex-col gap-2.5">
          <h1 className="text-2xl font-bold text-white sm:text-[32px]">
            {t("ws.hello")}
            {name ? `, ${name}` : ""}
          </h1>
          <p className="text-base leading-relaxed text-on-navy">{t("client.lede")}</p>
        </div>

        <div className="flex flex-col items-start gap-3">
          <Link to="/client/projets/nouveau" className={btn("accent")}>
            <Plus size={16} aria-hidden="true" /> {t("client.publishProject")}
          </Link>
          <Badge tone="success">{t("client.free")}</Badge>
        </div>
      </section>

      {/* ---------------------------- the list -------------------------- */}
      {failed ? (
        <ErrorState onRetry={load} />
      ) : projects === null ? (
        <Loading />
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center gap-5">
          <EmptyState message="Vous n'avez pas encore publié de projet." />
          <Link to="/client/projets/nouveau" className={btn("primary")}>
            Publier mon premier projet
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-bold text-primary">{t("client.myProjects")}</h2>

          {projects.map((p) => {
            const s = STATUS[p.status] ?? { tone: "neutral" as BadgeTone, label: p.status };
            return (
              <Link
                key={p.id}
                to={`/client/projets/${p.id}`}
                className="flex flex-wrap items-center gap-4 rounded-card bg-surface p-5 transition-shadow hover:shadow-[0_8px_30px_rgba(23,62,125,0.10)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words font-bold text-primary">{p.title}</p>
                  <p className="mt-1 text-[13px] text-muted">
                    {p.category ?? "—"}
                    {" · "}
                    {p.proposalCount} {t("project.proposals")}
                    {p.remote ? ` · ${t("home.remote")}` : p.wilaya ? ` · ${p.wilaya}` : ""}
                  </p>
                  {p.rejectionReason && (
                    <p className="mt-2 rounded-field bg-tint-red px-3 py-2 text-[13px] text-danger">
                      {p.rejectionReason}
                    </p>
                  )}
                </div>

                {(p.budgetMin || p.budgetMax) && <Price value={p.budgetMax ?? p.budgetMin} />}

                <Badge tone={s.tone}>{s.label}</Badge>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyProjects;
