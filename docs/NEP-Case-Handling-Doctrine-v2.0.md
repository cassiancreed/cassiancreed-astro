# NEP CASE-HANDLING DOCTRINE v2.0

**Neural Edge Publishing · 2026-08-02**
**Supersedes:** NEP L1–L4 Case-Handling Doctrine v1.0
**Scope:** Every case NEP covers, in every jurisdiction, in every format.
**Companions:** Jurisdiction modules (see below) · Pipeline v2.1 Stage 8.5 · iSweat 3.2 SHIELD gate

> ### ⛔ There is one doctrine
>
> **This is the only case-handling doctrine.** There is no domestic version and no international version, and none is ever to be created. Two doctrines drift, and the first time they disagree there is no way to tell which one is right.
>
> This document is **not** "v1.0 plus a foreign section." It is the same doctrine, written without the assumption that every legal system works like America's. For a US case it resolves to exactly v1.0's behaviour — finality arrives after direct appeal, `L2-denovo` never fires, `L4-provisional` never fires. **The US is not the base case. It is one jurisdiction whose answers happen to be simple.**

### Architecture — two layers, and only two

| Layer | What it is | How many |
|:--|:--|:--|
| **This doctrine** | *How NEP describes a case at a given legal posture.* Universal. Jurisdiction-neutral. | **Exactly one, always** |
| **Jurisdiction modules** | *What the local law actually requires* — anonymity regimes, contempt clocks, defamation posture, court-media rules, appeal deadlines. | **One per jurisdiction, as needed** |

The doctrine tells you a case is `L2-provisional-X`. The **jurisdiction module** tells you what `-X` means where the case was tried. When the two touch the same question, **the module governs**, because local law is not overridable by house style. Modules never restate the doctrine, and the doctrine never encodes one country's rules.

Current modules: **NEP UK Jurisdiction Module v1.0** (England & Wales). Build others as new jurisdictions enter the lane.

**What changed in v2.0:** v1.0 was written around US procedure and silently assumed it — indictments, habeas, double jeopardy, a conviction that becomes final once the defendant's appeal runs out. Most of the world does not work that way. v2.0 keeps the L1–L4 spine intact and makes it portable.

---

## Core rule — unchanged

The level controls **how NEP describes and handles the case**. It does not decide whether the case is tracked.

Every meaningful trending case stays in:

- current intelligence;
- the court calendar;
- its NEP case file.

Production ranking is separate. **Risk changes treatment, not inclusion. No meaningful case silently disappears.**

---

## The internationalisation rule

> **Finality is defined by the system that decided the case, not by American or British assumptions about what an appeal is.**

Three assumptions built into v1.0 are false outside common-law jurisdictions:

**1. "An appeal reviews the trial."** In much of the civil-law world the first appeal is a **fresh hearing on the facts** — *appello*, *appel*, *Berufung* — which can replace the first-instance judgment wholesale rather than review it for error. A first-instance conviction there is a provisional result, not a settled one.

**2. "Only the defence appeals."** In most civil-law systems **the prosecution can appeal too**, including against sentence and, within limits, against acquittal. Italy's code expressly provides for prosecution appeals against judgments of conviction, and defines finality by reference to the expiry of appellate remedies or the disposal of a Cassation appeal ([Italian Code of Criminal Procedure](https://canestrinilex.com/assets/Uploads/pdf/cf70b10e21/Italian-Code-of-Criminal-Procedure-canestriniLex.pdf)).

**3. "An acquittal is the end."** In the US and, with narrow exceptions, the UK, it usually is. **In much of Europe, Latin America and East Asia it is not.** An acquitted person can be convicted on appeal.

### The operative consequence

Before assigning any level to a non-US, non-UK case, answer one question:

> **Under this system's own rules, is this judgment final?**

The terms to look for are *irrevocabile*, *Rechtskraft*, *chose jugée*, *cosa juzgada*, *res judicata*, "definitive," "no longer subject to appellate remedies." If you cannot establish finality, **the judgment is not final.** Unknown defaults to open.

---

## L1 — Standing conviction; review complete, expired, or waived

