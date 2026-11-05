// /api/kqxs: kết quả XSKT Miền Nam theo ngày. Dùng chung cho server.js (chạy ở máy) và api/kqxs.js (Vercel).
// Nguồn chính là Minh Ngọc (có ký hiệu vé). Minh Ngọc lỗi, hoặc tới giờ xổ mà chưa có số, thì hỏi xskt.com.vn.
const { vnDate, vnTime, weekday } = require('./common.js');
const minhngoc = require('./minhngoc.js');
const xskt = require('./xskt.js');

const DRAW_TIME = '16:15'; // giờ bắt đầu xổ (giờ VN)
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

// Kết quả một ngày đã qua hoặc hôm nay: { result, source, stale? }
async function fetchResult(date, today) {
  let error = null;
  try {
    const result = date === today ? await minhngoc.getToday(date) : await minhngoc.getPast(date);
    if (result) return { result, source: 'minhngoc' };
  } catch (e) {
    error = e;
  }
  // Hôm nay trước giờ xổ thì chưa có số ở đâu cả, khỏi hỏi nguồn dự phòng
  if (!error && date === today && vnTime() < DRAW_TIME) return { result: null };
  try {
    const { result, stale } = date === today ? await xskt.getToday(date) : { result: await xskt.getPast(date) };
    return { result, stale, source: result ? 'xskt' : undefined };
  } catch (e) {
    if (error) throw error;
    return { result: null };
  }
}

// { date, today, isToday, result, planned?, stale?, source?, codes }
async function getResults(date) {
  const today = vnDate();
  date ||= today;
  const out = { date, today, isToday: date === today, result: null };
  if (date <= today) Object.assign(out, await fetchResult(date, today));
  // Chưa có số của hôm nay hoặc ngày tới: gửi danh sách đài theo lịch để vẽ phiếu chờ
  if (!out.result && date >= today) out.planned = SCHEDULE[weekday(date)];
  const provinces = out.result?.provinces || [];
  out.codes = Object.fromEntries(provinces.filter(p => p.code).map(p => [p.name, p.code]));
  if (out.result) out.result = { complete: out.result.complete, provinces: provinces.map(({ name, prizes }) => ({ name, prizes })) };
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

module.exports = { handleKqxs };
