import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import Clock from './components/Clock.jsx';
import DaiList from './components/DaiList.jsx';
import ResultTable from './components/ResultTable.jsx';
import Segmented from './components/Segmented.jsx';
import Slips from './components/Slips.jsx';
import { describe, fetchResults, provincesOf } from './lib/api.js';
import { isAlphabetical, moveProvince, sortProvinces } from './lib/order.js';
import { formatPhone, phoneMaxLen } from './lib/phone.js';
import {
  DEFAULT_SHOP_NAME, DEFAULT_SHOP_PHONE, DRAW_END, DRAW_TIME, KHO_OPTIONS, NAME, THU, WATCH_FROM,
} from './lib/constants.js';
import { store, suggestCode, useStored } from './lib/storage.js';
import { addDays, fmtDate, todayISO, vnNow, weekday } from './lib/time.js';

const MAX_COPIES = 100;

// Máy đã lưu dòng cuối kiểu cũ (một ô "TÊN : số") thì tách ra tên và số, khỏi phải gõ lại
const SAVED_SHOP = (() => {
  const old = store.get('footer');
  if (old == null) return { name: DEFAULT_SHOP_NAME, phone: DEFAULT_SHOP_PHONE };
  const i = old.lastIndexOf(':');
  if (i < 0) return { name: old.trim(), phone: '' };
  const phone = old.slice(i + 1).replace(/\D/g, '');
  return { name: old.slice(0, i).trim(), phone: phone.slice(0, phoneMaxLen(phone)) };
})();
const QUICK_COPIES = [5, 10, 20, 50];

export default function App() {
  const mien = 'mn'; // chỉ in Miền Nam
  const [khoRaw, setKho] = useStored('kho', 'phieu');
  const kho = KHO_OPTIONS.some(o => o.value === khoRaw) ? khoRaw : 'phieu'; // máy còn lưu kiểu đã bỏ (bill) thì về phiếu
  const [shopName, setShopName] = useStored('shopName', SAVED_SHOP.name);
  const [shopPhone, setShopPhone] = useStored('shopPhone', SAVED_SHOP.phone); // chỉ lưu chữ số
  const footer = [shopName.trim(), formatPhone(shopPhone)].filter(Boolean).join(' : ');
  const [skip, setSkip] = useStored('skip', [], { json: true });
  const [order, setOrder] = useStored('order', [], { json: true });
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
  const stageRef = useRef(null);
  useEffect(() => {
    const el = stageRef.current;
    const update = () => {
      const box = el.querySelector('.sheet-box');
      if (!box) return;
      const cs = getComputedStyle(el);
      const avail = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const mm = parseFloat(getComputedStyle(box).getPropertyValue('--sheet-w')) || 210;
      const px = (mm / 25.4) * 96;
      // Cả tờ A4 thì chỉ thu nhỏ; 1 phiếu thì được phóng to tới 1,6 lần cho dễ đọc
      el.style.setProperty('--zoom', Math.min(mm < 200 ? 1.6 : 1, avail / px).toFixed(3));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [kho]);

  const changeDate = iso => setDate(iso > today ? today : iso);
  const n = Math.min(MAX_COPIES, Math.max(1, parseInt(copies, 10) || 1));
  const copiesText = kho === 'phieu' ? `${n} tờ A4 = ${n * 6} phiếu` : `${n} tờ A4`;
  const print = () => window.print();

  // Ô số điện thoại: chỉ nhận chữ số, đủ số thì không cho gõ thêm, tự cách nhóm khi gõ
  const changePhone = raw => {
    let d = raw.replace(/\D/g, '');
    // Xoá trúng dấu cách (số không đổi mà chữ ngắn đi) thì xoá luôn chữ số đứng trước nó
    if (d === shopPhone && raw.length < formatPhone(shopPhone).length) d = d.slice(0, -1);
    setShopPhone(d.slice(0, phoneMaxLen(d)));
  };
  const phoneMissing = shopPhone ? phoneMaxLen(shopPhone) - shopPhone.length : 0;

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
    // Xoá trống ô thì quay về ký hiệu tự lấy
    if (v.trim()) store.set(`code.${key}`, v.trim()); else store.del(`code.${key}`);
    setCodes(c => ({ ...c, [key]: v.trim() ? v : null }));
  };
  const toggleDai = (name, on) => setSkip(s => on ? s.filter(x => x !== name) : [...s.filter(x => x !== name), name]);

  // Các đài xếp theo thứ tự người dùng chọn (▲▼), dùng chung cho danh sách bên trái, phiếu và bảng
  const provinces = data ? provincesOf(data) : null;
  const ordered = provinces && sortProvinces(provinces, order);
  const names = (ordered || []).filter(p => p.name).map(p => p.name);
  const moveDai = (name, step) => setOrder(o => moveProvince(o, names, name, step));
  const resetOrder = () => setOrder(o => o.filter(n => !names.includes(n)));

  let sheet;
  if (!data) sheet = <p className="empty">{status.kind === 'err' ? status.text : 'Đang tải…'}</p>;
  else if (!provinces) sheet = <p className="empty">Ngày {fmtDate(data.date)} ({THU[weekday(data.date)]}) không có kỳ quay {NAME[data.mien]}.</p>;
  else if (kho === 'phieu') sheet = <Slips data={data} provinces={ordered} skip={skip} footer={footer} getCode={getCode} />;
  else sheet = <ResultTable data={data} provinces={ordered} skip={skip} footer={footer} getCode={getCode} />;

  return (
    <div className="app">
      <aside className="panel">
        <header className="brand">
          <div className="logo" aria-hidden="true">TT</div>
          <div>
            <h1>Xổ Số Trường Thịnh</h1>
            <Clock prefix={NAME[mien]} />
          </div>
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
          <div className="lbl-row">
            <p className="lbl">Đài in &amp; mã vé</p>
            {names.length > 1 && !isAlphabetical(names) && <button className="link" onClick={resetOrder}>Xếp A→Z</button>}
          </div>
          <DaiList provinces={ordered || []} skip={skip} onToggle={toggleDai} getCode={getCode} onCode={setCode} onMove={moveDai} />
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
        <p className="preview-note">Xem trước 1 phiếu · khi in: 6 phiếu / tờ A4</p>
        <div className="sheet-box"><div className="sheet">{sheet}</div></div>
        {printing && provinces && Array.from({ length: n - 1 }, (_, i) => <div key={i} className="sheet">{sheet}</div>)}
      </main>

      {/* Điện thoại, iPad dựng: nút in luôn nằm ở đáy màn hình */}
      <div className="mobile-bar">
        <span className="hint">{copiesText}</span>
        <button className="btn primary" onClick={print}>In {n} tờ</button>
      </div>
    </div>
  );
}
