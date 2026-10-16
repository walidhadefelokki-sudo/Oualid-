import React from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Inbox, Loader2, MapPin, Star } from "lucide-react";
import { useI18n } from "./i18n";
import type { FreelancerCard, ProjectCard, ServiceCard } from "./freelance.service";

/**
 * Shared pieces of the marketplace UI.
 *
 * Prices are rendered with `dir="ltr"` even in Arabic: a number run inside
 * RTL text is reordered by the bidi algorithm and "2 500 DZD" comes out
 * wrong. The recruitment side learned this the hard way.
 */

export const money = (value: string | number | null | undefined, currency = "DZD") => {
  if (value === null || value === undefined) return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return null;
  // U+202F narrow no-break space between thousands, as elsewhere on the site.
  return `${n.toLocaleString("fr-FR").replace(/ /g, " ")} ${currency}`;
};

export const Price: React.FC<{ value: string | number | null | undefined; currency?: string }> = ({
  value,
  currency,
}) => {
  const text = money(value, currency);
  if (!text) return null;
  return (
    <span dir="ltr" className="inline-block font-bold text-[#173E7D]">
      {text}
    </span>
  );
};

export const Section: React.FC<{
  title: string;
  action?: { to: string; label: string };
  children: React.ReactNode;
}> = ({ title, action, children }) => (
  <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
    <div className="flex items-baseline justify-between gap-4 mb-5">
      <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#173E7D]">{title}</h2>
      {action && (
        <Link to={action.to} className="text-sm font-bold text-[#173E7D] hover:underline shrink-0">
          {action.label}
        </Link>
      )}
    </div>
    {children}
  </section>
);

/**
 * What an empty marketplace says.
 *
 * Deliberate rather than invented content: the brief forbids fabricated
 * ratings, prices and counts, and a new marketplace is genuinely empty.
 */
export const EmptyState: React.FC<{ message: string }> = ({ message }) => {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border-2 border-dashed border-[#173E7D]/15 bg-white/60 px-6 py-12 text-center">
      <Inbox size={28} className="mx-auto text-[#173E7D]/30" />
      <p className="mt-3 font-semibold text-[#173E7D]/70">{message}</p>
      <p className="mt-1 text-sm text-[#2B3442]/50">{t("empty.hint")}</p>
    </div>
  );
};

export const Loading: React.FC = () => {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-[#173E7D]/60">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-sm font-semibold">{t("common.loading")}</span>
    </div>
  );
};

export const ErrorState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
      <p className="font-semibold text-red-600">{t("common.error")}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 px-4 py-2 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-bold"
        >
          {t("common.retry")}
        </button>
      )}
    </div>
  );
};

const Rating: React.FC<{ value: string | number | null; count: number }> = ({ value, count }) => {
  // No rating is shown as nothing. A new seller is not a zero-star seller.
  if (value === null || count === 0) return null;
  const n = typeof value === "string" ? Number(value) : value;
  return (
    <span dir="ltr" className="inline-flex items-center gap-1 text-xs font-bold text-[#B8860B]">
      <Star size={12} fill="currentColor" />
      {n.toFixed(1)}
      <span className="text-[#2B3442]/40 font-semibold">({count})</span>
    </span>
  );
};

export const ServiceTile: React.FC<{ service: ServiceCard }> = ({ service }) => {
  const { t } = useI18n();
  const f = service.freelancer;

  return (
    <Link
      to={`/service/${service.slug}`}
      className="group flex flex-col rounded-2xl border-2 border-[#173E7D]/15 bg-white overflow-hidden hover:border-[#173E7D]/40 hover:shadow-lg transition-all"
    >
      <div className="aspect-[4/3] bg-[#173E7D]/5 overflow-hidden">
        {service.coverUrl ? (
          <img
            src={service.coverUrl}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#173E7D]/20 font-display text-3xl">
            {service.title.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {f.avatarUrl ? (
            <img src={f.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <span className="w-6 h-6 rounded-full bg-[#173E7D] text-white text-[10px] font-bold grid place-items-center">
              {f.displayName.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="text-xs font-semibold text-[#2B3442]/70 truncate">{f.displayName}</span>
          {f.verified && <BadgeCheck size={14} className="text-[#173E7D] shrink-0" />}
        </div>

        <h3 className="font-semibold text-[#2B3442] leading-snug line-clamp-2 min-w-0 break-words">
          {service.title}
        </h3>

        <Rating value={f.rating} count={f.ratingCount} />

        <div className="mt-auto pt-2 border-t border-[#173E7D]/10 flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#2B3442]/40">
            {t("common.from")}
          </span>
          <Price value={service.startingPrice} />
        </div>
      </div>
    </Link>
  );
};

export const ProjectTile: React.FC<{ project: ProjectCard }> = ({ project }) => (
  <Link
    to={`/projet/${project.slug}`}
    className="flex flex-col rounded-2xl border-2 border-[#173E7D]/15 bg-white p-5 hover:border-[#173E7D]/40 hover:shadow-lg transition-all"
  >
    <h3 className="font-bold text-[#173E7D] leading-snug break-words">{project.title}</h3>
    <p className="mt-2 text-sm text-[#2B3442]/70 line-clamp-3 break-words">{project.excerpt}</p>

    {project.skills.length > 0 && (
      <div className="mt-3 flex flex-wrap gap-1.5">
        {project.skills.slice(0, 5).map((s) => (
          <span
            key={s}
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#173E7D]/8 text-[#173E7D]"
          >
            {s}
          </span>
        ))}
      </div>
    )}

    <div className="mt-4 pt-3 border-t border-[#173E7D]/10 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#2B3442]/60">
      {(project.budgetMin || project.budgetMax) && (
        <Price value={project.budgetMax ?? project.budgetMin} />
      )}
      {project.wilaya && (
        <span className="inline-flex items-center gap-1">
          <MapPin size={12} /> {project.wilaya}
        </span>
      )}
      <span className="ms-auto font-semibold">{project.proposalCount}</span>
    </div>
  </Link>
);

export const FreelancerTile: React.FC<{ freelancer: FreelancerCard }> = ({ freelancer: f }) => (
  <Link
    to={`/@${f.username}`}
    className="flex flex-col items-center text-center rounded-2xl border-2 border-[#173E7D]/15 bg-white p-5 hover:border-[#173E7D]/40 hover:shadow-lg transition-all"
  >
    {f.avatarUrl ? (
      <img src={f.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" />
    ) : (
      <span className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0B1E3D] to-[#173E7D] text-white font-display text-xl grid place-items-center">
        {f.displayName.charAt(0).toUpperCase()}
      </span>
    )}

    <span className="mt-3 font-bold text-[#173E7D] inline-flex items-center gap-1.5 break-words">
      {f.displayName}
      {f.verified && <BadgeCheck size={15} />}
    </span>

    {f.title && <span className="text-sm text-[#2B3442]/60 break-words">{f.title}</span>}

    <Rating value={f.rating} count={f.ratingCount} />

    {f.hourlyRate && (
      <span className="mt-2 text-sm">
        <Price value={f.hourlyRate} />
      </span>
    )}
  </Link>
);

export const Grid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">{children}</div>
);
