// Server chạy ở máy: phục vụ trang in (React, thư mục src/) và /api/kqxs (phần lấy kết quả nằm ở lib/kqxs.js).
// Trên Vercel thì /api/kqxs chạy bằng api/kqxs.js, không dùng file này.
// Chạy khi đang sửa code: npm run dev   (trang tự tải lại khi lưu file)
// Chạy bình thường:       npm run build  rồi  npm start
const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleKqxs } = require('./lib/kqxs.js');

const PORT = process.env.PORT || 3000;
const DEV = process.argv.includes('--dev');
const DIST = path.join(__dirname, 'dist');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2',
};
let vite = null; // Vite chỉ chạy khi npm run dev

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/kqxs') {
    const { status, body } = await handleKqxs(url.searchParams);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(body));
  }
  if (vite) {
    return vite.middlewares(req, res, () => { res.writeHead(404); res.end(); });
  }
  serveStatic(url, res);
});

// Phục vụ bản build trong dist/, đường dẫn lạ thì trả về index.html
function serveStatic(url, res) {
  let file;
  try { file = path.join(DIST, decodeURIComponent(url.pathname)); } catch { file = DIST; }
  if (!file.startsWith(DIST + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(DIST, 'index.html');
  }
  if (!fs.existsSync(file)) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Chưa có bản build. Chạy "npm run build" rồi "npm start", hoặc "npm run dev" khi đang sửa code.');
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

async function start() {
  if (DEV) {
    const { createServer } = await import('vite');
    vite = await createServer({ root: __dirname, server: { middlewareMode: true, hmr: { server } }, appType: 'spa' });
  }
  server.listen(PORT, () => console.log(`Mở http://localhost:${PORT}${DEV ? '  (chế độ sửa code: lưu file là trang tự tải lại)' : ''}`));
}

start();
