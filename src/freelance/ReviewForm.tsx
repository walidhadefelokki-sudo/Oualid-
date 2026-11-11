import React, { useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";
import api from "../services/api";

/**
 * Leaving a review on a completed order.
 *
 * Shown on the order page once the order closes, to whichever side has not
 * reviewed yet. The three criteria are optional: a client who only wants to
 * give a number should not be made to fill a form, and a form people abandon
 * produces no reviews at all.
 */

const Stars: React.FC<{
  value: number;
  onChange: (n: number) => void;
  label: string;
}> = ({ value, onChange, label }) => (
  <div className="flex items-center gap-3">
    <span className="text-sm text-body w-40 shrink-0">{label}</span>
    <div className="flex gap-0.5" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} / 5`}
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star
            size={22}
            className={n <= value ? "text-secondary" : "text-primary/20"}
            fill={n <= value ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  </div>
);

interface State {
  canReview: boolean;
  reason: string | null;
  existing: { id: string; rating: number; comment: string | null; response: string | null } | null;
}

const ReviewForm: React.FC<{ orderId: string; onDone: () => void }> = ({ orderId, onDone }) => {
  const [state, setState] = useState<State | null>(null);
  const [rating, setRating] = useState(0);
  const [quality, setQuality] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [deadline, setDeadline] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get(`/freelance/me/orders/${orderId}/review`)
      .then((r) => setState(r.data.data))
      .catch(() => setState(null));
  }, [orderId]);

  if (!state) return null;

  if (state.existing) {
    return (
      <section className="rounded-panel bg-surface p-6">
        <h2 className="font-bold text-primary mb-2">Votre avis</h2>
        <div className="flex gap-0.5 mb-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={16}
              className={n <= state.existing!.rating ? "text-secondary" : "text-primary/20"}
              fill={n <= state.existing!.rating ? "currentColor" : "none"}
            />
          ))}
        </div>
        {state.existing.comment && (
          <p className="text-sm text-body break-words">{state.existing.comment}</p>
        )}
      </section>
    );
  }

  // Nothing to offer until the work is finished.
  if (!state.canReview) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return setError("Donnez une note générale.");

    setBusy(true);
    setError(null);
    try {
      await api.post(`/freelance/me/orders/${orderId}/review`, {
        rating,
        comment,
        qualityRating: quality || null,
        communicationRating: communication || null,
        deadlineRating: deadline || null,
      });
      onDone();
    } catch (err: any) {
      setError(err?.response?.data?.message || "L'envoi a échoué.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-panel bg-surface p-6">
      <h2 className="font-bold text-primary mb-1">Laisser un avis</h2>
      <p className="text-sm text-muted mb-4">
        Visible publiquement. Les trois critères sont facultatifs.
      </p>

      <div className="space-y-2">
        <Stars value={rating} onChange={setRating} label="Note générale *" />
        <Stars value={quality} onChange={setQuality} label="Qualité" />
        <Stars value={communication} onChange={setCommunication} label="Communication" />
        <Stars value={deadline} onChange={setDeadline} label="Respect des délais" />
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        placeholder="Comment s'est passée la collaboration ?"
        className="mt-4 w-full rounded-xl border-2 border-line px-4 py-3 text-sm outline-none focus:border-primary resize-y"
      />

      {error && (
        <p className="mt-3 rounded-xl bg-tint-red text-danger text-sm p-3">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded-xl bg-primary text-white font-bold px-6 py-2.5 inline-flex items-center gap-2 disabled:opacity-40"
      >
        {busy && <Loader2 size={15} className="animate-spin" />}
        Publier mon avis
      </button>
    </form>
  );
};

export default ReviewForm;
