import { createHash, createHmac } from "node:crypto";
import { createRequire } from "node:module";
import Module from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const projectRoot = process.cwd();

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      strict: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(this, path.join(projectRoot, "src", request.slice(2)), parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const route = require(path.join(projectRoot, "src/app/api/ingress/zoho-mail/staging/route.ts"));
const schema = require(path.join(projectRoot, "src/lib/integrations/zoho-mail/zoho-mail-staging-ingress-schema.ts"));

const ENDPOINT = "https://local.test/api/ingress/zoho-mail/staging";
const PATHNAME = "/api/ingress/zoho-mail/staging";
const NOW_SECONDS = 1_800_000_000;
const ACTIVE_KEY = "synthetic-active-key";
const INACTIVE_KEY = "synthetic-inactive-key";
const HMAC_MATERIAL = "synthetic-validation-material-only";
const MAILBOX = "staging-mailbox@example.test";
const RECIPIENT = "intake@example.test";
const CONNECTOR_ID = "synthetic-connector";
const DIGEST = "a".repeat(64);

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonical({ method = "POST", pathname = PATHNAME, timestamp, nonce, body }) {
  return [method.toUpperCase(), pathname, String(timestamp), nonce, sha256Hex(body)].join("\n");
}

function signature({ hmacMaterial = HMAC_MATERIAL, method = "POST", pathname = PATHNAME, timestamp, nonce, body }) {
  return `v1=${createHmac("sha256", hmacMaterial).update(canonical({ method, pathname, timestamp, nonce, body }), "utf8").digest("hex")}`;
}

function envelope(overrides = {}) {
  const base = {
    schema_version: "1.0",
    provider: "zoho_mail",
    connector_id: CONNECTOR_ID,
    provider_message_id_digest: DIGEST,
    provider_thread_id_digest: null,
    provider_received_at: "2026-07-28T00:00:00.000Z",
    mailbox: MAILBOX,
    recipient: RECIPIENT,
    transport_sender_email: "portal@example.test",
    subject: "Synthetic property enquiry",
    lead: {
      full_name: "Synthetic Lead",
      lead_email: "lead@example.test",
      lead_phone_original: "+27000000000",
      lead_phone_normalized: "+27000000000",
      phone_validation_state: "valid_e164",
      phone_region_source: "synthetic",
      phone_extraction_source: "structured_field",
      phone_confidence: 1,
      whatsapp_eligible: true,
      intent: "viewing_request",
      area: "Cape Town",
      budget: "synthetic",
      viewing_requested: true,
      preferred_time: "synthetic afternoon",
    },
    extraction: {
      source: "synthetic_harness",
      confidence: 1,
      fields: ["lead_email", "lead_phone_original"],
      warnings: [],
    },
    sanitization: {
      raw_body_removed: true,
      html_stripped: true,
      attachments_removed: true,
      tokens_removed: true,
      provider_ids_hashed: true,
      pii_minimized: true,
    },
    missing_fields: [],
    payload_hash: "b".repeat(64),
    synthetic_case_id: "zn03a-valid-synthetic",
  };
  return deepMerge(base, overrides);
}

function deepMerge(left, right) {
  if (!right || typeof right !== "object" || Array.isArray(right)) return right;
  const output = Array.isArray(left) ? [...left] : { ...left };
  for (const [key, value] of Object.entries(right)) {
    if (value && typeof value === "object" && !Array.isArray(value) && output[key] && typeof output[key] === "object" && !Array.isArray(output[key])) {
      output[key] = deepMerge(output[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function jsonBody(payload = envelope()) {
  return JSON.stringify(payload);
}

function signedRequest({
  payload = envelope(),
  body = jsonBody(payload),
  method = "POST",
  contentType = "application/json",
  keyId = ACTIVE_KEY,
  timestamp = NOW_SECONDS,
  nonce = `nonce-${Math.random().toString(16).slice(2)}`,
  hmacMaterial = HMAC_MATERIAL,
  signPathname = PATHNAME,
  signMethod = method,
  headers = {},
  duplicateKeyId = false,
} = {}) {
  const sig = signature({ hmacMaterial, method: signMethod, pathname: signPathname, timestamp, nonce, body });
  const defaultHeaders = {
    "content-type": contentType,
    "x-agentflow-key-id": keyId,
    "x-agentflow-timestamp": String(timestamp),
    "x-agentflow-nonce": nonce,
    "x-agentflow-signature": sig,
    "x-agentflow-schema-version": "1.0",
  };
  const headerPairs = Object.entries({ ...defaultHeaders, ...headers });
  if (duplicateKeyId) headerPairs.push(["x-agentflow-key-id", `${keyId}-duplicate`]);
  return new Request(ENDPOINT, { method, headers: headerPairs, body: method === "GET" ? undefined : body });
}

function syntheticDependencies(options = {}) {
  const consumed = new Set();
  const connector = {
    connector_id: CONNECTOR_ID,
    tenant_id: "synthetic-tenant-not-returned",
    environment: "staging",
    provider: "zoho_mail",
    mailbox: MAILBOX,
    allowed_recipient: RECIPIENT,
    active: true,
    signing_key_id: ACTIVE_KEY,
    default_phone_region: "ZA",
    review_owner_role: "synthetic_reviewer",
    ...(options.connector ?? {}),
  };

  return {
    now: new Date(NOW_SECONDS * 1000),
    signingKeyResolver: options.signingKeyResolver ?? {
      async resolveSigningKey({ keyId }) {
        if (keyId === ACTIVE_KEY) return { keyId, active: true, environment: "staging", secret: HMAC_MATERIAL };
        if (keyId === INACTIVE_KEY) return { keyId, active: false, environment: "staging", secret: HMAC_MATERIAL };
        return null;
      },
    },
    replayStore: options.replayStore ?? {
      async consumeNonce({ keyId, nonce }) {
        const replayKey = `${keyId}:${nonce}`;
        if (consumed.has(replayKey)) return { consumed: false, code: "replay_nonce_reused" };
        consumed.add(replayKey);
        return { consumed: true };
      },
    },
    connectorRegistry: options.connectorRegistry ?? {
      async resolveConnector() {
        return connector;
      },
    },
  };
}

async function parseResponse(response) {
  const body = await response.json();
  return { status: response.status, body };
}

async function callHandler(request, deps = syntheticDependencies()) {
  return parseResponse(await route.handleZohoMailStagingIngressRequest(request, deps));
}

async function callRealRoute(request) {
  return parseResponse(await route.POST(request));
}

const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (error) {
    results.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectCode(result, status, code) {
  assert(result.status === status, `expected status ${status}, got ${result.status}`);
  assert(result.body?.error?.code === code, `expected code ${code}, got ${result.body?.error?.code}`);
}

await test("1 unsupported method rejected", async () => {
  const result = await callHandler(new Request(ENDPOINT, { method: "GET" }));
  expectCode(result, 405, "method_not_allowed");
});

await test("2 unsupported content type rejected", async () => {
  const result = await callHandler(signedRequest({ contentType: "text/plain" }));
  expectCode(result, 415, "unsupported_content_type");
});

await test("3 empty body rejected", async () => {
  const result = await callHandler(signedRequest({ body: "" }));
  expectCode(result, 400, "empty_body");
});

await test("4 payload over 64 KiB rejected", async () => {
  const result = await callHandler(signedRequest({ body: "{" + " ".repeat(65_536) + "}" }));
  expectCode(result, 413, "payload_too_large");
});

await test("5 invalid JSON rejected", async () => {
  const result = await callHandler(signedRequest({ body: "{" }));
  expectCode(result, 400, "invalid_json");
});

await test("6 missing schema version rejected", async () => {
  const payload = envelope();
  delete payload.schema_version;
  const result = await callHandler(signedRequest({ payload }));
  expectCode(result, 400, "invalid_schema");
});

await test("7 wrong schema version rejected", async () => {
  const result = await callHandler(signedRequest({ payload: envelope({ schema_version: "2.0" }) }));
  expectCode(result, 400, "unsupported_schema_version");
});

await test("8 missing signing header rejected", async () => {
  const request = signedRequest({ headers: { "x-agentflow-key-id": "" } });
  const mutated = new Request(ENDPOINT, {
    method: "POST",
    headers: [
      ["content-type", "application/json"],
      ["x-agentflow-timestamp", request.headers.get("x-agentflow-timestamp")],
      ["x-agentflow-nonce", request.headers.get("x-agentflow-nonce")],
      ["x-agentflow-signature", request.headers.get("x-agentflow-signature")],
      ["x-agentflow-schema-version", "1.0"],
    ],
    body: jsonBody(),
  });
  const result = await callHandler(mutated);
  expectCode(result, 401, "missing_critical_header");
});

await test("9 duplicate critical header rejected where detectable", async () => {
  const result = await callHandler(signedRequest({ duplicateKeyId: true }));
  expectCode(result, 400, "duplicate_critical_header");
});

await test("10 malformed timestamp rejected", async () => {
  const result = await callHandler(signedRequest({ timestamp: "not-a-timestamp" }));
  expectCode(result, 401, "malformed_timestamp");
});

await test("11 expired timestamp rejected", async () => {
  const result = await callHandler(signedRequest({ timestamp: NOW_SECONDS - 301 }));
  expectCode(result, 401, "expired_timestamp");
});

await test("12 future timestamp rejected", async () => {
  const result = await callHandler(signedRequest({ timestamp: NOW_SECONDS + 301 }));
  expectCode(result, 401, "future_timestamp");
});

await test("13 empty nonce rejected", async () => {
  const result = await callHandler(signedRequest({ nonce: "" }));
  expectCode(result, 401, "malformed_nonce");
});

await test("14 oversized nonce rejected", async () => {
  const result = await callHandler(signedRequest({ nonce: "n".repeat(129) }));
  expectCode(result, 401, "malformed_nonce");
});

await test("15 unknown key ID rejected", async () => {
  const result = await callHandler(signedRequest({ keyId: "unknown-key" }));
  expectCode(result, 401, "unknown_signing_key");
});

await test("16 inactive key rejected", async () => {
  const result = await callHandler(signedRequest({ keyId: INACTIVE_KEY }));
  expectCode(result, 403, "inactive_signing_key");
});

await test("17 invalid signature rejected", async () => {
  const result = await callHandler(signedRequest({ headers: { "x-agentflow-signature": `v1=${"0".repeat(64)}` } }));
  expectCode(result, 401, "invalid_signature");
});

await test("18 signature body tampering rejected", async () => {
  const body = jsonBody();
  const timestamp = NOW_SECONDS;
  const nonce = "body-tamper";
  const sig = signature({ timestamp, nonce, body });
  const result = await callHandler(new Request(ENDPOINT, {
    method: "POST",
    headers: [
      ["content-type", "application/json"],
      ["x-agentflow-key-id", ACTIVE_KEY],
      ["x-agentflow-timestamp", String(timestamp)],
      ["x-agentflow-nonce", nonce],
      ["x-agentflow-signature", sig],
      ["x-agentflow-schema-version", "1.0"],
    ],
    body: jsonBody(envelope({ subject: "Tampered" })),
  }));
  expectCode(result, 401, "invalid_signature");
});

await test("19 signature path tampering rejected", async () => {
  const result = await callHandler(signedRequest({ signPathname: "/api/ingress/zoho-mail/other" }));
  expectCode(result, 401, "invalid_signature");
});

await test("20 signature timestamp tampering rejected", async () => {
  const body = jsonBody();
  const nonce = "timestamp-tamper";
  const sig = signature({ timestamp: NOW_SECONDS, nonce, body });
  const result = await callHandler(new Request(ENDPOINT, {
    method: "POST",
    headers: [
      ["content-type", "application/json"],
      ["x-agentflow-key-id", ACTIVE_KEY],
      ["x-agentflow-timestamp", String(NOW_SECONDS + 1)],
      ["x-agentflow-nonce", nonce],
      ["x-agentflow-signature", sig],
      ["x-agentflow-schema-version", "1.0"],
    ],
    body,
  }));
  expectCode(result, 401, "invalid_signature");
});

await test("21 signature nonce tampering rejected", async () => {
  const body = jsonBody();
  const sig = signature({ timestamp: NOW_SECONDS, nonce: "nonce-before", body });
  const result = await callHandler(new Request(ENDPOINT, {
    method: "POST",
    headers: [
      ["content-type", "application/json"],
      ["x-agentflow-key-id", ACTIVE_KEY],
      ["x-agentflow-timestamp", String(NOW_SECONDS)],
      ["x-agentflow-nonce", "nonce-after"],
      ["x-agentflow-signature", sig],
      ["x-agentflow-schema-version", "1.0"],
    ],
    body,
  }));
  expectCode(result, 401, "invalid_signature");
});

await test("22 first nonce accepted by synthetic adapter", async () => {
  const result = await callHandler(signedRequest({ nonce: "first-nonce" }), syntheticDependencies());
  assert(result.status === 200 && result.body.ok === true, "first nonce was not accepted");
});

await test("23 reused nonce rejected", async () => {
  const deps = syntheticDependencies();
  const first = await callHandler(signedRequest({ nonce: "reused-nonce" }), deps);
  assert(first.status === 200, "first nonce was not accepted");
  const second = await callHandler(signedRequest({ nonce: "reused-nonce" }), deps);
  expectCode(second, 401, "replay_nonce_reused");
});

await test("24 wrong provider rejected", async () => {
  const result = await callHandler(signedRequest({ payload: envelope({ provider: "other_mail" }) }));
  expectCode(result, 400, "invalid_schema");
});

await test("25 invalid mailbox rejected", async () => {
  const result = await callHandler(signedRequest({ payload: envelope({ mailbox: "not-email" }) }));
  expectCode(result, 400, "invalid_schema");
});

await test("26 wrong recipient rejected", async () => {
  const result = await callHandler(signedRequest({ payload: envelope({ recipient: "other@example.test" }) }));
  expectCode(result, 403, "connector_recipient_mismatch");
});

await test("27 connector signing-key mismatch rejected", async () => {
  const deps = syntheticDependencies({ connector: { signing_key_id: "other-key" } });
  const result = await callHandler(signedRequest(), deps);
  expectCode(result, 403, "connector_signing_key_mismatch");
});

await test("28 connector environment mismatch rejected", async () => {
  const deps = syntheticDependencies({ connector: { environment: "production" } });
  const result = await callHandler(signedRequest(), deps);
  expectCode(result, 403, "connector_environment_mismatch");
});

await test("29 request tenant_id rejected", async () => {
  const result = await callHandler(signedRequest({ payload: envelope({ tenant_id: "not-authoritative" }) }));
  expectCode(result, 422, "prohibited_field_present");
});

await test("30 request organization_id rejected", async () => {
  const result = await callHandler(signedRequest({ payload: envelope({ organization_id: "not-authoritative" }) }));
  expectCode(result, 422, "prohibited_field_present");
});

await test("31 raw_body rejected", async () => {
  const result = await callHandler(signedRequest({ payload: envelope({ raw_body: "raw body" }) }));
  expectCode(result, 422, "prohibited_field_present");
});

await test("32 email_body rejected", async () => {
  const result = await callHandler(signedRequest({ payload: envelope({ email_body: "email body" }) }));
  expectCode(result, 422, "prohibited_field_present");
});

await test("33 raw provider payload rejected", async () => {
  const result = await callHandler(signedRequest({ payload: envelope({ raw_provider_response: {} }) }));
  expectCode(result, 422, "prohibited_field_present");
});

await test("34 token or credential fields rejected", async () => {
  const result = await callHandler(signedRequest({ payload: envelope({ extraction: { credential: "nope" } }) }));
  expectCode(result, 422, "prohibited_field_present");
});

await test("35 missing-phone envelope remains valid", async () => {
  const result = await callHandler(signedRequest({
    payload: envelope({
      lead: {
        lead_phone_original: null,
        lead_phone_normalized: null,
        phone_validation_state: "missing",
        phone_confidence: null,
        whatsapp_eligible: false,
      },
      missing_fields: ["lead_phone_original"],
    }),
  }));
  assert(result.status === 200 && result.body.ok === true, "missing phone envelope was not accepted");
});

await test("36 footer contact field cannot appear as unauthorized lead field", async () => {
  const result = await callHandler(signedRequest({ payload: envelope({ lead: { signature_footer_phone: "+27000000000" } }) }));
  expectCode(result, 400, "unknown_field");
});

await test("37 transport sender remains distinct from lead email", async () => {
  const payload = envelope({ transport_sender_email: "portal@example.test", lead: { lead_email: "lead@example.test" } });
  const validated = schema.validateZohoMailStagingIngressEnvelope(payload);
  assert(validated.transport_sender_email !== validated.lead.lead_email, "transport sender and lead email collapsed");
  const result = await callHandler(signedRequest({ payload }));
  assert(result.status === 200 && result.body.ok === true, "distinct transport and lead emails were not accepted");
});

await test("38 valid synthetic envelope reaches acceptance boundary", async () => {
  const result = await callHandler(signedRequest());
  assert(result.status === 200 && result.body?.result?.status === "synthetic_envelope_accepted", "valid envelope did not reach acceptance boundary");
});

await test("39 synthetic acceptance creates zero records", async () => {
  const result = await callHandler(signedRequest());
  assert(result.body?.result?.records_created === 0, "records_created was not zero");
});

await test("40 synthetic acceptance performs zero outbound actions", async () => {
  const result = await callHandler(signedRequest());
  assert(result.body?.result?.outbound_actions === 0, "outbound_actions was not zero");
});

await test("41 real route fails without key resolver", async () => {
  const result = await callRealRoute(signedRequest({ timestamp: Math.floor(Date.now() / 1000) }));
  expectCode(result, 503, "ingress_key_resolver_unavailable");
});

await test("42 runtime route fails without replay store", async () => {
  const deps = syntheticDependencies({ replayStore: route.createUnavailableZohoMailStagingIngressDependencies().replayStore });
  const result = await callHandler(signedRequest(), deps);
  expectCode(result, 503, "replay_store_unavailable");
});

await test("43 runtime route fails without connector registry", async () => {
  const deps = syntheticDependencies({ connectorRegistry: route.createUnavailableZohoMailStagingIngressDependencies().connectorRegistry });
  const result = await callHandler(signedRequest(), deps);
  expectCode(result, 503, "connector_registry_unavailable");
});

const runtimeChangedFiles = [
  "src/app/api/ingress/zoho-mail/staging/route.ts",
  "src/lib/ingress/agentflow-signed-ingress.ts",
  "src/lib/integrations/zoho-mail/zoho-mail-staging-ingress-schema.ts",
  "src/lib/integrations/zoho-mail/zoho-mail-connector-registry.ts",
];
const changedSource = runtimeChangedFiles.map((file) => `${file}\n${readFileSync(path.join(projectRoot, file), "utf8")}`).join("\n");

await test("44 no database call occurs", async () => {
  assert(!/createClient\(|\.rpc\(|supabase\./i.test(changedSource), "database call pattern found");
});

await test("45 no external network request occurs", async () => {
  assert(!/\bfetch\s*\(/.test(changedSource), "fetch call found");
});

await test("46 no lead, contact or conversation is created", async () => {
  assert(!/ingest_lead_from_intake|ingest_inbound_message|createLead|createContact|createConversation/i.test(changedSource), "record creation pattern found");
});

await test("47 no email or WhatsApp action occurs", async () => {
  assert(!/sendEvolution|sendText|sendEmail|outbound email|message\/send|sendWhatsApp/i.test(changedSource), "outbound action pattern found");
});

const failed = results.filter((result) => !result.ok);
for (const result of results) {
  console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name}${result.ok ? "" : ` :: ${result.error}`}`);
}
console.log(JSON.stringify({ total: results.length, passed: results.length - failed.length, failed: failed.length }, null, 2));

if (failed.length > 0) process.exit(1);
