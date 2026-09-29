// Preserve acquisition independently of the Court form/offer identity.
export function calendarSignupUrl(base, acquisition) {
  const url = new URL(base);
  if (!acquisition || !acquisition.s) return url.toString();
  for (const [parameter, key] of [['utm_source', 's'], ['utm_medium', 'm'], ['utm_campaign', 'c'], ['utm_content', 'u'], ['utm_term', 'k']]) {
    const value = acquisition[key] || '';
    if (value) url.searchParams.set(parameter, value);
    else url.searchParams.delete(parameter);
  }
  return url.toString();
}
