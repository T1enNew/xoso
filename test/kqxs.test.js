// Kiểm tra phần đọc dữ liệu nguồn, không cần mạng: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDescription, parseFeed, parseLive, parseMinhNgocCodes, parseTables } = require('../lib/kqxs.js');

test('chuỗi trực tiếp: tách đúng đài và giải', () => {
  const r = parseLive('VL,BD,TV:34090;2||26869;2');
  assert.deepEqual(r.provinces.map(p => p.name), ['Vĩnh Long', 'Bình Dương', 'Trà Vinh']);
  assert.deepEqual(r.provinces[0].prizes, { '8': ['34'], '7': ['090'] });
  assert.deepEqual(r.provinces[1].prizes, {});
  assert.equal(r.complete, false);
});

test('chuỗi trực tiếp: số đang quay dở giữ phần chữ số đã ra', () => {
  assert.deepEqual(parseLive('VL:340').provinces[0].prizes, { '8': ['34'], '7': ['0'] });
});

test('chuỗi trực tiếp: đủ 82 chữ số mới là xổ xong', () => {
  assert.equal(parseLive('VL:' + '1'.repeat(82)).complete, true);
  assert.equal(parseLive('VL:' + '1'.repeat(81)).complete, false);
});

test('chuỗi trực tiếp: chưa có kỳ nào thì không có kết quả', () => {
  for (const s of ['-1', '', ':123', undefined]) assert.equal(parseLive(s), null);
});

test('trang kết quả: đọc mọi bảng, mỗi bảng một ngày', () => {
  const table = (id, date, g8) => `
<table class="tbl-xsmn col3" id="${id}">
<tr><th><a href="/xsmn/thu-3">Thứ 3</a><br>13/10</th><th><a href="/xsbt">Bến Tre</a><i class="dockq" data-url="ben-tre/${date}"></i></th><th><a href="/xshcm-xstp">TP.HCM</a><i class="dockq" data-url="tp-ho-chi-minh/${date}"></i></th>
</tr><tr><td title="Giải tám">G.8</td><td><b>${g8}</b></td><td><b>59</b></td>
</tr><tr><td title="Giải sáu">G.6</td><td>0371<br>4233<br>4063</td><td>9063<br>3211<br>8011</td>
</tr><tr><td title="Giải ĐB">ĐB</td><td><b>542064</b></td><td><b>056006</b></td>
</tr>
</table>`;
  const tables = parseTables(table('MN0', '13-10-2026', '78') + table('MN1', '06-10-2026', '12'));
  assert.deepEqual(tables.map(t => t.date), ['2026-10-13', '2026-10-06']);
  const [t] = tables;
  assert.deepEqual(t.provinces.map(p => p.name), ['Bến Tre', 'Hồ Chí Minh']); // TP.HCM gom về một tên
  assert.deepEqual(t.provinces[0].prizes, { '8': ['78'], '6': ['0371', '4233', '4063'], 'ĐB': ['542064'] });
  assert.equal(t.complete, false);
});

test('RSS: mỗi kỳ một item, đủ giải là xổ xong', () => {
  const desc = '[Cần Thơ]\n8: 95\n7: 030\n6: 3564 - 8154 - 0364\n5: 6145\n4: 84914 - 01667 - 53176 - 98442 - 88409 - 42812 - 92964\n'
    + '3: 52711 - 29936\n2: 05305\n1: 34998\nĐB: 124518';
  const xml = `<rss><channel><item><title>KẾT QUẢ XỔ SỐ MIỀN NAM NGÀY 4/11 (Thứ Tư)</title><description><![CDATA[${desc}]]></description></item>`
    + '<item><title>KẾT QUẢ XỔ SỐ MIỀN NAM NGÀY 28/10</title><description>[Cần Thơ]\n8: 11</description></item></channel></rss>';
  const [today, prev] = parseFeed(xml);
  assert.equal(today.day, '04/11');
  assert.equal(today.complete, true);
  assert.deepEqual(prev, { day: '28/10', provinces: [{ name: 'Cần Thơ', prizes: { '8': ['11'] } }], complete: false });
});

test('RSS: giải 7 và giải 8 dính chung một dòng', () => {
  const [p] = parseDescription('[Cần Thơ]\n8: 13\n7: 7458: 13\nĐB: 123456');
  assert.equal(p.name, 'Cần Thơ');
  assert.deepEqual(p.prizes['7'], ['745']);
  assert.deepEqual(p.prizes['8'], ['13']);
  assert.deepEqual(p.prizes['ĐB'], ['123456']);
});

test('Lâm Đồng (RSS) và LD (trực tiếp) đều ghi là Đà Lạt', () => {
  assert.equal(parseDescription('[Lâm Đồng]\n8: 13')[0].name, 'Đà Lạt');
  assert.equal(parseLive('LD,KG,TG:13').provinces[0].name, 'Đà Lạt');
});

test('ký hiệu vé Minh Ngọc: trang trực tiếp và trang theo ngày', () => {
  const live = `<table class="bkqmiennam"><tr><td class="ngay"> 01/11/26</td></tr></table>
<table class="rightcl"><tbody><tr><td class="tinh"><a href="#">Tiền Giang</a></td></tr><tr><td class="matinh">L: <span id="loaive_22" class="">TGA11</span></td></tr></tbody></table>
<table class="rightcl"><tbody><tr><td class="tinh"><a href="#">Đà Lạt</a></td></tr><tr><td class="matinh">L: <span id="loaive_9">&#272;L11K1</span></td></tr></tbody></table>`;
  assert.deepEqual(parseMinhNgocCodes(live), { '2026-11-01': { 'Tiền Giang': 'TGA11', 'Đà Lạt': 'ĐL11K1' } });

  const day = `<table class="bkqmiennam"><tr><td class="ngay"> <a href="#">31/10/2026</a></td></tr></table>
<table class="rightcl"> <tbody> <tr> <td class="tinh"> <a href="#" title="Xổ Số TP. HCM">TP. HCM</a></td> </tr> <tr> <td class="matinh"> XSHCM - 10E7</td> </tr> </tbody></table>
<table class="rightcl"> <tbody> <tr> <td class="tinh"> <a href="#">Hậu Giang</a></td> </tr> <tr> <td class="matinh"> XSHG - K5T10</td> </tr> </tbody></table>
<table class="bkqmiennam"><tr><td class="ngay"> <a href="#">30/10/2026</a></td></tr></table>
<table class="rightcl"> <tbody> <tr> <td class="tinh"> <a href="#">Trà Vinh</a></td> </tr> <tr> <td class="matinh"> XSTV - 35TV44</td> </tr> </tbody></table>`;
  assert.deepEqual(parseMinhNgocCodes(day), {
    '2026-10-31': { 'Hồ Chí Minh': '10E7', 'Hậu Giang': 'K5T10' },
    '2026-10-30': { 'Trà Vinh': '35TV44' },
  });
});
