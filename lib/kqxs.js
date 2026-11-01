// Lấy kết quả XSKT từ xskt.com.vn, ký hiệu vé từ minhngoc.net.vn. Dùng chung cho server.js (chạy ở máy) và api/kqxs.js (Vercel).
// Hôm nay: lúc đang xổ lấy từ nguồn trực tiếp (cái trang xskt tự dò mỗi 15 giây), xổ xong lấy từ RSS.
// Ngày cũ: lấy từ trang kết quả theo ngày, trang đó lỗi thì tìm trong trang theo thứ.
const FEEDS = {
  mn: 'https://xskt.com.vn/rss-feed/mien-nam-xsmn.rss',
  mt: 'https://xskt.com.vn/rss-feed/mien-trung-xsmt.rss',
  mb: 'https://xskt.com.vn/rss-feed/mien-bac-xsmb.rss',
};
const LIVE = {
  mn: 'https://tttt.xskt.com.vn/zzz/ttttxs-s.jsp?areaCode=MN',
  mt: 'https://tttt.xskt.com.vn/zzz/ttttxs-s.jsp?areaCode=MT',
  mb: 'https://ttttmb.xskt.com.vn/zzz/ttttxs-s.jsp?areaCode=MB',
};
const PAGES = { mn: 'https://xskt.com.vn/xsmn', mt: 'https://xskt.com.vn/xsmt', mb: 'https://xskt.com.vn/xsmb' };
const LIVE_FROM = { mn: '16:05', mt: '17:05', mb: '18:05' }; // từ giờ này mới hỏi nguồn trực tiếp (giờ VN)
const NAME = { mn: 'MIỀN NAM', mt: 'MIỀN TRUNG', mb: 'MIỀN BẮC' };
const THU = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
// Lịch xổ theo thứ (0 = Chủ nhật), để vẽ bảng chờ khi chưa có số
const SCHEDULE = {
  mn: [
    ['Đà Lạt', 'Kiên Giang', 'Tiền Giang'],
    ['Cà Mau', 'Đồng Tháp', 'Hồ Chí Minh'],
    ['Bạc Liêu', 'Bến Tre', 'Vũng Tàu'],
    ['Cần Thơ', 'Đồng Nai', 'Sóc Trăng'],
    ['An Giang', 'Bình Thuận', 'Tây Ninh'],
    ['Bình Dương', 'Trà Vinh', 'Vĩnh Long'],
    ['Bình Phước', 'Hồ Chí Minh', 'Hậu Giang', 'Long An'],
  ],
  mt: [
    ['Huế', 'Khánh Hòa', 'Kon Tum'],
    ['Huế', 'Phú Yên'],
    ['Đắk Lắk', 'Quảng Nam'],
    ['Đà Nẵng', 'Khánh Hòa'],
    ['Bình Định', 'Quảng Bình', 'Quảng Trị'],
    ['Gia Lai', 'Ninh Thuận'],
    ['Đà Nẵng', 'Đắk Nông', 'Quảng Ngãi'],
  ],
};
// Mã đài của nguồn trực tiếp
const LIVE_NAMES = {
  AG: 'An Giang', BL: 'Bạc Liêu', BT: 'Bến Tre', BD: 'Bình Dương', BP: 'Bình Phước', BTH: 'Bình Thuận',
  BDI: 'Bình Định', CM: 'Cà Mau', CT: 'Cần Thơ', GL: 'Gia Lai', HG: 'Hậu Giang', KH: 'Khánh Hòa',
  KG: 'Kiên Giang', KT: 'Kon Tum', LD: 'Đà Lạt', LA: 'Long An', NT: 'Ninh Thuận', PY: 'Phú Yên',
  QB: 'Quảng Bình', QNM: 'Quảng Nam', QNG: 'Quảng Ngãi', QT: 'Quảng Trị', ST: 'Sóc Trăng', TN: 'Tây Ninh',
  TTH: 'Huế', TG: 'Tiền Giang', HCM: 'Hồ Chí Minh', TV: 'Trà Vinh', VL: 'Vĩnh Long', VT: 'Vũng Tàu',
  DNG: 'Đà Nẵng', DLK: 'Đắk Lắk', DNO: 'Đắk Nông', DN: 'Đồng Nai', DT: 'Đồng Tháp',
};
// Mỗi nguồn gọi tên đài hơi khác nhau, gom về một tên để nhớ đài bỏ qua và mã vé cho đúng
const ALIAS = {
  'TP.HCM': 'Hồ Chí Minh', 'TP. HCM': 'Hồ Chí Minh', 'TP Hồ Chí Minh': 'Hồ Chí Minh',
  'Lâm Đồng': 'Đà Lạt', 'Đà Lạt- Lâm Đồng': 'Đà Lạt', 'Đà Lạt - Lâm Đồng': 'Đà Lạt',
  'Thừa Thiên Huế': 'Huế', 'Thừa T. Huế': 'Huế', 'Đắc Lắc': 'Đắk Lắk', 'Đắk Lắc': 'Đắk Lắk', 'Đắc Nông': 'Đắk Nông',
};
const canon = name => ALIAS[name] || name;
// Thứ tự xổ và chỗ của từng giải trong chuỗi số trực tiếp: [giải, số lượng, số chữ số]
const LIVE_LAYOUT = {
  mn: [['8', 1, 2], ['7', 1, 3], ['6', 3, 4], ['5', 1, 4], ['4', 7, 5], ['3', 2, 5], ['2', 1, 5], ['1', 1, 5], ['ĐB', 1, 6]],
  mb: [['1', 1, 5], ['2', 2, 5], ['3', 6, 5], ['4', 4, 4], ['5', 6, 4], ['6', 3, 3], ['7', 4, 2], ['ĐB', 1, 5]],
};
LIVE_LAYOUT.mt = LIVE_LAYOUT.mn;
// Số lượng số mỗi đài khi xổ xong, dùng để biết kết quả đã đủ chưa
const FULL_COUNT = { mn: 18, mt: 18, mb: 27 };
const FEED_CACHE_MS = 60 * 1000; // RSS bên nguồn cũng đệm 5 phút nên không cần hỏi dày
const LIVE_CACHE_MS = 8 * 1000;
const COOLDOWN_MS = 60 * 1000; // bị nguồn chặn (429) mà không có Retry-After thì nghỉ chừng này
const feedCache = {};
const liveCache = {};
const pastCache = {}; // kết quả ngày cũ không đổi nên giữ luôn
const pending = {}; // request đang chạy, để nhiều tab/lần bấm dùng chung một lần gọi
const blocked = {}; // host -> lúc hết bị chặn

