// Nguồn chính: Minh Ngọc (minhngoc.net.vn), đại lý xổ số có đăng ký; có luôn ký hiệu vé của từng đài.
// - Ngày đã xổ: trang kết quả theo ngày (mỗi trang có luôn 7 kỳ gần nhất nên ít phải hỏi).
// - Hôm nay lúc đang xổ: file trực tiếp js_m1.js (trang Minh Ngọc tự dò mỗi 5 giây) cho các con số,
//   cùng bảng trực tiếp (POST action=xn) để biết mã số đài trong file ứng với đài nào.
const { canon, isComplete, decodeEntities, vnDate, vnTime, fetchText, shared, page } = require('./common.js');

const SITE = 'https://www.minhngoc.net.vn';
const LIVE_PAGE = `${SITE}/xo-so-truc-tiep/mien-nam.html`;
const dayPage = date => {
  const [y, m, d] = date.split('-');
  return `${SITE}/ket-qua-xo-so/mien-nam/${d}-${m}-${y}.html`;
};
// Các máy chủ phát số trực tiếp; trang Minh Ngọc cũng chọn ngẫu nhiên một máy mỗi lần
const LIVE_HOSTS = [20, 22, 23, 25, 31, 32, 35, 36].map(n => `https://server-live${n}.minhngoc.net.vn`);
const LIVE_FROM = '16:05';          // từ giờ này mới hỏi nguồn trực tiếp (giờ VN)
const LIVE_CACHE_MS = 8 * 1000;
const TABLE_CACHE_MS = 60 * 1000;

// Lớp của ô giải trên trang, và số giải trong file trực tiếp (0 là đặc biệt)
const GIAI = { giai8: '8', giai7: '7', giai6: '6', giai5: '5', giai4: '4', giai3: '3', giai2: '2', giai1: '1', giaidb: 'ĐB' };
const LIVE_GIAI = [['8', '8'], ['7', '7'], ['6', '6'], ['5', '5'], ['4', '4'], ['3', '3'], ['2', '2'], ['1', '1'], ['0', 'ĐB']];

// Các chữ số đã ra của một số. Minh Ngọc ghi chữ số đang quay là "+", chưa quay là "*" (vd "53+++").
const drawn = s => String(s).replace(/<[^>]+>/g, '').trim().match(/^\d*/)[0];
// Các số đã ra theo đúng thứ tự, dừng ở số đầu tiên chưa quay
function takeDrawn(list) {
  const out = [];
  for (const s of list) {
    const d = drawn(s);
    if (!d) break;
    out.push(d);
  }
  return out;
}

