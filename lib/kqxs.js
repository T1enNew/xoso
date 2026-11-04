// Lấy kết quả XSKT Miền Nam từ xskt.com.vn và ký hiệu vé từ minhngoc.net.vn.
// Dùng chung cho server.js (chạy ở máy) và api/kqxs.js (Vercel).
// Hôm nay: lúc đang xổ lấy từ nguồn trực tiếp (trang xskt tự dò mỗi 15 giây), xổ xong lấy từ RSS.
// Ngày cũ: lấy từ trang kết quả theo ngày, trang đó lỗi thì tìm trong trang theo thứ.
const FEED = 'https://xskt.com.vn/rss-feed/mien-nam-xsmn.rss';
const LIVE = 'https://tttt.xskt.com.vn/zzz/ttttxs-s.jsp?areaCode=MN';
const PAGE = 'https://xskt.com.vn/xsmn';
const LIVE_FROM = '16:05'; // từ giờ này mới hỏi nguồn trực tiếp (giờ VN)

// Lịch xổ theo thứ (0 = Chủ nhật), để vẽ phiếu chờ khi chưa có số
const SCHEDULE = [
  ['Đà Lạt', 'Kiên Giang', 'Tiền Giang'],
  ['Cà Mau', 'Đồng Tháp', 'Hồ Chí Minh'],
  ['Bạc Liêu', 'Bến Tre', 'Vũng Tàu'],
  ['Cần Thơ', 'Đồng Nai', 'Sóc Trăng'],
  ['An Giang', 'Bình Thuận', 'Tây Ninh'],
  ['Bình Dương', 'Trà Vinh', 'Vĩnh Long'],
  ['Bình Phước', 'Hồ Chí Minh', 'Hậu Giang', 'Long An'],
];
// Mã đài của nguồn trực tiếp
const LIVE_NAMES = {
  AG: 'An Giang', BL: 'Bạc Liêu', BT: 'Bến Tre', BD: 'Bình Dương', BP: 'Bình Phước', BTH: 'Bình Thuận',
  CM: 'Cà Mau', CT: 'Cần Thơ', LD: 'Đà Lạt', DN: 'Đồng Nai', DT: 'Đồng Tháp', HG: 'Hậu Giang',
  HCM: 'Hồ Chí Minh', KG: 'Kiên Giang', LA: 'Long An', ST: 'Sóc Trăng', TN: 'Tây Ninh', TG: 'Tiền Giang',
  TV: 'Trà Vinh', VL: 'Vĩnh Long', VT: 'Vũng Tàu',
};
// Mỗi nguồn gọi tên đài hơi khác nhau, gom về một tên để nhớ đài bỏ qua và mã vé cho đúng
const ALIAS = {
  'TP.HCM': 'Hồ Chí Minh', 'TP. HCM': 'Hồ Chí Minh', 'TP Hồ Chí Minh': 'Hồ Chí Minh',
  'Lâm Đồng': 'Đà Lạt', 'Đà Lạt- Lâm Đồng': 'Đà Lạt', 'Đà Lạt - Lâm Đồng': 'Đà Lạt',
};
const canon = name => ALIAS[name] || name;
// Các giải theo thứ tự xổ: [giải, số lượng, số chữ số]. Chuỗi số trực tiếp nối các giải đúng theo thứ tự này.
const LAYOUT = [['8', 1, 2], ['7', 1, 3], ['6', 3, 4], ['5', 1, 4], ['4', 7, 5], ['3', 2, 5], ['2', 1, 5], ['1', 1, 5], ['ĐB', 1, 6]];

const FEED_CACHE_MS = 60 * 1000; // RSS bên nguồn cũng đệm 5 phút nên không cần hỏi dày
const LIVE_CACHE_MS = 8 * 1000;
const COOLDOWN_MS = 60 * 1000;   // bị nguồn chặn (429) mà không có Retry-After thì nghỉ chừng này

// ---------- Đọc dữ liệu nguồn ----------

function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/<br\s*\/?>/gi, '\n');
}

const tag = (xml, name) => decodeEntities(xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1] || '').trim();

// Đủ mọi giải, mỗi số đủ chữ số (số đang quay dở thì chưa đủ)
const isComplete = provinces => provinces.length > 0 && provinces.every(p =>
  LAYOUT.every(([g, count, len]) => (p.prizes[g] || []).filter(n => n.length === len).length === count));

