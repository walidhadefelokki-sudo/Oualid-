import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, X } from "lucide-react";
import adminService, {
  AdminUser,
  ScheduleEvent,
  ScheduleInput,
  ScheduleStatus,
  ScheduleType,
} from "../../services/admin.service";

/**
 * The platform team's diary: a month grid with the entries on it.
 *
 * Deliberately not a calendar library. A month view, a form and a delete is
 * the whole requirement, and the grid below is about forty lines — less than
 * the configuration a library would need, and with no opinion of its own about
 * dates to fight.
 */

const TYPES: ScheduleType[] = ["MEETING", "INTERVIEW", "CALL", "DEMO", "DEADLINE", "OTHER"];
const STATUSES: ScheduleStatus[] = ["PLANNED", "CONFIRMED", "DONE", "CANCELLED"];

const TYPE_LABEL: Record<ScheduleType, string> = {
  MEETING: "Réunion",
  INTERVIEW: "Entretien",
  CALL: "Appel",
  DEMO: "Démo",
  DEADLINE: "Échéance",
  OTHER: "Autre",
};

const TYPE_STYLE: Record<ScheduleType, string> = {
  MEETING: "bg-blue-100 text-blue-700 border-blue-200",
  INTERVIEW: "bg-violet-100 text-violet-700 border-violet-200",
  CALL: "bg-emerald-100 text-emerald-700 border-emerald-200",
  DEMO: "bg-amber-100 text-amber-700 border-amber-200",
  DEADLINE: "bg-red-100 text-red-700 border-red-200",
  OTHER: "bg-gray-100 text-gray-600 border-gray-200",
};