### Use L1 when

- A valid conviction stands.
- Review is **complete under the deciding system's own rules** — appellate remedies exhausted, expired, or knowingly waived.

### Required treatment

- State the conviction as fact.
- Give the exact offence and count when verified.
- Say whether the conviction came through a guilty plea or a verdict — **and see the plea note below.**
- Give the verified sentence when relevant.
- State that review is complete or waived when that matters.
- Do not exaggerate what the judgment proved.
- Do not turn every allegation from the case into an established fact.

### 🆕 Plea note

**"Guilty plea" is not universal.** Many civil-law systems have no plea in the Anglo-American sense; the court must satisfy itself of guilt on the evidence regardless of admission. Others have negotiated procedures that resemble a plea but are not one — Italy's *patteggiamento*, for example. **Describe the actual procedure. Do not translate it into "pleaded guilty" unless that is what happened.**

### Move the case

To **L2** if any material challenge begins — appeal, cassation, revision, habeas, post-conviction petition, new-trial motion, plea-withdrawal effort, or a supranational application such as one to the European Court of Human Rights.

---

## L2 — Standing conviction; review open

A conviction stands but the matter is not finished. **Three sub-states**, because they carry different risks.

### 🆕 L2-provisional — window open, nothing lodged

**Use when:** conviction stands, the period for challenge has not expired, and nothing has been lodged. This is the posture of **every case in its first weeks.**

**Required treatment — L1-leaning. See the default ruling below.**

- State the conviction as fact, in ordinary declarative language.
- Carry **one standing note** that the period for challenge remains open and no challenge has been recorded as of the publication date.
- **Restrain commentary on any issue that a challenge would put in play** — the safety of the verdict, the reliability of contested evidence, the conduct of the trial.
- Do not hedge the conviction itself.

**Moves to:** **L1** on expiry with nothing lodged · **L2-active** the moment anything is lodged.

### L2-active — challenge lodged

**Use when:** a direct appeal, cassation, revision, habeas petition, post-conviction motion, new-trial motion, plea-withdrawal effort, innocence claim, or other material challenge is under way.

**Required treatment:**

- State the conviction as fact.
- Clearly state that a challenge is pending, and identify what is being reviewed.
- Do not call the matter fully settled.
- Do not imply the conviction has been erased unless a court has actually vacated or reversed it.
- Do not predict the outcome.

### 🆕 L2-denovo — the appeal is a fresh hearing

**Use when:** the deciding system's first appeal is a retrial on the facts rather than a review for error — the standard position across much of the civil-law world.

**Required treatment:** everything in L2-active, plus:

- State explicitly that **the appeal court may re-decide the facts and substitute its own judgment**, and that the conviction is therefore a first-instance result rather than a settled one.
- **Never describe a first-instance conviction in this system as though direct review were a formality.** It is not.
- Where the system requires a final appellate court to confirm before a judgment is definitive, say so.

### Move the case

- To **L1** when all challenges end and the conviction remains.
- To **L4** if the conviction is vacated, reversed, quashed, annulled, or otherwise no longer stands.

---

## L3 — Under prosecution; no conviction

### Use L3 when

The person has been arrested, charged, indicted, arraigned, bound over, committed, placed under formal investigation, or put on trial — **and no valid conviction exists.**

### 🆕 Procedural-translation rule

**Do not import American procedural words for foreign procedures.** They carry meanings the foreign step does not have, and they overstate the legal record — which is a direct breach of the metadata rule below.

- **"Indicted"** means a grand jury acted. Most countries have no grand jury. Do not use it for them.
- **"Arraigned"** describes a specific common-law hearing.
- France's **mise en examen** is a formal placement under investigation by an investigating judge. It is **not** an indictment and **not** a charge in the US sense.
- Where no clean English equivalent exists, **name the foreign step and explain it in one clause.** Accuracy beats familiarity.

### Required treatment

