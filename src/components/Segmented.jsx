import { Fragment } from 'react';

export default function Segmented({ name, options, value, onChange }) {
  return (
    <div className="seg">
      {options.map(o => (
        <Fragment key={o.value}>
          <input type="radio" name={name} id={`${name}-${o.value}`} value={o.value}
            checked={value === o.value} onChange={() => onChange(o.value)} />
          <label htmlFor={`${name}-${o.value}`}>{o.label}<small>{o.sub}</small></label>
        </Fragment>
      ))}
    </div>
  );
}