function decodeEntities(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/<br\s*\/?>/gi, '\n');
}

function tag(xml, name) {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? decodeEntities(m[1]).trim() : '';
}

// Tách phần mô tả thành từng đài và từng giải
function parseDescription(desc) {
  const provinces = [];
  let cur = null;
  for (const raw of desc.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const prov = line.match(/^\[(.+?)\]$/);
    if (prov) {
      cur = { name: canon(prov[1].trim()), prizes: {} };
      provinces.push(cur);
      continue;
    }
    if (!cur) {
      cur = { name: null, prizes: {} }; // miền Bắc không có tên đài
      provinces.push(cur);
    }
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

function isComplete(provinces, mien) {
  return provinces.length > 0 && provinces.every(p =>
    Object.values(p.prizes).reduce((n, arr) => n + arr.length, 0) >= FULL_COUNT[mien]);
}

function parseFeed(xml, mien) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
    const title = tag(m[1], 'title');
    const d = title.match(/NGÀY\s+(\d{1,2})\/(\d{1,2})/i);
    const provinces = parseDescription(tag(m[1], 'description'));
    return {
      title,
      link: tag(m[1], 'link'),
      day: d ? d[1].padStart(2, '0') + '/' + d[2].padStart(2, '0') : null,
      provinces,
      complete: isComplete(provinces, mien),
    };
  });
}

// Đọc mọi bảng kết quả trên một trang của xskt.com.vn
// (trang theo ngày /xsmn/ngay-D-M-YYYY, hoặc trang theo thứ /xsmn/thu-3 có 4 tuần gần nhất)
function parseTables(html, mien, link) {
  const re = mien === 'mb'
    ? /<table class="result" id="MB\d+">([\s\S]*?)<\/table>/g
    : /<table class="tbl-xsmn[^"]*" id="M[NT]\d+">([\s\S]*?)<\/table>/g;
  return [...html.matchAll(re)].map(t => parseTable(t[1], mien, link)).filter(Boolean);
}

