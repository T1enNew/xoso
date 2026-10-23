import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Clock from './components/Clock.jsx';
import DaiList from './components/DaiList.jsx';
import ResultTable from './components/ResultTable.jsx';
import Segmented from './components/Segmented.jsx';
import Slips from './components/Slips.jsx';
import { describe, fetchResults, provincesOf } from './lib/api.js';
import { formatPhones } from './lib/phone.js';
import {
  DEFAULT_FOOTER, DRAW_END, DRAW_TIME, KHO_OPTIONS, NAME, THU, WATCH_FROM,
} from './lib/constants.js';
import { store, suggestCode, useStored } from './lib/storage.js';
import { addDays, fmtDate, todayISO, vnNow, weekday } from './lib/time.js';

const PAGE_CSS = {
  phieu: '@page { size: A4; margin: 0; }',
  k80: '@page { size: 80mm auto; margin: 2mm; }',
  a4: '',
};
const MAX_COPIES = 100;
const QUICK_COPIES = [5, 10, 20, 50];

export default function App() {
  const mien = 'mn'; // chỉ in Miền Nam
  const [kho, setKho] = useStored('kho', 'phieu');
  const [footer, setFooter] = useStored('footer', DEFAULT_FOOTER);
  const [skip, setSkip] = useStored('skip', [], { json: true });
  const [copies, setCopies] = useStored('copies', '1');
  const [date, setDate] = useState(todayISO);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState({ text: 'Đang lấy…', kind: '' });
  const [reload, setReload] = useState(0);
  const [codes, setCodes] = useState({});
  const [printing, setPrinting] = useState(false);
  const dataRef = useRef(null); // dữ liệu mới nhất, cho vòng tự cập nhật đọc mà không phải chạy lại

  const receive = d => {
    dataRef.current = d;
    setData(d);
  };

  // Lấy kết quả mỗi khi đổi ngày hoặc bấm "Làm mới"
  useEffect(() => {
    let ignore = false;
    setStatus({ text: 'Đang lấy…', kind: '' });
    fetchResults(mien, date)
      .then(d => {
        if (ignore) return;
        receive(d);
        setStatus(describe(d));
      })
      .catch(e => { if (!ignore) setStatus({ text: 'Lỗi: ' + e.message, kind: 'err' }); });
    return () => { ignore = true; };
  }, [mien, date, reload]);

  const today = todayISO();
  const complete = !!(data && data.date === date && data.result?.complete);
  // Đang xem hôm nay mà chưa đủ kết quả thì tự theo dõi: chưa tới giờ thì chờ, tới giờ thì dò liên tục
  const follow = date === today && !complete;

  useEffect(() => {
    if (!follow) return;
    let cancelled = false;
    let timer;
    const waitFor = now => (now < WATCH_FROM[mien] ? 60 : now <= DRAW_END[mien] ? 10 : 60);
    const tick = async () => {
      const now = vnNow();
      const day = todayISO();
      if (date !== day) { setDate(day); return; } // qua ngày mới: chuyển sang ngày hôm nay
      const early = now < WATCH_FROM[mien];
      const wait = waitFor(now);
      const cur = dataRef.current;
      if (early && cur && cur.date === day) {
        // Chưa tới giờ mà đã có bảng chờ của hôm nay thì khỏi gọi nguồn
        setStatus({ text: `Chưa xổ. Trang tự cập nhật khi tới giờ xổ (${DRAW_TIME[mien]}).`, kind: 'wait' });
      } else {
        try {
          const d = await fetchResults(mien, day);
          if (cancelled) return;
          receive(d);
          const stale = d.stale ? ' Nguồn đang chậm hoặc tạm chặn, có thể chưa phải số mới nhất.' : '';
          if (d.result?.complete) { setStatus({ text: `Đã có đủ kết quả ngày ${fmtDate(d.date)}.` + stale, kind: 'done' }); return; }
          if (d.result) setStatus({ text: `Đang xổ trực tiếp · cập nhật mỗi ${wait} giây.` + stale, kind: 'live' });
          else setStatus({ text: `${now}: nguồn chưa có số hôm nay, thử lại sau ${wait} giây…` + stale, kind: 'wait' });
        } catch (e) {
          if (cancelled) return;
          setStatus({ text: `${now}: lỗi (${e.message}), thử lại sau ${wait} giây…`, kind: 'err' });
        }
      }
      timer = setTimeout(tick, wait * 1000);
    };
    // Lần lấy đầu do phần ở trên lo, vòng này bắt đầu từ lượt sau
    timer = setTimeout(tick, waitFor(vnNow()) * 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [follow, mien, date]);

  // Lớp trên body để CSS in biết đang in kiểu nào
  useEffect(() => {
    document.body.classList.toggle('phieu', kho === 'phieu');
    document.body.classList.toggle('k80', kho === 'k80');
  }, [kho]);

  // Khi in (bấm nút hay Ctrl+P) mới vẽ thêm các tờ còn lại, để màn hình bình thường vẫn nhẹ
  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  const changeDate = iso => setDate(iso > today ? today : iso);
  const n = Math.min(MAX_COPIES, Math.max(1, parseInt(copies, 10) || 1));

  const codeDate = data?.date || date;
  const getCode = name => codes[`${codeDate}.${name}`] ?? suggestCode(codeDate, name);
  const setCode = (name, v) => {
    store.set(`code.${codeDate}.${name}`, v.trim());
    setCodes(c => ({ ...c, [`${codeDate}.${name}`]: v }));
  };
  const toggleDai = (name, on) => setSkip(s => on ? s.filter(x => x !== name) : [...s.filter(x => x !== name), name]);

  const provinces = data ? provincesOf(data) : null;

  let sheet;
  if (!data) sheet = <p className="empty">{status.kind === 'err' ? status.text : 'Đang tải…'}</p>;
  else if (!provinces) sheet = <p className="empty">Ngày {fmtDate(data.date)} ({THU[weekday(data.date)]}) không có kỳ quay {NAME[data.mien]}.</p>;
  else if (kho === 'phieu') sheet = <Slips data={data} provinces={provinces} skip={skip} footer={footer} getCode={getCode} />;
  else sheet = <ResultTable data={data} provinces={provinces} />;

  return (
    <div className="app">
      <aside className="panel">
        <header className="brand">
          <div className="logo">XS</div>
          <div>
            <h1>In kết quả xổ số {NAME[mien]}</h1>
            <Clock />
          </div>
        </header>

        <section>
          <div className="lbl-row">
            <p className="lbl">Ngày xổ · {THU[weekday(date)]}</p>
            {date !== today && <button className="link" onClick={() => changeDate(today)}>Về hôm nay</button>}
          </div>
          <div className="daterow">
            <button className="icon" title="Ngày trước" aria-label="Ngày trước" onClick={() => changeDate(addDays(date, -1))}>‹</button>
            <input type="date" className="field" value={date} max={today}
              onChange={e => e.target.value && changeDate(e.target.value)} />
            <button className="icon" title="Ngày sau" aria-label="Ngày sau" disabled={date >= today}
              onClick={() => changeDate(addDays(date, 1))}>›</button>
          </div>
        </section>

        <section>
          <p className="lbl">Kiểu in</p>
          <Segmented name="kho" options={KHO_OPTIONS} value={kho} onChange={setKho} />
        </section>

        {kho === 'phieu' && (
          <section>
            <p className="lbl">Đài in &amp; mã vé</p>
            <DaiList provinces={provinces || []} skip={skip} onToggle={toggleDai} getCode={getCode} onCode={setCode} />
            <p className="lbl">Dòng cuối phiếu</p>
            <input className="field" placeholder="Tên đại lý : số điện thoại" value={footer}
              onChange={e => setFooter(e.target.value)} onBlur={() => setFooter(formatPhones)} />
          </section>
        )}

        <section className="actions">
          <div className="lbl-row">
            <p className="lbl">Số tờ in</p>
            <span className="hint">{kho === 'phieu' ? `${n} tờ A4 = ${n * 6} phiếu` : `${n} tờ`}</span>
          </div>
          <div className="copies">
            <div className="stepper">
              <button aria-label="Bớt 1 tờ" disabled={n <= 1} onClick={() => setCopies(String(n - 1))}>−</button>
              <input inputMode="numeric" aria-label="Số tờ in" value={copies}
                onChange={e => setCopies(e.target.value.replace(/\D/g, '').slice(0, 3))}
                onBlur={() => setCopies(String(n))} />
              <button aria-label="Thêm 1 tờ" disabled={n >= MAX_COPIES} onClick={() => setCopies(String(n + 1))}>+</button>
            </div>
            <div className="chips">
              {QUICK_COPIES.map(q => (
                <button key={q} className={q === n ? 'chip on' : 'chip'} onClick={() => setCopies(String(q))}>{q}</button>
              ))}
            </div>
          </div>
          <button className="btn primary" onClick={() => window.print()}>In {n} tờ</button>
          <button className="btn" onClick={() => setReload(x => x + 1)}>Làm mới kết quả</button>
          <div className={`status ${status.kind}`}><span className="dot" /><span>{status.text}</span></div>
        </section>
      </aside>

      <main className="stage">
        <div className="sheet">{sheet}</div>
        {printing && provinces && Array.from({ length: n - 1 }, (_, i) => <div key={i} className="sheet">{sheet}</div>)}
      </main>
      <style>{PAGE_CSS[kho] || ''}</style>
    </div>
  );
}
