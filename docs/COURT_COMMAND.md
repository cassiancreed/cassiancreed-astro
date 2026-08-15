# NEP Court Command — Cloud Publishing System v1.2

**Purpose:** Turn minimal court information from Cassian into a verified, tested, deployed CassianCreed.com court update without local-only work, repeated handoffs, or technical wrestling.

## Selected execution AI

**Primary execution AI: Codex Cloud in a repository-bound environment.**

This is an operational selection, not a claim that one model is universally superior. Court Command's bottleneck is the ability to consume structured input, inspect an existing Astro repository, edit several related files, run terminal checks, maintain Git history, open a pull request, and leave recoverable remote work. Codex Cloud is assigned that role.

### Role separation

- **Cassian's signal exporter:** discovers trending cases, media coverage, and upcoming court events and produces the JSON bundle.
- **Codex Cloud:** verifies publication-critical claims, updates the website, runs tests, manages the GitHub branch and pull request, and verifies deployment.
- **GitHub Actions / repository checks:** perform deterministic validation and protect `main`.
- **Netlify:** deploys the merged `main` branch.
- **Full BnB downstream modules:** create NotebookLM, audio, video, social, new artwork, and full iSWEAT outputs without delaying the website.

Do not route the same website edit through Cowork, Copilot, Claude, Gemini, and Codex in sequence. A second AI may audit an exception, but Codex Cloud owns normal execution from intake to receipts.

## Codex-native optimization

The repository should contain a root `AGENTS.md` derived from `NEP-Court-Command-Codex-AGENTS-v1.md`. It makes the workflow durable and available to every future Codex task without depending on chat memory.

### Cloud environment

```text
Name: cassiancreed-astro-production
Repository: cassiancreed/cassiancreed-astro
Base branch: main
Setup: npm ci
Validation: npm run build
Agent internet: limited to required court, reporting, GitHub, CassianCreed.com, and Netlify domains
```

### Natural-language operation

Cassian can simply say:

```text
I want to update the court calendar.
```

If no materials are attached, ask once:

```text
Send me the trending cases, media coverage, upcoming court events, and any artwork or drafts you have. Any format is fine.
```

When the materials arrive, begin automatically. Do not require another command, a schema, or technical instructions. If usable materials are already attached, start immediately.

### Deterministic work versus AI judgment

Use code for:

- JSON schema validation;
- date/time/status validation;
- deduplication keys;
- TSV serialization;
- slug and path validation;
- build, link, metadata, and duplicate checks;
- checksums and receipt collection.

Use Codex judgment for:

- selecting the highest-value case from supplied evidence;
- resolving source hierarchy and conflicts;
- determining whether the update needs a new article, an article refresh, or calendar-only treatment;
- writing legally precise explanatory copy;
- identifying stale or contradictory existing coverage;
- making narrow repairs when deterministic checks fail.

This division reduces hallucination risk and prevents the agent from spending time reasoning about mechanical operations.

### Remote-first execution

1. Validate repository identity and permissions.
2. Create the remote branch immediately.
3. Open a draft pull request after the first coherent checkpoint.
4. Commit the canonical case record and website changes to the remote branch.
5. Use one `npm run build` as the authoritative local validation command; do not rerun its component checks separately unless diagnosing a failure.
6. Mark the pull request ready and merge only after required checks pass.
7. Verify the production deployment against the merge SHA.

This design makes the task recoverable from GitHub even if the agent session ends unexpectedly.

## Natural-language start

No command syntax is required. Any clear intent to update, refresh, fix, or maintain the court calendar starts intake. If materials are absent, ask once for them. If materials are present, start immediately.

The request plus the supplied materials authorizes the system to research and verify the case, update the website repository, create and push a remote branch, open a pull request, run validation, merge after all gates pass, allow the normal Netlify production deployment, and verify the live result. It does not authorize unrelated site changes or social publication.

## Fifteen-minute fast lane

When Cassian supplies a Court Command intake bundle containing trending cases, media coverage, and upcoming court events, the system uses the bundle as the discovery queue and does not repeat a worldwide trend scan.

### Automatic routing

| Route | Normal target | Output |
|---|---:|---|
| Event correction | 5 minutes | Calendar create, update, reschedule, completion, or cancellation |
| Website fast lane | 15 minutes | Winner selection, verification, calendar update, focused article or article refresh, artwork when supplied, tests, PR, merge, deployment verification |
| Full BnB production | Asynchronous | Search maps, NotebookLM, Spotify, YouTube, TikTok, social package, new artwork, and full iSWEAT |

