import React, { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import api from "../../services/api";
import freelanceService, { MarketplaceCategory } from "../freelance.service";
import { ErrorState, Loading } from "../ui";

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

const field =
  "w-full rounded-xl border-2 border-[#173E7D]/15 bg-white px-4 py-3 outline-none focus:border-[#173E7D]";

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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-display font-bold text-[#173E7D]">
        Créer votre profil freelance
      </h1>

      {draft.source === "cv" ? (
        <p className="mt-2 inline-flex items-start gap-2 rounded-xl bg-[#173E7D]/5 border border-[#173E7D]/15 px-4 py-3 text-sm text-[#2B3442]/80">
          <Sparkles size={16} className="mt-0.5 text-[#D4AF37] shrink-0" />
          <span>
            Nous avons prérempli ce formulaire à partir de votre CV Dar L'Emploi. Rien n'est
            publié avant votre validation — modifiez ce que vous voulez.
          </span>
        </p>
      ) : (
        <p className="mt-2 text-[#2B3442]/60">
          Votre compte Dar L'Emploi devient aussi un profil freelance. Vous gardez un seul
          identifiant.
        </p>
      )}

      <form onSubmit={submit} className="mt-8 space-y-5">
        <label className="block">
          <span className="block text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50 mb-1.5">
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
          <span className="block text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50 mb-1.5">
            Adresse de votre page *
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#2B3442]/50 shrink-0" dir="ltr">
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
          <span className="block text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50 mb-1.5">
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
          <span className="block text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50 mb-1.5">
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
            <span className="block text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50 mb-1.5">
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
            <span className="block text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50 mb-1.5">
              Wilaya
            </span>
            <input
              value={form.wilaya}
              onChange={(e) => setForm({ ...form, wilaya: e.target.value })}
              className={field}
            />
          </label>
        </div>

        <label className="block">
          <span className="block text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50 mb-1.5">
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
          <span className="block text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50 mb-1.5">
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
                  className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-colors ${
                    on
                      ? "border-[#173E7D] bg-[#173E7D] text-white"
                      : "border-[#173E7D]/20 text-[#173E7D]"
                  }`}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="block text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50 mb-1.5">
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
              className="shrink-0 px-5 rounded-xl border-2 border-[#173E7D]/20 font-bold text-[#173E7D]"
            >
              +
            </button>
          </div>
          {skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSkills(skills.filter((x) => x !== s))}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#173E7D]/8 text-[#173E7D] hover:bg-red-50 hover:text-red-600"
                >
                  {s} ×
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm p-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-[#173E7D] text-white font-bold py-4 inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          Activer mon profil freelance
        </button>
      </form>
    </div>
  );
};

export default Activate;
