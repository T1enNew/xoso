import { PRIZES, THU } from '../lib/constants.js';
import { weekday } from '../lib/time.js';
import { Num, nextSlot } from './Spin.jsx';

// Cỡ chữ (pt) để cả bảng vừa khít một tờ A4
const PT = 0.3528; // 1pt = 0.3528mm
const LABEL_COL = 30; // bề ngang (mm) cột giải
const LINES = PRIZES.reduce((n, p) => n + p.count, 0);
const DB_LEN = PRIZES.at(-1).len;

function tableFonts(cols) {
  const H = 296 - 24 - 24 - 18 - 12; // trừ lề trên dưới, tiêu đề, hàng tên đài + mã vé, dòng cuối
  const colW = (210 - 24 - LABEL_COL) / cols - 3;
  const fit = (mm, digits) => mm / (PT * 0.6 * digits);
  const fs = Math.min(H / PT / 1.2 / (LINES + 1.5), fit(colW, 5), 30);
  return {
    '--fs': `${fs.toFixed(1)}pt`,
    '--f8': `${Math.min(fs * 1.35, fit(colW, 2)).toFixed(1)}pt`,
    '--fdb': `${Math.min(fs * 1.2, fit(colW, DB_LEN)).toFixed(1)}pt`,
  };
}

// Một bảng kết quả vừa một tờ A4. Đài và thứ tự đài giống phiếu, mã vé in dưới tên đài.
export default function ResultTable({ date, result, provinces, footer, getCode, live }) {
  const codes = provinces.map(p => getCode(p.name).trim().toUpperCase());
  const hasCode = codes.some(Boolean);
  const cur = provinces.map(p => live && nextSlot(p.prizes)); // đang xổ: mỗi đài chỉ quay số đang tới lượt
  const [y, m, d] = date.split('-');
  const note = result?.complete ? '' : result ? ' · đang xổ' : ' · chưa xổ';
  return (
    <div className="bang" style={tableFonts(provinces.length)}>
      <header className="bang-head">
        <h2>Kết quả xổ số kiến thiết Miền Nam</h2>
        <div className="sub">{THU[weekday(date)]}, ngày {d}/{m}/{y}{note}</div>
      </header>
      <table>
        <colgroup>
          <col style={{ width: `${LABEL_COL}mm` }} />
          {provinces.map(p => <col key={p.name} />)}
        </colgroup>
        <thead>
          <tr>
            <th>Giải</th>
            {provinces.map((p, i) => (
              <th key={p.name}>
                {p.name}
                {/* Đài nào chưa có mã vẫn chừa dòng mã để tên các đài thẳng hàng */}
                {hasCode && <div className="code">{codes[i] || ' '}</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PRIZES.map(({ g, count, len, prize }) => (
            <tr key={g} className={{ 'ĐB': 'db', '8': 'g8' }[g]}>
              <td className="g"><b>{g === 'ĐB' ? 'Đặc biệt' : 'Giải ' + g}</b><small>{prize}</small></td>
              {provinces.map((p, pi) => (
                <td key={p.name}>
                  {Array.from({ length: count }, (_, i) => (
                    <Num key={i} v={p.prizes[g]?.[i]} len={len} active={cur[pi] === `${g}:${i}`} className="n" />
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {footer && <div className="bang-foot">{footer}</div>}
    </div>
  );
}
