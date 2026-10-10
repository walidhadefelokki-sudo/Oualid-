import React, { useState } from "react";
import { Loader2, Mail, Send, X } from "lucide-react";
import adminService, {
  AdminUser,
  BROADCAST_BATCH,
  BROADCAST_MAX_BCC,
  BroadcastPayload,
} from "../../services/admin.service";

/**
 * Composes and sends a message to the accounts selected in the table.
 *
 * Sending happens here rather than in one server call: the function is killed
 * at 60 seconds and each message takes about two seconds, so the selection is
 * split into batches and sent one after another. That is also what makes a
 * progress bar possible, and what lets a part-way failure say which addresses
 * it got to.
 */

type Mode = BroadcastPayload["mode"];

const PRESETS: Array<{ label: string; url: string }> = [
  { label: "Compléter mon profil", url: "https://www.darlemploi.dz/dashboard?tab=profile" },
  { label: "Créer mon CV avec CV Maker", url: "https://www.darlemploi.dz/dashboard?tab=cv-maker" },
  { label: "Publier une offre", url: "https://www.darlemploi.dz/dashboard?tab=post-job" },
];

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
  label,
  hint,
  children,
}) => (
  <label className="block mb-4">
    <span className="block text-[11px] font-black uppercase tracking-widest text-primary/50 mb-1.5">
      {label}
    </span>
    {children}
    {hint && <span className="block mt-1 text-[11px] text-primary/40">{hint}</span>}
  </label>
);

const input =
  "w-full border border-primary/20 rounded-lg px-3 py-2 text-sm focus:border-primary focus:outline-none";

