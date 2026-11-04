import { useEffect, useState } from 'react';
import { addDays } from './time.js';

// Lưu lựa chọn trên máy này (kiểu in, đài bỏ qua, thứ tự đài, mã vé, dòng cuối, số tờ in)
export const store = {
  get(k) { try { return localStorage.getItem('xoso.' + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('xoso.' + k, v); } catch {} },
  del(k) { try { localStorage.removeItem('xoso.' + k); } catch {} },
};

export function useStored(key, initial, { json = false } = {}) {
  const [value, setValue] = useState(() => {
    const raw = store.get(key);
    if (raw == null) return initial;
    if (!json) return raw;
    try { return JSON.parse(raw); } catch { return initial; }
  });
  useEffect(() => { store.set(key, json ? JSON.stringify(value) : value); }, [key, value, json]);
  return [value, setValue];
}

// Đoán mã vé khi Minh Ngọc chưa có: lấy mã đã gõ tuần trước và tăng số cuối
export function suggestCode(date, name) {
  for (let k = 1; k <= 8; k++) {
    const prev = store.get(`code.${addDays(date, -7 * k)}.${name}`);
    if (prev) return prev.replace(/\d+$/, n => String(+n + k).padStart(n.length, '0'));
  }
  return '';
}
