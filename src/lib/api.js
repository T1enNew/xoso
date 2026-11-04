import { DRAW_TIME } from './constants.js';
import { fmtDate } from './time.js';

export async function fetchResults(date) {
  const res = await fetch(`/api/kqxs?date=${date}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Lỗi server (${res.status})`);
  return data;
}

// Các đài để vẽ. Chưa có số thì server gửi danh sách đài theo lịch (phiếu chờ).
export function provincesOf(data) {
  if (data.result) return data.result.provinces;
  return data.planned?.map(name => ({ name, prizes: {} })) || null;
}

export const staleNote = d => (d.stale ? ' Nguồn đang chậm hoặc tạm chặn, có thể chưa phải số mới nhất.' : '');

// Dòng trạng thái cho dữ liệu vừa lấy
export function describe(d) {
  const day = fmtDate(d.date);
  if (d.result?.complete) return { text: `Đã có đủ kết quả ngày ${day}.${staleNote(d)}`, kind: 'done' };
  if (d.result) return { text: `Đang xổ, mới có một phần kết quả ngày ${day}.${staleNote(d)}`, kind: 'live' };
  if (d.planned && d.isToday) return { text: `Chưa xổ. Trang tự cập nhật khi tới giờ xổ (${DRAW_TIME}).${staleNote(d)}`, kind: 'wait' };
  if (d.planned) return { text: `Ngày ${day} chưa tới kỳ xổ.`, kind: 'wait' };
  return { text: `Ngày ${day} không có kỳ quay.`, kind: '' };
}