// Phần mô tả của RSS: dòng "[Tên đài]" rồi các dòng "giải: số - số - ..."
function parseDescription(desc) {
  const provinces = [];
  let cur = null;
  for (const line of desc.split('\n').map(s => s.trim())) {
    const prov = line.match(/^\[(.+?)\]$/);
    if (prov) {
      provinces.push(cur = { name: canon(prov[1].trim()), prizes: {} });
      continue;
    }
    if (!cur) continue;
    // Có lúc giải 7 và giải 8 bị dính chung một dòng: "7: 7458: 13"
    const merged = line.match(/^7:\s*(\d{3})\s*8:\s*(\d{2})$/);
    if (merged) {
      cur.prizes['7'] = [merged[1]];
      cur.prizes['8'] = [merged[2]];
      continue;
    }
    const p = line.match(/^(ĐB|\d):\s*(.*)$/);
    if (p) cur.prizes[p[1]] = p[2].split('-').map(s => s.trim()).filter(Boolean);
  }
  return provinces;
}

// Mỗi kỳ trong RSS là một <item>; day là "DD/MM" lấy từ tiêu đề
function parseFeed(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
    const d = tag(item, 'title').match(/NGÀY\s+(\d{1,2})\/(\d{1,2})/i);
    const provinces = parseDescription(tag(item, 'description'));
    return { day: d && `${d[1].padStart(2, '0')}/${d[2].padStart(2, '0')}`, provinces, complete: isComplete(provinces) };
  });
}