The website fast lane is the default. Full BnB production never delays a time-sensitive court-calendar or website update. It starts as a separate downstream job after the website has a verified canonical record.

### Fifteen-minute clock

| Minute | Work |
|---:|---|
| 0–1 | Validate bundle; select the highest actionable candidate; create and confirm the remote branch |
| 1–4 | Verify only the facts intended for publication against supplied primary and reliable-source links |
| 4–8 | Deduplicate and update the calendar; create a focused article update or refresh only when justified |
| 8–10 | Add supplied or existing approved artwork, metadata, alt text, and reciprocal links |
| 10–12 | Run calendar, post, build, link, and duplication checks |
| 12–14 | Push, open/update PR, and merge when every gate passes |
| 14–15 | Confirm Netlify and smoke-test the live URLs |

The fifteen-minute figure is a normal operating target, not permission to publish uncertain facts. A court-source conflict, inaccessible primary record, failed build, GitHub outage, or Netlify queue changes the status to `EXCEPTION` and identifies the single blocked gate. Completed work remains on the remote branch.

### Work eliminated from the fast lane

- no new worldwide trend discovery when the bundle already contains candidates;
- no re-collection of media coverage already supplied with working URLs;
- no full NotebookLM or social package before the website update;
- no full iSWEAT run on a calendar-only correction;
- no new artwork when approved reusable or supplied artwork is available;
- no separate local checkout or copy-and-paste handoff;
- no repeated approval after Cassian invokes `Court Command` for the website destination.

### Bundle contract

Preferred upload:

```text
court-command-bundle.json
optional-assets/
```

The JSON bundle contains generation time, candidate cases, observed trend signals, media URLs, primary sources, court events, existing Cassian Creed coverage, and optional asset names. URLs remain evidence leads until verified. The bundle never becomes the source of record merely because it was generated by an automated scout.

The companion file `NEP-Court-Command-Intake-Bundle-Schema-v1.json` defines the exact machine-readable contract.

## Minimum input

Cassian supplies only one of the following:

1. A case name.
2. A court notice, screenshot, document, article, or source URL.
3. A plain-language update such as: “Mangione pleaded guilty federally; explain whether New York can continue.”

Everything else is researched or derived by the system. Cassian is not required to supply a docket number, court division, timezone, metadata, SEO terms, slug, article structure, or calendar schema.

## Permanent operating architecture

```text
Cassian input
    ↓
Case intake and verification
    ↓
Remote GitHub branch created immediately
    ↓
Canonical case record
    ↓
Calendar update + article + artwork + reciprocal links
    ↓
Automated checks and production build
    ↓
Pull request and merge
    ↓
Netlify deployment
    ↓
Live-page verification and receipts
```

### Single source of truth

- Repository: `cassiancreed/cassiancreed-astro`
- Default branch: `main`
- Cloud environment: `cassiancreed-astro-production`
- Hosting: existing GitHub-connected Netlify production site
- Branch format: `court/YYYY-MM-DD-case-slug`
- One case campaign per pull request
- GitHub is authoritative. A local checkout may be used for convenience but never as the only copy.

## Hard anti-stranding rule

Before research output is converted into website files, the system must:

1. Confirm that the cloud environment is attached to `cassiancreed/cassiancreed-astro`.
2. Confirm access to `main`.
3. Create the remote feature branch.
4. Confirm the branch exists on GitHub.

If any check fails, stop before substantive editing and report `REPOSITORY ACCESS BLOCKED`. Never perform hours of work in an unbound scratch workspace.

## Canonical case record

Every module uses one shared record:

```text
caseName
aliases
caseType
country
jurisdiction
court
division
docket
proceduralStage
claimsOrCharges
latestEvent
nextEvent
eventDate
eventTime
eventTimezone
timeStatus
dateStatus
primarySources
reportingSources
verificationTimestamp
confidence
unresolvedConflicts
articleSlug
artworkPath
canonicalCTA
pronunciations: []
```

### Date and time rules

- Store the court's local IANA timezone.
- `timeStatus` must be `confirmed`, `tentative`, `superseded`, or `not publicly verified`.
- Never invent a missing time.
- If only the date is verified, treat the event as all-day for storage and publish: “The time has not been publicly verified.”
- A later court source supersedes older reporting.
- Conflicting dates are disclosed and resolved from the strongest current source.

## Automatic workflow

### Gate 1 — Verify the case

