import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, ExternalLink, GripVertical, Loader2, Lock, Plus, Trash2 } from "lucide-react";
import api from "../../../services/api";
import { ErrorState, Loading } from "../../ui";

/**
 * The mini-portfolio editor.
 *
 * Sections are turned on and off and moved; realisations are written here.
 * What the plan does not allow is shown locked rather than hidden, so the
 * difference between the formulas is visible from inside the free one — and
 * the server refuses it either way.
 */

const SECTION_LABEL: Record<string, string> = {
  HEADER: "En-tête",
  ABOUT: "À propos",
  SKILLS: "Compétences",
  FEATURED_PROJECTS: "Réalisations",
  SERVICES: "Services",
  EXPERIENCE: "Expérience",
  EDUCATION: "Formation",
  CERTIFICATES: "Certificats",
  REVIEWS: "Avis",
  CONTACT: "Contact",
};

const TEMPLATES = [
  { id: "default", label: "Classique" },
  { id: "minimal", label: "Minimal" },
  { id: "editorial", label: "Éditorial" },
  { id: "bold", label: "Affirmé" },
];

const COLOURS = ["#173E7D", "#0B1E3D", "#D4AF37", "#F68D58", "#1E7D5A", "#7D1E5A"];

const card = "rounded-2xl border-2 border-[#173E7D]/15 bg-white p-5";
const label = "block text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50 mb-1.5";
const field =
  "w-full rounded-xl border-2 border-[#173E7D]/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#173E7D]";

