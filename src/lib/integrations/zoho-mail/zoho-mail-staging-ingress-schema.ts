import { throwIngressError } from "../../ingress/agentflow-signed-ingress";

export const ZOHO_MAIL_STAGING_SCHEMA_VERSION = "1.0";
export const ZOHO_MAIL_PROVIDER = "zoho_mail";

const HEX_64 = /^[0-9a-f]{64}$/;
const CONNECTOR_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const SYNTHETIC_CASE_ID = /^[A-Za-z0-9._:-]{1,128}$/;
const EMAIL_SHAPED = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const BOUNDED_TOKEN = /^[A-Za-z0-9._:-]{1,128}$/;

const TOP_LEVEL_FIELDS = new Set([
  "schema_version",
  "provider",
  "connector_id",
  "provider_message_id_digest",
  "provider_thread_id_digest",
  "provider_received_at",
  "mailbox",
  "recipient",
  "transport_sender_email",
  "subject",
  "lead",
  "extraction",
  "sanitization",
  "missing_fields",
  "payload_hash",
  "synthetic_case_id",
]);

const LEAD_FIELDS = new Set([
  "full_name",
  "lead_email",
  "lead_phone_original",
  "lead_phone_normalized",
  "phone_validation_state",
  "phone_region_source",
  "phone_extraction_source",
  "phone_confidence",
  "whatsapp_eligible",
  "intent",
  "area",
  "budget",
  "viewing_requested",
  "preferred_time",
]);

const EXTRACTION_FIELDS = new Set([
  "source",
  "confidence",
  "fields",
  "warnings",
]);

const SANITIZATION_FIELDS = new Set([
  "raw_body_removed",
  "html_stripped",
  "attachments_removed",
  "tokens_removed",
  "provider_ids_hashed",
  "pii_minimized",
]);

const PHONE_VALIDATION_STATES = new Set([
  "valid_e164",
  "valid_local_requires_region",
  "ambiguous_country",
  "invalid_format",
  "missing",
  "human_review_required",
]);

const PROHIBITED_KEYS = new Set([
  "raw_body",
  "email_body",
  "message_body",
  "raw_provider_response",
  "raw_payload",
  "oauth_token",
  "access_token",
  "refresh_token",
  "authorization",
  "credential",
  "password",
  "secret",
  "tenant_id",
  "organization_id",
]);

export interface ZohoMailStagingLeadEnvelope {
  full_name: string | null;
  lead_email: string | null;
  lead_phone_original: string | null;
  lead_phone_normalized: string | null;
  phone_validation_state: string;
  phone_region_source: string | null;
  phone_extraction_source: string | null;
  phone_confidence: number | null;
  whatsapp_eligible: boolean;
  intent: string | null;
  area: string | null;
  budget: string | null;
  viewing_requested: boolean | null;
  preferred_time: string | null;
}

export interface ZohoMailStagingIngressEnvelope {
  schema_version: "1.0";
  provider: "zoho_mail";
  connector_id: string;
  provider_message_id_digest: string;
  provider_thread_id_digest: string | null;
  provider_received_at: string;
  mailbox: string;
  recipient: string;
  transport_sender_email: string | null;
  subject: string;
  lead: ZohoMailStagingLeadEnvelope;
  extraction: Record<string, unknown>;
  sanitization: Record<string, boolean>;
  missing_fields: string[];
  payload_hash: string;
  synthetic_case_id: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function failSchema(code: string, message: string): never {
  throwIngressError(400, code, message);
}

function failSemantic(code: string, message: string): never {
  throwIngressError(422, code, message);
}

function scanForProhibitedKeys(value: unknown, path = "payload") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanForProhibitedKeys(entry, `${path}[${index}]`));
    return;
  }

  if (!isRecord(value)) return;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (PROHIBITED_KEYS.has(key.toLowerCase())) {
      failSemantic("prohibited_field_present", `Prohibited field is not accepted at ${path}.`);
    }
    scanForProhibitedKeys(nestedValue, `${path}.${key}`);
  }
}

