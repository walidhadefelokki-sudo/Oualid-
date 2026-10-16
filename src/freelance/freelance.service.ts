import api from "../services/api";

/**
 * Reads for the public marketplace.
 *
 * Uses the existing axios client, so the token interceptor, the base URL and
 * the error handling are the ones the rest of the platform already uses.
 */

export interface Paged<T> {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: T[];
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  subcategories: Array<{ id: string; name: string; slug: string }>;
  serviceCount: number;
}

export interface ServiceCard {
  id: string;
  title: string;
  slug: string;
  category?: { name: string; slug: string } | null;
  coverUrl: string | null;
  /** Lowest package price, in DZD. Null when no package is priced yet. */
  startingPrice: string | number | null;
  deliveryDays: number | null;
  freelancer: {
    username: string;
    displayName: string;
    level: string;
    verified: boolean;
    rating: string | number | null;
    ratingCount: number;
    wilaya: string | null;
    avatarUrl: string | null;
  };
}

export interface ProjectCard {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  budgetType: "FIXED" | "HOURLY";
  budgetMin: string | number | null;
  budgetMax: string | number | null;
  deadline: string | null;
  remote: boolean;
  wilaya: string | null;
  publishedAt: string | null;
  category?: { name: string; slug: string } | null;
  skills: string[];
  proposalCount: number;
  clientName: string | null;
}

export interface FreelancerCard {
  username: string;
  displayName: string;
  title: string | null;
  bio: string | null;
  wilaya: string | null;
  hourlyRate: string | number | null;
  availability: string;
  level: string;
  verified: boolean;
  rating: string | number | null;
  ratingCount: number;
  completedOrders: number;
  languages: string[];
  category?: { name: string; slug: string } | null;
  skills: string[];
  avatarUrl: string | null;
  serviceCount: number;
}

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: string | number;
  currency: string;
}

export interface FreelancePlan {
  id: string;
  tier: "FREE" | "PRO" | "PREMIUM" | "AGENCY";
  name: string;
  price: string | number;
  currency: string;
  maxActiveServices: number | null;
  monthlyProposals: number | null;
  maxPortfolioProjects: number | null;
  prioritySearch: boolean;
  removableBranding: boolean;
  customSubdomain: boolean;
  weeklyBoosts: number;
}

export type ServiceQuery = Record<string, string | number | boolean | undefined>;

const freelanceService = {
  getCategories: async (): Promise<MarketplaceCategory[]> => {
    const { data } = await api.get("/freelance/categories");
    return data.data.categories;
  },

  getServices: async (params: ServiceQuery = {}): Promise<Paged<ServiceCard>> => {
    const { data } = await api.get("/freelance/services", { params });
    const d = data.data;
    return { ...d, items: d.services };
  },

  getProjects: async (params: ServiceQuery = {}): Promise<Paged<ProjectCard>> => {
    const { data } = await api.get("/freelance/projects", { params });
    const d = data.data;
    return { ...d, items: d.projects };
  },

  getFreelancers: async (params: ServiceQuery = {}): Promise<Paged<FreelancerCard>> => {
    const { data } = await api.get("/freelance/freelancers", { params });
    const d = data.data;
    return { ...d, items: d.freelancers };
  },

  getPricing: async (): Promise<{ packs: CreditPack[]; plans: FreelancePlan[] }> => {
    const { data } = await api.get("/freelance/pricing");
    return data.data;
  },
};

export default freelanceService;
