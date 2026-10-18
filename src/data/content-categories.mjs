// Shared by the category route, post breadcrumbs, and search discovery.
export const CONTENT_CATEGORIES = [
  { category: 'case-files', tag: 'Case Files', label: 'True Crime Blog' },
  { category: 'explainers', tag: 'Explainers', label: 'Explainers' },
];
export function categoryForTag(tag) {
  return CONTENT_CATEGORIES.find((entry) => entry.tag === tag) ?? CONTENT_CATEGORIES[0];
}
