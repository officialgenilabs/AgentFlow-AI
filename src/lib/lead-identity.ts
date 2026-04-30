const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
const E164_RE = /^\+[1-9][0-9]{7,14}$/;

export function normalizeLeadEmail(value: FormDataEntryValue | string | null | undefined) {
  const next = typeof value === "string" ? value.trim().toLowerCase() : "";
  return next && EMAIL_RE.test(next) ? next : null;
}

export function normalizePhoneToE164(value: FormDataEntryValue | string | null | undefined) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;

  if (raw.startsWith("+")) {
    const digits = raw.replace(/\D/g, "");
    const normalized = `+${digits}`;
    return E164_RE.test(normalized) ? normalized : null;
  }

  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
    const normalized = `+${digits}`;
    return E164_RE.test(normalized) ? normalized : null;
  }

  if (digits.startsWith("0") && digits.length === 10) {
    const normalized = `+27${digits.slice(1)}`;
    return E164_RE.test(normalized) ? normalized : null;
  }

  if (digits.startsWith("27") && digits.length === 11) {
    const normalized = `+${digits}`;
    return E164_RE.test(normalized) ? normalized : null;
  }

  return null;
}

export function leadIdentityConfidence(email: string | null, phoneE164: string | null) {
  if (email && phoneE164) return "phone_email";
  if (phoneE164) return "phone";
  if (email) return "email";
  return "none";
}
