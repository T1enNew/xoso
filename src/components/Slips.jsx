import { LABEL, NAME, ORDER, SPEC, THU_NGAN } from '../lib/constants.js';
import { formatPhones } from '../lib/phone.js';
import { weekday } from '../lib/time.js';
import { Num } from './Spin.jsx';

// Cỡ chữ (pt) cho phiếu: gọn như phiếu mẫu (không kéo dài hết nửa tờ A4), số to và sát dòng
const PT = 0.3528; // 1pt = 0.3528mm
const LABEL_COL = 9; // bề ngang (mm) cột trái: ngày ở dòng tiêu đề, tiền thưởng ở các dòng dưới
const SLIP_W = 202 / 3 - 4; // bề ngang (mm) bên trong một phiếu
// Đo theo phiếu mẫu: phiếu cao ~2,07 lần bề ngang, các dòng số sát nhau (~0,85 cỡ chữ)
const SLIP_H = 130; // chiều cao (mm) một phiếu (nửa tờ A4 là 144mm)
const LH = 0.85; // khoảng cách các dòng số so với cỡ chữ

// Đo bề ngang thật của dòng chữ (tính theo cỡ chữ) bằng canvas, để dòng cuối dài vừa khít phiếu như tờ mẫu
let measureCtx;
function textEm(text) {
  measureCtx ||= document.createElement('canvas').getContext('2d');
  measureCtx.font = 'bold 100px Arial, Helvetica, sans-serif';
  return measureCtx.measureText(text).width / 100;
}
function slipFonts(mien, rows, cols, codeLen, nameLen, per) {
  const H = SLIP_H - 4 - 18 - 5;       // chiều cao còn cho các dòng số: trừ lề, tiêu đề + dòng cuối, khoảng hở các nhóm giải
  const W = SLIP_W - LABEL_COL;        // bề ngang cho các cột số: trừ cột trái
  const colW = W / cols - 2;
  const fit = (mm, digits) => mm / (PT * 0.6 * digits); // chữ số Arial (đậm nhẹ) rộng ~0,58 cỡ chữ
  // rows + 0.9: dòng giải 8 và đặc biệt chữ to hơn nên chiếm thêm chỗ
  const fs = Math.min(H / PT / LH / (rows + 0.9), fit(colW, 5), 19);
  return {
    fs,
    f8: Math.min(fs * 1.5, fit(colW, 3)),
    // Đặc biệt: chừa ~4mm bề ngang quanh số để số cách xa khung (chữ số đậm rộng ~0,556 cỡ chữ)
    fdb: Math.min(fs * 1.3, (W / cols - 4) / (PT * 0.565 * SPEC[mien]['ĐB'][1])),
    // Mã vé có chữ in hoa (rộng hơn chữ số) nên thu nhỏ riêng cho vừa cột, tối đa 0,88 cỡ các con số
    fcode: Math.min(fs * 0.88, colW / (PT * 0.7 * Math.max(codeLen, 1))),
    // Tên đài cao cỡ 0,6 các con số như phiếu thật; tên dài thì thu nhỏ cho vừa một dòng, nhỏ nhất 7pt (chật quá thì xuống dòng)
    fname: Math.max(7, Math.min(fs * 0.62, (colW * per) / (PT * 0.66 * nameLen))),
  };
}

// 6 phiếu giống nhau trên 1 tờ A4, 3 trên 3 dưới
export default function Slips({ data, provinces, skip, footer, getCode }) {
  const m = data.mien;
  const per = m === 'mb' ? 2 : 1; // miền Bắc chỉ 1 đài nên xếp 2 số mỗi dòng
  const list = provinces.filter(p => !p.name || !skip.includes(p.name))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
  if (!list.length) return <p className="empty">Chưa chọn đài nào để in.</p>;

  const cols = list.length * per;
  const groups = ORDER[m].map(g => {
    const [count, len] = SPEC[m][g];
    return { g, count, len, n: Math.ceil(count / per) };
  });
  const codes = list.map(p => (p.name ? getCode(p.name).trim().toUpperCase() : ''));
  const hasCode = codes.some(Boolean);
  const nameLen = Math.max(...list.map(p => (p.name || NAME[m]).length));
  const f = slipFonts(m, groups.reduce((s, x) => s + x.n, 0), cols, Math.max(...codes.map(c => c.length)), nameLen, per);
  const foot = formatPhones(footer.trim());
  // Dòng cuối dài khoảng 90% bề ngang phiếu, to nhất 13pt
  const ffoot = foot ? Math.min(13, (SLIP_W * 0.9) / PT / textEm(foot)) : 8;
  const style = {
    '--fs': `${f.fs.toFixed(1)}pt`, '--f8': `${f.f8.toFixed(1)}pt`, '--fdb': `${f.fdb.toFixed(1)}pt`,
    '--fcode': `${f.fcode.toFixed(1)}pt`, '--fname': `${f.fname.toFixed(1)}pt`, '--ffoot': `${ffoot.toFixed(1)}pt`,
    '--lh': LH,
  };
  const [y, mo, d] = data.date.split('-');

  const slip = (
    <table>
      <colgroup>
        <col style={{ width: `${LABEL_COL}mm` }} />
        {Array.from({ length: cols }, (_, i) => <col key={i} />)}
      </colgroup>
      <tbody>
        <tr className="hd">
          <th className="lb">{THU_NGAN[weekday(data.date)]}<br />{d}/{mo}<br />{y}</th>
          {/* Đài nào chưa có mã vẫn chừa dòng mã để tên các đài thẳng hàng */}
          {list.map((p, i) => (
            <th key={i} colSpan={per}>
              <div className="pn">{p.name || NAME[m]}</div>
              {hasCode && <div className="code">{codes[i] || ' '}</div>}
            </th>
          ))}
        </tr>
        {groups.flatMap(({ g, count, len, n }) => Array.from({ length: n }, (_, r) => (
          <tr key={g + r} className={[g === 'ĐB' ? 'db' : g === '8' ? 'g8' : '', r === 0 ? 'top' : '', r === n - 1 ? 'end' : ''].join(' ').trim() || undefined}>
            {r === 0 && <td className="lb" rowSpan={n}>{LABEL[m][g]}</td>}
            {list.flatMap((p, pi) => Array.from({ length: per }, (_, s) => {
              const i = r * per + s;
              return (
                <td key={pi * per + s} className={s ? 'v sub' : 'v'}>
                  {i < count && <Num v={(p.prizes[g] || [])[i]} len={len} />}
                </td>
              );
            }))}
          </tr>
        )))}
        {foot && <tr><td className="ft" colSpan={cols + 1}>{foot}</td></tr>}
      </tbody>
    </table>
  );

  // In 1 đài thì cột số rất rộng, canh giữa cho cân; từ 2 đài thì canh phải như phiếu mẫu
  const cls = list.length === 1 ? 'slip one' : 'slip';
  return Array.from({ length: 6 }, (_, i) => <div key={i} className={cls} style={style}>{slip}</div>);
}
