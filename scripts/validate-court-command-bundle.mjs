#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: npm run court-command:check -- <court-command-bundle.json>");
  process.exit(1);
}

const errors = [];
let bundle;

try {
  bundle = JSON.parse(await readFile(resolve(inputPath), "utf8"));
} catch (error) {
  console.error(`Court Command bundle could not be read: ${error.message}`);
  process.exit(1);
}

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const isDateTime = (value) => typeof value === "string" && !Number.isNaN(Date.parse(value));
const isUrl = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};
const text = (value) => typeof value === "string" && value.trim().length > 0;
const timeStates = new Set(["confirmed", "tentative", "superseded", "not publicly verified"]);
const dateStates = new Set(["confirmed", "tentative", "superseded", "not publicly verified"]);

if (!isObject(bundle)) errors.push("The bundle root must be an object.");
if (!text(bundle?.bundleVersion)) errors.push("bundleVersion is required.");
if (!isDateTime(bundle?.generatedAt)) errors.push("generatedAt must be an ISO date-time.");
if (!Array.isArray(bundle?.pronunciations) || bundle.pronunciations.length !== 0) {
  errors.push("pronunciations must be an empty array.");
}
if (!Array.isArray(bundle?.cases) || bundle.cases.length === 0) {
  errors.push("cases must contain at least one case.");
}

const candidateIds = new Set();
const eventKeys = new Set();

for (const [caseIndex, candidate] of (bundle?.cases ?? []).entries()) {
  const label = `cases[${caseIndex}]`;
  if (!isObject(candidate)) {
    errors.push(`${label} must be an object.`);
    continue;
  }
  if (!text(candidate.caseName)) errors.push(`${label}.caseName is required.`);
  if (candidate.candidateId !== undefined) {
    if (!text(candidate.candidateId)) errors.push(`${label}.candidateId must be non-empty.`);
    else if (candidateIds.has(candidate.candidateId)) errors.push(`${label}.candidateId duplicates ${candidate.candidateId}.`);
    else candidateIds.add(candidate.candidateId);
  }

  for (const field of ["trendSignals", "mediaCoverage", "courtEvents", "sources", "priorCoverage", "assets"]) {
    if (candidate[field] !== undefined && !Array.isArray(candidate[field])) {
      errors.push(`${label}.${field} must be an array.`);
    }
  }

  for (const [mediaIndex, item] of (candidate.mediaCoverage ?? []).entries()) {
    const mediaLabel = `${label}.mediaCoverage[${mediaIndex}]`;
    if (!text(item?.title)) errors.push(`${mediaLabel}.title is required.`);
    if (!text(item?.outlet)) errors.push(`${mediaLabel}.outlet is required.`);
    if (!isUrl(item?.url)) errors.push(`${mediaLabel}.url must be HTTP(S).`);
    if (!isDateTime(item?.publishedAt)) errors.push(`${mediaLabel}.publishedAt must be an ISO date-time.`);
  }

  for (const [eventIndex, event] of (candidate.courtEvents ?? []).entries()) {
    const eventLabel = `${label}.courtEvents[${eventIndex}]`;
    if (!text(event?.eventType)) errors.push(`${eventLabel}.eventType is required.`);
    if (!isDate(event?.date)) errors.push(`${eventLabel}.date must be YYYY-MM-DD.`);
    if (!dateStates.has(event?.dateStatus)) errors.push(`${eventLabel}.dateStatus is invalid.`);
    if (!timeStates.has(event?.timeStatus)) errors.push(`${eventLabel}.timeStatus is invalid.`);
    if (!isUrl(event?.sourceUrl)) errors.push(`${eventLabel}.sourceUrl must be HTTP(S).`);

    if (event?.timeStatus === "not publicly verified" && event?.time != null) {
      errors.push(`${eventLabel}.time must be null when the time is not publicly verified.`);
    }
    if (event?.timeStatus === "confirmed" && (!text(event?.time) || !text(event?.timezone))) {
      errors.push(`${eventLabel} needs both time and court-local IANA timezone when time is confirmed.`);
    }

    const docket = String(event?.docket ?? candidate.docket ?? "no-docket").trim().toLowerCase();
    if (isDate(event?.date) && text(event?.eventType)) {
      const key = `${docket}|${event.date}|${event.eventType.trim().toLowerCase()}`;
      if (eventKeys.has(key)) errors.push(`${eventLabel} duplicates event key ${key}.`);
      else eventKeys.add(key);
    }
  }
}

if (errors.length) {
  console.error(`Court Command bundle failed validation (${errors.length} error${errors.length === 1 ? "" : "s"}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

const eventCount = bundle.cases.reduce((count, candidate) => count + (candidate.courtEvents?.length ?? 0), 0);
console.log(`Court Command bundle passed: ${bundle.cases.length} case(s), ${eventCount} court event(s), ${candidateIds.size} explicit candidate ID(s).`);
