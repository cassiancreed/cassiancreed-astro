import { SITE, gitLastmod } from './search-index.mjs';

export function breadcrumbList(items, path) {
  return {
    '@type': 'BreadcrumbList', '@id': SITE + path + '#breadcrumb',
    itemListElement: items.map(([name, route], index) => ({
      '@type': 'ListItem', position: index + 1, name, item: SITE + route,
    })),
  };
}
export function pageSchema({ type = 'Article', title, headline, description, path, source, category }) {
  const dateModified = gitLastmod(source);
  // Search engines expect headline to match the visible H1, without the site suffix.
  const pageHeadline = (headline ?? title).replace(/\s*\|\s*Cassian Creed\s*$/, '');
  if (pageHeadline.length > 110) throw new Error(path + ': JSON-LD headline exceeds 110 characters');
  const page = {
    '@type': type, '@id': SITE + path + '#page', url: SITE + path,
    headline: pageHeadline, name: title, description,
    isPartOf: { '@id': SITE + '/#website' },
    publisher: { '@id': SITE + '/#org' },
    ...(type === 'Article' ? {
      author: { '@id': SITE + '/#cassian-creed' },
      image: SITE + '/og.png', mainEntityOfPage: SITE + path,
    } : {}),
    ...(type === 'AboutPage' ? {
      mainEntity: { '@id': SITE + '/#cassian-creed' },
      about: { '@id': SITE + '/#org' },
    } : {}),
    ...(dateModified ? { dateModified } : {}),
  };
  const items = [['Home', '/'], ...(category ? [category] : []), [title, path]];
  return { '@context': 'https://schema.org', '@graph': [page, breadcrumbList(items, path)] };
}
