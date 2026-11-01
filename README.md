# Xổ Số Trường Thịnh

Web in kết quả xổ số kiến thiết Miền Nam cho đại lý Trường Thịnh: phiếu 6 tờ / A4 (3 trên, 3 dưới) hoặc bảng A4, in nhiều tờ một lượt.
Trong giờ xổ, trang tự cập nhật số đang ra (số chưa ra thì xoay). Dùng được trên máy tính, iPad và điện thoại.

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

Sửa `server.js` hay `lib/kqxs.js` xong thì phải tắt (Ctrl+C) và chạy lại server.

Kiểm tra phần đọc dữ liệu: `npm test`.

## Deploy (CI/CD)

- **CI**: mỗi lần push hoặc mở pull request, GitHub Actions (`.github/workflows/ci.yml`) chạy `npm test` và `npm run build`. Kết quả xem ở tab Actions của repo.
- **CD**: Vercel nối với repo này. Push lên `main` là Vercel tự build và cập nhật trang chính; nhánh khác thì có link xem trước.
  Trên Vercel, `/api/kqxs` chạy bằng `api/kqxs.js` (máy chủ Singapore, xem `vercel.json`), và CDN giữ câu trả lời vài giây tới một ngày tuỳ loại để không hỏi dồn nguồn.

## Cấu trúc

- `lib/kqxs.js`: lấy kết quả từ xskt.com.vn và ký hiệu vé (Miền Nam) từ minhngoc.net.vn, trả JSON cho `/api/kqxs?mien=mn|mt|mb&date=YYYY-MM-DD`.
  Hôm nay lấy từ RSS, lúc đang xổ lấy từ nguồn trực tiếp; ngày cũ lấy từ trang theo ngày, trang đó lỗi thì tìm trong trang theo thứ.
- `server.js`: chạy ở máy (phục vụ trang và `/api/kqxs`). `api/kqxs.js`: chạy trên Vercel.
- `src/`: giao diện React (Vite). Phiếu ở `src/components/Slips.jsx`, bảng ở `src/components/ResultTable.jsx`.
- `test/`: kiểm tra phần đọc dữ liệu, không cần mạng.
- `legacy/index.html`: bản cũ viết bằng một file HTML.

## Lưu ý

Điều khoản sử dụng của xskt.com.vn và của minhngoc.net.vn đều không cho dùng lại dữ liệu vào mục đích kinh doanh khi chưa được họ cho phép bằng văn bản.
Kết quả trên phiếu chỉ để tham khảo; căn cứ cuối cùng là biên bản kết quả của công ty xổ số kiến thiết.
