import { useEffect, useState } from 'react';
import { THU } from '../lib/constants.js';
import { todayISO, vnParts, weekday } from '../lib/time.js';

const now = () => {
  const p = vnParts();
  return { day: `${THU[weekday(todayISO())]}, ${p.day}/${p.month}/${p.year}`, time: `${p.hour}:${p.minute}:${p.second}` };
};

// Ngày và giờ Việt Nam dưới tên đại lý, vd "Miền Nam · Thứ Năm, 05/11/2026" và "🕒 08:36:45".
// Hai phần không bao giờ bị cắt giữa chừng: chật thì giờ xuống dòng riêng.
export default function Clock({ prefix }) {
  const [t, setT] = useState(now);
  useEffect(() => {
    const id = setInterval(() => setT(now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="clock">
      <span>{prefix ? `${prefix} · ${t.day}` : t.day}</span>
      <span className="clock-time">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" /><path d="M12 7v5l3 2" />
        </svg>
        {t.time}
      </span>
    </div>
  );
}
