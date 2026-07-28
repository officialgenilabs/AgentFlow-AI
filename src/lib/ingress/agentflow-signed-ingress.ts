import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const AGENTFLOW_SIGNED_INGRESS_SCHEMA_VERSION = "1.0";
export const AGENTFLOW_SIGNED_INGRESS_MAX_BODY_BYTES = 65_536;
export const AGENTFLOW_SIGNED_INGRESS_MAX_CLOCK_SKEW_SECONDS = 300;
export const AGENTFLOW_SIGNED_INGRESS_MAX_NONCE_LENGTH = 128;
export const AGENTFLOW_SIGNED_INGRESS_SIGNATURE_PREFIX = "v1=";

export const AGENTFLOW_SIGNED_INGRESS_HEADERS = {
  keyId: "x-agentflow-key-id",
  timestamp: "x-agentflow-timestamp",
  nonce: "x-agentflow-nonce",
  signature: "x-agentflow-signature",
  schemaVersion: "x-agentflow-schema-version",
} as const;

export type IngressKeyEnvironment = "staging" | "production" | "development";

export interface IngressSigningKeyDescriptor {
  keyId: string;
  active: boolean;
  environment: IngressKeyEnvironment;
  secret: string;
}

export interface IngressSigningKeyResolver {
  resolveSigningKey(input: {
    keyId: string;
    schemaVersion: string;
    correlationId: string;
  }): Promise<IngressSigningKeyDescriptor | null>;
}

export interface SignedIngressReplayStore {
  consumeNonce(input: {
    keyId: string;
    nonce: string;
    timestamp: number;
    expiresAt: Date;
    correlationId: string;
  }): Promise<{ consumed: true } | { consumed: false; code: "replay_nonce_reused" }>;
}

export interface SignedIngressVerificationResult {
  key: IngressSigningKeyDescriptor;
  keyId: string;
  timestamp: number;
  nonce: string;
  schemaVersion: string;
  bodySha256: string;
  canonicalString: string;
}

export class IngressHttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "IngressHttpError";
    this.status = status;
    this.code = code;
  }
}

export function throwIngressError(status: number, code: string, message: string): never {
  throw new IngressHttpError(status, code, message);
}

export function isIngressHttpError(error: unknown): error is IngressHttpError {
  return error instanceof IngressHttpError;
}

export function createUnavailableSigningKeyResolver(): IngressSigningKeyResolver {
  return {
    async resolveSigningKey() {
      throwIngressError(503, "ingress_key_resolver_unavailable", "Signing key resolver is unavailable.");
    },
  };
}

export function createUnavailableReplayStore(): SignedIngressReplayStore {
  return {
    async consumeNonce() {
      throwIngressError(503, "replay_store_unavailable", "Replay store is unavailable.");
    },
  };
}

export async function readRawRequestBody(request: Request, maxBytes = AGENTFLOW_SIGNED_INGRESS_MAX_BODY_BYTES) {
  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      throwIngressError(413, "payload_too_large", "Request body exceeds maximum allowed size.");
    }

    chunks.push(value);
  }

  const rawBody = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    rawBody.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return rawBody;
}

export function enforceJsonContentType(contentType: string | null) {
  const normalized = contentType?.split(";")[0]?.trim().toLowerCase();
  if (normalized !== "application/json") {
    throwIngressError(415, "unsupported_content_type", "Only application/json requests are accepted.");
  }
}

