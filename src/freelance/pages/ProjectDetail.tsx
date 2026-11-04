import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Calendar, Loader2, MapPin, Send, Users } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { ErrorState, Loading, Price } from "../ui";
import ContactButton from "../ContactButton";

/**
 * A project, and the form to answer it.
 *
 * What it costs to answer is shown before the form, not after the refusal:
 * a freelancer on a subscription spends one of their monthly allowance, one
 * on the free plan spends credits, and being told which afterwards is how a
 * balance quietly empties.
 *
 * The server decides again on submission. This only spares the reader a
 * refusal they could have been warned about.
 */

interface Project {
  id: string;
  title: string;
  description: string;
  budgetType: "FIXED" | "HOURLY";
  budgetMin: string | null;
  budgetMax: string | null;
  deadline: string | null;
  remote: boolean;
  wilaya: string | null;
  status: string;
  publishedAt: string | null;
  category: { name: string } | null;
  skills: string[];
  proposalCount: number;
  client: { name: string | null; logoUrl: string | null; memberSince: string };
}

interface Eligibility {
  canPropose: boolean;
  reason:
    | null
    | "no-profile"
    | "already-proposed"
    | "own-project"
    | "closed"
    | "not-invited"
    | "insufficient-credits";
  existing: { id: string; status: string } | null;
  method: "quota" | "credits";
  creditCost: number;
  balance: number;
  proposalsRemaining: number | null;
  planName: string;
}

const field =
  "w-full rounded-xl border-2 border-[#173E7D]/15 bg-white px-4 py-3 outline-none focus:border-[#173E7D]";
