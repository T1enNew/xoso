import { PRIZES, THU_NGAN } from '../lib/constants.js';
import { weekday } from '../lib/time.js';
import { Num, nextSlot } from './Spin.jsx';

// Phiếu gọn như phiếu mẫu (không kéo dài hết nửa tờ A4), số to và sát dòng. Kích thước tính bằng mm, cỡ chữ bằng pt.
const PT = 0.3528;          // 1pt = 0.3528mm
const LABEL_COL = 9;        // bề ngang cột trái: ngày ở dòng tiêu đề, tiền thưởng ở các dòng dưới
const SLIP_W = 188 / 3;     // bề ngang khung phiếu ≈62,7mm: (210 - lề trái 5 - lề phải 6 - 2 khe 5,5) / 3, xem styles.css
const SLIP_H = 130;         // chiều cao một phiếu (nửa tờ A4 là 144mm)
const LH = 0.85;            // khoảng cách các dòng số so với cỡ chữ ở phiếu 2 đài (đo theo phiếu mẫu)
const ROWS = PRIZES.reduce((n, p) => n + p.count, 0);
const DB_LEN = PRIZES.at(-1).len;

// Bề ngang thật của dòng chữ (tính theo cỡ chữ), đo bằng canvas
let ctx;
function textEm(text) {
  ctx ||= document.createElement('canvas').getContext('2d');
  ctx.font = 'bold 100px Arial, Helvetica, sans-serif';
  return ctx.measureText(text).width / 100;
}

const ROWS_H = SLIP_H - 4 - 18 - 11; // chiều cao cho các dòng số: trừ lề, tiêu đề + dòng cuối, khoảng hở các nhóm giải
const NUM_W = SLIP_W - LABEL_COL;    // bề ngang cho các cột số
const fit = (mm, digits) => mm / (PT * 0.6 * digits); // cỡ chữ (pt) để số vừa mm bề ngang; chữ số Arial rộng ~0,58 cỡ chữ

// Cỡ các con số: to nhất vừa chiều cao phiếu, nhưng không tràn bề ngang cột (nhiều đài thì cột hẹp, số phải nhỏ lại)
function numberFonts(cols) {
  const colW = NUM_W / cols - 3; // chừa 1,5mm bên phải số và ít nhất 1mm bên trái cho số không sát đường dọc
  // ROWS + 0.9: dòng giải 8 và đặc biệt chữ to hơn nên chiếm thêm chỗ
  const fs = Math.min(ROWS_H / PT / LH / (ROWS + 0.9), fit(colW, 5), 19);
  // Đặc biệt: chừa ~4mm bề ngang quanh số để số cách xa khung (chữ số đậm rộng ~0,565 cỡ chữ)
  const fdb = Math.min(fs * 1.3, (NUM_W / cols - 4) / (PT * 0.565 * DB_LEN));
  return {
    colW,
    fs,
    f8: Math.min(fs * 1.5, fit(colW, 3)),
    fdb,
    // Cột hẹp (3–4 đài) làm số đặc biệt nhỏ hơn cả các số khác: kéo cao chữ lên cho nổi bật,
    // trông to ~1,25 lần các số khác (tối đa kéo 1,6 lần). Phiếu 1–2 đài số đặc biệt vốn đã to hơn nên giữ nguyên.
    dbsy: fdb < fs ? Math.min(1.6, (fs * 1.25) / fdb) : 1,
  };
}
// Chiều cao các dòng số tính theo cỡ chữ: các dòng cỡ thường + dòng giải 8 + dòng đặc biệt (kể cả phần kéo cao)
const rowsPt = n => (ROWS - 2) * n.fs + n.f8 + n.fdb * n.dbsy;
// Mọi phiếu cao bằng phiếu 2 đài: phiếu nhiều đài số phải nhỏ cho vừa bề ngang thì giãn khoảng cách các dòng ra
const ROWS_PT = rowsPt(numberFonts(2)) * LH;

function slipFonts(cols, codeLen, nameLen, footer) {
  const { colW, dbsy, ...n } = numberFonts(cols);
  return {
    lh: ROWS_PT / rowsPt({ ...n, dbsy }),
    dbsy,
    pt: {
      ...n,
      // Mã vé có chữ in hoa (rộng hơn chữ số) nên thu nhỏ riêng cho vừa cột, tối đa 0,88 cỡ các con số
      fcode: Math.min(n.fs * 0.88, colW / (PT * 0.7 * Math.max(codeLen, 1))),
      // Tên đài cao ~0,62 các con số; tên dài thì thu nhỏ cho vừa một dòng, nhỏ nhất 7pt (chật quá thì xuống dòng)
      fname: Math.max(7, Math.min(n.fs * 0.62, colW / (PT * 0.66 * nameLen))),
      // Dòng cuối dài khoảng 90% bề ngang phiếu, to nhất 13pt
      ffoot: footer ? Math.min(13, (SLIP_W * 0.9) / PT / textEm(footer)) : 8,
    },
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
  const style = { '--lh': f.lh.toFixed(3), '--dbsy': f.dbsy.toFixed(3) };
  for (const [k, v] of Object.entries(f.pt)) style[`--${k}`] = `${v.toFixed(1)}pt`;
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
                <Num v={p.prizes[g]?.[r]} len={len} active={cur[i] === `${g}:${r}`} className={g === 'ĐB' ? 'dbn' : ''} />
              </td>
            ))}
          </tr>
        )))}
        {footer && <tr><td className="ft" colSpan={provinces.length + 1}>{footer}</td></tr>}
      </tbody>
    </table>
  );

  // In 1 đài thì cột số rất rộng, canh giữa cho cân; từ 2 đài thì canh phải như phiếu mẫu. tall-db: số đặc biệt được kéo cao.
  const cls = ['slip', provinces.length === 1 && 'one', f.dbsy > 1 && 'tall-db'].filter(Boolean).join(' ');
  return Array.from({ length: 6 }, (_, i) => <div key={i} className={cls} style={style}>{slip}</div>);
}