- Use terms such as **accused**, **charged**, **under investigation**, or **prosecutors allege**.
- State the person's exact plea **or**, where the system has no plea, the position they have taken.
- Preserve the presumption of innocence.
- Separate allegations, testimony, lawyer arguments, and court findings.
- Do not narrate guilt as fact.
- Do not use guilt imagery.
- **Do not use headlines, tags, descriptions, alt text, or metadata stronger than the legal record.**

### Move the case

- To **L1** or **L2** after a valid conviction, depending on review status.
- To **L4** after an acquittal, dismissal, discontinuance, vacatur, or any other outcome leaving no standing conviction.

---

## L4 — No standing conviction

### Use L4 when the case involves

An acquittal · dismissed or discontinued charges · an uncharged person · an unsolved case · a person officially cleared · an exoneration · a reversed, quashed, annulled or vacated conviction · a vacated plea · a deceased person with no standing conviction.

### Required treatment

- State the exact disposition prominently.
- Use **acquitted**, **dismissed**, **discontinued**, **uncharged**, **vacated**, **reversed**, **quashed**, **annulled**, **cleared**, **exonerated**, or **unsolved** only when the record supports that exact term.
- Do not imply "guilty but escaped."
- Do not revive old or obsolete guilt language.
- Do not turn suspicion, repeated social claims, or an old accusation into fact.

### 🆕 L4-provisional — the acquittal can still be appealed

**Use when:** the prosecution retains a right of appeal against the acquittal.

This is the **single largest international trap in the doctrine.** In the US, double jeopardy bars it. In England and Wales it is narrowly exceptional. **Across much of Europe, Latin America and East Asia, prosecution appeal against acquittal is ordinary procedure**, and an acquitted person can be convicted on appeal.

**Required treatment:**

- Everything in L4 — the acquittal leads, and is stated in full.
- Plus a plain statement that **the prosecution may appeal and the outcome is not final.**
- Do not describe the person as "cleared" or "exonerated." Those words assert finality this posture does not have.
- **Register the appeal deadline as a legal-clock trigger.**

**Moves to:** **L4** on expiry with no appeal · **L3 or L2** if the acquittal is appealed or overturned.

### Move the case

Reclassify only when a new formal charge, conviction, or court ruling changes the legal posture.

---

## 🆕 Modifiers

Modifiers attach to any level. Write them into the case file alongside the level.

| Modifier | Meaning | Required treatment |
|:--|:--|:--|
| **-A** | **In absentia.** Tried or convicted without the defendant present. | State that the defendant was absent. In systems granting an automatic retrial on arrest, say so — the conviction may not survive the person's return. Never present an in-absentia conviction as equivalent to one after a contested trial. |
| **-R** | **Reliability-flagged.** The deciding jurisdiction lacks an independent judiciary, fair-trial guarantees, or meaningful appellate review. | Report the **proceeding as an event**, not the **finding as truth**. "A court in X convicted Y" — never "Y is guilty of." Do not launder a political verdict into a factual claim. Say plainly why the finding carries limited evidentiary weight. |
| **-X** | **Restricted.** Reporting restrictions, statutory anonymity, sealed material, or a publication ban applies. | Identify the restriction and its source. Apply the jurisdiction module. Restrictions bind NEP as a publisher into that territory regardless of where NEP sits. |
| **-J** | **Juvenile.** A person under 18 at the material time. | Assume anonymity protection applies until confirmed otherwise. Age-related restrictions frequently survive into adulthood. |

Modifiers combine. `L2-provisional-X` is the posture of the Welsh case as at 2 August 2026.

---

## 🆕 Jurisdiction quick-reference

Orientation only. **Always confirm against the deciding system's current rules — this table is a prompt to check, not a substitute for checking.**

