import { SITE, gitLastmod } from './search-index.mjs';

export function breadcrumbList(items, path) {
  return {
    '@type': 'BreadcrumbList', '@id': SITE + path + '#breadcrumb',
    itemListElement: items.map(([name, route], index) => ({
      '@type': 'ListItem', position: index + 1, name, item: SITE + route,
    })),
  };
}
export function pageSchema({ type = 'Article', title, description, path, source, category }) {
  const dateModified = gitLastmod(source);
  const page = {
    '@type': type, '@id': SITE + path + '#page', url: SITE + path,
    headline: title, name: title, description,
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
