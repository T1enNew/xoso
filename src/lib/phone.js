// Số điện thoại có tối đa 10 số (di động), riêng máy bàn bắt đầu bằng 02 thì 11 số
export const phoneMaxLen = digits => (digits.startsWith('02') ? 11 : 10);

// Cách nhóm ngay khi đang gõ: di động 4-3-3 (0918 643 803), máy bàn 3-4-4 (028 3812 3456)
export function formatPhone(digits) {
  const groups = digits.startsWith('02') ? [3, 4, 4] : [4, 3, 3];
  const out = [];
  let i = 0;
  for (const g of groups) {
    if (i >= digits.length) break;
    out.push(digits.slice(i, i + g));
    i += g;
  }
  return out.join(' ');
}

// Viết số điện thoại Việt Nam theo kiểu chuẩn, gõ kiểu gì cũng được (0918643803, 0918.643.803, 0918-643-803):
// di động 10 số → "0918 643 803", máy bàn 11 số (02x) → "028 3812 3456". Số khác giữ nguyên.
export function formatPhones(text) {
  return text.replace(/(?<![\d+])0[\d .-]{8,13}\d/g, m => {
    const d = m.replace(/\D/g, '');
    if (d.length === 10) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
    if (d.length === 11 && d.startsWith('02')) return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
    return m;
  });
}
