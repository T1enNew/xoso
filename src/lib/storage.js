import { useEffect, useState } from 'react';
import { addDays } from './time.js';

// Lưu lựa chọn trên máy này (đài bỏ qua, mã vé, dòng cuối, kiểu in, miền)
export const store = {
  get(k) { try { return localStorage.getItem('xoso.' + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('xoso.' + k, v); } catch {} },
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

// Mã vé (vd 35TV40) không có trong nguồn nên tự gõ. Chưa gõ thì lấy mã tuần trước và tăng số cuối.
export function suggestCode(date, name) {
  const v = store.get(`code.${date}.${name}`);
  if (v != null) return v;
  for (let k = 1; k <= 8; k++) {
    const prev = store.get(`code.${addDays(date, -7 * k)}.${name}`);
    if (prev) return prev.replace(/\d+$/, n => String(+n + k).padStart(n.length, '0'));
  }
  return '';
}
