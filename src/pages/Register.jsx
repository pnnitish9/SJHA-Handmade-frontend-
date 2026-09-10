import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import FormField from "../components/FormField.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await register(form);
      navigate("/", { replace: true });
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      setError(apiErrors?.[0]?.message || err.response?.data?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-16">
      <h1 className="font-display text-3xl text-ink">Create your account</h1>
      <p className="mt-2 text-clay">Join to shop handmade pieces and track your orders.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <FormField label="Full name" name="name" value={form.name} onChange={handleChange} required />
        <FormField
          label="Email"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          autoComplete="email"
        />
        <FormField
          label="Phone"
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          autoComplete="tel"
        />
        <FormField
          label="Password"
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          required
          minLength={8}
          autoComplete="new-password"
        />

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-thread py-3 text-cream transition hover:bg-thread/90 disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-clay">
        Already have an account?{" "}
        <Link to="/login" className="text-thread hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
