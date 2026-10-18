// Each free sample belongs beside its paid guide; samples are not separate case explainers.
export const GUIDE_PREVIEWS = Object.freeze({
  'celeste-rivas-hernandez-d4vd-charges-guide': '/previews/d4vd-guide-v2-preview.pdf',
  'both-sides-michelle-parker-guide-v3': '/previews/michelle-parker-both-sides-v3-preview.pdf',
});
export function previewForGuide(link) {
  const url = new URL(link.url, 'https://cassiancreed.com');
  if (url.origin !== 'https://cassiancreed.beehiiv.com') return undefined;
  const key = url.pathname.replace(/\/$/, '').split('/products/')[1];
  const preview = GUIDE_PREVIEWS[key];
  return preview ? {url:preview,text:'Read page 1 free',type:'free',badge:'FREE',paid:false,newTab:true,previewFor:key} : undefined;
}
export function linksWithGuidePreviews(links) {
  return links.flatMap(link => link.preview ? [link, link.preview] : [link]);
}
