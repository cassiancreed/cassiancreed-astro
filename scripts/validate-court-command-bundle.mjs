#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: npm run court-command:check -- <court-command-bundle.json>");
  process.exit(1);
}
let bundle;
try {
  bundle = JSON.parse(await readFile(resolve(inputPath), "utf8"));
} catch (error) {
  console.error("Court Command bundle could not be read: " + error.message);
  process.exit(1);
}

const errors = [];
const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const text = (v) => typeof v === "string" && v.trim().length > 0;
const date = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + "T00:00:00Z"));
const dateTime = (v) => typeof v === "string" && !Number.isNaN(Date.parse(v));
const url = (v) => { try { return ["http:", "https:"].includes(new URL(v).protocol); } catch { return false; } };
const reqText = (v, p) => { if (!text(v)) errors.push(p + " is required."); };
const reqDateTime = (v, p) => { if (!dateTime(v)) errors.push(p + " must be an ISO date-time."); };
const reqUrl = (v, p) => { if (!url(v)) errors.push(p + " must be HTTP(S)."); };
const reqObject = (v, p) => { if (!object(v)) errors.push(p + " must be an object."); };
const reqArray = (v, p, nonempty = false) => {
  if (!Array.isArray(v)) errors.push(p + " must be an array.");
  else if (nonempty && v.length === 0) errors.push(p + " must not be empty.");
};
const reqUniqueText = (v, p) => {
  reqArray(v, p);
  if (!Array.isArray(v)) return;
  const seen = new Set();
  v.forEach((item, i) => {
    const key = text(item) ? item.trim().toLowerCase() : "";
    if (!key) errors.push(p + "[" + i + "] must be non-empty text.");
    else if (seen.has(key)) errors.push(p + "[" + i + "] is duplicated.");
    else seen.add(key);
  });
};

const verificationStates = new Set(["confirmed", "tentative", "superseded", "not publicly verified"]);
const reliabilityStates = new Set(["confirmed", "reliable", "provisional", "unverified"]);
const freshnessStates = new Set(["fresh", "stale", "unknown"]);
const destinations = new Set(["court-calendar", "website", "paid-explainer", "newsletter", "this-week-in-court", "notebooklm", "youtube", "tiktok", "spotify", "x", "facebook", "instagram", "threads", "linkedin", "pinterest", "bluesky"]);

if (!object(bundle)) errors.push("The bundle root must be an object.");
if (bundle?.bundleVersion !== "2.0") errors.push("bundleVersion must be 2.0.");
reqDateTime(bundle?.generatedAt, "generatedAt");
if (!Array.isArray(bundle?.pronunciations) || bundle.pronunciations.length !== 0) errors.push("pronunciations must be an empty array.");
reqArray(bundle?.cases, "cases", true);