- Resolve identity, jurisdiction, court, division, docket, and procedural stage.
- Prefer official court dockets, calendars, orders, filings, and government releases.
- Use reliable reporting for context and independent corroboration.
- Separate allegations, disputed assertions, admitted facts, rulings, pleas, verdicts, and sentences.
- Preserve the presumption of innocence where applicable.
- Record the research cutoff and unresolved conflicts.

**Failure condition:** no publishable court connection or insufficient reliable evidence.

### Gate 2 — Check existing coverage

- Search the court calendar and article archive before writing.
- Deduplicate calendar events by normalized docket + event date + event type.
- Update existing pages when possible rather than creating contradictory coverage.
- Identify stale articles affected by the new development.
- Plan reciprocal article-to-calendar and calendar-to-article links.

### Gate 3 — Build the website package

Create only what the case requires:

1. Court-calendar create, update, reschedule, completion, or cancellation record.
2. Search-informed explanatory article when the update has sufficient audience value.
3. One sober editorial master image when an article needs artwork.
4. Descriptive alt text and production-optimized image derivative.
5. Reciprocal internal links.
6. Canonical URL, title, description, social metadata, source list, and case-facts fields.

No graphic violence, invented evidence, manipulated mugshots, guilt-implying artwork, or victim reenactment.

### Gate 4 — Quality control

Run the repository-defined commands:

```bash
npm ci
npm run calendar:check
npm run posts:check
npm run build
```

The existing `npm run build` also runs the full site validation. The package must pass:

- calendar schema and date validation;
- post archive validation;
- Astro production build;
- broken-link validation;
- canonical and metadata validation;
- image and alt-text validation;
- duplicate-record scan;
- mobile and desktop overflow inspection;
- factual consistency scan across affected pages.

Failures are repaired and tested once more. A persistent failure blocks the merge and produces one precise error report.

### Gate 5 — Publish

1. Push changes to the already-existing remote branch.
2. Open or update the pull request into `main`.
3. Include changed files, factual cutoff, sources, and test results in the PR description.
4. Merge only when required checks pass and the branch is conflict-free.
5. Allow the existing Netlify Git integration to deploy `main`.
6. Verify the deployment rather than assuming that a merge equals publication.

### Gate 6 — Verify production

Open the public article and court-calendar pages and verify:

- HTTP success;
- correct case facts and court status;
- canonical URL and social metadata;
- artwork loading and alt text;
- reciprocal links;
- desktop and mobile layout;
- no stale contradictory page remains;
- Netlify production deployment corresponds to the merge commit.

## Receipt contract

Every completed run ends with this exact compact report:

```text
STATUS: LIVE / BLOCKED / FAILED
CASE:
BRANCH:
FINAL COMMIT:
PR URL:
CHECKS:
MERGE SHA:
NETLIFY DEPLOYMENT:
LIVE ARTICLE:
LIVE CALENDAR:
FACTUAL CUTOFF:
WARNINGS:
```

No claimed write counts as complete without a receipt. “Created,” “merged,” “deployed,” and “live” are separate statuses.

## Failure-isolation policy

- Research failure blocks factual publication, not repository access diagnostics.
- Artwork failure does not erase a valid calendar update.
- Article failure does not erase verified case research.
- Netlify failure leaves the merged GitHub work intact and creates one deployment retry task.
- Social-platform failure is outside this workflow and cannot block the website deployment.
- No module repeats indefinitely. One automatic repair attempt is allowed before a precise stop report.

## Scope control

The Court Command may change only:

- the court-calendar data;
- the new or directly affected case articles;
- corresponding case artwork;
- required internal links and metadata;
- narrowly related validation code when a genuine schema defect is found.

Unrelated redesigns, framework migrations, social posts, email campaigns, and catalog changes require separate authorization.

## Initial cloud setup

Configure once:

```text
Environment: cassiancreed-astro-production
Repository: cassiancreed/cassiancreed-astro
Base branch: main
Setup command: npm ci
Validation command: npm run build
```

After setup, every run begins inside this environment. General Cowork scratch sessions may prepare research or assets, but they may not be the sole holder of website changes.

## Current Luigi recovery rule

For the August 14 Luigi Mangione update, start again from current `main` inside the configured cloud environment. Reuse the verified source packet and approved artwork, reconstruct the calendar and article changes, check the older Mangione page for contradictions, and publish through the standard gates above. Once the cloud PR is validated and merged, the stranded local branch may be ignored.

## Operator experience

Cassian's normal interaction should be conversational:

```text
I want to update the court calendar.
```

The system should return either a live publication receipt or one exact blocker that requires Cassian's authority. It must not return a chain of copy-and-paste prompts, repeated login requests, speculative success messages, or a partially completed local-only branch.
