import { FileAsset } from "@prisma/client";
import cvExtractionService from "./cvExtraction.service";

/**
 * Details recovered from a candidate's CV when their profile is blank.
 *
 * Most accounts never fill the profile in: every candidate on the platform
 * with a CV Maker document has User.phone null, while the CV itself carries a
 * real number. The admin panel was showing "—" for all of them.
 *
 * Nothing here is written back to the profile. It is read, labelled with where
 * it came from, and shown beside the empty field — a number typed into a CV is
 * evidence, not a verified contact detail, and silently promoting it to the
 * profile would erase that distinction.
 */

export type CvSource = "cv-maker" | "uploaded-cv";

export interface CvDerived {
  source: CvSource;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  title?: string | null;
  summary?: string | null;
  skills?: string[];
  linkedin?: string | null;
  portfolio?: string | null;
}

const clean = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
};

/**
 * Algerian mobile and landline numbers, in the shapes people actually type.
 *
 * Covers 0XXXXXXXXX, +213XXXXXXXXX and 00213…, allowing a space, dot or dash
 * between any two digits — real CVs write "07.70.37.39.41", "07 98 51 18 92"
 * and "+213 559729678", so neither the grouping nor the separators can be
 * assumed. Each pattern fixes the exact number of digits and refuses to stop
 * in the middle of a longer run, which is what keeps dates, postal codes and
 * ID numbers out: a wrong number shown with confidence is worse than none.
 */
const SEP = "[\\s.-]?";
const phone = (prefix: string, lead: string, rest: number) =>
  new RegExp(`${prefix}${SEP}${lead}(?:${SEP}\\d){${rest}}(?!\\d)`);

const PHONE_PATTERNS = [
  // +213 / 00213, then 9 digits — the national leading 0 is dropped.
  phone("(?:\\+213|00213)", "[5-7]", 8),
  // 0 + mobile prefix + 8 digits.
  phone("(?<!\\d)0", "[5-7]", 8),
  // 0 + landline area code + 7 digits.
  phone("(?<!\\d)0", "[1-4]", 7),
];

const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

/** Strips the separators, leaving digits and any leading +. */
const tidyPhone = (raw: string): string => raw.replace(/[\s.-]/g, "");

export const findPhone = (text: string): string | null => {
  for (const pattern of PHONE_PATTERNS) {
    const m = text.match(pattern);
    if (m) return tidyPhone(m[0]);
  }
  return null;
};

export const findEmail = (text: string): string | null => {
  const m = text.match(EMAIL_PATTERN);
  return m ? m[0].toLowerCase() : null;
};

/**
 * Reads what the CV Maker document holds.
 *
 * Structured and reliable — these are fields the candidate filled in, not
 * text guessed at — so it is preferred over parsing an uploaded file.
 */
export const fromCvBuilder = (data: unknown): CvDerived | null => {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;

  const skills = Array.isArray(d.skills)
    ? (d.skills as unknown[])
        .map((s) => (typeof s === "string" ? s : (s as { name?: string })?.name))
        .filter((s): s is string => Boolean(s))
    : [];

  const derived: CvDerived = {
    source: "cv-maker",
    fullName: clean(d.name),
    phone: clean(d.phone),
    email: clean(d.email),
    address: clean(d.address),
    title: clean(d.title),
    summary: clean(d.summary),
    skills,
    linkedin: clean(d.linkedin),
    portfolio: clean(d.portfolio),
  };

  // A document where the candidate typed nothing useful is not worth showing.
  const hasAnything =
    derived.fullName || derived.phone || derived.email || derived.address || skills.length;

  return hasAnything ? derived : null;
};

/**
 * Reads an uploaded CV.
 *
 * Only a phone, an email and a name are attempted. Free-form CV text has no
 * reliable structure, and pulling a job title or an address out of it would
 * mean guessing — this returns the few things a pattern can actually establish.
 */
export const fromUploadedCv = async (
  asset: Pick<FileAsset, "provider" | "publicId" | "url" | "extension">
): Promise<CvDerived | null> => {
  let text: string;
  try {
    text = await cvExtractionService.extractTextFromAsset(asset);
  } catch {
    // A .doc, a scan with no text layer, or a download that failed. The panel
    // simply shows nothing extra rather than an error about a side feature.
    return null;
  }

  if (!text?.trim()) return null;

  const phone = findPhone(text);
  const email = findEmail(text);

  // The first non-empty line is usually the name on a CV. Only taken when it
  // is short and has no digits, which rules out headers and contact lines.
  const firstLine = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 2 && l.length < 60 && !/\d/.test(l) && !l.includes("@"));

  if (!phone && !email && !firstLine) return null;

  return {
    source: "uploaded-cv",
    fullName: firstLine ?? null,
    phone,
    email,
  };
};
