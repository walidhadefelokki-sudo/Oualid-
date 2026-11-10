import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  RotateCcw,
  Tag,
  X,
} from "lucide-react";
import { CustomOffer, NewOffer, offersApi } from "./messaging";
import { Price } from "./ui";

/**
 * Offers quoted inside a conversation.
 *
 * The marketplace sold two ways: a client buys a package off a service page,
 * or a freelancer answers a published project. Neither covers the most
 * ordinary case — the two are already talking, the job is not quite any
 * package, and somebody has to name a figure. That used to happen in the
 * thread as a sentence, with nothing to accept and no order at the end of it.
 *
 * Sits above the messages rather than between them. An offer is the one thing
 * in a conversation that has to be found again later, and a card that scrolls
 * away with the chat is one the client has to hunt for to accept.
 */

interface Props {
  conversationId: string;
  /** Raised after an accept, so the thread can refresh what it shows. */
  onOrderCreated?: (orderId: string) => void;
}

const STATUS: Record<
  CustomOffer["status"],
  { label: string; tone: string }
> = {
  SENT: { label: "En attente", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  ACCEPTED: { label: "Acceptée", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  DECLINED: { label: "Refusée", tone: "bg-red-50 text-red-600 border-red-200" },
  WITHDRAWN: { label: "Retirée", tone: "bg-gray-100 text-gray-500 border-gray-200" },
  EXPIRED: { label: "Expirée", tone: "bg-gray-100 text-gray-500 border-gray-200" },
};

const field =
  "w-full rounded-xl border-2 border-[#173E7D]/15 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#173E7D]/40";

const dayCount = (iso: string | null) => {
  if (!iso) return null;
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  return days > 0 ? days : 0;
};

const OfferPanel: React.FC<Props> = ({ conversationId, onOrderCreated }) => {
  const [offers, setOffers] = useState<CustomOffer[]>([]);
  const [canSend, setCanSend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [composing, setComposing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    deliveryDays: "7",
    revisions: "1",
  });

  const load = async () => {
    try {
      const data = await offersApi.list(conversationId);
      setOffers(data.offers);
      setCanSend(data.canSendOffer);
    } catch {
      // A thread with no offers is the normal case, and a failure here must
      // not take the conversation down with it.
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusyId("new");
    setError(null);
    try {
      const payload: NewOffer = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        price: Number(form.price),
        deliveryDays: Number(form.deliveryDays),
        revisions: Number(form.revisions) || 0,
      };
      await offersApi.send(conversationId, payload);
      setComposing(false);
      setForm({ title: "", description: "", price: "", deliveryDays: "7", revisions: "1" });
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "L'offre n'a pas pu être envoyée.");
    } finally {
      setBusyId(null);
    }
  };

  const act = async (
    offer: CustomOffer,
    action: "accept" | "decline" | "withdraw"
  ) => {
    if (action === "accept") {
      const ok = window.confirm(
        `Accepter cette offre à ${offer.price.toLocaleString("fr-FR")} DZD ?\n\nUne commande sera créée et le délai de ${offer.deliveryDays} jours commencera.`
      );
      if (!ok) return;
    }

    setBusyId(offer.id);
    setError(null);
    try {
      if (action === "accept") {
        const { order } = await offersApi.accept(offer.id);
        onOrderCreated?.(order.id);
      } else if (action === "decline") {
        await offersApi.decline(offer.id);
      } else {
        await offersApi.withdraw(offer.id);
      }
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || "L'action a échoué.");
      // Reloaded anyway: the usual reason an action fails is that the other
      // side already answered, and the screen should show that.
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const live = offers.find((o) => o.status === "SENT");
  const past = offers.filter((o) => o.status !== "SENT");

  // Nothing to show and nothing to offer: stay out of the way entirely.
  if (loading || (offers.length === 0 && !canSend)) return null;

  return (
    <section className="rounded-2xl border-2 border-[#D4AF37]/40 bg-white overflow-hidden mb-4">
      <header className="flex flex-wrap items-center gap-2 bg-gradient-to-r from-[#0B1E3D] to-[#173E7D] px-4 py-3 text-white">
        <Tag size={16} className="text-[#D4AF37]" />
        <h3 className="font-display font-bold text-sm">Offre personnalisée</h3>

        {canSend && !composing && (
          <button
            onClick={() => setComposing(true)}
            className="ms-auto rounded-full border border-white/25 px-3.5 py-1.5 text-xs font-bold hover:bg-white/10"
          >
            {live ? "Nouvelle offre" : "Envoyer une offre"}
          </button>
        )}
      </header>

      <div className="p-4">
        {error && (
          <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
            {error}
          </p>
        )}

        {composing && (
          <form onSubmit={send} className="mb-4 space-y-3">
            {/* Said before they type it, not after the server refuses. */}
            {live && (
              <p className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-800">
                L'offre en attente sera remplacée par celle-ci.
              </p>
            )}

            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ce que vous proposez"
              maxLength={120}
              className={field}
            />

            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ce qui est inclus (facultatif)"
              rows={3}
              className={`${field} resize-y`}
            />

            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#173E7D]/45">
                  Prix (DZD)
                </span>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  min={500}
                  className={`${field} mt-1`}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#173E7D]/45">
                  Délai (jours)
                </span>
                <input
                  type="number"
                  value={form.deliveryDays}
                  onChange={(e) => setForm({ ...form, deliveryDays: e.target.value })}
                  min={1}
                  className={`${field} mt-1`}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#173E7D]/45">
                  Révisions
                </span>
                <input
                  type="number"
                  value={form.revisions}
                  onChange={(e) => setForm({ ...form, revisions: e.target.value })}
                  min={0}
                  className={`${field} mt-1`}
                />
              </label>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busyId === "new" || !form.title.trim() || !form.price}
                className="inline-flex items-center gap-2 rounded-xl bg-[#173E7D] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
              >
                {busyId === "new" && <Loader2 size={14} className="animate-spin" />}
                Envoyer l'offre
              </button>
              <button
                type="button"
                onClick={() => setComposing(false)}
                className="rounded-xl border-2 border-[#173E7D]/15 px-4 py-2.5 text-sm font-bold text-[#173E7D]"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        {offers.length === 0 && !composing && (
          <p className="text-sm text-[#2B3442]/50">
            Proposez un prix pour un travail qui ne correspond à aucune de vos formules.
          </p>
        )}

        {[...(live ? [live] : []), ...past].map((offer) => {
          const days = dayCount(offer.expiresAt);
          const busy = busyId === offer.id;

          return (
            <article
              key={offer.id}
              className={`rounded-xl border-2 p-4 mb-3 last:mb-0 ${
                offer.status === "SENT" ? "border-[#D4AF37]/50" : "border-[#173E7D]/10 opacity-80"
              }`}
            >
              <div className="flex flex-wrap items-start gap-2">
                <h4 className="font-bold text-[#173E7D] min-w-0 flex-1 break-words">
                  {offer.title}
                </h4>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${STATUS[offer.status].tone}`}
                >
                  {STATUS[offer.status].label}
                </span>
              </div>

              {offer.description && (
                <p className="mt-2 text-sm text-[#2B3442]/70 whitespace-pre-wrap break-words">
                  {offer.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                <span className="text-lg font-display font-bold text-[#173E7D]">
                  <Price value={offer.price} />
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#2B3442]/60">
                  <Clock size={13} /> {offer.deliveryDays} jour(s)
                </span>
                <span className="text-[#2B3442]/60">
                  <RotateCcw size={13} className="inline me-1.5" />
                  {offer.revisions} révision(s)
                </span>
              </div>

              {/* How long it stands, while it still stands. */}
              {offer.status === "SENT" && days !== null && (
                <p className="mt-2 text-[11px] text-[#2B3442]/45">
                  {days === 0 ? "Expire aujourd'hui" : `Valable encore ${days} jour(s)`}
                </p>
              )}

              {offer.order && (
                <Link
                  to={`/freelance-espace/commandes/${offer.order.id}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#173E7D] hover:underline"
                >
                  <FileText size={14} /> Commande {offer.order.reference}
                </Link>
              )}

              {offer.status === "SENT" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {canSend ? (
                    <button
                      onClick={() => act(offer, "withdraw")}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#173E7D]/15 px-4 py-2 text-sm font-bold text-[#173E7D] disabled:opacity-50"
                    >
                      {busy && <Loader2 size={13} className="animate-spin" />}
                      Retirer
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => act(offer, "accept")}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#173E7D] px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        Accepter
                      </button>
                      <button
                        onClick={() => act(offer, "decline")}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#173E7D]/15 px-4 py-2 text-sm font-bold text-[#2B3442]/70 disabled:opacity-50"
                      >
                        <X size={14} /> Refuser
                      </button>
                    </>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default OfferPanel;