const SendEmailModal: React.FC<{
  recipients: AdminUser[];
  onClose: () => void;
  onSent: () => void;
}> = ({ recipients, onClose, onSent }) => {
  const [mode, setMode] = useState<Mode>("individual");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [buttonLabel, setButtonLabel] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [testTo, setTestTo] = useState("");

  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(0);
  const [failures, setFailures] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const content = {
    subject,
    body,
    buttonLabel: buttonLabel.trim() || null,
    buttonUrl: buttonUrl.trim() || null,
  };

  const ready = subject.trim().length > 0 && body.trim().length > 0;
  const tooManyGrouped = mode === "grouped" && recipients.length > BROADCAST_MAX_BCC;

  const sendTest = async () => {
    setError(null);
    setNote(null);
    if (!testTo.trim()) return setError("Indiquez une adresse de test.");
    if (!ready) return setError("Objet et message sont obligatoires.");

    setSending(true);
    try {
      const ok = await adminService.sendBroadcastPreview({ ...content, to: testTo.trim() });
      setNote(
        ok
          ? `Essai accepté par le serveur pour ${testTo.trim()}. Vérifiez aussi les spams.`
          : "Le serveur a refusé l'essai."
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || "Échec de l'essai.");
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    setError(null);
    setNote(null);
    if (!ready) return setError("Objet et message sont obligatoires.");
    if (tooManyGrouped) {
      return setError(
        `Le mode groupé accepte ${BROADCAST_MAX_BCC} destinataires au maximum. Passez en envoi individuel.`
      );
    }

    setSending(true);
    setDone(0);
    setFailures([]);

    const ids = recipients.map((r) => r.id);
    // One request in grouped mode — it is a single message either way.
    const batches: string[][] =
      mode === "grouped"
        ? [ids]
        : Array.from({ length: Math.ceil(ids.length / BROADCAST_BATCH) }, (_, i) =>
            ids.slice(i * BROADCAST_BATCH, (i + 1) * BROADCAST_BATCH)
          );

    let sentTotal = 0;
    const failed: string[] = [];

    try {
      for (const batch of batches) {
        const result = await adminService.sendBroadcast({ ...content, mode, userIds: batch });
        sentTotal += result.sent;
        failed.push(...result.results.filter((r) => !r.ok).map((r) => r.email));
        setDone(sentTotal);
        setFailures([...failed]);
      }

      setFinished(true);
      setNote(
        failed.length === 0
          ? `${sentTotal} message${sentTotal > 1 ? "s" : ""} accepté${sentTotal > 1 ? "s" : ""} par le serveur.`
          : `${sentTotal} envoyé(s), ${failed.length} échec(s).`
      );
      onSent();
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          `Interrompu après ${sentTotal} envoi(s). Les destinataires déjà traités ont reçu le message.`
      );
    } finally {
      setSending(false);
    }
  };

  const progress = recipients.length ? Math.round((done / recipients.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={sending ? undefined : onClose} />

      <div className="relative z-10 w-full max-w-2xl bg-accent rounded-2xl shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
        <header className="flex items-start justify-between gap-3 bg-primary text-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-display flex items-center gap-2">
              <Mail size={18} /> Envoyer un e-mail
            </h2>
            <p className="text-white/60 text-sm">
              {recipients.length} destinataire{recipients.length > 1 ? "s" : ""} · expéditeur
              info@darlemploi.dz
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            aria-label="Fermer"
            className="text-white/70 hover:text-white shrink-0 disabled:opacity-30"
          >
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5">
          <Field label="Mode d'envoi">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(
                [
                  {
                    value: "individual" as Mode,
                    title: "Individuel",
                    desc: "Un message par personne, personnalisé. Recommandé.",
                  },
                  {
                    value: "grouped" as Mode,
                    title: "Groupé (Cci)",
                    desc: "Un seul message, destinataires en copie cachée.",
                  },
                ]
              ).map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setMode(o.value)}
                  disabled={sending}
                  className={`text-left rounded-xl border-2 p-3 transition-colors ${
                    mode === o.value
                      ? "border-primary bg-primary/5"
                      : "border-primary/15 hover:border-primary/30"
                  }`}
                >
                  <span className="block text-sm font-bold text-primary">{o.title}</span>
                  <span className="block text-[11px] text-primary/50 mt-0.5">{o.desc}</span>
                </button>
              ))}
            </div>
          </Field>

          {mode === "grouped" && (
            <p className="-mt-2 mb-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3">
              En mode groupé, <strong>{"{{prenom}}"}</strong> ne peut pas être rempli et sera
              supprimé. Les réponses de tous les destinataires arriveront dans le même fil.
            </p>
          )}

          <Field label="Objet">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
              placeholder="Complétez votre profil sur Dar L'Emploi"
              className={input}
            />
          </Field>

          <Field
            label="Message"
            hint="Une ligne vide sépare deux paragraphes. Variables : {{prenom}}, {{nom}}, {{email}}."
          >
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={sending}
              rows={9}
              placeholder={"Bonjour {{prenom}},\n\nVotre profil est presque complet…"}
              className={`${input} resize-y font-mono text-[13px]`}
            />
          </Field>

          <Field label="Bouton (facultatif)">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
                disabled={sending}
                placeholder="Libellé"
                className={input}
              />
              <input
                value={buttonUrl}
                onChange={(e) => setButtonUrl(e.target.value)}
                disabled={sending}
                placeholder="https://www.darlemploi.dz/…"
                className={input}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRESETS.map((p) => (
                <button
                  key={p.url}
                  type="button"
                  disabled={sending}
                  onClick={() => {
                    setButtonLabel(p.label);
                    setButtonUrl(p.url);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-primary/20 text-primary/70 hover:border-primary hover:text-primary"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Essai avant envoi" hint="S'envoie à cette adresse seulement.">
            <div className="flex gap-2">
              <input
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                disabled={sending}
                placeholder="vous@exemple.com"
                className={input}
              />
              <button
                type="button"
                onClick={sendTest}
                disabled={sending || !ready}
                className="shrink-0 px-4 rounded-lg border border-primary/25 text-primary text-sm font-bold hover:bg-primary/5 disabled:opacity-40"
              >
                Tester
              </button>
            </div>
          </Field>

          {sending && mode === "individual" && (
            <div className="mt-4">
              <div className="h-2 rounded-full bg-primary/10 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-primary/50">
                {done} / {recipients.length} envoyés…
              </p>
            </div>
          )}

          {note && (
            <p className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3">
              {note}
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm p-3">
              {error}
            </p>
          )}

          {failures.length > 0 && (
            <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-xs font-black uppercase tracking-widest text-red-500 mb-1">
                Échecs ({failures.length})
              </p>
              <p className="text-[11px] text-red-600 break-all">{failures.join(", ")}</p>
            </div>
          )}
        </div>

        <footer className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 py-4 border-t border-primary/10 bg-white">
          <button
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2.5 rounded-lg border border-primary/20 text-primary text-sm font-bold disabled:opacity-40"
          >
            {finished ? "Fermer" : "Annuler"}
          </button>
          <button
            onClick={send}
            disabled={sending || !ready || finished}
            className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {sending
              ? "Envoi…"
              : `Envoyer à ${recipients.length} compte${recipients.length > 1 ? "s" : ""}`}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default SendEmailModal;
