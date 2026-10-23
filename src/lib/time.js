// Mọi giờ giấc đều tính theo giờ Việt Nam, kể cả khi máy đặt múi giờ khác
export function vnParts() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date());
  return Object.fromEntries(parts.map(p => [p.type, p.value]));
}

export const vnNow = () => { const p = vnParts(); return p.hour + ':' + p.minute; };
export const todayISO = () => { const p = vnParts(); return `${p.year}-${p.month}-${p.day}`; };
export const weekday = iso => new Date(iso + 'T00:00:00Z').getUTCDay();
export const fmtDate = iso => iso.split('-').reverse().join('/');
export const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
