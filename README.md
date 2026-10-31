# cassiancreed.com

The Neural Edge Publishing site (Astro on Netlify). `npm run build` checks and builds the site. Court Command rules live in `AGENTS.md`.

## Viral Watch (Route A)

**What it does.** Every 10 minutes, from 6:00 AM to 10:30 PM Pacific, a Netlify Scheduled Function looks on X for posts about our watched cases that are taking off. When one is, Claude writes a reply, and a second Claude model checks it on the iSWEAT X lens. Only if both pass does your phone get **one** alert, with a button that opens X with our reply already typed. You tap **Reply**. It never posts to X by itself.

- **Watched cases:** cases in `src/data/court-calendar.tsv` with a court date from yesterday through the next 7 days (plus ongoing trials), and only if NEP has a page for the case. Tier A outlet handles are in `src/data/viral-watch.json`. They are marked TODO-VERIFY and are not searched until marked `"verified"`.
- **HOT** (reply now): post is 60 minutes old or less, has 2,000+ views or 50+ likes/reposts/replies/quotes, and grew 20%+ since the last check. Alert: "HOT reply: case".
- **WARM** (our own post): post is 60 to 180 minutes old, just as big, and still growing. Alert: "Post chance: case". The button opens X with our post and our page link.
- **Skipped:** posts that name a child, sensitive media, graphic words, a block-list word (slurs, violent or sexual words), or no case/page match. Long posts are checked in full (X's `note_tweet`), not just the first 280 characters. The same block list fails a draft. Tune it in `src/data/viral-watch.json` (`block_words`; slurs are stored as hashes in `block_word_hashes`).
- **Mini council:** draft model, then judge model (8 hard checks + 6 reader scores, X weights). It sends only if all 8 checks pass, the weighted score is 8.0+, and Ryan is 6.0+. The code also checks length (200 max), no links, 1 hashtag max, no bait, and no "killer"/"guilty" unless the record says convicted. One redraft at most.
- **Limits:** 6 alerts a day (`VIRAL_DAILY_CAP`), 1 alert per case per 3 hours, 2 replies per X account per day, 1 alert per run.
- All thresholds are **THEORY v1**. Tune them in `src/data/viral-watch.json`.

**The 3 env vars (required).** If any one is missing, the function logs it and does nothing.

| Name | What it is |
|---|---|
| `X_BEARER_TOKEN` | X API app bearer token (pay-per-use) |
| `ANTHROPIC_API_KEY` | Claude API key |
| `NTFY_TOPIC` | Your ntfy topic name. Make it long and random. Anyone who knows it can read it. |

Optional: `VIRAL_DAILY_CAP` (default 6; `0` means no alerts), `VIRAL_MODEL_DRAFT` (default `claude-sonnet-5-5`), `VIRAL_MODEL_JUDGE` (default `claude-opus-5-5`), `VIRAL_MAX_UNTIL` (ISO time with its offset, like `2026-11-02T23:30:00-08:00`, for a late verdict or TV night; ignored if it has no `Z`/offset or is more than 12 hours ahead), `NTFY_TOKEN` (only for a reserved ntfy topic), `VIRAL_DRY_RUN=1` (does everything but send), `VIRAL_DISABLED=1` (off).

**How to set them in Netlify.** Site configuration → Environment variables → Add a variable. Paste the name and value. Keep the **Functions** scope on. Then trigger a new deploy so the function sees them. Scheduled functions run only on the live (production) deploy, not on deploy previews. To test one run, open the Functions list in Netlify, pick `viral-watch`, and click **Run now**. Set `VIRAL_DRY_RUN=1` first if you want that test to send nothing.

**Phone and watch.** Install the ntfy app, subscribe to your topic, and allow its notifications. Garmin shows phone notifications, so the alert reaches your Venu 3 if Garmin Connect is allowed to show ntfy. The **Reply on X** button opens on the phone.

**How to turn it off.** Remove `ANTHROPIC_API_KEY` (or set `VIRAL_DISABLED=1`), then redeploy.

**Cost (estimate, per day).** About 99 runs a day.

- X: $0.005 per post read and $0.010 per user read. X bills the same post once per UTC day, so re-checking a post is free that day. Typical: 50 to 250 posts a day, about **$0.25 to $1.25**. Hard caps: 600 posts and 40 users a day, about $3.40 max.
- Claude: one check costs about 1 to 4 cents. Typical 3 to 10 checks, about **$0.05 to $0.40**. Hard cap: 20 checks a day, about $0.75 max. (Uses an estimate of $3/$15 per million tokens for Sonnet and $5/$25 for Opus. Check the Claude console for real prices.)
- Netlify and ntfy.sh: inside the free limits.
- **Total: about $0.30 to $1.65 a day typical, about $4.15 a day max.**

**Audit log.** Netlify Blobs store `viral-watch`: key `state` (what it has seen) and `viral-log/YYYY-MM-DD` (Pacific date). Each line is JSON for every alert, every near-miss (with the reason, drafts and judge scores), and one summary line per run.

**Try it offline.** `npm run viral:dryrun` runs three fake runs on `scripts/fixtures/viral-watch-sample.json` with no network calls and prints the alerts it would send. `npm run viral:test` runs the tests.