const PortfolioEditor: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    role: "",
    clientName: "",
    externalUrl: "",
    videoUrl: "",
    tools: "",
  });

  const load = () => {
    setFailed(false);
    api
      .get("/freelance/me/portfolio")
      .then((r) => setData(r.data.data))
      .catch(() => setFailed(true));
  };

  useEffect(load, []);

  const patch = async (body: Record<string, unknown>, message?: string) => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await api.patch("/freelance/me/portfolio", body);
      if (message) setNote(message);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || "L'enregistrement a échoué.");
    } finally {
      setBusy(false);
    }
  };

  const saveSections = async (sections: any[]) => {
    setData({ ...data, sections });
    try {
      await api.put("/freelance/me/portfolio/sections", { sections });
    } catch (e: any) {
      setError(e?.response?.data?.message || "L'enregistrement a échoué.");
      load();
    }
  };

  const move = (index: number, by: number) => {
    const next = [...data.sections];
    const target = index + by;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    saveSections(next);
  };

  const addProject = async () => {
    if (!draft.title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/freelance/me/portfolio/projects", {
        ...draft,
        tools: draft.tools
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setDraft({
        title: "",
        description: "",
        role: "",
        clientName: "",
        externalUrl: "",
        videoUrl: "",
        tools: "",
      });
      setAdding(false);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || "L'ajout a échoué.");
    } finally {
      setBusy(false);
    }
  };

  if (failed) return <ErrorState onRetry={load} />;
  if (!data) return <Loading />;

  const p = data.portfolio;
  const limits = data.limits;
  const full =
    limits.maxProjects !== null && limits.usedProjects >= limits.maxProjects;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-2xl font-display font-bold text-[#173E7D]">Mini portfolio</h1>
        <Link
          to={`/@${data.username}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#173E7D] hover:underline"
        >
          <ExternalLink size={15} />
          <span dir="ltr">/@{data.username}</span>
        </Link>
      </div>

      <div
        className={`${card} mb-5 flex flex-wrap items-center gap-4 ${
          p.published ? "border-emerald-300" : ""
        }`}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50">
            {p.published ? "En ligne" : "Brouillon"}
          </p>
          <p className="text-sm text-[#2B3442]/60">
            {p.published
              ? "Votre page est visible par tout le monde."
              : "Votre page n'est pas encore visible."}
          </p>
        </div>

        {limits.stats !== "none" && (
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50">
              Vues
            </p>
            <p className="text-xl font-display font-bold text-[#173E7D]" dir="ltr">
              {p.views}
            </p>
          </div>
        )}

        <button
          onClick={() => patch({ published: !p.published })}
          disabled={busy}
          className={`ms-auto rounded-full px-5 py-2.5 text-sm font-bold disabled:opacity-40 ${
            p.published
              ? "border-2 border-[#173E7D]/20 text-[#173E7D]"
              : "bg-[#173E7D] text-white"
          }`}
        >
          {p.published ? "Dépublier" : "Publier"}
        </button>
      </div>

      {note && (
        <p className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3">
          {note}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm p-3">
          {error}
        </p>
      )}

      <section className={`${card} mb-5`}>
        <h2 className="font-display font-bold text-[#173E7D] mb-4">Apparence</h2>

        <span className={label}>Modèle</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {TEMPLATES.map((tpl) => {
            const locked = tpl.id !== "default" && !limits.allTemplates;
            return (
              <button
                key={tpl.id}
                onClick={() => !locked && patch({ template: tpl.id })}
                disabled={locked || busy}
                className={`rounded-xl px-3 py-2.5 text-sm font-bold border-2 inline-flex items-center justify-center gap-1.5 ${
                  p.template === tpl.id
                    ? "border-[#173E7D] bg-[#173E7D] text-white"
                    : locked
                      ? "border-[#173E7D]/10 text-[#2B3442]/30"
                      : "border-[#173E7D]/15 text-[#2B3442]/70"
                }`}
              >
                {locked && <Lock size={12} />}
                {tpl.label}
              </button>
            );
          })}
        </div>

        <span className={label}>Couleur d'accent</span>
        <div className="flex flex-wrap gap-2 mb-5">
          {COLOURS.map((c) => (
            <button
              key={c}
              onClick={() => patch({ accentColor: c })}
              disabled={busy}
              aria-label={c}
              className={`w-9 h-9 rounded-full border-4 ${
                p.accentColor === c ? "border-[#173E7D]/40" : "border-transparent"
              }`}
              style={{ background: c }}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className={label}>Titre de la page (SEO)</span>
            <input
              defaultValue={p.seoTitle ?? ""}
              onBlur={(e) => patch({ seoTitle: e.target.value })}
              className={field}
            />
          </label>
          <label className="block">
            <span className={label}>Description (SEO)</span>
            <input
              defaultValue={p.seoDescription ?? ""}
              onBlur={(e) => patch({ seoDescription: e.target.value })}
              className={field}
            />
          </label>
        </div>
      </section>

      <section className={`${card} mb-5`}>
        <h2 className="font-display font-bold text-[#173E7D] mb-1">Sections</h2>
        <p className="text-sm text-[#2B3442]/60 mb-4">
          Activez, désactivez et réordonnez ce qui apparaît sur votre page.
        </p>

        <ul className="space-y-1">
          {data.sections.map((s: any, i: number) => (
            <li
              key={s.type}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[#173E7D]/[0.04]"
            >
              <GripVertical size={15} className="text-[#173E7D]/20 shrink-0" />
              <span className="flex-1 min-w-0 text-sm font-semibold text-[#2B3442]">
                {SECTION_LABEL[s.type] ?? s.type}
              </span>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Monter"
                  className="px-2 text-[#173E7D]/40 hover:text-[#173E7D] disabled:opacity-20"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === data.sections.length - 1}
                  aria-label="Descendre"
                  className="px-2 text-[#173E7D]/40 hover:text-[#173E7D] disabled:opacity-20"
                >
                  ↓
                </button>
                <button
                  onClick={() =>
                    saveSections(
                      data.sections.map((x: any) =>
                        x.type === s.type ? { ...x, visible: !x.visible } : x
                      )
                    )
                  }
                  aria-label={s.visible ? "Masquer" : "Afficher"}
                  className="p-1.5 text-[#173E7D]/50 hover:text-[#173E7D]"
                >
                  {s.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display font-bold text-[#173E7D]">Réalisations</h2>
            <p className="text-sm text-[#2B3442]/60">
              {limits.usedProjects} / {limits.maxProjects ?? "illimité"} · formule{" "}
              {limits.planName}
            </p>
          </div>
          <button
            onClick={() => setAdding((v) => !v)}
            disabled={full}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 bg-[#173E7D] text-white text-sm font-bold disabled:opacity-40"
          >
            <Plus size={15} /> Ajouter
          </button>
        </div>

        {full && (
          <p className="mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">
            Votre formule permet {limits.maxProjects} réalisations. Supprimez-en une ou changez de
            formule.
          </p>
        )}

        {adding && (
          <div className="mb-5 rounded-xl border-2 border-[#173E7D]/15 p-4 space-y-3">
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Titre *"
              className={field}
            />
            <textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={3}
              placeholder="Description"
              className={`${field} resize-y`}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                placeholder="Votre rôle"
                className={field}
              />
              <input
                value={draft.clientName}
                onChange={(e) => setDraft({ ...draft, clientName: e.target.value })}
                placeholder="Client (facultatif)"
                className={field}
              />
              <input
                value={draft.tools}
                onChange={(e) => setDraft({ ...draft, tools: e.target.value })}
                placeholder="Outils, séparés par des virgules"
                className={field}
              />
              <input
                value={draft.externalUrl}
                onChange={(e) => setDraft({ ...draft, externalUrl: e.target.value })}
                placeholder="Lien externe"
                dir="ltr"
                className={field}
              />
            </div>

            <label className="block">
              <span className={label}>
                Vidéo YouTube ou Vimeo {!limits.video && <Lock size={11} className="inline" />}
              </span>
              <input
                value={draft.videoUrl}
                onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })}
                disabled={!limits.video}
                placeholder={
                  limits.video ? "https://youtube.com/…" : "Réservé aux formules Pro et Premium"
                }
                dir="ltr"
                className={field}
              />
            </label>

            <button
              onClick={addProject}
              disabled={busy || !draft.title.trim()}
              className="rounded-xl bg-[#173E7D] text-white font-bold px-6 py-2.5 inline-flex items-center gap-2 disabled:opacity-40"
            >
              {busy && <Loader2 size={15} className="animate-spin" />}
              Enregistrer
            </button>
          </div>
        )}

        {data.projects.length === 0 ? (
          <p className="text-sm text-[#2B3442]/40">Aucune réalisation pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {data.projects.map((pr: any) => (
              <li
                key={pr.id}
                className="flex items-center gap-3 rounded-xl border border-[#173E7D]/10 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#173E7D] break-words">{pr.title}</p>
                  {pr.role && <p className="text-xs text-[#2B3442]/50">{pr.role}</p>}
                </div>

                <button
                  onClick={() =>
                    api
                      .patch(`/freelance/me/portfolio/projects/${pr.id}`, {
                        featured: !pr.featured,
                      })
                      .then(load)
                      .catch((e) =>
                        setError(e?.response?.data?.message || "Échec de la mise à la une.")
                      )
                  }
                  className={`shrink-0 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                    pr.featured
                      ? "bg-[#D4AF37] text-[#0B1E3D]"
                      : "bg-[#173E7D]/8 text-[#173E7D]/60"
                  }`}
                >
                  À la une
                </button>

                <button
                  onClick={() =>
                    window.confirm("Supprimer cette réalisation ?") &&
                    api
                      .delete(`/freelance/me/portfolio/projects/${pr.id}`)
                      .then(load)
                      .catch(() => setError("Échec de la suppression."))
                  }
                  aria-label="Supprimer"
                  className="shrink-0 p-2 text-gray-300 hover:text-red-500"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
};

export default PortfolioEditor;
