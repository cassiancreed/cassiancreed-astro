export const MEDIA_TIMEZONE = 'America/Los_Angeles';
export const MEDIA_COLUMNS = ["id","date_iso","date_text","time_text","title","platform","type","topic","description","source_url","source_label","source2_url","source2_label","last_verified","status","court_calendar_id","standing"];
export function pacificToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: MEDIA_TIMEZONE, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(now);
  const part = name => parts.find(p => p.type === name).value;
  return part('year') + '-' + part('month') + '-' + part('day');
}
export function mediaDates(row) {
  if (row.standing !== 'yes') return [row.date_iso];
  // These are the owner's finite listed slots, never an open-ended recurrence.
  return [...row.date_text.matchAll(/(Oct|Nov) (\d{1,2})/g)].map(m =>
    row.date_iso.slice(0,4) + '-' + (m[1] === 'Oct' ? '10' : '11') + '-' + m[2].padStart(2,'0'));
}
export function mediaVisible(row, today = pacificToday()) {
  return mediaDates(row).some(date => date >= today);
}
export function visibleMediaRows(rows, today = pacificToday()) {
  return rows.filter(row => mediaVisible(row, today));
}
export function parseMediaCalendar(raw) {
  const lines = raw.trimEnd().split(/\r?\n/);
  if (lines.shift() !== MEDIA_COLUMNS.join('\t')) throw new Error('Invalid media calendar columns');
  const ids = new Set();
  const rows = lines.map(line => {
    const cells = line.split('\t');
    if (cells.length !== MEDIA_COLUMNS.length) throw new Error('Invalid media calendar field count');
    const row = Object.fromEntries(MEDIA_COLUMNS.map((key,i) => [key,cells[i]]));
    if (ids.has(row.id)) throw new Error('Duplicate media id: ' + row.id);
    ids.add(row.id);
    if (row.id === 'meta') return row;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date_iso) || !/^\d{4}-\d{2}-\d{2}$/.test(row.last_verified)) throw new Error('Invalid media date');
    if (!['V-OFF','V-TRADE','UNCONF'].includes(row.status) || !['yes','no'].includes(row.standing)) throw new Error('Invalid media status');
    if (!/^https?:\/\//.test(row.source_url) || !row.title || !row.description) throw new Error('Missing media source or copy');
    if (!mediaDates(row).length) throw new Error('Missing standing dates');
    return row;
  });
  const meta = rows.find(row => row.id === 'meta');
  if (!meta?.last_verified) throw new Error('Missing media as-of date');
  return { asOf:meta.last_verified, rows:rows.filter(row => row.id !== 'meta') };
}
