import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Banknote, CreditCard, Loader2 } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../auth";
import { ErrorState, Loading, Price } from "../ui";
import SignIn from "./SignIn";

/**
 * Buying credits.
 *
 * Two routes, and the page is honest about both. A card goes to the gateway
 * and comes back settled by its webhook. A transfer produces instructions
 * and a payment waiting on somebody at Dar L'emploi to look at the receipt —
 * said plainly, because a buyer who expects instant credits and waits a day
 * writes to support.
 *
 * The card option disappears when the gateway is not configured, rather than
 * being a button that fails after the buyer has chosen their pack.
 */

interface Pack {
  id: string;
  name: string;
  credits: number;
  price: string;
  currency: string;
}

interface Options {
  packs: Pack[];
  cardAvailable: boolean;
  transfer: { ccp: unknown; baridimob: unknown };
}

const card = "rounded-2xl border-2 bg-white p-5";

const BuyCredits: React.FC = () => {
  const { signedIn, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [options, setOptions] = useState<Options | null>(null);
  const [failed, setFailed] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [method, setMethod] = useState<"CHARGILY_CIB" | "CCP_TRANSFER">("CHARGILY_CIB");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setFailed(false);
    api
      .get("/freelance/payments/options")
      .then((r) => {
        const data: Options = r.data.data;
        setOptions(data);
        setChosen(data.packs[1]?.id ?? data.packs[0]?.id ?? null);
        if (!data.cardAvailable) setMethod("CCP_TRANSFER");
      })
      .catch(() => setFailed(true));
  };

  useEffect(load, []);

  if (authLoading) return <Loading />;
  if (!signedIn) return <SignIn />;
  if (failed) return <ErrorState onRetry={load} />;
  if (!options) return <Loading />;

  const pack = options.packs.find((p) => p.id === chosen);

  const buy = async () => {
    if (!pack) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post("/freelance/me/payments", {
        creditPackId: pack.id,
        method,
      });

      if (data.data.checkoutUrl) {
        // A real navigation: the gateway is another site.
        window.location.href = data.data.checkoutUrl;
        return;
      }
      navigate(`/paiement/${data.data.payment.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.message || "L'achat n'a pas pu être lancé.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-display font-bold text-[#173E7D]">Acheter des crédits</h1>
      <p className="mt-2 text-[#2B3442]/60">
        Les crédits servent à publier un service et à répondre aux projets.
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {options.packs.map((p) => (
          <button
            key={p.id}
            onClick={() => setChosen(p.id)}
            className={`${card} text-center transition-colors ${
              chosen === p.id ? "border-[#173E7D]" : "border-[#173E7D]/15"
            }`}
          >
            <p className="text-3xl font-display font-bold text-[#173E7D]" dir="ltr">
              {p.credits}
            </p>
            <p className="text-[11px] font-black uppercase tracking-widest text-[#173E7D]/40">
              crédits
            </p>
            <p className="mt-3 font-bold">
              <Price value={p.price} currency={p.currency} />
            </p>
          </button>
        ))}
      </div>

      <h2 className="mt-8 text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50">
        Moyen de paiement
      </h2>

      <div className="mt-2 space-y-2">
        {options.cardAvailable && (
          <button
            onClick={() => setMethod("CHARGILY_CIB")}
            className={`${card} w-full text-start flex items-start gap-3 ${
              method === "CHARGILY_CIB" ? "border-[#173E7D]" : "border-[#173E7D]/15"
            }`}
          >
            <CreditCard size={20} className="mt-0.5 text-[#173E7D] shrink-0" />
            <span className="min-w-0">
              <span className="block font-bold text-[#173E7D]">Carte CIB ou Edahabia</span>
              <span className="block text-sm text-[#2B3442]/60">
                Crédits ajoutés dès la confirmation du paiement.
              </span>
            </span>
          </button>
        )}

        <button
          onClick={() => setMethod("CCP_TRANSFER")}
          className={`${card} w-full text-start flex items-start gap-3 ${
            method === "CCP_TRANSFER" ? "border-[#173E7D]" : "border-[#173E7D]/15"
          }`}
        >
          <Banknote size={20} className="mt-0.5 text-[#173E7D] shrink-0" />
          <span className="min-w-0">
            <span className="block font-bold text-[#173E7D]">Virement CCP ou BaridiMob</span>
            <span className="block text-sm text-[#2B3442]/60">
              Vous déposez le reçu, nous le vérifions. Les crédits arrivent après validation,
              généralement sous 24 heures ouvrées.
            </span>
          </span>
        </button>
      </div>

      {!options.cardAvailable && (
        <p className="mt-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">
          Le paiement par carte n'est pas disponible pour le moment. Le virement reste ouvert.
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm p-3">
          {error}
        </p>
      )}

      <button
        onClick={buy}
        disabled={busy || !pack}
        className="mt-6 w-full rounded-xl bg-[#173E7D] text-white font-bold py-3.5 inline-flex items-center justify-center gap-2 disabled:opacity-40"
      >
        {busy && <Loader2 size={15} className="animate-spin" />}
        {pack ? (
          <>
            Payer <Price value={pack.price} currency={pack.currency} />
          </>
        ) : (
          "Choisissez un pack"
        )}
      </button>
    </div>
  );
};

export default BuyCredits;