function assertKnownKeys(record: Record<string, unknown>, allowed: Set<string>, label: string) {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      failSchema("unknown_field", `Unknown ${label} field is not accepted.`);
    }
  }
}

function requiredString(record: Record<string, unknown>, key: string, maxLength: number) {
  const value = record[key];
  if (typeof value !== "string") failSchema("invalid_schema", `${key} must be a string.`);
  if (value.length > maxLength) failSchema("invalid_schema", `${key} exceeds maximum length.`);
  return value;
}

function nullableString(record: Record<string, unknown>, key: string, maxLength: number) {
  const value = record[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") failSchema("invalid_schema", `${key} must be a string or null.`);
  if (value.length > maxLength) failSchema("invalid_schema", `${key} exceeds maximum length.`);
  return value;
}

function nullableBoolean(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "boolean") failSchema("invalid_schema", `${key} must be a boolean or null.`);
  return value;
}

function requiredBoolean(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (typeof value !== "boolean") failSchema("invalid_schema", `${key} must be a boolean.`);
  return value;
}

function nullableNumber(record: Record<string, unknown>, key: string, min: number, max: number) {
  const value = record[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    failSchema("invalid_schema", `${key} must be a bounded number or null.`);
  }
  return value;
}

function assertEmail(value: string, label: string) {
  if (value.length > 320 || !EMAIL_SHAPED.test(value)) {
    failSchema("invalid_schema", `${label} must be a bounded email-shaped string.`);
  }
}

function assertHex64(value: string, label: string) {
  if (!HEX_64.test(value)) failSchema("invalid_schema", `${label} must be a lowercase SHA-256 hex digest.`);
}

function validateLead(input: unknown): ZohoMailStagingLeadEnvelope {
  if (!isRecord(input)) failSchema("invalid_schema", "lead must be an object.");
  assertKnownKeys(input, LEAD_FIELDS, "lead");

  const full_name = nullableString(input, "full_name", 200);
  const lead_email = nullableString(input, "lead_email", 320);
  if (lead_email) assertEmail(lead_email, "lead.lead_email");

  const lead_phone_original = nullableString(input, "lead_phone_original", 64);
  const lead_phone_normalized = nullableString(input, "lead_phone_normalized", 32);
  const phone_validation_state = requiredString(input, "phone_validation_state", 64);
  if (!PHONE_VALIDATION_STATES.has(phone_validation_state)) {
    failSchema("invalid_schema", "phone_validation_state is unsupported.");
  }

  const lead: ZohoMailStagingLeadEnvelope = {
    full_name,
    lead_email,
    lead_phone_original,
    lead_phone_normalized,
    phone_validation_state,
    phone_region_source: nullableString(input, "phone_region_source", 64),
    phone_extraction_source: nullableString(input, "phone_extraction_source", 64),
    phone_confidence: nullableNumber(input, "phone_confidence", 0, 1),
    whatsapp_eligible: requiredBoolean(input, "whatsapp_eligible"),
    intent: nullableString(input, "intent", 160),
    area: nullableString(input, "area", 160),
    budget: nullableString(input, "budget", 160),
    viewing_requested: nullableBoolean(input, "viewing_requested"),
    preferred_time: nullableString(input, "preferred_time", 160),
  };

  if (lead.phone_validation_state === "missing") {
    if (lead.lead_phone_original !== null || lead.lead_phone_normalized !== null || lead.whatsapp_eligible !== false) {
      failSemantic("missing_phone_contract_violation", "Missing phone envelopes must not carry phone values or WhatsApp eligibility.");
    }
  }

  return lead;
}

function validateExtraction(input: unknown) {
  if (!isRecord(input)) failSchema("invalid_schema", "extraction must be an object.");
  assertKnownKeys(input, EXTRACTION_FIELDS, "extraction");

  const extraction: Record<string, unknown> = {};
  if (input.source !== undefined) extraction.source = nullableString(input, "source", 80);
  if (input.confidence !== undefined) extraction.confidence = nullableNumber(input, "confidence", 0, 1);

  for (const arrayKey of ["fields", "warnings"] as const) {
    const value = input[arrayKey];
    if (value === undefined) continue;
    if (!Array.isArray(value) || value.length > (arrayKey === "fields" ? 32 : 16)) {
      failSchema("invalid_schema", `${arrayKey} must be a bounded array.`);
    }
    extraction[arrayKey] = value.map((entry) => {
      if (typeof entry !== "string" || entry.length > (arrayKey === "fields" ? 64 : 160)) {
        failSchema("invalid_schema", `${arrayKey} entries must be bounded strings.`);
      }
      return entry;
    });
  }

  return extraction;
}

