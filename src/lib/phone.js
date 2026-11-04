// Số điện thoại có tối đa 10 số (di động), riêng máy bàn bắt đầu bằng 02 thì 11 số
export const phoneMaxLen = digits => (digits.startsWith('02') ? 11 : 10);

// Cách nhóm ngay khi đang gõ: di động 4-3-3 (0918 643 803), máy bàn 3-4-4 (028 3812 3456)
export function formatPhone(digits) {
  const groups = digits.startsWith('02') ? [3, 4, 4] : [4, 3, 3];
  let i = 0;
  return groups.map(g => digits.slice(i, (i += g))).filter(Boolean).join(' ');
}
