import React from "react";

export function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/60">
      <h2 className="text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-100">
        {title}
      </h2>
      {hint && <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p>}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}): JSX.Element {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-emerald-600"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="min-w-0">
        <span className="block text-sm text-slate-800 dark:text-slate-200">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}

export function Choice<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
}): JSX.Element {
  return (
    <label className="flex items-center justify-between gap-4">
      <span className="min-w-0">
        <span className="block text-sm text-slate-800 dark:text-slate-200">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {hint}
          </span>
        )}
      </span>
      <select
        className="shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
