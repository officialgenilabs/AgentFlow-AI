import type { Lead, LeadPipelineStage, LeadTask } from "@/lib/types";

export type LeadIntelligenceContext = {
  lastInboundAt?: string | null;
  conversationStatus?: string | null;
  pendingApprovalCount?: number;
  governanceState?: string | null;
  channelLabel?: string | null;
};

export type LeadQualificationSummary = {
  readinessState: string;
  readinessTone: "neutral" | "active" | "warning" | "mint" | "orchestration";
  readinessScore: number;
  viewingReadiness: string;
  urgency: string;
  qualificationStatus: string;
  knownFields: string[];
  missingFields: string[];
  nextBestAction: string;
  suggestedNextQuestion: string;
  confidence: string;
  confidenceScore: number;
  sourceTrust: string;
  sourceTrustScore: number;
  sourceMetadata: string[];
  governanceState: string;
};

type LeadForQualification = Pick<
  Lead,
  | "email"
  | "phone"
  | "identity_confidence"
  | "priority"
  | "estimated_value"
  | "exact_source"
  | "source_subtype"
  | "original_inbound_channel"
  | "source_reference"
  | "captured_at"
  | "first_contact_at"
  | "qualification_status"
  | "ai_qualification_decision_path"
  | "lead_origin_metadata"
>;

