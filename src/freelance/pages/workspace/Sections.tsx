import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import api from "../../../services/api";
import freelanceService, { MarketplaceCategory } from "../../freelance.service";
import { WILAYAS } from "../../../constants";
import {
  Badge,
  BadgeTone,
  Card,
  EmptyState,
  ErrorState,
  FIELD,
  LABEL,
  Loading,
  PageHead,
  Price,
  Stat,
  btn,
} from "../../ui";
import { useI18n } from "../../i18n";
import { useWorkspaceContext } from "../../useWorkspace";

/**
 * The workspace sections.
 *
 * All six read from the database. The marketplace has no services, proposals
 * or orders yet, so most of them render their empty state — which is the
 * honest rendering, not a gap to be filled with sample rows.
 *
 * "Mes services" is the table the canvas draws, because a freelancer with a
 * dozen listings is comparing their views and expiry dates against each
 * other, and a column does that where a stack of cards does not. It scrolls
 * sideways in a box on a narrow screen rather than reflowing, so the columns
 * stay aligned.
 */

/** One request, with loading, error and retry handled the same way each time. */
function useResource<T>(path: string, pick: (body: any) => T) {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    setData(null);
    api
      .get(path)
      .then((r) => setData(pick(r.data.data)))
      .catch(() => setFailed(true));
  };

  useEffect(load, [path]);
  return { data, failed, reload: load };
}

/**
 * A status, as a word and a colour.
 *
 * The enum name used to be shown raw — a freelancer read "PUBLISHED" in a
 * French interface. Each one is paired with a tone whose tint and ink differ
 * in lightness, so the colour is a second signal rather than the only one.
 */
const STATUS: Record<string, { tone: BadgeTone; label: string }> = {
  DRAFT: { tone: "neutral", label: "Brouillon" },
  PENDING: { tone: "info", label: "En modération" },
  PUBLISHED: { tone: "success", label: "Publié" },
  PAUSED: { tone: "neutral", label: "En pause" },
  EXPIRED: { tone: "neutral", label: "Expiré" },
  REJECTED: { tone: "danger", label: "Refusé" },
  SENT: { tone: "info", label: "Envoyée" },
  VIEWED: { tone: "info", label: "Vue" },
  SHORTLISTED: { tone: "warn", label: "Présélectionnée" },
  SELECTED: { tone: "success", label: "Retenue" },
  CREATED: { tone: "info", label: "Créée" },
  IN_PROGRESS: { tone: "warn", label: "En cours" },
  DELIVERED: { tone: "info", label: "Livrée" },
  COMPLETED: { tone: "success", label: "Terminée" },
  CANCELLED: { tone: "neutral", label: "Annulée" },
  DISPUTED: { tone: "danger", label: "En litige" },
};

const Status: React.FC<{ value: string }> = ({ value }) => {
  const s = STATUS[value] ?? { tone: "neutral" as BadgeTone, label: value };
  return <Badge tone={s.tone}>{s.label}</Badge>;
};

const date = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

/** The row a list card uses: white, wide corner, lifts on hover. */
const ROW =
  "flex flex-wrap items-center gap-4 rounded-card bg-surface p-5 " +
  "transition-shadow hover:shadow-[0_8px_30px_rgba(23,62,125,0.10)]";

/* ---------------------------------------------------------------- services */

