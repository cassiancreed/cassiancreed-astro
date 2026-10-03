type EntryWithSourcePath = {
  id: string;
  filePath?: string;
};

type DatedEntry = EntryWithSourcePath & {
  data: { pubDate: Date };
};

const sourcePath = (entry: EntryWithSourcePath) => entry.filePath ?? entry.id;

// Astro 4's content collection followed source-file order. Use a binary path
// comparison (not locale-sensitive collation) to preserve that order on Astro 7,
// including entries whose public ID comes from a frontmatter slug.
export const compareContentSourcePath = (a: EntryWithSourcePath, b: EntryWithSourcePath) => {
  const aPath = sourcePath(a);
  const bPath = sourcePath(b);
  return aPath < bPath ? -1 : aPath > bPath ? 1 : 0;
};

export const comparePostsNewestFirst = (a: DatedEntry, b: DatedEntry) =>
  b.data.pubDate.valueOf() - a.data.pubDate.valueOf() || compareContentSourcePath(a, b);
