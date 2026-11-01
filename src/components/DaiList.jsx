// Danh sách đài để chọn in, gõ mã vé và đổi thứ tự (▲▼). Thứ tự ở đây là thứ tự in trên phiếu.
export default function DaiList({ provinces, skip, onToggle, getCode, onCode, onMove }) {
  const named = provinces.filter(p => p.name);
  if (!named.length) {
    return <div className="hint">{provinces.length ? 'Miền Bắc chỉ có một bảng kết quả.' : 'Không có đài nào.'}</div>;
  }
  return (
    <div className="dai-list">
      {named.map((p, i) => {
        const off = skip.includes(p.name);
        return (
          <div key={p.name} className={off ? 'dai off' : 'dai'}>
            <div className="move">
              <button type="button" title="Đưa lên" aria-label={`Đưa ${p.name} lên`} disabled={i === 0}
                onClick={() => onMove(p.name, -1)}>▲</button>
              <button type="button" title="Đưa xuống" aria-label={`Đưa ${p.name} xuống`} disabled={i === named.length - 1}
                onClick={() => onMove(p.name, 1)}>▼</button>
            </div>
            <label>
              <input type="checkbox" checked={!off} onChange={e => onToggle(p.name, e.target.checked)} />
              {p.name}
            </label>
            <input className="code" placeholder="VD 35TV40" maxLength={8} value={getCode(p.name)}
              onChange={e => onCode(p.name, e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))} />
          </div>
        );
      })}
    </div>
  );
}
