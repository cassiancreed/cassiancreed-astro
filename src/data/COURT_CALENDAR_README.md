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

- `section`: `meta`, `scheduled`, `unconfirmed`, `appeal`, or `completed`.
- The `page_title` and `page_description` metadata rows control the public page
  title and search/social description, including the calendar year.
- Scheduled rows require `date_iso`, `date_text`, `detail`, and `groups`.
- `groups` uses `|` between values. Every scheduled row must include `next`;
  optional display groups are `trials`, `hearings`, and `sentencing`.
- `ongoing` is either blank or `true`. Use `true` only while a proceeding is
  actively underway, so it remains visible after its start date.
- `faq_question` is optional. When present, the page and its search-engine FAQ
  data automatically create an answer from that row.
- Source and internal-link fields must contain complete web addresses or a site
  path beginning with `/`.
- Do not put tabs or hard line breaks inside a cell.

The page automatically sorts court dates, builds the next-dates summary, renders
case cards and FAQs, and updates structured data from this table.
