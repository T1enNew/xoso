import { useEffect, useState } from 'react';
import { THU } from '../lib/constants.js';
import { todayISO, vnParts, weekday } from '../lib/time.js';

const label = () => {
  const p = vnParts();
  return `${p.hour}:${p.minute}:${p.second} · ${THU[weekday(todayISO())]}, ${p.day}/${p.month}/${p.year}`;
};

// Đồng hồ giờ Việt Nam, prefix đứng trước (vd "Miền Nam · 20:21:48 · Thứ Sáu, 23/10/2026")
export default function Clock({ prefix }) {
  const [text, setText] = useState(label);
  useEffect(() => {
    const id = setInterval(() => setText(label()), 1000);
    return () => clearInterval(id);
  }, []);
  return <div className="clock">{prefix ? `${prefix} · ${text}` : text}</div>;
}
