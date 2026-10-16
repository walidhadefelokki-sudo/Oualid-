import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Plus, Send, Trash2 } from "lucide-react";
import api from "../../../services/api";
import freelanceService, { MarketplaceCategory } from "../../freelance.service";
import { ErrorState, Loading } from "../../ui";
import { useWorkspaceContext } from "../../useWorkspace";

/**
 * The service editor.
 *
 * Three formulas, as the specification sets out: Basique, Standard,
 * Premium. Only the ones given a price are saved, because most freelancers
 * sell one thing at one price and should not have to invent two more.
 *
 * Saving and submitting are separate actions. A draft may be incomplete —
 * that is what makes it a draft — and the completeness rules apply at
 * submission, where the credits are taken.
 */

const TIERS = [
  { tier: "BASIC", label: "Basique" },
  { tier: "STANDARD", label: "Standard" },
  { tier: "PREMIUM", label: "Premium" },
] as const;

interface PackageForm {
  tier: "BASIC" | "STANDARD" | "PREMIUM";
  name: string;
  description: string;
  price: string;
  deliveryDays: string;
  revisions: string;
  features: string;
}

const emptyPackage = (tier: PackageForm["tier"], label: string): PackageForm => ({
  tier,
  name: label,
  description: "",
  price: "",
  deliveryDays: "7",
  revisions: "1",
  features: "",
});

const field =
  "w-full rounded-xl border-2 border-[#173E7D]/15 bg-white px-4 py-3 outline-none focus:border-[#173E7D]";
const label =
  "block text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50 mb-1.5";
const card = "rounded-2xl border-2 border-[#173E7D]/15 bg-white p-5";

const ServiceEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: ws, reload } = useWorkspaceContext();

  const [serviceId, setServiceId] = useState<string | null>(id ?? null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [status, setStatus] = useState("DRAFT");
  const [rejection, setRejection] = useState<string | null>(null);

  const [form, setForm] = useState({ title: "", description: "", categoryId: "" });
  const [packages, setPackages] = useState<PackageForm[]>(
    TIERS.map((t) => emptyPackage(t.tier, t.label))
  );
  const [activeTier, setActiveTier] = useState<PackageForm["tier"]>("BASIC");
  const [faqs, setFaqs] = useState<Array<{ question: string; answer: string }>>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const costs = ws.wallet!.costs;
  const balance = ws.wallet!.balance;
  const entitlements = ws.entitlements;

  /* A brand-new service gets its draft row before the form opens, so every
   * later save is an update and there is no "created twice" case to handle
   * if the first save is retried. */
  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const cats = await freelanceService.getCategories();
        if (!cancelled) setCategories(cats);

        let current = id;
        if (!current) {
          const { data } = await api.post("/freelance/me/services", {});
          current = data.data.id;
          if (!cancelled) setServiceId(current!);
          // Replaces the URL so a refresh reopens this draft instead of
          // creating another one.
          navigate(`/freelance-espace/services/${current}`, { replace: true });
        }

        const { data } = await api.get(`/freelance/me/services/${current}`);
        if (cancelled) return;

        const s = data.data.service;
        setStatus(s.status);
        setRejection(s.rejectionReason);
        setForm({
          title: s.title === "Nouveau service" ? "" : s.title,
          description: s.description ?? "",
          categoryId: s.categoryId ?? "",
        });
        setSkills(s.skills ?? []);
        setFaqs(s.faqs?.map((f: any) => ({ question: f.question, answer: f.answer })) ?? []);

        if (s.packages?.length) {
          setPackages(
            TIERS.map((t) => {
              const found = s.packages.find((p: any) => p.tier === t.tier);
              return found
                ? {
                    tier: t.tier,
                    name: found.name ?? t.label,
                    description: found.description ?? "",
                    price: String(found.price ?? ""),
                    deliveryDays: String(found.deliveryDays ?? 7),
                    revisions: String(found.revisions ?? 0),
                    features: (found.features ?? []).join("\n"),
                  }
                : emptyPackage(t.tier, t.label);
            })
          );
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    start();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const payload = () => ({
    ...form,
    categoryId: form.categoryId || null,
    skills,
    faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()),
    packages: packages
      .filter((p) => p.price !== "")
      .map((p) => ({
        tier: p.tier,
        name: p.name,
        description: p.description,
        price: p.price,
        deliveryDays: p.deliveryDays,
        revisions: p.revisions,
        features: p.features.split("\n").map((f) => f.trim()).filter(Boolean),
      })),
  });

  const save = async () => {
    setError(null);
    setNote(null);
    setSaving(true);
    try {
      await api.patch(`/freelance/me/services/${serviceId}`, payload());
      setNote("Brouillon enregistré.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "L'enregistrement a échoué.");
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    setError(null);
    setNote(null);
    setSubmitting(true);
    try {
      // Saved first, so the version reviewed is the one on screen.
      await api.patch(`/freelance/me/services/${serviceId}`, payload());
      const { data } = await api.post(`/freelance/me/services/${serviceId}/submit`);
      setStatus("PENDING");
      setNote(
        data.data.charged
          ? `Envoyé en validation. ${costs.servicePublication} crédits débités, solde ${data.data.balance}.`
          : "Envoyé en validation."
      );
      await reload();
    } catch (err: any) {
      setError(err?.response?.data?.message || "L'envoi a échoué.");
    } finally {
      setSubmitting(false);
    }
  };

  if (failed) return <ErrorState />;
  if (loading) return <Loading />;

  const pkg = packages.find((p) => p.tier === activeTier)!;
  const setPkg = (patch: Partial<PackageForm>) =>
    setPackages(packages.map((p) => (p.tier === activeTier ? { ...p, ...patch } : p)));

  const locked = status === "PENDING";
  const cannotAfford = balance < costs.servicePublication;
  const noSlot = entitlements && !entitlements.canPublishService;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
        <h1 className="text-2xl font-display font-bold text-[#173E7D]">
          {id ? "Modifier le service" : "Nouveau service"}
        </h1>
        <span className="text-sm text-[#2B3442]/50">
          Publication : {costs.servicePublication} crédits · {costs.serviceDurationDays} jours
        </span>
      </div>

      {rejection && (
        <p className="mb-5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-4">
          <strong>Refusé par la modération :</strong> {rejection}
        </p>
      )}

      {locked && (
        <p className="mb-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4">
          Ce service est en cours de validation et ne peut pas être modifié.
        </p>
      )}

      <div className="space-y-5">
        <div className={card}>
          <label className="block mb-4">
            <span className={label}>Titre *</span>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              disabled={locked}
              placeholder="Je crée un site vitrine responsive pour votre entreprise"
              className={field}
            />
            <span className="mt-1 block text-[11px] text-[#2B3442]/40">
              10 caractères minimum.
            </span>
          </label>

          <label className="block mb-4">
            <span className={label}>Catégorie</span>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              disabled={locked}
              className={field}
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={label}>Description *</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              disabled={locked}
              rows={8}
              className={`${field} resize-y`}
            />
            <span className="mt-1 block text-[11px] text-[#2B3442]/40">
              60 caractères minimum · {form.description.trim().length} écrits.
            </span>
          </label>
        </div>

        <div className={card}>
          <h2 className="font-display font-bold text-[#173E7D] mb-1">Formules</h2>
          <p className="text-sm text-[#2B3442]/50 mb-4">
            Remplissez au moins une formule. Celles laissées sans prix ne sont pas publiées.
          </p>

          <div className="flex gap-1 mb-5">
            {TIERS.map((t) => {
              const filled = packages.find((p) => p.tier === t.tier)!.price !== "";
              return (
                <button
                  key={t.tier}
                  type="button"
                  onClick={() => setActiveTier(t.tier)}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-bold border-2 transition-colors ${
                    activeTier === t.tier
                      ? "border-[#173E7D] bg-[#173E7D] text-white"
                      : "border-[#173E7D]/15 text-[#2B3442]/70"
                  }`}
                >
                  {t.label}
                  {filled && <span className="ms-1.5 text-[#D4AF37]">•</span>}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="block">
              <span className={label}>Prix (DZD)</span>
              <input
                type="number"
                min={0}
                dir="ltr"
                value={pkg.price}
                onChange={(e) => setPkg({ price: e.target.value })}
                disabled={locked}
                className={field}
              />
            </label>
            <label className="block">
              <span className={label}>Délai (jours)</span>
              <input
                type="number"
                min={1}
                dir="ltr"
                value={pkg.deliveryDays}
                onChange={(e) => setPkg({ deliveryDays: e.target.value })}
                disabled={locked}
                className={field}
              />
            </label>
            <label className="block">
              <span className={label}>Révisions</span>
              <input
                type="number"
                min={0}
                dir="ltr"
                value={pkg.revisions}
                onChange={(e) => setPkg({ revisions: e.target.value })}
                disabled={locked}
                className={field}
              />
            </label>
          </div>

          <label className="block mt-4">
            <span className={label}>Ce qui est inclus (une ligne par élément)</span>
            <textarea
              value={pkg.features}
              onChange={(e) => setPkg({ features: e.target.value })}
              disabled={locked}
              rows={4}
              className={`${field} resize-y`}
            />
          </label>
        </div>

        <div className={card}>
          <span className={label}>Compétences</span>
          <div className="flex gap-2">
            <input
              value={skillDraft}
              onChange={(e) => setSkillDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const s = skillDraft.trim();
                  if (s && !skills.includes(s) && skills.length < 15) setSkills([...skills, s]);
                  setSkillDraft("");
                }
              }}
              disabled={locked}
              className={field}
            />
          </div>
          {skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSkills(skills.filter((x) => x !== s))}
                  disabled={locked}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#173E7D]/8 text-[#173E7D] hover:bg-red-50 hover:text-red-600"
                >
                  {s} ×
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={card}>
          <div className="flex items-center justify-between mb-3">
            <span className={`${label} mb-0`}>Questions fréquentes</span>
            <button
              type="button"
              onClick={() => setFaqs([...faqs, { question: "", answer: "" }])}
              disabled={locked || faqs.length >= 15}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#173E7D] disabled:opacity-40"
            >
              <Plus size={15} /> Ajouter
            </button>
          </div>

          {faqs.length === 0 ? (
            <p className="text-sm text-[#2B3442]/40">Aucune question pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <input
                      value={f.question}
                      onChange={(e) =>
                        setFaqs(faqs.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))
                      }
                      placeholder="Question"
                      disabled={locked}
                      className={field}
                    />
                    <textarea
                      value={f.answer}
                      onChange={(e) =>
                        setFaqs(faqs.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))
                      }
                      placeholder="Réponse"
                      rows={2}
                      disabled={locked}
                      className={`${field} resize-y`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setFaqs(faqs.filter((_, j) => j !== i))}
                    disabled={locked}
                    aria-label="Supprimer"
                    className="shrink-0 self-start p-2.5 rounded-lg border border-red-200 text-red-500"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {note && (
          <p className="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3">
            {note}
          </p>
        )}
        {error && (
          <p className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm p-3">
            {error}
          </p>
        )}

        {/* Said before the button is pressed, rather than after the request
            comes back refused. The server checks both regardless. */}
        {!locked && noSlot && (
          <p className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">
            Votre formule n'autorise pas de service supplémentaire en ligne. Mettez-en un en pause
            ou changez de formule.
          </p>
        )}
        {!locked && cannotAfford && (
          <p className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">
            Il vous faut {costs.servicePublication} crédits pour publier — vous en avez {balance}.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={save}
            disabled={locked || saving}
            className="rounded-xl border-2 border-[#173E7D]/20 text-[#173E7D] font-bold px-7 py-3 inline-flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {saving && <Loader2 size={15} className="animate-spin" />}
            Enregistrer le brouillon
          </button>

          <button
            onClick={submit}
            disabled={locked || submitting || cannotAfford || !!noSlot}
            className="rounded-xl bg-[#173E7D] text-white font-bold px-7 py-3 inline-flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
            Envoyer en validation ({costs.servicePublication} crédits)
          </button>
        </div>
      </div>
    </>
  );
};

export default ServiceEditor;
