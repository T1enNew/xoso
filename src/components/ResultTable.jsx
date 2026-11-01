import { NAME, ORDER, PRIZE, SPEC, THU } from '../lib/constants.js';
import { formatPhones } from '../lib/phone.js';
import { weekday } from '../lib/time.js';
import { Num } from './Spin.jsx';

// Cỡ chữ (pt) để cả bảng vừa khít một tờ A4
const PT = 0.3528; // 1pt = 0.3528mm
const LABEL_COL = 30; // bề ngang (mm) cột giải
function tableFonts(mien, nProv) {
  const lines = ORDER[mien].reduce((s, g) => s + SPEC[mien][g][0], 0); // số dòng số (miền Nam: 18)
  const H = 296 - 24 - 24 - 18 - 12;        // trừ lề trên dưới, tiêu đề, hàng tên đài + mã vé, dòng cuối
  const colW = (210 - 24 - LABEL_COL) / nProv - 3;
  const fit = (mm, digits) => mm / (PT * 0.6 * digits);
  const fs = Math.min(H / PT / 1.2 / (lines + 1.5), fit(colW, 5), 30);
  const f8 = Math.min(fs * 1.35, fit(colW, 2));
  const fdb = Math.min(fs * 1.2, fit(colW, SPEC[mien]['ĐB'][1]));
  return { '--fs': `${fs.toFixed(1)}pt`, '--f8': `${f8.toFixed(1)}pt`, '--fdb': `${fdb.toFixed(1)}pt` };
}

// Một bảng kết quả vừa một tờ A4. Đài và thứ tự đài giống phiếu, mã vé in dưới tên đài.
export default function ResultTable({ data, provinces: all, skip, footer, getCode }) {
  const m = data.mien;
  const provinces = all.filter(p => !p.name || !skip.includes(p.name));
  if (!provinces.length) return <p className="empty">Chưa chọn đài nào để in.</p>;
  const codes = provinces.map(p => (p.name ? getCode(p.name).trim().toUpperCase() : ''));
  const hasCode = codes.some(Boolean);
  const [y, mo, d] = data.date.split('-');
  const note = data.result?.complete ? '' : data.result ? ' · đang xổ' : ' · chưa xổ';
  const foot = formatPhones(footer.trim());
  return (
    <div className="bang" style={tableFonts(m, provinces.length)}>
      <header className="bang-head">
        <h2>Kết quả xổ số kiến thiết {NAME[m]}</h2>
        <div className="sub">{THU[weekday(data.date)]}, ngày {d}/{mo}/{y}{note}</div>
      </header>
      <table>
        <colgroup>
          <col style={{ width: `${LABEL_COL}mm` }} />
          {provinces.map((_, i) => <col key={i} />)}
        </colgroup>
        {provinces[0].name && (
          <thead>
            <tr>
              <th>Giải</th>
              {provinces.map((p, i) => (
                <th key={p.name}>
                  {p.name}
                  {/* Đài nào chưa có mã vẫn chừa dòng mã để tên các đài thẳng hàng */}
                  {hasCode && <div className="code">{codes[i] || ' '}</div>}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {ORDER[m].map(g => {
            const [count, len] = SPEC[m][g];
            return (
              <tr key={g} className={g === 'ĐB' ? 'db' : g === '8' ? 'g8' : undefined}>
                <td className="g"><b>{g === 'ĐB' ? 'Đặc biệt' : 'Giải ' + g}</b><small>{PRIZE[m][g]}</small></td>
                {provinces.map((p, pi) => (
                  <td key={pi}>
                    {Array.from({ length: count }, (_, i) => (
                      <Num key={i} v={(p.prizes[g] || [])[i]} len={len} className="n" />
                    ))}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      {foot && <div className="bang-foot">{foot}</div>}
    </div>
  );
}
