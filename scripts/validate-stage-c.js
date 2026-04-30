/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const { Client } = require('pg');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectError(client, sql, params, expectedMessage) {
  const savepoint = `sp_${Math.random().toString(16).slice(2)}`;
  await client.query(`savepoint ${savepoint}`);
  try {
    await client.query(sql, params);
  } catch (error) {
    await client.query(`rollback to savepoint ${savepoint}`);
    assert(String(error.message).includes(expectedMessage), `Expected ${expectedMessage}, got ${error.message}`);
    return error.message;
  } finally {
    await client.query(`release savepoint ${savepoint}`).catch(() => undefined);
  }
  throw new Error(`Expected error ${expectedMessage}`);
}

(async () => {
  const connectionString = process.env.SUPABASE_STAGING_DB_POOLER_CONNECTION_STRING;
  if (!connectionString) throw new Error('SUPABASE_STAGING_DB_POOLER_CONNECTION_STRING missing');

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const proof = {};

  try {
    await client.query('begin');
    await client.query(`select set_config('request.jwt.claim.role', 'service_role', true)`);

    const orgs = await client.query(`
      select id, slug from public.organizations
      where slug in ('gen-i-demo-realty', 'rival-demo-realty')
      order by slug
    `);
    const demo = orgs.rows.find((row) => row.slug === 'gen-i-demo-realty');
    const rival = orgs.rows.find((row) => row.slug === 'rival-demo-realty');
    assert(demo && rival, 'Expected demo and rival tenants');
    proof.tenants = { demo: demo.slug, rival: rival.slug };

    const demoChannel = await client.query(`
      insert into public.channels (organization_id, provider, channel_type, display_name, external_channel_id, inbound_identifier, metadata)
      values ($1, 'evolution', 'whatsapp', 'Stage C WhatsApp Proof', 'stage-c-demo-channel', '+27000000000', '{"proof":"stage_c"}'::jsonb)
      on conflict (organization_id, provider, external_channel_id) where external_channel_id is not null do update
      set status = 'active', display_name = excluded.display_name
      returning id, organization_id
    `, [demo.id]);

    const rivalChannel = await client.query(`
      insert into public.channels (organization_id, provider, channel_type, display_name, external_channel_id)
      values ($1, 'evolution', 'whatsapp', 'Stage C Rival Proof', 'stage-c-rival-channel')
      on conflict (organization_id, provider, external_channel_id) where external_channel_id is not null do update
      set status = 'active', display_name = excluded.display_name
      returning id, organization_id
    `, [rival.id]);

    proof.channels = { demo: demoChannel.rows[0].id, rival: rivalChannel.rows[0].id };

    const existingLead = await client.query(`
      select * from public.ingest_lead_from_intake(
        $1, 'Stage C Existing Lead', 'manual_seed', 'validation_existing', 'crm', now(),
        'stagec-existing@example.com', '+27825550101', null, 'stage-c-existing-seed', '{"proof":"existing_seed"}'::jsonb,
        'new', 'medium', null
      )
    `, [demo.id]);
    const existingLeadId = existingLead.rows[0].lead_id;
    assert(existingLeadId, 'Expected existing lead id');

    const matchedMessage = await client.query(`
      select * from public.ingest_inbound_message(
        $1, 'wa-existing-thread', 'wa-existing-msg-1', 'Hi, I am checking on the listing.', now(),
        'Stage C Existing Lead', '+27 82 555 0101', 'stagec-existing@example.com', '27825550101@s.whatsapp.net', '{"proof":"matched_existing"}'::jsonb
      )
    `, [demoChannel.rows[0].id]);
    assert(matchedMessage.rows[0].lead_id === existingLeadId, 'Inbound message did not attach to existing lead');
    assert(matchedMessage.rows[0].intake_action === 'matched_existing', 'Expected matched_existing intake action');
    proof.correct_lead_attachment = matchedMessage.rows[0];

    const newLeadMessage = await client.query(`
      select * from public.ingest_inbound_message(
        $1, 'wa-new-thread', 'wa-new-msg-1', 'Hello, please send me more details.', now(),
        'Stage C New Lead', '+27 82 555 0202', 'stagec-new@example.com', '27825550202@s.whatsapp.net', '{"proof":"created_new"}'::jsonb
      )
    `, [demoChannel.rows[0].id]);
    assert(newLeadMessage.rows[0].lead_id, 'Expected new lead id');
    assert(newLeadMessage.rows[0].intake_action === 'created', 'Expected new lead creation via intake RPC');
    assert(newLeadMessage.rows[0].conversation_action === 'created', 'Expected conversation creation');
    proof.new_lead_creation_via_intake = newLeadMessage.rows[0];

    const events = await client.query(`
      select event_type, lead_id, conversation_id, message_id, status
      from public.automation_events
      where organization_id = $1
        and conversation_id in ($2, $3)
      order by created_at asc
    `, [demo.id, matchedMessage.rows[0].conversation_id, newLeadMessage.rows[0].conversation_id]);
    const eventTypes = events.rows.map((row) => row.event_type);
    assert(eventTypes.includes('message.received'), 'Missing message.received event');
    assert(eventTypes.includes('conversation.created'), 'Missing conversation.created event');
    proof.automation_events = events.rows;

    const mismatchLead = await client.query(`
      select * from public.ingest_lead_from_intake(
        $1, 'Stage C Rival Lead', 'manual_seed', 'validation_rival', 'crm', now(),
        'stagec-rival@example.com', '+27825550303', null, 'stage-c-rival-seed', '{"proof":"rival_seed"}'::jsonb,
        'new', 'medium', null
      )
    `, [rival.id]);

    proof.cross_org_conversation_link_blocked = await expectError(client, `
      insert into public.conversations (organization_id, channel_id, lead_id, external_conversation_id)
      values ($1, $2, $3, 'illegal-cross-org-thread')
    `, [demo.id, demoChannel.rows[0].id, mismatchLead.rows[0].lead_id], 'conversation_lead_must_match_organization');

    proof.cross_org_channel_context_blocked = await expectError(client, `
      insert into public.conversations (organization_id, channel_id, external_conversation_id)
      values ($1, $2, 'illegal-channel-thread')
    `, [demo.id, rivalChannel.rows[0].id], 'conversation_must_inherit_channel_organization');

    await client.query(`select set_config('app.ingestion_context', '', true)`);

    proof.direct_message_insert_blocked = await expectError(client, `
      insert into public.messages (organization_id, channel_id, conversation_id, lead_id, body)
      values ($1, $2, $3, $4, 'This should not insert directly')
    `, [demo.id, demoChannel.rows[0].id, newLeadMessage.rows[0].conversation_id, newLeadMessage.rows[0].lead_id], 'messages_must_use_ingest_inbound_message');

    const isolation = await client.query(`
      select
        (select count(*)::int from public.conversations where organization_id = $1) as demo_conversations,
        (select count(*)::int from public.conversations where organization_id = $2) as rival_conversations,
        (select count(*)::int from public.messages m join public.conversations c on c.id = m.conversation_id where m.organization_id <> c.organization_id) as mismatched_message_orgs
    `, [demo.id, rival.id]);
    assert(isolation.rows[0].mismatched_message_orgs === 0, 'Found mismatched message orgs');
    proof.cross_org_isolation_counts = isolation.rows[0];

    await client.query('rollback');

    await client.query('begin');
    const rollbackSql = fs.readFileSync('supabase/rollback/20260430_stage_c_conversations_inbox_rollback.sql', 'utf8');
    await client.query(rollbackSql);
    const rollbackCheck = await client.query(`
      select count(*)::int as remaining
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ('channels','conversations','messages','automation_events')
    `);
    assert(rollbackCheck.rows[0].remaining === 0, 'Rollback dry-run did not remove Stage C tables inside transaction');
    await client.query('rollback');
    proof.rollback_safety = { dry_run_transaction: 'passed', stage_c_tables_removed_inside_tx: true, rollback_reverted: true };

    const liveCheck = await client.query(`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in ('channels','conversations','messages','automation_events')
      order by table_name
    `);
    proof.live_schema_after_rollback_dry_run = liveCheck.rows.map((row) => row.table_name);

    console.log(JSON.stringify(proof, null, 2));
  } finally {
    await client.end();
  }
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