// Ký hiệu vé: "XSDN - 11K1" (trang theo ngày) hoặc "L: 11K1" (trang trực tiếp)
const cleanCode = cell => decodeEntities(cell.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
  .replace(/^L:\s*/, '').replace(/^XS[A-Z]+\s*-\s*/, '');

// Mỗi bảng class="bkqmiennam" là một ngày: ô ngày "04/11/2026" (trang theo ngày) hoặc "04/11/26" (trang trực tiếp).
// Mỗi đài một bảng con "rightcl": tên đài, ký hiệu vé, rồi các giải (mỗi số một <div>).
// Bảng trực tiếp có thêm mã số đài trong id các ô (id="giai8_10").
function parseTables(html) {
  const days = [];
  for (const part of html.split('class="bkqmiennam"').slice(1)) {
    const dm = part.match(/class="ngay">\s*(?:<a[^>]*>)?\s*(\d{2})\/(\d{2})\/(\d{2,4})/);
    if (!dm) continue;
    const date = `${dm[3].length === 2 ? '20' + dm[3] : dm[3]}-${dm[2]}-${dm[1]}`;
    const provinces = [];
    for (const t of part.split('class="rightcl"').slice(1)) {
      const name = t.match(/<td class="tinh">\s*<a[^>]*>([^<]+)<\/a>/);
      if (!name) continue;
      const prizes = {};
      for (const [, cls, cell] of t.matchAll(/<td class="(giai\w+)">([\s\S]*?)<\/td>/g)) {
        const nums = takeDrawn([...cell.matchAll(/<div[^>]*>([\s\S]*?)<\/div>/g)].map(m => m[1]));
        if (GIAI[cls] && nums.length) prizes[GIAI[cls]] = nums;
      }
      provinces.push({
        name: canon(decodeEntities(name[1])),
        id: t.match(/id="(?:giai8|loaive)_(\d+)"/)?.[1],
        code: cleanCode(t.match(/<td class="matinh">([\s\S]*?)<\/td>/)?.[1] || ''),
        prizes,
      });
    }
    if (provinces.length && !days.some(d => d.date === date)) days.push({ date, provinces, complete: isComplete(provinces) });
  }
  return days;
}

// Lấy nguyên khối {...} đứng sau dấu hiệu trong đoạn mã (đếm ngoặc, bỏ qua chữ trong ngoặc kép)
function objectAfter(text, marker) {
  const at = text.indexOf(marker);
  const start = at < 0 ? -1 : text.indexOf('{', at);
  if (start < 0) return null;
  let depth = 0;
  let quote = null;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

// File trực tiếp: kqxs.mn={run:1,tinh:"10,11,12",ntime:1793782953,delay:5000,kq:{10:{lv:"11K1",8:"10",7:"09+",6:["9151","56++","****"],...,0:"******"}}};
// Viết kiểu JavaScript (khoá không có ngoặc kép) nên đổi sang JSON rồi đọc, không chạy code của nguồn.
// names: mã số đài → tên đài. Trả về { date, ids, result }; result là null nếu còn đài chưa biết tên.
function parseLive(js, names) {
  const obj = objectAfter(js || '', 'kqxs.mn');
  if (!obj) return null;
  const data = JSON.parse(obj
    .replace(/'([^'"\\]*)'/g, '"$1"')
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*|\d+)\s*:/g, '$1"$2":'));
  const ids = String(data.tinh || '').split(',').filter(Boolean);
  const date = data.ntime ? vnDate(new Date(data.ntime * 1000)) : null;
  if (!data.kq || !ids.length) return { date, ids, result: null };
  if (ids.some(id => !names[id])) return { date, ids, result: null };
  const provinces = ids.map(id => {
    const kq = data.kq[id] || {};
    const prizes = {};
    for (const [k, g] of LIVE_GIAI) {
      const nums = kq[k] == null ? [] : takeDrawn([].concat(kq[k]));
      if (nums.length) prizes[g] = nums;
    }
    return { name: names[id], id, code: kq.lv ? cleanCode(String(kq.lv)) : '', prizes };
  });
  return { date, ids, result: { provinces, complete: isComplete(provinces) } };
}

// ---------- Lấy kết quả ----------

const idNames = {};   // mã số đài → tên đài, học từ bảng trực tiếp
const pastCache = {}; // ngày → kết quả đã xổ xong (null nếu ngày đó không xổ)
let liveCache = null; // { at, js }
let tableCache = null; // { at, day }

// Bảng trực tiếp (kỳ đang xổ hoặc vừa xổ xong), kèm mã số đài
async function liveTable() {
  if (tableCache && Date.now() - tableCache.at < TABLE_CACHE_MS) return tableCache.day;
  const [day = null] = parseTables(await shared('mn-table', () => fetchText(LIVE_PAGE, `action=xn&cache=${Date.now()}`)));
  for (const p of day?.provinces || []) if (p.id) idNames[p.id] = p.name;
  tableCache = { at: Date.now(), day };
  return day;
}

async function liveFile() {
  if (liveCache && Date.now() - liveCache.at < LIVE_CACHE_MS) return liveCache.js;
  const host = LIVE_HOSTS[Math.floor(Math.random() * LIVE_HOSTS.length)];
  const js = await shared('mn-live', () => fetchText(`${host}/xstt/js_m1.js`));
  liveCache = { at: Date.now(), js };
  return js;
}

// Kết quả hôm nay (null nếu chưa xổ)
async function getToday(date) {
  if (pastCache[date]) return pastCache[date];
  if (vnTime() < LIVE_FROM) return null;
  const js = await liveFile();
  let live = parseLive(js, idNames);
  if (live?.date === date && !live.result && live.ids.some(id => !idNames[id])) {
    await liveTable(); // đài mới chưa biết tên: hỏi bảng trực tiếp
    live = parseLive(js, idNames);
  }
  let result = live?.date === date ? live.result : null;
  if (!result) {
    // File trực tiếp chưa có số hoặc đã xoá sau khi xổ: xem bảng trực tiếp
    const day = await liveTable();
    if (day?.date === date) result = day;
  }
  if (result?.complete) pastCache[date] = result; // xổ xong thì khỏi hỏi lại
  return result;
}

// Kết quả một ngày đã qua (null nếu trang không có ngày đó)
async function getPast(date) {
  if (!(date in pastCache)) {
    const days = parseTables(await page(dayPage(date)));
    if (!days.length) throw new Error('không đọc được trang kết quả Minh Ngọc');
    for (const d of days) if (d.complete && !pastCache[d.date]) pastCache[d.date] = d; // trang có luôn mấy kỳ trước: giữ hết
    pastCache[date] ??= null;
  }
  return pastCache[date];
}

module.exports = { getToday, getPast, parseTables, parseLive };
