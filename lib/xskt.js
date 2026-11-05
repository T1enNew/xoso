// Nguồn dự phòng: xskt.com.vn (chỉ dùng khi Minh Ngọc lỗi hoặc không đọc được).
// Hôm nay: lúc đang xổ lấy từ nguồn trực tiếp (trang xskt tự dò mỗi 15 giây), xổ xong lấy từ RSS.
// Ngày cũ: lấy từ trang kết quả theo ngày, trang đó lỗi thì tìm trong trang theo thứ.
const { canon, LAYOUT, isComplete, decodeEntities, vnTime, weekday, fetchText, shared, page } = require('./common.js');

const FEED = 'https://xskt.com.vn/rss-feed/mien-nam-xsmn.rss';
const LIVE = 'https://tttt.xskt.com.vn/zzz/ttttxs-s.jsp?areaCode=MN';
const PAGE = 'https://xskt.com.vn/xsmn';
const LIVE_FROM = '16:05'; // từ giờ này mới hỏi nguồn trực tiếp (giờ VN)
const FEED_CACHE_MS = 60 * 1000; // RSS bên nguồn cũng đệm 5 phút nên không cần hỏi dày
const LIVE_CACHE_MS = 8 * 1000;

// Mã đài của nguồn trực tiếp
const LIVE_NAMES = {
  AG: 'An Giang', BL: 'Bạc Liêu', BT: 'Bến Tre', BD: 'Bình Dương', BP: 'Bình Phước', BTH: 'Bình Thuận',
  CM: 'Cà Mau', CT: 'Cần Thơ', LD: 'Đà Lạt', DN: 'Đồng Nai', DT: 'Đồng Tháp', HG: 'Hậu Giang',
  HCM: 'Hồ Chí Minh', KG: 'Kiên Giang', LA: 'Long An', ST: 'Sóc Trăng', TN: 'Tây Ninh', TG: 'Tiền Giang',
  TV: 'Trà Vinh', VL: 'Vĩnh Long', VT: 'Vũng Tàu',
};

// ---------- Đọc dữ liệu ----------

const tag = (xml, name) => decodeEntities(xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1] || '').trim();

// Phần mô tả của RSS: dòng "[Tên đài]" rồi các dòng "giải: số - số - ..."
function parseDescription(desc) {
  const provinces = [];
  let cur = null;
  for (const line of desc.split('\n').map(s => s.trim())) {
    const prov = line.match(/^\[(.+?)\]$/);
    if (prov) {
      provinces.push(cur = { name: canon(prov[1]), prizes: {} });
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

// Mọi bảng kết quả trên một trang (trang theo ngày /xsmn/ngay-D-M-YYYY, hoặc trang theo thứ /xsmn/thu-3 có 4 tuần gần nhất)
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
    .map(([, name]) => ({ name: canon(decodeEntities(name)), prizes: {} }));
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

// ---------- Lấy kết quả ----------

let feedCache = null; // { at, items }
let liveCache = null; // { at, date, item }
const pastCache = {}; // kết quả ngày cũ không đổi nên giữ luôn

async function getFeed() {
  if (feedCache && Date.now() - feedCache.at < FEED_CACHE_MS) return { items: feedCache.items, stale: false };
  try {
    const items = await shared('xskt-rss', async () => parseFeed(await fetchText(FEED)));
    feedCache = { at: Date.now(), items };
    return { items, stale: false };
  } catch (e) {
    if (!feedCache) throw e;
    return { items: feedCache.items, stale: true }; // nguồn lỗi hoặc đang chặn: dùng tạm dữ liệu lần trước
  }
}

async function getLive(date) {
  if (liveCache?.date === date && Date.now() - liveCache.at < LIVE_CACHE_MS) return liveCache.item;
  const item = await shared('xskt-live', async () => parseLive(JSON.parse(await fetchText(`${LIVE}&s=0&rr=${Date.now()}`)).kqxs));
  liveCache = { at: Date.now(), date, item };
  return item;
}

// Kết quả hôm nay: { result, stale }
async function getToday(date) {
  const { items, stale } = await getFeed();
  const day = `${date.slice(8)}/${date.slice(5, 7)}`;
  let result = items.find(i => i.day === day) || null;
  let liveFailed = false;
  if (!result?.complete && vnTime() >= LIVE_FROM) {
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

// Kết quả một ngày đã qua (null nếu ngày đó không xổ)
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
    pastCache[date] = r || null;
  }
  return pastCache[date];
}

module.exports = { getToday, getPast, parseDescription, parseFeed, parseTables, parseLive };
