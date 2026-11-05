import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DRAW_END, DRAW_TIME } from '../lib/constants.js';

const Icon = ({ children }) => (
  <span className="help-ic" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  </span>
);

const STATUS = [
  ['var(--red)', 'Đang xổ'],
  ['var(--green)', 'Đã đủ kết quả'],
  ['var(--blue)', 'Đang chờ giờ xổ'],
  ['var(--amber)', 'Nguồn lỗi, tự thử lại'],
];

const ITEMS = [
  {
    title: 'Kết quả tự cập nhật',
    icon: <><path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" /><path d="M21 3v5h-5" /></>,
    body: <p>Các con số lấy tự động từ xskt.com.vn, mã vé lấy từ Minh Ngọc. Tới giờ xổ ({DRAW_TIME} – {DRAW_END}) trang tự dò số mới
      mỗi 10 giây, không cần bấm gì. Số đang quay cuộn <b className="red">màu đỏ</b>, số chưa tới lượt có vòng tròn nhỏ xoay.</p>,
  },
  {
    title: 'Chấm màu trạng thái',
    icon: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" fill="currentColor" /></>,
    body: <ul className="help-legend">{STATUS.map(([color, text]) => <li key={text}><i style={{ background: color }} />{text}</li>)}</ul>,
  },
  {
    title: 'Ngày xổ',
    icon: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
    body: <p>Bấm ‹ › hoặc chọn trên lịch để xem và in kết quả ngày cũ. Bấm “Về hôm nay” để quay lại.</p>,
  },
  {
    title: 'Kiểu in',
    icon: <><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="8" rx="1.5" /><rect x="3" y="13" width="18" height="8" rx="1.5" /></>,
    body: <p><b>Vé dò nhỏ:</b> 6 vé trên 1 tờ A4, cắt ra phát cho khách.<br /><b>Vé dò lớn:</b> 1 vé to trên cả tờ A4.</p>,
  },
  {
    title: 'Đài in & mã vé',
    icon: <><path d="M10 6h11M10 12h11M10 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth="3" /></>,
    body: <p>Bỏ tick đài không cần in. Kéo thanh đài lên xuống để đổi thứ tự trên vé (điện thoại: kéo ở chỗ ⠿).
      Mã vé tự điền, sửa được; xoá trống thì quay về mã tự lấy.</p>,
  },
  {
    title: 'Dòng cuối',
    icon: <><path d="M4 7h16M4 12h16M4 17h9" /></>,
    body: <p>Tên đại lý và số điện thoại, in ở dưới mỗi vé.</p>,
  },
  {
    title: 'In',
    icon: <><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="8" rx="2" /><path d="M7 14h10v7H7z" /></>,
    body: <p>Chọn số tờ rồi bấm <b>In</b>. Trong hộp in: chọn máy in, khổ giấy A4, để Lề và Tỉ lệ ở Mặc định.</p>,
  },
  {
    title: 'Ghi nhớ',
    icon: <path d="M6 3h12v18l-6-4-6 4z" />,
    body: <p>Đài, thứ tự đài, mã vé, dòng cuối và số tờ được nhớ trên máy này, lần sau mở lại vẫn còn.</p>,
  },
];

// Nút "?" nhỏ ở đầu trang: bấm vào mới hiện cửa sổ giải thích cách trang hoạt động
export default function Help() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const esc = e => { if (e.key === 'Escape') setOpen(false); };
    const btn = btnRef.current;
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden'; // trang phía sau đứng yên khi cuộn trong cửa sổ
    closeRef.current.focus();
    return () => {
      document.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
      btn.focus();
    };
  }, [open]);

  return (
    <div className="help">
      <button type="button" ref={btnRef} className="help-btn" title="Cách dùng trang" aria-label="Cách dùng trang"
        aria-expanded={open} onClick={() => setOpen(true)}>?</button>
      {/* Gắn thẳng vào body để cửa sổ luôn nằm trên mọi thứ (cả thanh In ở đáy màn hình điện thoại) */}
      {open && createPortal(
        <div className="help-backdrop" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title">
            <header className="help-top">
              <div className="logo" aria-hidden="true">TT</div>
              <div>
                <h2 id="help-title">Cách dùng trang</h2>
                <p>Xổ Số Trường Thịnh · in kết quả Miền Nam</p>
              </div>
              <button type="button" ref={closeRef} className="help-close" aria-label="Đóng" onClick={() => setOpen(false)}>×</button>
            </header>
            <div className="help-body">
              {ITEMS.map(({ title, icon, body }) => (
                <section key={title} className="help-item">
                  <Icon>{icon}</Icon>
                  <div>
                    <h3>{title}</h3>
                    {body}
                  </div>
                </section>
              ))}
            </div>
            <footer className="help-foot">
              <small>Kết quả chỉ để tham khảo; căn cứ cuối cùng là biên bản của công ty xổ số kiến thiết.</small>
              <button type="button" className="btn primary" onClick={() => setOpen(false)}>Đã hiểu</button>
            </footer>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
