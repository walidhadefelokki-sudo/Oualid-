import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { useI18n } from "../i18n";
import freelanceService, {
  FreelancerCard,
  MarketplaceCategory,
  Paged,
  ProjectCard,
  ServiceCard,
} from "../freelance.service";
import {
  EmptyState,
  ErrorState,
  FreelancerTile,
  Grid,
  Loading,
  ProjectTile,
  ServiceTile,
} from "../ui";

/**
 * The three browse pages — services, projects and freelancers.
 *
 * One component because they differ only in what they fetch and render.
 * Filters live in the query string so a filtered view can be linked, shared
 * and reopened, which a marketplace needs and a state variable cannot give.
 */

type Kind = "services" | "projects" | "freelancers";

const Pager: React.FC<{
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}> = ({ page, totalPages, onPage }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="px-4 py-2 rounded-lg border border-[#173E7D]/20 text-sm font-bold text-[#173E7D] disabled:opacity-30"
      >
        ‹
      </button>
      <span className="text-sm font-semibold text-[#2B3442]/60" dir="ltr">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className="px-4 py-2 rounded-lg border border-[#173E7D]/20 text-sm font-bold text-[#173E7D] disabled:opacity-30"
      >
        ›
      </button>
    </div>
  );
};

const Browse: React.FC<{ kind: Kind; title: string }> = ({ kind, title }) => {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();

  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [result, setResult] = useState<Paged<unknown> | null>(null);
  const [failed, setFailed] = useState(false);
  const [draftQuery, setDraftQuery] = useState(params.get("q") ?? "");

  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  useEffect(() => {
    freelanceService.getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const load = () => {
    setFailed(false);
    setResult(null);

    const query = {
      ...(q ? { q } : {}),
      ...(category ? { category } : {}),
      page,
    };

    const request =
      kind === "services"
        ? freelanceService.getServices(query)
        : kind === "projects"
          ? freelanceService.getProjects(query)
          : freelanceService.getFreelancers(query);

    request.then((r) => setResult(r as Paged<unknown>)).catch(() => setFailed(true));
  };

  useEffect(load, [kind, q, category, page]);

  /** Writes a filter into the URL and returns to page 1. */
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    next.delete("page");
    setParams(next);
  };

  const goPage = (p: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(p));
    setParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const emptyKey =
    kind === "services" ? "empty.services" : kind === "projects" ? "empty.projects" : "empty.freelancers";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-display font-bold text-[#173E7D] mb-6">{title}</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFilter("q", draftQuery.trim());
          }}
          className="relative flex-1"
        >
          <Search size={17} className="absolute top-1/2 -translate-y-1/2 start-4 text-[#173E7D]/40" />
          <input
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            placeholder={t("home.searchPlaceholder")}
            aria-label={t("home.searchPlaceholder")}
            className="w-full rounded-xl border-2 border-[#173E7D]/15 bg-white ps-11 pe-4 py-3 outline-none focus:border-[#173E7D]"
          />
        </form>

        <select
          value={category}
          onChange={(e) => setFilter("category", e.target.value)}
          className="rounded-xl border-2 border-[#173E7D]/15 bg-white px-4 py-3 text-sm font-semibold text-[#173E7D]"
        >
          <option value="">{t("home.categories")}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {failed ? (
        <ErrorState onRetry={load} />
      ) : result === null ? (
        <Loading />
      ) : result.items.length === 0 ? (
        <EmptyState message={t(emptyKey)} />
      ) : (
        <>
          {kind === "services" && (
            <Grid>
              {(result.items as ServiceCard[]).map((s) => (
                <ServiceTile key={s.id} service={s} />
              ))}
            </Grid>
          )}

          {kind === "projects" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {(result.items as ProjectCard[]).map((p) => (
                <ProjectTile key={p.id} project={p} />
              ))}
            </div>
          )}

          {kind === "freelancers" && (
            <Grid>
              {(result.items as FreelancerCard[]).map((f) => (
                <FreelancerTile key={f.username} freelancer={f} />
              ))}
            </Grid>
          )}

          <Pager page={result.page} totalPages={result.totalPages} onPage={goPage} />
        </>
      )}
    </div>
  );
};

/** The category index, which is its own page in the site tree. */
export const Categories: React.FC = () => {
  const { t } = useI18n();
  const [categories, setCategories] = useState<MarketplaceCategory[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    freelanceService.getCategories().then(setCategories).catch(() => setFailed(true));
  };

  useEffect(load, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-display font-bold text-[#173E7D] mb-6">{t("nav.categories")}</h1>

      {failed ? (
        <ErrorState onRetry={load} />
      ) : categories === null ? (
        <Loading />
      ) : categories.length === 0 ? (
        <EmptyState message={t("empty.categories")} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((c) => (
            <div key={c.id} className="rounded-2xl border-2 border-[#173E7D]/15 bg-white p-5">
              <Link
                to={`/recherche?category=${c.slug}`}
                className="font-bold text-lg text-[#173E7D] hover:underline break-words"
              >
                {c.name}
              </Link>
              {c.description && (
                <p className="mt-1 text-sm text-[#2B3442]/60 break-words">{c.description}</p>
              )}

              {c.subcategories.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {c.subcategories.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={`/recherche?category=${s.slug}`}
                        className="text-[11px] font-semibold px-2 py-1 rounded-full bg-[#173E7D]/8 text-[#173E7D] hover:bg-[#173E7D]/15"
                      >
                        {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Browse;
