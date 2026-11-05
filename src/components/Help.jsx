import { useEffect, useRef, useState } from 'react';
import { DRAW_END, DRAW_TIME } from '../lib/constants.js';

// Nút "?" nhỏ ở đầu trang: bấm vào mới hiện khung giải thích cách trang hoạt động
export default function Help() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Bấm ra ngoài hoặc phím Esc thì đóng
  useEffect(() => {
    if (!open) return;
    const away = e => { if (!ref.current.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="help" ref={ref}>
      <button type="button" className="help-btn" title="Cách dùng trang" aria-label="Cách dùng trang"
        aria-expanded={open} onClick={() => setOpen(o => !o)}>?</button>
      {open && (
        <div className="help-pop" role="dialog" aria-label="Cách dùng trang">
          <div className="help-head">
            <b>Cách dùng trang</b>
            <button type="button" className="help-close" aria-label="Đóng" onClick={() => setOpen(false)}>×</button>
          </div>
          <ul>
            <li><b>Kết quả tự cập nhật.</b> Số lấy tự động từ xskt.com.vn. Tới giờ xổ ({DRAW_TIME}–{DRAW_END}) trang tự dò số mới
              mỗi 10 giây, không cần bấm gì. Số đang quay cuộn màu đỏ, số chưa tới lượt có vòng tròn nhỏ xoay.</li>
            <li><b>Chấm màu trạng thái.</b> Đỏ nhấp nháy là đang xổ, xanh lá là đã đủ kết quả,
              xanh dương là đang chờ, cam là nguồn lỗi (trang tự thử lại).</li>
            <li><b>Ngày xổ.</b> Bấm ‹ › hoặc chọn trên lịch để xem và in kết quả ngày cũ.</li>
            <li><b>Kiểu in.</b> Vé dò nhỏ: 6 vé trên 1 tờ A4, cắt ra phát cho khách. Vé dò lớn: 1 vé to trên cả tờ A4.</li>
            <li><b>Đài in &amp; mã vé.</b> Bỏ tick đài không cần in. Kéo thanh đài lên xuống để đổi thứ tự trên vé
              (điện thoại: kéo ở chỗ ⠿). Mã vé tự lấy từ Minh Ngọc, sửa được; xoá trống thì quay về mã tự lấy.</li>
            <li><b>Dòng cuối.</b> Tên đại lý và số điện thoại in ở dưới mỗi vé.</li>
            <li><b>In.</b> Chọn số tờ rồi bấm In. Trong hộp in: chọn máy in, khổ giấy A4, để Lề và Tỉ lệ ở Mặc định.</li>
            <li><b>Ghi nhớ.</b> Đài, thứ tự, mã vé, dòng cuối, số tờ được nhớ trên máy này, lần sau mở lại vẫn còn.</li>
          </ul>
          <p className="help-note">Kết quả chỉ để tham khảo; căn cứ cuối cùng là biên bản của công ty xổ số kiến thiết.</p>
        </div>
      )}
    </div>
  );
}
