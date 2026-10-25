// Retail store links for the books PublishDrive distributes (Amazon, Apple
// Books, Google Play). Keyed by the Beehiiv product key used in data-book-key.
// Every URL here was opened and checked (title + author "Cassian Creed")
// on 2026-10-25. Add a store only after checking its page the same way.
// No prices here: they differ by store and change.
export const RETAIL_STORES = [
  { id: 'amazon', name: 'Amazon' },
  { id: 'apple', name: 'Apple Books' },
  { id: 'google', name: 'Google Play' },
];

export const RETAIL_STORE_LINKS = {
  'jury-chess-authority-edition-v3-2': {
    amazon: 'https://www.amazon.com/dp/B0HF5HLY7X',
    apple: 'https://books.apple.com/us/book/jury-chess/id6797542935',
    google: 'https://play.google.com/store/books/details?id=H0EFEgAAQBAJ',
  },
  'jared-bridegan-case-guide-v2': {
    amazon: 'https://www.amazon.com/dp/B0HJFW48RN',
    apple: 'https://books.apple.com/us/book/the-jared-bridegan-case/id6810910691',
    google: 'https://play.google.com/store/books/details?id=Z18LEgAAQBAJ',
  },
  'case-chess-erin-patterson': {
    amazon: 'https://www.amazon.com/dp/B0HHJ6T7FH',
    apple: 'https://books.apple.com/us/book/case-chess-the-erin-patterson-case/id6807760742',
    google: 'https://play.google.com/store/books/details?id=9ZEIEgAAQBAJ',
  },
  // No Amazon listing found for the Clancy book on 2026-10-25.
  'lindsay-clancy-post-mistrial-field-guide': {
    apple: 'https://books.apple.com/us/book/the-lindsay-clancy-trial/id6807760964',
    google: 'https://play.google.com/store/books/details?id=BZIIEgAAQBAJ',
  },
};

// Links for one book, in store order, or [] when the book has none.
export function retailStoreLinks(bookKey) {
  const links = RETAIL_STORE_LINKS[bookKey];
  if (!links) return [];
  return RETAIL_STORES.filter((s) => links[s.id]).map((s) => ({ ...s, url: links[s.id] }));
}

// "Amazon, Apple Books and Google Play" / "Apple Books and Google Play"
export function retailStoreNames(bookKey) {
  const names = retailStoreLinks(bookKey).map((s) => s.name);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Same markup as RetailStoreLine.astro, for markdown posts that cannot import
// a component. Empty string when the book has no checked store link.
export function retailStoreLineHtml(bookKey, placement = 'retail') {
  const stores = retailStoreLinks(bookKey);
  if (!stores.length) return '';
  const links = stores.map((s, i) => {
    const sep = i === 0 ? '' : (i === stores.length - 1 ? ' and ' : ', ');
    return `${sep}<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" data-retail-store="${s.id}" data-cta-placement="${placement}_${s.id}">${escapeHtml(s.name)}</a>`;
  }).join('');
  return `<p class="retail-line" data-retail-for="${bookKey}">Also available on ${links}.</p>`;
}
