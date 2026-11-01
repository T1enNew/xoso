// Thứ tự các đài trên phiếu: theo thứ tự người dùng xếp (lưu trên máy); đài chưa xếp thì đứng sau, theo A→Z
const byName = (a, b) => (a || '').localeCompare(b || '', 'vi');

export function sortProvinces(list, order) {
  const rank = name => { const i = order.indexOf(name); return i < 0 ? Infinity : i; };
  return [...list].sort((a, b) => rank(a.name) - rank(b.name) || byName(a.name, b.name));
}

// Đưa một đài tới vị trí idx (0 = cột đầu) trong các đài đang in; đài không in đứng sau.
// Thứ tự đã xếp của các đài ngày khác giữ nguyên ở phía sau.
export function moveProvinceTo(order, all, printed, name, idx) {
  if (!printed.includes(name)) return order;
  const next = printed.filter(n => n !== name);
  next.splice(Math.max(0, Math.min(idx, next.length)), 0, name);
  const full = [...next, ...all.filter(n => !next.includes(n))];
  return [...full, ...order.filter(n => !full.includes(n))];
}

export const isAlphabetical = names => names.every((n, i) => i === 0 || byName(names[i - 1], n) <= 0);
