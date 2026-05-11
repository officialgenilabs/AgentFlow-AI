import "server-only";

export type EvolutionSendInput = {
  instance?: string | null;
  number: string;
  text: string;
};

export type EvolutionSendResult = {
  externalMessageId: string | null;
  response: Record<string, unknown>;
};

function configuredBaseUrl() {
  return (process.env.EVOLUTION_API_BASE_URL || process.env.EVOLUTION_API_URL || "").replace(/\/$/, "");
}

function configuredApiKey() {
  return process.env.EVOLUTION_API_KEY || process.env.EVOLUTION_APIKEY || "";
}

function configuredInstance(instance?: string | null) {
  return instance || process.env.EVOLUTION_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE || "AgentFlow_Primary";
}

function normalizeEvolutionResponse(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : { value };
}

function findExternalMessageId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of ["id", "messageId", "message_id"]) {
    if (typeof record[key] === "string" && record[key]) return record[key];
  }
  if (record.key && typeof record.key === "object") {
    const keyId = (record.key as Record<string, unknown>).id;
    if (typeof keyId === "string" && keyId) return keyId;
  }
  if (record.message && typeof record.message === "object") return findExternalMessageId(record.message);
  if (record.data && typeof record.data === "object") return findExternalMessageId(record.data);
  return null;
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function sameWhatsappIdentity(left: string, right: string) {
  const leftDigits = digitsOnly(left);
  const rightDigits = digitsOnly(right);
  return Boolean(leftDigits && rightDigits && leftDigits === rightDigits);
}

async function assertRecipientIsNotInstanceOwner(baseUrl: string, apiKey: string, instance: string, number: string) {
  const response = await fetch(`${baseUrl}/instance/fetchInstances`, {
    headers: { apikey: apiKey },
    cache: "no-store",
  });

  if (!response.ok) return;

  const instances: unknown = await response.json();
  if (!Array.isArray(instances)) return;

  const current = instances.find((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const instanceInfo = (entry as Record<string, unknown>).instance;
    if (!instanceInfo || typeof instanceInfo !== "object") return false;
    return (instanceInfo as Record<string, unknown>).instanceName === instance;
  });

  const instanceInfo = current && typeof current === "object"
    ? (current as Record<string, unknown>).instance
    : null;
  const owner = instanceInfo && typeof instanceInfo === "object"
    ? (instanceInfo as Record<string, unknown>).owner
    : null;

  if (typeof owner === "string" && sameWhatsappIdentity(number, owner)) {
    throw new Error("evolution_recipient_is_instance_owner");
  }
}

export async function sendEvolutionTextMessage(input: EvolutionSendInput): Promise<EvolutionSendResult> {
  const baseUrl = configuredBaseUrl();
  const apiKey = configuredApiKey();
  const instance = configuredInstance(input.instance);

  if (!baseUrl) throw new Error("evolution_base_url_missing");
  if (!apiKey) throw new Error("evolution_api_key_missing");
  if (!input.number || input.number.length < 8) throw new Error("evolution_recipient_missing");
  if (!input.text.trim()) throw new Error("evolution_text_missing");

  await assertRecipientIsNotInstanceOwner(baseUrl, apiKey, instance, input.number);

  const response = await fetch(`${baseUrl}/message/sendText/${encodeURIComponent(instance)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({
      number: input.number,
      textMessage: { text: input.text },
    }),
    cache: "no-store",
  });

  const rawText = await response.text();
  let parsed: unknown = rawText;
  try {
    parsed = rawText ? JSON.parse(rawText) : {};
  } catch {
    parsed = { raw: rawText };
  }

  const normalized = normalizeEvolutionResponse(parsed);

  if (!response.ok) {
    const message = typeof normalized.message === "string" ? normalized.message : `evolution_send_failed_${response.status}`;
    const error = new Error(message);
    (error as Error & { response?: Record<string, unknown>; status?: number }).response = normalized;
    (error as Error & { response?: Record<string, unknown>; status?: number }).status = response.status;
    throw error;
  }

  return {
    externalMessageId: findExternalMessageId(normalized),
    response: normalized,
  };
}
