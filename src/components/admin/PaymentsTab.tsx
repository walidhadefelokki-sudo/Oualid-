import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  RefreshCw,
  Search,
  Wallet,
} from "lucide-react";
import api from "../../services/api";

/**
 * Every payment on the platform.
 *
 * Money arrives through three unrelated tables — recruiter subscriptions,
 * annonce packs and freelance credits — and none of it was visible together
 * anywhere in the admin. The only money on screen was the CCP/BaridiMob
 * review queue inside freelance moderation, which is one method of one of the
 * three, so "what has the platform earned" had no answer short of opening the
 * database.
 *
 * Read-only on purpose. Approving a transfer stays on the moderation screen
 * that owns the credit grant: two places that can turn a receipt into credits
 * is two places a grant can be applied twice.
 */

type Source = "subscription" | "pack" | "marketplace";

interface PaymentRow {
  id: string;
  source: Source;
  reference: string;
  description: string;
  payer: { name: string; email: string | null; company: string | null };
  amount: number;
  currency: string;
  method: string;
  status: string;
  invoiceNumber: string | null;
  receiptUrl: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface Summary {
  currencies: string[];
  revenue: number;
  revenueThisMonth: number;
  bySource: Record<Source, number>;
  counts: {
    all: number;
    paid: number;
    pending: number;
    awaitingReview: number;
    failed: number;
    refunded: number;
    rejected: number;
  };
  pendingAmount: number;
}

interface Result {
  payments: PaymentRow[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  summary: Summary;
  truncated: boolean;
  scanLimit: number;
}

const SOURCE_LABEL: Record<Source, string> = {
  subscription: "Abonnement",
  pack: "Pack annonces",
  marketplace: "Marketplace",
};

const SOURCE_STYLE: Record<Source, string> = {
  subscription: "bg-primary/8 text-primary",
  pack: "bg-amber-50 text-amber-700",
  marketplace: "bg-indigo-50 text-indigo-700",
};

const STATUS_LABEL: Record<string, string> = {
  PAID: "Payé",
  PENDING: "En attente",
  AWAITING_REVIEW: "À vérifier",
  FAILED: "Échoué",
  REFUNDED: "Remboursé",
  REJECTED: "Refusé",
  EXPIRED: "Expiré",
  CANCELED: "Annulé",
};

const STATUS_STYLE: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-gray-100 text-gray-600 border-gray-200",
  AWAITING_REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  FAILED: "bg-red-50 text-red-600 border-red-200",
  REFUNDED: "bg-sky-50 text-sky-700 border-sky-200",
  REJECTED: "bg-red-50 text-red-600 border-red-200",
  EXPIRED: "bg-gray-100 text-gray-500 border-gray-200",
  CANCELED: "bg-gray-100 text-gray-500 border-gray-200",
};

const METHOD_LABEL: Record<string, string> = {
  CARD: "Carte",
  CHARGILY_CIB: "Carte CIB",
  CHARGILY_EDAHABIA: "Carte Edahabia",
  CCP_TRANSFER: "Virement CCP",
  BARIDIMOB: "BaridiMob",
  BANK_TRANSFER: "Virement bancaire",
  CCP: "CCP",
  CASH: "Espèces",
  ADMIN_GRANT: "Octroi admin",
};

const STATUS_CHOICES = [
  "",
  "PAID",
  "PENDING",
  "AWAITING_REVIEW",
  "FAILED",
  "REFUNDED",
  "REJECTED",
  "EXPIRED",
  "CANCELED",
];

const money = (value: number, currency = "DZD") =>
  `${Math.round(value).toLocaleString("fr-FR").replace(/ /g, " ")} ${currency}`;

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const Tile: React.FC<{
  label: string;
  value: React.ReactNode;
  hint?: string;
  warn?: boolean;
}> = ({ label, value, hint, warn }) => (
  <div
    className={`rounded-xl border-2 bg-white px-4 py-3 ${
      warn ? "border-amber-200" : "border-primary/12"
    }`}
  >
    <p className="text-[11px] font-black uppercase tracking-widest text-primary/45">{label}</p>
    <p className={`mt-1 text-xl font-display font-bold ${warn ? "text-amber-700" : "text-primary"}`}>
      {value}
    </p>
    {hint && <p className="mt-0.5 text-[11px] text-primary/40">{hint}</p>}
  </div>
);

const PaymentsTab: React.FC = () => {
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: body } = await api.get("/admin/payments", {
        params: {
          ...(q.trim() ? { q: q.trim() } : {}),
          ...(source ? { source } : {}),
          ...(status ? { status } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          page,
          perPage: 25,
        },
      });
      setData(body.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Le chargement des paiements a échoué.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  /* Debounced on the term only; the dropdowns and dates apply at once. */
  useEffect(() => {
    const timer = setTimeout(load, q.trim() ? 350 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, source, status, from, to, page]);

  /* Any change to the filters returns to the first page: staying on page four
     of a list that now has two is an empty table over a count that says there
     are results. */
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, source, status, from, to]);

  const s = data?.summary;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-display">Paiements</h1>
        <button
          onClick={load}
          disabled={loading}
          aria-label="Rafraîchir"
          className="p-2 rounded-lg border border-primary/20 text-primary/60 hover:text-primary disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {s && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            {/* Only paid money. An attempted payment is not revenue. */}
            <Tile
              label="Encaissé"
              value={money(s.revenue, s.currencies[0] ?? "DZD")}
              hint={`${s.counts.paid} paiement(s) payé(s)`}
            />
            <Tile label="Ce mois" value={money(s.revenueThisMonth, s.currencies[0] ?? "DZD")} />
            <Tile
              label="En attente"
              value={money(s.pendingAmount, s.currencies[0] ?? "DZD")}
              hint={`${s.counts.pending + s.counts.awaitingReview} paiement(s)`}
              warn={s.pendingAmount > 0}
            />
            <Tile
              label="À vérifier"
              value={s.counts.awaitingReview}
              hint="Virements avec reçu"
              warn={s.counts.awaitingReview > 0}
            />
          </div>

          {/* Where the money came from — the three tables, side by side. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            {(Object.keys(SOURCE_LABEL) as Source[]).map((key) => (
              <button
                key={key}
                onClick={() => setSource(source === key ? "" : key)}
                className={`rounded-xl border-2 bg-white px-4 py-3 text-start transition-colors ${
                  source === key ? "border-primary" : "border-primary/12 hover:border-primary/30"
                }`}
              >
                <p className="text-[11px] font-black uppercase tracking-widest text-primary/45">
                  {SOURCE_LABEL[key]}
                </p>
                <p className="mt-1 font-display font-bold text-primary">
                  {money(s.bySource[key], s.currencies[0] ?? "DZD")}
                </p>
              </button>
            ))}
          </div>

          {/* More than one currency means the totals above are adding
              different things, so say so rather than show a wrong number. */}
          {s.currencies.length > 1 && (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 inline-flex items-start gap-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              Plusieurs devises sont présentes ({s.currencies.join(", ")}). Les totaux
              ci-dessus additionnent des montants non convertis — filtrez par devise pour
              un chiffre juste.
            </p>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex-1 min-w-[14rem] flex items-center gap-2 rounded-lg border border-primary/20 bg-white px-3">
          <Search size={15} className="text-primary/40 shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Référence, facture, payeur, entreprise…"
            className="w-full py-2 text-sm outline-none bg-transparent"
          />
        </div>

        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          aria-label="Filtrer par origine"
          className="border border-primary/20 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Toutes les origines</option>
          {(Object.keys(SOURCE_LABEL) as Source[]).map((k) => (
            <option key={k} value={k}>
              {SOURCE_LABEL[k]}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filtrer par statut"
          className="border border-primary/20 rounded-lg px-3 py-2 text-sm"
        >
          {STATUS_CHOICES.map((k) => (
            <option key={k} value={k}>
              {k ? STATUS_LABEL[k] : "Tous les statuts"}
            </option>
          ))}
        </select>

        <label className="inline-flex items-center gap-2 text-sm text-primary/60">
          Du
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-primary/20 rounded-lg px-2 py-2 text-sm"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-primary/60">
          au
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-primary/20 rounded-lg px-2 py-2 text-sm"
          />
        </label>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* The list stops at a bound; a total that is quietly short is worse
          than one that admits where it stops. */}
      {data?.truncated && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 inline-flex items-start gap-2">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          Seuls les {data.scanLimit} paiements les plus récents de chaque source sont lus.
          Affinez les filtres pour un total exact.
        </p>
      )}

      {!data ? (
        <div className="bg-white rounded-xl p-10 text-center text-primary/50">Chargement…</div>
      ) : data.payments.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <Wallet size={28} className="mx-auto text-primary/25" />
          <p className="mt-3 font-semibold text-primary/70">Aucun paiement</p>
          <p className="mt-1 text-sm text-primary/45">
            {q || source || status || from || to
              ? "Aucun paiement ne correspond à ces filtres."
              : "Les paiements apparaîtront ici dès le premier encaissement."}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-primary/10 overflow-x-auto">
            <table className="w-full text-sm min-w-[56rem]">
              <thead className="text-[11px] font-black uppercase tracking-widest text-primary/45 text-start">
                <tr>
                  <th className="px-4 py-3 text-start">Référence</th>
                  <th className="px-4 py-3 text-start">Origine</th>
                  <th className="px-4 py-3 text-start">Payeur</th>
                  <th className="px-4 py-3 text-start">Objet</th>
                  <th className="px-4 py-3 text-end">Montant</th>
                  <th className="px-4 py-3 text-start">Moyen</th>
                  <th className="px-4 py-3 text-start">Statut</th>
                  <th className="px-4 py-3 text-start">Date</th>
                  <th className="px-4 py-3 text-start">Pièces</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((p) => (
                  <tr key={`${p.source}-${p.id}`} className="border-t border-primary/10">
                    <td className="px-4 py-3 font-mono text-xs break-all" dir="ltr">
                      {p.reference}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${SOURCE_STYLE[p.source]}`}
                      >
                        {SOURCE_LABEL[p.source]}
                      </span>
                    </td>
                    <td className="px-4 py-3 min-w-0">
                      <p className="font-medium break-words">{p.payer.name}</p>
                      {p.payer.company && (
                        <p className="text-xs text-primary/50 break-words">{p.payer.company}</p>
                      )}
                      {p.payer.email && (
                        <p className="text-xs text-primary/40 break-all">{p.payer.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-primary/70 break-words">{p.description}</td>
                    <td className="px-4 py-3 text-end font-bold whitespace-nowrap" dir="ltr">
                      {money(p.amount, p.currency)}
                    </td>
                    <td className="px-4 py-3 text-primary/60 whitespace-nowrap">
                      {METHOD_LABEL[p.method] ?? p.method}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
                          STATUS_STYLE[p.status] ?? "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-primary/60">
                      {/* The payment date when there is one, otherwise when it
                          was attempted — marked, so the two are not confused. */}
                      {p.paidAt ? (
                        day(p.paidAt)
                      ) : (
                        <span className="inline-flex items-center gap-1 text-primary/45">
                          <Clock size={12} /> {day(p.createdAt)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.invoiceNumber && (
                          <span
                            title={`Facture ${p.invoiceNumber}`}
                            className="inline-flex items-center gap-1 text-xs text-primary/60"
                          >
                            <FileText size={13} /> {p.invoiceNumber}
                          </span>
                        )}
                        {p.receiptUrl && (
                          <a
                            href={p.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                          >
                            <ExternalLink size={13} /> Reçu
                          </a>
                        )}
                        {!p.invoiceNumber && !p.receiptUrl && (
                          <span className="text-xs text-primary/30">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-primary/50">
              {data.total} paiement(s) · page {data.page} sur {data.totalPages}
            </p>

            {data.totalPages > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((n) => Math.max(1, n - 1))}
                  disabled={data.page <= 1}
                  className="rounded-lg border border-primary/20 px-4 py-2 text-sm font-bold text-primary disabled:opacity-40"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setPage((n) => n + 1)}
                  disabled={data.page >= data.totalPages}
                  className="rounded-lg border border-primary/20 px-4 py-2 text-sm font-bold text-primary disabled:opacity-40"
                >
                  Suivant
                </button>
              </div>
            )}
          </div>

          {s && s.counts.awaitingReview > 0 && (
            <p className="mt-5 inline-flex items-start gap-2 rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 text-sm text-primary/70">
              <CreditCard size={15} className="mt-0.5 shrink-0" />
              {s.counts.awaitingReview} virement(s) attendent une vérification. Ils
              s'approuvent depuis Modération freelance → Virements, qui accorde les
              crédits.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default PaymentsTab;
