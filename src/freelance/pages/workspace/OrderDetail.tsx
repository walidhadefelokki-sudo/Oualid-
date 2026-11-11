import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Check, Loader2, Package, RotateCcw, Send, X } from "lucide-react";
import api from "../../../services/api";
import { Card, ErrorState, FIELD, Loading, Price, btn } from "../../ui";
import ReviewForm from "../../ReviewForm";
import ContactButton from "../../ContactButton";

/**
 * One order, for whichever side is reading it.
 *
 * The same page serves client and freelancer; what differs is which actions
 * appear. The server decides either way — the buttons shown here are a
 * convenience, and a request from the wrong side is refused regardless.
 *
 * The history is shown in full rather than summarised. An order is the only
 * account of what two people agreed, and the moment it matters is the moment
 * they disagree. The order's conversation is part of that account, which is
 * why it gets a thread of its own rather than sharing the pair's general one.
 */

const STATUS: Record<string, { label: string; chip: string }> = {
  CREATED: { label: "Créée", chip: "bg-tint-grey text-neutral-ink" },
  IN_PROGRESS: { label: "En cours", chip: "bg-tint-blue text-primary" },
  DELIVERED: { label: "Livrée", chip: "bg-tint-orange text-warn" },
  REVISION_REQUESTED: {
    label: "Révision demandée",
    chip: "bg-tint-orange text-warn",
  },
  COMPLETED: { label: "Terminée", chip: "bg-tint-green text-success" },
  CANCELLED: { label: "Annulée", chip: "bg-tint-grey text-neutral-ink" },
};

const card = "rounded-panel bg-surface p-6";
const field =
  FIELD;

