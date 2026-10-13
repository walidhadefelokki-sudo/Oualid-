/**
 * The company's name, falling back to the local part of the email.
 *
 * Every recruiter who skipped the field used to end up at a company called
 * "My Company" — not a name, not unique, and nothing a candidate reading the
 * offer can recognise. The part before the @ is at least the recruiter's own
 * identifier and is usually the organisation.
 *
 * Lives here rather than in the registration controller because the Google
 * path has no form to collect a name from and has to fall back the same way.
 */
export const companyNameFrom = (companyName: unknown, email: string): string => {
  const given = typeof companyName === "string" ? companyName.trim() : "";
  if (given) return given;

  const local = email.split("@")[0]?.trim();
  return local || "Entreprise";
};
