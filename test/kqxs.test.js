// Kiểm tra phần đọc dữ liệu nguồn, không cần mạng: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLive, parseTables, parseDescription } = require('../lib/kqxs.js');

test('chuỗi trực tiếp miền Nam: tách đúng đài và giải', () => {
  const r = parseLive('VL,BD,TV:34090;2||26869;2', 'mn', '2026-10-16');
  assert.deepEqual(r.provinces.map(p => p.name), ['Vĩnh Long', 'Bình Dương', 'Trà Vinh']);
  assert.deepEqual(r.provinces[0].prizes, { '8': ['34'], '7': ['090'] });
  assert.deepEqual(r.provinces[1].prizes, {});
  assert.equal(r.day, '16/10');
  assert.equal(r.complete, false);
});

test('chuỗi trực tiếp: số đang quay dở giữ phần chữ số đã ra', () => {
  const r = parseLive('VL:340', 'mn', '2026-10-16');
  assert.deepEqual(r.provinces[0].prizes, { '8': ['34'], '7': ['0'] });
});

test('chuỗi trực tiếp: đủ 82 chữ số mới là xổ xong', () => {
  assert.equal(parseLive('VL:' + '1'.repeat(82), 'mn', '2026-10-16').complete, true);
  assert.equal(parseLive('VL:' + '1'.repeat(81), 'mn', '2026-10-16').complete, false);
});

test('chuỗi trực tiếp miền Bắc: giải ĐB nằm sau dấu -', () => {
  const done = parseLive('1'.repeat(102) + '-62066;5', 'mb', '2026-10-15');
  assert.deepEqual(done.provinces[0].prizes['ĐB'], ['62066']);
  assert.equal(done.provinces[0].prizes['3'].length, 6);
  assert.equal(done.complete, true);
  assert.equal(parseLive('1'.repeat(102), 'mb', '2026-10-15').complete, false);
});

test('trang kết quả miền Nam: đọc mọi bảng, mỗi bảng một ngày', () => {
  const table = (id, date, g8) => `
<table class="tbl-xsmn col3" id="${id}">
<tr><th><a href="/xsmn/thu-3">Thứ 3</a><br>13/10</th><th><a href="/xsbt">Bến Tre</a><i class="dockq" data-url="ben-tre/${date}"></i></th><th><a href="/xshcm-xstp">TP.HCM</a><i class="dockq" data-url="tp-ho-chi-minh/${date}"></i></th>
</tr><tr><td title="Giải tám">G.8</td><td><b>${g8}</b></td><td><b>59</b></td>
</tr><tr><td title="Giải sáu">G.6</td><td>0371<br>4233<br>4063</td><td>9063<br>3211<br>8011</td>
</tr><tr><td title="Giải ĐB">ĐB</td><td><b>542064</b></td><td><b>056006</b></td>
</tr>
</table>`;
  const tables = parseTables(table('MN0', '13-10-2026', '78') + table('MN1', '06-10-2026', '12'), 'mn', 'x');
  assert.deepEqual(tables.map(t => t.date), ['2026-10-13', '2026-10-06']);
  const [t] = tables;
  assert.deepEqual(t.provinces.map(p => p.name), ['Bến Tre', 'Hồ Chí Minh']); // TP.HCM gom về một tên
  assert.deepEqual(t.provinces[0].prizes, { '8': ['78'], '6': ['0371', '4233', '4063'], 'ĐB': ['542064'] });
  assert.equal(t.title, 'KẾT QUẢ XỔ SỐ MIỀN NAM NGÀY 13/10/2026 (Thứ Ba)');
  assert.equal(t.complete, false);
});

test('trang kết quả miền Bắc', () => {
  const html = `
<table class="result" id="MB0">
<tr><th colspan="2"><b class=h3>XSMB</b><i class="dockq" data-url="thu-do/15-10-2026"></i></th><th>ĐẦU</th><th>ĐUÔI</th></tr>
<tr><td title="Giải ĐB">ĐB</td><td><em>62066</em></td><td>0</td><td>4</td></tr>
<tr><td rowspan="2" title="Giải ba">G3</td><td rowspan="2"><p>28087 24887 58423<br>25269 33005 45004</p></td><td>3</td><td></td></tr>
</table>`;
  const [t] = parseTables(html, 'mb', 'x');
  assert.equal(t.date, '2026-10-15');
  assert.deepEqual(t.provinces[0].prizes['ĐB'], ['62066']);
  assert.deepEqual(t.provinces[0].prizes['3'], ['28087', '24887', '58423', '25269', '33005', '45004']);
});

test('Lâm Đồng (RSS) và LD (trực tiếp) đều ghi là Đà Lạt', () => {
  assert.equal(parseDescription('[Lâm Đồng]\n8: 13')[0].name, 'Đà Lạt');
  assert.equal(parseLive('LD,KG,TG:13', 'mn', '2026-11-01').provinces[0].name, 'Đà Lạt');
});

test('RSS: giải 7 và giải 8 dính chung một dòng', () => {
  const [p] = parseDescription('[Cần Thơ]\n8: 13\n7: 7458: 13\nĐB: 123456');
  assert.equal(p.name, 'Cần Thơ');
  assert.deepEqual(p.prizes['7'], ['745']);
  assert.deepEqual(p.prizes['8'], ['13']);
  assert.deepEqual(p.prizes['ĐB'], ['123456']);
});
