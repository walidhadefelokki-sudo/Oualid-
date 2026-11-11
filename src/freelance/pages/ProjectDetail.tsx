import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Calendar, Loader2, MapPin, Send, Users } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { Card, Chip, ErrorState, FIELD, HINT, LABEL, Loading, Price, btn } from "../ui";
import ContactButton from "../ContactButton";

/**
 * A project, and the form to answer it.
 *
 * What it costs to answer is shown before the form, not after the refusal:
 * a freelancer on a subscription spends one of their monthly allowance, one
 * on the free plan spends credits, and being told which afterwards is how a
 * balance quietly empties. The canvas puts the same figure on the send
 * button itself, which is where somebody about to click reads it.
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
      .catch((e) => setFailed(e?.response?.data?.message || "Ce projet n'est pas disponible."));
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
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState onRetry={load} message={failed} />
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
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-8 sm:px-8 sm:py-10">
      {/* ---------------------------- the project ---------------------- */}
      <Card as="article" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="min-w-0 flex-1 break-words text-2xl font-bold leading-snug text-primary sm:text-3xl">
            {project.title}
          </h1>

          {(project.budgetMin || project.budgetMax) && (
            <span className="whitespace-nowrap text-lg font-bold text-primary">
              <Price value={project.budgetMin} />
              {project.budgetMax && project.budgetMin !== project.budgetMax && (
                <>
                  {" – "}
                  <Price value={project.budgetMax} />
                </>
              )}
              <span className="ms-1.5 text-[13px] font-normal text-muted">
                {project.budgetType === "HOURLY" ? "/ heure" : "forfait"}
              </span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} aria-hidden="true" />{" "}
            {project.remote ? t("home.remote") : project.wilaya || "Sur site"}
          </span>
          {project.deadline && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} aria-hidden="true" /> {longDate(project.deadline)}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Users size={14} aria-hidden="true" /> {project.proposalCount}{" "}
            {t("project.proposals")}
          </span>
          {project.category && <span>{project.category.name}</span>}
        </div>

        <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-body">
          {project.description}
        </p>

        {project.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {project.skills.map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
          </div>
        )}

        <footer className="border-t border-line-soft pt-4 text-sm text-muted">
          Publié par <b className="text-primary">{project.client.name ?? "—"}</b>
          {project.publishedAt && ` · ${longDate(project.publishedAt)}`}
        </footer>
      </Card>

      {/* ---------------------------- the answer ----------------------- */}
      <Card as="section" className="flex flex-col gap-4">
        <h2 className="text-xl font-bold text-primary">Répondre à ce projet</h2>

        {authLoading ? (
          <Loading />
        ) : !signedIn ? (
          <>
            <p className="text-[15px] text-muted">Connectez-vous pour envoyer une proposition.</p>
            <Link
              to={`/connexion?next=${encodeURIComponent(`/projet/${slug}`)}`}
              className={btn("primary", "self-start")}
            >
              {t("nav.signin")}
            </Link>
          </>
        ) : sent ? (
          <>
            <p className="rounded-field bg-tint-green p-4 text-sm leading-relaxed font-bold text-success">
              {sent}
            </p>
            {/* Only now. The proposal has been charged, and paying for it is
                what earns a line to the client — see clientBehindProject. */}
            <ContactButton
              projectId={project.id}
              label="Discuter avec le client"
              className="sm:max-w-xs"
            />
          </>
        ) : !eligibility ? (
          <Loading />
        ) : !eligibility.canPropose ? (
          <>
            <p className="rounded-field bg-tint-orange p-4 text-sm leading-relaxed text-warn">
              {blocked[eligibility.reason ?? ""] ?? "Vous ne pouvez pas répondre à ce projet."}
            </p>
            {eligibility.reason === "no-profile" && (
              <Link to="/freelance-espace" className={btn("primary", "self-start")}>
                Activer mon profil
              </Link>
            )}
            {eligibility.reason === "insufficient-credits" && (
              <Link to="/acheter-credits" className={btn("accent", "self-start")}>
                {t("pricing.buyCredits")}
              </Link>
            )}
            {/* Already answered on an earlier visit: the thread is theirs. */}
            {eligibility.reason === "already-proposed" && (
              <ContactButton
                projectId={project.id}
                label="Discuter avec le client"
                className="sm:max-w-xs"
              />
            )}
          </>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            {/* Said before the form, not after the refusal. */}
            <p className="rounded-field bg-tint-blue p-3.5 text-sm leading-relaxed text-body">
              {eligibility.method === "quota"
                ? `Cette proposition utilise 1 de vos ${eligibility.proposalsRemaining} propositions restantes (${eligibility.planName}).`
                : `Cette proposition coûte ${eligibility.creditCost} ${t("ws.credits")}. Solde : ${eligibility.balance}.`}
            </p>

            <label className={LABEL}>
              Lettre de motivation *
              <textarea
                value={form.coverLetter}
                onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
                rows={7}
                placeholder="Pourquoi vous, comment vous comptez procéder, ce que vous avez déjà fait de comparable…"
                className={FIELD + " resize-y"}
                required
              />
              <span className={HINT}>
                40 caractères minimum · {form.coverLetter.trim().length} écrits.
              </span>
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className={LABEL}>
                Votre prix (DZD) *
                <input
                  type="number"
                  min={1}
                  dir="ltr"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className={FIELD}
                  required
                />
              </label>
              <label className={LABEL}>
                Délai (jours) *
                <input
                  type="number"
                  min={1}
                  dir="ltr"
                  value={form.deliveryDays}
                  onChange={(e) => setForm({ ...form, deliveryDays: e.target.value })}
                  className={FIELD}
                  required
                />
              </label>
            </div>

            {error && (
              <p className="rounded-field bg-tint-red p-3.5 text-sm font-bold text-danger">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
              <span className="text-sm text-muted">
                {eligibility.method === "quota"
                  ? `${eligibility.proposalsRemaining} propositions restantes`
                  : `Solde après envoi : ${eligibility.balance - eligibility.creditCost}`}
              </span>

              {/* The cost is on the button, as the canvas has it: the last
                  thing read before the click is what the click costs. */}
              <button type="submit" disabled={sending} className={btn("accent")}>
                {sending ? (
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Send size={15} aria-hidden="true" />
                )}
                {eligibility.method === "quota"
                  ? "Envoyer ma proposition"
                  : `Envoyer · ${eligibility.creditCost} ${t("ws.credits")}`}
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
};

export default ProjectDetail;
