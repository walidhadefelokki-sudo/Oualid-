import api from "./api";

export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "WON" | "LOST";
export type LeadSource = "INBOUND" | "OUTBOUND" | "REFERRAL" | "EVENT" | "SOCIAL" | "OTHER";

export interface StaffRef {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface CrmNote {
  id: string;
  body: string;
  createdAt: string;
  author?: StaffRef | null;
}

export interface Lead {
  id: string;
  companyName: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  status: LeadStatus;
  source: LeadSource;
  notes?: string | null;
  nextActionAt?: string | null;
  convertedAt?: string | null;
  owner?: StaffRef | null;
  convertedUser?: StaffRef | null;
  crmNotes: CrmNote[];
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStage {
  status: LeadStatus;
  count: number;
}

export interface CrmContact {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role: "RECRUITER" | "CANDIDATE";
  status: string;
  createdAt: string;
  candidateProfile?: {
    id: string;
    currentJobTitle?: string | null;
    city?: string | null;
    wilaya?: string | null;
    resumeId?: string | null;
  } | null;
  recruiterProfile?: {
    id: string;
    companies: { company: { id: string; name: string; plan: string } }[];
  } | null;
  crmNotesAbout: CrmNote[];
  _count: { crmNotesAbout: number };
}

export type LeadInput = Partial<
  Pick<
    Lead,
    "companyName" | "contactName" | "email" | "phone" | "status" | "source" | "notes" | "nextActionAt"
  >
> & { ownerId?: string | null };

export const crmService = {
  async getLeads(params: { status?: LeadStatus; search?: string } = {}) {
    const { data } = await api.get("/crm/leads", { params });
    return data.data as { leads: Lead[]; pipeline: PipelineStage[] };
  },

  async createLead(input: LeadInput) {
    const { data } = await api.post("/crm/leads", input);
    return data.data.lead as Lead;
  },

  async updateLead(id: string, input: LeadInput) {
    const { data } = await api.patch(`/crm/leads/${id}`, input);
    return data.data.lead as Lead;
  },

  async deleteLead(id: string) {
    await api.delete(`/crm/leads/${id}`);
  },

  /** Links a lead to the account they created, keeping the history. */
  async convertLead(id: string, userId: string) {
    const { data } = await api.post(`/crm/leads/${id}/convert`, { userId });
    return data.data.lead as Lead;
  },

  /** A note belongs to a lead or to a person, never both. */
  async addNote(input: { body: string; leadId?: string; subjectId?: string }) {
    const { data } = await api.post("/crm/notes", input);
    return data.data.note as CrmNote;
  },

  async deleteNote(id: string) {
    await api.delete(`/crm/notes/${id}`);
  },

  async getContacts(params: { role?: "RECRUITER" | "CANDIDATE"; search?: string } = {}) {
    const { data } = await api.get("/crm/contacts", { params });
    return data.data.contacts as CrmContact[];
  },
};

export default crmService;
