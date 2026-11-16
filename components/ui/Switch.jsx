'use client';

/** On/off switch (role="switch"). 44px tall touch target around a 28px track. */
export default function Switch({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="mm-focus inline-flex h-11 w-[52px] shrink-0 cursor-pointer items-center rounded-full disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span
        className={`flex h-7 w-[52px] items-center rounded-full p-0.5 transition-colors duration-200 ${
          checked ? 'bg-(--mm-brand)' : 'bg-(--mm-line)'
        }`}
      >
        <span
          className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-0'}`}
        />
      </span>
    </button>
  );
}
