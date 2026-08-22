# Court Command rules for Codex

These instructions govern repository-wide Court Command work for `cassiancreed/cassiancreed-astro`.

## Objective

Convert an attached NEP Court Command intake bundle into a verified CassianCreed.com court-calendar update and, when justified, a focused article or article refresh. Complete the remote GitHub and production-deployment workflow without local-only work or user handoffs.

## Canonical case-handling doctrine

Before classifying, naming, describing, illustrating, tagging, or promoting any case, read and apply [`docs/NEP-Case-Handling-Doctrine-v2.0.md`](docs/NEP-Case-Handling-Doctrine-v2.0.md). It is the sole authoritative NEP case-handling doctrine and supersedes the former L1–L4 v1.0 doctrine and any abbreviated summary that conflicts with it.

- There is one worldwide doctrine. Never create separate domestic and international versions.
- Jurisdiction modules supply local legal requirements and govern when local law conflicts with house style.
- Assign the current L1, L2-provisional, L2-active, L2-denovo, L3, L4, or L4-provisional posture from the official record and apply any `-A`, `-R`, `-X`, or `-J` modifiers.
- Exact charges, including first-degree murder charges, may and should be stated when verified. For an L3 case, write “charged with,” “accused of,” or “prosecutors allege”; never build guilt into the case name, headline, metadata, alt text, or imagery.
- Apply status-true wording everywhere, including the calendar label, selected-date panel, case file, article, email, social copy, artwork prompt, structured data, search description, and internal link text.
- Risk changes treatment, not inclusion. Production priority and visual prominence remain separate from legal posture.

## Trigger and authorization

No magic phrase is required. Natural requests such as `I want to update the court calendar`, `Update the court calendar`, `Refresh our court calendar`, or `Fix the court calendar` activate this workflow. `Court Command` remains a backward-compatible alias.

If the request contains no research, links, or files, reply only: `Send me the trending cases, media coverage, upcoming court events, and any artwork or drafts you have. Any format is fine.` When the user supplies the materials, begin automatically without requiring another command or confirmation. If usable materials are already attached, begin immediately.

The natural-language request plus the supplied materials authorizes, for those materials only:

- verification and drafting;
- court-calendar and directly affected article changes;
- case artwork ingestion or optimization when supplied and approved;
- creation and push of a feature branch;
- pull-request creation;
- merge after all required gates pass;
- normal Netlify deployment from `main`;
- live-page verification.

It does not authorize unrelated redesigns, framework migrations, social publishing, email, book updates, destructive history rewrites, or deletion of unrelated content.

## Start condition

Before substantive editing:

1. Confirm the repository is `cassiancreed/cassiancreed-astro`.
2. Fetch current `main`.
3. Confirm push permission.
4. Create `court/YYYY-MM-DD-case-slug` remotely.
5. Confirm the remote branch exists.

If any step fails, stop with `REPOSITORY ACCESS BLOCKED`. Do not continue in an unbound scratch directory.

## Intake

1. Locate the attached `court-command-bundle.json`.
2. Validate it against `NEP-Court-Command-Intake-Bundle-Schema-v1.json` when the schema is present.
3. Treat supplied trend and media data as discovery evidence, not as the source of record.
4. Do not repeat worldwide discovery.
5. Select exactly one highest-CRUNCH actionable case unless the prompt requests calendar-only batch maintenance.

## Verification

- Verify only facts intended for publication.
- Prefer official court dockets, calendars, filings, orders, and government sources.
- Use reliable reporting for corroboration and context.
- Preserve source URLs and a precise research cutoff.
- Separate allegations, disputed assertions, admitted facts, rulings, pleas, verdicts, and sentences.
- Preserve the presumption of innocence where applicable.
- Verify and record the current case-handling level and modifiers under the canonical doctrine before publication.
- Never invent a docket, charge, courtroom, event, date, time, quotation, or procedural status.

## Dates and times

- Use the court's local IANA timezone.
- Valid time states are `confirmed`, `tentative`, `superseded`, and `not publicly verified`.
- If no time is published, store no artificial time and render: “The time has not been publicly verified.”
- A later primary court source controls over older reporting.
- Never silently overwrite conflicting dates; document the source conflict and resolution.

## Existing coverage

Before writing:

- inspect `src/data/court-calendar.tsv`;
- search existing posts and affected case pages;
- deduplicate by normalized docket + event date + event type;
- update rather than duplicate existing entries;
- repair stale or contradictory directly affected coverage;
- add reciprocal calendar/article links where appropriate.

## Output routing

Choose the smallest sufficient output:

1. `calendar-only` for a verified scheduling correction without a strong explanatory hook;
2. `article-refresh` when an existing case page can absorb the development cleanly;
3. `new-article` only when the update has a distinct, useful search question or current explanatory angle.

Full NotebookLM, audio, video, social, and full iSWEAT production are downstream jobs and must not delay the website fast lane.

## Artwork

- Reuse supplied approved artwork when present.
- Preserve the approved original outside destructive conversion.
- Publish an optimized derivative when needed for site performance.
- Include accurate alt text.
- Do not invent evidence, reenact violence, manipulate mugshots, or imply guilt.
- Artwork failure must not block a valid calendar-only update.

## Scope

Normal Court Command changes are limited to:

- `src/data/court-calendar.tsv`;
- the new or directly affected post files;
- corresponding `public/case-art/` assets;
- required reciprocal links and metadata;
- narrowly related validation changes only when an actual schema defect is proven.

Preserve unrelated user changes.

## Validation

Run:

```bash
npm run build
```

This is the authoritative validation command because it invokes calendar, post, Astro build, and site checks. Run component commands separately only to diagnose a failure. Also inspect the affected article and calendar at mobile and desktop widths when rendering behavior changed.

Repair a genuine failure and rerun once. Do not loop indefinitely. Never merge a failing build.

## GitHub and deployment

1. Push coherent checkpoints to the remote feature branch.
2. Open a draft PR early so work is recoverable.
3. Include factual cutoff, sources, changed files, and validation results in the PR description.
4. Mark ready and merge only when required checks pass and the branch is conflict-free.
5. Confirm the Netlify production deployment corresponds to the merge SHA.
6. Open and verify every affected public URL.

## Stop conditions

Stop only the affected operation for:

- inaccessible or conflicting publication-critical primary evidence;
- repository permission failure;
- persistent test/build failure after one repair attempt;
- protected-branch or merge restriction;
- Netlify failure or timeout;
- a legal or identity ambiguity that makes publication unsafe.

Preserve completed work remotely and return one exact blocker. Do not discard or recreate unaffected work.

## Final response

Return only a concise completion report:

```text
STATUS: LIVE / EXCEPTION / BLOCKED / FAILED
CASE:
ROUTE: calendar-only / article-refresh / new-article
BRANCH:
FINAL COMMIT:
PR URL:
CHECKS:
MERGE SHA:
NETLIFY DEPLOYMENT:
LIVE ARTICLE:
LIVE CALENDAR:
FACTUAL CUTOFF:
ELAPSED TIME:
WARNINGS:
```

Do not claim a branch, PR, merge, deployment, or live page without its receipt.