export function sha256Hex(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function requiredHeader(headers: Headers, name: string) {
  const value = headers.get(name);
  if (value === null) {
    throwIngressError(401, "missing_critical_header", `Missing required header: ${name}.`);
  }

  if (value.includes(",")) {
    throwIngressError(400, "duplicate_critical_header", `Duplicate critical header detected: ${name}.`);
  }

  return value.trim();
}

function parseTimestamp(value: string, nowSeconds: number) {
  if (!/^(0|[1-9]\d{0,15})$/.test(value)) {
    throwIngressError(401, "malformed_timestamp", "Timestamp must be Unix epoch seconds.");
  }

  const timestamp = Number(value);
  if (!Number.isSafeInteger(timestamp)) {
    throwIngressError(401, "malformed_timestamp", "Timestamp must be a safe Unix epoch seconds value.");
  }

  if (timestamp < nowSeconds - AGENTFLOW_SIGNED_INGRESS_MAX_CLOCK_SKEW_SECONDS) {
    throwIngressError(401, "expired_timestamp", "Timestamp is outside the accepted clock-skew window.");
  }

  if (timestamp > nowSeconds + AGENTFLOW_SIGNED_INGRESS_MAX_CLOCK_SKEW_SECONDS) {
    throwIngressError(401, "future_timestamp", "Timestamp is outside the accepted clock-skew window.");
  }

  return timestamp;
}

function parseNonce(value: string) {
  if (!value || value.length > AGENTFLOW_SIGNED_INGRESS_MAX_NONCE_LENGTH || !/^[A-Za-z0-9._~:-]+$/.test(value)) {
    throwIngressError(401, "malformed_nonce", "Nonce is missing or malformed.");
  }

  return value;
}

function parseSignature(value: string) {
  if (!value.startsWith(AGENTFLOW_SIGNED_INGRESS_SIGNATURE_PREFIX)) {
    throwIngressError(401, "unsupported_signature_version", "Unsupported signature version.");
  }

  const digest = value.slice(AGENTFLOW_SIGNED_INGRESS_SIGNATURE_PREFIX.length);
  if (!/^[0-9a-f]{64}$/.test(digest)) {
    throwIngressError(401, "malformed_signature", "Signature is malformed.");
  }

  return digest;
}

function constantTimeHexEqual(expectedHex: string, receivedHex: string) {
  if (!/^[0-9a-f]{64}$/.test(expectedHex) || !/^[0-9a-f]{64}$/.test(receivedHex)) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(receivedHex, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function buildSignedIngressCanonicalString(input: {
  method: string;
  pathname: string;
  timestamp: string;
  nonce: string;
  bodySha256: string;
}) {
  return [
    input.method.toUpperCase(),
    input.pathname,
    input.timestamp,
    input.nonce,
    input.bodySha256,
  ].join("\n");
}

export function signCanonicalString(secret: string, canonicalString: string) {
  return createHmac("sha256", secret).update(canonicalString, "utf8").digest("hex");
}

export async function verifySignedIngressRequest(input: {
  request: Request;
  rawBody: Uint8Array;
  expectedMethod: "POST";
  expectedPathname: string;
  expectedEnvironment: IngressKeyEnvironment;
  correlationId: string;
  signingKeyResolver: IngressSigningKeyResolver;
  replayStore: SignedIngressReplayStore;
  now?: Date;
}): Promise<SignedIngressVerificationResult> {
  const { request, rawBody, expectedMethod, expectedPathname, expectedEnvironment, correlationId } = input;

  if (request.method.toUpperCase() !== expectedMethod) {
    throwIngressError(405, "method_not_allowed", "Only POST is accepted for this ingress endpoint.");
  }

  const url = new URL(request.url);
  if (url.pathname !== expectedPathname) {
    throwIngressError(401, "invalid_signature", "Request signature is invalid.");
  }

  const schemaVersion = requiredHeader(request.headers, AGENTFLOW_SIGNED_INGRESS_HEADERS.schemaVersion);
  if (schemaVersion !== AGENTFLOW_SIGNED_INGRESS_SCHEMA_VERSION) {
    throwIngressError(401, "schema_version_mismatch", "Unsupported signed-ingress schema version.");
  }

  const keyId = requiredHeader(request.headers, AGENTFLOW_SIGNED_INGRESS_HEADERS.keyId);
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(keyId)) {
    throwIngressError(401, "malformed_key_id", "Signing key identifier is malformed.");
  }

  const timestampText = requiredHeader(request.headers, AGENTFLOW_SIGNED_INGRESS_HEADERS.timestamp);
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);
  const timestamp = parseTimestamp(timestampText, nowSeconds);
  const nonce = parseNonce(requiredHeader(request.headers, AGENTFLOW_SIGNED_INGRESS_HEADERS.nonce));
  const receivedSignature = parseSignature(requiredHeader(request.headers, AGENTFLOW_SIGNED_INGRESS_HEADERS.signature));

  const key = await input.signingKeyResolver.resolveSigningKey({ keyId, schemaVersion, correlationId });
  if (!key) {
    throwIngressError(401, "unknown_signing_key", "Signing key was not recognized.");
  }

  if (!key.active) {
    throwIngressError(403, "inactive_signing_key", "Signing key is inactive.");
  }

  if (key.environment !== expectedEnvironment) {
    throwIngressError(403, "signing_key_environment_mismatch", "Signing key is not valid for this environment.");
  }

  if (!key.secret) {
    throwIngressError(503, "ingress_key_secret_unavailable", "Signing key material is unavailable.");
  }

  const bodySha256 = sha256Hex(rawBody);
  const canonicalString = buildSignedIngressCanonicalString({
    method: expectedMethod,
    pathname: expectedPathname,
    timestamp: timestampText,
    nonce,
    bodySha256,
  });
  const expectedSignature = signCanonicalString(key.secret, canonicalString);

  if (!constantTimeHexEqual(expectedSignature, receivedSignature)) {
    throwIngressError(401, "invalid_signature", "Request signature is invalid.");
  }

  const replayResult = await input.replayStore.consumeNonce({
    keyId,
    nonce,
    timestamp,
    expiresAt: new Date((timestamp + AGENTFLOW_SIGNED_INGRESS_MAX_CLOCK_SKEW_SECONDS) * 1000),
    correlationId,
  });

  if (!replayResult.consumed) {
    throwIngressError(401, replayResult.code, "Nonce has already been consumed.");
  }

  return {
    key,
    keyId,
    timestamp,
    nonce,
    schemaVersion,
    bodySha256,
    canonicalString,
  };
}
