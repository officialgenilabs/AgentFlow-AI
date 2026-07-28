import { throwIngressError } from "../../ingress/agentflow-signed-ingress";

export type ZohoMailConnectorEnvironment = "staging" | "production";
export type ZohoMailProvider = "zoho_mail";

export interface ZohoMailConnectorDescriptor {
  connector_id: string;
  tenant_id: string;
  environment: ZohoMailConnectorEnvironment;
  provider: ZohoMailProvider;
  mailbox: string;
  allowed_recipient: string;
  active: boolean;
  signing_key_id: string;
  default_phone_region: string;
  review_owner_role: string;
}

export interface ZohoMailConnectorRegistry {
  resolveConnector(input: {
    connectorId: string;
    provider: ZohoMailProvider;
    environment: ZohoMailConnectorEnvironment;
    correlationId: string;
  }): Promise<ZohoMailConnectorDescriptor | null>;
}

export function createUnavailableZohoMailConnectorRegistry(): ZohoMailConnectorRegistry {
  return {
    async resolveConnector() {
      throwIngressError(503, "connector_registry_unavailable", "Connector registry is unavailable.");
    },
  };
}

export function assertZohoMailConnectorEnvelopeAlignment(input: {
  connector: ZohoMailConnectorDescriptor;
  connectorId: string;
  provider: ZohoMailProvider;
  environment: ZohoMailConnectorEnvironment;
  signingKeyId: string;
  mailbox: string;
  recipient: string;
}) {
  const { connector } = input;

  if (!connector.active) {
    throwIngressError(403, "connector_inactive", "Connector is inactive.");
  }

  if (connector.connector_id !== input.connectorId) {
    throwIngressError(403, "connector_id_mismatch", "Connector identifier mismatch.");
  }

  if (connector.provider !== input.provider) {
    throwIngressError(403, "connector_provider_mismatch", "Connector provider mismatch.");
  }

  if (connector.environment !== input.environment) {
    throwIngressError(403, "connector_environment_mismatch", "Connector environment mismatch.");
  }

  if (connector.signing_key_id !== input.signingKeyId) {
    throwIngressError(403, "connector_signing_key_mismatch", "Connector signing key mismatch.");
  }

  if (connector.mailbox.toLowerCase() !== input.mailbox.toLowerCase()) {
    throwIngressError(403, "connector_mailbox_mismatch", "Connector mailbox mismatch.");
  }

  if (connector.allowed_recipient.toLowerCase() !== input.recipient.toLowerCase()) {
    throwIngressError(403, "connector_recipient_mismatch", "Connector recipient mismatch.");
  }
}
