import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

export function postSocialImage(slug, requestedImage) {
  const localPath = requestedImage.startsWith('http') ? null : requestedImage.split('?')[0].replace(/^\//, '');
  if (!localPath || !existsSync(resolve('public', localPath))) return '/og.png';
  const derivative = '/og/' + slug + '.jpg';
  return statSync(resolve('public', localPath)).size > 1_000_000 &&
    existsSync(resolve('public', derivative.slice(1))) ? derivative : requestedImage;
}
