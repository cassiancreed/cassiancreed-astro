#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const dataUrl = new URL("../src/data/case-intelligence.json", import.meta.url);
const domesticUrl = new URL("../src/data/court-calendar.tsv", import.meta.url);
const internationalUrl = new URL("../src/data/international-watch.tsv", import.meta.url);
const errors = [];
const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const dateTime = (v) => typeof v === "string" && !Number.isNaN(Date.parse(v));
const httpUrl = (v) => { try { return ["http:", "https:"].includes(new URL(v).protocol); } catch { return false; } };
const requiredSections = ["legal_truth", "demand", "commercial_opportunity", "public_display", "discovery", "coverage"];
const requiredArrays = ["aliases", "calendar_event_ids", "court_events", "predictive_signals", "demand_signals", "buyer_questions", "field_freshness", "distribution_ledger"];
const allowedChannels = new Set(["court", "media", "creator", "search", "social", "nep"]);
const allowedReliability = new Set(["confirmed", "reliable", "provisional", "unverified"]);
const allowedFreshness = new Set(["fresh", "stale", "unknown"]);
const legacyIds = new Set(["clancy-closings-tentative"]);

const intelligence = JSON.parse(await readFile(dataUrl, "utf8"));
const idsFromTsv = (raw) => raw.trim().split(/\r?\n/).slice(1).map((line) => line.split("\t")[1]).filter(Boolean);
const knownIds = new Set([
  ...idsFromTsv(await readFile(domesticUrl, "utf8")),
  ...idsFromTsv(await readFile(internationalUrl, "utf8")),
  ...legacyIds,
]);

if (intelligence.schema_version !== "2.0") errors.push("schema_version must be 2.0.");
if (!dateTime(intelligence.updated_at)) errors.push("updated_at must be an ISO date-time.");
const phases = intelligence.promotion_window_profiles?.["standard-event"]?.map((item) => item.phase);
const expectedPhases = ["preparation", "pre-event", "event-monitoring", "immediate-response", "12-48h-follow-up", "search-streaming-tail"];
if (JSON.stringify(phases) !== JSON.stringify(expectedPhases)) errors.push("standard-event must define the six deterministic promotion phases in order.");
if (!object(intelligence.destination_dependencies) || Object.keys(intelligence.destination_dependencies).length === 0) errors.push("destination_dependencies must not be empty.");

for (const [eventId, score] of Object.entries(intelligence.display_priority_by_event ?? {})) {
  if (!knownIds.has(eventId)) errors.push("display priority references unknown calendar id " + eventId + ".");
  if (!Number.isInteger(score) || score < 0 || score > 100) errors.push("display priority for " + eventId + " must be an integer from 0 to 100.");
}

