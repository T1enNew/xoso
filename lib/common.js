// Phần dùng chung cho các nguồn kết quả: tên đài, các giải, giờ Việt Nam, gọi nguồn.

// Mỗi nguồn gọi tên đài hơi khác nhau, gom về một tên để nhớ đài bỏ qua và mã vé cho đúng
const ALIAS = {
  'TP.HCM': 'Hồ Chí Minh', 'TP. HCM': 'Hồ Chí Minh', 'TP Hồ Chí Minh': 'Hồ Chí Minh',
  'Lâm Đồng': 'Đà Lạt', 'Đà Lạt- Lâm Đồng': 'Đà Lạt', 'Đà Lạt - Lâm Đồng': 'Đà Lạt',
};
const canon = name => ALIAS[name.trim()] || name.trim();

// Các giải theo thứ tự xổ: [giải, số lượng, số chữ số]
const LAYOUT = [['8', 1, 2], ['7', 1, 3], ['6', 3, 4], ['5', 1, 4], ['4', 7, 5], ['3', 2, 5], ['2', 1, 5], ['1', 1, 5], ['ĐB', 1, 6]];

// Đủ mọi giải, mỗi số đủ chữ số (số đang quay dở thì chưa đủ)
const isComplete = provinces => provinces.length > 0 && provinces.every(p =>
  LAYOUT.every(([g, count, len]) => (p.prizes[g] || []).filter(n => n.length === len).length === count));

function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/<br\s*\/?>/gi, '\n');
}

// ---------- Giờ Việt Nam ----------

function vnParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  return Object.fromEntries(parts.map(p => [p.type, p.value]));
}
const vnDate = (date = new Date()) => { const p = vnParts(date); return `${p.year}-${p.month}-${p.day}`; };
const vnTime = () => { const p = vnParts(); return `${p.hour}:${p.minute}`; };
const weekday = iso => new Date(iso + 'T00:00:00Z').getUTCDay();

// ---------- Gọi nguồn: tôn trọng lệnh chặn, gom các lần gọi trùng ----------

const COOLDOWN_MS = 60 * 1000; // bị nguồn chặn (429) mà không có Retry-After thì nghỉ chừng này
const TIMEOUT_MS = 6 * 1000;   // nguồn treo quá lâu thì coi như lỗi, để kịp chuyển sang nguồn dự phòng
const blocked = {}; // host -> lúc hết bị chặn
const pending = {}; // request đang chạy, để nhiều tab/lần bấm dùng chung một lần gọi

function retryAfterMs(h) {
  if (!h) return COOLDOWN_MS;
  const s = Number(h);
  const ms = Number.isFinite(s) ? s * 1000 : Date.parse(h) - Date.now();
  return ms > 0 ? Math.min(ms, 10 * 60 * 1000) : COOLDOWN_MS;
}

const blockedError = host =>
  new Error(`nguồn đang chặn vì gọi quá nhiều, thử lại sau ${Math.ceil((blocked[host] - Date.now()) / 1000)} giây`);

// body: gửi kiểu POST (form)
async function fetchText(url, body) {
  const host = new URL(url).host;
  if (Date.now() < (blocked[host] || 0)) throw blockedError(host);
  try {
    const res = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: { 'User-Agent': 'xoso-print/1.0', ...(body && { 'Content-Type': 'application/x-www-form-urlencoded' }) },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 429 || res.status === 503) {
      blocked[host] = Date.now() + retryAfterMs(res.headers.get('retry-after'));
      throw blockedError(host);
    }
    if (!res.ok) throw new Error(`nguồn trả về ${res.status}`);
    return await res.text();
  } catch (e) {
    if (e.name === 'TimeoutError') throw new Error(`${host} không trả lời sau ${TIMEOUT_MS / 1000} giây`);
    throw e;
  }
}

const shared = (key, fn) => (pending[key] ??= fn().finally(() => { delete pending[key]; }));
const page = url => shared(url, () => fetchText(url));

module.exports = { canon, LAYOUT, isComplete, decodeEntities, vnDate, vnTime, weekday, fetchText, shared, page };
