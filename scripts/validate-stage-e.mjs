import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

function loadEnv(path) {
  const env = readFileSync(path, "utf8");
  for (const line of env.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] ||= value;
  }
}

loadEnv("/root/.openclaw/credentials/supabase-agentflow-staging.env");
loadEnv("/root/.openclaw/credentials/agentflow-staging-users.env");

const connectionString = process.env.SUPABASE_STAGING_DB_POOLER_CONNECTION_STRING || process.env.SUPABASE_STAGING_DB_CONNECTION_STRING;
if (!connectionString) throw new Error("Missing Supabase staging connection string");

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

async function one(sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows[0] ?? null;
}

async function setAuth(userId) {
  await client.query("select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', 'authenticated', false)", [userId]);
}

async function expectError(label, fn, expectedFragment) {
  try {
    await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes(expectedFragment)) {
      throw new Error(`${label}: expected ${expectedFragment}, received ${message}`);
    }
    return message;
  }
  throw new Error(`${label}: expected error ${expectedFragment}`);
}

async function ensureChannel(orgId, suffix) {
  const externalId = `stage-e-${suffix}-channel`;
  const existing = await one(
    "select id from public.channels where organization_id = $1 and provider = 'evolution' and external_channel_id = $2 limit 1",
    [orgId, externalId],
  );
  if (existing) return existing.id;

  const inserted = await one(
    `insert into public.channels (organization_id, provider, channel_type, display_name, external_channel_id, inbound_identifier, metadata)
     values ($1, 'evolution', 'whatsapp', $2, $3, '+27000000000', '{"evolution_instance":"AgentFlow_Primary","proof":"stage_e"}'::jsonb)
     returning id`,
    [orgId, `Stage E ${suffix} Proof`, externalId],
  );
  return inserted.id;
}

async function createInbound(channelId, phone, name, body) {
  const externalId = `stage-e-${randomUUID()}`;
  const result = await one(
    `select * from public.ingest_inbound_message(
      $1::uuid,
      $2,
      $3,
      $4,
      now(),
      $5,
      $6,
      null,
      $6,
      jsonb_build_object('proof', 'stage_e', 'external_id', $3::text)
    )`,
    [channelId, `${phone.replace(/[^0-9]/g, "")}@s.whatsapp.net`, externalId, body, name, phone],
  );

  const draft = await one(
    `select d.id, d.conversation_id, d.message_id
     from public.ai_message_drafts d
     where d.message_id = $1
     limit 1`,
    [result.message_id],
  );

  if (!draft) throw new Error("draft_not_created_for_inbound");
  return { ...result, draft_id: draft.id };
}