const dateTime = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState("");

  const load = () => {
    setFailed(false);
    api
      .get(`/freelance/me/orders/${id}`)
      .then((r) => setData(r.data.data))
      .catch(() => setFailed(true));
  };

  useEffect(load, [id]);

  const act = async (path: string, body?: unknown) => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/freelance/me/orders/${id}/${path}`, body ?? {});
      setMessage("");
      setRevision("");
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || "L'action a échoué.");
    } finally {
      setBusy(false);
    }
  };

  if (failed) return <ErrorState onRetry={load} />;
  if (!data) return <Loading />;

  const o = data.order;
  const mine = data.side as "client" | "freelancer";
  const status = STATUS[o.status] ?? { label: o.status, chip: "bg-tint-grey" };

  const canDeliver =
    mine === "freelancer" && ["CREATED", "IN_PROGRESS", "REVISION_REQUESTED"].includes(o.status);
  const canDecide = mine === "client" && o.status === "DELIVERED";
  const canStart = mine === "freelancer" && o.status === "CREATED";
  const canCancel = ["CREATED", "IN_PROGRESS"].includes(o.status);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-primary break-words">
            {o.service?.title ?? o.project?.title ?? o.reference}
          </h1>
          <p className="text-sm text-muted">
            <span dir="ltr">{o.reference}</span>
            {" · "}
            {mine === "client" ? `Avec ${o.freelancer.displayName}` : `Pour ${o.clientName ?? "—"}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-sm font-bold px-3 py-1.5 rounded-full ${status.chip}`}
          >
            {status.label}
          </span>
          {/* The thread attached to this order, not the general one with the
              same person: a dispute is read from one job at a time. */}
          <ContactButton orderId={o.id} label="Messages" size="sm" />
        </div>
      </div>

      <div className={`${card} mb-5 flex flex-wrap items-center gap-x-8 gap-y-3`}>
        <div>
          <p className="text-sm font-bold text-primary">
            Montant convenu
          </p>
          <p className="text-xl font-bold">
            <Price value={o.agreedPrice} currency={o.currency} />
          </p>
        </div>
        {o.deliveryDueAt && (
          <div>
            <p className="text-sm font-bold text-primary">
              Échéance
            </p>
            <p className="text-sm font-semibold text-body">{dateTime(o.deliveryDueAt)}</p>
          </div>
        )}
        {o.package && (
          <div>
            <p className="text-sm font-bold text-primary">
              Formule
            </p>
            <p className="text-sm font-semibold text-body">
              {o.package.name} · {o.package.revisions} révision(s)
            </p>
          </div>
        )}
      </div>

      {/* The platform does not hold the money under this model, and saying so
          is better than letting someone assume it does. */}
      <p className="mb-5 rounded-xl bg-ground border border-line text-xs text-body p-3">
        Le paiement se règle directement entre le client et le freelance. Dar L'emploi ne détient
        pas les fonds et suit uniquement le déroulement du travail.
      </p>

      {error && (
        <p className="mb-4 rounded-xl bg-tint-red text-danger text-sm p-3">
          {error}
        </p>
      )}

      {canStart && (
        <button
          onClick={() => act("start")}
          disabled={busy}
          className="mb-5 rounded-xl border-2 border-line text-primary font-bold px-6 py-2.5 disabled:opacity-40"
        >
          Démarrer le travail
        </button>
      )}

      {canDeliver && (
        <section className={`${card} mb-5`}>
          <h2 className="font-bold text-primary mb-3">
            {o.status === "REVISION_REQUESTED" ? "Renvoyer après révision" : "Livrer le travail"}
          </h2>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Ce que vous livrez, les liens, ce qui reste à valider…"
            className={`${field} resize-y`}
          />
          <button
            onClick={() => act("deliver", { message })}
            disabled={busy}
            className="mt-3 rounded-xl bg-primary text-white font-bold px-6 py-2.5 inline-flex items-center gap-2 disabled:opacity-40"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Livrer
          </button>
        </section>
      )}

      {canDecide && (
        <section className={`${card} mb-5`}>
          <h2 className="font-bold text-primary mb-1">Cette livraison vous convient ?</h2>
          <p className="text-sm text-muted mb-4">
            Accepter clôture la commande. Sinon, dites ce qui doit être revu.
          </p>

          <textarea
            value={revision}
            onChange={(e) => setRevision(e.target.value)}
            rows={3}
            placeholder="Ce qui doit être corrigé…"
            className={`${field} resize-y`}
          />

          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => act("accept")}
              disabled={busy}
              className="rounded-xl bg-success text-white font-bold px-6 py-2.5 inline-flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Check size={15} /> Accepter et clôturer
            </button>
            <button
              onClick={() => act("revision", { reason: revision })}
              disabled={busy || !revision.trim()}
              className="rounded-xl border-2 border-line text-primary font-bold px-6 py-2.5 inline-flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <RotateCcw size={15} /> Demander une révision
            </button>
          </div>
        </section>
      )}

      <section className={`${card} mb-5`}>
        <h2 className="font-bold text-primary mb-3 inline-flex items-center gap-2">
          <Package size={16} /> Livraisons ({o.deliveries.length})
        </h2>

        {o.deliveries.length === 0 ? (
          <p className="text-sm text-muted">Aucune livraison pour le moment.</p>
        ) : (
          <ol className="space-y-3">
            {o.deliveries.map((d: any) => (
              <li key={d.id} className="rounded-xl border border-line-soft p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-bold text-primary">
                    Livraison {d.attempt}
                  </span>
                  <span className="text-xs text-muted">{dateTime(d.createdAt)}</span>
                  {d.acceptedAt && (
                    <span className="text-[11px] font-bold text-success">Acceptée</span>
                  )}
                </div>
                {d.message && (
                  <p className="mt-2 text-sm text-body whitespace-pre-wrap break-words">
                    {d.message}
                  </p>
                )}
                {d.revisionRequested && d.revisionNote && (
                  <p className="mt-2 rounded-lg bg-tint-orange text-warn text-xs p-2.5">
                    <strong>Révision demandée :</strong> {d.revisionNote}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      {o.status === "COMPLETED" && (
        <div className="mb-5">
          <ReviewForm orderId={o.id} onDone={load} />
        </div>
      )}

      <section className={card}>
        <h2 className="font-bold text-primary mb-3">Historique</h2>
        <ol className="space-y-2">
          {o.events.map((e: any) => (
            <li key={e.id} className="flex flex-wrap items-baseline gap-2 text-sm">
              <span className="text-xs text-muted w-36 shrink-0">
                {dateTime(e.createdAt)}
              </span>
              <span className="font-semibold text-primary">
                {STATUS[e.toStatus]?.label ?? e.toStatus}
              </span>
              {e.actor && (
                <span className="text-xs text-muted">
                  {[e.actor.firstName, e.actor.lastName].filter(Boolean).join(" ")}
                </span>
              )}
              {e.note && (
                <span className="w-full text-xs text-muted ps-36 break-words">{e.note}</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      {canCancel && (
        <button
          onClick={() => {
            const why = window.prompt("Motif de l'annulation :");
            if (why?.trim()) act("cancel", { reason: why.trim() });
          }}
          disabled={busy}
          className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-danger disabled:opacity-40"
        >
          <X size={15} /> Annuler la commande
        </button>
      )}
    </>
  );
};

export default OrderDetail;