const caseKeys = new Set();
const eventKeys = new Set();
for (const [caseIndex, candidate] of (bundle?.cases ?? []).entries()) {
  const label = "cases[" + caseIndex + "]";
  if (!object(candidate)) { errors.push(label + " must be an object."); continue; }
  reqText(candidate.caseKey, label + ".caseKey");
  if (text(candidate.caseKey) && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate.caseKey)) errors.push(label + ".caseKey must be stable kebab-case.");
  else if (caseKeys.has(candidate.caseKey)) errors.push(label + ".caseKey duplicates " + candidate.caseKey + ".");
  else caseKeys.add(candidate.caseKey);
  reqText(candidate.caseName, label + ".caseName");
  reqUniqueText(candidate.aliases, label + ".aliases");

  ["legalTruth", "demand", "commercialOpportunity", "publicDisplay"].forEach((section) => reqObject(candidate[section], label + "." + section));
  reqText(candidate.legalTruth?.posture, label + ".legalTruth.posture");
  reqDateTime(candidate.legalTruth?.verifiedAt, label + ".legalTruth.verifiedAt");
  reqUrl(candidate.legalTruth?.sourceUrl, label + ".legalTruth.sourceUrl");
  reqText(candidate.demand?.status, label + ".demand.status");
  reqDateTime(candidate.demand?.observedAt, label + ".demand.observedAt");
  reqUrl(candidate.demand?.sourceUrl, label + ".demand.sourceUrl");
  reqText(candidate.commercialOpportunity?.productFit, label + ".commercialOpportunity.productFit");
  reqText(candidate.publicDisplay?.summary, label + ".publicDisplay.summary");
  if (!Number.isInteger(candidate.publicDisplay?.prominence) || candidate.publicDisplay.prominence < 0 || candidate.publicDisplay.prominence > 100) errors.push(label + ".publicDisplay.prominence must be an integer from 0 to 100.");

  const arrays = ["courtEvents", "predictiveIndicators", "demandSignals", "seoLongTail", "paaObserved", "paaCandidates", "aeoTargets", "aiSearchPrompts", "buyerQuestions", "canonicalUrls", "distributionStatus", "fieldFreshness"];
  arrays.forEach((field) => reqArray(candidate[field], label + "." + field));
  reqUniqueText(candidate.paaCandidates, label + ".paaCandidates");
  reqUniqueText(candidate.aiSearchPrompts, label + ".aiSearchPrompts");

  for (const [i, event] of (candidate.courtEvents ?? []).entries()) {
    const p = label + ".courtEvents[" + i + "]";
    reqText(event?.eventId, p + ".eventId");
    reqText(event?.eventType, p + ".eventType");
    if (!date(event?.date)) errors.push(p + ".date must be YYYY-MM-DD.");
    if (!verificationStates.has(event?.dateStatus)) errors.push(p + ".dateStatus is invalid.");
    if (!verificationStates.has(event?.timeStatus)) errors.push(p + ".timeStatus is invalid.");
    reqUrl(event?.sourceUrl, p + ".sourceUrl");
    reqDateTime(event?.verifiedAt, p + ".verifiedAt");
    if (event?.timeStatus === "not publicly verified" && event?.time != null) errors.push(p + ".time must be null when unverified.");
    if (event?.timeStatus === "confirmed" && (!text(event?.time) || !text(event?.timezone))) errors.push(p + " needs time and an IANA timezone when confirmed.");
    const key = String(event?.docket ?? candidate.legalTruth?.docket ?? "no-docket").toLowerCase() + "|" + event?.date + "|" + String(event?.eventType).toLowerCase();
    if (eventKeys.has(key)) errors.push(p + " duplicates event key " + key + ".");
    else eventKeys.add(key);
  }
  for (const [i, signal] of (candidate.predictiveIndicators ?? []).entries()) {
    const p = label + ".predictiveIndicators[" + i + "]";
    reqText(signal?.signalId, p + ".signalId");
    reqText(signal?.type, p + ".type");
    reqDateTime(signal?.startsAt, p + ".startsAt");
    reqDateTime(signal?.observedAt, p + ".observedAt");
    reqUrl(signal?.sourceUrl, p + ".sourceUrl");
    if (!reliabilityStates.has(signal?.reliability)) errors.push(p + ".reliability is invalid.");
    if (signal?.windowProfile !== "standard-event") errors.push(p + ".windowProfile must be standard-event.");
  }
  for (const [i, signal] of (candidate.demandSignals ?? []).entries()) {
    const p = label + ".demandSignals[" + i + "]";
    reqText(signal?.channel, p + ".channel");
    reqText(signal?.observation, p + ".observation");
    reqDateTime(signal?.observedAt, p + ".observedAt");
    reqUrl(signal?.sourceUrl, p + ".sourceUrl");
  }
  for (const [i, item] of (candidate.seoLongTail ?? []).entries()) reqText(item?.query, label + ".seoLongTail[" + i + "].query");
  for (const [i, item] of (candidate.paaObserved ?? []).entries()) {
    reqText(item?.question, label + ".paaObserved[" + i + "].question");
    reqUrl(item?.observationUrl, label + ".paaObserved[" + i + "].observationUrl");
    reqDateTime(item?.observedAt, label + ".paaObserved[" + i + "].observedAt");
  }
  for (const [i, item] of (candidate.aeoTargets ?? []).entries()) {
    reqText(item?.question, label + ".aeoTargets[" + i + "].question");
    reqText(item?.answerShape, label + ".aeoTargets[" + i + "].answerShape");
  }
  for (const [i, item] of (candidate.buyerQuestions ?? []).entries()) {
    const p = label + ".buyerQuestions[" + i + "]";
    reqText(item?.question, p + ".question");
    reqText(item?.purchaseIntent, p + ".purchaseIntent");
    reqUrl(item?.sourceUrl, p + ".sourceUrl");
    reqDateTime(item?.observedAt, p + ".observedAt");
  }
  for (const [i, item] of (candidate.canonicalUrls ?? []).entries()) {
    reqText(item?.role, label + ".canonicalUrls[" + i + "].role");
    reqUrl(item?.url, label + ".canonicalUrls[" + i + "].url");
  }
  for (const [i, item] of (candidate.distributionStatus ?? []).entries()) {
    const p = label + ".distributionStatus[" + i + "]";
    if (!destinations.has(item?.destination)) errors.push(p + ".destination is invalid.");
    reqText(item?.status, p + ".status");
    reqText(item?.version, p + ".version");
    reqDateTime(item?.factualCutoff, p + ".factualCutoff");
    if (item?.deliveredAt != null) reqDateTime(item.deliveredAt, p + ".deliveredAt");
  }
  for (const [i, item] of (candidate.fieldFreshness ?? []).entries()) {
    const p = label + ".fieldFreshness[" + i + "]";
    reqText(item?.fieldPath, p + ".fieldPath");
    if (!freshnessStates.has(item?.status)) errors.push(p + ".status is invalid.");
    reqDateTime(item?.observedAt, p + ".observedAt");
    reqUrl(item?.sourceUrl, p + ".sourceUrl");
    if (item?.freshUntil != null) reqDateTime(item.freshUntil, p + ".freshUntil");
  }
}

if (errors.length) {
  console.error("Court Command bundle failed validation (" + errors.length + " errors):");
  errors.forEach((error) => console.error("- " + error));
  process.exit(1);
}
const eventCount = bundle.cases.reduce((count, candidate) => count + candidate.courtEvents.length, 0);
console.log("Court Command bundle v2 passed: " + bundle.cases.length + " case(s), " + eventCount + " court event(s), " + caseKeys.size + " stable key(s).");
