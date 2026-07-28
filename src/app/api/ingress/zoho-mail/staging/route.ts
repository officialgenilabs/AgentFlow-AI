import { randomUUID } from "node:crypto";
import {
  AGENTFLOW_SIGNED_INGRESS_MAX_BODY_BYTES,
  createUnavailableReplayStore,
  createUnavailableSigningKeyResolver,
  enforceJsonContentType,
  IngressSigningKeyResolver,
  isIngressHttpError,
  readRawRequestBody,
  SignedIngressReplayStore,
  throwIngressError,
  verifySignedIngressRequest,
} from "../../../../../lib/ingress/agentflow-signed-ingress";
import {
  assertZohoMailConnectorEnvelopeAlignment,
  createUnavailableZohoMailConnectorRegistry,
  ZohoMailConnectorRegistry,
} from "../../../../../lib/integrations/zoho-mail/zoho-mail-connector-registry";
import { validateZohoMailStagingIngressEnvelope } from "../../../../../lib/integrations/zoho-mail/zoho-mail-staging-ingress-schema";

export const runtime = "nodejs";

export const ZOHO_MAIL_STAGING_INGRESS_PATH = "/api/ingress/zoho-mail/staging";
export const ZOHO_MAIL_STAGING_INGRESS_STAGE = "zn_03a";

type SafeResponseBody = Record<string, unknown>;

export interface ZohoMailStagingIngressDependencies {
  signingKeyResolver: IngressSigningKeyResolver;
  replayStore: SignedIngressReplayStore;
  connectorRegistry: ZohoMailConnectorRegistry;
  now?: Date;
}

export function createUnavailableZohoMailStagingIngressDependencies(): ZohoMailStagingIngressDependencies {
  return {
    signingKeyResolver: createUnavailableSigningKeyResolver(),
    replayStore: createUnavailableReplayStore(),
    connectorRegistry: createUnavailableZohoMailConnectorRegistry(),
  };
}

function jsonResponse(body: SafeResponseBody, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function errorResponse(correlationId: string, status: number, code: string, message: string) {
  return jsonResponse({
    ok: false,
    stage: ZOHO_MAIL_STAGING_INGRESS_STAGE,
    correlation_id: correlationId,
    error: {
      code,
      message,
    },
  }, status);
}

function methodNotAllowed() {
  const correlationId = randomUUID();
  return errorResponse(correlationId, 405, "method_not_allowed", "Only POST is accepted for this ingress endpoint.");
}

export async function handleZohoMailStagingIngressRequest(
  request: Request,
  dependencies: ZohoMailStagingIngressDependencies,
) {
  const correlationId = randomUUID();

  try {
    if (request.method.toUpperCase() !== "POST") {
      throwIngressError(405, "method_not_allowed", "Only POST is accepted for this ingress endpoint.");
    }

    enforceJsonContentType(request.headers.get("content-type"));

    const rawBody = await readRawRequestBody(request, AGENTFLOW_SIGNED_INGRESS_MAX_BODY_BYTES);
    if (rawBody.byteLength === 0) {
      throwIngressError(400, "empty_body", "Request body is required.");
    }

    const verification = await verifySignedIngressRequest({
      request,
      rawBody,
      expectedMethod: "POST",
      expectedPathname: ZOHO_MAIL_STAGING_INGRESS_PATH,
      expectedEnvironment: "staging",
      correlationId,
      signingKeyResolver: dependencies.signingKeyResolver,
      replayStore: dependencies.replayStore,
      now: dependencies.now,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder().decode(rawBody));
    } catch {
      throwIngressError(400, "invalid_json", "Request body must be valid JSON.");
    }

    const envelope = validateZohoMailStagingIngressEnvelope(parsed);
    const connector = await dependencies.connectorRegistry.resolveConnector({
      connectorId: envelope.connector_id,
      provider: envelope.provider,
      environment: "staging",
      correlationId,
    });

    if (!connector) {
      throwIngressError(403, "connector_not_found", "Connector was not recognized.");
    }

    assertZohoMailConnectorEnvelopeAlignment({
      connector,
      connectorId: envelope.connector_id,
      provider: envelope.provider,
      environment: "staging",
      signingKeyId: verification.keyId,
      mailbox: envelope.mailbox,
      recipient: envelope.recipient,
    });

    return jsonResponse({
      ok: true,
      stage: ZOHO_MAIL_STAGING_INGRESS_STAGE,
      correlation_id: correlationId,
      result: {
        status: "synthetic_envelope_accepted",
        connector_verified: true,
        schema_version: envelope.schema_version,
        records_created: 0,
        outbound_actions: 0,
      },
    }, 200);
  } catch (error) {
    if (isIngressHttpError(error)) {
      return errorResponse(correlationId, error.status, error.code, error.message);
    }

    return errorResponse(correlationId, 500, "internal_ingress_error", "The request could not be completed safely.");
  }
}

export async function POST(request: Request) {
  return handleZohoMailStagingIngressRequest(
    request,
    createUnavailableZohoMailStagingIngressDependencies(),
  );
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
