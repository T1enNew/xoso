import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Clock from './components/Clock.jsx';
import DaiList from './components/DaiList.jsx';
import Help from './components/Help.jsx';
import ResultTable from './components/ResultTable.jsx';
import Segmented from './components/Segmented.jsx';
import Slips from './components/Slips.jsx';
import { describe, fetchResults, provincesOf, staleNote } from './lib/api.js';
import { DEFAULT_SHOP_NAME, DEFAULT_SHOP_PHONE, DRAW_END, DRAW_TIME, KHO_OPTIONS, THU, WATCH_FROM } from './lib/constants.js';
import { applyOrder, sortProvinces } from './lib/order.js';
import { formatPhone, phoneMaxLen } from './lib/phone.js';
import { store, suggestCode, useStored } from './lib/storage.js';
import { addDays, fmtDate, todayISO, vnNow, weekday } from './lib/time.js';

const MAX_COPIES = 100;
const QUICK_COPIES = [5, 10, 20, 50];
// Trong giờ xổ dò mỗi 10 giây, ngoài giờ mỗi phút
const pollSeconds = now => (now >= WATCH_FROM && now <= DRAW_END ? 10 : 60);

export default function App() {
  const [khoRaw, setKho] = useStored('kho', 'phieu');
  const kho = khoRaw === 'a4' ? 'a4' : 'phieu'; // máy còn lưu kiểu in đã bỏ thì về phiếu
  const [shopName, setShopName] = useStored('shopName', DEFAULT_SHOP_NAME);
  const [shopPhone, setShopPhone] = useStored('shopPhone', DEFAULT_SHOP_PHONE); // chỉ lưu chữ số
  const [skip, setSkip] = useStored('skip', [], { json: true });
  const [order, setOrder] = useStored('order', [], { json: true });
  const [copies, setCopies] = useStored('copies', '1');
  const [date, setDate] = useState(todayISO);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState({ text: 'Đang lấy…', kind: '' });
  const [reload, setReload] = useState(0);
  const [codes, setCodes] = useState({}); // mã vé vừa gõ (null: vừa xoá trống)
  const [printing, setPrinting] = useState(false);
  const dataRef = useRef(null); // dữ liệu mới nhất, cho vòng tự cập nhật đọc mà không phải chạy lại
  const stageRef = useRef(null);

  const receive = d => {
    dataRef.current = d;
    setData(d);
  };

  // Lấy kết quả mỗi khi đổi ngày hoặc bấm "Làm mới"
  useEffect(() => {
    let ignore = false;
    setStatus({ text: 'Đang lấy…', kind: '' });
    fetchResults(date)
      .then(d => {
        if (ignore) return;
        receive(d);
        setStatus(describe(d));
      })
      .catch(e => { if (!ignore) setStatus({ text: 'Lỗi: ' + e.message, kind: 'err' }); });
    return () => { ignore = true; };
  }, [date, reload]);

  const today = todayISO();
  // Đang xem hôm nay mà chưa đủ kết quả thì tự theo dõi: chưa tới giờ thì chờ, tới giờ thì dò liên tục
  const follow = date === today && !(data?.date === date && data.result?.complete);
  // Tới giờ xổ (hoặc nguồn đã có số) thì số đang tới lượt mới quay
  const live = follow && data?.date === today && (!!data.result || vnNow() >= DRAW_TIME);

  useEffect(() => {
    if (!follow) return;
    let cancelled = false;
    let timer;
    const tick = async () => {
      const day = todayISO();
      if (date !== day) return setDate(day); // qua ngày mới: chuyển sang ngày hôm nay
      const now = vnNow();
      const wait = pollSeconds(now);
      if (now < WATCH_FROM && dataRef.current?.date === day) {
        setStatus(describe(dataRef.current)); // chưa tới giờ mà đã có phiếu chờ của hôm nay thì khỏi gọi nguồn
      } else {
        try {
          const d = await fetchResults(day);
          if (cancelled) return;
          receive(d);
          if (d.result?.complete) return setStatus(describe(d));
          setStatus(d.result
            ? { text: `Đang xổ trực tiếp · cập nhật mỗi ${wait} giây.${staleNote(d)}`, kind: 'live' }
            : { text: `${now}: nguồn chưa có số hôm nay, thử lại sau ${wait} giây…${staleNote(d)}`, kind: 'wait' });
        } catch (e) {
          if (cancelled) return;
          setStatus({ text: `${now}: lỗi (${e.message}), thử lại sau ${wait} giây…`, kind: 'err' });
        }
      }
      timer = setTimeout(tick, wait * 1000);
    };
    // Lần lấy đầu do phần ở trên lo, vòng này bắt đầu từ lượt sau
    timer = setTimeout(tick, pollSeconds(vnNow()) * 1000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [follow, date]);

  // Lớp trên body để CSS biết đang in kiểu nào
  useEffect(() => {
    document.body.classList.toggle('phieu', kho === 'phieu');
    document.body.classList.toggle('a4', kho === 'a4');
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

  // Bản xem trước tự co giãn cho vừa bề ngang màn hình (điện thoại, iPad); lúc in vẫn đúng khổ.
  // Bề ngang bản xem trước lấy từ --sheet-w trong CSS: cả tờ A4, hoặc 1 phiếu trên điện thoại.
  useEffect(() => {
    const el = stageRef.current;
    const update = () => {
      const box = el.querySelector('.sheet-box');
      const cs = getComputedStyle(el);
      const avail = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const mm = parseFloat(getComputedStyle(box).getPropertyValue('--sheet-w')) || 210;
      // Cả tờ A4 thì chỉ thu nhỏ; 1 phiếu thì được phóng to tới 1,6 lần cho dễ đọc
      el.style.setProperty('--zoom', Math.min(mm < 200 ? 1.6 : 1, avail / ((mm / 25.4) * 96)).toFixed(3));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [kho]);

  const changeDate = iso => setDate(iso > today ? today : iso);
  const n = Math.min(MAX_COPIES, Math.max(1, parseInt(copies, 10) || 1));
  const copiesText = kho === 'phieu' ? `${n} tờ A4 = ${n * 6} vé dò` : `${n} tờ A4`;
  const print = () => window.print();

  // Ô số điện thoại: chỉ nhận chữ số, đủ số thì không cho gõ thêm, tự cách nhóm khi gõ
  const changePhone = raw => {
    let d = raw.replace(/\D/g, '');
    // Xoá trúng dấu cách (số không đổi mà chữ ngắn đi) thì xoá luôn chữ số đứng trước nó
    if (d === shopPhone && raw.length < formatPhone(shopPhone).length) d = d.slice(0, -1);
    setShopPhone(d.slice(0, phoneMaxLen(d)));
  };
  const phoneMissing = shopPhone ? phoneMaxLen(shopPhone) - shopPhone.length : 0;
  const footer = [shopName.trim(), formatPhone(shopPhone)].filter(Boolean).join(' : ');

  // Ký hiệu vé: chữ người dùng tự gõ > tự lấy từ Minh Ngọc (data.codes) > đoán theo tuần trước
  const codeDate = data?.date || date;
  const autoCodes = data?.codes || {};
  const getCode = name => {
    const key = `${codeDate}.${name}`;
    if (key in codes) return codes[key] ?? autoCodes[name] ?? '';
    return store.get(`code.${key}`) ?? autoCodes[name] ?? suggestCode(codeDate, name);
  };
  const setCode = (name, v) => {
    const key = `${codeDate}.${name}`;
    const text = v.trim();
    // Xoá trống ô thì quay về ký hiệu tự lấy
    if (text) store.set(`code.${key}`, text); else store.del(`code.${key}`);
    setCodes(c => ({ ...c, [key]: text ? v : null }));
  };
  const toggleDai = (name, on) => setSkip(s => {
    const rest = s.filter(x => x !== name);
    return on ? rest : [...rest, name];
  });

  // Các đài xếp theo thứ tự người dùng kéo thả, dùng chung cho danh sách bên trái, phiếu và bảng
  const provinces = data && provincesOf(data);
  const ordered = provinces ? sortProvinces(provinces, order) : [];
  const printed = ordered.filter(p => !skip.includes(p.name));

  let sheet;
  if (!data) sheet = <p className="empty">{status.kind === 'err' ? status.text : 'Đang tải…'}</p>;
  else if (!provinces) sheet = <p className="empty">Ngày {fmtDate(data.date)} ({THU[weekday(data.date)]}) không có kỳ quay Miền Nam.</p>;
  else if (!printed.length) sheet = <p className="empty">Chưa chọn đài nào để in.</p>;
  else {
    const Sheet = kho === 'phieu' ? Slips : ResultTable;
    sheet = <Sheet date={data.date} result={data.result} provinces={printed} footer={footer} getCode={getCode} live={live} />;
  }

  return (
    <div className="app">
      <aside className="panel">
        <header className="brand">
          <div className="logo" aria-hidden="true">TT</div>
          <div>
            <h1>Xổ Số Trường Thịnh</h1>
            <Clock prefix="Miền Nam" />
          </div>
          <Help />
        </header>

        <section className="sec-date">
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

        <section className="sec-kho">
          <p className="lbl">Kiểu in</p>
          <Segmented name="kho" options={KHO_OPTIONS} value={kho} onChange={setKho} />
        </section>

        <section className="sec-dai">
          <p className="lbl">Đài in &amp; mã vé</p>
          <DaiList provinces={ordered} skip={skip} onToggle={toggleDai} getCode={getCode} onCode={setCode}
            onReorder={next => setOrder(o => applyOrder(o, next))} />
        </section>

        <section className="sec-foot">
          <p className="lbl">Dòng cuối</p>
          <div className="shop">
            <input className="field" aria-label="Tên đại lý" placeholder="Tên đại lý" value={shopName}
              onChange={e => setShopName(e.target.value)} />
            <input className="field phone" type="tel" inputMode="numeric" autoComplete="tel" aria-label="Số điện thoại"
              placeholder="0918 643 803" value={formatPhone(shopPhone)} onChange={e => changePhone(e.target.value)} />
          </div>
          {phoneMissing > 0 && <p className="field-hint">Số điện thoại còn thiếu {phoneMissing} số</p>}
        </section>

        <section className="actions">
          <div className="lbl-row">
            <p className="lbl">Số tờ in</p>
            <span className="hint">{copiesText}</span>
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
          <button className="btn primary" onClick={print}>In {n} tờ</button>
          <button className="btn" onClick={() => setReload(x => x + 1)}>Làm mới kết quả</button>
        </section>

        <div className={`status ${status.kind}`}><span className="dot" /><span>{status.text}</span></div>
      </aside>

      <main className="stage" ref={stageRef}>
        <p className="preview-note">Xem trước 1 vé dò · khi in: 6 vé / tờ A4</p>
        <div className="sheet-box"><div className="sheet">{sheet}</div></div>
        {printing && printed.length > 0 && Array.from({ length: n - 1 }, (_, i) => <div key={i} className="sheet">{sheet}</div>)}
      </main>

      {/* Điện thoại, iPad dựng: nút in luôn nằm ở đáy màn hình */}
      <div className="mobile-bar">
        <span className="hint">{copiesText}</span>
        <button className="btn primary" onClick={print}>In {n} tờ</button>
      </div>
    </div>
  );
}
