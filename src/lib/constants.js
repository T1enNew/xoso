// Giờ xổ Miền Nam (giờ VN)
export const DRAW_TIME = '16:15';
export const WATCH_FROM = '16:05'; // từ giờ này dò nhanh
export const DRAW_END = '16:50';   // sau giờ này dò thưa lại

// Các giải theo thứ tự xổ, cũng là thứ tự in từ trên xuống.
// count: số lượng số, len: số chữ số, label: tiền thưởng in trên phiếu, prize: tiền thưởng ghi trên bảng (vé 10.000đ)
export const PRIZES = [
  { g: '8', count: 1, len: 2, label: '100', prize: '100.000' },
  { g: '7', count: 1, len: 3, label: '200', prize: '200.000' },
  { g: '6', count: 3, len: 4, label: '400', prize: '400.000' },
  { g: '5', count: 1, len: 4, label: '1TR', prize: '1 triệu' },
  { g: '4', count: 7, len: 5, label: '3TR', prize: '3 triệu' },
  { g: '3', count: 2, len: 5, label: '10TR', prize: '10 triệu' },
  { g: '2', count: 1, len: 5, label: '15TR', prize: '15 triệu' },
  { g: '1', count: 1, len: 5, label: '30TR', prize: '30 triệu' },
  { g: 'ĐB', count: 1, len: 6, label: 'ĐB', prize: '2 tỷ' },
];

export const THU = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
export const THU_NGAN = ['CN', 'T.2', 'T.3', 'T.4', 'T.5', 'T.6', 'T.7'];

// Dòng cuối phiếu: tên đại lý : số điện thoại
export const DEFAULT_SHOP_NAME = 'TRƯỜNG THỊNH';
export const DEFAULT_SHOP_PHONE = '0918643803';

export const KHO_OPTIONS = [
  { value: 'phieu', label: 'Vé dò nhỏ', sub: '6 vé / tờ A4' },
  { value: 'a4', label: 'Vé dò lớn', sub: '1 vé / tờ A4' },
];
