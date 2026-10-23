import { LABEL, NAME, ORDER, SPEC, THU_NGAN } from '../lib/constants.js';
import { weekday } from '../lib/time.js';
import { Num } from './Spin.jsx';

// Cỡ chữ (pt) cho phiếu sao cho vừa khung 1/6 tờ A4
const PT = 0.3528; // 1pt = 0.3528mm
const LABEL_COL = 10.5; // bề ngang (mm) cột trái: ngày ở dòng tiêu đề, tiền thưởng ở các dòng dưới
function slipFonts(mien, rows, cols, codeLen, nameLen, per) {
  const H = 296 / 2 - 4 - 4 - 22;      // chiều cao còn cho các dòng số: trừ lề, tiêu đề, dòng cuối
  const W = 202 / 3 - 4 - LABEL_COL;   // bề ngang cho các cột số: trừ lề phiếu và cột trái
  const colW = W / cols - 1.5;
  const fit = (mm, digits) => mm / (PT * 0.58 * digits); // chữ số Arial rộng ~0,56 cỡ chữ
  const fs = Math.min(H / PT / 1.15 / (rows + 1), fit(colW, 5), 17);
  return {
    fs,
    f8: Math.min(fs * 1.6, fit(colW, 3)),
    fdb: Math.min(fs * 1.3, fit(colW, SPEC[mien]['ĐB'][1])),
    // Mã vé có chữ in hoa (rộng hơn chữ số) nên thu nhỏ riêng cho vừa cột, tối đa bằng cỡ các con số
    fcode: Math.min(fs, colW / (PT * 0.7 * Math.max(codeLen, 1))),
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
  const style = {
    '--fs': `${f.fs.toFixed(1)}pt`, '--f8': `${f.f8.toFixed(1)}pt`, '--fdb': `${f.fdb.toFixed(1)}pt`,
    '--fcode': `${f.fcode.toFixed(1)}pt`, '--fname': `${f.fname.toFixed(1)}pt`,
  };
  const [y, mo, d] = data.date.split('-');
  const foot = footer.trim();

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
          <tr key={g + r} className={[g === 'ĐB' ? 'db' : g === '8' ? 'g8' : '', r === 0 ? 'top' : ''].join(' ').trim() || undefined}>
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

  return Array.from({ length: 6 }, (_, i) => <div key={i} className="slip" style={style}>{slip}</div>);
}
