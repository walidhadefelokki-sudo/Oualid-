import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Send } from "lucide-react";
import api from "../../../services/api";
import freelanceService, { MarketplaceCategory } from "../../freelance.service";
import { ErrorState, Loading } from "../../ui";

/**
 * Publishing a project, for a client.
 *
 * Free, and it says so: a client arriving from the recruitment side has just
 * been asked to pay for job offers, and the difference should not be a
 * surprise they discover at the end.
 *
 * Like the service editor, the draft row exists before the form opens, so a
 * retried first save cannot leave two projects behind.
 */

const field =
  "w-full rounded-xl border-2 border-[#173E7D]/15 bg-white px-4 py-3 outline-none focus:border-[#173E7D]";
const label =
  "block text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50 mb-1.5";
const card = "rounded-2xl border-2 border-[#173E7D]/15 bg-white p-5";

const ProjectEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [projectId, setProjectId] = useState<string | null>(id ?? null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [status, setStatus] = useState("DRAFT");
  const [rejection, setRejection] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    budgetType: "FIXED",
    budgetMin: "",
    budgetMax: "",
    deadline: "",
    remote: true,
    wilaya: "",
    visibility: "PUBLIC",
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const cats = await freelanceService.getCategories();
        if (!cancelled) setCategories(cats);

        let current = id;
        if (!current) {
          const { data } = await api.post("/freelance/me/projects", {});
          current = data.data.id;
          if (!cancelled) setProjectId(current!);
          navigate(`/client/projets/${current}`, { replace: true });
        }

        const { data } = await api.get(`/freelance/me/projects/${current}`);
        if (cancelled) return;

        const p = data.data.project;
        setStatus(p.status);
        setRejection(p.rejectionReason);
        setSkills(p.skills ?? []);
        setForm({
          title: p.title === "Nouveau projet" ? "" : p.title,
          description: p.description ?? "",
          categoryId: p.categoryId ?? "",
          budgetType: p.budgetType ?? "FIXED",
          budgetMin: p.budgetMin != null ? String(p.budgetMin) : "",
          budgetMax: p.budgetMax != null ? String(p.budgetMax) : "",
          deadline: p.deadline ? String(p.deadline).slice(0, 10) : "",
          remote: p.remote ?? true,
          wilaya: p.wilaya ?? "",
          visibility: p.visibility ?? "PUBLIC",
        });
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
    budgetMin: form.budgetMin === "" ? null : form.budgetMin,
    budgetMax: form.budgetMax === "" ? null : form.budgetMax,
    deadline: form.deadline || null,
    skills,
  });

  const save = async () => {
    setError(null);
    setNote(null);
    setSaving(true);
    try {
      await api.patch(`/freelance/me/projects/${projectId}`, payload());
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
      await api.patch(`/freelance/me/projects/${projectId}`, payload());
      await api.post(`/freelance/me/projects/${projectId}/submit`);
      setStatus("PENDING");
      setNote("Envoyé en validation. Votre projet sera visible après vérification.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "L'envoi a échoué.");
    } finally {
      setSubmitting(false);
    }
  };

  if (failed) return <ErrorState />;
  if (loading) return <Loading />;

  const locked = status === "PENDING";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
        <h1 className="text-2xl font-display font-bold text-[#173E7D]">
          {id ? "Modifier le projet" : "Publier un projet"}
        </h1>
        <span className="text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
          Gratuit
        </span>
      </div>

      {rejection && (
        <p className="mb-5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-4">
          <strong>Refusé :</strong> {rejection}
        </p>
      )}
      {locked && (
        <p className="mb-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4">
          Ce projet est en cours de validation et ne peut pas être modifié.
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
              placeholder="Refonte du site web de notre agence"
              className={field}
            />
          </label>

          <label className="block mb-4">
            <span className={label}>Description *</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              disabled={locked}
              rows={8}
              placeholder="Ce que vous attendez, le contexte, les contraintes…"
              className={`${field} resize-y`}
            />
            <span className="mt-1 block text-[11px] text-[#2B3442]/40">
              60 caractères minimum · {form.description.trim().length} écrits.
            </span>
          </label>

          <label className="block">
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
        </div>

        <div className={card}>
          <span className={label}>Budget *</span>
          <div className="flex gap-2 mb-4">
            {[
              { v: "FIXED", l: "Forfait" },
              { v: "HOURLY", l: "Horaire" },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setForm({ ...form, budgetType: o.v })}
                disabled={locked}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold border-2 ${
                  form.budgetType === o.v
                    ? "border-[#173E7D] bg-[#173E7D] text-white"
                    : "border-[#173E7D]/15 text-[#2B3442]/70"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className={label}>Minimum (DZD)</span>
              <input
                type="number"
                min={0}
                dir="ltr"
                value={form.budgetMin}
                onChange={(e) => setForm({ ...form, budgetMin: e.target.value })}
                disabled={locked}
                className={field}
              />
            </label>
            <label className="block">
              <span className={label}>Maximum (DZD)</span>
              <input
                type="number"
                min={0}
                dir="ltr"
                value={form.budgetMax}
                onChange={(e) => setForm({ ...form, budgetMax: e.target.value })}
                disabled={locked}
                className={field}
              />
            </label>
          </div>

          <label className="block mt-4">
            <span className={label}>Échéance</span>
            <input
              type="date"
              dir="ltr"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              disabled={locked}
              className={field}
            />
          </label>
        </div>

        <div className={card}>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-[#2B3442]">
              <input
                type="checkbox"
                checked={form.remote}
                onChange={(e) => setForm({ ...form, remote: e.target.checked })}
                disabled={locked}
                className="w-4 h-4 accent-[#173E7D]"
              />
              À distance
            </label>
          </div>

          {!form.remote && (
            <label className="block mt-4">
              <span className={label}>Wilaya</span>
              <input
                value={form.wilaya}
                onChange={(e) => setForm({ ...form, wilaya: e.target.value })}
                disabled={locked}
                className={field}
              />
            </label>
          )}

          <label className="block mt-4">
            <span className={label}>Visibilité</span>
            <select
              value={form.visibility}
              onChange={(e) => setForm({ ...form, visibility: e.target.value })}
              disabled={locked}
              className={field}
            >
              <option value="PUBLIC">Public — tous les freelances peuvent répondre</option>
              <option value="INVITE_ONLY">Sur invitation uniquement</option>
            </select>
          </label>
        </div>

        <div className={card}>
          <span className={label}>Compétences recherchées</span>
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
            disabled={locked || submitting}
            className="rounded-xl bg-[#173E7D] text-white font-bold px-7 py-3 inline-flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Publier le projet
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectEditor;
