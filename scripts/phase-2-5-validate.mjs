import { readFileSync } from "node:fs";
import { Client } from "pg";

function loadEnv(path) {
  const env = readFileSync(path, "utf8");
  for (const line of env.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    process.env[key] ||= value;
  }
}

const envPath = process.argv[2] || "/root/.openclaw/credentials/supabase-agentflow-staging.env";
loadEnv(envPath);

const connectionString = process.env.SUPABASE_STAGING_DB_POOLER_CONNECTION_STRING || process.env.SUPABASE_STAGING_DB_CONNECTION_STRING;
if (!connectionString) throw new Error("Missing Supabase staging DB connection string");

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
const proofs = [];

function ok(name, details = "pass") {
  proofs.push({ name, details });
  console.log(`✓ ${name}: ${details}`);
}

async function expectSqlState(name, code, fn) {
  await client.query(`savepoint ${name}`);
  try {
    await fn();
  } catch (error) {
    await client.query(`rollback to savepoint ${name}`);
    if (error.code !== code) throw new Error(`${name}: expected SQLSTATE ${code}, got ${error.code || error.message}`);
    ok(name, `blocked with SQLSTATE ${code}`);
    return;
  }
  await client.query(`rollback to savepoint ${name}`);
  throw new Error(`${name}: expected SQLSTATE ${code}, but statement succeeded`);
}

async function one(sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows[0];
}

