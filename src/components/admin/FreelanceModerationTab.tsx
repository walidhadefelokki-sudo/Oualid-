import React, { useEffect, useState } from "react";
import { AlertTriangle, BadgeCheck, Check, Clock, Loader2, RefreshCw, X } from "lucide-react";
import api from "../../services/api";

/**
 * The freelance moderation queue.
 *
 * Every service a freelancer submits waits here. They have already paid for
 * the publication, so an item left unattended is money taken for nothing —
 * which is why the queue leads with how long things have waited rather than
 * only how many there are.
 *
 * Refusing requires a reason. It is shown to the author on their own editor
 * and the credits are returned, so "non" without a reason would be a charge
 * reversed with no way to act on it.
 */

interface Pkg {
  tier: string;
  name: string;
  price: string;
  deliveryDays: number;
  revisions: number;
  features: string[];
}

interface QueueItem {
  id: string;
  title: string;
  description: string;
  submittedAt: string;
  attempt: number;
  category: string | null;
  packages: Pkg[];
  faqs: Array<{ question: string; answer: string }>;
  skills: string[];
  images: string[];
  freelancer: {
    username: string;
    displayName: string;
    email: string;
    level: string;
    verified: boolean;
    rating: string | null;
    ratingCount: number;
    wilaya: string | null;
  };
}

interface Stats {
  pending: number;
  overdue: number;
  approvedToday: number;
  rejectedToday: number;
}

const money = (v: string) =>
  `${Number(v).toLocaleString("fr-FR").replace(/ /g, " ")} DZD`;