const STATUS_LABEL: Record<ScheduleStatus, string> = {
  PLANNED: "Prévu",
  CONFIRMED: "Confirmé",
  DONE: "Terminé",
  CANCELLED: "Annulé",
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** Local YYYY-MM-DD. toISOString would shift the day for anyone east of UTC. */
const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** The value a datetime-local input expects, in local time. */
const toLocalInput = (d: Date) => `${dayKey(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/**
 * The six-week grid a month is drawn on.
 *
 * Starts on the Monday of the week containing the 1st and always runs 42 days,
 * so the grid never changes height between months.
 */
const monthGrid = (year: number, month: number) => {
  const first = new Date(year, month, 1);
  // getDay() is Sunday-based; shift so Monday is 0.
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
};

const personLabel = (p?: { firstName?: string | null; lastName?: string | null; email: string } | null) =>
  p ? [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email : "";

const SchedulesTab: React.FC = () => {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ScheduleEvent | "new" | null>(null);
  const [presetDay, setPresetDay] = useState<Date | null>(null);

  const days = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);

  const load = () => {
    setLoading(true);
    setError(null);
    // The whole grid, not the calendar month: entries on the leading and
    // trailing days are visible and must be fetched.
    const from = days[0];
    const to = new Date(days[41].getFullYear(), days[41].getMonth(), days[41].getDate(), 23, 59, 59);
    adminService
      .getSchedules({ from: from.toISOString(), to: to.toISOString() })
      .then(setEvents)
      .catch((e) => setError(e?.response?.data?.message || "Échec du chargement du calendrier"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [cursor]);

  // Hosts and guests are chosen from real accounts, so the list is needed once.
  useEffect(() => {
    adminService.getUsers().then(setUsers).catch(() => setUsers([]));
  }, []);

  /** Entries bucketed by day, so each cell is a lookup rather than a scan. */
  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const e of events) {
      // An entry spanning days belongs on each of them.
      const start = new Date(e.startsAt);
      const end = new Date(e.endsAt);
      const cursorDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      while (cursorDay <= end) {
        const k = dayKey(cursorDay);
        map.set(k, [...(map.get(k) ?? []), e]);
        cursorDay.setDate(cursorDay.getDate() + 1);
      }
    }
    return map;
  }, [events]);

  const monthLabel = cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const remove = async (event: ScheduleEvent) => {
    if (!window.confirm(`Supprimer « ${event.title} » ?`)) return;
    try {
      await adminService.deleteSchedule(event.id);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      setEditing(null);
    } catch (e: any) {
      alert(e?.response?.data?.message || "Échec de la suppression");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-display">Agenda</h1>
          <p className="text-sm text-primary/60">
            Réunions, entretiens, appels et échéances de l’équipe.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="p-2 rounded-lg border border-primary/20 text-primary/70 hover:text-primary"
            aria-label="Mois précédent"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold capitalize min-w-[9rem] text-center">{monthLabel}</span>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="p-2 rounded-lg border border-primary/20 text-primary/70 hover:text-primary"
            aria-label="Mois suivant"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="px-3 py-2 rounded-lg border border-primary/20 text-primary/70 text-sm hover:text-primary"
          >
            Aujourd’hui
          </button>
          <button
            onClick={() => {
              setPresetDay(null);
              setEditing("new");
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
          >
            <Plus size={15} /> Nouvel événement
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 mb-5">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-7 bg-primary/5 text-[11px] font-black uppercase tracking-widest text-primary/50">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-2 text-center">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const inMonth = day.getMonth() === cursor.getMonth();
              const isToday = dayKey(day) === dayKey(today);
              const dayEvents = byDay.get(dayKey(day)) ?? [];

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    setPresetDay(day);
                    setEditing("new");
                  }}
                  className={`min-h-[104px] border-t border-l border-primary/10 p-1.5 text-left align-top hover:bg-primary/[0.03] transition-colors ${
                    inMonth ? "" : "bg-primary/[0.02]"
                  }`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mb-1 ${
                      isToday
                        ? "bg-primary text-white"
                        : inMonth
                          ? "text-primary/70"
                          : "text-primary/25"
                    }`}
                  >
                    {day.getDate()}
                  </span>

                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((e) => (
                      <span
                        key={e.id + dayKey(day)}
                        onClick={(ev) => {
                          // Otherwise the cell's own click opens a new entry
                          // on top of the one being opened.
                          ev.stopPropagation();
                          setEditing(e);
                        }}
                        className={`block truncate px-1.5 py-0.5 rounded border text-[11px] font-semibold cursor-pointer ${
                          TYPE_STYLE[e.type]
                        } ${e.status === "CANCELLED" ? "line-through opacity-60" : ""}`}
                        title={e.title}
                      >
                        {!e.allDay &&
                          `${new Date(e.startsAt).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })} `}
                        {e.title}
                      </span>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="block text-[10px] text-primary/40 px-1.5">
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-primary/50 text-sm">
          <Loader2 size={15} className="animate-spin" /> Chargement…
        </div>
      )}

      {editing && (
        <EventModal
          event={editing === "new" ? null : editing}
          presetDay={presetDay}
          users={users}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEvents((prev) => {
              const without = prev.filter((e) => e.id !== saved.id);
              return [...without, saved];
            });
            setEditing(null);
          }}
          onDelete={editing === "new" ? undefined : () => remove(editing as ScheduleEvent)}
        />
      )}
    </div>
  );
};

/* ------------------------------------------------------------- the form --- */

