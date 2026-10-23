// Hàm chạy trên Vercel cho /api/kqxs (ở máy thì server.js lo phần này)
const { handleKqxs } = require('../lib/kqxs.js');

module.exports = async (req, res) => {
  const { status, body, cache } = await handleKqxs(new URL(req.url, 'http://localhost').searchParams);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  // s-maxage: CDN của Vercel giữ câu trả lời, nhiều người mở trang cùng lúc thì nguồn chỉ bị hỏi một lần
  res.setHeader('Cache-Control', cache
    ? `public, max-age=0, s-maxage=${cache}, stale-while-revalidate=${cache}`
    : 'no-store');
  res.end(JSON.stringify(body));
};