function parseTable(table, mien, link) {
  const d = table.match(/data-url="[^"]*\/(\d{2})-(\d{2})-(\d{4})"/);
  if (!d) return null;
  const nums = cell => cell.replace(/<[^>]+>/g, ' ').match(/\d+/g) || [];
  let provinces;
  if (mien === 'mb') {
    const prizes = {};
    for (const m of table.matchAll(/<td[^>]*title="Giải[^"]*">(?:ĐB|G(\d))<\/td><td[^>]*>([\s\S]*?)<\/td>/g)) {
      prizes[m[1] || 'ĐB'] = nums(m[2]);
    }
    provinces = [{ name: null, prizes }];
  } else {
    provinces = [...table.matchAll(/<th><a[^>]*>([^<]+)<\/a><i class="dockq"/g)]
      .map(m => ({ name: canon(decodeEntities(m[1]).trim()), prizes: {} }));
    for (const m of table.matchAll(/<td title="[^"]*">(?:G\.(\d)|ĐB)<\/td>([\s\S]*?)<\/tr>/g)) {
      [...m[2].matchAll(/<td>([\s\S]*?)<\/td>/g)].forEach((c, i) => {
        if (provinces[i]) provinces[i].prizes[m[1] || 'ĐB'] = nums(c[1]);
      });
    }
  }
  const [, dd, mm, yyyy] = d;
  return {
    title: `KẾT QUẢ XỔ SỐ ${NAME[mien]} NGÀY ${dd}/${mm}/${yyyy} (${THU[weekday(`${yyyy}-${mm}-${dd}`)]})`,
    link,
    day: `${dd}/${mm}`,
    date: `${yyyy}-${mm}-${dd}`,
    provinces,
    complete: isComplete(provinces, mien),
  };
}

// Cắt chuỗi số trực tiếp thành từng giải. Số đang quay dở (chưa đủ chữ số) vẫn giữ để trang in xoay phần còn lại.
function splitDigits(digits, layout) {
  const prizes = {};
  let pos = 0;
  for (const [g, count, len] of layout) {
    for (let i = 0; i < count && pos < digits.length; i++, pos += len) {
      (prizes[g] ||= []).push(digits.substr(pos, len));
    }
  }
  return prizes;
}

// Miền Nam/Trung: "VL,BD,TV:34090;2||26869;2" (mã đài, rồi chữ số từng đài nối liền theo thứ tự xổ)
// Miền Bắc: "<chữ số G1..G7><mã ĐB>-<giải ĐB>;..."
function parseLive(kqxs, mien, date) {
  if (!kqxs || kqxs.length < 2 || kqxs === '-1') return null;
  const layout = LIVE_LAYOUT[mien];
  let provinces;
  if (mien === 'mb') {
    const [main, db = ''] = kqxs.split(';')[0].split('-');
    const prizes = splitDigits(main.slice(0, 102), layout.slice(0, -1));
    if (db) prizes['ĐB'] = [db.slice(0, 5)];
    provinces = [{ name: null, prizes }];
  } else {
    const k = kqxs.indexOf(':');
    if (k < 0) return null;
    const parts = kqxs.slice(k + 1).split('|');
    provinces = kqxs.slice(0, k).split(',').map((code, i) => ({
      name: LIVE_NAMES[code] || code,
      prizes: splitDigits((parts[i] || '').split(';')[0].replace(/\D/g, ''), layout),
    }));
  }
  const [y, m, d] = date.split('-');
  return {
    title: `KẾT QUẢ XỔ SỐ ${NAME[mien]} NGÀY ${d}/${m}/${y} (${THU[weekday(date)]})`,
    link: PAGES[mien],
    day: `${d}/${m}`,
    provinces,
    complete: provinces.every(p => layout.every(([g, count, len]) =>
      (p.prizes[g] || []).filter(n => n.length === len).length === count)),
    live: true,
  };
}

// Để nhận ra nguồn trực tiếp còn đang giữ kỳ trước (chưa sang kỳ hôm nay)
function fingerprint(item) {
  return item.provinces.map(p => `${p.name}:${(p.prizes['8'] || [''])[0]}${(p.prizes['1'] || [''])[0]}`).sort().join('|');
}

function vnParts() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  return Object.fromEntries(parts.map(p => [p.type, p.value]));
}
const todayVN = () => { const p = vnParts(); return `${p.year}-${p.month}-${p.day}`; };
const nowVN = () => { const p = vnParts(); return `${p.hour}:${p.minute}`; };
const weekday = iso => new Date(iso + 'T00:00:00Z').getUTCDay();

