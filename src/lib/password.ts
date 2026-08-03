/**
 * Mirrors `minimum_password_length` in supabase/config.toml. Keep the two in
 * sync — this only exists so a too-short password fails legibly in the form
 * rather than as a raw GoTrue error after a round trip.
 */
export const MIN_PASSWORD_LENGTH = 6;

/** Returns an error message, or null when the pair is acceptable. */
export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== confirmation) {
    return "Passwords do not match.";
  }
  return null;
}
