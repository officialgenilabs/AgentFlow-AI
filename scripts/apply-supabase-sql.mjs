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

const [, , filePath, envPath = "/root/.openclaw/credentials/supabase-agentflow-staging.env"] = process.argv;
if (!filePath) {
  console.error("Usage: node scripts/apply-supabase-sql.mjs <sql-file> [env-file]");
  process.exit(1);
}

loadEnv(envPath);
const connectionString = process.env.SUPABASE_STAGING_DB_POOLER_CONNECTION_STRING || process.env.SUPABASE_STAGING_DB_CONNECTION_STRING;
if (!connectionString) throw new Error("Missing Supabase staging DB connection string");

const sql = readFileSync(filePath, "utf8");
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  console.log(`Applied SQL: ${filePath}`);
} finally {
  await client.end();
}