function retryAfterMs(h) {
  if (!h) return COOLDOWN_MS;
  const s = Number(h);
  const ms = Number.isFinite(s) ? s * 1000 : Date.parse(h) - Date.now();
  return ms > 0 ? Math.min(ms, 10 * 60 * 1000) : COOLDOWN_MS;
}

function blockedError(host) {
  const s = Math.ceil((blocked[host] - Date.now()) / 1000);
  return new Error(`nguồn đang chặn vì gọi quá nhiều, thử lại sau ${s} giây`);
}

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

function shared(key, fn) {
  return pending[key] ??= fn().finally(() => { delete pending[key]; });
}

async function getFeed(mien) {
  const hit = feedCache[mien];
  if (hit && Date.now() - hit.at < FEED_CACHE_MS) return { items: hit.items, stale: false };
  try {
    const items = await shared('rss-' + mien, async () => parseFeed(await fetchText(FEEDS[mien]), mien));
    feedCache[mien] = { at: Date.now(), items };
    return { items, stale: false };
  } catch (e) {
    if (!hit) throw e;
    return { items: hit.items, stale: true }; // nguồn lỗi hoặc đang chặn: dùng tạm dữ liệu lần trước
  }
}

async function getLive(mien, date) {
  const hit = liveCache[mien];
  if (hit && hit.date === date && Date.now() - hit.at < LIVE_CACHE_MS) return hit.item;
  const item = await shared('live-' + mien, async () =>
    parseLive(JSON.parse(await fetchText(`${LIVE[mien]}&s=0&rr=${Date.now()}`)).kqxs, mien, date));
  liveCache[mien] = { at: Date.now(), date, item };
  return item;
}

async function getToday(mien, date) {
  const { items, stale } = await getFeed(mien);
  const day = date.slice(8) + '/' + date.slice(5, 7);
  let result = items.find(i => i.day === day) || null;
  let liveFailed = false;
  if (!(result && result.complete) && nowVN() >= LIVE_FROM[mien]) {
    try {
      const live = await getLive(mien, date);
      const prev = items.find(i => i.day !== day);
      if (live && (!prev || fingerprint(live) !== fingerprint(prev))) result = live;
    } catch (e) {
      liveFailed = true;
    }
  }
  return { result, stale: stale || liveFailed };
}

async function getPast(mien, date) {
  const key = mien + date;
  if (!(key in pastCache)) {
    const [y, m, d] = date.split('-');
    const link = `${PAGES[mien]}/ngay-${+d}-${+m}-${y}`;
    const tables = parseTables(await shared(key, () => fetchText(link)), mien, link);
    if (!tables.length) throw new Error('không đọc được trang kết quả');
    let r = tables.find(t => t.date === date);
    // Trang theo ngày bên nguồn có lúc hiện nhầm kỳ khác (vd ngày 13/10/2026 lại hiện kỳ 10/10),
    // khi đó tìm trong trang theo thứ, trang này có kết quả 4 tuần gần nhất
    if (!r) {
      const wd = weekday(date);
      const wlink = `${PAGES[mien]}/${wd === 0 ? 'chu-nhat' : 'thu-' + (wd + 1)}`;
      r = parseTables(await shared(wlink, () => fetchText(wlink)), mien, wlink).find(t => t.date === date);
    }
    // Vẫn không thấy thì ngày đó không xổ (trang hiện kỳ gần nhất trước đó)
    pastCache[key] = r || null;
  }
  return pastCache[key];
}

// ---------- Ký hiệu vé (vd TGA11, K5T10, 35TV44) lấy từ Minh Ngọc ----------
// xskt không có ký hiệu vé. Minh Ngọc (đại lý xổ số) ghi ký hiệu từng đài đúng như trên vé.
// Chỉ cần hỏi một lần cho mỗi ngày; Minh Ngọc lỗi hay chặn thì phiếu vẫn in được, chỉ thiếu ký hiệu.
const MINHNGOC_LIVE = 'https://www.minhngoc.net.vn/xo-so-truc-tiep/mien-nam.html';
const minhngocDay = date => {
  const [y, m, d] = date.split('-');
  return `https://www.minhngoc.net.vn/ket-qua-xo-so/mien-nam/${d}-${m}-${y}.html`;
};
const CODES_RETRY_MS = 10 * 60 * 1000; // chưa có ký hiệu (vd sáng sớm) thì 10 phút sau mới hỏi lại
const codesCache = {}; // ngày -> { at, found, codes: { tên đài: ký hiệu } }

