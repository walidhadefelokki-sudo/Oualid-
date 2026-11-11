import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { useI18n } from "../i18n";
import { WILAYAS } from "../../constants";
import freelanceService, {
  FreelancerCard,
  MarketplaceCategory,
  Paged,
  ProjectCard,
  ServiceCard,
} from "../freelance.service";
import {
  Card,
  EmptyState,
  ErrorState,
  FreelancerTile,
  Grid,
  Loading,
  ProjectTile,
  ServiceTile,
  Wrap,
  btn,
} from "../ui";

/**
 * The three browse pages — services, projects and freelancers.
 *
 * One component because they differ only in what they fetch and render.
 * Filters live in the query string so a filtered view can be linked, shared
 * and reopened, which a marketplace needs and a state variable cannot give.
 *
 * `wilaya` is here because the home page's hero sends it. The server has
 * always filtered on it; nothing read it back until now, so a search made
 * from the hero lost the wilaya on arrival.
 */

type Kind = "services" | "projects" | "freelancers";

const Pager: React.FC<{
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}> = ({ page, totalPages, onPage }) => {
  if (totalPages <= 1) return null;

  const step =
    "grid h-11 w-11 place-items-center rounded-field border-2 border-line bg-surface " +
    "text-lg font-bold text-primary transition-colors hover:border-primary " +
    "disabled:opacity-30 disabled:hover:border-line";

  return (
    <div className="mt-10 flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className={step}
        aria-label="Page précédente"
      >
        ‹
      </button>
      <span className="text-sm font-bold text-muted" dir="ltr">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className={step}
        aria-label="Page suivante"
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
  const wilaya = params.get("wilaya") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);

  useEffect(() => {
    freelanceService
      .getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const load = () => {
    setFailed(false);
    setResult(null);

    const query = {
      ...(q ? { q } : {}),
      ...(category ? { category } : {}),
      ...(wilaya ? { wilaya } : {}),
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

  useEffect(load, [kind, q, category, wilaya, page]);

  /** Writes a filter into the URL and returns to page 1. */
  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
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
    kind === "services"
      ? "empty.services"
      : kind === "projects"
        ? "empty.projects"
        : "empty.freelancers";

  const picker =
    "min-h-11 rounded-field border-2 border-line bg-surface px-4 text-[15px] font-semibold " +
    "text-primary outline-none focus:border-primary transition-colors";

  return (
    <Wrap className="py-8 sm:py-10">
      <h1 className="mb-6 text-3xl font-bold text-primary sm:text-4xl">{title}</h1>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setFilter("q", draftQuery.trim());
          }}
          className="relative flex-1"
        >
          <Search
            size={18}
            className="absolute start-4 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <span className="sr-only">{t("home.searchLabel")}</span>
          <input
            type="search"
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            placeholder={t("home.searchPlaceholder")}
            aria-label={t("home.searchLabel")}
            className="w-full rounded-field border-2 border-line bg-surface py-3.5 pe-4 ps-12 text-base text-primary outline-none transition-colors placeholder:text-muted focus:border-primary"
          />
        </form>

        <label>
          <span className="sr-only">{t("home.categories")}</span>
          <select
            value={category}
            onChange={(e) => setFilter("category", e.target.value)}
            className={picker}
          >
            <option value="">{t("home.categories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        {/* Projects carry their own wilaya; freelancers and services carry
            their freelancer's. All three filter on it server side. */}
        <label>
          <span className="sr-only">{t("home.wilaya")}</span>
          <select
            value={wilaya}
            onChange={(e) => setFilter("wilaya", e.target.value)}
            className={picker}
          >
            <option value="">{t("home.allWilayas")}</option>
            {WILAYAS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </label>
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
            <Grid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {(result.items as ProjectCard[]).map((p) => (
                <ProjectTile key={p.id} project={p} />
              ))}
            </Grid>
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
    </Wrap>
  );
};

/** The category index, which is its own page in the site tree. */
export const Categories: React.FC = () => {
  const { t } = useI18n();
  const [categories, setCategories] = useState<MarketplaceCategory[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    freelanceService
      .getCategories()
      .then(setCategories)
      .catch(() => setFailed(true));
  };

  useEffect(load, []);

  return (
    <Wrap className="py-8 sm:py-10">
      <h1 className="mb-6 text-3xl font-bold text-primary sm:text-4xl">{t("nav.categories")}</h1>

      {failed ? (
        <ErrorState onRetry={load} />
      ) : categories === null ? (
        <Loading />
      ) : categories.length === 0 ? (
        <EmptyState message={t("empty.categories")} />
      ) : (
        <Grid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Card key={c.id} className="flex flex-col gap-3">
              <Link
                to={`/recherche?category=${c.slug}`}
                className="break-words text-lg font-bold text-primary hover:underline"
              >
                {c.name}
              </Link>

              {c.description && (
                <p className="break-words text-sm leading-relaxed text-body">{c.description}</p>
              )}

              {c.subcategories.length > 0 && (
                <ul className="flex list-none flex-wrap gap-2 p-0">
                  {c.subcategories.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={`/recherche?category=${s.slug}`}
                        className="inline-flex rounded-full bg-ground px-3 py-1.5 text-xs font-bold text-primary hover:bg-line"
                      >
                        {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              <Link
                to={`/recherche?category=${c.slug}`}
                className={btn("ghost", "mt-auto self-start")}
              >
                {c.serviceCount} {t("home.servicesCount")}
              </Link>
            </Card>
          ))}
        </Grid>
      )}
    </Wrap>
  );
};

export default Browse;
