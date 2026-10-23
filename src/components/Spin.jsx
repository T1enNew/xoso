import { useLayoutEffect, useRef } from 'react';

const randDigits = len => Array.from({ length: len }, () => Math.floor(Math.random() * 10)).join('');

// Một bộ đếm chung cho mọi ô xoay, đổi chữ thẳng trên DOM để khỏi render lại cả trang 12 lần mỗi giây
const spinning = new Set();
const draw = el => { el.textContent = el.dataset.pre + randDigits(+el.dataset.len); };
setInterval(() => spinning.forEach(draw), 80);

// Ô số đang xoay; pre là các chữ số đã ra của số đang quay dở
export function Spin({ len, pre = '', className = '' }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    draw(el);
    spinning.add(el);
    return () => spinning.delete(el);
  }, [len, pre]);
  return <span ref={ref} className={`${className} spin`.trim()} data-len={len - pre.length} data-pre={pre} />;
}

// Số đã ra đủ chữ số thì in, chưa ra hoặc đang quay dở thì xoay
export function Num({ v, len, className }) {
  if (v && v.length >= len) return className ? <span className={className}>{v}</span> : v;
  return <Spin len={len} pre={v || ''} className={className} />;
}
