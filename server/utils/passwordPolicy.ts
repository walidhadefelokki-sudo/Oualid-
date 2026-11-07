/**
 * What counts as an acceptable password.
 *
 * One place, so the self-service change, the administrator reset and the
 * create-admin script cannot drift into three different standards — the kind
 * of difference nobody notices until the weakest one is the way in.
 *
 * Deliberately a length floor rather than a character-class rule. Requiring a
 * symbol and a digit pushes people towards Password1! and no further;
 * length is what actually costs an attacker.
 */

export const MIN_PASSWORD_LENGTH = 10;

export interface PasswordCheck {
  ok: boolean;
  message?: string;
}

export const checkPassword = (value: unknown): PasswordCheck => {
  if (typeof value !== "string" || !value) {
    return { ok: false, message: "Mot de passe manquant." };
  }
  if (value.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`,
    };
  }
  if (value.trim().length === 0) {
    return { ok: false, message: "Le mot de passe ne peut pas être composé d'espaces." };
  }
  return { ok: true };
};