| System | First appeal | Prosecution may appeal acquittal? | Finality |
|:--|:--|:--|:--|
| **United States** (federal and state) | Review for error | **No** — double jeopardy bar | After direct appeal; collateral review may follow |
| **England & Wales** | Review, leave required | **Narrowly exceptional only** | After appeal period expires or appeal disposed of |
| **Scotland** | Review | Limited | Distinct system — verdict structure and appeal routes differ from England & Wales. **Confirm current position before publishing.** |
| **Ireland, Canada, Australia, New Zealand** | Review | Limited, varies | Common-law pattern, but confirm per jurisdiction |
| **Italy** | *Appello* — fresh hearing on the facts | **Yes**, within limits | **Only when irrevocable** — appellate remedies expired or Cassation disposed of |
| **France, Germany, Spain, Netherlands, Nordics** | Often a fresh hearing | **Generally yes** | Per that system's finality rule |
| **Latin America** (broadly) | Varies; often fresh hearing | **Generally yes** | Per system |
| **Japan, South Korea** | Review with fact-finding elements | **Yes** | After the appellate chain |

**Default when unsure: `L2-denovo` for convictions and `L4-provisional` for acquittals.** Over-restraint is a style cost. Under-restraint is a legal and factual error.

---

## Fast handling rule

| Level | Current legal posture | NEP wording rule |
|:--|:--|:--|
| **L1** | Conviction stands; review finished or waived | Conviction stated as fact, within the judgment's actual limits |
| **L2-provisional** | Conviction stands; window open, nothing lodged | Conviction stated as fact, plus a standing open-window note; restraint on issues a challenge would raise |
| **L2-active** | Conviction stands; challenge pending | State both the conviction and the pending challenge |
| **L2-denovo** | Conviction stands; appeal is a fresh hearing on the facts | State both, and state that the appeal court may re-decide the facts |
| **L3** | Under prosecution; no conviction | Allegation language, exact plea or position, full presumption of innocence, no metadata stronger than the record |
| **L4** | No standing conviction, final | Lead with the exact disposition; do not revive guilt framing |
| **L4-provisional** | Acquitted; prosecution may still appeal | Lead with the acquittal; state that it is not final; never "cleared" or "exonerated" |

---

## 🆕 Ruling — the L2-provisional default

**Question:** in the period between conviction and the expiry of the challenge window, does NEP lean L1 or L2?

**Ruling: L1-leaning.** Reasoning, so it can be overturned on reasons rather than taste:

1. **The conviction is a fact.** A tribunal returned it and a court imposed sentence. Hedging a fact is its own species of inaccuracy, and audiences read hedged language as doubt about whether it happened.
2. **The protection sits elsewhere.** Accurate reporting of court proceedings is privileged in every jurisdiction NEP publishes into. That privilege attaches to accuracy, not to timidity. Hedging buys no additional legal protection.
3. **The base rate favours it.** Most convictions are not appealed, and most appeals do not succeed. Hedging every fresh conviction imposes a permanent tone cost across all coverage to insure against an uncommon event.
4. **The real exposure is commentary, not the fact.** What creates risk during an open window is NEP's own characterisation of contested matters — the safety of the verdict, the reliability of disputed evidence, the conduct of the trial. So the restraint is aimed there, precisely, instead of being smeared across the whole script.

**Explicit carve-out.** This default does **not** apply to `L2-denovo`, `-A`, or `-R`. Where the appeal is a fresh hearing, where the defendant was absent, or where the tribunal is unreliable, the conviction is genuinely provisional in substance, and the language must say so.

---

## Final doctrine

Assign the level from the current official record. Establish finality **under the deciding system's own rules**, never by analogy to American or British procedure. Use status-true language everywhere, including in metadata. Keep production priority separate. Change the level only when the legal posture actually changes.

**Risk changes treatment, not inclusion.**

---

## Changelog

| Version | Date | Change |
|:--|:--|:--|
| 2.0 | 2026-08-02 | Made universal — single doctrine for all jurisdictions, superseding any domestic-only reading of v1.0. Two-layer architecture fixed: one doctrine, N jurisdiction modules, module governs on conflict. Added the finality rule, `L2-provisional` with an L1-leaning default, `L2-denovo`, `L4-provisional`, the `-A` `-R` `-X` `-J` modifiers, the procedural-translation rule, the plea note, and the jurisdiction quick-reference. L1–L4 spine and the core rule preserved from v1.0. |
| 1.0 | — | Original four-level doctrine. |

---

*Editorial guidance for NEP's own publishing decisions. Not legal advice.*

