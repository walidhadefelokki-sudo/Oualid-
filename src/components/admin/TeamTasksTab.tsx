import React, { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CornerDownRight,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import api from "../../services/api";

/**
 * The team's weekly to-do board.
 *
 * One column per person, one week at a time. A week is identified by its
 * Monday, which is what the server stores, so the browser never has to
 * decide what "this week" means.
 *
 * Ticking a box saves immediately and updates the row in place rather than
 * reloading the board. Reloading would reorder the column under the cursor —
 * done tasks sort last — and the next click would land on a different task.
 */

interface Member {
  id: string;
  name: string;
  role: string | null;
  active: boolean;
  position: number;
}

interface Task {
  id: string;
  memberId: string;
  title: string;
  note: string | null;
  done: boolean;
  doneAt: string | null;
  position: number;
}

interface Column {
  member: Member;
  tasks: Task[];
  total: number;
  done: number;
}

interface Board {
  weekStart: string;
  columns: Column[];
  total: number;
  done: number;
}

/** Monday of the current week, as YYYY-MM-DD. */
const thisMonday = (): string => {
  const d = new Date();
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  utc.setUTCDate(utc.getUTCDate() - ((utc.getUTCDay() + 6) % 7));
  return utc.toISOString().slice(0, 10);
};

const shift = (week: string, days: number): string => {
  const d = new Date(`${week}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** "lundi 26 oct. — dimanche 1 nov." */
const weekLabel = (week: string): string => {
  const start = new Date(`${week}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  return `${fmt(start)} — ${fmt(end)}`;
};

const TeamTasksTab: React.FC = () => {
  const [week, setWeek] = useState(thisMonday);
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [addingMember, setAddingMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: "", role: "" });

  const load = (w = week) => {
    setError(null);
    api
      .get("/admin/team/board", { params: { week: w } })
      .then((r) => setBoard(r.data.data))
      .catch((e) => setError(e?.response?.data?.message || e?.message || "Échec du chargement"));
  };

  useEffect(() => {
    load(week);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week]);

  /* Updated in place. Reloading would re-sort the column — done tasks move to
     the bottom — and the next click would hit a different task. */
  const toggle = async (task: Task) => {
    const next = !task.done;
    setBoard((b) =>
      b
        ? {
            ...b,
            done: b.done + (next ? 1 : -1),
            columns: b.columns.map((c) =>
              c.member.id !== task.memberId
                ? c
                : {
                    ...c,
                    done: c.done + (next ? 1 : -1),
                    tasks: c.tasks.map((t) => (t.id === task.id ? { ...t, done: next } : t)),
                  }
            ),
          }
        : b
    );

    try {
      await api.patch(`/admin/team/tasks/${task.id}`, { done: next });
    } catch (e: any) {
      setError(e?.response?.data?.message || "Échec de l'enregistrement.");
      load();
    }
  };

  const addTask = async (memberId: string) => {
    const title = (draft[memberId] ?? "").trim();
    if (!title) return;
    setDraft({ ...draft, [memberId]: "" });

    try {
      await api.post("/admin/team/tasks", { memberId, title, week });
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Échec de l'ajout.");
    }
  };

  const removeTask = async (id: string) => {
    try {
      await api.delete(`/admin/team/tasks/${id}`);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Échec de la suppression.");
    }
  };

  const addMember = async () => {
    if (!memberForm.name.trim()) return;
    try {
      await api.post("/admin/team/members", memberForm);
      setMemberForm({ name: "", role: "" });
      setAddingMember(false);
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Échec de l'ajout du membre.");
    }
  };

  const carryOver = async () => {
    if (
      !window.confirm(
        "Copier les tâches non terminées de cette semaine vers la semaine suivante ?"
      )
    )
      return;

    setBusy(true);
    try {
      const { data } = await api.post("/admin/team/carry-over", { week });
      setWeek(data.data.weekStart);
      setError(
        data.data.copied === 0
          ? "Rien à reporter : tout est terminé."
          : null
      );
    } catch (e: any) {
      setError(e?.response?.data?.message || "Échec du report.");
    } finally {
      setBusy(false);
    }
  };

  const isCurrentWeek = week === thisMonday();
  const pct = board && board.total > 0 ? Math.round((board.done / board.total) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl font-display">Tâches d'équipe</h1>

        <div className="flex items-center gap-1 ms-auto">
          <button
            onClick={() => setWeek(shift(week, -7))}
            aria-label="Semaine précédente"
            className="p-2 rounded-lg border border-primary/20 text-primary/70 hover:text-primary"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="px-3 text-sm font-bold text-primary whitespace-nowrap">
            {weekLabel(week)}
          </span>
          <button
            onClick={() => setWeek(shift(week, 7))}
            aria-label="Semaine suivante"
            className="p-2 rounded-lg border border-primary/20 text-primary/70 hover:text-primary"
          >
            <ChevronRight size={16} />
          </button>
          {!isCurrentWeek && (
            <button
              onClick={() => setWeek(thisMonday())}
              className="ms-2 text-xs font-bold text-primary underline"
            >
              Cette semaine
            </button>
          )}
        </div>
      </div>

      {board && board.total > 0 && (
        <div className="mb-6 rounded-xl border-2 border-primary/15 bg-white p-4">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-primary/50">
              Avancement de la semaine
            </span>
            <span className="text-sm font-bold text-primary" dir="ltr">
              {board.done} / {board.total} · {pct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-primary/10 overflow-hidden">
            <div
              className={`h-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-primary"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm p-3">
          {error}
        </p>
      )}

      {board === null ? (
        <div className="bg-white rounded-xl p-8 text-center text-primary/50">Chargement…</div>
      ) : board.columns.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center">
          <p className="font-semibold text-primary/70">Aucun membre d'équipe.</p>
          <p className="text-sm text-primary/40 mt-1">
            Ajoutez les personnes de l'équipe pour commencer à répartir les tâches.
          </p>
          <button
            onClick={() => setAddingMember(true)}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-bold"
          >
            <UserPlus size={15} /> Ajouter un membre
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {board.columns.map((col) => (
            <section
              key={col.member.id}
              className={`rounded-xl border-2 bg-white flex flex-col ${
                col.total > 0 && col.done === col.total
                  ? "border-emerald-300"
                  : "border-primary/15"
              }`}
            >
              <header className="px-4 py-3 border-b border-primary/10 flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0B1E3D] to-[#173E7D] text-white grid place-items-center font-display shrink-0">
                  {col.member.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-primary text-sm truncate">
                    {col.member.name}
                    {!col.member.active && (
                      <span className="ms-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        inactif
                      </span>
                    )}
                  </p>
                  {col.member.role && (
                    <p className="text-[11px] text-primary/50 truncate">{col.member.role}</p>
                  )}
                </div>
                <span className="text-xs font-bold text-primary/50 shrink-0" dir="ltr">
                  {col.done}/{col.total}
                </span>
              </header>

              <ul className="flex-1 p-2 space-y-1">
                {col.tasks.length === 0 && (
                  <li className="px-2 py-3 text-sm text-primary/35">Aucune tâche.</li>
                )}
                {col.tasks.map((task) => (
                  <li
                    key={task.id}
                    className="group flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-primary/[0.04]"
                  >
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => toggle(task)}
                      id={`t-${task.id}`}
                      className="mt-0.5 w-4 h-4 accent-primary cursor-pointer shrink-0"
                    />
                    <label
                      htmlFor={`t-${task.id}`}
                      className={`flex-1 min-w-0 text-sm cursor-pointer break-words ${
                        task.done ? "line-through text-primary/35" : "text-gray-700"
                      }`}
                    >
                      {task.title}
                      {task.note && (
                        <span className="block text-[11px] text-primary/40 mt-0.5">
                          {task.note}
                        </span>
                      )}
                    </label>
                    <button
                      onClick={() => removeTask(task.id)}
                      aria-label="Supprimer"
                      className="shrink-0 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>

              {col.member.active && (
                <div className="p-2 border-t border-primary/10">
                  <div className="flex gap-1.5">
                    <input
                      value={draft[col.member.id] ?? ""}
                      onChange={(e) => setDraft({ ...draft, [col.member.id]: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addTask(col.member.id);
                      }}
                      placeholder="Ajouter une tâche…"
                      className="flex-1 min-w-0 rounded-lg border border-primary/15 px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => addTask(col.member.id)}
                      disabled={!(draft[col.member.id] ?? "").trim()}
                      aria-label="Ajouter"
                      className="shrink-0 px-3 rounded-lg bg-primary text-white disabled:opacity-30"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {board && board.columns.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => setAddingMember(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-primary/20 text-primary text-sm font-bold"
          >
            <UserPlus size={15} /> Ajouter un membre
          </button>
          <button
            onClick={carryOver}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-primary/20 text-primary text-sm font-bold disabled:opacity-40"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <CornerDownRight size={15} />}
            Reporter les tâches non terminées
          </button>
        </div>
      )}

      {addingMember && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAddingMember(false)} />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-display text-primary">Nouveau membre</h2>
              <button onClick={() => setAddingMember(false)} aria-label="Fermer">
                <X size={18} className="text-primary/50" />
              </button>
            </div>

            <label className="block mt-5">
              <span className="block text-[11px] font-black uppercase tracking-widest text-primary/50 mb-1.5">
                Nom *
              </span>
              <input
                value={memberForm.name}
                onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                autoFocus
                className="w-full border-2 border-primary/15 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="block mt-4">
              <span className="block text-[11px] font-black uppercase tracking-widest text-primary/50 mb-1.5">
                Rôle
              </span>
              <input
                value={memberForm.role}
                onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                placeholder="Développeur, Marketing…"
                onKeyDown={(e) => e.key === "Enter" && addMember()}
                className="w-full border-2 border-primary/15 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
            </label>

            <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button
                onClick={() => setAddingMember(false)}
                className="px-4 py-2.5 rounded-lg border border-primary/20 text-primary text-sm font-bold"
              >
                Annuler
              </button>
              <button
                onClick={addMember}
                disabled={!memberForm.name.trim()}
                className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-bold disabled:opacity-40"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamTasksTab;
