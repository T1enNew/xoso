// Danh sách đài để chọn in và gõ mã vé
export default function DaiList({ provinces, skip, onToggle, getCode, onCode }) {
  const named = provinces.filter(p => p.name);
  if (!named.length) {
    return <div className="hint">{provinces.length ? 'Miền Bắc chỉ có một bảng kết quả.' : 'Không có đài nào.'}</div>;
  }
  return (
    <div className="dai-list">
      {named.map(p => {
        const off = skip.includes(p.name);
        return (
          <div key={p.name} className={off ? 'dai off' : 'dai'}>
            <label>
              <input type="checkbox" checked={!off} onChange={e => onToggle(p.name, e.target.checked)} />
              {p.name}
            </label>
            <input className="code" placeholder="Mã vé" value={getCode(p.name)}
              onChange={e => onCode(p.name, e.target.value)} />
          </div>
        );
      })}
    </div>
  );
}