// Mọi bảng kết quả trên một trang của xskt.com.vn
// (trang theo ngày /xsmn/ngay-D-M-YYYY, hoặc trang theo thứ /xsmn/thu-3 có 4 tuần gần nhất)
function parseTables(html) {
  return [...html.matchAll(/<table class="tbl-xsmn[^"]*" id="MN\d+">([\s\S]*?)<\/table>/g)]
    .map(([, table]) => parseTable(table))
    .filter(Boolean);
}

function parseTable(table) {
  const d = table.match(/data-url="[^"]*\/(\d{2})-(\d{2})-(\d{4})"/);
  if (!d) return null;
  const nums = cell => cell.replace(/<[^>]+>/g, ' ').match(/\d+/g) || [];
  const provinces = [...table.matchAll(/<th><a[^>]*>([^<]+)<\/a><i class="dockq"/g)]
    .map(([, name]) => ({ name: canon(decodeEntities(name).trim()), prizes: {} }));
  for (const [, g, row] of table.matchAll(/<td title="[^"]*">(?:G\.(\d)|ĐB)<\/td>([\s\S]*?)<\/tr>/g)) {
    [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].forEach(([, cell], i) => {
      if (provinces[i]) provinces[i].prizes[g || 'ĐB'] = nums(cell);
    });
  }
  return { date: `${d[3]}-${d[2]}-${d[1]}`, provinces, complete: isComplete(provinces) };
}

// Cắt chuỗi chữ số của một đài thành từng giải. Số đang quay dở (chưa đủ chữ số) vẫn giữ để trang in quay phần còn lại.
function splitDigits(digits) {
  const prizes = {};
  let pos = 0;
  for (const [g, count, len] of LAYOUT) {
    for (let i = 0; i < count && pos < digits.length; i++, pos += len) {
      (prizes[g] ||= []).push(digits.substr(pos, len));
    }
  }
  return prizes;
}

// Nguồn trực tiếp: "VL,BD,TV:34090;2||26869;2" (mã các đài, rồi chữ số từng đài nối liền theo thứ tự xổ)
function parseLive(kqxs) {
  const k = kqxs?.indexOf(':') ?? -1;
  if (k < 1) return null; // "-1" hoặc rỗng: chưa có kỳ nào
  const parts = kqxs.slice(k + 1).split('|');
  const provinces = kqxs.slice(0, k).split(',').map((code, i) => ({
    name: LIVE_NAMES[code] || code,
    prizes: splitDigits((parts[i] || '').split(';')[0].replace(/\D/g, '')),
  }));
  return { provinces, complete: isComplete(provinces) };
}

// Để nhận ra nguồn trực tiếp còn đang giữ kỳ trước (chưa sang kỳ hôm nay)
const fingerprint = item => item.provinces
  .map(p => `${p.name}:${p.prizes['8']?.[0] || ''}${p.prizes['1']?.[0] || ''}`).sort().join('|');

// Ký hiệu vé trên trang Minh Ngọc. Mỗi bảng là một ngày: ô ngày "01/11/26" hoặc "31/10/2026";
// mỗi đài có ô tên và ô ký hiệu: "L: TGA11" ở trang trực tiếp, "XSHG - K5T10" ở trang theo ngày
function parseMinhNgocCodes(html) {
  const days = {};
  for (const part of html.split('class="bkqmiennam"').slice(1)) {
    const dm = part.match(/class="ngay">\s*(?:<a[^>]*>)?\s*(\d{2})\/(\d{2})\/(\d{2,4})/);
    if (!dm) continue;
    const date = `${dm[3].length === 2 ? '20' + dm[3] : dm[3]}-${dm[2]}-${dm[1]}`;
    const codes = {};
    for (const [, name, cell] of part.matchAll(/<td class="tinh">\s*<a[^>]*>([^<]+)<\/a>\s*<\/td>\s*<\/tr>\s*<tr>\s*<td class="matinh">([\s\S]*?)<\/td>/g)) {
      const code = decodeEntities(cell.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
        .replace(/^L:\s*/, '').replace(/^XS[A-Z]+\s*-\s*/, '');
      if (code) codes[canon(decodeEntities(name).trim())] = code;
    }
    if (Object.keys(codes).length && !days[date]) days[date] = codes;
  }
  return days;
}

// ---------- Giờ Việt Nam ----------

function vnParts() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  return Object.fromEntries(parts.map(p => [p.type, p.value]));
}
const todayVN = () => { const p = vnParts(); return `${p.year}-${p.month}-${p.day}`; };
const nowVN = () => { const p = vnParts(); return `${p.hour}:${p.minute}`; };
const weekday = iso => new Date(iso + 'T00:00:00Z').getUTCDay();

// ---------- Gọi nguồn: tôn trọng lệnh chặn, gom các lần gọi trùng ----------

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

async function fetchText(url) {
  const host = new URL(url).host;
  if (Date.now() < (blocked[host] || 0)) throw blockedError(host);
  const res = await fetch(url, { headers: { 'User-Agent': 'xoso-print/1.0' } });
  if (res.status === 429 || res.status === 503) {
    blocked[host] = Date.now() + retryAfterMs(res.headers.get('retry-after'));
    throw blockedError(host);
  }
  if (!res.ok) throw new Error(`nguồn trả về ${res.status}`);
  return res.text();
}

const shared = (key, fn) => (pending[key] ??= fn().finally(() => { delete pending[key]; }));
const page = url => shared(url, () => fetchText(url));

// ---------- Kết quả theo ngày ----------

let feedCache = null; // { at, items }
let liveCache = null; // { at, date, item }
const pastCache = {}; // kết quả ngày cũ không đổi nên giữ luôn

async function getFeed() {
  if (feedCache && Date.now() - feedCache.at < FEED_CACHE_MS) return { items: feedCache.items, stale: false };
  try {
    const items = await shared('rss', async () => parseFeed(await fetchText(FEED)));
    feedCache = { at: Date.now(), items };
    return { items, stale: false };
  } catch (e) {
    if (!feedCache) throw e;
    return { items: feedCache.items, stale: true }; // nguồn lỗi hoặc đang chặn: dùng tạm dữ liệu lần trước
  }
}

async function getLive(date) {
  if (liveCache?.date === date && Date.now() - liveCache.at < LIVE_CACHE_MS) return liveCache.item;
  const item = await shared('live', async () => parseLive(JSON.parse(await fetchText(`${LIVE}&s=0&rr=${Date.now()}`)).kqxs));
  liveCache = { at: Date.now(), date, item };
  return item;
}

async function getToday(date) {
  const { items, stale } = await getFeed();
  const day = `${date.slice(8)}/${date.slice(5, 7)}`;
  let result = items.find(i => i.day === day) || null;
  let liveFailed = false;
  if (!result?.complete && nowVN() >= LIVE_FROM) {
    try {
      const live = await getLive(date);
      const prev = items.find(i => i.day !== day);
      if (live && (!prev || fingerprint(live) !== fingerprint(prev))) result = live;
    } catch {
      liveFailed = true;
    }
  }
  return { result, stale: stale || liveFailed };
}

async function getPast(date) {
  if (!(date in pastCache)) {
    const [y, m, d] = date.split('-');
    const tables = parseTables(await page(`${PAGE}/ngay-${+d}-${+m}-${y}`));
    if (!tables.length) throw new Error('không đọc được trang kết quả');
    // Trang theo ngày bên nguồn có lúc hiện nhầm kỳ khác (vd ngày 13/10/2026 lại hiện kỳ 10/10),
    // khi đó tìm trong trang theo thứ, trang này có kết quả 4 tuần gần nhất
    let r = tables.find(t => t.date === date);
    if (!r) {
      const wd = weekday(date);
      r = parseTables(await page(`${PAGE}/${wd === 0 ? 'chu-nhat' : 'thu-' + (wd + 1)}`)).find(t => t.date === date);
    }
    pastCache[date] = r || null; // vẫn không thấy thì ngày đó không xổ
  }
  return pastCache[date];
}

// ---------- Ký hiệu vé (vd TGA11, K5T10, 35TV44) lấy từ Minh Ngọc ----------
// xskt không có ký hiệu vé. Minh Ngọc ghi ký hiệu từng đài đúng như trên vé.
// Mỗi ngày chỉ cần hỏi một lần; Minh Ngọc lỗi hay chặn thì phiếu vẫn in được, chỉ thiếu ký hiệu.
const MINHNGOC_LIVE = 'https://www.minhngoc.net.vn/xo-so-truc-tiep/mien-nam.html';
const minhngocDay = date => {
  const [y, m, d] = date.split('-');
  return `https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/${d}-${m}-${y}.html`;
};
const CODES_RETRY_MS = 10 * 60 * 1000; // chưa có ký hiệu (vd sáng sớm) thì 10 phút sau mới hỏi lại
const codesCache = {}; // ngày -> { at, found, codes: { tên đài: ký hiệu } }

async function getCodes(date, today) {
  const hit = codesCache[date];
  if (hit && (hit.found || Date.now() - hit.at < CODES_RETRY_MS)) return hit.codes;
  try {
    for (const url of date === today ? [MINHNGOC_LIVE, minhngocDay(date)] : [minhngocDay(date)]) {
      const days = parseMinhNgocCodes(await page(url));
      // Trang theo ngày có luôn mấy ngày trước đó: giữ hết, khỏi hỏi lại
      for (const [d, codes] of Object.entries(days)) codesCache[d] = { at: Date.now(), found: true, codes };
      if (days[date]) return days[date];
    }
  } catch {
    // không có ký hiệu thì người dùng tự gõ
  }
  codesCache[date] = { at: Date.now(), found: false, codes: {} };
  return {};
}

// { date, today, isToday, result, planned?, stale?, codes }
async function getResults(date) {
  const today = todayVN();
  date ||= today;
  const out = { date, today, isToday: date === today, result: null };
  const codes = date <= today ? getCodes(date, today) : Promise.resolve({}); // hỏi song song với kết quả
  if (date === today) Object.assign(out, await getToday(date));
  else if (date < today) out.result = await getPast(date);
  // Chưa có số của hôm nay hoặc ngày tới: gửi danh sách đài theo lịch để vẽ phiếu chờ
  if (!out.result && date >= today) out.planned = SCHEDULE[weekday(date)];
  out.codes = await codes;
  return out;
}

// CDN của Vercel được giữ câu trả lời bao nhiêu giây, để nhiều người mở trang cũng không hỏi dồn nguồn
function cacheSeconds(d) {
  if (d.stale) return 0;                                 // dữ liệu tạm khi nguồn lỗi, đừng giữ
  if (d.date < d.today) return d.result ? 86400 : 3600;  // ngày cũ không đổi
  if (d.date > d.today) return 3600;
  if (!d.result) return 30;                              // hôm nay chưa xổ
  return d.result.complete ? 300 : 8;                    // đang xổ thì giữ ngắn để số mới hiện nhanh
}

// /api/kqxs?date=YYYY-MM-DD (bỏ trống là hôm nay) → { status, body, cache }
async function handleKqxs(params) {
  const date = params.get('date') || '';
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { status: 400, body: { error: 'date phải có dạng YYYY-MM-DD' }, cache: 0 };
  }
  try {
    const data = await getResults(date);
    return { status: 200, body: data, cache: cacheSeconds(data) };
  } catch (e) {
    return { status: 502, body: { error: e.message }, cache: 0 };
  }
}

module.exports = { handleKqxs, parseFeed, parseDescription, parseTables, parseLive, parseMinhNgocCodes };
