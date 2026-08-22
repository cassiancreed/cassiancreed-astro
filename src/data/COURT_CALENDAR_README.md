# Court calendar editing guide

`court-calendar.tsv` is the single source of truth for the public court calendar.
Future calendar updates should change or replace that table only. Do not add case
facts, dates, FAQ copy, or hero-summary copy directly to the Astro page.

## Routine update

1. Open `court-calendar.tsv` in Excel, Numbers, or Google Sheets.
2. Edit existing rows, add new rows, or move finished cases to `completed`.
3. Check every listed case against its source every day, correct any changed
   information, and add newly confirmed cases.
4. Set every reviewed row's `verified` date and the `last_updated` metadata row
   to that day's publication date. The public page uses this one overall update
   date while each entry retains its own verification date.
5. Export as tab-separated values, preserving the exact column headers.
6. Run `npm run calendar:check`. The normal site build runs the same check
   automatically and will stop if the table is malformed.

## Permanent display rules

- The public calendar is one worldwide calendar. Never create separate visual
  tiers, badges, compact treatments, or prominence rules for US versus
  international cases.
- The NEP L1-L4 level controls how a case is described and handled; it never
  determines whether a meaningful trending case is tracked. Risk changes treatment,
  not inclusion. No meaningful case may silently disappear because of age, posture,
  anonymity, acquittal, dismissal, reversal, or perceived production risk.
- Keep three decisions separate: (1) inclusion comes from meaningful case relevance,
  (2) legal wording comes from the verified L1-L4 posture, and (3) visual prominence
  and production priority come from worldwide commercial demand. Never use a legal
  level as a demand penalty or use demand to change legal wording.
- A case with a known court date appears in its correct date square. Do not also
  repeat it in a separate Trending section.
- A strongly trending case without a published next date may appear in the slim,
  clickable exception row inside the calendar. Label it clearly as **Trending —
  no court date currently available**. Never invent or infer a date to place it
  in a square.
- The numerical commercial-demand score is the baseline editorial prominence
  signal in crowded date squares. It measures worldwide revenue opportunity, not
  US attention alone: combine audience volume, geographic spread, purchasing power,
  purchase intent, and current momentum. A smaller high-intent audience may outrank
  a larger low-value audience. Never boost or suppress a case merely because it is
  US or international.
- The commercial-demand score controls which names naturally fit in the limited
  space, their order, font size and weight, and warm color intensity. Do not assign
  orange, white, large, or small treatments merely from first/second position or
  geography.
- A verified, live paid explainer is the one deliberate commercial exception. Give
  it the teal **Explainer** treatment and guarantee the highest-trending explainer
  one visible slot when a date has more cases than the square can show. The case's
  font size and natural rank still come from its real trend score, so the promotion
  never falsely claims greater trend strength. Never add this treatment before the
  public checkout and delivered file have both been tested.
- All proceedings remain available when the reader selects a date, even when a
  lower-trending name does not fit in the month-grid square.
- Keep the page title, navigation, controls, and exception row compact so the
  maximum practical portion of the month is visible without scrolling.
- `calendar-display-priority.mjs` holds the current commercial-demand scores.
  Refresh them whenever the worldwide demand scan changes; the calendar presentation
  responds automatically. The 2026-08-22 `Demand_Order` values remain a provisional
  baseline until they are augmented with credible worldwide purchasing-power and
  purchase-intent evidence. Do not present that provisional order as a worldwide
  revenue ranking. Never expose the score, order, demand signal, source ecosystem,
  or internal flags on the public page.

## Canonical case-handling doctrine

[`docs/NEP-Case-Handling-Doctrine-v2.0.md`](../../docs/NEP-Case-Handling-Doctrine-v2.0.md)
is the sole authoritative doctrine. It supersedes the former domestic-first L1–L4
v1.0 text and every shortened summary. Read the complete doctrine before assigning
posture or publishing wording.

- **L1:** conviction stands and review is complete, expired, or waived.
- **L2-provisional:** conviction stands, the challenge window remains open, and no
  challenge has been recorded. State the conviction as fact plus the open-window note.
- **L2-active:** conviction stands and a material challenge is pending.
- **L2-denovo:** conviction stands, but the appeal is a fresh hearing that may
  re-decide the facts and replace the first-instance judgment.
- **L3:** prosecution or formal investigation is underway and no valid conviction
  exists. Exact verified charges—including first-degree murder—may be stated, but
  they must be attributed: “charged with,” “accused of,” or “prosecutors allege.”
  Do not encode guilt in names, headlines, metadata, alt text, or imagery.
- **L4:** no standing conviction and the disposition is final. Lead with the exact
  supported disposition and do not revive obsolete guilt framing.
- **L4-provisional:** an acquittal stands but the prosecution may still appeal. Lead
  with the acquittal, state that it is not final, and do not call the person cleared
  or exonerated.
- Apply `-A` (in absentia), `-R` (reliability-flagged), `-X` (restricted), and `-J`
  (juvenile) modifiers whenever supported.

