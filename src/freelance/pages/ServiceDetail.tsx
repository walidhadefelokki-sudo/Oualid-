import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BadgeCheck, Check, Clock, Eye, Loader2, RotateCcw } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { ErrorState, Loading, Price } from "../ui";

/**
 * A service, and the way to buy it.
 *
 * The formulas sit side by side because that is the comparison a buyer is
 * making. Add-ons change the total in front of them, but the total that
 * counts is the one the server computes — the browser's figure is a preview.
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

const TIER_LABEL: Record<string, string> = {
  BASIC: "Basique",
  STANDARD: "Standard",
  PREMIUM: "Premium",
};

const ServiceDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { signedIn } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [service, setService] = useState<any>(null);
  const [failed, setFailed] = useState(false);
  const [tier, setTier] = useState<string | null>(null);
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
      })
      .catch(() => setFailed(true));
  };

  useEffect(load, [slug]);

  if (failed)
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <ErrorState onRetry={load} />
      </div>
    );
  if (!service) return <Loading />;

  const pkg: Pkg | undefined = service.packages.find((p: Pkg) => p.tier === tier);
  const addons: Addon[] = service.addons ?? [];
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <article className="rounded-2xl border-2 border-[#173E7D]/15 bg-white overflow-hidden">
          {service.images.length > 0 ? (
            <img src={service.images[0]} alt="" className="w-full aspect-[16/9] object-cover" />
          ) : (
            <div className="w-full aspect-[16/9] bg-[#173E7D]/5 grid place-items-center text-[#173E7D]/20 font-display text-5xl">
              {service.title.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="p-6">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#173E7D] break-words">
              {service.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#2B3442]/60">
              {service.category && <span>{service.category.name}</span>}
              <span className="inline-flex items-center gap-1.5">
                <Eye size={14} /> {service.views}
              </span>
            </div>

            <p className="mt-5 whitespace-pre-wrap break-words text-[#2B3442]/80 leading-relaxed">
              {service.description}
            </p>

            {service.skills.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {service.skills.map((s: string) => (
                  <span
                    key={s}
                    className="text-xs font-semibold px-3 py-1 rounded-full bg-[#173E7D]/8 text-[#173E7D]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </article>

        {service.faqs.length > 0 && (
          <section className="rounded-2xl border-2 border-[#173E7D]/15 bg-white p-6">
            <h2 className="font-display font-bold text-[#173E7D] mb-3">Questions fréquentes</h2>
            <div className="space-y-2">
              {service.faqs.map((q: { question: string; answer: string }, i: number) => (
                <details key={i} className="border-b border-[#173E7D]/10 pb-2 last:border-0">
                  <summary className="cursor-pointer font-semibold text-[#2B3442] py-1">
                    {q.question}
                  </summary>
                  <p className="mt-1 text-sm text-[#2B3442]/70 break-words">{q.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {service.requirements.length > 0 && (
          <section className="rounded-2xl border-2 border-[#173E7D]/15 bg-white p-6">
            <h2 className="font-display font-bold text-[#173E7D] mb-3">
              Ce que le freelance aura besoin de vous
            </h2>
            <ul className="space-y-1.5">
              {service.requirements.map(
                (r: { prompt: string; required: boolean }, i: number) => (
                  <li key={i} className="text-sm text-[#2B3442]/70 flex gap-2">
                    <Check size={15} className="mt-0.5 text-[#173E7D]/40 shrink-0" />
                    {r.prompt}
                    {!r.required && (
                      <span className="text-[#2B3442]/40">(facultatif)</span>
                    )}
                  </li>
                )
              )}
            </ul>
          </section>
        )}
      </div>

      <aside className="space-y-4">
        <section className="rounded-2xl border-2 border-[#173E7D]/15 bg-white p-5">
          <div className="flex gap-1 mb-4">
            {service.packages.map((p: Pkg) => (
              <button
                key={p.id}
                onClick={() => setTier(p.tier)}
                className={`flex-1 rounded-xl px-2 py-2 text-xs font-bold border-2 transition-colors ${
                  tier === p.tier
                    ? "border-[#173E7D] bg-[#173E7D] text-white"
                    : "border-[#173E7D]/15 text-[#2B3442]/70"
                }`}
              >
                {TIER_LABEL[p.tier] ?? p.tier}
              </button>
            ))}
          </div>

          {pkg && (
            <>
              <p className="text-2xl font-display font-bold">
                <Price value={pkg.price} />
              </p>
              {pkg.description && (
                <p className="mt-2 text-sm text-[#2B3442]/70 break-words">{pkg.description}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#2B3442]/60">
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={13} /> {pkg.deliveryDays} jours
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <RotateCcw size={13} /> {pkg.revisions} révision(s)
                </span>
              </div>

              {pkg.features.length > 0 && (
                <ul className="mt-4 space-y-1.5">
                  {pkg.features.map((ft) => (
                    <li key={ft} className="text-sm text-[#2B3442]/80 flex gap-2">
                      <Check size={15} className="mt-0.5 text-emerald-600 shrink-0" />
                      <span className="break-words">{ft}</span>
                    </li>
                  ))}
                </ul>
              )}

              {addons.length > 0 && (
                <div className="mt-5 pt-4 border-t border-[#173E7D]/10">
                  <p className="text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50 mb-2">
                    Options
                  </p>
                  {addons.map((a) => (
                    <label key={a.id} className="flex items-start gap-2 py-1.5 cursor-pointer">
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
                        className="mt-0.5 w-4 h-4 accent-[#173E7D]"
                      />
                      <span className="flex-1 min-w-0 text-sm text-[#2B3442]/80 break-words">
                        {a.name}
                        {a.extraDays > 0 && (
                          <span className="text-[#2B3442]/40"> · +{a.extraDays}j</span>
                        )}
                      </span>
                      <Price value={a.price} />
                    </label>
                  ))}
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-[#173E7D]/10 flex items-baseline justify-between">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#173E7D]/50">
                  Total
                </span>
                <span className="text-xl font-display font-bold">
                  <Price value={total} />
                </span>
              </div>

              {error && (
                <p className="mt-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm p-3">
                  {error}
                </p>
              )}

              <button
                onClick={order}
                disabled={busy}
                className="mt-4 w-full rounded-xl bg-[#173E7D] text-white font-bold py-3.5 inline-flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {busy && <Loader2 size={15} className="animate-spin" />}
                {signedIn ? "Commander" : t("nav.signin")}
              </button>

              <p className="mt-2 text-[11px] text-[#2B3442]/40 text-center">
                Le paiement se règle directement avec le freelance.
              </p>
            </>
          )}
        </section>

        <Link
          to={`/@${f.username}`}
          className="block rounded-2xl border-2 border-[#173E7D]/15 bg-white p-5 hover:border-[#173E7D]/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            {f.avatarUrl ? (
              <img src={f.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <span className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0B1E3D] to-[#173E7D] text-white grid place-items-center font-display">
                {f.displayName.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="font-bold text-[#173E7D] inline-flex items-center gap-1.5 break-words">
                {f.displayName}
                {f.identityVerified && <BadgeCheck size={15} />}
              </p>
              {f.title && <p className="text-xs text-[#2B3442]/60 break-words">{f.title}</p>}
            </div>
          </div>

          {f.bio && (
            <p className="mt-3 text-sm text-[#2B3442]/70 line-clamp-3 break-words">{f.bio}</p>
          )}

          <p className="mt-3 text-xs text-[#2B3442]/50">
            {f.completedOrders} mission(s) terminée(s)
            {f.wilaya && ` · ${f.wilaya}`}
          </p>
        </Link>
      </aside>
    </div>
  );
};

export default ServiceDetail;
