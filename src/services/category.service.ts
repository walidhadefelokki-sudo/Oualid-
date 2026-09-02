import api from "./api";

/** An activity sector ("domaine") as stored in the JobCategory table. */
export interface JobCategory {
  id: string;
  name: string;
  /** Stable key the UI pairs with an icon, photo and translated label. */
  slug: string;
  description?: string | null;
  icon?: string | null;
  /** Published jobs currently in this sector. */
  jobCount: number;
}

/** Job shape returned inside a domain popup — lighter than the full PublicJob. */
export interface CategoryJob {
  id: string;
  title: string;
  location: string;
  wilaya?: string | null;
  type: string;
  remote: boolean;
  featured: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency: string;
  createdAt: string;
  publishedAt?: string | null;
  company: { name: string; logo?: { url: string } | null };
}

export interface CategoryDetail {
  category: JobCategory;
  jobs: CategoryJob[];
}

class CategoryService {
  /**
   * Public: every sector with its published-job count. Drives the
   * "Opportunités par domaine" grid.
   */
  async getCategories(): Promise<JobCategory[]> {
    const response = await api.get("/categories");
    return response.data.data.categories;
  }

  /**
   * Public: one sector plus a preview of its most recent published jobs,
   * featured first. Used when a domain popup opens.
   */
  async getCategory(slug: string, limit = 6): Promise<CategoryDetail> {
    const response = await api.get(`/categories/${slug}`, { params: { limit } });
    return response.data.data;
  }
}

export default new CategoryService();
