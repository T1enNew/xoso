export const DRAW_TIME = { mn: '16:15', mt: '17:15', mb: '18:15' };
export const WATCH_FROM = { mn: '16:05', mt: '17:05', mb: '18:05' }; // từ giờ này dò nhanh (giờ VN)
export const DRAW_END = { mn: '16:50', mt: '17:50', mb: '18:50' };   // sau giờ này dò thưa lại

// Mỗi giải: [số lượng số, số chữ số] để vẽ ô số xoay cho giải chưa ra
const SPEC_NAM_TRUNG = { '8': [1, 2], '7': [1, 3], '6': [3, 4], '5': [1, 4], '4': [7, 5], '3': [2, 5], '2': [1, 5], '1': [1, 5], 'ĐB': [1, 6] };
export const SPEC = {
  mn: SPEC_NAM_TRUNG,
  mt: SPEC_NAM_TRUNG,
  mb: { 'ĐB': [1, 5], '1': [1, 5], '2': [2, 5], '3': [6, 5], '4': [4, 4], '5': [6, 4], '6': [3, 3], '7': [4, 2] },
};

export const NAME = { mn: 'Miền Nam', mt: 'Miền Trung', mb: 'Miền Bắc' };

export const ORDER = {
  mn: ['8', '7', '6', '5', '4', '3', '2', '1', 'ĐB'],
  mt: ['8', '7', '6', '5', '4', '3', '2', '1', 'ĐB'],
  mb: ['ĐB', '1', '2', '3', '4', '5', '6', '7'],
};

// Tiền thưởng in ở cột trái của phiếu (vé 10.000đ)
const LABEL_NAM_TRUNG = { '8': '100', '7': '200', '6': '400', '5': '1T', '4': '3T', '3': '10T', '2': '15T', '1': '30T', 'ĐB': 'ĐB' };
export const LABEL = {
  mn: LABEL_NAM_TRUNG,
  mt: LABEL_NAM_TRUNG,
  mb: { 'ĐB': 'ĐB', '1': '10T', '2': '5T', '3': '1T', '4': '400', '5': '200', '6': '100', '7': '40' },
};

export const THU = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
export const THU_NGAN = ['CN', 'T.2', 'T.3', 'T.4', 'T.5', 'T.6', 'T.7'];
export const DEFAULT_FOOTER = 'TRƯỜNG THỊNH : 0918 643 803';

// Tiền thưởng ghi trên bảng A4 (vé 10.000đ)
const PRIZE_NAM_TRUNG = {
  '8': '100.000', '7': '200.000', '6': '400.000', '5': '1 triệu', '4': '3 triệu',
  '3': '10 triệu', '2': '15 triệu', '1': '30 triệu', 'ĐB': '2 tỷ',
};
export const PRIZE = {
  mn: PRIZE_NAM_TRUNG,
  mt: PRIZE_NAM_TRUNG,
  mb: { 'ĐB': '1 tỷ', '1': '10 triệu', '2': '5 triệu', '3': '1 triệu', '4': '400.000', '5': '200.000', '6': '100.000', '7': '40.000' },
};

export const KHO_OPTIONS = [
  { value: 'phieu', label: 'Phiếu', sub: '6 phiếu / tờ A4' },
  { value: 'a4', label: 'Bảng', sub: '1 bảng / tờ A4' },
];
