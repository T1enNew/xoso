// Danh sách đài để chọn in, gõ mã vé và chọn thứ tự in.
// Thứ tự in: mỗi đài có các nút số 1, 2, 3… (cột trên phiếu, tính từ trái); bấm số nào là đài đứng ở cột đó.
export default function DaiList({ provinces, skip, onToggle, getCode, onCode, onMoveTo }) {
  const named = provinces.filter(p => p.name);
  if (!named.length) {
    return <div className="hint">{provinces.length ? 'Miền Bắc chỉ có một bảng kết quả.' : 'Không có đài nào.'}</div>;
  }
  const printed = named.filter(p => !skip.includes(p.name)).map(p => p.name);
  return (
    <div className="dai-list">
      {named.map(p => {
        const off = skip.includes(p.name);
        const pos = printed.indexOf(p.name);
        return (
          <div key={p.name} className={off ? 'dai off' : 'dai'}>
            <div className="dai-main">
              <label>
                <input type="checkbox" checked={!off} onChange={e => onToggle(p.name, e.target.checked)} />
                {p.name}
              </label>
              <input className="code" placeholder="VD 35TV40" maxLength={8} value={getCode(p.name)}
                aria-label={`Mã vé ${p.name}`}
                onChange={e => onCode(p.name, e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))} />
            </div>
            {!off && printed.length > 1 && (
              <div className="dai-pos">
                <span>Thứ tự in:</span>
                {printed.map((_, i) => (
                  <button key={i} type="button" className={i === pos ? 'on' : undefined}
                    aria-pressed={i === pos} aria-label={`Đưa ${p.name} về thứ ${i + 1}`}
                    onClick={() => i !== pos && onMoveTo(p.name, i)}>{i + 1}</button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
