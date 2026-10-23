import { NAME, ORDER, SPEC, THU } from '../lib/constants.js';
import { fmtDate, vnNow, weekday } from '../lib/time.js';
import { Num } from './Spin.jsx';

// Bảng kết quả (A4 hoặc bill 80mm)
export default function ResultTable({ data, provinces }) {
  const m = data.mien;
  const sub = data.result
    ? data.result.title.replace(/^KẾT QUẢ XỔ SỐ\s+/i, '')
    : `${THU[weekday(data.date)]}, ngày ${fmtDate(data.date)} · đang chờ xổ`;
  return (
    <div className="bang">
      <h2>Kết quả xổ số {NAME[m]}</h2>
      <div className="sub">{sub}</div>
      <table>
        <tbody>
          {provinces[0].name && (
            <tr><th>Giải</th>{provinces.map(p => <th key={p.name}>{p.name}</th>)}</tr>
          )}
          {ORDER[m].map(g => {
            const [count, len] = SPEC[m][g];
            return (
              <tr key={g} className={g === 'ĐB' ? 'db' : g === '8' ? 'g8' : undefined}>
                <td className="g">{g === 'ĐB' ? 'ĐB' : 'G' + g}</td>
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
      <div className="foot">Nguồn: xskt.com.vn · In lúc {vnNow()}</div>
    </div>
  );
}