const label =
  "block text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50 mb-1.5";

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const ProjectDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { signedIn, loading: authLoading } = useAuth();
  const { t } = useI18n();

  const [project, setProject] = useState<Project | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const [form, setForm] = useState({ coverLetter: "", price: "", deliveryDays: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setFailed(null);
    api
      .get(`/freelance/projects/by-slug/${slug}`)
      .then((r) => setProject(r.data.data.project))
      .catch((e) =>
        setFailed(e?.response?.data?.message || "Ce projet n'est pas disponible.")
      );
  };

  useEffect(load, [slug]);

  // Eligibility needs both the project id and a signed-in freelancer.
  useEffect(() => {
    if (!project || !signedIn) return;
    api
      .get(`/freelance/projects/${project.id}/eligibility`)
      .then((r) => setEligibility(r.data.data))
      .catch(() => setEligibility(null));
  }, [project, signedIn]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const { data } = await api.post("/freelance/me/proposals", {
        projectId: project!.id,
        coverLetter: form.coverLetter,
        price: Number(form.price),
        deliveryDays: Number(form.deliveryDays),
      });
      setSent(
        data.data.charged === "quota"
          ? "Proposition envoyée. Une proposition de votre forfait mensuel a été utilisée."
          : `Proposition envoyée. ${eligibility?.creditCost} crédits débités, solde ${data.data.balance}.`
      );
      setForm({ coverLetter: "", price: "", deliveryDays: "" });
    } catch (err: any) {
      setError(err?.response?.data?.message || "L'envoi a échoué.");
    } finally {
      setSending(false);
    }
  };

  if (failed)
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <ErrorState onRetry={load} />
        <p className="mt-4 text-center text-sm text-[#2B3442]/60">{failed}</p>
      </div>
    );

  if (!project) return <Loading />;

  const blocked: Record<string, string> = {
    "no-profile": "Activez votre profil freelance pour répondre aux projets.",
    "already-proposed": "Vous avez déjà répondu à ce projet.",
    "own-project": "C'est votre projet.",
    closed: "Ce projet n'accepte plus de propositions.",
    "not-invited": "Ce projet est réservé aux freelances invités.",
    "insufficient-credits": `Il vous faut ${eligibility?.creditCost} crédits pour répondre — vous en avez ${eligibility?.balance}.`,
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <article className="rounded-2xl border-2 border-[#173E7D]/15 bg-white p-6">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#173E7D] break-words">
          {project.title}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#2B3442]/60">
          {(project.budgetMin || project.budgetMax) && (
            <span className="font-bold text-[#173E7D]">
              <Price value={project.budgetMin} />
              {project.budgetMax && project.budgetMin !== project.budgetMax && (
                <>
                  {" – "}
                  <Price value={project.budgetMax} />
                </>
              )}
              <span className="ms-1 text-xs font-normal text-[#2B3442]/50">
                {project.budgetType === "HOURLY" ? "/ heure" : "forfait"}
              </span>
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} /> {project.remote ? "À distance" : project.wilaya || "Sur site"}
          </span>
          {project.deadline && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} /> {longDate(project.deadline)}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Users size={14} /> {project.proposalCount} proposition
            {project.proposalCount > 1 ? "s" : ""}
          </span>
        </div>

        <p className="mt-5 whitespace-pre-wrap break-words text-[#2B3442]/80 leading-relaxed">
          {project.description}
        </p>

        {project.skills.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {project.skills.map((s) => (
              <span
                key={s}
                className="text-xs font-semibold px-3 py-1 rounded-full bg-[#173E7D]/8 text-[#173E7D]"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        <footer className="mt-6 pt-5 border-t border-[#173E7D]/10 text-sm text-[#2B3442]/60">
          Publié par <strong className="text-[#173E7D]">{project.client.name ?? "—"}</strong>
          {project.publishedAt && ` · ${longDate(project.publishedAt)}`}
        </footer>
      </article>

      <section className="mt-6 rounded-2xl border-2 border-[#173E7D]/15 bg-white p-6">
        <h2 className="text-lg font-display font-bold text-[#173E7D]">Répondre à ce projet</h2>

        {authLoading ? (
          <Loading />
        ) : !signedIn ? (
          <>
            <p className="mt-2 text-sm text-[#2B3442]/60">
              Connectez-vous pour envoyer une proposition.
            </p>
            <Link
              to={`/connexion?next=${encodeURIComponent(`/projet/${slug}`)}`}
              className="inline-block mt-4 rounded-full px-6 py-3 bg-[#173E7D] text-white font-bold"
            >
              {t("nav.signin")}
            </Link>
          </>
        ) : sent ? (
          <>
            <p className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-4">
              {sent}
            </p>
            {/* Only now. The proposal has been charged, and paying for it is
                what earns a line to the client — see clientBehindProject. */}
            <ContactButton
              projectId={project.id}
              label="Discuter avec le client"
              className="mt-4 sm:max-w-xs"
            />
          </>
        ) : !eligibility ? (
          <Loading />
        ) : !eligibility.canPropose ? (
          <>
            <p className="mt-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4">
              {blocked[eligibility.reason ?? ""] ?? "Vous ne pouvez pas répondre à ce projet."}
            </p>
            {eligibility.reason === "no-profile" && (
              <Link
                to="/freelance-espace"
                className="inline-block mt-4 rounded-full px-6 py-3 bg-[#173E7D] text-white font-bold"
              >
                Activer mon profil
              </Link>
            )}
            {eligibility.reason === "insufficient-credits" && (
              <Link
                to="/tarifs"
                className="inline-block mt-4 rounded-full px-6 py-3 bg-[#D4AF37] text-[#0B1E3D] font-bold"
              >
                Acheter des crédits
              </Link>
            )}
            {/* Already answered on an earlier visit: the thread is theirs. */}
            {eligibility.reason === "already-proposed" && (
              <ContactButton
                projectId={project.id}
                label="Discuter avec le client"
                className="mt-4 sm:max-w-xs"
              />
            )}
          </>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            {/* Said before the form, not after the refusal. */}
            <p className="rounded-xl bg-[#173E7D]/5 border border-[#173E7D]/15 text-sm text-[#2B3442]/80 p-3">
              {eligibility.method === "quota"
                ? `Cette proposition utilise 1 de vos ${eligibility.proposalsRemaining} propositions restantes (${eligibility.planName}).`
                : `Cette proposition coûte ${eligibility.creditCost} crédits. Solde : ${eligibility.balance}.`}
            </p>

            <label className="block">
              <span className={label}>Lettre de motivation *</span>
              <textarea
                value={form.coverLetter}
                onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
                rows={7}
                placeholder="Pourquoi vous, comment vous comptez procéder, ce que vous avez déjà fait de comparable…"
                className={`${field} resize-y`}
                required
              />
              <span className="mt-1 block text-[11px] text-[#2B3442]/40">
                40 caractères minimum · {form.coverLetter.trim().length} écrits.
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className={label}>Votre prix (DZD) *</span>
                <input
                  type="number"
                  min={1}
                  dir="ltr"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className={field}
                  required
                />
              </label>
              <label className="block">
                <span className={label}>Délai (jours) *</span>
                <input
                  type="number"
                  min={1}
                  dir="ltr"
                  value={form.deliveryDays}
                  onChange={(e) => setForm({ ...form, deliveryDays: e.target.value })}
                  className={field}
                  required
                />
              </label>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm p-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="rounded-xl bg-[#173E7D] text-white font-bold px-7 py-3 inline-flex items-center gap-2 disabled:opacity-40"
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Envoyer ma proposition
            </button>
          </form>
        )}
      </section>
    </div>
  );
};

export default ProjectDetail;
