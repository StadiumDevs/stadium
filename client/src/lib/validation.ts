// keep in sync with server/api/utils/validation.js — no runtime sharing across the server/client split

export function validateEmail(email: string): { valid: boolean; error?: string; normalised?: string } {
  if (typeof email !== "string") return { valid: false, error: "email must be a string" };
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > 254) {
    return { valid: false, error: "email must be 1–254 characters" };
  }
  const emailRe = /^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/;
  if (!emailRe.test(trimmed)) {
    return { valid: false, error: "email must be a valid email address" };
  }
  return { valid: true, normalised: trimmed };
}
