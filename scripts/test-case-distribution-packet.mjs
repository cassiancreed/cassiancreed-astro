import test from "node:test";
import assert from "node:assert/strict";
import { buildCasePacket, buildRegenerationPlan, derivePromotionWindows, loadCalendarRecords } from "./build-case-distribution-packet.mjs";

test("packet is stable, separated and joins domestic calendar records", async () => {
  const packet = await buildCasePacket("lindsay-clancy");
  assert.equal(packet.case_key, "lindsay-clancy");
  assert.ok(packet.public_source.linked_calendar_records.some((item) => item.id === "clancy-status-hearing"));
  assert.equal("demand" in packet.public_source, false);
  assert.ok(packet.internal_decision_support.demand);
  assert.equal("generated_at" in packet, false);
  assert.deepEqual(packet.promotion_windows.map((item) => item.phase), ["preparation", "pre-event", "event-monitoring", "immediate-response", "12-48h-follow-up", "search-streaming-tail"]);
});

test("selective regeneration changes only destinations that depend on a changed field", () => {
  const record = { factual_cutoff: "2026-09-11T00:00:00Z", legal_truth: { posture: "pending" }, public_display: { summary: "x" }, distribution_ledger: [] };
  const first = buildRegenerationPlan(record, { website: ["legal_truth", "public_display"], social: ["public_display"] });
  record.distribution_ledger = first.map((item) => ({ destination: item.destination, version: "1", factual_cutoff: record.factual_cutoff, field_hashes: item.field_hashes }));
  record.legal_truth.posture = "resolved";
  const second = buildRegenerationPlan(record, { website: ["legal_truth", "public_display"], social: ["public_display"] });
  assert.equal(second.find((item) => item.destination === "website").action, "regenerate");
  assert.equal(second.find((item) => item.destination === "social").action, "no-change");
});

test("international join remains available and promotion math is deterministic", async () => {
  const allRecords = await loadCalendarRecords();
  const windows = derivePromotionWindows({ predictive_signals: [{ signal_id: "x", starts_at: "2026-10-01T12:00:00Z", reliability: "confirmed", window_profile: "p" }] }, { p: [{ phase: "preparation", start_hours: -168, end_hours: -72 }] });
  assert.deepEqual(windows, [{ signal_id: "x", phase: "preparation", starts_at: "2026-09-24T12:00:00.000Z", ends_at: "2026-09-28T12:00:00.000Z", reliability: "confirmed" }]);
  assert.ok(allRecords.some((item) => item.id === "patterson-appeal"));
});
