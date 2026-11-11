import React from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Cpu,
  Factory,
  GraduationCap,
  HardHat,
  HeartPulse,
  Inbox,
  Landmark,
  Loader2,
  MapPin,
  Palmtree,
  ShoppingBag,
  Star,
  Tag,
} from "lucide-react";
import logoNavy from "../assets/logo-v2.png";
import logoPale from "../assets/logo2-v2.png";
import { useI18n } from "./i18n";
import type { FreelancerCard, ProjectCard, ServiceCard } from "./freelance.service";

/**
 * The marketplace's charte graphique, as components.
 *
 * Every colour, radius and type size here comes from the design canvas and
 * is named in `src/index.css`. Pages compose these rather than writing hex
 * codes, so a change to the charte is a change to one file.
 *
 * Three rules the canvas relies on, worth stating because breaking them is
 * invisible until someone looks closely:
 *
 *   - Depth comes from radius and ground, not from borders. A card is white
 *     on #EEF2F0 with a wide corner; it has no outline.
 *   - Orange is a surface colour, never a text colour. On #F68D58 the text
 *     is near-black; where orange has to carry words it becomes
 *     `accent-ink` (#B4511F), which is 5.1:1 on white.
 *   - The tints are backgrounds only. A label sitting on one uses `muted`;
 *     the canvas's own #4A6DA6 measures 4.39:1 there and fails.
 *
 * Prices are rendered with dir="ltr" even in Arabic: a number run inside
 * RTL text is reordered by the bidi algorithm and "2 500 DZD" comes out
 * wrong. The recruitment side learned this the hard way.
 */

/* -------------------------------------------------------------------------- */
/*                                   money                                    */
/* -------------------------------------------------------------------------- */

export const money = (value: string | number | null | undefined, currency = "DZD") => {
  if (value === null || value === undefined) return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return null;
  // U+202F narrow no-break space between thousands, as elsewhere on the site.
  return n.toLocaleString("fr-FR").replace(/\s/g, " ") + " " + currency;
};

export const Price: React.FC<{
  value: string | number | null | undefined;
  currency?: string;
  className?: string;
}> = ({ value, currency, className = "font-bold text-primary" }) => {
  const text = money(value, currency);
  if (!text) return null;
  return (
    <span dir="ltr" className={"inline-block " + className}>
      {text}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/*                                  buttons                                   */
/* -------------------------------------------------------------------------- */

/**
 * `min-h-11` is 44px, the floor for a touch target. It sits on the base
 * class rather than being left to each caller, because the one that forgets
 * is the one nobody can tap.
 */
const BTN_BASE =
  "inline-flex items-center justify-center gap-2 min-h-11 rounded-field " +
  "font-bold text-[15px] leading-tight text-center transition-colors " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

export type BtnTone = "primary" | "accent" | "ghost" | "soft" | "danger" | "quiet";

const TONES: Record<BtnTone, string> = {
  /* The ordinary commitment: "Commander", "Continuer". */
  primary: "px-5 py-3.5 bg-primary text-white hover:bg-navy-deep",
  /* The one that costs money or starts something. One per screen. */
  accent: "px-5 py-3.5 bg-secondary text-ink hover:brightness-95",
  /* Same weight as primary, less insistence. Padding is one step smaller so
     the 2px border does not make the button taller than a filled one. */
  ghost: "px-5 py-3 border-2 border-primary text-primary hover:bg-primary/5",
  soft: "px-5 py-3.5 bg-ground text-primary hover:bg-line",
  danger: "px-5 py-3 border-2 border-danger text-danger bg-surface hover:bg-tint-red",
  /* Inline, no chrome — a link that happens to be a button. */
  quiet: "px-2 text-primary hover:text-navy-deep hover:underline",
};

export const btn = (tone: BtnTone = "primary", extra = "") =>
  (BTN_BASE + " " + TONES[tone] + " " + extra).trim();

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: BtnTone;
  full?: boolean;
};

export const Btn: React.FC<BtnProps> = ({ tone = "primary", full, className = "", ...rest }) => (
  <button
    type={rest.type ?? "button"}
    {...rest}
    className={btn(tone, (full ? "w-full " : "") + className)}
  />
);

/* -------------------------------------------------------------------------- */
/*                             surfaces and panels                            */
/* -------------------------------------------------------------------------- */

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
}> = ({ children, className = "", as: Tag = "div" }) => (
  <Tag className={"bg-surface rounded-panel p-6 sm:p-7 " + className}>{children}</Tag>
);

