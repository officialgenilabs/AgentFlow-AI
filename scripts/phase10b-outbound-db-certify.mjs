import { createClient } from "@supabase/supabase-js";

const required = [
  "SUPABASE_STAGING_URL",
  "SUPABASE_STAGING_ANON_KEY",
  "NON_ADMIN_EMAIL",
  "NON_ADMIN_PASSWORD",
  "PROPERTY24_INGRESS_SECRET",
  "PROPERTY24_DEFAULT_ORG_SLUG",
  "GOVERNED_OUTBOUND_EXECUTION_SECRET",
];

for (const key of required) {
  if (!process.env[key]) throw new Error(`${key} missing`);
}

const supabaseUrl = process.env.SUPABASE_STAGING_URL;
const anonKey = process.env.SUPABASE_STAGING_ANON_KEY;
const orgSlug = process.env.PROPERTY24_DEFAULT_ORG_SLUG;
const ingressSecret = process.env.PROPERTY24_INGRESS_SECRET;
const outboundSecret = process.env.GOVERNED_OUTBOUND_EXECUTION_SECRET;

const anon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
const user = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

const stamp = `${Math.floor(Date.now() / 1000)}-${Math.floor(Math.random() * 100000)}`;
const results = [];

function push(name, data = {}) {
  results.push({ name, ok: true, ...data });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function firstRow(value) {
  return Array.isArray(value) ? value[0] : value;
}

function safeError(error) {
  return error?.message || error?.code || String(error);
}

async function signInNonAdmin() {
  const { data, error } = await user.auth.signInWithPassword({
    email: process.env.NON_ADMIN_EMAIL,
    password: process.env.NON_ADMIN_PASSWORD,
  });
  if (error) throw new Error(`non-admin sign-in failed: ${safeError(error)}`);
  assert(data.user?.id, "non-admin auth user missing");
  push("non_admin_authenticated", { userId: data.user.id });
}

async function createDraft(label, phoneSuffix) {
  const externalLeadId = `phase10b-${label}-${stamp}`;
  const externalMessageId = `phase10b-msg-${label}-${stamp}`;
  const replayKey = `phase10b-replay-${label}-${stamp}`;
  const phone = `+270000${phoneSuffix}`;

  const { data, error } = await anon.rpc("ingest_property24_lead", {
    p_organization_slug: orgSlug,
    p_external_lead_id: externalLeadId,
    p_external_message_id: externalMessageId,
    p_full_name: `Phase10B ${label} Proof`,
    p_email: null,
    p_phone: phone,
    p_message_body: `Phase 10B governed outbound certification proof ${label}`,
    p_occurred_at: new Date().toISOString(),
    p_listing_reference: `P24-P10B-${label}`,
    p_property_title: "Governed outbound proof listing",
    p_estimated_value: 1250000,
    p_raw_payload: {
      phase: "phase_10b_governed_outbound",
      proof_label: label,
      external_lead_id: externalLeadId,
      external_message_id: externalMessageId,
    },
    p_replay_key: replayKey,
    p_ingress_secret: ingressSecret,
  });
  if (error) throw new Error(`ingest ${label} failed: ${safeError(error)}`);

  const row = firstRow(data);
  assert(row?.message_id, `ingest ${label} did not return message_id`);

  const { data: draft, error: draftError } = await user
    .from("ai_message_drafts")
    .select("id, organization_id, conversation_id, message_id, lead_id, status")
    .eq("message_id", row.message_id)
    .single();
  if (draftError) throw new Error(`draft lookup ${label} failed: ${safeError(draftError)}`);

  push("draft_generated", { label, draftId: draft.id, messageId: row.message_id });
  return draft;
}

async function reviewDraft(draft, label, outboundFrozen = false) {
  const { error } = await user.rpc("review_ai_message_draft", {
    p_draft_id: draft.id,
    p_status: "approved",
    p_draft_content: `Approved Phase 10B governed outbound proof response for ${label}.`,
    p_outbound_frozen: outboundFrozen,
  });
  if (error) throw new Error(`review ${label} failed: ${safeError(error)}`);
  push("draft_approved", { label, draftId: draft.id, outboundFrozen });
}

async function prepareDraft(draft, label, secret = outboundSecret) {
  const { data, error } = await user.rpc("send_outbound_message", {
    p_draft_id: draft.id,
    p_action: "prepare",
    p_execution_secret: secret,
  });
  if (error) throw new Error(`prepare ${label} failed: ${safeError(error)}`);
  const prepared = firstRow(data);
  assert(prepared?.can_send === true, `prepare ${label} did not return can_send`);
  push("outbound_prepared", {
    label,
    draftId: draft.id,
    messageId: prepared.message_id,
    status: prepared.message_status,
    recipientLast4: String(prepared.recipient_phone || "").slice(-4),
  });
  return prepared;
}

async function finalizeDraft(draft, label, status, extra = {}) {
  const { data, error } = await user.rpc("send_outbound_message", {
    p_draft_id: draft.id,
    p_action: "finalize",
    p_delivery_status: status,
    p_external_message_id: status === "sent" ? `phase10b-ext-${label}-${stamp}` : null,
    p_delivery_response: { phase: "phase_10b_governed_outbound", label, simulated: true, ...extra },
    p_delivery_error: status === "failed" ? `phase10b_${label}_simulated_failure` : null,
    p_execution_secret: outboundSecret,
  });
  if (error) throw new Error(`finalize ${label} ${status} failed: ${safeError(error)}`);
  const finalized = firstRow(data);
  push("outbound_finalized", { label, draftId: draft.id, status: finalized.message_status, auditEventId: finalized.audit_event_id });
  return finalized;
}

async function expectRpcError(name, callback, expected) {
  const { error } = await callback();
  assert(error, `${name} unexpectedly succeeded`);
  assert(safeError(error).includes(expected), `${name} expected ${expected}, got ${safeError(error)}`);
  push(name, { expected });
}

async function eventAndAuditProof(draftIds) {
  const { data: events, error: eventsError } = await user
    .from("automation_events")
    .select("event_type, status, payload")
    .in("aggregate_id", draftIds);
  if (eventsError) throw new Error(`automation draft event lookup failed: ${safeError(eventsError)}`);

  const { data: messageEvents, error: messageEventsError } = await user
    .from("automation_events")
    .select("event_type, status, payload")
    .eq("payload->>phase", "phase_10b_governed_outbound");
  if (messageEventsError) throw new Error(`automation message event lookup failed: ${safeError(messageEventsError)}`);

  const { data: audits, error: auditError } = await user
    .from("audit_logs")
    .select("action, metadata")
    .eq("metadata->>phase", "phase_10b_governed_outbound");
  if (auditError) throw new Error(`audit lookup failed: ${safeError(auditError)}`);

  const eventTypes = new Set([...(events || []), ...(messageEvents || [])].map((row) => row.event_type));
  const auditActions = new Set((audits || []).map((row) => row.action));

  for (const requiredEvent of ["draft.approved", "message.sent", "message.failed"]) {
    assert(eventTypes.has(requiredEvent), `missing automation event ${requiredEvent}`);
  }
  for (const requiredAction of ["ai_message_draft_approved", "outbound_message_prepared", "outbound_message_sent", "outbound_message_failed"]) {
    assert(auditActions.has(requiredAction), `missing audit action ${requiredAction}`);
  }

  push("audit_chain_verified", {
    eventTypes: [...eventTypes].sort(),
    auditActions: [...auditActions].sort(),
  });
}

async function main() {
  await signInNonAdmin();

  const successDraft = await createDraft("success", "100001");
  await reviewDraft(successDraft, "success", false);
  await prepareDraft(successDraft, "success");
  await finalizeDraft(successDraft, "success", "sent");
  await expectRpcError(
    "duplicate_prevented_after_sent",
    () => user.rpc("send_outbound_message", {
      p_draft_id: successDraft.id,
      p_action: "prepare",
      p_execution_secret: outboundSecret,
    }),
    "duplicate_send_prevented",
  );

  const failureDraft = await createDraft("failure", "100002");
  await reviewDraft(failureDraft, "failure", false);
  await prepareDraft(failureDraft, "failure");
  await finalizeDraft(failureDraft, "failure", "failed");
  await prepareDraft(failureDraft, "failure-retry");
  await finalizeDraft(failureDraft, "failure-retry", "failed", { retry: true });

  const pendingDraft = await createDraft("pending", "100003");
  await reviewDraft(pendingDraft, "pending", false);
  await prepareDraft(pendingDraft, "pending");
  await expectRpcError(
    "duplicate_prevented_while_pending",
    () => user.rpc("send_outbound_message", {
      p_draft_id: pendingDraft.id,
      p_action: "prepare",
      p_execution_secret: outboundSecret,
    }),
    "outbound_send_already_pending",
  );
  await finalizeDraft(pendingDraft, "pending", "failed");

  const frozenDraft = await createDraft("freeze", "100004");
  await reviewDraft(frozenDraft, "freeze", true);
  await expectRpcError(
    "outbound_secret_gate_enforced",
    () => user.rpc("send_outbound_message", {
      p_draft_id: frozenDraft.id,
      p_action: "prepare",
      p_execution_secret: "invalid-secret",
    }),
    "invalid_outbound_execution_secret",
  );

  await eventAndAuditProof([successDraft.id, failureDraft.id, pendingDraft.id, frozenDraft.id]);

  console.log(JSON.stringify({
    proof: "phase10b-governed-outbound-db-certification",
    stamp,
    orgSlug,
    resultCount: results.length,
    results,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ proof: "phase10b-governed-outbound-db-certification", ok: false, error: error.message }, null, 2));
  process.exit(1);
});