(async () => {
  await client.connect();
  try {
    const founder = await one("select id from public.profiles where email = $1", [process.env.FOUNDER_EMAIL]);
    const nonAdmin = await one("select id from public.profiles where email = $1", [process.env.NON_ADMIN_EMAIL]);
    const demoOrg = await one("select id from public.organizations where slug = 'gen-i-demo-realty'");
    const rivalOrg = await one("select id from public.organizations where slug = 'rival-demo-realty'");

    if (!founder?.id || !nonAdmin?.id || !demoOrg?.id || !rivalOrg?.id) throw new Error("missing_validation_users_or_orgs");

    const demoChannelId = await ensureChannel(demoOrg.id, "demo");
    const rivalChannelId = await ensureChannel(rivalOrg.id, "rival");

    const noApproval = await createInbound(
      demoChannelId,
      "+278200000001",
      "Stage E No Approval",
      "Hi, I want to book a viewing before this weekend.",
    );

    await setAuth(founder.id);
    const noApprovalError = await expectError(
      "no send without approval",
      () => client.query("select * from public.send_outbound_message($1::uuid, 'prepare')", [noApproval.draft_id]),
      "outbound_draft_must_be_approved",
    );

    const noAutoSend = await one(
      "select count(*)::int as count from public.messages where direction = 'outbound' and raw_payload->>'draft_id' = $1",
      [noApproval.draft_id],
    );
    if (noAutoSend.count !== 0) throw new Error("unexpected_outbound_without_approval");

    const approved = await createInbound(
      demoChannelId,
      "+278200000002",
      "Stage E Approved Send",
      "I’m interested in the 3 bedroom property in Sandton. Can we view it tomorrow?",
    );

    await client.query(
      `update public.ai_message_drafts
       set status = 'approved', approved_by_user_id = $2, approved_at = now(), draft_content = 'Stage E controlled send validation reply.'
       where id = $1`,
      [approved.draft_id, founder.id],
    );

    const prepared = await one("select * from public.send_outbound_message($1::uuid, 'prepare')", [approved.draft_id]);
    if (prepared.message_status !== "pending" || !prepared.can_send) throw new Error("prepare_did_not_create_pending_message");

    const failed = await one(
      "select * from public.send_outbound_message($1::uuid, 'finalize', 'failed', null, $2::jsonb, 'stage_e_forced_failure')",
      [approved.draft_id, JSON.stringify({ proof: "forced_failure" })],
    );
    if (failed.message_status !== "failed") throw new Error("failed_send_not_marked_failed");

    const retried = await one("select * from public.send_outbound_message($1::uuid, 'prepare')", [approved.draft_id]);
    if (retried.message_status !== "pending" || retried.message_id !== prepared.message_id) throw new Error("manual_retry_did_not_reuse_pending_message");

    const sent = await one(
      "select * from public.send_outbound_message($1::uuid, 'finalize', 'sent', $2, $3::jsonb, null)",
      [approved.draft_id, `stage-e-${randomUUID()}`, JSON.stringify({ proof: "mock_evolution_success", status: "PENDING" })],
    );
    if (sent.message_status !== "sent" || !sent.audit_event_id) throw new Error("sent_finalize_missing_audit");

    const duplicateError = await expectError(
      "duplicate send prevention",
      () => client.query("select * from public.send_outbound_message($1::uuid, 'prepare')", [approved.draft_id]),
      "duplicate_send_prevented",
    );

    const directInsertError = await expectError(
      "direct outbound insert blocked",
      () => client.query(
        `insert into public.messages (organization_id, channel_id, conversation_id, lead_id, direction, sender_type, body, status, raw_payload)
         values ($1, $2, $3, $4, 'outbound', 'agent', 'Direct insert should fail', 'pending', jsonb_build_object('draft_id', $5::text))`,
        [sent.organization_id, sent.channel_id, sent.conversation_id, sent.lead_id, approved.draft_id],
      ),
      "outbound_messages_must_use_send_outbound_message",
    );

    const rival = await createInbound(
      rivalChannelId,
      "+278200000003",
      "Stage E Rival Block",
      "Please send me details on this listing.",
    );
    await client.query(
      `update public.ai_message_drafts
       set status = 'approved', approved_by_user_id = $2, approved_at = now(), draft_content = 'Rival org send should be blocked.'
       where id = $1`,
      [rival.draft_id, founder.id],
    );

    await setAuth(nonAdmin.id);
    const crossOrgError = await expectError(
      "cross-org send blocked",
      () => client.query("select * from public.send_outbound_message($1::uuid, 'prepare')", [rival.draft_id]),
      "org_access_required",
    );

    const uiThread = await one(
      `select count(*)::int as count
       from public.messages
       where conversation_id = $1
         and direction = 'outbound'
         and status = 'sent'
         and body = 'Stage E controlled send validation reply.'`,
      [sent.conversation_id],
    );
    if (uiThread.count !== 1) throw new Error("sent_message_not_visible_in_thread_query");

    const audit = await one(
      `select count(*)::int as count
       from public.automation_events
       where event_type = 'message.sent'
         and message_id = $1
         and payload->>'user_id' = $2`,
      [sent.message_id, founder.id],
    );
    if (audit.count < 2) throw new Error("message_sent_audit_events_missing");

    console.log(JSON.stringify({
      ok: true,
      noApprovalError,
      duplicateError,
      directInsertError,
      crossOrgError,
      preparedMessageId: prepared.message_id,
      failedThenRetriedMessageId: retried.message_id,
      sentMessageId: sent.message_id,
      auditEventsForMessage: audit.count,
      uiThreadSentRows: uiThread.count,
    }, null, 2));
  } finally {
    await client.end();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