/** The navy block: hero bands, credit balance, "un projet en tête ?". */
export const Panel: React.FC<{
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "aside";
}> = ({ children, className = "", as: Tag = "div" }) => (
  <Tag className={"bg-primary text-white rounded-hero p-7 sm:p-9 " + className}>{children}</Tag>
);

/** A placeholder where an image belongs, in one of the category tints. */
export const Tint: React.FC<{
  tone?: "blue" | "orange" | "green" | "purple" | "yellow";
  className?: string;
  children?: React.ReactNode;
}> = ({ tone = "blue", className = "", children }) => {
  const paint = {
    blue: "bg-tint-blue",
    orange: "bg-tint-orange",
    green: "bg-tint-green",
    purple: "bg-tint-purple",
    yellow: "bg-tint-yellow",
  }[tone];
  return (
    <div
      className={
        paint + " grid place-items-center text-sm font-semibold text-muted " + className
      }
    >
      {children}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                              badges and chips                              */
/* -------------------------------------------------------------------------- */

export type BadgeTone = "success" | "warn" | "info" | "neutral" | "danger" | "accent";

/**
 * Each tone is a tint paired with its own ink. The pairs differ in lightness
 * as well as hue, so they survive a bad screen and a reader who does not
 * separate red from green.
 */
const BADGE_TONES: Record<BadgeTone, string> = {
  success: "bg-tint-green text-success",
  warn: "bg-tint-orange text-warn",
  info: "bg-tint-blue text-primary",
  neutral: "bg-tint-grey text-neutral-ink",
  danger: "bg-tint-red text-danger",
  accent: "bg-secondary text-ink",
};

export const Badge: React.FC<{
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}> = ({ tone = "info", children, className = "" }) => (
  <span
    className={
      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold whitespace-nowrap " +
      BADGE_TONES[tone] +
      " " +
      className
    }
  >
    {children}
  </span>
);

/** A keyword, a skill, a filter that is on. Quieter than a Badge. */
export const Chip: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <span
    className={
      "inline-flex items-center rounded-full bg-ground px-3.5 py-2 text-[13px] font-bold text-primary " +
      className
    }
  >
    {children}
  </span>
);

/* -------------------------------------------------------------------------- */
/*                                   avatar                                   */
/* -------------------------------------------------------------------------- */

const SIZES = {
  sm: "w-7 h-7 text-[11px]",
  md: "w-11 h-11 text-sm",
  lg: "w-14 h-14 text-lg",
  xl: "w-24 h-24 text-3xl sm:w-40 sm:h-40 sm:text-5xl",
};

export const Avatar: React.FC<{
  name: string;
  url?: string | null;
  size?: keyof typeof SIZES;
  tone?: "navy" | "orange" | "blue";
  className?: string;
}> = ({ name, url, size = "md", tone = "navy", className = "" }) => {
  const round = size === "xl" ? "rounded-[48px]" : "rounded-full";
  const shell = SIZES[size] + " " + round + " shrink-0 " + className;

  if (url) return <img src={url} alt="" className={shell + " object-cover"} />;

  const paint =
    tone === "orange"
      ? "bg-secondary text-ink"
      : tone === "blue"
        ? "bg-tint-blue text-primary"
        : "bg-primary text-white";

  return (
    <span className={shell + " " + paint + " grid place-items-center font-bold"} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/*                                form controls                               */
/* -------------------------------------------------------------------------- */

/** Class strings rather than components: pages need the raw element. */
export const FIELD =
  "w-full rounded-field border-2 border-line bg-surface px-4 py-3.5 text-base " +
  "text-primary placeholder:text-muted outline-none focus:border-primary transition-colors";

export const FIELD_SM =
  "w-full rounded-xl border-2 border-line bg-surface px-3 py-3 text-[15px] " +
  "text-primary placeholder:text-muted outline-none focus:border-primary transition-colors";

export const LABEL = "flex flex-col gap-2 text-sm font-bold text-primary";

export const HINT = "text-[13px] font-normal text-muted";

export const CHECKBOX = "w-5 h-5 shrink-0 accent-primary";

/* -------------------------------------------------------------------------- */
/*                                    tabs                                    */
/* -------------------------------------------------------------------------- */

/**
 * The pill tablist from the canvas: a ground-coloured trough with the
 * selected tab as a navy pill inside it. Real buttons, so a keyboard
 * reaches them.
 */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
  label,
  on = "ground",
  className = "",
}: {
  value: T;
  onChange: (next: T) => void;
  options: Array<{ value: T; label: React.ReactNode }>;
  label: string;
  /**
   * What the trough sits on, so it can contrast with it.
   *
   * A prop rather than a background class passed in through `className`:
   * two competing `bg-*` classes on one element are resolved by whichever
   * Tailwind happens to emit later, not by the order they are written in.
   */
  on?: "ground" | "surface";
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={
        "inline-flex flex-wrap gap-1 rounded-full p-1.5 " +
        (on === "surface" ? "bg-surface" : "bg-ground") +
        " " +
        className
      }
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(o.value)}
            className={
              "min-h-11 rounded-full px-4 text-[15px] font-bold transition-colors sm:px-5 " +
              (selected
                ? "bg-primary text-white"
                : on === "surface"
                  ? "text-primary hover:bg-ground"
                  : "text-primary hover:bg-surface")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               category icons                               */
/* -------------------------------------------------------------------------- */

/**
 * A category's `icon` column holds a Lucide component name, not a character
 * — "ShoppingBag", "HardHat", "GraduationCap". Rendering that column as
 * text puts the word "ShoppingBag" in the chip, which is what it used to do.
 *
 * Named imports rather than `import * as Icons`: a namespace import pulls
 * all 1,500-odd Lucide icons into the bundle because nothing can be
 * tree-shaken out of it.
 *
 * The column is free text an administrator can set, so an unknown name has
 * to render as something. It falls back to a neutral tag rather than to
 * nothing, and a value that is plainly a character — an emoji, a letter —
 * is shown as itself, since that is the other way the field gets used.
 */
const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number | string }>> = {
  Cpu,
  Factory,
  GraduationCap,
  HardHat,
  HeartPulse,
  Landmark,
  Palmtree,
  ShoppingBag,
};

export const CategoryIcon: React.FC<{ name?: string | null; size?: number }> = ({
  name,
  size = 22,
}) => {
  const key = name?.trim();
  if (!key) return <Tag size={size} aria-hidden="true" />;

  const Icon = CATEGORY_ICONS[key];
  if (Icon) return <Icon size={size} />;

  /* Short enough to be a glyph rather than a component name. Emoji count as
     two or more code units, so this counts characters, not bytes. */
  if ([...key].length <= 2) {
    return (
      <span aria-hidden="true" style={{ fontSize: size }}>
        {key}
      </span>
    );
  }

  return <Tag size={size} aria-hidden="true" />;
};

/* -------------------------------------------------------------------------- */
/*                                  wordmark                                  */
/* -------------------------------------------------------------------------- */

/**
 * The Dar L'emploi logo, with "Freelance" beside it.
 *
 * The real mark, not type: it carries the orange handshake over the
 * apostrophe, which no font can reproduce, and it is already drawn in the
 * charte's navy and orange.
 *
 * Two files rather than one recoloured by CSS, because a PNG cannot be
 * recoloured — `logo-v2` is navy for light grounds, `logo2-v2` is pale for
 * dark ones. `on` picks the file and also changes the qualifier's shape: a
 * filled navy pill on a light header, plain orange type on a dark one,
 * since a navy pill on near-black would disappear.
 */
export const Wordmark: React.FC<{
  on?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}> = ({ on = "light", size = "md", label = "Freelance", className = "" }) => {
  /* Heights, not widths: the mark is a long horizontal lockup and sizing it
     by height is what keeps it on the same baseline as the nav beside it. */
  const height = { sm: "h-7", md: "h-8", lg: "h-9" }[size];

  return (
    <span className={"flex items-center gap-2.5 " + className}>
      <img
        src={on === "dark" ? logoPale : logoNavy}
        alt="Dar L'emploi"
        className={height + " w-auto shrink-0 object-contain"}
      />
      {on === "dark" ? (
        <span className="text-sm font-bold text-secondary">{label}</span>
      ) : (
        <span className="rounded-full bg-primary px-2.5 py-1.5 text-xs font-bold text-white">
          {label}
        </span>
      )}
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/*                               page furniture                               */
/* -------------------------------------------------------------------------- */

/** The 1280px column every public page sits in. */
export const Wrap: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <div className={"max-w-7xl mx-auto px-4 sm:px-8 " + className}>{children}</div>;

export const Section: React.FC<{
  title: string;
  lede?: string;
  action?: { to: string; label: string };
  children: React.ReactNode;
  className?: string;
}> = ({ title, lede, action, children, className = "" }) => (
  <section className={"max-w-7xl mx-auto px-4 sm:px-8 pt-12 sm:pt-16 " + className}>
    <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
      <div>
        <h2 className="text-2xl sm:text-4xl font-bold text-primary">{title}</h2>
        {lede && <p className="mt-2 text-[15px] text-muted">{lede}</p>}
      </div>
      {action && (
        <Link
          to={action.to}
          className="shrink-0 text-[15px] font-bold text-primary hover:underline"
        >
          {action.label} →
        </Link>
      )}
    </div>
    {children}
  </section>
);

/** The heading of a dashboard screen: title, one line, one action. */
export const PageHead: React.FC<{
  title: string;
  lede?: string;
  children?: React.ReactNode;
}> = ({ title, lede, children }) => (
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div className="min-w-0">
      <h1 className="text-2xl sm:text-[32px] font-bold text-primary break-words">{title}</h1>
      {lede && <p className="mt-1.5 text-[15px] text-muted break-words">{lede}</p>}
    </div>
    {children}
  </div>
);

/** A number worth looking at. White on the ground, or navy when `feature`. */
export const Stat: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  feature?: boolean;
  children?: React.ReactNode;
}> = ({ label, value, sub, feature, children }) => (
  <div
    className={
      "rounded-card p-6 flex flex-col gap-2.5 " + (feature ? "bg-primary text-white" : "bg-surface")
    }
  >
    <span className={"text-sm " + (feature ? "text-on-navy" : "text-muted")}>{label}</span>
    <span className={"text-4xl font-bold " + (feature ? "text-white" : "text-primary")}>
      {value}
    </span>
    {sub && (
      <span className={"text-[13px] font-bold " + (feature ? "text-on-navy" : "text-success")}>
        {sub}
      </span>
    )}
    {children}
  </div>
);

/* -------------------------------------------------------------------------- */
/*                                   states                                   */
/* -------------------------------------------------------------------------- */

/**
 * What an empty marketplace says.
 *
 * Deliberate rather than invented content: the brief forbids fabricated
 * ratings, prices and counts, and a new marketplace is genuinely empty.
 */
export const EmptyState: React.FC<{ message: string }> = ({ message }) => {
  const { t } = useI18n();
  return (
    <div className="rounded-card border-2 border-dashed border-line bg-surface/60 px-6 py-14 text-center">
      <Inbox size={28} className="mx-auto text-muted" aria-hidden="true" />
      <p className="mt-3 font-bold text-primary">{message}</p>
      <p className="mt-1 text-sm text-muted">{t("empty.hint")}</p>
    </div>
  );
};

export const Loading: React.FC = () => {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted">
      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
      <span className="text-sm font-bold">{t("common.loading")}</span>
    </div>
  );
};

export const ErrorState: React.FC<{ onRetry?: () => void; message?: string }> = ({
  onRetry,
  message,
}) => {
  const { t } = useI18n();
  return (
    <div className="rounded-card bg-tint-red px-6 py-8 text-center">
      <p className="font-bold text-danger">{message ?? t("common.error")}</p>
      {onRetry && (
        <Btn tone="danger" onClick={onRetry} className="mt-4">
          {t("common.retry")}
        </Btn>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                   rating                                   */
/* -------------------------------------------------------------------------- */

export const Rating: React.FC<{
  value: string | number | null;
  count: number;
  className?: string;
}> = ({ value, count, className = "" }) => {
  // No rating is shown as nothing. A new seller is not a zero-star seller.
  if (value === null || count === 0) return null;
  const n = typeof value === "string" ? Number(value) : value;
  return (
    <span
      dir="ltr"
      className={
        "inline-flex items-center gap-1 text-[13px] font-bold text-accent-ink " + className
      }
    >
      <Star size={12} fill="currentColor" aria-hidden="true" />
      {n.toFixed(1)}
      <span className="font-semibold text-muted">({count})</span>
    </span>
  );
};

/* -------------------------------------------------------------------------- */
/*                                    tiles                                   */
/* -------------------------------------------------------------------------- */

/** The lift a card gets on hover. Navy at low alpha, not grey. */
const LIFT = "transition-shadow hover:shadow-[0_8px_30px_rgba(23,62,125,0.10)]";

export const ServiceTile: React.FC<{ service: ServiceCard; sponsored?: boolean }> = ({
  service,
  sponsored,
}) => {
  const { t } = useI18n();
  const f = service.freelancer;

  return (
    <Link
      to={"/service/" + service.slug}
      className={"group flex flex-col gap-3 rounded-card bg-surface p-3.5 " + LIFT}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-chip bg-tint-blue">
        {service.coverUrl ? (
          <img
            src={service.coverUrl}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="grid h-full w-full place-items-center font-serif text-4xl text-primary/40">
            {service.title.charAt(0).toUpperCase()}
          </span>
        )}
        {sponsored && (
          <span className="absolute top-2.5 left-2.5 rounded-full bg-surface px-2.5 py-1.5 text-xs font-bold text-warn-strong">
            {t("service.sponsored")}
          </span>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <Avatar name={f.displayName} url={f.avatarUrl} size="sm" />
        <span className="truncate text-[13px] font-bold text-primary">{f.displayName}</span>
        {f.verified && <BadgeCheck size={14} className="shrink-0 text-primary" aria-hidden="true" />}
      </div>

      <h3 className="line-clamp-3 break-words text-base font-bold leading-snug text-primary">
        {service.title}
      </h3>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line-soft pt-3">
        <Rating value={f.rating} count={f.ratingCount} />
        <span className="ms-auto text-sm text-muted">
          {t("common.from")} <Price value={service.startingPrice} />
        </span>
      </div>
    </Link>
  );
};

export const ProjectTile: React.FC<{ project: ProjectCard }> = ({ project }) => {
  const { t } = useI18n();

  return (
    <Link
      to={"/projet/" + project.slug}
      className={"flex flex-col gap-3 rounded-card bg-surface p-6 " + LIFT}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 break-words text-xl font-bold leading-snug text-primary">
          {project.title}
        </h3>
        {(project.budgetMin || project.budgetMax) && (
          <Price
            value={project.budgetMax ?? project.budgetMin}
            className="whitespace-nowrap text-[17px] font-bold text-primary"
          />
        )}
      </div>

      <p className="line-clamp-3 break-words text-[15px] leading-relaxed text-body">
        {project.excerpt}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {project.skills.slice(0, 4).map((s) => (
          <Chip key={s}>{s}</Chip>
        ))}
        {project.wilaya && (
          <span className="inline-flex items-center gap-1 text-[13px] text-muted">
            <MapPin size={12} aria-hidden="true" /> {project.wilaya}
          </span>
        )}
        <span className="ms-auto text-[13px] text-muted">
          {project.proposalCount} {t("project.proposals")}
        </span>
      </div>
    </Link>
  );
};

export const FreelancerTile: React.FC<{ freelancer: FreelancerCard }> = ({ freelancer: f }) => (
  <Link
    to={"/@" + f.username}
    className={"flex flex-col items-center gap-2 rounded-card bg-surface p-6 text-center " + LIFT}
  >
    <Avatar name={f.displayName} url={f.avatarUrl} size="lg" tone="orange" />

    <span className="mt-1 inline-flex items-center gap-1.5 break-words font-bold text-primary">
      {f.displayName}
      {f.verified && <BadgeCheck size={15} aria-hidden="true" />}
    </span>

    {f.title && <span className="break-words text-sm text-muted">{f.title}</span>}

    <Rating value={f.rating} count={f.ratingCount} />

    {f.hourlyRate && <Price value={f.hourlyRate} className="mt-1 text-sm font-bold text-primary" />}
  </Link>
);

export const Grid: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
}) => <div className={"grid gap-5 " + className}>{children}</div>;
