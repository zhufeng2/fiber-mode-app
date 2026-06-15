interface Props {
  density: number;
  scale: number;
  onDensity: (v: number) => void;
  onScale: (v: number) => void;
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-[var(--border-strong)] accent-[var(--accent)]"
      />
    </div>
  );
}

/** Persistent, centered controls for polarization-arrow count + size (live). */
export default function ArrowControls({ density, scale, onDensity, onScale }: Props) {
  return (
    <div className="flex justify-center pt-3">
      <div className="panel flex items-center gap-4 rounded-xl px-4 py-1.5">
        <span className="text-[11px] font-semibold text-[var(--text-dim)]">⤢ Polarization</span>
        <Slider label="Count" value={density} min={0} max={1} step={0.05} onChange={onDensity} />
        <Slider label="Size" value={scale} min={0.5} max={2.5} step={0.1} onChange={onScale} />
      </div>
    </div>
  );
}
