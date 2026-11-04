// Thứ tự các đài trên phiếu: theo thứ tự người dùng kéo thả (lưu trên máy); đài chưa xếp thì đứng sau, theo A→Z
export function sortProvinces(list, order) {
  const rank = name => { const i = order.indexOf(name); return i < 0 ? Infinity : i; };
  return [...list].sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name, 'vi'));
}

// Lưu thứ tự mới của các đài đang hiện (sau khi kéo thả). Thứ tự đã xếp của các đài ngày khác giữ nguyên ở phía sau.
export const applyOrder = (order, next) => [...next, ...order.filter(n => !next.includes(n))];