There is one doctrine for every jurisdiction. Jurisdiction modules supply local-law
requirements and govern when local law conflicts with house style. Finality must be
established under the deciding legal system's own rules. Unknown finality defaults
to open. The level controls treatment, never inclusion or commercial prominence.

## Row rules

- `section`: `meta`, `scheduled`, `unconfirmed`, `appeal`, `investigation`, or `completed`.
  - `scheduled` rows carry a real date and render under **In Court Now** when `ongoing` is `true`, otherwise under **Upcoming Dates**.
  - `appeal` rows render under **Awaiting Decision**: argued, filed, or fully briefed and now waiting on a court. No date.
  - `investigation` rows render under **Active Investigations — No Court Proceeding**. These are matters where no court has scheduled anything and often no one has been charged. The parser rejects an `investigation` row that carries `date_iso` or `groups`, and requires `detail`, so the page can never imply a proceeding that does not exist. Where a suspect has been booked but no court setting is published, say so in `detail` and keep the charging language in allegation form.
- The `page_title` and `page_description` metadata rows control the public page
  title and search/social description, including the calendar year.
- Scheduled rows require `date_iso`, `date_text`, `detail`, and `groups`.
- `groups` uses `|` between values. Every scheduled row must include `next`.
  The optional `trials`, `hearings`, and `sentencing` display groups are retired:
  they printed the same proceeding a second and third time on the page, the
  copies drifted apart, and one copy was always the stale one. The parser still
  accepts the values so old exports do not break, but nothing renders from them.
  Every proceeding is now written out once, indexed once in the case-by-case
  table, and referenced from the FAQ by link.
- `ongoing` is either blank or `true`. Use `true` only while a proceeding is
  actively underway, so it remains visible after its start date.
- `faq_question` is optional. When present, the page and its search-engine FAQ
  data automatically create an answer from that row.
- Source fields must contain complete `http` or `https` web addresses. They are
  retained as editorial records but displayed as non-clickable source names.
- Internal-link fields must contain a same-site path beginning with `/`. The
  validator rejects external URLs so calendar links cannot send readers away.
- Do not put tabs or hard line breaks inside a cell.

## Retiring an entry to the archive

A `completed` row leaves the live page only when the matter is finished and has
been closed long enough that it is no longer news. Nothing is deleted.

1. Cut the entire row out of `court-calendar.tsv`.
2. Paste it, unchanged, into `court-calendar-archive.tsv`. Keep the `completed`
   section value, the `verified` date, and both source columns. Do not rewrite
   the text on the way in; the archive's purpose is that a page which once
   carried a claim still shows it.
3. Run `npm run archive:check`. It rejects an archived row that lost its source
   or its verified date, and it rejects any id that exists in both files.

Do not archive a matter that is still awaiting a ruling, still inside an appeal
window, or otherwise still open, however quiet it has become. Reader demand is
never a reason to archive or to keep an entry.

## Do not delete a stale row to make a date go away

A scheduled row whose date has passed and whose `ongoing` is blank stops
rendering. That silence is a trap: the row is still in the file, still says a
proceeding is coming, and nobody notices. When a date passes, either move the
row forward with a sourced new date, set `ongoing` to `true` while the
proceeding is actually running, or move it to `unconfirmed` or `completed`.
Never leave a forward-looking date in the file after it has arrived.

The page automatically sorts court dates, builds the next-dates summary, renders
case cards and FAQs, and updates structured data from this table.

## International Court Watch

`international-watch.tsv` is the single source of truth for non-US verification
fields because different jurisdictions use different court structures, terminology,
and publication practices. The public `/court-calendar/` merges those verified rows
into one worldwide display. Geography never determines prominence; the display rank
comes from the current trend-priority map, while country and court remain visible as
factual details. `/international-court-watch/` remains a deeper source view.

1. Edit `international-watch.tsv`, then run `npm run intl:check`. The site build
   runs the same check and will stop if the table is malformed.
2. Set every reviewed row's `verified` date and the `last_updated` metadata row to
   that day's publication date, exactly as with the US calendar.

### Row rules

- `section`: `meta`, `listed`, `monitoring`, or `concluded`.
- `listed` is reserved for matters where a named court or tribunal has published
  the date itself. Those rows require `date_iso`, `date_text`, `court`, a
  `time_status` of `confirmed`, and a `source_type` of `court listing`,
  `court filing`, or `court record`.
- `monitoring` rows must not carry `date_iso`. A date reported only by media goes
  in `next_note`, described as reported rather than listed, so the page never
  implies a court has scheduled something it has not.
- `court` is optional on purpose. Some monitored matters are police searches or
  investigations with no court proceeding at all, and the page says so rather than
  implying one exists.
- `country` is required on every non-meta row and drives the country count in the
  page summary.
- `time_status`: `confirmed`, `tentative`, `reported only`, or
  `not publicly verified`.
- Every non-meta row requires a `verified` date, `detail`, and a primary source.
- Source and internal-link rules match the US calendar above.
