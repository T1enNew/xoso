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