export const MyServices: React.FC = () => {
  const { t } = useI18n();
  const { data, failed, reload } = useResource<any[]>("/freelance/me/services", (d) => d.services);
  const { data: ws } = useWorkspaceContext();
  const costs = ws.wallet!.costs;

  /* What the row's button offers depends on where the listing is in its
     life. An expired one wants renewing, a published one wants its stats, a
     draft wants finishing — one button each rather than four greyed out. */
  const action = (s: any): { to: string; label: string } => {
    if (s.status === "EXPIRED") return { to: "/acheter-credits", label: "Renouveler" };
    if (s.status === "PUBLISHED") return { to: `/service/${s.slug}`, label: "Voir la page" };
    return { to: `/freelance-espace/services/${s.id}`, label: "Modifier" };
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        title="Mes services"
        lede={`${costs.servicePublication} ${t("ws.credits")} par publication, ${costs.serviceDurationDays} ${t("service.days")}`}
      >
        <Link to="/freelance-espace/services/nouveau" className={btn("accent")}>
          + Nouveau service
        </Link>
      </PageHead>

      {failed ? (
        <ErrorState onRetry={reload} />
      ) : data === null ? (
        <Loading />
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center gap-5">
          <EmptyState message="Vous n'avez pas encore de service." />
          <Link to="/freelance-espace/services/nouveau" className={btn("primary")}>
            Créer mon premier service
          </Link>
        </div>
      ) : (
        <Card className="flex flex-col gap-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 border-collapse text-[15px]">
              <thead>
                <tr className="text-sm text-muted">
                  <th className="border-b border-line-soft px-3 py-3 text-start font-bold">
                    {t("ws.colService")}
                  </th>
                  <th className="border-b border-line-soft px-3 py-3 text-start font-bold">
                    {t("ws.colStatus")}
                  </th>
                  <th className="border-b border-line-soft px-3 py-3 text-start font-bold">
                    {t("ws.colViews")}
                  </th>
                  <th className="border-b border-line-soft px-3 py-3 text-start font-bold">
                    {t("ws.colExpires")}
                  </th>
                  <th className="border-b border-line-soft px-3 py-3">
                    <span className="sr-only">{t("ws.colActions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((s) => {
                  const a = action(s);
                  return (
                    <tr key={s.id}>
                      <td className="border-b border-line-soft px-3 py-4">
                        <Link
                          to={`/freelance-espace/services/${s.id}`}
                          className="font-bold text-primary hover:underline"
                        >
                          {s.title}
                        </Link>
                        <br />
                        <span className="text-[13px] text-muted">
                          {s.category ?? "—"}
                          {s.startingPrice ? " · " : ""}
                          {s.startingPrice ? <Price value={s.startingPrice} /> : null}
                        </span>
                        {/* A rejection says why, where the freelancer is
                            looking, rather than in an e-mail they may not
                            have opened. */}
                        {s.rejectionReason && (
                          <p className="mt-2 rounded-field bg-tint-red px-3 py-2 text-[13px] text-danger">
                            {s.rejectionReason}
                          </p>
                        )}
                      </td>
                      <td className="border-b border-line-soft px-3 py-4">
                        <Status value={s.status} />
                      </td>
                      <td className="border-b border-line-soft px-3 py-4" dir="ltr">
                        {s.views}
                      </td>
                      <td className="border-b border-line-soft px-3 py-4 text-muted">
                        {s.expiresAt ? date(s.expiresAt) : "—"}
                      </td>
                      <td className="border-b border-line-soft px-3 py-4 text-end">
                        <Link to={a.to} className={btn("ghost", "whitespace-nowrap px-4 py-2")}>
                          {a.label}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-[13px] text-muted">
            Un service expiré peut être renouvelé&nbsp;; ses statistiques et ses avis sont
            conservés.
          </p>
        </Card>
      )}
    </div>
  );
};

/* ------------------------------------------------------------- proposals */

export const MyProposals: React.FC = () => {
  const { data, failed, reload } = useResource<any[]>(
    "/freelance/me/proposals",
    (d) => d.proposals
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Mes propositions" />

      {failed ? (
        <ErrorState onRetry={reload} />
      ) : data === null ? (
        <Loading />
      ) : data.length === 0 ? (
        <EmptyState message="Vous n'avez envoyé aucune proposition." />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((p) => (
            <div key={p.id} className={ROW}>
              <div className="min-w-0 flex-1">
                <p className="break-words font-bold text-primary">{p.project.title}</p>
                <p className="mt-1 text-[13px] text-muted">
                  Envoyée le {date(p.createdAt)} · {p.deliveryDays} jours
                  {p.viewedAt && ` · vue le ${date(p.viewedAt)}`}
                </p>
              </div>
              <Price value={p.price} />
              <Status value={p.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ---------------------------------------------------------------- orders */

export const MyOrders: React.FC = () => {
  const { data, failed, reload } = useResource<any[]>("/freelance/me/orders", (d) => d.orders);

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Commandes" />

      {failed ? (
        <ErrorState onRetry={reload} />
      ) : data === null ? (
        <Loading />
      ) : data.length === 0 ? (
        <EmptyState message="Aucune commande pour le moment." />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((o) => (
            <Link key={o.id} to={`/freelance-espace/commandes/${o.id}`} className={ROW}>
              <div className="min-w-0 flex-1">
                <p className="break-words font-bold text-primary">
                  {o.service?.title ?? o.project?.title ?? o.reference}
                </p>
                <p className="mt-1 text-[13px] text-muted">
                  {o.role === "client"
                    ? `Avec ${o.freelancer.displayName}`
                    : `Pour ${[o.client.firstName, o.client.lastName].filter(Boolean).join(" ")}`}
                  {" · "}
                  {date(o.createdAt)}
                </p>
              </div>
              <Price value={o.agreedPrice} currency={o.currency} />
              <Status value={o.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

/* --------------------------------------------------------------- credits */

export const MyCredits: React.FC = () => {
  const { t } = useI18n();
  const { data, failed, reload } = useResource<any>("/freelance/me/wallet", (d) => d);

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Portefeuille et crédits" />

      {failed ? (
        <ErrorState onRetry={reload} />
      ) : data === null ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label={t("ws.balance")} value={data.balance} feature>
              <Link
                to="/acheter-credits"
                className={btn("accent", "mt-1 self-start px-3.5 py-2.5")}
              >
                {t("ws.topUp")}
              </Link>
            </Stat>
            <Stat
              label={t("pricing.rowPublish")}
              value={data.costs.servicePublication}
              sub={`${data.costs.serviceDurationDays} ${t("service.days")}`}
            />
            <Stat label={t("pricing.rowProposal")} value={data.costs.proposal} />
          </div>

          {data.entries.length === 0 ? (
            <EmptyState message="Aucun mouvement de crédits." />
          ) : (
            <Card className="flex flex-col">
              <h2 className="mb-2 text-xl font-bold text-primary">Historique</h2>
              {data.entries.map((e: any) => (
                <div
                  key={e.id}
                  className="flex items-center gap-4 border-t border-line-soft py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold text-primary">
                      {e.note || e.type.replace(/_/g, " ").toLowerCase()}
                    </p>
                    <p className="text-[13px] text-muted">{date(e.createdAt)}</p>
                  </div>
                  {/* The sign is written as well as coloured: green alone is
                      not a way to say "added". */}
                  <span
                    dir="ltr"
                    className={"font-bold " + (e.delta > 0 ? "text-success" : "text-body")}
                  >
                    {e.delta > 0 ? "+" : ""}
                    {e.delta}
                  </span>
                  <span className="w-12 text-end text-[13px] text-muted" dir="ltr">
                    {e.balanceAfter}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  );
};

/* --------------------------------------------------------------- profile */

export const MyProfile: React.FC = () => {
  const { data: ws, reload } = useWorkspaceContext();
  const p = ws.profile!;

  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [form, setForm] = useState({
    displayName: p.displayName,
    title: p.title ?? "",
    bio: p.bio ?? "",
    wilaya: p.wilaya ?? "",
    categoryId: p.category?.id ?? "",
    hourlyRate: p.hourlyRate ?? "",
    availability: p.availability,
  });
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    freelanceService
      .getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNote(null);
    setSaving(true);
    try {
      await api.patch("/freelance/me/profile", {
        ...form,
        hourlyRate: form.hourlyRate === "" ? null : Number(form.hourlyRate),
        categoryId: form.categoryId || null,
      });
      await reload();
      setNote("Profil enregistré.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "L'enregistrement a échoué.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHead title="Profil" />

      <Card>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <label className={LABEL}>
            Nom affiché
            <input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              className={FIELD}
              required
            />
          </label>

          <label className={LABEL}>
            Titre professionnel
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className={FIELD}
            />
          </label>

          <label className={LABEL}>
            Présentation
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={5}
              className={FIELD + " resize-y"}
            />
          </label>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className={LABEL}>
              Catégorie
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className={FIELD}
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            {/* A list, not a text box. Buyers filter on this field, and a
                filter compares values exactly: "Alger", "alger" and "16 -
                Alger" typed by three freelancers are three wilayas to the
                query, so two of them never appear in the results. */}
            <label className={LABEL}>
              Wilaya
              <select
                value={form.wilaya}
                onChange={(e) => setForm({ ...form, wilaya: e.target.value })}
                className={FIELD}
              >
                <option value="">—</option>
                {WILAYAS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
                {/* Whatever was typed before this became a list stays
                    selectable, so opening the form does not silently blank
                    an existing answer. */}
                {form.wilaya && !WILAYAS.includes(form.wilaya) && (
                  <option value={form.wilaya}>{form.wilaya}</option>
                )}
              </select>
            </label>

            <label className={LABEL}>
              Tarif horaire (DZD)
              <input
                type="number"
                min={0}
                dir="ltr"
                value={form.hourlyRate}
                onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                className={FIELD}
              />
            </label>

            <label className={LABEL}>
              Disponibilité
              <select
                value={form.availability}
                onChange={(e) => setForm({ ...form, availability: e.target.value })}
                className={FIELD}
              >
                <option value="FULL_TIME">Temps plein</option>
                <option value="PART_TIME">Temps partiel</option>
                <option value="OCCASIONAL">Occasionnelle</option>
                <option value="UNAVAILABLE">Indisponible</option>
              </select>
            </label>
          </div>

          {/* The handle is the public address of a page people bookmark and
              share, so it is shown but not edited here. */}
          <p className="text-[13px] text-muted">
            Adresse publique : <span dir="ltr">/@{p.username}</span>
          </p>

          {note && (
            <p className="rounded-field bg-tint-green p-3.5 text-sm font-bold text-success">
              {note}
            </p>
          )}
          {error && (
            <p className="rounded-field bg-tint-red p-3.5 text-sm font-bold text-danger">
              {error}
            </p>
          )}

          <button type="submit" disabled={saving} className={btn("primary", "self-start")}>
            {saving && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            Enregistrer
          </button>
        </form>
      </Card>
    </div>
  );
};
