import { ORDER } from '../lib/constants.js';

// Thứ tự xổ: miền Nam/Trung từ giải 8 lên đặc biệt; miền Bắc từ giải nhất xuống giải 7 rồi mới đặc biệt
const DRAW_ORDER = { ...ORDER, mb: ['1', '2', '3', '4', '5', '6', '7', 'ĐB'] };

// Số đang quay của một đài: số đầu tiên chưa ra đủ chữ số, theo thứ tự xổ. Trả về 'giải:vị trí'.
export function nextSlot(m, prizes, spec) {
  for (const g of DRAW_ORDER[m]) {
    const [count, len] = spec[g];
    for (let i = 0; i < count; i++) {
      const v = (prizes[g] || [])[i];
      if (!v || v.length < len) return `${g}:${i}`;
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

// Số đã ra đủ thì in. Chưa ra: số đang quay của đài thì cuộn (đỏ), các số chờ tới lượt thì hiện chấm mờ đứng yên.
export function Num({ v, len, active, className }) {
  if (v && v.length >= len) return className ? <span className={className}>{v}</span> : v;
  const pre = v || '';
  const cls = `${className || ''} ${active ? 'rolling' : 'waiting'}`.trim();
  return (
    <span className={cls}>
      {pre}
      {Array.from({ length: len - pre.length }, (_, i) => (active ? <Reel key={i} i={i} /> : <span key={i} className="ph">0</span>))}
    </span>
  );
}
