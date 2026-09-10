import { useState } from "react";
import FormField from "./FormField.jsx";

const emptyAddress = {
  label: "Home",
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  isDefault: false,
};

export default function AddressForm({ onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState(emptyAddress);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-cream p-5 ring-1 ring-clay/15">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Full name" name="fullName" value={form.fullName} onChange={handleChange} required />
        <FormField label="Phone" name="phone" value={form.phone} onChange={handleChange} required />
      </div>
      <FormField label="Address line 1" name="line1" value={form.line1} onChange={handleChange} required />
      <FormField label="Address line 2 (optional)" name="line2" value={form.line2} onChange={handleChange} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="City" name="city" value={form.city} onChange={handleChange} required />
        <FormField label="State" name="state" value={form.state} onChange={handleChange} required />
        <FormField label="Postal code" name="postalCode" value={form.postalCode} onChange={handleChange} required />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="isDefault" checked={form.isDefault} onChange={handleChange} />
        Set as default address
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-thread px-5 py-2 text-sm text-cream hover:bg-thread/90 disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save address"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-sm text-clay hover:text-ink">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