type StageForQualification = Pick<LeadPipelineStage, "name" | "slug" | "probability"> | null | undefined;
type TaskForQualification = Pick<LeadTask, "title" | "description" | "status" | "priority" | "due_at">;

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function hasValue(value: unknown) {
  return typeof value === "string" ? value.trim().length > 0 : value !== null && value !== undefined;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function textBlob(...values: unknown[]) {
  return values
    .map((value) => {
      if (typeof value === "string") return value;
      if (value === null || value === undefined) return "";
      try {
        return JSON.stringify(value);
      } catch {
        return "";
      }
    })
    .join(" ")
    .toLowerCase();
}

function metadataHas(metadata: Record<string, unknown>, keys: string[]) {
  return keys.some((key) => hasValue(metadata[key]));
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function isOpenTask(task: TaskForQualification) {
  return ["open", "in_progress"].includes(normalizeText(task.status));
}

function isOverdue(task: TaskForQualification) {
  if (!task.due_at || !isOpenTask(task)) return false;
  const due = new Date(task.due_at).getTime();
  return !Number.isNaN(due) && due < Date.now();
}

function daysSince(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  if (Number.isNaN(parsed)) return null;
  return (Date.now() - parsed) / 86_400_000;
}

function isViewingSignal(stage: StageForQualification, tasks: TaskForQualification[], blob: string) {
  const stageText = `${normalizeText(stage?.name)} ${normalizeText(stage?.slug)}`;
  const taskText = tasks.map((task) => `${task.title} ${task.description ?? ""}`).join(" ").toLowerCase();
  return includesAny(`${stageText} ${taskText} ${blob}`, ["viewing", "booked", "schedule", "appointment"]);
}

function firstOpenTask(tasks: TaskForQualification[]) {
  return tasks.find(isOpenTask) ?? null;
}

function boundedScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sourceMetadataFor(lead: LeadForQualification, metadata: Record<string, unknown>, context: LeadIntelligenceContext) {
  const items = [
    lead.exact_source ? `Source: ${lead.exact_source}` : null,
    lead.source_subtype ? `Subtype: ${lead.source_subtype}` : null,
    context.channelLabel ? `Channel: ${context.channelLabel}` : lead.original_inbound_channel ? `Channel: ${lead.original_inbound_channel}` : null,
    lead.source_reference ? `Reference: ${lead.source_reference}` : null,
    metadata.property_title ? `Property: ${String(metadata.property_title)}` : null,
    metadata.listing_reference ? `Listing: ${String(metadata.listing_reference)}` : null,
  ].filter(Boolean) as string[];

  return items.slice(0, 6);
}

function sourceTrustFor(lead: LeadForQualification, hasPropertyReference: boolean) {
  const identity = normalizeText(lead.identity_confidence);
  const sourceCompleteness = [lead.exact_source, lead.source_subtype, lead.original_inbound_channel, lead.source_reference]
    .filter((value) => typeof value === "string" && value.trim().length > 0).length;

  const identityScore = identity === "phone_email" ? 30 : identity === "phone" || identity === "email" ? 24 : identity === "none" ? 6 : 14;
  const sourceScore = sourceCompleteness * 12;
  const propertyScore = hasPropertyReference ? 16 : 0;
  const score = boundedScore(identityScore + sourceScore + propertyScore);

  if (score >= 82) return { score, label: "High source trust" };
  if (score >= 58) return { score, label: "Traceable source" };
  if (score >= 35) return { score, label: "Partial source trust" };
  return { score, label: "Low source trust" };
}

function urgencyFor(lead: LeadForQualification, tasks: TaskForQualification[], context: LeadIntelligenceContext) {
  const openTask = firstOpenTask(tasks);
  const hasOverdueTask = tasks.some(isOverdue);
  const priority = normalizeText(lead.priority);
  const inboundAge = daysSince(context.lastInboundAt);
  const capturedAge = daysSince(lead.captured_at);

  if (hasOverdueTask || priority === "urgent") return "urgent";
  if (priority === "high") return "high_priority";
  if (inboundAge !== null && inboundAge <= 1) return "active_today";
  if (openTask) return "follow_up_required";
  if (capturedAge !== null && capturedAge <= 1) return "new_inbound";
  return "normal";
}

export function buildLeadQualificationSummary(
  lead: LeadForQualification,
  stage?: StageForQualification,
  tasks: TaskForQualification[] = [],
  context: LeadIntelligenceContext = {},
): LeadQualificationSummary {
  const metadata = record(lead.lead_origin_metadata);
  const decisionBlob = textBlob(lead.ai_qualification_decision_path, lead.lead_origin_metadata);
  const knownFields: string[] = [];
  const missingFields: string[] = [];

  const hasContactRoute = Boolean(lead.phone || lead.email);
  const hasStrongIdentity = ["phone", "email", "phone_email"].includes(normalizeText(lead.identity_confidence));
  const hasSource = Boolean(lead.exact_source || lead.source_subtype || lead.original_inbound_channel);
  const hasPropertyReference = Boolean(
    lead.source_reference
      || metadataHas(metadata, ["property_reference", "listing_reference", "property_title", "property", "listing", "property_id"])
      || includesAny(decisionBlob, ["property", "listing"]),
  );
  const hasPurchasePurpose = metadataHas(metadata, ["purchase_purpose", "transaction_intent", "buyer_intent", "intent"])
    || includesAny(decisionBlob, ["own_use", "investment", "buying for", "investor", "purchase purpose"]);
  const hasFundingMethod = metadataHas(metadata, ["funding_method", "finance", "cash", "preapproval_status", "pre_approval_status"])
    || includesAny(decisionBlob, ["cash", "finance", "pre-approv", "preapprov", "bond"]);
  const hasTimeline = metadataHas(metadata, ["timeline", "urgency", "move_date", "decision_timeline"])
    || includesAny(decisionBlob, ["timeline", "urgent", "asap", "this week", "this month", "weekend"]);
  const hasViewingInterest = isViewingSignal(stage, tasks, decisionBlob);
  const hasEstimatedValue = typeof lead.estimated_value === "number" && Number.isFinite(lead.estimated_value) && lead.estimated_value > 0;
  const hasFirstContact = Boolean(lead.first_contact_at);
  const hasQualifiedStatus = ["ai_review_pending", "ai_qualified", "human_qualified"].includes(normalizeText(lead.qualification_status));
  const pendingApprovals = context.pendingApprovalCount ?? 0;

  if (hasContactRoute) knownFields.push("Contact route captured");
  else missingFields.push("Contact route");

  if (hasStrongIdentity) knownFields.push("Identity confidence resolved");
  else missingFields.push("Strong identity confidence");

  if (hasSource) knownFields.push("Source/channel attribution");
  else missingFields.push("Source attribution");

  if (hasPropertyReference) knownFields.push("Property/listing context");
  else missingFields.push("Property/listing context");

  if (hasPurchasePurpose) knownFields.push("Purchase purpose / intent");
  else missingFields.push("Purchase purpose");

  if (hasFundingMethod) knownFields.push("Funding or pre-approval context");
  else missingFields.push("Funding method");

  if (hasTimeline) knownFields.push("Timeline / urgency signal");
  else missingFields.push("Timeline");

  if (hasViewingInterest) knownFields.push("Viewing interest signal");
  else missingFields.push("Viewing interest");

  if (hasEstimatedValue) knownFields.push("Estimated opportunity value");
  if (hasFirstContact) knownFields.push("First contact timestamp");
  if (hasQualifiedStatus) knownFields.push("Qualification status advanced");
  if (pendingApprovals > 0) knownFields.push("Draft pending approval");
  if (context.lastInboundAt) knownFields.push("Inbound conversation activity");

  const openTask = firstOpenTask(tasks);
  const stageText = `${normalizeText(stage?.name)} ${normalizeText(stage?.slug)}`;
  let readinessState = "early_engaged";
  let readinessTone: LeadQualificationSummary["readinessTone"] = "neutral";
  let viewingReadiness = "not_ready";

  if (includesAny(stageText, ["booked"])) {
    readinessState = "viewing_booked";
    viewingReadiness = "viewing_booked";
    readinessTone = "mint";
  } else if (includesAny(stageText, ["viewing requested", "viewing-requested"])) {
    readinessState = "viewing_requested";
    viewingReadiness = "viewing_requested";
    readinessTone = "orchestration";
  } else if (hasViewingInterest && (hasFundingMethod || hasTimeline || hasQualifiedStatus)) {
    readinessState = "viewing_candidate";
    viewingReadiness = "ready_for_viewing_discussion";
    readinessTone = "orchestration";
  } else if (hasViewingInterest) {
    readinessState = "viewing_interest_detected";
    viewingReadiness = "viewing_interest_detected";
    readinessTone = "warning";
  } else if (["ai_qualified", "human_qualified"].includes(normalizeText(lead.qualification_status))) {
    readinessState = "qualification_active";
    viewingReadiness = "qualification_complete";
    readinessTone = "mint";
  } else if (hasPurchasePurpose || hasFundingMethod || hasTimeline || normalizeText(lead.qualification_status) === "ai_review_pending") {
    readinessState = "qualification_active";
    viewingReadiness = "qualification_in_progress";
    readinessTone = "warning";
  } else if (!hasContactRoute && !hasPropertyReference) {
    readinessState = "cold_unqualified";
    viewingReadiness = "not_ready";
    readinessTone = "neutral";
  }

  const readinessScore = boundedScore(
    (hasContactRoute ? 12 : 0)
      + (hasStrongIdentity ? 12 : 0)
      + (hasSource ? 10 : 0)
      + (hasPropertyReference ? 12 : 0)
      + (hasPurchasePurpose ? 12 : 0)
      + (hasFundingMethod ? 12 : 0)
      + (hasTimeline ? 10 : 0)
      + (hasViewingInterest ? 14 : 0)
      + (hasQualifiedStatus ? 10 : 0)
      + (hasFirstContact ? 3 : 0)
      + (pendingApprovals > 0 ? 3 : 0),
  );

  const sourceTrust = sourceTrustFor(lead, hasPropertyReference);
  const confidenceScore = boundedScore((readinessScore * 0.62) + (sourceTrust.score * 0.38));
  const confidence = confidenceScore >= 78 ? "high_confidence" : confidenceScore >= 52 ? "medium_confidence" : "low_confidence";
  const urgency = urgencyFor(lead, tasks, context);

  let nextBestAction = "Review lead context and confirm the next operational step.";
  let suggestedNextQuestion = "Would you like Kopano to check the best next step for this property?";

  if (pendingApprovals > 0) {
    nextBestAction = "Review the pending governed draft before any follow-up is sent.";
    suggestedNextQuestion = "Does this draft answer the lead's latest question accurately?";
  } else if (openTask) {
    nextBestAction = `Complete open task: ${openTask.title}`;
    suggestedNextQuestion = "What is the next update Kopano should confirm for this lead?";
  } else if (!hasContactRoute) {
    nextBestAction = "Capture a reliable contact route before progressing qualification.";
    suggestedNextQuestion = "What is the best number for Kopano to use?";
  } else if (!hasPropertyReference) {
    nextBestAction = "Confirm the exact property or area this lead is interested in.";
    suggestedNextQuestion = "Which property or area are you interested in?";
  } else if (!hasPurchasePurpose) {
    nextBestAction = "Identify whether this is an own-use or investment enquiry.";
    suggestedNextQuestion = "Are you looking at this for yourself to live in, or as an investment?";
  } else if (!hasFundingMethod) {
    nextBestAction = "Ask the funding question before moving toward viewing coordination.";
    suggestedNextQuestion = "Would you be buying cash or using finance?";
  } else if (!hasTimeline) {
    nextBestAction = "Capture the lead's decision or move timeline.";
    suggestedNextQuestion = "When are you hoping to move or make a decision?";
  } else if (!hasViewingInterest) {
    nextBestAction = "Check whether viewing the property would help the lead decide.";
    suggestedNextQuestion = "Would seeing the property help you decide at this stage?";
  } else if (["viewing_candidate", "viewing_requested"].includes(readinessState)) {
    nextBestAction = "Move toward viewing coordination with Kopano still in control.";
    suggestedNextQuestion = "Would you like Kopano to check viewing options for this property?";
  }

  return {
    readinessState,
    readinessTone,
    readinessScore,
    viewingReadiness,
    urgency,
    qualificationStatus: lead.qualification_status,
    knownFields: knownFields.slice(0, 10),
    missingFields: missingFields.slice(0, 8),
    nextBestAction,
    suggestedNextQuestion,
    confidence,
    confidenceScore,
    sourceTrust: sourceTrust.label,
    sourceTrustScore: sourceTrust.score,
    sourceMetadata: sourceMetadataFor(lead, metadata, context),
    governanceState: context.governanceState ?? (pendingApprovals > 0 ? "Pending approval review" : "Read-only intelligence"),
  };
}