const EventModal: React.FC<{
  event: ScheduleEvent | null;
  presetDay: Date | null;
  users: AdminUser[];
  onClose: () => void;
  onSaved: (e: ScheduleEvent) => void;
  onDelete?: () => void;
}> = ({ event, presetDay, users, onClose, onSaved, onDelete }) => {
  const base = presetDay ?? new Date();
  const defaultStart = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 9, 0);
  const defaultEnd = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 10, 0);

  const [form, setForm] = useState({
    title: event?.title ?? "",
    type: event?.type ?? ("MEETING" as ScheduleType),
    status: event?.status ?? ("PLANNED" as ScheduleStatus),
    startsAt: toLocalInput(event ? new Date(event.startsAt) : defaultStart),
    endsAt: toLocalInput(event ? new Date(event.endsAt) : defaultEnd),
    allDay: event?.allDay ?? false,
    location: event?.location ?? "",
    notes: event?.notes ?? "",
    hostId: event?.host?.id ?? "",
  });

  const [guests, setGuests] = useState<Array<{ userId?: string; name?: string; email?: string }>>(
    event?.guests.map((g) => ({
      userId: g.user?.id ?? undefined,
      name: g.name ?? undefined,
      email: g.email ?? undefined,
    })) ?? []
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: ScheduleInput = {
      title: form.title,
      type: form.type,
      status: form.status,
      // datetime-local has no zone; new Date() reads it as local, which is
      // what was typed, and toISOString converts it once for the wire.
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      allDay: form.allDay,
      location: form.location || null,
      notes: form.notes || null,
      hostId: form.hostId || null,
      guests: guests.filter((g) => g.userId || g.name || g.email),
    };

    try {
      onSaved(
        event
          ? await adminService.updateSchedule(event.id, payload)
          : await adminService.createSchedule(payload)
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || "Échec de l’enregistrement");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <form
        onSubmit={submit}
        className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden"
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-primary/10">
          <h2 className="text-lg font-display">{event ? "Modifier l’événement" : "Nouvel événement"}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer">
            <X size={20} className="text-primary/50" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-4">
          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm p-3">{error}</p>
          )}

          <label className="block text-sm">
            <span className="text-primary/60">Titre</span>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1 w-full border border-primary/20 rounded-lg px-3 py-2"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-primary/60">Type</span>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as ScheduleType })}
                className="mt-1 w-full border border-primary/20 rounded-lg px-3 py-2"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-primary/60">Statut</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ScheduleStatus })}
                className="mt-1 w-full border border-primary/20 rounded-lg px-3 py-2"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-primary/60">Début</span>
              <input
                type="datetime-local"
                required
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="mt-1 w-full border border-primary/20 rounded-lg px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-primary/60">Fin</span>
              <input
                type="datetime-local"
                required
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="mt-1 w-full border border-primary/20 rounded-lg px-3 py-2"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
            />
            <span className="text-primary/70">Toute la journée</span>
          </label>

          <label className="block text-sm">
            <span className="text-primary/60">Hôte</span>
            <select
              value={form.hostId}
              onChange={(e) => setForm({ ...form, hostId: e.target.value })}
              className="mt-1 w-full border border-primary/20 rounded-lg px-3 py-2"
            >
              <option value="">— Aucun —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {personLabel(u)} ({u.role})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-primary/60">Lieu ou lien</span>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Bureau, adresse, ou lien de visioconférence"
              className="mt-1 w-full border border-primary/20 rounded-lg px-3 py-2"
            />
          </label>

          {/* Guests: an account, or a name and address for someone without one. */}
          <div className="text-sm">
            <div className="flex items-center justify-between">
              <span className="text-primary/60">Invités</span>
              <button
                type="button"
                onClick={() => setGuests([...guests, {}])}
                className="text-primary text-xs font-semibold"
              >
                + Ajouter
              </button>
            </div>

            <div className="mt-2 space-y-2">
              {guests.length === 0 && <p className="text-primary/40 text-xs">Aucun invité.</p>}

              {guests.map((g, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={g.userId ?? ""}
                    onChange={(e) => {
                      const next = [...guests];
                      next[i] = e.target.value ? { userId: e.target.value } : {};
                      setGuests(next);
                    }}
                    className="flex-1 min-w-0 border border-primary/20 rounded-lg px-2 py-1.5 text-sm"
                  >
                    <option value="">— Externe —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {personLabel(u)}
                      </option>
                    ))}
                  </select>

                  {!g.userId && (
                    <>
                      <input
                        value={g.name ?? ""}
                        onChange={(e) => {
                          const next = [...guests];
                          next[i] = { ...next[i], name: e.target.value };
                          setGuests(next);
                        }}
                        placeholder="Nom"
                        className="flex-1 min-w-0 border border-primary/20 rounded-lg px-2 py-1.5 text-sm"
                      />
                      <input
                        value={g.email ?? ""}
                        onChange={(e) => {
                          const next = [...guests];
                          next[i] = { ...next[i], email: e.target.value };
                          setGuests(next);
                        }}
                        placeholder="Email"
                        className="flex-1 min-w-0 border border-primary/20 rounded-lg px-2 py-1.5 text-sm"
                      />
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setGuests(guests.filter((_, k) => k !== i))}
                    className="p-2 rounded-lg border border-red-200 text-red-500 shrink-0"
                    aria-label="Retirer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <label className="block text-sm">
            <span className="text-primary/60">Notes</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full border border-primary/20 rounded-lg px-3 py-2 resize-y"
            />
          </label>
        </div>

        <footer className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 px-5 py-4 border-t border-primary/10">
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="px-4 py-2.5 rounded-lg border border-red-200 text-red-500 text-sm font-semibold"
            >
              Supprimer
            </button>
          ) : (
            <span />
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-primary/20 text-primary/70 text-sm font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
};

export default SchedulesTab;
