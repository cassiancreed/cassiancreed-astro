# Blog archive editing guide

The individual Markdown posts in `src/content/posts/` are the single source of
truth for the public Case Files archive. Do not manually add, number, or reorder
cards in `src/pages/[category].astro`.

## Add or update a post

1. Create or open the post's `.md` file in `src/content/posts/`.
2. Keep these front-matter fields accurate:
   - `title`: the complete reader-facing headline.
   - `description`: the short archive and search-engine summary.
   - `pubDate`: publication date in `YYYY-MM-DD` format.
   - `updatedDate`: optional; use when the article is materially updated.
   - `tag`: `Case Files` or `Explainers` to place it in an archive.
   - `victim`, `location`, `jurisdiction`, and `status`: optional, but they make
     the archive search more useful.
   - `cover` and `coverAlt`: optional card and social artwork.
3. Run `npm run posts:check` or the full `npm run build`.

The archive automatically sorts by `pubDate`, newest first. Older posts remain
linked in the rendered HTML, searchable on the page, included in the sitemap,
and available to search engines. Changing a post's `pubDate` changes its archive
position on the next build; no page-layout edit is required.

## URL policy

Keep `/case-files/` as the archive URL and keep existing `/post/.../` URLs stable.
Changing an indexed URL requires a permanent redirect, canonical updates,
internal-link updates, sitemap updates, and post-launch monitoring.
