import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Coins, Loader2 } from "lucide-react";
import api from "../../../services/api";
import freelanceService, { MarketplaceCategory } from "../../freelance.service";
import { EmptyState, ErrorState, Loading, Price } from "../../ui";
import { useWorkspaceContext } from "../../useWorkspace";

/**
 * The workspace sections.
 *
 * All six read from the database. The marketplace has no services, proposals
 * or orders yet, so most of them render their empty state — which is the
 * honest rendering, not a gap to be filled with sample rows.
 */

const card = "rounded-2xl border-2 border-[#173E7D]/15 bg-white";
const h1 = "text-2xl font-display font-bold text-[#173E7D] mb-5";
const field =
  "w-full rounded-xl border-2 border-[#173E7D]/15 bg-white px-4 py-3 outline-none focus:border-[#173E7D]";
const label =
  "block text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50 mb-1.5";

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

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  PUBLISHED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  PAUSED: "bg-gray-100 text-gray-600",
  EXPIRED: "bg-gray-100 text-gray-500",
  REJECTED: "bg-red-50 text-red-600 border border-red-200",
  SENT: "bg-[#173E7D]/8 text-[#173E7D]",
  VIEWED: "bg-sky-50 text-sky-700",
  SHORTLISTED: "bg-amber-50 text-amber-700",
  SELECTED: "bg-emerald-50 text-emerald-700",
};

const Status: React.FC<{ value: string }> = ({ value }) => (
  <span
    className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
      STATUS_STYLE[value] ?? "bg-gray-100 text-gray-600"
    }`}
  >
    {value}
  </span>
);

const date = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* ---------------------------------------------------------------- services */

export const MyServices: React.FC = () => {
  const { data, failed, reload } = useResource<any[]>("/freelance/me/services", (d) => d.services);
  const { data: ws } = useWorkspaceContext();

  return (
    <>
      <div className="flex items-baseline justify-between gap-4 mb-5">
        <h1 className={h1 + " mb-0"}>Mes services</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#2B3442]/50">
            {ws.wallet!.costs.servicePublication} crédits / {ws.wallet!.costs.serviceDurationDays} j
          </span>
          <Link
            to="/freelance-espace/services/nouveau"
            className="rounded-full px-5 py-2.5 bg-[#173E7D] text-white text-sm font-bold"
          >
            Nouveau service
          </Link>
        </div>
      </div>

      {failed ? (
        <ErrorState onRetry={reload} />
      ) : data === null ? (
        <Loading />
      ) : data.length === 0 ? (
        <div className="text-center">
          <EmptyState message="Vous n'avez pas encore de service." />
          <Link
            to="/freelance-espace/services/nouveau"
            className="inline-block mt-4 rounded-full px-6 py-3 bg-[#173E7D] text-white font-bold"
          >
            Créer mon premier service
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((s) => (
            <Link
              key={s.id}
              to={`/freelance-espace/services/${s.id}`}
              className={`${card} p-4 flex flex-wrap items-center gap-4 hover:border-[#173E7D]/40 transition-colors`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#173E7D] break-words">{s.title}</p>
                <p className="text-xs text-[#2B3442]/50 mt-0.5">
                  {s.category ?? "—"} · {s.views} vues · {s.orderCount} commandes
                  {s.expiresAt && ` · expire le ${date(s.expiresAt)}`}
                </p>
                {s.rejectionReason && (
                  <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    {s.rejectionReason}
                  </p>
                )}
              </div>
              <Price value={s.startingPrice} />
              <Status value={s.status} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
};

/* ------------------------------------------------------------- proposals */