/** How long this has been waiting, in the words a moderator would use. */
const waited = (iso: string) => {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "moins d'une heure";
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} jour${days > 1 ? "s" : ""}`;
};

const StatTile: React.FC<{ label: string; value: number; warn?: boolean }> = ({
  label,
  value,
  warn,
}) => (
  <div
    className={`rounded-xl border-2 p-4 ${
      warn && value > 0 ? "border-amber-300 bg-amber-50" : "border-primary/15 bg-white"
    }`}
  >
    <p className="text-[11px] font-black uppercase tracking-widest text-primary/50">{label}</p>
    <p
      className={`mt-1 text-2xl font-display font-bold ${
        warn && value > 0 ? "text-amber-700" : "text-primary"
      }`}
    >
      {value}
    </p>
  </div>
);

const FreelanceModerationTab: React.FC = () => {
  const [items, setItems] = useState<QueueItem[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<QueueItem | null>(null);
  const [reason, setReason] = useState("");

  const load = () => {
    setError(null);
    Promise.all([
      api.get("/admin/freelance/moderation"),
      api.get("/admin/freelance/moderation/stats"),
    ])
      .then(([q, s]) => {
        setItems(q.data.data.services);
        setStats(s.data.data);
      })
      .catch((e) => setError(e?.response?.data?.message || e?.message || "Échec du chargement"));
  };

  useEffect(load, []);

  const approve = async (item: QueueItem) => {
    setBusyId(item.id);
    setError(null);
    try {
      await api.post(`/admin/freelance/moderation/services/${item.id}/approve`);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || "L'approbation a échoué.");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async () => {
    if (!rejecting || !reason.trim()) return;
    setBusyId(rejecting.id);
    setError(null);
    try {
      await api.post(`/admin/freelance/moderation/services/${rejecting.id}/reject`, {
        reason: reason.trim(),
      });
      setRejecting(null);
      setReason("");
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Le refus a échoué.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-display">Modération freelance</h1>
        <button
          onClick={load}
          aria-label="Rafraîchir"
          className="p-2 rounded-lg border border-primary/20 text-primary/60 hover:text-primary"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatTile label="En attente" value={stats.pending} />
          <StatTile label="Plus de 24 h" value={stats.overdue} warn />
          <StatTile label="Approuvés 24 h" value={stats.approvedToday} />
          <StatTile label="Refusés 24 h" value={stats.rejectedToday} />
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm p-3">
          {error}
        </p>
      )}

      {items === null ? (
        <div className="bg-white rounded-xl p-8 text-center text-primary/50">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center">
          <Check size={28} className="mx-auto text-emerald-500" />
          <p className="mt-3 font-semibold text-primary/70">La file est vide.</p>
          <p className="text-sm text-primary/40">
            Tous les services soumis ont reçu une décision.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const late = Date.now() - new Date(item.submittedAt).getTime() > 86_400_000;
            return (
              <article
                key={item.id}
                className={`rounded-xl border-2 bg-white overflow-hidden ${
                  late ? "border-amber-300" : "border-primary/15"
                }`}
              >
                <div className="p-5">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-bold text-primary break-words">{item.title}</h2>
                      <p className="mt-1 text-xs text-primary/50 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          {item.freelancer.displayName}
                          {item.freelancer.verified && <BadgeCheck size={13} />}
                        </span>
                        <span className="break-all">{item.freelancer.email}</span>
                        {item.category && <span>{item.category}</span>}
                        {item.freelancer.wilaya && <span>{item.freelancer.wilaya}</span>}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                        late ? "bg-amber-100 text-amber-800" : "bg-primary/8 text-primary/60"
                      }`}
                    >
                      <Clock size={12} /> {waited(item.submittedAt)}
                    </span>

                    {/* A resubmission has been refused before and is worth a
                        closer read than a first attempt. */}
                    {item.attempt > 1 && (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-sky-50 text-sky-700">
                        <AlertTriangle size={12} /> {item.attempt}
                        <sup>e</sup> envoi
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-sm text-gray-600 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                    {item.description}
                  </p>

                  {item.skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {item.skills.map((s) => (
                        <span
                          key={s}
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/8 text-primary"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {item.packages.map((p) => (
                      <div key={p.tier} className="rounded-lg border border-primary/10 p-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">
                          {p.tier}
                        </p>
                        <p className="font-bold text-primary" dir="ltr">
                          {money(p.price)}
                        </p>
                        <p className="text-xs text-primary/50">
                          {p.deliveryDays} j · {p.revisions} révision(s)
                        </p>
                        {p.features.length > 0 && (
                          <ul className="mt-1.5 text-xs text-gray-500 space-y-0.5">
                            {p.features.slice(0, 4).map((f) => (
                              <li key={f} className="break-words">
                                · {f}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>

                  {item.faqs.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {item.faqs.map((f, i) => (
                        <details key={i} className="text-sm">
                          <summary className="cursor-pointer font-semibold text-primary/70">
                            {f.question}
                          </summary>
                          <p className="mt-1 text-gray-600 break-words">{f.answer}</p>
                        </details>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 px-5 py-3 bg-primary/[0.03] border-t border-primary/10">
                  <button
                    onClick={() => approve(item)}
                    disabled={busyId === item.id}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold disabled:opacity-40"
                  >
                    {busyId === item.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Check size={15} />
                    )}
                    Approuver
                  </button>
                  <button
                    onClick={() => {
                      setRejecting(item);
                      setReason("");
                    }}
                    disabled={busyId === item.id}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border-2 border-red-200 text-red-600 text-sm font-bold disabled:opacity-40"
                  >
                    <X size={15} /> Refuser
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRejecting(null)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-lg font-display text-primary">Refuser ce service</h2>
            <p className="mt-1 text-sm text-primary/60 break-words">{rejecting.title}</p>

            <label className="block mt-5">
              <span className="block text-[11px] font-black uppercase tracking-widest text-primary/50 mb-1.5">
                Motif *
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                autoFocus
                placeholder="Ce que le freelance doit corriger avant de renvoyer."
                className="w-full border-2 border-primary/15 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary resize-y"
              />
            </label>

            <p className="mt-2 text-xs text-primary/50">
              Le motif est affiché au freelance, et les {""}
              crédits de publication lui sont rendus automatiquement.
            </p>

            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                onClick={() => setRejecting(null)}
                className="px-4 py-2.5 rounded-lg border border-primary/20 text-primary text-sm font-bold"
              >
                Annuler
              </button>
              <button
                onClick={reject}
                disabled={!reason.trim() || busyId === rejecting.id}
                className="px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {busyId === rejecting.id && <Loader2 size={15} className="animate-spin" />}
                Refuser et rembourser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FreelanceModerationTab;
