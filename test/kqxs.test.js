// Kiểm tra phần đọc dữ liệu nguồn, không cần mạng: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const minhngoc = require('../lib/minhngoc.js');
const xskt = require('../lib/xskt.js');

// ---------- Minh Ngọc (nguồn chính) ----------

// Một đài trên trang Minh Ngọc; prizes: { giai8: ['32'], ... }
const mnProvince = (name, codeCell, prizes, id) => `<table cellpadding="0" cellspacing="0" class="rightcl" width="100%"><tbody>
<tr><td class="tinh"> <a href="/xo-so-mien-nam/x.html" title="Xổ Số ${name}">${name}</a></td></tr>
<tr><td class="matinh"> ${codeCell}</td></tr>
${Object.entries(prizes).map(([cls, nums]) => `<tr><td class="${cls}"> ${nums.map((n, i) => `<div${id ? ` id="${cls}_${i + 1}_${id}"` : ''}>${n}</div>`).join('')}</td></tr>`).join('\n')}
</tbody></table>`;
const mnDay = (dateCell, provinces) => `<table class="bkqmiennam" width="100%"><tbody><tr><td width="85" valign="top">
<table class="leftcl"><tbody><tr><td class="thu"><a href="#">Thứ tư</a></td></tr><tr><td class="ngay"> ${dateCell}</td></tr>
<tr><td class="giai8"> Giải tám</td></tr><tr><td class="giaidb"> Giải Đặc Biệt</td></tr></tbody></table></td>
<td valign="top"><table><tr><td valign="top">${provinces.join('</td><td valign="top">')}</td></tr></table></td></tr></tbody></table>
<table class="boxBottom"><tbody><tr><td class="daysoThongke"><div>0</div></td></tr></tbody></table>`;
const FULL = {
  giai8: ['32'], giai7: ['961'], giai6: ['6166', '0336', '0089'], giai5: ['1977'],
  giai4: ['14798', '92552', '44270', '30081', '25890', '97264', '25251'], giai3: ['40443', '42691'],
  giai2: ['92453'], giai1: ['10347'], giaidb: ['396001'],
};

test('Minh Ngọc trang theo ngày: mỗi bảng một ngày, đủ số và ký hiệu vé', () => {
  const html = mnDay('<a href="#">04/11/2026</a>', [mnProvince('Cần Thơ', 'XSCT - KT11', FULL), mnProvince('TP. HCM', 'XSHCM - 11A7', { giai8: ['10'] })])
    + mnDay('<a href="#">28/10/2026</a>', [mnProvince('Cần Thơ', 'XSCT - KT10', FULL)]);
  const days = minhngoc.parseTables(html);
  assert.deepEqual(days.map(d => d.date), ['2026-11-04', '2026-10-28']);
  const [ct, hcm] = days[0].provinces;
  assert.equal(ct.name, 'Cần Thơ');
  assert.equal(ct.code, 'KT11');
  assert.deepEqual(ct.prizes['6'], ['6166', '0336', '0089']);
  assert.deepEqual(ct.prizes['ĐB'], ['396001']);
  assert.equal(hcm.name, 'Hồ Chí Minh'); // "TP. HCM" gom về một tên
  assert.equal(hcm.code, '11A7');
  assert.equal(days[0].complete, false); // TP.HCM mới có giải 8
  assert.equal(days[1].complete, true);
});

test('Minh Ngọc bảng trực tiếp: ngày 2 chữ số năm, mã số đài, số chưa quay thì dừng', () => {
  const partial = { ...FULL, giai4: ['14798', '92552', '<img src="/images/loading.gif">', ''], giai3: [''], giai2: [''], giai1: [''], giaidb: [''] };
  const html = mnDay('04/11/26', [mnProvince('Đồng Nai', 'L: <span id="loaive_10" class="">11K1</span>', partial, 10)]);
  const [day] = minhngoc.parseTables(html);
  assert.equal(day.date, '2026-11-04');
  const [p] = day.provinces;
  assert.equal(p.id, '10');
  assert.equal(p.code, '11K1');
  assert.deepEqual(p.prizes['4'], ['14798', '92552']);
  assert.equal(p.prizes['ĐB'], undefined);
  assert.equal(day.complete, false);
});

test('Minh Ngọc file trực tiếp: đọc số đang quay dở, mã vé, ngày theo giờ VN', () => {
  const ntime = Date.UTC(2026, 10, 5, 9, 15) / 1000; // 16:15 ngày 05/11 giờ VN
  const js = `kqxs.mn={run:1,tinh:"13,14",ntime:${ntime},delay:5000,kq:{13:{lv:"AG-11K1",8:"53",7:"09+",6:["9151","56++","****"]},`
    + `14:{lv:'K1T11',8:"0+",7:"***",0:"******"}}};`;
  const names = { 13: 'An Giang', 14: 'Bình Thuận' };
  const live = minhngoc.parseLive(js, names);
  assert.equal(live.date, '2026-11-05');
  assert.deepEqual(live.ids, ['13', '14']);
  const [ag, bth] = live.result.provinces;
  assert.equal(ag.name, 'An Giang');
  assert.equal(ag.code, 'AG-11K1');
  assert.deepEqual(ag.prizes, { '8': ['53'], '7': ['09'], '6': ['9151', '56'] });
  assert.deepEqual(bth.prizes, { '8': ['0'] });
  assert.equal(bth.code, 'K1T11');
  assert.equal(live.result.complete, false);
});

