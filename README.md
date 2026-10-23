# xoso-print

In kết quả xổ số kiến thiết: phiếu 6 tờ / A4 (3 trên, 3 dưới), bảng A4 hoặc bill 80mm.
Trong giờ xổ, trang tự cập nhật số đang ra (số chưa ra thì xoay) và tự in khi có đủ kết quả.

## Chạy

Cần Node.js 22 trở lên.

```
npm install      # lần đầu
npm run dev      # mở http://localhost:3000, sửa code là trang tự tải lại
```

Dùng hằng ngày, không sửa code:

```
npm run build
npm start
```

Sửa `server.js` xong thì phải tắt (Ctrl+C) và chạy lại server.

## Cấu trúc

- `server.js`: lấy kết quả từ xskt.com.vn và trả JSON tại `/api/kqxs?mien=mn|mt|mb&date=YYYY-MM-DD`.
  Hôm nay lấy từ RSS, lúc đang xổ lấy từ nguồn trực tiếp; ngày cũ lấy từ trang theo ngày, trang đó lỗi thì tìm trong trang theo thứ.
- `src/`: giao diện React (Vite). Phiếu ở `src/components/Slips.jsx`, bảng ở `src/components/ResultTable.jsx`.
- `legacy/index.html`: bản cũ viết bằng một file HTML.

## Lưu ý

Điều khoản sử dụng của xskt.com.vn không cho dùng công cụ tự động thu thập dữ liệu, hay dùng vào mục đích kinh doanh, khi chưa được họ cho phép bằng văn bản.
