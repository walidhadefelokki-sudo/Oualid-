import React, { useState } from "react";
import { Check, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import api from "../../services/api";

/**
 * The signed-in administrator's own account.
 *
 * Changing a password used to mean running a script against the production
 * database from a terminal, which puts the new password in a shell history
 * and makes rotating one a job for whoever has the connection string. It
 * belongs here.
 *
 * No scope guards this tab: it is your own account, and an administrator who
 * cannot change their own password is an administrator who will not change it.
 */

const MIN_LENGTH = 10;

const field =
  "w-full rounded-xl border-2 border-primary/15 bg-white px-4 py-2.5 pe-11 text-sm outline-none focus:border-primary/40";

/** A password box with a reveal, because typing one blind twice is how
 *  people end up locked out of the account they just secured. */
const Secret: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  hint?: string;
}> = ({ label, value, onChange, autoComplete, hint }) => {
  const [shown, setShown] = useState(false);

  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-widest text-primary/45">
        {label}
      </span>
      <span className="mt-1 block relative">
        <input
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={field}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? "Masquer" : "Afficher"}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-primary/40 hover:text-primary"
        >
          {shown ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
      {hint && <span className="mt-1 block text-[11px] text-primary/45">{hint}</span>}
    </label>
  );
};

const MyAccountTab: React.FC = () => {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  /* Checked here as well as on the server — not instead of. This only spares
     the reader a round trip to be told what they could see. */
  const tooShort = next.length > 0 && next.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && next !== confirm;
  const sameAsOld = next.length > 0 && next === current;
  const ready =
    current.length > 0 &&
    next.length >= MIN_LENGTH &&
    next === confirm &&
    !sameAsOld &&
    !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;

    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await api.patch("/auth/me/password", {
        currentPassword: current,
        newPassword: next,
      });
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Le changement a échoué.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-display mb-2">Mon compte</h1>
      <p className="text-sm text-primary/60 mb-6">
        Votre mot de passe d'administrateur.
      </p>

      <form onSubmit={submit} className="max-w-md rounded-2xl border-2 border-primary/12 bg-white p-6">
        <div className="flex items-center gap-2 mb-5">
          <span className="w-9 h-9 rounded-xl bg-primary/8 text-primary grid place-items-center">
            <KeyRound size={17} />
          </span>
          <h2 className="font-display font-bold text-primary">Changer le mot de passe</h2>
        </div>

        <div className="space-y-4">
          <Secret
            label="Mot de passe actuel"
            value={current}
            onChange={setCurrent}
            autoComplete="current-password"
          />

          <Secret
            label="Nouveau mot de passe"
            value={next}
            onChange={setNext}
            autoComplete="new-password"
            hint={`${MIN_LENGTH} caractères minimum. Une phrase longue vaut mieux qu'un mot compliqué.`}
          />

          <Secret
            label="Confirmer"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
          />
        </div>

        {/* Said as it is typed, not after the request comes back. */}
        {tooShort && (
          <p className="mt-3 text-[12px] font-semibold text-amber-700">
            Encore {MIN_LENGTH - next.length} caractère(s).
          </p>
        )}
        {mismatch && (
          <p className="mt-3 text-[12px] font-semibold text-amber-700">
            Les deux saisies ne correspondent pas.
          </p>
        )}
        {sameAsOld && (
          <p className="mt-3 text-[12px] font-semibold text-amber-700">
            Le nouveau mot de passe est identique à l'actuel.
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {done && (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 inline-flex items-start gap-2">
            <Check size={15} className="mt-0.5 shrink-0" />
            Mot de passe modifié. Il sera demandé à votre prochaine connexion.
          </p>
        )}

        <button
          type="submit"
          disabled={!ready}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white disabled:opacity-40"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          Enregistrer
        </button>

        {/* Said plainly rather than implied: this does not sign other
            sessions out, and claiming otherwise would be a promise the token
            cannot keep. */}
        <p className="mt-4 flex items-start gap-2 text-[11px] text-primary/45">
          <ShieldCheck size={13} className="mt-0.5 shrink-0" />
          Les sessions déjà ouvertes sur d'autres appareils restent actives. Si vous
          pensez qu'un accès est compromis, dites-le à un administrateur sans
          restriction.
        </p>
      </form>
    </div>
  );
};

export default MyAccountTab;