export const MyProposals: React.FC = () => {
  const { data, failed, reload } = useResource<any[]>(
    "/freelance/me/proposals",
    (d) => d.proposals
  );

  return (
    <>
      <h1 className={h1}>Mes propositions</h1>

      {failed ? (
        <ErrorState onRetry={reload} />
      ) : data === null ? (
        <Loading />
      ) : data.length === 0 ? (
        <EmptyState message="Vous n'avez envoyé aucune proposition." />
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <div key={p.id} className={`${card} p-4 flex flex-wrap items-center gap-4`}>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#173E7D] break-words">{p.project.title}</p>
                <p className="text-xs text-[#2B3442]/50 mt-0.5">
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
    </>
  );
};

/* ---------------------------------------------------------------- orders */

export const MyOrders: React.FC = () => {
  const { data, failed, reload } = useResource<any[]>("/freelance/me/orders", (d) => d.orders);

  return (
    <>
      <h1 className={h1}>Commandes</h1>

      {failed ? (
        <ErrorState onRetry={reload} />
      ) : data === null ? (
        <Loading />
      ) : data.length === 0 ? (
        <EmptyState message="Aucune commande pour le moment." />
      ) : (
        <div className="space-y-3">
          {data.map((o) => (
            <div key={o.id} className={`${card} p-4 flex flex-wrap items-center gap-4`}>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#173E7D] break-words">
                  {o.service?.title ?? o.project?.title ?? o.reference}
                </p>
                <p className="text-xs text-[#2B3442]/50 mt-0.5">
                  {o.role === "client"
                    ? `Avec ${o.freelancer.displayName}`
                    : `Pour ${[o.client.firstName, o.client.lastName].filter(Boolean).join(" ")}`}
                  {" · "}
                  {date(o.createdAt)}
                </p>
              </div>
              <Price value={o.agreedPrice} currency={o.currency} />
              <Status value={o.status} />
            </div>
          ))}
        </div>
      )}
    </>
  );
};

/* --------------------------------------------------------------- credits */

export const MyCredits: React.FC = () => {
  const { data, failed, reload } = useResource<any>("/freelance/me/wallet", (d) => d);

  return (
    <>
      <h1 className={h1}>Crédits</h1>

      {failed ? (
        <ErrorState onRetry={reload} />
      ) : data === null ? (
        <Loading />
      ) : (
        <>
          <div className="rounded-2xl bg-gradient-to-r from-[#0B1E3D] to-[#173E7D] text-white p-6 flex flex-wrap items-center gap-5 mb-6">
            <Coins size={24} className="text-[#D4AF37]" />
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-white/60">
                Solde
              </p>
              <p className="text-3xl font-display font-bold" dir="ltr">
                {data.balance}
              </p>
            </div>
            <p className="text-sm text-white/70">
              Publication {data.costs.servicePublication} · Proposition {data.costs.proposal}
            </p>
            <Link
              to="/tarifs"
              className="ms-auto rounded-full px-5 py-2.5 bg-[#D4AF37] text-[#0B1E3D] text-sm font-bold"
            >
              Acheter des crédits
            </Link>
          </div>

          {data.entries.length === 0 ? (
            <EmptyState message="Aucun mouvement de crédits." />
          ) : (
            <div className={`${card} divide-y divide-[#173E7D]/10`}>
              {data.entries.map((e: any) => (
                <div key={e.id} className="p-4 flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#2B3442]">
                      {e.note || e.type.replace(/_/g, " ").toLowerCase()}
                    </p>
                    <p className="text-xs text-[#2B3442]/50">{date(e.createdAt)}</p>
                  </div>
                  <span
                    dir="ltr"
                    className={`font-bold ${e.delta > 0 ? "text-emerald-600" : "text-[#2B3442]"}`}
                  >
                    {e.delta > 0 ? "+" : ""}
                    {e.delta}
                  </span>
                  <span className="text-xs text-[#2B3442]/40 w-12 text-end" dir="ltr">
                    {e.balanceAfter}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
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
    freelanceService.getCategories().then(setCategories).catch(() => setCategories([]));
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
    <>
      <h1 className={h1}>Profil</h1>

      <form onSubmit={submit} className={`${card} p-6 space-y-5`}>
        <label className="block">
          <span className={label}>Nom affiché</span>
          <input
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            className={field}
            required
          />
        </label>

        <label className="block">
          <span className={label}>Titre professionnel</span>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={field}
          />
        </label>

        <label className="block">
          <span className={label}>Présentation</span>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={5}
            className={`${field} resize-y`}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <label className="block">
            <span className={label}>Catégorie</span>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className={field}
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={label}>Wilaya</span>
            <input
              value={form.wilaya}
              onChange={(e) => setForm({ ...form, wilaya: e.target.value })}
              className={field}
            />
          </label>

          <label className="block">
            <span className={label}>Tarif horaire (DZD)</span>
            <input
              type="number"
              min={0}
              dir="ltr"
              value={form.hourlyRate}
              onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
              className={field}
            />
          </label>

          <label className="block">
            <span className={label}>Disponibilité</span>
            <select
              value={form.availability}
              onChange={(e) => setForm({ ...form, availability: e.target.value })}
              className={field}
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
        <p className="text-xs text-[#2B3442]/50">
          Adresse publique : <span dir="ltr">/@{p.username}</span>
        </p>

        {note && (
          <p className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3">
            {note}
          </p>
        )}
        {error && (
          <p className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm p-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#173E7D] text-white font-bold px-7 py-3 inline-flex items-center gap-2 disabled:opacity-50"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          Enregistrer
        </button>
      </form>
    </>
  );
};
