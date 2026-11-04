import { PRIZES } from '../lib/constants.js';

// Số đang quay của một đài: số đầu tiên chưa ra đủ chữ số, theo thứ tự xổ. Trả về 'giải:vị trí'.
export function nextSlot(prizes) {
  for (const { g, count, len } of PRIZES) {
    for (let i = 0; i < count; i++) {
      if (!(prizes[g]?.[i]?.length >= len)) return `${g}:${i}`;
    }
  }
  return null;
}

// Dải số 0→9→0 cuộn lên liên tục như vòng quay, mỗi chữ số quay nhanh chậm khác nhau cho tự nhiên
const STRIP = '0\n1\n2\n3\n4\n5\n6\n7\n8\n9\n0';
const SPEED = [0.9, 0.72, 1.05, 0.8, 0.96, 0.76];

function Reel({ i }) {
  const style = { animationDuration: `${SPEED[i % SPEED.length]}s`, animationDelay: `${-(i * 0.37).toFixed(2)}s` };
  // Chữ "0" trong suốt giữ đúng bề ngang một chữ số, dải số nằm đè lên và bị cắt vừa một dòng
  return <span className="reel">0<span className="win"><span className="strip" style={style}>{STRIP}</span></span></span>;
}

// Số đã ra đủ thì in. Chưa ra: số đang quay của đài thì cuộn (đỏ), các số chờ tới lượt thì có vòng tròn nhỏ xoay.
// Các chữ "0" trong suốt giữ đúng chỗ của số để khi số ra không bị xô lệch.
export function Num({ v = '', len, active, className = '' }) {
  if (v.length >= len) return className ? <span className={className}>{v}</span> : v;
  const rest = len - v.length;
  return (
    <span className={`${className} ${active ? 'rolling' : 'waiting'}`.trim()}>
      {v}
      {active
        ? Array.from({ length: rest }, (_, i) => <Reel key={i} i={i} />)
        : <span className="ph">{'0'.repeat(rest)}</span>}
    </span>
  );
}
