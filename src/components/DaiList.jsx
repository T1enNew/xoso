import { useRef, useState } from 'react';

const GAP = 6; // khoảng cách giữa các thanh (px), trùng với .dai-list gap
const DRAG_START_PX = 5; // chuột phải di chuyển chừng này mới tính là kéo (để bấm tick vẫn được)

// Danh sách đài để chọn in, gõ mã vé và đổi thứ tự bằng cách kéo thả.
// Thứ tự trong danh sách là thứ tự in trên phiếu (từ trái sang).
// Máy tính: kéo cả thanh. Điện thoại: kéo ở tay nắm ⠿ (chỗ khác vẫn vuốt cuộn trang được).
export default function DaiList({ provinces, skip, onToggle, getCode, onCode, onReorder }) {
  const named = provinces.filter(p => p.name);
  const rowRefs = useRef([]);
  const dragRef = useRef(null); // { idx, startY, rects, pointerId, active }
  const justDragged = useRef(false);
  const [drag, setDrag] = useState(null); // { idx, dy, to }

  if (!named.length) {
    return <div className="hint">{provinces.length ? 'Miền Bắc chỉ có một bảng kết quả.' : 'Không có đài nào.'}</div>;
  }
  const names = named.map(p => p.name);

  const commit = (from, to) => {
    if (from === to) return;
    const next = names.filter((_, i) => i !== from);
    next.splice(to, 0, names[from]);
    onReorder(next);
  };

  const onPointerDown = (e, idx) => {
    if (e.button !== 0 || named.length < 2) return;
    const onGrip = !!e.target.closest('.grip');
    // Ô mã vé để gõ chữ; cảm ứng thì chỉ kéo ở tay nắm cho trang vẫn cuộn được
    if (e.target.closest('.code') || (e.pointerType !== 'mouse' && !onGrip)) return;
    dragRef.current = {
      idx, startY: e.clientY, pointerId: e.pointerId, el: e.currentTarget, active: false,
      rects: rowRefs.current.slice(0, named.length).map(el => el.getBoundingClientRect()),
    };
    // Cảm ứng ở tay nắm: kéo luôn. Chuột: chờ di chuyển đủ xa mới kéo, để bấm ô tick vẫn ăn
    if (onGrip && e.pointerType !== 'mouse') startDrag(dragRef.current);
  };

  // Chỉ giữ con trỏ khi đã thật sự kéo: giữ sớm thì cú bấm rơi vào thanh chứ không vào ô tick
  const startDrag = d => {
    d.active = true;
    try { d.el.setPointerCapture(d.pointerId); } catch { /* không giữ được thì kéo trong phạm vi thanh */ }
    setDrag({ idx: d.idx, dy: 0, to: d.idx });
  };

  const onPointerMove = e => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dy = e.clientY - d.startY;
    if (!d.active) {
      if (Math.abs(dy) < DRAG_START_PX) return;
      startDrag(d);
    }
    e.preventDefault();
    // Vị trí mới: đếm số thanh khác có tâm nằm trên tâm thanh đang kéo
    const r = d.rects[d.idx];
    const center = r.top + r.height / 2 + dy;
    d.to = d.rects.filter((x, i) => i !== d.idx && x.top + x.height / 2 < center).length;
    setDrag({ idx: d.idx, dy, to: d.to });
  };

  const onPointerUp = e => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    dragRef.current = null;
    if (d.active) {
      justDragged.current = true; // khỏi tính là bấm vào ô tick khi vừa thả
      setTimeout(() => { justDragged.current = false; }, 0);
      if (e.type === 'pointerup') commit(d.idx, d.to ?? d.idx);
    }
    setDrag(null);
  };

  // Bàn phím: đứng ở tay nắm, bấm mũi tên lên/xuống để đổi chỗ
  const onGripKey = (e, idx) => {
    const to = e.key === 'ArrowUp' ? idx - 1 : e.key === 'ArrowDown' ? idx + 1 : -1;
    if (to < 0 || to >= named.length) return;
    e.preventDefault();
    commit(idx, to);
  };

  // Thanh đang kéo đi theo tay; các thanh nằm giữa chỗ cũ và chỗ mới dạt lên/xuống nhường chỗ
  const shiftOf = i => {
    if (!drag) return 0;
    if (i === drag.idx) return drag.dy;
    const h = (dragRef.current?.rects[drag.idx]?.height || 0) + GAP;
    if (drag.idx < drag.to && i > drag.idx && i <= drag.to) return -h;
    if (drag.idx > drag.to && i >= drag.to && i < drag.idx) return h;
    return 0;
  };

  return (
    <div className={drag ? 'dai-list sorting' : 'dai-list'}>
      {named.map((p, i) => {
        const off = skip.includes(p.name);
        const dy = shiftOf(i);
        const cls = ['dai', off && 'off', drag?.idx === i && 'dragging'].filter(Boolean).join(' ');
        return (
          <div key={p.name} className={cls} ref={el => { rowRefs.current[i] = el; }}
            style={dy ? { transform: `translateY(${dy}px)` } : undefined}
            onPointerDown={e => onPointerDown(e, i)} onPointerMove={onPointerMove}
            onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
            onClickCapture={e => { if (justDragged.current) { e.preventDefault(); e.stopPropagation(); } }}>
            <button type="button" className="grip" aria-label={`Kéo để đổi chỗ ${p.name} (hoặc bấm mũi tên lên/xuống)`}
              title="Kéo để đổi chỗ" onKeyDown={e => onGripKey(e, i)}>
              <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true">
                {[3, 8, 13].flatMap(y => [<circle key={'a' + y} cx="2.5" cy={y} r="1.5" />, <circle key={'b' + y} cx="7.5" cy={y} r="1.5" />])}
              </svg>
            </button>
            <label>
              <input type="checkbox" checked={!off} onChange={e => onToggle(p.name, e.target.checked)} />
              {p.name}
            </label>
            <input className="code" placeholder="VD 35TV40" maxLength={8} value={getCode(p.name)}
              aria-label={`Mã vé ${p.name}`}
              onChange={e => onCode(p.name, e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))} />
          </div>
        );
      })}
    </div>
  );
}
