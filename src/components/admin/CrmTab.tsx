import React, { useEffect, useMemo, useState } from "react";
import {
  Plus, Search, Trash2, Building2, User as UserIcon, Send, X, Loader2, AlertCircle,
} from "lucide-react";
import crmService, {
  Lead, LeadStatus, LeadSource, PipelineStage, CrmContact, CrmNote,
} from "../../services/crm.service";

/**
 * CRM: the pipeline of prospective clients, and the relationship history
 * behind every recruiter and candidate already on the platform.
 *
 * Two views rather than one list, because the two answer different questions:
 * "who should we chase this week" and "what do we know about this account".
 */

const STATUS_ORDER: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"];

const STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: "Nouveau",
  CONTACTED: "Contacté",
  QUALIFIED: "Qualifié",
  PROPOSAL: "Proposition",
  WON: "Gagné",
  LOST: "Perdu",
};

const STATUS_STYLE: Record<LeadStatus, string> = {
  NEW: "bg-gray-100 text-gray-600 border-gray-200",
  CONTACTED: "bg-blue-50 text-blue-600 border-blue-100",
  QUALIFIED: "bg-indigo-50 text-indigo-600 border-indigo-100",
  PROPOSAL: "bg-orange-50 text-orange-600 border-orange-100",
  WON: "bg-emerald-50 text-emerald-700 border-emerald-100",
  LOST: "bg-red-50 text-red-600 border-red-100",
};

const SOURCE_LABEL: Record<LeadSource, string> = {
  INBOUND: "Entrant",
  OUTBOUND: "Prospection",
  REFERRAL: "Recommandation",
  EVENT: "Événement",
  SOCIAL: "Réseaux sociaux",
  OTHER: "Autre",
};

