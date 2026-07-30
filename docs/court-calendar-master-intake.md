# Court Calendar — Master Intake Reconciliation

**Not a published page.** Outside `src/`, so Astro never builds it and it is absent from the sitemap.

**Reconciled through:** 2026-07-29
**Purpose:** one accounting of every matter in the combined scout universe, so no case can silently disappear. Every row carries a calendar classification *and* a legal-status level. The two are independent: the level controls wording, the classification controls placement.

**Legal-status levels** (from `NEP_CURRENT_INTELLIGENCE`, 2026-07-29 13:14 PT):
L1 standing conviction, direct review complete/expired/waived · L2 standing conviction, appeal or material challenge pending · L3 charged/indicted/on trial, no conviction · L4 no standing conviction (acquitted, dismissed, uncharged, unsolved, cleared, vacated, or deceased with no standing conviction).

**These levels are internal.** They never render on the page — no classification notes, scoring, or pipeline language is published.

---

## Totals

| | |
|---|---|
| Unique matters accounted for | **42** |
| Public — verified, with a court-ordered date | 17 matters / 20 calendar entries |
| Public — no confirmed upcoming date | 11 matters (+1 cross-reference pointer) |
| Public — concluded | 7 matters |
| Internal — not published | 7 matters |
| Unresolved / returned to PM | 1 (Nygard court name) |
| Duplicate or misidentified | 1 (PNP operation) + 4 merged duplicates |
| **Verified and installed this order** | **3** (Nolan Wells, Sara Gilson/Jeremiah Duffey, Ian Diaz § 2255) |
| Verified and installed earlier today | ~20 (PR #71 first three commits) |

---

## PUBLIC — VERIFIED (court-ordered date on the page)

| Matter | Level | Next confirmed event |
|---|---|---|
| Lindsay Clancy | L3 | trial underway; resumes 2026-07-30 09:00 |
| Colin Gray | L1 (direct review not yet commenced) | sentencing 2026-07-30 09:00 |
| Carlos Reales Dominguez | L4 (NGRI; committed, no criminal sentence) | further proceedings 2026-08-05; placement 2026-08-19 |
| Jennifer Lebron | L3 | status of attorney 2026-08-12 |
| Andrew and Tristan Tate | L3 | detention hearing 2026-08-13 |
| Karmelo Anthony | L2 | recusal 2026-08-19; new trial 2026-08-20 |
| Erin Patterson | L2 | appeal 2026-08-19–20 |
| Ndodana Mkhanyisi Tshuma | L3 | further appearance 2026-08-27 |
| Dianne Curry Peck | L3 | pretrial conference 2026-08-31 |
| David Anthony Burke (D4vd) | L3 | arraignment 2026-08-31, Dept 105 |
| Tyler James Robinson | L3 (no plea entered; not bound over) | bind-over argument 2026-09-01 |
| Luigi Nicholas Mangione | L3 | state trial 2026-09-08; federal trial 2027-01-25 |
| Yvonne "Missy" Woods | L1 | sentencing 2026-09-08 |
| Blaise Taylor | L1 (life terms attach by law; formal sentencing pending) | sentencing 2026-09-09 |
| Larry Millete | L1 | sentencing 2026-09-29 |
| Peter Nygard | L2 convictions / L3 untried US indictment | hearing 2026-10-02 |
| Goncalves v. Washington State University | n/a — civil, not criminal | jury trial 2027-09-13 |

## PUBLIC — NO CONFIRMED UPCOMING DATE

| Matter | Level | Why no date |
|---|---|---|
| Jermaine Williams Sr. | L1 | Spencer hearing expected August 2026, none published |
| Mayra Velasquez (Irasema Chavez) | L3 | a press briefing is not a court proceeding |
| Taylor Parker | L2 | habeas review has no public calendar |
| Pedro Hernandez (Etan Patz) | L2 | remand does not calendar a hearing |
| Brooke George | L4 (no charge confirmed by any authority) | no charge, no court date on any record |
| Bryan Kohberger | L2 (post-conviction petition filed 2026-07-27) | petition filed, no hearing, no case number |
| Sonam Raghuvanshi | L3 | no next trial-court hearing published |
| Sean Combs | L2 | 2d Cir. No. 25-2623 argued 2026-04-09, undecided |
| **Nolan Wells** ⟵ new | **L4** (uncharged; no defendant) | **no arrest, no charge, no convened grand jury confirmed** |
| **Sara Gilson and Jeremiah Duffey** ⟵ new | **L4** (both deceased; no standing conviction) | **no living defendant; a case cannot begin** |
| Michelle Hadley — cleared | **L4 cleared/exonerated** (Ian Diaz L2, Angela Diaz L1) | § 2255 pending, no hearing on the public record |
| *Mangione cross-reference* | pointer, not a matter | — |

## PUBLIC — CONCLUDED

Colt Gray **L1** (sentenced 2026-07-28, LWOP) · James Henry Wilson and Mark Joseph Hoggart **L4 acquitted** (*Wilson v R* [2026] NZSC 88) · Jozef Puska **L1** (appeal abandoned) · Domingos and "Chiquinho" Brazão **L1** (appeals rejected 2026-06-19) · Daryl Berman **L1** · Nestor Hernandez Melgar **L1** (no notice of appeal as of 2026-07-25; window to ~2026-08-21) · Rex Heuermann **L1** (appeal waived on the record).

## INTERNAL — NOT PUBLISHED

Full reasoning in `court-calendar-internal-ledger.md`.

| Matter | Classification | Level |
|---|---|---|
| Elozino Ogege judgment (Nigeria) | INTERNAL — PENDING VERIFICATION | L1 if confirmed — capital outcome single-sourced |
| Rashid Mohagheghian (TX) | INTERNAL — PENDING VERIFICATION | L3 — the "January 2027 trial" has no source at all |
| "El Tokyo" (Mexico) | INTERNAL — PENDING CALENDAR CLASSIFICATION | L3 — no legal name, no charge document |
| PNP seven apprehensions (PH) | **DUPLICATE OR MISIDENTIFIED** | n/a — a police operation, not a case |
| Pune / Siya Goyal (India) | INTERNAL — PENDING VERIFICATION | L3 — one social post, no FIR |
| Uganda court footage | INTERNAL — PENDING VERIFICATION | unknown — person unidentified |
| Tupac / "Keefe D" | INTERNAL — PENDING VERIFICATION | unknown — no filing named |

## NOT COURT EVENTS (recorded so they are never mistaken for one)

Netflix *A Toxic Love Story* (2026-07-22) · Netflix *The Idaho Murders: College Nightmare* (2026-07-29) · Sean Combs prison discipline and BOP release-date reporting · the Arlington/FBI joint briefing (2026-07-22) · the closed federal investigation touching Jeremiah Duffey — closed on death, never charged, and an allegation that closes without charge is not a finding.

## DUPLICATES MERGED (none dropped)

Sonam Raghuvanshi (Grok #5 + ChatGPT #7) · D4vd (Grok #1 + 12:41 football) · Kohberger (Meta #1 + football) · Clancy (ChatGPT #1 + football) · Heuermann (Grok "resolved" note + already concluded).

---

## What this order added

Three matters that the 2:49 PM order had scoped out (it limited me to the three scout reports; these came from the 12:41 PM football's case set):

1. **Nolan Wells** — the scout framing was the problem. Social claims of foul play, a racial motive, a deleted phone and audio recordings have **no named-official support**, and the sheriff has said on the record that investigators did **not** suspect foul play. The family's private autopsy says undetermined and disagrees with the sheriff; both are published, attributed, and separated. The "grand jury review" turned out to be the District Attorney describing **routine county practice** — no grand jury is confirmed convened and no date is public, so there is nothing calendarable. Published with no accused person named.
2. **Sara Gilson and Jeremiah Duffey** — no court proceeding exists and none can, because both are deceased. "Murder-suicide" is how **police say they are investigating**, not a released medical-examiner determination, and headlines state it more firmly than any official has. Mr Duffey was **never charged**; the federal investigation closed on his death. Nothing about the surviving child, the minor, the 911 material, or the manner of death is published.
3. **Ian Diaz § 2255** — re-verified against the docket: open and pending, Judge Staton still assigned, eleven entries, last activity 2026-07-27, **no ruling**. The filings and the June 26 / July 10 orders are not readable on the public docket, so his grounds and those orders are deliberately not characterised. Michelle Hadley's clearance is untouched and she remains described only as a cleared person.

---

## Exact remaining blockers

1. **No research queue was supplied.** This order's SOURCE FILES name "the prepared case-verification prompts" and say roughly 20 cases await verification, but no such material was in the message and none exists on the drive. I searched `Downloads` and `Neural Modular` for anything matching prompt / queue / verification / batch / intake, and for every `.md` modified after 2026-07-29 12:00. What exists is the three scout briefs, the 12:41 football, `NEP_CURRENT_INTELLIGENCE_2026_07_29_1314.md` (doctrine only — it contains the required *record format* but **zero case records**), `NEP_COURT_CALENDAR_INTAKE_2026-07-27.md` (superseded), and my own 3:40 PM return. `deep-research-report (23).md` is about AI, robotics and climate — unrelated. **If a queue of ~20 different cases exists, it is in the PM's session and was never pasted or saved.** Nothing was dropped: the ~20 cases in the reachable universe were verified and installed in PR #71 before this order was written, and all 42 matters are accounted for above.
2. **Missing required input: current approved NEP market-country list.** `NEP_CURRENT_INTELLIGENCE` §3 says explicitly not to invent it and to stop and name it. Both the Meta and ChatGPT scouts independently reported the same gap and fell back to guessed market sets. Until it is supplied, international coverage cannot be reconciled, and the "COUNTRIES NOT COMPLETED" line in the required return cannot be filled honestly.
3. **Outbound-link rule unresolved.** The 12:41 PM order requires external URLs to render as plain unclickable text; the 2:49 PM order forbids redesigning the calendar. 83 external anchors remain. Needs a ruling on which order governs.
4. **Full sweep still owed.** `LAST_VERIFIED` remains 2026-07-25. See the ledger for the entries still resting on that fallback.
5. **Orphan branch `cassiancreed-patch-13`** still needs deleting. Merging it would remove 181 files. No PR points at it.
