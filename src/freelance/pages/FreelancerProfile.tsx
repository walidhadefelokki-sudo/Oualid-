import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import api from "../../services/api";
import { useI18n } from "../i18n";
import { EmptyState, ErrorState, Grid, Loading, Price, ServiceTile } from "../ui";

/**
 * A freelancer's public page, at /@username.
 *
 * Their standing and their work, and no way to reach them off the platform:
 * no e-mail, no phone. Ordering a service or answering a project is how a
 * conversation starts, which is what keeps the record of it where a dispute
 * can be read.
 *
 * This is not yet the mini-portfolio the specification describes — that has
 * sections a freelancer arranges, case studies and templates. This is the
 * profile the cards link to, which until now was a 404.
 */

const LEVEL: Record<string, string> = {
  NEW: "Nouveau",
  LEVEL_1: "Niveau 1",
  LEVEL_2: "Niveau 2",
  TOP_RATED: "Top Rated",
};

const AVAILABILITY: Record<string, string> = {
  FULL_TIME: "Temps plein",
  PART_TIME: "Temps partiel",
  OCCASIONAL: "Occasionnelle",
  UNAVAILABLE: "Indisponible",
};

const FreelancerProfile: React.FC = () => {
  /* The route is /:handle so the address stays /@nom-utilisateur, which is
     what the specification prints and what people share. The @ is part of
     the URL, not part of the name. */
  const { handle } = useParams<{ handle: string }>();
  const username = handle?.replace(/^@/, "");
  const { t } = useI18n();

  const [data, setData] = useState<any>(null);
  const [reviews, setReviews] = useState<any>(null);
  const [failed, setFailed] = useState(false);

  const load = () => {
    setFailed(false);
    api
      .get(`/freelance/freelancers/${username}`)
      .then((r) => setData(r.data.data.freelancer))
      .catch(() => setFailed(true));

    // A separate call: the profile is useful before the reviews arrive, and
    // a slow review page should not hold the whole screen blank.
    api
      .get(`/freelance/freelancers/${username}/reviews`)
      .then((r) => setReviews(r.data.data))
      .catch(() => setReviews(null));
  };

  useEffect(load, [username]);

  if (failed)
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <ErrorState onRetry={load} />
        <p className="mt-4 text-center text-sm text-[#2B3442]/60">
          Ce profil n'existe pas ou n'est plus disponible.
        </p>
      </div>
    );

  if (!data) return <Loading />;

  const rating = data.ratingAverage === null ? null : Number(data.ratingAverage);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <header className="rounded-2xl border-2 border-[#173E7D]/15 bg-white p-6 flex flex-col sm:flex-row gap-5">
        {data.avatarUrl ? (
          <img
            src={data.avatarUrl}
            alt=""
            className="w-24 h-24 rounded-2xl object-cover shrink-0"
          />
        ) : (
          <span className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#0B1E3D] to-[#173E7D] text-white grid place-items-center font-display text-3xl shrink-0">
            {data.displayName.charAt(0).toUpperCase()}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-display font-bold text-[#173E7D] inline-flex items-center gap-2 break-words">
            {data.displayName}
            {data.identityVerified && <BadgeCheck size={20} className="text-[#173E7D]" />}
          </h1>

          {data.title && <p className="text-[#2B3442]/70 break-words">{data.title}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#2B3442]/60">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#173E7D]/8 text-[#173E7D]">
              {LEVEL[data.level] ?? data.level}
            </span>

            {/* Shown only when it exists. A freelancer with no reviews is not
                a zero-star freelancer. */}
            {rating !== null && data.ratingCount > 0 && (
              <span dir="ltr" className="inline-flex items-center gap-1 font-bold text-[#B8860B]">
                <Star size={14} fill="currentColor" />
                {rating.toFixed(1)}
                <span className="font-semibold text-[#2B3442]/40">({data.ratingCount})</span>
              </span>
            )}

            <span>{data.completedOrders} mission(s) terminée(s)</span>

            {data.wilaya && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} /> {data.wilaya}
              </span>
            )}

            <span>{AVAILABILITY[data.availability] ?? data.availability}</span>
          </div>

          {data.hourlyRate && (
            <p className="mt-3 text-sm">
              <Price value={data.hourlyRate} />
              <span className="text-[#2B3442]/50"> / heure</span>
            </p>
          )}
        </div>
      </header>

      {data.bio && (
        <section className="mt-5 rounded-2xl border-2 border-[#173E7D]/15 bg-white p-6">
          <h2 className="font-display font-bold text-[#173E7D] mb-2">À propos</h2>
          <p className="text-[#2B3442]/80 whitespace-pre-wrap break-words leading-relaxed">
            {data.bio}
          </p>
        </section>
      )}

      {data.skills.length > 0 && (
        <section className="mt-5 rounded-2xl border-2 border-[#173E7D]/15 bg-white p-6">
          <h2 className="font-display font-bold text-[#173E7D] mb-3">Compétences</h2>
          <div className="flex flex-wrap gap-1.5">
            {data.skills.map((s: string) => (
              <span
                key={s}
                className="text-xs font-semibold px-3 py-1 rounded-full bg-[#173E7D]/8 text-[#173E7D]"
              >
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {reviews && reviews.count > 0 && (
        <section className="mt-5 rounded-2xl border-2 border-[#173E7D]/15 bg-white p-6">
          <h2 className="font-display font-bold text-[#173E7D] mb-4">
            Avis ({reviews.count})
          </h2>

          {/* The three criteria, averaged. Shown only where a client
              actually filled them in — they are optional on the form. */}
          <div className="flex flex-wrap gap-x-8 gap-y-2 mb-5">
            {(
              [
                ["Qualité", reviews.breakdown.quality],
                ["Communication", reviews.breakdown.communication],
                ["Délais", reviews.breakdown.deadline],
              ] as const
            )
              .filter(([, v]) => v !== null)
              .map(([name, v]) => (
                <span key={name} className="text-sm">
                  <span className="text-[#2B3442]/50">{name} </span>
                  <span dir="ltr" className="font-bold text-[#B8860B]">
                    {Number(v).toFixed(1)}
                  </span>
                </span>
              ))}
          </div>

          <ul className="space-y-4">
            {reviews.reviews.map((r: any) => (
              <li key={r.id} className="border-t border-[#173E7D]/10 pt-4 first:border-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span dir="ltr" className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={14}
                        className={n <= r.rating ? "text-[#D4AF37]" : "text-[#173E7D]/15"}
                        fill={n <= r.rating ? "currentColor" : "none"}
                      />
                    ))}
                  </span>
                  <span className="text-sm font-semibold text-[#2B3442]">
                    {r.author?.firstName ?? "Client"}
                  </span>
                  <span className="text-xs text-[#2B3442]/40">
                    {new Date(r.createdAt).toLocaleDateString("fr-FR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {r.comment && (
                  <p className="mt-2 text-sm text-[#2B3442]/80 break-words">{r.comment}</p>
                )}

                {r.response && (
                  <p className="mt-2 ms-4 ps-3 border-s-2 border-[#173E7D]/15 text-sm text-[#2B3442]/60 break-words">
                    <strong className="text-[#173E7D]">Réponse :</strong> {r.response}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-5">
        <h2 className="text-xl font-display font-bold text-[#173E7D] mb-4">
          Services ({data.services.length})
        </h2>

        {data.services.length === 0 ? (
          <EmptyState message={t("empty.services")} />
        ) : (
          <Grid>
            {data.services.map((s: any) => (
              <ServiceTile
                key={s.id}
                service={{
                  ...s,
                  category: null,
                  deliveryDays: null,
                  freelancer: {
                    username: data.username,
                    displayName: data.displayName,
                    level: data.level,
                    verified: data.identityVerified,
                    rating: data.ratingAverage,
                    ratingCount: data.ratingCount,
                    wilaya: data.wilaya,
                    avatarUrl: data.avatarUrl,
                  },
                }}
              />
            ))}
          </Grid>
        )}
      </section>
    </div>
  );
};

export default FreelancerProfile;