const fullName = (p?: { firstName?: string | null; lastName?: string | null; email?: string } | null) =>
  [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim() || p?.email || "—";

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const CrmTab: React.FC = () => {
  const [view, setView] = useState<"leads" | "contacts">("leads");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">CRM</h1>
        <p className="text-sm text-gray-500 mt-1">
          Suivez vos prospects et l'historique de vos relations recruteurs et candidats.
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {([
          ["leads", "Prospects"],
          ["contacts", "Recruteurs & candidats"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
              view === key
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "leads" ? <LeadsView /> : <ContactsView />}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                   Leads                                    */
/* -------------------------------------------------------------------------- */

const LeadsView: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipeline, setPipeline] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await crmService.getLeads({
        status: statusFilter || undefined,
        search: search.trim() || undefined,
      });
      setLeads(data.leads);
      setPipeline(data.pipeline);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Impossible de charger les prospects.");
    } finally {
      setLoading(false);
    }
  };

  // Debounced so typing a search term does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, search]);

  const total = useMemo(() => pipeline.reduce((sum, s) => sum + s.count, 0), [pipeline]);

  return (
    <div className="space-y-6">
      {/* Pipeline. Every stage is shown, including empty ones — a missing
          column reads as a bug rather than as "nothing here yet". */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STATUS_ORDER.map((status) => {
          const count = pipeline.find((p) => p.status === status)?.count ?? 0;
          const active = statusFilter === status;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(active ? "" : status)}
              className={`rounded-xl border p-4 text-left transition ${
                active ? "border-primary ring-2 ring-primary/20" : "border-gray-200 hover:border-gray-300"
              } bg-white`}
            >
              <div className="text-2xl font-semibold">{count}</div>
              <div className="text-xs font-medium text-gray-500 mt-1">{STATUS_LABEL[status]}</div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Entreprise, contact, email…"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary"
          />
        </div>
        {statusFilter && (
          <button
            onClick={() => setStatusFilter("")}
            className="px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5"
          >
            <X size={14} /> {STATUS_LABEL[statusFilter]}
          </button>
        )}
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90"
        >
          <Plus size={16} /> Nouveau prospect
        </button>
      </div>

      {creating && (
        <LeadForm
          onCancel={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      )}

      {error && (
        <div className="flex gap-2 items-start rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <Building2 size={30} className="mx-auto text-gray-300" />
          <p className="font-semibold mt-4">
            {total === 0 ? "Aucun prospect pour l'instant" : "Aucun résultat"}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {total === 0
              ? "Ajoutez votre premier prospect pour commencer à suivre le pipeline."
              : "Essayez un autre filtre ou un autre terme de recherche."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              expanded={expanded === lead.id}
              onToggle={() => setExpanded(expanded === lead.id ? null : lead.id)}
              onChanged={load}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const LeadRow: React.FC<{
  lead: Lead;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
}> = ({ lead, expanded, onToggle, onChanged }) => {
  const [busy, setBusy] = useState(false);

  const setStatus = async (status: LeadStatus) => {
    setBusy(true);
    try {
      await crmService.updateLead(lead.id, { status });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Supprimer le prospect « ${lead.companyName} » et son historique ?`)) return;
    setBusy(true);
    try {
      await crmService.deleteLead(lead.id);
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="p-4 flex flex-wrap items-center gap-4">
        <button onClick={onToggle} className="flex-1 min-w-[200px] text-left">
          <div className="font-semibold">{lead.companyName}</div>
          <div className="text-sm text-gray-500">
            {lead.contactName || "—"}
            {lead.email ? ` · ${lead.email}` : ""}
            {lead.phone ? ` · ${lead.phone}` : ""}
          </div>
        </button>

        <span className="text-xs text-gray-400">{SOURCE_LABEL[lead.source]}</span>

        {lead.nextActionAt && (
          <span
            className={`text-xs font-semibold ${
              new Date(lead.nextActionAt) < new Date() ? "text-red-600" : "text-gray-500"
            }`}
            title="Prochaine action"
          >
            {formatDate(lead.nextActionAt)}
          </span>
        )}

        <select
          value={lead.status}
          disabled={busy}
          onChange={(e) => setStatus(e.target.value as LeadStatus)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full border outline-none ${STATUS_STYLE[lead.status]}`}
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <button
          onClick={remove}
          disabled={busy}
          title="Supprimer"
          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-50"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-4">
          {lead.notes && <p className="text-sm text-gray-600 whitespace-pre-wrap">{lead.notes}</p>}

          <div className="text-xs text-gray-500 flex flex-wrap gap-4">
            <span>Responsable : {fullName(lead.owner)}</span>
            <span>Créé le {formatDate(lead.createdAt)}</span>
            {lead.convertedUser && (
              <span className="text-emerald-700 font-semibold">
                Converti · {fullName(lead.convertedUser)} le {formatDate(lead.convertedAt)}
              </span>
            )}
          </div>

          <NoteThread notes={lead.crmNotes} target={{ leadId: lead.id }} onChanged={onChanged} />
        </div>
      )}
    </div>
  );
};

const LeadForm: React.FC<{ onCancel: () => void; onSaved: () => void }> = ({ onCancel, onSaved }) => {
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    source: "INBOUND" as LeadSource,
    notes: "",
    nextActionAt: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      setError("Le nom de l'entreprise est requis.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await crmService.createLead({
        ...form,
        nextActionAt: form.nextActionAt || undefined,
      });
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Impossible d'enregistrer le prospect.");
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof form, label: string, type = "text") => (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-600">{label}</label>
      <input
        type={type}
        value={form[key] as string}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary"
      />
    </div>
  );

  return (
    <form onSubmit={submit} className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {field("companyName", "Entreprise *")}
        {field("contactName", "Contact")}
        {field("email", "Email", "email")}
        {field("phone", "Téléphone")}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600">Source</label>
          <select
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value as LeadSource })}
            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary bg-white"
          >
            {(Object.keys(SOURCE_LABEL) as LeadSource[]).map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        {field("nextActionAt", "Prochaine action", "date")}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-gray-600">Notes</label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600"
        >
          Annuler
        </button>
      </div>
    </form>
  );
};

/* -------------------------------------------------------------------------- */
/*                        Recruiters & candidates                             */
/* -------------------------------------------------------------------------- */

const ContactsView: React.FC = () => {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"RECRUITER" | "CANDIDATE" | "">("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      setContacts(await crmService.getContacts({ role: role || undefined, search: search.trim() || undefined }));
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Impossible de charger les contacts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom ou email…"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary"
          />
        </div>
        {([
          ["", "Tous"],
          ["RECRUITER", "Recruteurs"],
          ["CANDIDATE", "Candidats"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setRole(key)}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold border transition ${
              role === key ? "border-primary text-primary bg-primary/5" : "border-gray-200 text-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex gap-2 items-start rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <UserIcon size={30} className="mx-auto text-gray-300" />
          <p className="font-semibold mt-4">Aucun contact</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              expanded={expanded === contact.id}
              onToggle={() => setExpanded(expanded === contact.id ? null : contact.id)}
              onChanged={load}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ContactRow: React.FC<{
  contact: CrmContact;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => void;
}> = ({ contact, expanded, onToggle, onChanged }) => {
  const company = contact.recruiterProfile?.companies?.[0]?.company;

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button onClick={onToggle} className="w-full p-4 flex flex-wrap items-center gap-4 text-left">
        <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center font-semibold shrink-0">
          {fullName(contact).charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-[200px]">
          <div className="font-semibold">{fullName(contact)}</div>
          <div className="text-sm text-gray-500">
            {contact.email}
            {contact.phone ? ` · ${contact.phone}` : ""}
          </div>
        </div>

        <span className="text-xs font-semibold px-3 py-1.5 rounded-full border bg-gray-50 text-gray-600 border-gray-200">
          {contact.role === "RECRUITER" ? "Recruteur" : "Candidat"}
        </span>

        {company && (
          <span className="text-xs text-gray-500">
            {company.name} · {company.plan}
          </span>
        )}

        {contact.candidateProfile?.currentJobTitle && (
          <span className="text-xs text-gray-500">{contact.candidateProfile.currentJobTitle}</span>
        )}

        {contact._count.crmNotesAbout > 0 && (
          <span className="text-xs font-semibold text-primary">
            {contact._count.crmNotesAbout} note(s)
          </span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-4">
          <div className="text-xs text-gray-500 flex flex-wrap gap-4">
            <span>Inscrit le {formatDate(contact.createdAt)}</span>
            <span>Statut : {contact.status}</span>
            {contact.candidateProfile && (
              <span>CV : {contact.candidateProfile.resumeId ? "Oui" : "Non"}</span>
            )}
            {(contact.candidateProfile?.city || contact.candidateProfile?.wilaya) && (
              <span>{contact.candidateProfile.city || contact.candidateProfile.wilaya}</span>
            )}
          </div>

          <NoteThread
            notes={contact.crmNotesAbout}
            target={{ subjectId: contact.id }}
            onChanged={onChanged}
          />
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                             Shared note thread                             */
/* -------------------------------------------------------------------------- */

const NoteThread: React.FC<{
  notes: CrmNote[];
  target: { leadId?: string; subjectId?: string };
  onChanged: () => void;
}> = ({ notes, target, onChanged }) => {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      await crmService.addNote({ body: body.trim(), ...target });
      setBody("");
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    await crmService.deleteNote(id);
    onChanged();
  };

  return (
    <div className="space-y-3">
      <form onSubmit={add} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ajouter une note (appel, email, réunion…)"
          className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 text-sm outline-none focus:border-primary bg-white"
        />
        <button
          type="submit"
          disabled={saving || !body.trim()}
          className="px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-2"
        >
          <Send size={15} />
        </button>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-gray-400">Aucun échange enregistré.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="bg-white rounded-lg border border-gray-100 p-3 group">
              <div className="flex justify-between items-start gap-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap flex-1">{note.body}</p>
                <button
                  onClick={() => remove(note.id)}
                  className="opacity-0 group-hover:opacity-100 transition text-gray-300 hover:text-red-600 shrink-0"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="text-[11px] text-gray-400 mt-1.5">
                {fullName(note.author)} · {formatDate(note.createdAt)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CrmTab;
