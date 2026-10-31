// Playground stand-in for the email sign-in link: no email can be sent in mock
// mode, so "verify this email" marks the address verified for this browser
// session. The real flow uses Supabase magic links (useSocialAuth).
const KEY = "stadium_mock_verified_emails";

const read = (): string[] => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};

export const mockVerifiedEmails = {
  has(email: string): boolean {
    return read().includes(email.trim().toLowerCase());
  },
  add(email: string) {
    const e = email.trim().toLowerCase();
    try {
      sessionStorage.setItem(KEY, JSON.stringify([...new Set([...read(), e])]));
    } catch {
      // sessionStorage unavailable: verification lasts until reload.
    }
  },
};
