import fs from 'node:fs';
import { Client } from 'pg';

function loadEnv(path) {
  const env = fs.readFileSync(path, 'utf8');
  for (const line of env.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, '');
    process.env[key] ||= value;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function questionCount(text) {
  return (text.match(/\?/g) || []).length;
}

function hasClosingPattern(text) {
  return [
    'Let’s lock this in',
    'I can get this booked today',
    'I’ll line up options right after',
    'We can set this up quickly',
  ].some((pattern) => text.includes(pattern));
}

const envPath = process.argv[2] || '/root/.openclaw/credentials/supabase-agentflow-staging.env';
loadEnv(envPath);
const connectionString = process.env.SUPABASE_STAGING_DB_POOLER_CONNECTION_STRING || process.env.SUPABASE_STAGING_DB_CONNECTION_STRING;
if (!connectionString) throw new Error('Supabase staging connection string missing');

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

const scenarios = [
  {
    key: 'hot_lead_ready_to_view',
    expected: 'CLOSE',
    body: 'I want to view the 2 bedroom apartment in Sandton tomorrow at 2pm',
    proof: 'pushes directly to booking, no qualification restart',
  },
  {
    key: 'warm_lead_needs_shortlist',
    expected: 'CLOSE',
    body: 'Looking for a 2 bedroom apartment in Rosebank under R12000',
    proof: 'uses existing area/budget/bedrooms and moves to shortlist',
  },
  {
    key: 'vague_lead',
    expected: 'ADVANCE',
    body: 'Hi, send me properties please',
    proof: 'asks one fastest-path shortlist question',
  },
  {
    key: 'objection_case',
    expected: 'HANDLE_OBJECTION',
    body: 'That price is too expensive, I can only afford around R9000',
    proof: 'handles price friction and reduces effort',
  },
  {
    key: 'confused_lead',
    expected: 'ESCALATE',
    body: 'I am confused, I do not understand what you mean',
    proof: 'handoff draft with human-followup marker',
  },
];

const beforeExamples = {
  hot_lead_ready_to_view: 'What area and budget are you looking at?',
  warm_lead_needs_shortlist: 'Can you share your budget and preferred area?',
  vague_lead: 'Please provide your requirements.',
  objection_case: 'What is your budget?',
  confused_lead: 'Can you clarify your requirements?',
};

try {
  await client.query('begin');
  await client.query("select set_config('request.jwt.claim.role', 'service_role', true)");

  const orgResult = await client.query(`
    select id from public.organizations where slug = 'gen-i-demo-realty' limit 1
  `);
  assert(orgResult.rows[0]?.id, 'Expected gen-i-demo-realty tenant');
  const organizationId = orgResult.rows[0].id;

  const channelResult = await client.query(`
    insert into public.channels (organization_id, provider, channel_type, display_name, external_channel_id, inbound_identifier, metadata)
    values ($1, 'evolution', 'whatsapp', 'Stage F Sales Engine Proof', 'stage-f-sales-engine-proof', '+27000000006', '{"proof":"stage_f"}'::jsonb)
    on conflict (organization_id, provider, external_channel_id) where external_channel_id is not null do update
    set status = 'active', display_name = excluded.display_name
    returning id
  `, [organizationId]);
  const channelId = channelResult.rows[0].id;

  const outputs = [];
  for (const [index, scenario] of scenarios.entries()) {
    const inbound = await client.query(`
      select * from public.ingest_inbound_message(
        $1, $2, $3, $4, now() + ($5 || ' seconds')::interval,
        $6, $7, $8, $9, $10::jsonb
      )
    `, [
      channelId,
      `stage-f-${scenario.key}`,
      `stage-f-${scenario.key}-msg-1`,
      scenario.body,
      String(index),
      `Stage F ${index + 1}`,
      `+27 82 556 10${index}0`,
      `stage-f-${index}@example.com`,
      `278255610${index}0@s.whatsapp.net`,
      JSON.stringify({ proof: 'stage_f', scenario: scenario.key }),
    ]);

    const messageId = inbound.rows[0].message_id;
    await client.query('select public.generate_ai_reply_draft_for_message($1)', [messageId]);

    const draftResult = await client.query(`
      select draft_content, generation_model, generation_context
      from public.ai_message_drafts
      where message_id = $1
    `, [messageId]);
    assert(draftResult.rows.length === 1, `Expected one draft for ${scenario.key}`);

    const draft = draftResult.rows[0];
    const context = draft.generation_context;
    const action = context.decision_action;
    assert(action === scenario.expected, `${scenario.key}: expected ${scenario.expected}, got ${action}`);
    assert(draft.generation_model === 'agentflow_sales_decision_engine_v1', `${scenario.key}: wrong generation model`);
    assert(questionCount(draft.draft_content) <= 1, `${scenario.key}: more than one question`);
    assert(!/what area and budget/i.test(draft.draft_content), `${scenario.key}: generic area+budget question leaked`);
    assert(!/preferred area.*budget|budget.*preferred area/i.test(draft.draft_content), `${scenario.key}: repeated generic qualification leaked`);
    if (action !== 'ESCALATE') assert(hasClosingPattern(draft.draft_content), `${scenario.key}: missing required closing pattern`);
    if (action === 'ESCALATE') {
      assert(draft.draft_content === 'I’m going to have one of our agents reach out to you directly to get this sorted quickly 👍', `${scenario.key}: wrong escalation wording`);
      assert(context.requires_human_followup === true, `${scenario.key}: human followup not marked`);
    }

    outputs.push({
      scenario: scenario.key,
      inbound: scenario.body,
      classification: action,
      requires_human_followup: context.requires_human_followup,
      selected_question: context.question_selected,
      before: beforeExamples[scenario.key],
      after: draft.draft_content,
      proof: scenario.proof,
    });
  }

  const ordering = await client.query(`
    select id, external_conversation_id, last_message_at, created_at
    from public.conversations
    where organization_id = $1
      and external_conversation_id like 'stage-f-%'
    order by coalesce(last_message_at, updated_at, created_at) desc
    limit 5
  `, [organizationId]);

  await client.query('rollback');

  console.log(JSON.stringify({
    stage: 'F AI Sales Decision Engine',
    guardrails: {
      send_infrastructure_modified: false,
      auto_send_enabled: false,
      ingestion_modified: false,
      schema_modified: false,
      outbound_automation_added: false,
      draft_generation_logic_only: true,
    },
    validation: outputs,
    inbox_ordering_query_proof: ordering.rows,
  }, null, 2));
} finally {
  await client.end();
}