function validateSanitization(input: unknown) {
  if (!isRecord(input)) failSchema("invalid_schema", "sanitization must be an object.");
  assertKnownKeys(input, SANITIZATION_FIELDS, "sanitization");

  const sanitization: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== "boolean") failSchema("invalid_schema", "sanitization flags must be booleans.");
    sanitization[key] = value;
  }
  return sanitization;
}

function validateMissingFields(input: unknown) {
  if (!Array.isArray(input) || input.length > 32) failSchema("invalid_schema", "missing_fields must be a bounded array.");
  return input.map((entry) => {
    if (typeof entry !== "string" || entry.length > 64 || !BOUNDED_TOKEN.test(entry)) {
      failSchema("invalid_schema", "missing_fields entries must be bounded strings.");
    }
    return entry;
  });
}

export function validateZohoMailStagingIngressEnvelope(input: unknown): ZohoMailStagingIngressEnvelope {
  scanForProhibitedKeys(input);
  if (!isRecord(input)) failSchema("invalid_schema", "Request payload must be a JSON object.");
  assertKnownKeys(input, TOP_LEVEL_FIELDS, "top-level");

  const schemaVersion = requiredString(input, "schema_version", 16);
  if (schemaVersion !== ZOHO_MAIL_STAGING_SCHEMA_VERSION) {
    failSchema("unsupported_schema_version", "schema_version must be 1.0.");
  }

  const provider = requiredString(input, "provider", 32);
  if (provider !== ZOHO_MAIL_PROVIDER) failSchema("invalid_schema", "provider must be zoho_mail.");

  const connector_id = requiredString(input, "connector_id", 128);
  if (!CONNECTOR_ID.test(connector_id)) failSchema("invalid_schema", "connector_id is malformed.");

  const provider_message_id_digest = requiredString(input, "provider_message_id_digest", 64);
  assertHex64(provider_message_id_digest, "provider_message_id_digest");

  const provider_thread_id_digest = nullableString(input, "provider_thread_id_digest", 64);
  if (provider_thread_id_digest !== null) assertHex64(provider_thread_id_digest, "provider_thread_id_digest");

  const provider_received_at = requiredString(input, "provider_received_at", 64);
  if (!Number.isFinite(Date.parse(provider_received_at))) failSchema("invalid_schema", "provider_received_at must be a valid timestamp.");

  const mailbox = requiredString(input, "mailbox", 320);
  assertEmail(mailbox, "mailbox");

  const recipient = requiredString(input, "recipient", 320);
  assertEmail(recipient, "recipient");

  const transport_sender_email = nullableString(input, "transport_sender_email", 320);
  if (transport_sender_email) assertEmail(transport_sender_email, "transport_sender_email");

  const subject = requiredString(input, "subject", 500);

  const payload_hash = requiredString(input, "payload_hash", 64);
  assertHex64(payload_hash, "payload_hash");

  const synthetic_case_id = requiredString(input, "synthetic_case_id", 128);
  if (!SYNTHETIC_CASE_ID.test(synthetic_case_id)) failSchema("invalid_schema", "synthetic_case_id is malformed.");

  return {
    schema_version: "1.0",
    provider: "zoho_mail",
    connector_id,
    provider_message_id_digest,
    provider_thread_id_digest,
    provider_received_at,
    mailbox,
    recipient,
    transport_sender_email,
    subject,
    lead: validateLead(input.lead),
    extraction: validateExtraction(input.extraction),
    sanitization: validateSanitization(input.sanitization),
    missing_fields: validateMissingFields(input.missing_fields),
    payload_hash,
    synthetic_case_id,
  };
}
