import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type JsonObject = Record<string, unknown>;

function asRecord(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function required(value: string | null, label: string) {
  if (!value) throw new Error(`${label}_required`);
  return value;
}

function normalizeSignature(value: string | null) {
  if (!value) return null;
  return value.startsWith("sha256=") ? value.slice("sha256=".length) : value;
}

function verifySignature(rawBody: string, timestamp: string | null, signature: string | null) {
  const secret = process.env.PROPERTY24_INGRESS_SECRET;
  if (!secret) throw new Error("property24_ingress_secret_not_configured");
  if (!timestamp || !signature) throw new Error("signed_ingress_required");

  const skewSeconds = Number(process.env.PROPERTY24_INGRESS_SKEW_SECONDS ?? "300");
  const receivedMs = Number(timestamp) * (timestamp.length <= 10 ? 1000 : 1);
  if (!Number.isFinite(receivedMs) || Math.abs(Date.now() - receivedMs) > skewSeconds * 1000) {
    throw new Error("ingress_timestamp_outside_window");
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const received = normalizeSignature(signature);
  if (!received || received.length !== expected.length) throw new Error("invalid_ingress_signature");

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");
  if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
    throw new Error("invalid_ingress_signature");
  }
}

function createIngressClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("supabase_ingress_client_not_configured");

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizePayload(payload: JsonObject, request: Request) {
  const contact = asRecord(payload.contact);
  const listing = asRecord(payload.listing ?? payload.property);
  const firstName = text(contact.first_name ?? payload.first_name);
  const lastName = text(contact.last_name ?? payload.last_name);
  const composedName = [firstName, lastName].filter(Boolean).join(" ");

  const organizationSlug = text(request.headers.get("x-agentflow-org-slug"))
    ?? text(payload.organization_slug)
    ?? text(payload.orgSlug)
    ?? text(process.env.PROPERTY24_DEFAULT_ORG_SLUG)
    ?? "gen-i-demo-realty";
  const externalLeadId = text(payload.lead_id)
    ?? text(payload.enquiry_id)
    ?? text(payload.inquiry_id)
    ?? text(payload.id)
    ?? text(request.headers.get("x-agentflow-idempotency-key"));
  const listingReference = text(payload.property_reference)
    ?? text(payload.listing_reference)
    ?? text(payload.property_id)
    ?? text(listing.id)
    ?? text(listing.reference);
  const messageBody = text(payload.message)
    ?? text(payload.enquiry_message)
    ?? text(payload.comments)
    ?? text(payload.description)
    ?? text(payload.body);
  const fullName = text(payload.full_name) ?? text(payload.name) ?? text(contact.name) ?? (composedName || null);

  return {
    organizationSlug,
    externalLeadId: required(externalLeadId, "external_lead_id"),
    externalMessageId: text(payload.message_id) ?? text(payload.external_message_id) ?? `property24:${required(externalLeadId, "external_lead_id")}`,
    fullName: required(fullName, "full_name"),
    email: text(payload.email) ?? text(contact.email),
    phone: text(payload.phone) ?? text(payload.mobile) ?? text(contact.phone) ?? text(contact.mobile),
    messageBody: required(messageBody, "message_body"),
    occurredAt: text(payload.occurred_at) ?? text(payload.created_at) ?? text(payload.timestamp) ?? new Date().toISOString(),
    listingReference,
    propertyTitle: text(payload.property_title) ?? text(payload.listing_title) ?? text(listing.title),
    estimatedValue: numberValue(payload.estimated_value ?? payload.price ?? listing.price),
    replayKey: text(request.headers.get("x-agentflow-idempotency-key")) ?? `property24:${required(externalLeadId, "external_lead_id")}`,
  };
}

export async function POST(request: Request) {
  let rawBody = "";

  try {
    rawBody = await request.text();
    verifySignature(
      rawBody,
      request.headers.get("x-agentflow-timestamp"),
      request.headers.get("x-agentflow-signature"),
    );

    const payload = JSON.parse(rawBody) as unknown;
    const normalized = normalizePayload(asRecord(payload), request);
    const ingressSecret = process.env.PROPERTY24_INGRESS_SECRET;
    if (!ingressSecret) throw new Error("property24_ingress_secret_not_configured");
    const supabase = createIngressClient();

    const { data, error } = await supabase.rpc("ingest_property24_lead", {
      p_organization_slug: normalized.organizationSlug,
      p_external_lead_id: normalized.externalLeadId,
      p_external_message_id: normalized.externalMessageId,
      p_full_name: normalized.fullName,
      p_email: normalized.email,
      p_phone: normalized.phone,
      p_message_body: normalized.messageBody,
      p_occurred_at: normalized.occurredAt,
      p_listing_reference: normalized.listingReference,
      p_property_title: normalized.propertyTitle,
      p_estimated_value: normalized.estimatedValue,
      p_raw_payload: asRecord(payload),
      p_replay_key: normalized.replayKey,
      p_ingress_secret: ingressSecret,
    });

    if (error) {
      const duplicate = error.message.includes("duplicate_ingress_replay_key") || error.code === "23505";
      return NextResponse.json(
        { ok: false, error: duplicate ? "duplicate_ingress_replay_key" : "property24_ingestion_failed" },
        { status: duplicate ? 409 : 500 },
      );
    }

    return NextResponse.json({ ok: true, result: data?.[0] ?? null }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "property24_ingestion_failed";
    const status = message.includes("signature") || message.includes("signed_ingress") || message.includes("timestamp") ? 401 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
