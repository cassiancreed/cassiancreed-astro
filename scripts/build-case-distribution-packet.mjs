#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parseCourtCalendar } from "../src/data/court-calendar-parser.mjs";
import { parseInternationalWatch } from "../src/data/international-watch-parser.mjs";

const DATA_URL = new URL("../src/data/case-intelligence.json", import.meta.url);
const DOMESTIC_URL = new URL("../src/data/court-calendar.tsv", import.meta.url);
const INTERNATIONAL_URL = new URL("../src/data/international-watch.tsv", import.meta.url);
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
};
const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const hash = (value) => createHash("sha256").update(canonicalJson(value)).digest("hex");
const valueAt = (record, path) => path.split(".").reduce((value, key) => value?.[key], record);
const shiftHours = (timestamp, hours) => new Date(new Date(timestamp).getTime() + hours * 3600000).toISOString();

export const derivePromotionWindows = (record, profiles) => (record.predictive_signals ?? [])
  .filter((signal) => ["confirmed", "reliable", "provisional"].includes(signal.reliability))
  .flatMap((signal) => profiles[signal.window_profile].map((window) => ({
    signal_id: signal.signal_id,
    phase: window.phase,
    starts_at: shiftHours(signal.starts_at, window.start_hours),
    ends_at: shiftHours(signal.starts_at, window.end_hours),
    reliability: signal.reliability,
  })));

export const buildRegenerationPlan = (record, dependencies) => Object.entries(dependencies).map(([destination, fields]) => {
  const fieldHashes = Object.fromEntries(fields.map((field) => [field, hash(valueAt(record, field))]));
  const prior = [...(record.distribution_ledger ?? [])].reverse().find((entry) => entry.destination === destination);
  const changedFields = fields.filter((field) => prior?.field_hashes?.[field] !== fieldHashes[field]);
  return {
    destination,
    action: changedFields.length ? "regenerate" : "no-change",
    changed_fields: changedFields,
    next_version: String((Number(prior?.version ?? 0) || 0) + (changedFields.length ? 1 : 0)),
    factual_cutoff: record.factual_cutoff,
    field_hashes: fieldHashes,
  };
});

export async function loadCalendarRecords() {
  const domestic = parseCourtCalendar(await readFile(DOMESTIC_URL, "utf8"));
  const international = parseInternationalWatch(await readFile(INTERNATIONAL_URL, "utf8"));
  return [
    ...domestic.entries, ...domestic.unconfirmed, ...domestic.appeals, ...domestic.investigations, ...domestic.completed,
    ...international.listed, ...international.monitoring, ...international.concluded,
  ];
}

export async function buildCasePacket(caseKey) {
  const intelligence = JSON.parse(await readFile(DATA_URL, "utf8"));
  const record = intelligence.cases.find((item) => item.case_key === caseKey);
  if (!record) throw new Error("Unknown case key: " + caseKey);
  const linkedEvents = (await loadCalendarRecords()).filter((item) => record.calendar_event_ids.includes(item.id));
  return {
    schema_version: intelligence.schema_version,
    case_key: record.case_key,
    factual_cutoff: record.factual_cutoff,
    public_source: {
      case_name: record.case_name,
      aliases: record.aliases,
      legal_truth: record.legal_truth,
      public_display: record.public_display,
      court_events: record.court_events,
      discovery: record.discovery,
      buyer_questions: record.buyer_questions,
      coverage: record.coverage,
      linked_calendar_records: linkedEvents,
    },
    internal_decision_support: {
      demand: record.demand,
      commercial_opportunity: record.commercial_opportunity,
      demand_signals: record.demand_signals,
      field_freshness: record.field_freshness,
    },
    promotion_windows: derivePromotionWindows(record, intelligence.promotion_window_profiles),
    regeneration_plan: buildRegenerationPlan(record, intelligence.destination_dependencies),
    reuse_rule: "Generate every destination from this packet. Never independently rewrite factual claims.",
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const caseKey = process.argv[2];
  if (!caseKey) { console.error("Usage: npm run case:packet -- <case-key>"); process.exit(1); }
  try { console.log(JSON.stringify(await buildCasePacket(caseKey), null, 2)); }
  catch (error) { console.error(error.message); process.exit(1); }
}
