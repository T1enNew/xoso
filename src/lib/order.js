// Thứ tự các đài trên phiếu: theo thứ tự người dùng xếp (lưu trên máy); đài chưa xếp thì đứng sau, theo A→Z
const byName = (a, b) => (a || '').localeCompare(b || '', 'vi');

export function sortProvinces(list, order) {
  const rank = name => { const i = order.indexOf(name); return i < 0 ? Infinity : i; };
  return [...list].sort((a, b) => rank(a.name) - rank(b.name) || byName(a.name, b.name));
}

// Đổi chỗ một đài lên (step -1) hoặc xuống (step 1) trong danh sách đang hiện.
// Thứ tự đã xếp của các đài ngày khác giữ nguyên ở phía sau.
export function moveProvince(order, current, name, step) {
  const i = current.indexOf(name);
  const j = i + step;
  if (i < 0 || j < 0 || j >= current.length) return order;
  const next = [...current];
  [next[i], next[j]] = [next[j], next[i]];
  return [...next, ...order.filter(n => !next.includes(n))];
}

export const isAlphabetical = names => names.every((n, i) => i === 0 || byName(names[i - 1], n) <= 0);
