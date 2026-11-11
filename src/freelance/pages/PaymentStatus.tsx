import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Clock, Loader2, X } from "lucide-react";
import api from "../../services/api";
import { ErrorState, Loading, Price } from "../ui";

/**
 * Where a buyer lands after paying, and where a transfer waits.
 *
 * For a card, the gateway sends the buyer back here before its webhook
 * necessarily arrives, so the page polls for a short while rather than
 * declaring a paid purchase unpaid. It stops after a minute: a payment that
 * has not settled by then needs support, not a spinner.
 */

const STATUS: Record<string, { label: string; tone: string; icon: React.ReactNode }> = {
  PENDING: {
    label: "En attente de confirmation",
    tone: "bg-tint-orange border-secondary text-warn",
    icon: <Clock size={18} />,
  },
  AWAITING_REVIEW: {
    label: "En attente de vérification",
    tone: "bg-tint-orange border-secondary text-warn",
    icon: <Clock size={18} />,
  },
  PAID: {
    label: "Paiement confirmé",
    tone: "bg-tint-green text-success",
    icon: <Check size={18} />,
  },
  REJECTED: {
    label: "Paiement refusé",
    tone: "bg-tint-red text-danger",
    icon: <X size={18} />,
  },
  FAILED: {
    label: "Paiement échoué",
    tone: "bg-tint-red text-danger",
    icon: <X size={18} />,
  },
  EXPIRED: {
    label: "Paiement expiré",
    tone: "bg-tint-grey border-line text-neutral-ink",
    icon: <X size={18} />,
  },
};

const PaymentStatus: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [payment, setPayment] = useState<any>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    const check = async () => {
      try {
        const { data } = await api.get(`/freelance/me/payments/${id}`);
        if (cancelled) return;
        setPayment(data.data.payment);

        // Keep looking only while the answer can still change, and only for
        // about a minute.
        if (data.data.payment.status === "PENDING" && tries < 20) {
          tries += 1;
          setTimeout(check, 3000);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (failed) return <ErrorState />;
  if (!payment) return <Loading />;

  const s = STATUS[payment.status] ?? STATUS.PENDING;
  const isTransfer = ["CCP_TRANSFER", "BARIDIMOB", "BANK_TRANSFER"].includes(payment.method);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <div className={`rounded-card border-2 p-6 ${s.tone}`}>
        <p className="inline-flex items-center gap-2 font-bold">
          {s.icon} {s.label}
        </p>
        {payment.status === "PENDING" && (
          <p className="mt-2 text-sm inline-flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            Nous attendons la confirmation de la banque…
          </p>
        )}
        {payment.rejectionReason && <p className="mt-2 text-sm">{payment.rejectionReason}</p>}
      </div>

      <dl className="mt-6 rounded-card border-2 border-line bg-white divide-y divide-line-soft">
        {[
          ["Référence", <span dir="ltr">{payment.reference}</span>],
          ["Pack", payment.creditPack ? `${payment.creditPack.name} · ${payment.creditPack.credits} crédits` : "—"],
          ["Montant", <Price value={payment.amount} currency={payment.currency} />],
          ["Facture", payment.invoice ? <span dir="ltr">{payment.invoice.number}</span> : "—"],
        ].map(([k, v], i) => (
          <div key={i} className="flex items-baseline gap-4 px-5 py-3">
            <dt className="text-sm font-bold text-primary w-32 shrink-0">
              {k as string}
            </dt>
            <dd className="text-sm text-body min-w-0 break-words">{v as React.ReactNode}</dd>
          </div>
        ))}
      </dl>

      {isTransfer && payment.status === "AWAITING_REVIEW" && !payment.receipt && (
        <p className="mt-5 rounded-xl bg-ground border border-line text-sm text-body p-4">
          Effectuez le virement en indiquant la référence <strong>{payment.reference}</strong>,
          puis envoyez le reçu à{" "}
          <a href="mailto:info@darlemploi.dz" className="font-bold text-primary">
            info@darlemploi.dz
          </a>
          . Vos crédits seront ajoutés après vérification.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/freelance-espace/credits"
          className="rounded-full px-6 py-3 bg-primary text-white font-bold"
        >
          Mes crédits
        </Link>
        <Link
          to="/tarifs"
          className="rounded-full px-6 py-3 border-2 border-line text-primary font-bold"
        >
          Les tarifs
        </Link>
      </div>
    </div>
  );
};

export default PaymentStatus;