const caseKeys = new Set();
if (!Array.isArray(intelligence.cases) || intelligence.cases.length === 0) errors.push("cases must not be empty.");
for (const record of intelligence.cases ?? []) {
  const label = record.case_key || "(missing case_key)";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.case_key ?? "")) errors.push(label + ": case_key must be stable kebab-case.");
  if (!record.case_name) errors.push(label + ": case_name is required.");
  if (caseKeys.has(record.case_key)) errors.push(label + ": duplicate case_key.");
  caseKeys.add(record.case_key);
  if (!dateTime(record.factual_cutoff)) errors.push(label + ": factual_cutoff must be an ISO date-time.");
  requiredSections.forEach((section) => { if (!object(record[section])) errors.push(label + ": missing separated section " + section + "."); });
  requiredArrays.forEach((field) => { if (!Array.isArray(record[field])) errors.push(label + ": " + field + " must be an array."); });
  if (!record.legal_truth?.posture || !httpUrl(record.legal_truth?.source_url) || !dateTime(record.legal_truth?.verified_at)) errors.push(label + ": legal_truth needs posture, source_url and verified_at.");
  if (!record.demand?.status || !httpUrl(record.demand?.source_url) || !dateTime(record.demand?.observed_at)) errors.push(label + ": demand needs status, source_url and observed_at.");
  if (!record.commercial_opportunity?.product_fit) errors.push(label + ": commercial_opportunity.product_fit is required.");
  if (!record.public_display?.summary || !Number.isInteger(record.public_display?.prominence)) errors.push(label + ": public_display needs summary and integer prominence.");
  for (const eventId of record.calendar_event_ids ?? []) if (!knownIds.has(eventId)) errors.push(label + ": unknown calendar_event_id " + eventId + ".");
  for (const event of record.court_events ?? []) {
    if (!record.calendar_event_ids.includes(event.event_id)) errors.push(label + ": court event is not linked in calendar_event_ids.");
    if (!dateTime(event.starts_at) || !httpUrl(event.source_url) || !dateTime(event.verified_at)) errors.push(label + ": court event needs starts_at, source_url and verified_at.");
  }
  for (const signal of record.predictive_signals ?? []) {
    if (!signal.signal_id || !dateTime(signal.starts_at) || !dateTime(signal.observed_at) || !httpUrl(signal.source_url)) errors.push(label + ": predictive signal lacks provenance.");
    if (!allowedReliability.has(signal.reliability)) errors.push(label + ": predictive signal reliability is invalid.");
    if (!intelligence.promotion_window_profiles[signal.window_profile]) errors.push(label + ": predictive signal uses an unknown window profile.");
  }
  for (const signal of record.demand_signals ?? []) {
    if (!allowedChannels.has(signal.channel) || !signal.observation || !dateTime(signal.observed_at) || !httpUrl(signal.source_url)) errors.push(label + ": demand signal lacks typed, timestamped provenance.");
  }
  const seoQueries = new Set();
  for (const item of record.discovery?.seo_long_tail ?? []) {
    const normalized = item.query?.trim().toLowerCase();
    if (!normalized || !item.intent || !Number.isInteger(item.priority)) errors.push(label + ": every SEO term needs query, intent and integer priority.");
    if (seoQueries.has(normalized)) errors.push(label + ": duplicate SEO query " + item.query + ".");
    seoQueries.add(normalized);
  }
  for (const item of record.discovery?.paa_observed ?? []) if (!item.question || !dateTime(item.observed_at) || !httpUrl(item.source_url)) errors.push(label + ": observed PAA must carry observation provenance.");
  for (const field of ["paa_candidates", "ai_search_prompts"]) {
    const values = record.discovery?.[field] ?? [];
    if (values.some((value) => typeof value !== "string" || !value.trim())) errors.push(label + ": " + field + " must contain non-empty strings.");
    if (new Set(values.map((value) => value.trim().toLowerCase())).size !== values.length) errors.push(label + ": " + field + " contains duplicates.");
  }
  for (const item of record.buyer_questions ?? []) if (!item.question || !item.purchase_intent || !httpUrl(item.source_url) || !dateTime(item.observed_at)) errors.push(label + ": buyer question lacks intent or provenance.");
  if (!(record.coverage?.canonical_urls ?? []).every(httpUrl)) errors.push(label + ": coverage canonical_urls must be HTTP(S).");
  for (const item of record.field_freshness ?? []) {
    if (!item.field_path || !allowedFreshness.has(item.status) || !dateTime(item.observed_at) || !httpUrl(item.source_url)) errors.push(label + ": field freshness lacks path, status or provenance.");
  }
  for (const item of record.distribution_ledger ?? []) {
    if (!item.destination || !item.version || !dateTime(item.factual_cutoff) || !object(item.field_hashes)) errors.push(label + ": ledger entry needs destination, version, factual_cutoff and field_hashes.");
  }
}

if (errors.length) {
  console.error("Case intelligence failed validation (" + errors.length + "):");
  errors.forEach((error) => console.error("- " + error));
  process.exit(1);
}
console.log("Case intelligence v2 passed: " + caseKeys.size + " canonical case record(s), " + Object.keys(intelligence.display_priority_by_event).length + " calendar priority link(s).");
