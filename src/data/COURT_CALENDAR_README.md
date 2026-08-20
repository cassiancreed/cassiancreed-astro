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

## Row rules

- `section`: `meta`, `scheduled`, `unconfirmed`, `appeal`, `investigation`, or `completed`.
  - `scheduled` rows carry a real date and render under **In Court Now** when `ongoing` is `true`, otherwise under **Upcoming Dates**.
  - `appeal` rows render under **Awaiting Decision**: argued, filed, or fully briefed and now waiting on a court. No date.
  - `investigation` rows render under **Active Investigations — No Court Proceeding**. These are matters where no court has scheduled anything and often no one has been charged. The parser rejects an `investigation` row that carries `date_iso` or `groups`, and requires `detail`, so the page can never imply a proceeding that does not exist. Where a suspect has been booked but no court setting is published, say so in `detail` and keep the charging language in allegation form.
- The `page_title` and `page_description` metadata rows control the public page
  title and search/social description, including the calendar year.
- Scheduled rows require `date_iso`, `date_text`, `detail`, and `groups`.
- `groups` uses `|` between values. Every scheduled row must include `next`;
  optional display groups are `trials`, `hearings`, and `sentencing`.
- `ongoing` is either blank or `true`. Use `true` only while a proceeding is
  actively underway, so it remains visible after its start date.
- `faq_question` is optional. When present, the page and its search-engine FAQ
  data automatically create an answer from that row.
- Source fields must contain complete `http` or `https` web addresses. They are
  retained as editorial records but displayed as non-clickable source names.
- Internal-link fields must contain a same-site path beginning with `/`. The
  validator rejects external URLs so calendar links cannot send readers away.
- Do not put tabs or hard line breaks inside a cell.

The page automatically sorts court dates, builds the next-dates summary, renders
case cards and FAQs, and updates structured data from this table.

## International Court Watch

`international-watch.tsv` is the single source of truth for the companion page at
`/international-court-watch/`. It exists because matters outside the United States
use different court structures, terminology, and publication practices, and mixing
them into the US calendar would mislead readers. The US calendar links across to it
and it links back.

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
