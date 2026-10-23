import { useEffect, useRef, useState } from 'react';
import Clock from './components/Clock.jsx';
import DaiList from './components/DaiList.jsx';
import ResultTable from './components/ResultTable.jsx';
import Segmented from './components/Segmented.jsx';
import Slips from './components/Slips.jsx';
import { describe, fetchResults, provincesOf } from './lib/api.js';
import {
  DEFAULT_FOOTER, DRAW_END, DRAW_TIME, KHO_OPTIONS, MIEN_OPTIONS, NAME, THU, WATCH_FROM,
} from './lib/constants.js';
import { store, suggestCode, useStored } from './lib/storage.js';
import { addDays, fmtDate, todayISO, vnNow, weekday } from './lib/time.js';

const PAGE_CSS = {
  phieu: '@page { size: A4; margin: 0; }',
  k80: '@page { size: 80mm auto; margin: 2mm; }',
  a4: '',
};

export default function App() {
  const [mien, setMien] = useStored('mien', 'mn');
  const [kho, setKho] = useStored('kho', 'phieu');
  const [footer, setFooter] = useStored('footer', DEFAULT_FOOTER);
  const [skip, setSkip] = useStored('skip', [], { json: true });
  const [autoPrint, setAutoPrint] = useState(true);
  const [date, setDate] = useState(todayISO);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState({ text: 'Đang lấy…', kind: '' });
  const [watching, setWatching] = useState(false);
  const [reload, setReload] = useState(0);
  const [codes, setCodes] = useState({});
  const dataRef = useRef(null);      // dữ liệu mới nhất, cho vòng chờ đọc mà không phải chạy lại
  const fetchedAt = useRef(0);
  const printedKey = useRef(null);
  const autoPrintRef = useRef(autoPrint);
  useEffect(() => { autoPrintRef.current = autoPrint; }, [autoPrint]);

  const receive = d => {
    dataRef.current = d;
    fetchedAt.current = Date.now();
    setData(d);
  };

  // Lấy kết quả mỗi khi đổi miền, đổi ngày hoặc bấm "Làm mới"
  useEffect(() => {
    let ignore = false;
    setStatus({ text: 'Đang lấy…', kind: '' });
    fetchResults(mien, date)
      .then(d => {
        if (ignore) return;
        receive(d);
        setStatus(describe(d));
        // Đang trong giờ xổ của hôm nay thì tự dò tiếp như trang gốc
        const now = vnNow();
        if (d.isToday && !d.result?.complete && now >= WATCH_FROM[mien] && now <= DRAW_END[mien]) setWatching(true);
      })
      .catch(e => { if (!ignore) setStatus({ text: 'Lỗi: ' + e.message, kind: 'err' }); });
    return () => { ignore = true; };
  }, [mien, date, reload]);

  // Chờ giờ xổ: dò liên tục tới khi đủ kết quả rồi tự in
  useEffect(() => {
    if (!watching) return;
    let cancelled = false;
    let timer;
    const tick = async () => {
      const now = vnNow();
      const today = todayISO();
      if (date !== today) { setDate(today); return; } // qua ngày mới: chạy lại với ngày hôm nay
      const early = now < WATCH_FROM[mien];
      const wait = early ? 60 : now <= DRAW_END[mien] ? 10 : 60;
      const cur = dataRef.current;
      const have = cur && cur.mien === mien && cur.date === today;
      try {
        // Chưa tới giờ mà đã có bảng chờ của hôm nay, hoặc vừa lấy xong, thì khỏi gọi nguồn
        const d = have && (early || Date.now() - fetchedAt.current < 5000) ? cur : await fetchResults(mien, today);
        if (cancelled) return;
        if (d !== cur) receive(d);
        if (d.result?.complete) {
          setWatching(false);
          setStatus({ text: `Đã có đủ kết quả ngày ${fmtDate(d.date)}.`, kind: 'done' });
          const key = mien + d.date;
          if (autoPrintRef.current && printedKey.current !== key) {
            printedKey.current = key;
            setTimeout(() => window.print(), 500);
          }
          return;
        }
        const stale = d.stale ? ' Nguồn đang chậm hoặc tạm chặn, có thể chưa phải số mới nhất.' : '';
        if (early) setStatus({ text: `Đang chờ giờ xổ ${NAME[mien]} (${DRAW_TIME[mien]}). Bây giờ ${now}.`, kind: 'wait' });
        else if (d.result) setStatus({ text: `Đang xổ trực tiếp · cập nhật mỗi ${wait} giây.` + stale, kind: 'live' });
        else setStatus({ text: `${now}: nguồn chưa có số hôm nay, thử lại sau ${wait} giây…` + stale, kind: 'wait' });
      } catch (e) {
        if (cancelled) return;
        setStatus({ text: `${now}: lỗi (${e.message}), thử lại sau ${wait} giây…`, kind: 'err' });
      }
      timer = setTimeout(tick, wait * 1000);
    };
    tick();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [watching, mien, date]);

  // Lớp trên body để CSS in biết đang in kiểu nào
  useEffect(() => {
    document.body.classList.toggle('phieu', kho === 'phieu');
    document.body.classList.toggle('k80', kho === 'k80');
  }, [kho]);

  const today = todayISO();
  const changeDate = iso => {
    setWatching(false);
    setDate(iso > today ? today : iso);
  };
  const changeMien = v => {
    setWatching(false);
    setMien(v);
  };
  const toggleWatch = () => {
    if (watching) {
      setWatching(false);
      setStatus({ text: 'Đã dừng chờ.', kind: '' });
    } else {
      setDate(todayISO());
      setWatching(true);
    }
  };

  const codeDate = data?.date || date;
  const getCode = name => codes[`${codeDate}.${name}`] ?? suggestCode(codeDate, name);
  const setCode = (name, v) => {
    store.set(`code.${codeDate}.${name}`, v.trim());
    setCodes(c => ({ ...c, [`${codeDate}.${name}`]: v }));
  };
  const toggleDai = (name, on) => setSkip(s => on ? s.filter(n => n !== name) : [...s.filter(n => n !== name), name]);

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
            <h1>In kết quả xổ số</h1>
            <Clock />
          </div>
        </header>

        <section>
          <p className="lbl">Miền</p>
          <Segmented name="mien" options={MIEN_OPTIONS} value={mien} onChange={changeMien} />
        </section>

        <section>
          <p className="lbl">Ngày xổ</p>
          <div className="daterow">
            <button className="icon" title="Ngày trước" onClick={() => changeDate(addDays(date, -1))}>‹</button>
            <input type="date" className="field" value={date} max={today}
              onChange={e => e.target.value && changeDate(e.target.value)} />
            <button className="icon" title="Ngày sau" disabled={date >= today} onClick={() => changeDate(addDays(date, 1))}>›</button>
            <button className="ghost" onClick={() => changeDate(today)}>Hôm nay</button>
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
              onChange={e => setFooter(e.target.value)} />
          </section>
        )}

        <section className="actions">
          <label className="check">
            <input type="checkbox" checked={autoPrint} onChange={e => setAutoPrint(e.target.checked)} />
            Tự in khi có đủ kết quả
          </label>
          <button className={watching ? 'btn primary on' : 'btn primary'} onClick={toggleWatch}>
            {watching ? 'Dừng chờ' : 'Chờ giờ xổ'}
          </button>
          <div className="row2">
            <button className="btn" onClick={() => setReload(x => x + 1)}>Làm mới</button>
            <button className="btn" onClick={() => window.print()}>In ngay</button>
          </div>
          <div className={`status ${status.kind}`}><span className="dot" /><span>{status.text}</span></div>
        </section>
      </aside>

      <main className="stage"><div className="sheet">{sheet}</div></main>
      <style>{PAGE_CSS[kho] || ''}</style>
    </div>
  );
}
