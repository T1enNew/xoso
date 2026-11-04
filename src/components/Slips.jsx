import { PRIZES, THU_NGAN } from '../lib/constants.js';
import { weekday } from '../lib/time.js';
import { Num, nextSlot } from './Spin.jsx';

// Phiếu gọn như phiếu mẫu (không kéo dài hết nửa tờ A4), số to và sát dòng. Kích thước tính bằng mm, cỡ chữ bằng pt.
const PT = 0.3528;          // 1pt = 0.3528mm
const LABEL_COL = 9;        // bề ngang cột trái: ngày ở dòng tiêu đề, tiền thưởng ở các dòng dưới
const SLIP_W = 202 / 3 - 4; // bề ngang bên trong một phiếu
const SLIP_H = 130;         // chiều cao một phiếu (nửa tờ A4 là 144mm)
const LH = 0.85;            // khoảng cách các dòng số so với cỡ chữ (đo theo phiếu mẫu)
const ROWS = PRIZES.reduce((n, p) => n + p.count, 0);
const DB_LEN = PRIZES.at(-1).len;

// Bề ngang thật của dòng chữ (tính theo cỡ chữ), đo bằng canvas
let ctx;
function textEm(text) {
  ctx ||= document.createElement('canvas').getContext('2d');
  ctx.font = 'bold 100px Arial, Helvetica, sans-serif';
  return ctx.measureText(text).width / 100;
}

function slipFonts(cols, codeLen, nameLen, footer) {
  const H = SLIP_H - 4 - 18 - 11; // chiều cao cho các dòng số: trừ lề, tiêu đề + dòng cuối, khoảng hở các nhóm giải
  const W = SLIP_W - LABEL_COL;   // bề ngang cho các cột số
  const colW = W / cols - 3;      // chừa 1,5mm bên phải số và ít nhất 1mm bên trái cho số không sát đường dọc
  const fit = (mm, digits) => mm / (PT * 0.6 * digits); // chữ số Arial rộng ~0,58 cỡ chữ
  // ROWS + 0.9: dòng giải 8 và đặc biệt chữ to hơn nên chiếm thêm chỗ
  const fs = Math.min(H / PT / LH / (ROWS + 0.9), fit(colW, 5), 19);
  return {
    fs,
    f8: Math.min(fs * 1.5, fit(colW, 3)),
    // Đặc biệt: chừa ~4mm bề ngang quanh số để số cách xa khung (chữ số đậm rộng ~0,565 cỡ chữ)
    fdb: Math.min(fs * 1.3, (W / cols - 4) / (PT * 0.565 * DB_LEN)),
    // Mã vé có chữ in hoa (rộng hơn chữ số) nên thu nhỏ riêng cho vừa cột, tối đa 0,88 cỡ các con số
    fcode: Math.min(fs * 0.88, colW / (PT * 0.7 * Math.max(codeLen, 1))),
    // Tên đài cao ~0,62 các con số; tên dài thì thu nhỏ cho vừa một dòng, nhỏ nhất 7pt (chật quá thì xuống dòng)
    fname: Math.max(7, Math.min(fs * 0.62, colW / (PT * 0.66 * nameLen))),
    // Dòng cuối dài khoảng 90% bề ngang phiếu, to nhất 13pt
    ffoot: footer ? Math.min(13, (SLIP_W * 0.9) / PT / textEm(footer)) : 8,
  };
}

const rowClass = (g, r, count) => [{ 'ĐB': 'db', '8': 'g8' }[g], r === 0 && 'top', r === count - 1 && 'end'].filter(Boolean).join(' ');
// Đường dọc bên trái ô: đài đầu nằm cạnh cột tiền thưởng (first), các đài sau có đường ngăn đậm (sep)
const edge = i => (i ? 'sep' : 'first');

// 6 phiếu giống nhau trên 1 tờ A4, 3 trên 3 dưới. Các đài đã lọc và xếp sẵn theo thứ tự người dùng chọn.
export default function Slips({ date, provinces, footer, getCode, live }) {
  const codes = provinces.map(p => getCode(p.name).trim().toUpperCase());
  const hasCode = codes.some(Boolean);
  const cur = provinces.map(p => live && nextSlot(p.prizes)); // đang xổ: mỗi đài chỉ quay số đang tới lượt
  const f = slipFonts(provinces.length, Math.max(...codes.map(c => c.length)), Math.max(...provinces.map(p => p.name.length)), footer);
  const style = { '--lh': LH };
  for (const [k, v] of Object.entries(f)) style[`--${k}`] = `${v.toFixed(1)}pt`;
  const [y, m, d] = date.split('-');

  const slip = (
    <table>
      <colgroup>
        <col style={{ width: `${LABEL_COL}mm` }} />
        {provinces.map(p => <col key={p.name} />)}
      </colgroup>
      <tbody>
        <tr className="hd">
          <th className="lb">{THU_NGAN[weekday(date)]}<br />{d}/{m}<br />{y}</th>
          {provinces.map((p, i) => (
            <th key={p.name} className={edge(i)}>
              <div className="pn">{p.name}</div>
              {/* Đài nào chưa có mã vẫn chừa dòng mã để tên các đài thẳng hàng */}
              {hasCode && <div className="code">{codes[i] || ' '}</div>}
            </th>
          ))}
        </tr>
        {PRIZES.flatMap(({ g, count, len, label }) => Array.from({ length: count }, (_, r) => (
          <tr key={g + r} className={rowClass(g, r, count)}>
            {r === 0 && <td className="lb" rowSpan={count}>{label}</td>}
            {provinces.map((p, i) => (
              <td key={p.name} className={`v ${edge(i)}`}>
                <Num v={p.prizes[g]?.[r]} len={len} active={cur[i] === `${g}:${r}`} />
              </td>
            ))}
          </tr>
        )))}
        {footer && <tr><td className="ft" colSpan={provinces.length + 1}>{footer}</td></tr>}
      </tbody>
    </table>
  );

  // In 1 đài thì cột số rất rộng, canh giữa cho cân; từ 2 đài thì canh phải như phiếu mẫu
  const cls = provinces.length === 1 ? 'slip one' : 'slip';
  return Array.from({ length: 6 }, (_, i) => <div key={i} className={cls} style={style}>{slip}</div>);
}
