import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Check, Clock, Eye, Loader2, RotateCcw, Star } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import {
  Avatar,
  Badge,
  Card,
  CHECKBOX,
  Chip,
  ErrorState,
  Loading,
  Price,
  Rating,
  Tint,
  Wrap,
  btn,
} from "../ui";
import ContactButton from "../ContactButton";

/**
 * A service, and the way to buy it.
 *
 * The formulas sit side by side because that is the comparison a buyer is
 * making. Add-ons change the total in front of them, but the total that
 * counts is the one the server computes — the browser's figure is a preview.
 *
 * Laid out as the canvas draws it: the gallery and the prose on the left,
 * one sticky panel on the right holding the whole purchase. The panel is
 * sticky rather than scrolling away because the formula and the price are
 * what the reader is checking the rest of the page against.
 */

interface Pkg {
  id: string;
  tier: "BASIC" | "STANDARD" | "PREMIUM";
  name: string;
  description: string | null;
  price: string;
  deliveryDays: number;
  revisions: number;
  features: string[];
}

interface Addon {
  id: string;
  name: string;
  price: string;
  extraDays: number;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  response: string | null;
  author: string;
}

const TIER_LABEL: Record<string, string> = {
  BASIC: "Basique",
  STANDARD: "Standard",
  PREMIUM: "Premium",
};

/** The tints the gallery thumbnails fall back to, so a row is not flat. */
const THUMB_TINTS = ["blue", "orange", "green", "purple"] as const;

const ServiceDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { signedIn } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [service, setService] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const [tier, setTier] = useState<string | null>(null);
  const [shot, setShot] = useState(0);
  const [chosenAddons, setChosenAddons] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setFailed(false);
    api
      .get(`/freelance/services/by-slug/${slug}`)
      .then((r) => {
        setService(r.data.data.service);
        setTier(r.data.data.service.packages[0]?.tier ?? null);
        setShot(0);
      })
      .catch(() => setFailed(true));
  };

  useEffect(load, [slug]);

  if (failed)
    return (
      <Wrap className="py-16">
        <ErrorState onRetry={load} />
      </Wrap>
    );
  if (!service) return <Loading />;

  const pkg: Pkg | undefined = service.packages.find((p: Pkg) => p.tier === tier);
  const addons: Addon[] = service.addons ?? [];
  const reviews: Review[] = service.reviews ?? [];
  const images: string[] = service.images ?? [];
  const f = service.freelancer;

  const total =
    (pkg ? Number(pkg.price) : 0) +
    addons.filter((a) => chosenAddons.includes(a.id)).reduce((s, a) => s + Number(a.price), 0);

  const order = async () => {
    if (!pkg) return;
    if (!signedIn) {
      navigate(`/connexion?next=${encodeURIComponent(`/service/${slug}`)}`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const { data } = await api.post("/freelance/me/orders/from-service", {
        packageId: pkg.id,
        addonIds: chosenAddons,
      });
      navigate(`/freelance-espace/commandes/${data.data.order.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.message || "La commande a échoué.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Wrap className="py-6 sm:py-8">
      {/* ----------------------------- breadcrumb ---------------------- */}
      <nav aria-label="Fil d'Ariane" className="mb-5 text-sm text-muted">
        <Link to="/" className="text-muted hover:underline">
          {t("nav.home")}
        </Link>
        {service.category && (
          <>
            {" › "}
            <Link to={`/recherche?category=${service.category.slug}`} className="text-muted hover:underline">
              {service.category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="flex flex-wrap items-start gap-8">
        {/* =========================== main column ====================== */}
        <div className="flex min-w-0 flex-[999_1_40rem] flex-col gap-6">
          <h1 className="break-words text-3xl font-bold leading-tight text-primary sm:text-[38px]">
            {service.title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <Link to={`/@${f.username}`} className="flex items-center gap-2.5 hover:underline">
              <Avatar name={f.displayName} url={f.avatarUrl} size="md" tone="orange" />
              <b className="text-primary">{f.displayName}</b>
            </Link>
            {f.wilaya && <span className="text-muted">{f.wilaya}</span>}
            <Rating value={f.ratingAverage} count={f.ratingCount} />
            {f.identityVerified && <Badge tone="success">{t("service.verified")}</Badge>}
            <span className="inline-flex items-center gap-1.5 text-muted">
              <Eye size={14} aria-hidden="true" /> {service.views}
            </span>
          </div>

          {/* ------------------------- the gallery ---------------------- */}
          <div className="flex flex-col gap-3">
            {images.length > 0 ? (
              <img
                src={images[Math.min(shot, images.length - 1)]}
                alt=""
                className="aspect-[16/10] w-full rounded-panel object-cover"
              />
            ) : (
              <Tint className="aspect-[16/10] w-full rounded-panel">
                <span className="font-serif text-6xl text-primary/30" aria-hidden="true">
                  {service.title.charAt(0).toUpperCase()}
                </span>
              </Tint>
            )}

            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {images.slice(0, 8).map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setShot(i)}
                    aria-label={`Image ${i + 1}`}
                    aria-current={i === shot}
                    className={
                      "h-20 overflow-hidden rounded-chip transition-all sm:h-24 " +
                      (i === shot ? "ring-3 ring-primary" : "opacity-80 hover:opacity-100")
                    }
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ------------------------ about the service ----------------- */}
          <Card as="section" className="flex flex-col gap-3.5">
            <h2 className="text-2xl font-bold text-primary">{t("service.about")}</h2>
            <p className="whitespace-pre-wrap break-words text-base leading-relaxed text-body">
              {service.description}
            </p>

            {service.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {service.skills.map((s: string) => (
                  <Chip key={s}>{s}</Chip>
                ))}
              </div>
            )}
          </Card>

          {/* ---------------------------- reviews ----------------------- */}
          {reviews.length > 0 && (
            <Card as="section" className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-primary">{t("service.reviews")}</h2>
                <Rating value={f.ratingAverage} count={f.ratingCount} className="text-[15px]" />
              </div>

              {reviews.map((r) => (
                <article key={r.id} className="flex flex-col gap-2 border-t border-line-soft pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <b className="text-primary">{r.author}</b>
                    <time className="text-muted" dateTime={r.createdAt}>
                      {new Date(r.createdAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </time>
                  </div>

                  <Stars rating={r.rating} />

                  {r.comment && (
                    <p className="break-words text-[15px] leading-relaxed text-body">{r.comment}</p>
                  )}

                  {/* The one reply the freelancer is allowed. Indented so it
                      reads as an answer rather than a second review. */}
                  {r.response && (
                    <p className="ms-4 border-s-2 border-line ps-4 text-sm leading-relaxed text-muted">
                      <b className="text-primary">{f.displayName} : </b>
                      {r.response}
                    </p>
                  )}
                </article>
              ))}
            </Card>
          )}

          {/* ------------------------------ faq ------------------------- */}
          {service.faqs.length > 0 && (
            <Card as="section">
              <h2 className="mb-3 text-2xl font-bold text-primary">{t("service.faq")}</h2>
              {service.faqs.map((q: { question: string; answer: string }, i: number) => (
                <details key={i} className="border-t border-line-soft py-4">
                  <summary className="cursor-pointer text-base font-bold text-primary">
                    {q.question}
                  </summary>
                  <p className="mt-2.5 break-words text-[15px] leading-relaxed text-body">
                    {q.answer}
                  </p>
                </details>
              ))}
            </Card>
          )}

          {/* -------------------------- requirements -------------------- */}
          {service.requirements.length > 0 && (
            <Card as="section" className="flex flex-col gap-3">
              <h2 className="text-2xl font-bold text-primary">{t("service.needsFromYou")}</h2>
              <ul className="flex list-none flex-col gap-2.5 p-0">
                {service.requirements.map((r: { prompt: string; required: boolean }, i: number) => (
                  <li key={i} className="flex gap-2.5 text-[15px] text-body">
                    <Check size={16} className="mt-1 shrink-0 text-success" aria-hidden="true" />
                    <span className="break-words">
                      {r.prompt}
                      {!r.required && <span className="text-muted"> ({t("service.optional")})</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* ============================== aside ========================= */}
        <aside className="flex min-w-0 flex-[1_1_21rem] flex-col gap-5 lg:sticky lg:top-6">
          <section className="flex flex-col rounded-panel bg-surface p-2">
            {/* The formula switch. A real tablist, so the three are one
                control to a keyboard rather than three stray buttons. */}
            {service.packages.length > 1 && (
              <div
                role="tablist"
                aria-label={t("service.plans")}
                className="grid gap-1 rounded-tile bg-ground p-1"
                style={{ gridTemplateColumns: `repeat(${service.packages.length}, minmax(0, 1fr))` }}
              >
                {service.packages.map((p: Pkg) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={tier === p.tier}
                    onClick={() => setTier(p.tier)}
                    className={
                      "min-h-11 rounded-chip px-2 text-[15px] font-bold transition-colors " +
                      (tier === p.tier ? "bg-primary text-white" : "text-primary hover:bg-surface")
                    }
                  >
                    {TIER_LABEL[p.tier] ?? p.tier}
                  </button>
                ))}
              </div>
            )}

            {pkg && (
              <div className="flex flex-col gap-4 p-5 sm:p-6">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-lg font-bold text-primary">
                    {pkg.name || TIER_LABEL[pkg.tier]}
                  </span>
                  <Price value={pkg.price} className="text-2xl font-bold text-primary" />
                </div>

                {pkg.description && (
                  <p className="break-words text-[15px] leading-relaxed text-body">
                    {pkg.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-5 text-sm font-bold text-primary">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={14} aria-hidden="true" /> {pkg.deliveryDays} {t("service.days")}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <RotateCcw size={14} aria-hidden="true" /> {pkg.revisions}{" "}
                    {t("service.revisions")}
                  </span>
                </div>

                {pkg.features.length > 0 && (
                  <ul className="flex list-none flex-col gap-2 p-0 text-sm text-body">
                    {pkg.features.map((ft) => (
                      <li key={ft} className="flex gap-2">
                        <Check size={15} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                        <span className="break-words">{ft}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {addons.length > 0 && (
                  <div className="flex flex-col gap-1 border-t border-line-soft pt-4">
                    <p className="mb-1 text-sm font-bold text-primary">{t("service.options")}</p>
                    {addons.map((a) => (
                      <label
                        key={a.id}
                        className="flex cursor-pointer items-start gap-2.5 py-1.5 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={chosenAddons.includes(a.id)}
                          onChange={() =>
                            setChosenAddons((prev) =>
                              prev.includes(a.id)
                                ? prev.filter((x) => x !== a.id)
                                : [...prev, a.id]
                            )
                          }
                          className={CHECKBOX + " mt-0.5"}
                        />
                        <span className="min-w-0 flex-1 break-words text-body">
                          {a.name}
                          {a.extraDays > 0 && (
                            <span className="text-muted"> · +{a.extraDays} j</span>
                          )}
                        </span>
                        <Price value={a.price} className="font-bold text-primary" />
                      </label>
                    ))}
                  </div>
                )}

                <div className="flex items-baseline justify-between border-t-2 border-line-soft pt-4">
                  <span className="text-base font-bold text-primary">{t("service.total")}</span>
                  <Price value={total} className="text-2xl font-bold text-primary" />
                </div>

                {error && (
                  <p className="rounded-field bg-tint-red p-3 text-sm font-bold text-danger">
                    {error}
                  </p>
                )}

                <button onClick={order} disabled={busy} className={btn("primary", "w-full py-4")}>
                  {busy && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
                  {signedIn ? t("service.order") : t("nav.signin")}
                </button>

                {/* A buyer with a question should not have to order to ask
                    it. Placed under the order button, not instead of it:
                    the service page is for selling. */}
                <ContactButton username={f.username} label={t("service.contact")} />

                <p className="text-center text-[13px] leading-relaxed text-muted">
                  {t("service.paymentNote")}
                </p>
              </div>
            )}
          </section>

          {/* ------------------------ the freelancer -------------------- */}
          <Link
            to={`/@${f.username}`}
            className="flex flex-col gap-3.5 rounded-panel bg-surface p-6 transition-shadow hover:shadow-[0_8px_30px_rgba(23,62,125,0.10)]"
          >
            <div className="flex items-center gap-3.5">
              <Avatar name={f.displayName} url={f.avatarUrl} size="lg" tone="orange" />
              <span className="flex min-w-0 flex-col gap-1">
                <b className="break-words text-[17px] text-primary">{f.displayName}</b>
                {f.title && <span className="break-words text-sm text-muted">{f.title}</span>}
              </span>
            </div>

            {f.bio && (
              <p className="line-clamp-3 break-words text-sm leading-relaxed text-body">{f.bio}</p>
            )}

            <div className="grid grid-cols-3 gap-2 text-center">
              <Figure value={f.completedOrders} label={t("service.orders")} />
              <Figure value={f.ratingCount} label={t("service.reviewsShort")} />
              <Figure value={f.languages?.length ?? 0} label={t("service.languages")} />
            </div>

            <span className="text-sm font-bold text-primary">
              {t("service.viewPortfolio")} @{f.username} →
            </span>
          </Link>
        </aside>
      </div>
    </Wrap>
  );
};

/** One of the three small counts under a freelancer card. */
const Figure: React.FC<{ value: React.ReactNode; label: string }> = ({ value, label }) => (
  <span className="rounded-field bg-ground px-1 py-3 text-xs text-muted">
    <b className="block text-base text-primary">{value}</b>
    {label}
  </span>
);

/**
 * A rating as stars.
 *
 * The number is given as text too, because five shapes in a row are not a
 * number to a screen reader and colour alone should not carry the score.
 */
const Stars: React.FC<{ rating: number }> = ({ rating }) => (
  <span className="inline-flex items-center gap-0.5 text-accent-ink" dir="ltr">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={14}
        fill={n <= rating ? "currentColor" : "none"}
        className={n <= rating ? "" : "text-line"}
        aria-hidden="true"
      />
    ))}
    <span className="sr-only">{rating} / 5</span>
  </span>
);

export default ServiceDetail;
