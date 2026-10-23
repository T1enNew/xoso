import { fmtDate } from './time.js';

export async function fetchResults(mien, date) {
  const res = await fetch(`/api/kqxs?mien=${mien}&date=${date}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Lỗi server (${res.status})`);
  if (!data.date) throw new Error('server đang chạy bản cũ. Vào terminal bấm Ctrl+C rồi chạy lại: npm run dev');
  return data;
}

// Các đài để vẽ. Chưa có số thì server gửi danh sách đài theo lịch, ô nào cũng xoay.
export function provincesOf(data) {
  if (data.result) return data.result.provinces;
  if (data.planned) return data.planned.map(name => ({ name, prizes: {} }));
  return null;
}

export function describe(d) {
  const day = fmtDate(d.date);
  const stale = d.stale ? ' Nguồn đang chậm hoặc tạm chặn, có thể chưa phải số mới nhất.' : '';
  if (d.result?.complete) return { text: `Đã có đủ kết quả ngày ${day}.` + stale, kind: 'done' };
  if (d.result) return { text: `Đang xổ, mới có một phần kết quả ngày ${day}.` + stale, kind: 'live' };
  if (d.planned) return { text: `Chưa có kết quả ngày ${day}. Bấm "Chờ giờ xổ" để tự cập nhật và tự in.` + stale, kind: 'wait' };
  return { text: `Ngày ${day} không có kỳ quay.`, kind: '' };
}