// Mỗi bảng trên trang Minh Ngọc là một ngày: ô ngày "01/11/26" hoặc "31/10/2026";
// mỗi đài có ô tên và ô ký hiệu: "L: TGA11" ở trang trực tiếp, "XSHG - K5T10" ở trang theo ngày
function parseMinhNgocCodes(html) {
  const days = {};
  for (const part of html.split('class="bkqmiennam"').slice(1)) {
    const dm = part.match(/class="ngay">\s*(?:<a[^>]*>)?\s*(\d{2})\/(\d{2})\/(\d{2,4})/);
    if (!dm) continue;
    const date = `${dm[3].length === 2 ? '20' + dm[3] : dm[3]}-${dm[2]}-${dm[1]}`;
    const codes = {};
    for (const m of part.matchAll(/<td class="tinh">\s*<a[^>]*>([^<]+)<\/a>\s*<\/td>\s*<\/tr>\s*<tr>\s*<td class="matinh">([\s\S]*?)<\/td>/g)) {
      const code = decodeEntities(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
        .replace(/^L:\s*/, '').replace(/^XS[A-Z]+\s*-\s*/, '');
      if (code) codes[canon(decodeEntities(m[1]).trim())] = code;
    }
    if (Object.keys(codes).length && !days[date]) days[date] = codes;
  }
  return days;
}

async function getCodes(date, today) {
  const hit = codesCache[date];
  if (hit && (hit.found || Date.now() - hit.at < CODES_RETRY_MS)) return hit.codes;
  try {
    for (const url of date === today ? [MINHNGOC_LIVE, minhngocDay(date)] : [minhngocDay(date)]) {
      const days = parseMinhNgocCodes(await shared(url, () => fetchText(url)));
      // Trang theo ngày có luôn mấy ngày trước đó: giữ hết, khỏi hỏi lại
      for (const [d, codes] of Object.entries(days)) codesCache[d] = { at: Date.now(), found: true, codes };
      if (days[date]) return days[date];
    }
  } catch (e) {
    // bỏ qua: không có ký hiệu thì người dùng tự gõ
  }
  codesCache[date] = { at: Date.now(), found: false, codes: {} };
  return {};
}

async function getResults(mien, date) {
  const today = todayVN();
  date ||= today;
  const out = { mien, date, today, isToday: date === today, fetchedAt: new Date().toISOString(), result: null };
  // Ký hiệu vé (chỉ có cho Miền Nam) hỏi song song với kết quả
  const codes = mien === 'mn' && date <= today ? getCodes(date, today) : Promise.resolve({});
  if (date === today) Object.assign(out, await getToday(mien, date));
  else if (date < today) out.result = await getPast(mien, date);
  // Chưa có số của hôm nay hoặc ngày tới: gửi danh sách đài theo lịch để vẽ bảng xoay
  if (!out.result && date >= today) out.planned = mien === 'mb' ? [null] : SCHEDULE[mien][weekday(date)];
  out.codes = await codes;
  return out;
}

// Bộ đệm (CDN của Vercel) được giữ câu trả lời bao nhiêu giây, để nhiều người mở trang cũng không hỏi dồn nguồn
function cacheSeconds(d) {
  if (d.stale) return 0;                                 // dữ liệu tạm khi nguồn lỗi, đừng giữ
  if (d.date < d.today) return d.result ? 86400 : 3600;  // ngày cũ không đổi
  if (d.date > d.today) return 3600;
  if (!d.result) return 30;                              // hôm nay chưa xổ
  return d.result.complete ? 300 : 8;                    // đang xổ thì giữ ngắn để số mới hiện nhanh
}

// /api/kqxs?mien=mn|mt|mb&date=YYYY-MM-DD → { status, body, cache }
async function handleKqxs(params) {
  const mien = params.get('mien') || 'mn';
  const date = params.get('date') || '';
  const bad = !FEEDS[mien] ? 'mien phải là mn, mt hoặc mb'
    : date && !/^\d{4}-\d{2}-\d{2}$/.test(date) ? 'date phải có dạng YYYY-MM-DD' : null;
  if (bad) return { status: 400, body: { error: bad }, cache: 0 };
  try {
    const data = await getResults(mien, date);
    return { status: 200, body: data, cache: cacheSeconds(data) };
  } catch (e) {
    return { status: 502, body: { error: e.message }, cache: 0 };
  }
}

module.exports = { handleKqxs, getResults, parseFeed, parseDescription, parseTables, parseLive, parseMinhNgocCodes };