test('Minh Ngọc file trực tiếp: chưa biết tên đài hoặc chưa có số thì không đoán', () => {
  const js = 'kqxs.mn={run:1,tinh:"13,99",ntime:1793782953,delay:5000,kq:{13:{8:"53"},99:{8:"11"}}};';
  assert.equal(minhngoc.parseLive(js, { 13: 'An Giang' }).result, null);
  const idle = minhngoc.parseLive('kqxs.mn={run:0,tinh:"10,11,12",ntime:1793782953,delay:5000};', {});
  assert.equal(idle.result, null);
  assert.equal(idle.date, '2026-11-04');
  assert.equal(minhngoc.parseLive('', {}), null);
});

test('Minh Ngọc file trực tiếp: đủ 18 số mới là xổ xong', () => {
  const kq = '8:"32",7:"961",6:["6166","0336","0089"],5:"1977",4:["14798","92552","44270","30081","25890","97264","25251"],3:["40443","42691"],2:"92453",1:"10347"';
  const js = db => `kqxs.mn={run:1,tinh:"11",ntime:1793782953,delay:5000,kq:{11:{${kq},0:"${db}"}}};`;
  assert.equal(minhngoc.parseLive(js('396001'), { 11: 'Cần Thơ' }).result.complete, true);
  assert.equal(minhngoc.parseLive(js('39600+'), { 11: 'Cần Thơ' }).result.complete, false);
});

// ---------- xskt.com.vn (nguồn dự phòng) ----------

test('xskt chuỗi trực tiếp: tách đúng đài và giải, số quay dở giữ phần đã ra', () => {
  const r = xskt.parseLive('VL,BD,TV:34090;2||26869;2');
  assert.deepEqual(r.provinces.map(p => p.name), ['Vĩnh Long', 'Bình Dương', 'Trà Vinh']);
  assert.deepEqual(r.provinces[0].prizes, { '8': ['34'], '7': ['090'] });
  assert.deepEqual(r.provinces[1].prizes, {});
  assert.deepEqual(xskt.parseLive('VL:340').provinces[0].prizes, { '8': ['34'], '7': ['0'] });
  assert.equal(xskt.parseLive('VL:' + '1'.repeat(82)).complete, true);
  assert.equal(xskt.parseLive('VL:' + '1'.repeat(81)).complete, false);
  for (const s of ['-1', '', ':123', undefined]) assert.equal(xskt.parseLive(s), null);
});

test('xskt trang kết quả: đọc mọi bảng, mỗi bảng một ngày', () => {
  const table = (id, date, g8) => `
<table class="tbl-xsmn col3" id="${id}">
<tr><th><a href="/xsmn/thu-3">Thứ 3</a><br>13/10</th><th><a href="/xsbt">Bến Tre</a><i class="dockq" data-url="ben-tre/${date}"></i></th><th><a href="/xshcm-xstp">TP.HCM</a><i class="dockq" data-url="tp-ho-chi-minh/${date}"></i></th>
</tr><tr><td title="Giải tám">G.8</td><td><b>${g8}</b></td><td><b>59</b></td>
</tr><tr><td title="Giải sáu">G.6</td><td>0371<br>4233<br>4063</td><td>9063<br>3211<br>8011</td>
</tr><tr><td title="Giải ĐB">ĐB</td><td><b>542064</b></td><td><b>056006</b></td>
</tr>
</table>`;
  const tables = xskt.parseTables(table('MN0', '13-10-2026', '78') + table('MN1', '06-10-2026', '12'));
  assert.deepEqual(tables.map(t => t.date), ['2026-10-13', '2026-10-06']);
  assert.deepEqual(tables[0].provinces.map(p => p.name), ['Bến Tre', 'Hồ Chí Minh']);
  assert.deepEqual(tables[0].provinces[0].prizes, { '8': ['78'], '6': ['0371', '4233', '4063'], 'ĐB': ['542064'] });
});

test('xskt RSS: mỗi kỳ một item; giải 7 và 8 dính dòng; Lâm Đồng ghi là Đà Lạt', () => {
  const desc = '[Cần Thơ]\n8: 95\n7: 030\n6: 3564 - 8154 - 0364\n5: 6145\n4: 84914 - 01667 - 53176 - 98442 - 88409 - 42812 - 92964\n'
    + '3: 52711 - 29936\n2: 05305\n1: 34998\nĐB: 124518';
  const xml = `<rss><channel><item><title>KẾT QUẢ XỔ SỐ MIỀN NAM NGÀY 4/11 (Thứ Tư)</title><description><![CDATA[${desc}]]></description></item>`
    + '<item><title>KẾT QUẢ XỔ SỐ MIỀN NAM NGÀY 28/10</title><description>[Lâm Đồng]\n8: 11</description></item></channel></rss>';
  const [today, prev] = xskt.parseFeed(xml);
  assert.equal(today.day, '04/11');
  assert.equal(today.complete, true);
  assert.deepEqual(prev, { day: '28/10', provinces: [{ name: 'Đà Lạt', prizes: { '8': ['11'] } }], complete: false });
  const [p] = xskt.parseDescription('[Cần Thơ]\n8: 13\n7: 7458: 13\nĐB: 123456');
  assert.deepEqual(p.prizes, { '7': ['745'], '8': ['13'], 'ĐB': ['123456'] });
  assert.equal(xskt.parseLive('LD,KG,TG:13').provinces[0].name, 'Đà Lạt');
});