try {
  await client.connect();

  const demo = await one("select id from public.organizations where slug = 'gen-i-demo-realty'");
  const rival = await one("select id from public.organizations where slug = 'rival-demo-realty'");
  if (!demo?.id || !rival?.id) throw new Error("Expected demo and rival staging organizations");

  const duplicateScan = await client.query(`
    select 'phone' as kind, organization_id, normalized_phone_e164 as identity, count(*)
    from public.leads
    where normalized_phone_e164 is not null
    group by organization_id, normalized_phone_e164
    having count(*) > 1
    union all
    select 'email' as kind, organization_id, normalized_email as identity, count(*)
    from public.leads
    where normalized_email is not null
    group by organization_id, normalized_email
    having count(*) > 1
  `);
  if (duplicateScan.rowCount !== 0) throw new Error(`Existing duplicate normalized identities found: ${JSON.stringify(duplicateScan.rows)}`);
  ok("preflight existing duplicate scan", "no duplicate normalized identities in staging");

  await client.query("begin");
  await client.query("select set_config('request.jwt.claim.role', 'service_role', true)");

  const base = await one(
    `insert into public.leads (organization_id, full_name, email, phone, exact_source, source_subtype, original_inbound_channel, captured_at, lead_origin_metadata)
     values ($1, 'Phase25 Base', 'Phase25.Dedupe@Example.COM', '082 123 4567', 'phase_2_5_validation', 'dedupe_base', 'validation_sql', now(), '{"test":true}'::jsonb)
     returning id, email, phone, normalized_email, normalized_phone_e164, identity_confidence`,
    [demo.id],
  );

  if (base.email !== "phase25.dedupe@example.com" || base.normalized_email !== "phase25.dedupe@example.com" || base.normalized_phone_e164 !== "+27821234567" || base.identity_confidence !== "phone_email") {
    throw new Error(`Unexpected normalization result: ${JSON.stringify(base)}`);
  }
  ok("normalization proof", `${base.email} / ${base.normalized_phone_e164} / ${base.identity_confidence}`);

  await expectSqlState("dup_phone", "23505", () =>
    client.query(
      `insert into public.leads (organization_id, full_name, email, phone, exact_source, source_subtype, original_inbound_channel, captured_at)
       values ($1, 'Phase25 Dup Phone', 'phase25.phone2@example.com', '+27 82 123 4567', 'phase_2_5_validation', 'dup_phone', 'validation_sql', now())`,
      [demo.id],
    ),
  );

  await expectSqlState("dup_email", "23505", () =>
    client.query(
      `insert into public.leads (organization_id, full_name, email, phone, exact_source, source_subtype, original_inbound_channel, captured_at)
       values ($1, 'Phase25 Dup Email', 'PHASE25.DEDUPE@example.com', '+27831234567', 'phase_2_5_validation', 'dup_email', 'validation_sql', now())`,
      [demo.id],
    ),
  );

  const crossOrg = await one(
    `insert into public.leads (organization_id, full_name, email, phone, exact_source, source_subtype, original_inbound_channel, captured_at)
     values ($1, 'Phase25 Cross Org Same Identity', 'phase25.dedupe@example.com', '+27821234567', 'phase_2_5_validation', 'cross_org', 'validation_sql', now())
     returning id, organization_id, normalized_email, normalized_phone_e164`,
    [rival.id],
  );
  if (!crossOrg?.id) throw new Error("Cross-org same identity insert failed");
  ok("cross-org duplicate isolation proof", "same normalized phone/email allowed in rival org only");

  const blankMatch = await client.query("select * from app_private.find_lead_identity_match($1, '', '')", [demo.id]);
  const weakMatch = await client.query("select * from app_private.find_lead_identity_match($1, 'not-an-email', '12345')", [demo.id]);
  if (blankMatch.rowCount !== 0 || weakMatch.rowCount !== 0) throw new Error("Blank/weak identity produced a match");
  ok("weak identity safety proof", "blank and weak fields return zero matches");

  const phoneMatch = await one("select * from app_private.find_lead_identity_match($1, null, '+27 82 123 4567')", [demo.id]);
  const emailMatch = await one("select * from app_private.find_lead_identity_match($1, 'PHASE25.DEDUPE@EXAMPLE.COM', null)", [demo.id]);
  if (phoneMatch?.lead_id !== base.id || phoneMatch.match_rule !== "normalized_phone_e164") throw new Error(`Phone match failed: ${JSON.stringify(phoneMatch)}`);
  if (emailMatch?.lead_id !== base.id || emailMatch.match_rule !== "normalized_email") throw new Error(`Email match failed: ${JSON.stringify(emailMatch)}`);
  ok("lead matching correctness proof", "strong phone/email match the intended same-org lead");

  const conflict = await one(
    `insert into public.leads (organization_id, full_name, email, phone, exact_source, source_subtype, original_inbound_channel, captured_at)
     values ($1, 'Phase25 Conflict', 'phase25.conflict@example.com', '+27831234567', 'phase_2_5_validation', 'conflict', 'validation_sql', now())
     returning id`,
    [demo.id],
  );
  if (!conflict?.id) throw new Error("Conflict fixture insert failed");
  await expectSqlState("conflict_match", "P0001", () =>
    client.query("select * from app_private.find_lead_identity_match($1, 'phase25.dedupe@example.com', '+27831234567')", [demo.id]),
  );

  const ingestMatch = await one(
    `select * from public.ingest_lead_from_intake(
      p_organization_id => $1,
      p_full_name => 'Phase25 Intake Duplicate',
      p_exact_source => 'external_webhook_validation',
      p_source_subtype => 'canonical_intake_v1',
      p_original_inbound_channel => 'validation_rpc',
      p_captured_at => now(),
      p_email => 'phase25.dedupe@example.com',
      p_phone => '+27821234567',
      p_lead_origin_metadata => '{"validation":true}'::jsonb
    )`,
    [demo.id],
  );
  if (ingestMatch?.lead_id !== base.id || ingestMatch.intake_action !== "matched_existing") throw new Error(`Canonical ingest did not match existing lead: ${JSON.stringify(ingestMatch)}`);
  ok("canonical intake idempotency proof", `${ingestMatch.intake_action} via ${ingestMatch.match_rule}`);

  await client.query("rollback");

  await client.query("begin");
  await client.query("select set_config('request.jwt.claim.role', 'service_role', true)");
  const demoLead = await one(
    `insert into public.leads (organization_id, full_name, email, phone, exact_source, source_subtype, original_inbound_channel, captured_at)
     values ($1, 'Phase25 RLS Demo', 'phase25.rls.demo@example.com', '+27845550101', 'phase_2_5_validation', 'rls_demo', 'validation_sql', now()) returning id`,
    [demo.id],
  );
  await one(
    `insert into public.leads (organization_id, full_name, email, phone, exact_source, source_subtype, original_inbound_channel, captured_at)
     values ($1, 'Phase25 RLS Rival', 'phase25.rls.rival@example.com', '+27845550102', 'phase_2_5_validation', 'rls_rival', 'validation_sql', now()) returning id`,
    [rival.id],
  );
  const agent = await one("select id from public.profiles where email = 'agent.stagea@genilabs.ai'");
  if (!agent?.id) throw new Error("Expected non-admin staging profile");
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [agent.id]);
  await client.query("select set_config('request.jwt.claim.role', 'authenticated', true)");
  const visibleDemo = await one("select count(*)::int as count from public.leads where id = $1", [demoLead.id]);
  const visibleRival = await one("select count(*)::int as count from public.leads where organization_id = $1", [rival.id]);
  if (visibleDemo.count !== 1 || visibleRival.count !== 0) throw new Error(`RLS isolation failed: demo=${visibleDemo.count} rival=${visibleRival.count}`);
  ok("cross-org RLS proof", "non-admin sees demo lead and zero rival-org leads");
  await client.query("rollback");

  const rollbackSql = readFileSync("supabase/rollback/20260430_phase_2_5_lead_identity_intake_bridge_rollback.sql", "utf8");
  await client.query("begin");
  await client.query(rollbackSql);
  const rollbackColumns = await client.query(`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'leads'
      and column_name in ('normalized_email', 'normalized_phone_e164', 'identity_confidence')
  `);
  const rollbackFunction = await client.query("select to_regprocedure('public.ingest_lead_from_intake(uuid,text,text,text,text,timestamp with time zone,text,text,text,text,jsonb,text,text,numeric)') as reg");
  if (rollbackColumns.rowCount !== 0 || rollbackFunction.rows[0].reg !== null) throw new Error("Rollback dry-run did not remove Phase 2.5 objects");
  await client.query("rollback");
  ok("rollback safety proof", "Phase 2.5 rollback executes inside transaction and rolls back cleanly");

  const postRollbackCheck = await client.query(`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'leads'
      and column_name in ('normalized_email', 'normalized_phone_e164', 'identity_confidence')
  `);
  if (postRollbackCheck.rowCount !== 3) throw new Error("Rollback dry-run changed live schema unexpectedly");
  ok("rollback non-destructive proof", "live Phase 2.5 columns remained after rollback dry-run");

  console.log(`\nPhase 2.5 validation complete (${proofs.length} proofs).`);
} finally {
  await client.end();
}
