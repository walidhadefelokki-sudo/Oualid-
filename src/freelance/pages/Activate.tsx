import React, { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import api from "../../services/api";
import freelanceService, { MarketplaceCategory } from "../freelance.service";
import { WILAYAS } from "../../constants";
import { Card, ErrorState, FIELD, Loading, btn } from "../ui";

/**
 * Turning a Dar L'Emploi account into a freelance profile.
 *
 * The specification asks for this in one click from the candidate's CV. It
 * is one click to *fill the form*, not one click to publish: the server
 * returns what it would prefill, this page shows it, and only the values the
 * person confirms are written. A CV is private until its owner says
 * otherwise, and silently promoting it to a public profile would take that
 * decision away from them.
 */

interface Draft {
  alreadyActive: boolean;
  username?: string;
  suggested?: {
    username: string;
    displayName: string;
    title: string | null;
    bio: string | null;
    wilaya: string | null;
    skills: string[];
    linkedin: string | null;
    portfolio: string | null;
  };
  source?: "cv" | "account";
}

const LANGUAGES = [
  { code: "AR", label: "العربية" },
  { code: "FR", label: "Français" },
  { code: "EN", label: "English" },
];

const field = FIELD;

const Activate: React.FC<{ onActivated: () => void }> = ({ onActivated }) => {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [failed, setFailed] = useState(false);

  const [form, setForm] = useState({
    username: "",
    displayName: "",
    title: "",
    bio: "",
    wilaya: "",
    categoryId: "",
    hourlyRate: "",
  });
  const [languages, setLanguages] = useState<string[]>(["FR"]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setFailed(false);
    Promise.all([api.get("/freelance/me/activation"), freelanceService.getCategories()])
      .then(([d, c]) => {
        const data: Draft = d.data.data;
        setDraft(data);
        setCategories(c);
        if (data.suggested) {
          setForm({
            username: data.suggested.username,
            displayName: data.suggested.displayName,
            title: data.suggested.title ?? "",
            bio: data.suggested.bio ?? "",
            wilaya: data.suggested.wilaya ?? "",
            categoryId: "",
            hourlyRate: "",
          });
          setSkills(data.suggested.skills.slice(0, 20));
        }
      })
      .catch(() => setFailed(true));
  };

  useEffect(load, []);

  const addSkill = () => {
    const s = skillDraft.trim();
    if (!s || skills.includes(s) || skills.length >= 20) return;
    setSkills([...skills, s]);
    setSkillDraft("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.displayName.trim()) return setError("Le nom affiché est obligatoire.");
    if (form.username.trim().length < 3)
      return setError("Le nom d'utilisateur doit faire au moins 3 caractères.");

    setSaving(true);
    try {
      await api.post("/freelance/me/activate", {
        ...form,
        hourlyRate: form.hourlyRate ? Number(form.hourlyRate) : undefined,
        categoryId: form.categoryId || undefined,
        languages,
        skills,
      });
      onActivated();
    } catch (err: any) {
      setError(err?.response?.data?.message || "L'activation a échoué.");
    } finally {
      setSaving(false);
    }
  };

  if (failed)
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <ErrorState onRetry={load} />
      </div>
    );

  if (!draft) return <Loading />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-8">
      <h1 className="text-3xl font-bold text-primary sm:text-4xl">Créer votre profil freelance</h1>

      {draft.source === "cv" ? (
        <p className="mt-4 inline-flex items-start gap-2.5 rounded-field bg-tint-blue px-4 py-3.5 text-sm leading-relaxed text-body">
          <Sparkles size={16} className="mt-0.5 shrink-0 text-accent-ink" aria-hidden="true" />
          <span>
            Nous avons prérempli ce formulaire à partir de votre CV Dar L'Emploi. Rien n'est
            publié avant votre validation — modifiez ce que vous voulez.
          </span>
        </p>
      ) : (
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Votre compte Dar L&apos;emploi devient aussi un profil freelance. Vous gardez un seul
          identifiant.
        </p>
      )}

      <Card className="mt-7">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-primary">
            Nom affiché *
          </span>
          <input
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            className={field}
            required
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-primary">
            Adresse de votre page *
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#33465F]/50 shrink-0" dir="ltr">
              /@
            </span>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className={field}
              dir="ltr"
              required
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-primary">
            Titre professionnel
          </span>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Développeur web, graphiste, traducteur…"
            className={field}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-primary">
            Présentation
          </span>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={5}
            className={`${field} resize-y`}
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-primary">
              Catégorie
            </span>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
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
            <span className="mb-2 block text-sm font-bold text-primary">
              Wilaya
            </span>
            {/* A list, not a text box. Buyers filter services, projects and
                freelancers on this field, and the filter compares values
                exactly: "Alger", "alger" and "16 - Alger" typed by three
                freelancers are three different wilayas to the query, so two
                of them never turn up in the results. */}
            <select
              value={form.wilaya}
              onChange={(e) => setForm({ ...form, wilaya: e.target.value })}
              className={field}
            >
              <option value="">—</option>
              {WILAYAS.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
              {/* What the CV suggested may not be one of the listed values.
                  It stays selectable rather than being silently blanked. */}
              {form.wilaya && !WILAYAS.includes(form.wilaya) && (
                <option value={form.wilaya}>{form.wilaya}</option>
              )}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-primary">
            Tarif horaire (DZD)
          </span>
          <input
            type="number"
            min={0}
            value={form.hourlyRate}
            onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
            className={field}
            dir="ltr"
          />
        </label>

        <div>
          <span className="mb-2 block text-sm font-bold text-primary">
            Langues
          </span>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => {
              const on = languages.includes(l.code);
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() =>
                    setLanguages(
                      on ? languages.filter((x) => x !== l.code) : [...languages, l.code]
                    )
                  }
                  aria-pressed={on}
                  className={
                    "min-h-11 rounded-full border-2 px-4 text-sm font-bold transition-colors " +
                    (on
                      ? "border-primary bg-primary text-white"
                      : "border-line text-primary hover:border-primary")
                  }
                >
                  {l.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm font-bold text-primary">
            Compétences
          </span>
          <div className="flex gap-2">
            <input
              value={skillDraft}
              onChange={(e) => setSkillDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              className={field}
            />
            <button
              type="button"
              onClick={addSkill}
              aria-label="Ajouter la compétence"
              className={btn("ghost", "shrink-0 px-5")}
            >
              +
            </button>
          </div>
          {skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSkills(skills.filter((x) => x !== s))}
                  aria-label={`Retirer ${s}`}
                  className="inline-flex items-center rounded-full bg-ground px-3.5 py-2 text-[13px] font-bold text-primary transition-colors hover:bg-tint-red hover:text-danger"
                >
                  {s} ×
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-field bg-tint-red p-3.5 text-sm font-bold text-danger">{error}</p>
        )}

        <button type="submit" disabled={saving} className={btn("accent", "w-full py-4 text-base")}>
          {saving && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          Activer mon profil freelance
        </button>
      </form>
      </Card>
    </div>
  );
};

export default Activate;
