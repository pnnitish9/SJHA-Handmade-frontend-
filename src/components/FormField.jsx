export default function FormField({ label, error, ...inputProps }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink/80">{label}</span>
      <input
        {...inputProps}
        className={`w-full rounded-lg border bg-cream px-4 py-2.5 text-ink placeholder:text-clay/60 focus:border-thread ${
          error ? "border-red-400" : "border-clay/30"
        }`}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
