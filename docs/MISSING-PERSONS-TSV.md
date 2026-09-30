# Missing Persons TSV update guide

The public map is generated from `src/data/missing-persons.tsv`. One published case is one spreadsheet row.

## Fast update

1. Open the TSV in a spreadsheet editor.
2. Verify the case against the investigating agency and at least one authoritative system when available.
3. Edit the existing row or add a new row without changing the header order.
4. Set `verification_date` to the date the official source was checked.
5. Keep coordinates approximate: city, county, or region center with no more than two decimal places. Never enter an address or a search location.
6. Use the authority's exact public status in `agency_status`; use one normalized NEP value in `status`.
7. Set `visibility` to `draft` until every required field and tip route is verified, then change it to `published`.
8. Update the `last_updated` metadata row.
9. Run `npm run missing:check`, then `npm run build`.

## Canceled or withdrawn source assets

A canceled or withdrawn flyer is not proof that a person was located, recovered, or otherwise resolved. Before publication, inspect the current detail page and its image/file name; do not rely on an archive or index listing alone.

- Add the case to `src/data/missing-persons-holds.tsv` when an official detail page serves a canceled or withdrawn asset and no authoritative disposition is available.
- Keep the case row at an active-type `status`, set `visibility` to `draft`, and state `UNKNOWN` or `disposition pending agency confirmation` in `agency_status`.
- Do not change the row to `located_safe`, `recovered_deceased`, or `resolved` until the investigating agency or an equivalent authoritative successor record states that outcome.
- Remove a hold only after recording the authoritative successor evidence in the case row. `npm run missing:check` blocks held cases and any row containing canceled/withdrawn evidence from publication.

## Status values

`missing`, `endangered`, `involuntarily_missing`, `abducted`, `voluntarily_absent`, `located_safe`, `recovered_deceased`, or `resolved`.

Use a specialized status only when the investigating authority uses or clearly supports it. `Recovered deceased` never means homicide. Resolved statuses are removed from the active map and retained in the resolved archive.

## Required publication fields

`id`, `name`, `status`, `agency_status`, `approx_location`, `region`, `country`, `latitude`, `longitude`, `map_precision`, `date_missing`, `investigating_agency`, `verification_date`, `source_type`, `source_url`, `source_label`, `tip_url`, `tip_label`, `follow_key`, `summary`, and `visibility`.

`case_number`, `article_path`, and `image_path` are optional. Leave a case number blank when the authority has not published it. Images must be approved local assets; never paste an unlicensed or fabricated likeness into the TSV.

## Source and tip rules

- `source_url` must be the investigating agency, NamUs, NCMEC, a tribal authority, INTERPOL, or another official government source.
- `tip_url`, `tip_phone`, and any displayed instructions must route to the official agency or authorized tipline. NEP never receives investigative leads.
- `article_path`, when present, points to a dated NEP reporting snapshot. Updating the live map row must not silently rewrite the historical article.
- `follow_key` is a stable, non-sensitive slug used to measure case interest and prepare case-specific email segmentation.
