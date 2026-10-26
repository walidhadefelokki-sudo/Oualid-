import React, { useEffect, useState } from "react";
import { Calendar, Check, Flag, Loader2, Trash2, User, X } from "lucide-react";
import api from "../../services/api";

/**
 * Everything about one task, and the place to change it.
 *
 * The board shows a title and a checkbox because that is what a weekly list
 * is read for. The rest — what the task actually involves, when it is due,
 * how urgent it is, whose it is — lives here, one click away, so the board
 * stays scannable.
 *
 * Saved on demand rather than on every keystroke: a description is written
 * in passes, and a request per character would overwrite a half-typed
 * sentence with an earlier half-typed sentence whenever two landed out of
 * order.
 */

export interface TaskDetail {
  id: string;
  memberId: string;
  title: string;
  note: string | null;
  priority: "LOW" | "NORMAL" | "HIGH";
  dueDate: string | null;
  done: boolean;
  doneAt: string | null;
  weekStart: string;
  createdAt: string;
  member: { id: string; name: string };
  createdBy: { firstName: string | null; lastName: string | null; email: string } | null;
}

interface Member {
  id: string;
  name: string;
  active: boolean;
}

const PRIORITIES = [
  { value: "LOW" as const, label: "Basse", chip: "bg-gray-100 text-gray-600" },
  { value: "NORMAL" as const, label: "Normale", chip: "bg-primary/10 text-primary" },
  { value: "HIGH" as const, label: "Haute", chip: "bg-red-50 text-red-600 border border-red-200" },
];

const label = "block text-[11px] font-black uppercase tracking-widest text-primary/50 mb-1.5";
const field =
  "w-full border-2 border-primary/15 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary";

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const TaskDetailModal: React.FC<{
  taskId: string;
  members: Member[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}> = ({ taskId, members, onClose, onSaved, onDeleted }) => {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [form, setForm] = useState({
    title: "",
    note: "",
    priority: "NORMAL" as TaskDetail["priority"],
    dueDate: "",
    memberId: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/admin/team/tasks/${taskId}`)
      .then((r) => {
        if (cancelled) return;
        const t: TaskDetail = r.data.data.task;
        setTask(t);
        setForm({
          title: t.title,
          note: t.note ?? "",
          priority: t.priority,
          dueDate: t.dueDate ?? "",
          memberId: t.memberId,
        });
      })
      .catch((e) =>
        !cancelled && setError(e?.response?.data?.message || "Échec du chargement.")
      );
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async () => {
    if (!form.title.trim()) return setError("Le titre ne peut pas être vide.");
    setError(null);
    setNote(null);
    setSaving(true);
    try {
      await api.patch(`/admin/team/tasks/${taskId}`, {
        title: form.title,
        note: form.note,
        priority: form.priority,
        dueDate: form.dueDate || null,
        memberId: form.memberId,
      });
      setNote("Enregistré.");
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Supprimer cette tâche ?")) return;
    try {
      await api.delete(`/admin/team/tasks/${taskId}`);
      onDeleted();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Échec de la suppression.");
    }
  };

  /* Compared as plain dates. A deadline passes at the end of its day, so
     comparing to "now" would mark a task due today as late all afternoon. */
  const overdue =
    task && !task.done && form.dueDate && form.dueDate < new Date().toISOString().slice(0, 10);

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg bg-accent rounded-2xl shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
        <header className="flex items-start justify-between gap-3 bg-primary text-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-display">Détails de la tâche</h2>
            {task && (
              <p className="text-white/60 text-xs">
                Semaine du {longDate(task.weekStart)}
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Fermer" className="text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {!task && !error ? (
            <div className="py-12 flex items-center justify-center gap-3 text-primary/50">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm font-semibold">Chargement…</span>
            </div>
          ) : (
            <>
              {task?.done && (
                <p className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3 inline-flex items-center gap-2">
                  <Check size={15} />
                  Terminée {task.doneAt ? `le ${longDate(task.doneAt)}` : ""}
                </p>
              )}

              <label className="block mb-4">
                <span className={label}>Titre</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={field}
                />
              </label>

              <label className="block mb-4">
                <span className={label}>Description</span>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={5}
                  placeholder="Ce qu'il faut faire, les détails utiles, les liens…"
                  className={`${field} resize-y`}
                />
              </label>

              <div className="mb-4">
                <span className={label}>
                  <Flag size={11} className="inline me-1" />
                  Priorité
                </span>
                <div className="flex gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setForm({ ...form, priority: p.value })}
                      className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold border-2 transition-colors ${
                        form.priority === p.value
                          ? "border-primary bg-primary text-white"
                          : "border-primary/15 text-primary/70"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <label className="block">
                  <span className={label}>
                    <Calendar size={11} className="inline me-1" />
                    Échéance
                  </span>
                  <input
                    type="date"
                    dir="ltr"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className={field}
                  />
                  {overdue && (
                    <span className="mt-1 block text-[11px] font-bold text-red-600">
                      En retard
                    </span>
                  )}
                </label>

                <label className="block">
                  <span className={label}>
                    <User size={11} className="inline me-1" />
                    Assignée à
                  </span>
                  <select
                    value={form.memberId}
                    onChange={(e) => setForm({ ...form, memberId: e.target.value })}
                    className={field}
                  >
                    {members
                      .filter((m) => m.active || m.id === task?.memberId)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              {task && (
                <p className="text-[11px] text-primary/40">
                  Créée le {longDate(task.createdAt)}
                  {task.createdBy &&
                    ` par ${
                      [task.createdBy.firstName, task.createdBy.lastName]
                        .filter(Boolean)
                        .join(" ") || task.createdBy.email
                    }`}
                </p>
              )}

              {note && (
                <p className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3">
                  {note}
                </p>
              )}
              {error && (
                <p className="mt-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm p-3">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <footer className="flex flex-col-reverse sm:flex-row sm:items-center gap-2 px-5 py-4 border-t border-primary/10 bg-white">
          <button
            onClick={remove}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-bold"
          >
            <Trash2 size={15} /> Supprimer
          </button>
          <div className="sm:ms-auto flex flex-col-reverse sm:flex-row gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-primary/20 text-primary text-sm font-bold"
            >
              Fermer
            </button>
            <button
              onClick={save}
              disabled={saving || !task}
              className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              Enregistrer
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default TaskDetailModal;
