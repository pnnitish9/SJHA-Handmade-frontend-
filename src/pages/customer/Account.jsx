import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Plus } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import FormField from "../../components/FormField.jsx";
import AddressForm from "../../components/AddressForm.jsx";
import { updateMeRequest, addAddressRequest, deleteAddressRequest } from "../../api/auth.js";

export default function Account() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "" });
  const [saved, setSaved] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { data } = await updateMeRequest(form);
    setUser(data.user);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddAddress = async (address) => {
    setAddingAddress(true);
    try {
      const { data } = await addAddressRequest(address);
      setUser({ ...user, addresses: data.addresses });
      setShowAddressForm(false);
    } finally {
      setAddingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    const { data } = await deleteAddressRequest(addressId);
    setUser({ ...user, addresses: data.addresses });
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
      <h1 className="font-display text-3xl text-ink">Your account</h1>
      <p className="mt-2 text-clay">{user?.email}</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <FormField label="Full name" name="name" value={form.name} onChange={handleChange} />
        <FormField label="Phone" name="phone" value={form.phone} onChange={handleChange} />

        <button
          type="submit"
          className="w-full rounded-full bg-thread py-2.5 text-cream transition hover:bg-thread/90 sm:w-auto sm:px-6"
        >
          Save changes
        </button>
        {saved && <span className="ml-3 text-sm text-moss">Saved.</span>}
      </form>

      <div className="mt-12 border-t border-clay/20 pt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-ink">Saved addresses</h2>
          {!showAddressForm && (
            <button
              onClick={() => setShowAddressForm(true)}
              className="flex items-center gap-1 text-sm text-thread"
            >
              <Plus size={14} /> Add address
            </button>
          )}
        </div>

        {showAddressForm && (
          <div className="mt-4">
            <AddressForm
              onSubmit={handleAddAddress}
              onCancel={() => setShowAddressForm(false)}
              submitting={addingAddress}
            />
          </div>
        )}

        {user?.addresses?.length ? (
          <div className="mt-4 space-y-3">
            {user.addresses.map((addr) => (
              <div
                key={addr._id}
                className="flex items-start justify-between gap-4 rounded-lg bg-cream p-4 ring-1 ring-clay/15"
              >
                <div className="text-sm text-ink">
                  <p className="font-medium">
                    {addr.fullName} {addr.isDefault && <span className="text-thread">· Default</span>}
                  </p>
                  <p className="text-clay">{addr.phone}</p>
                  <p className="text-clay">
                    {addr.line1}
                    {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} {addr.postalCode}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteAddress(addr._id)}
                  aria-label="Delete address"
                  className="shrink-0 text-clay hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          !showAddressForm && <p className="mt-4 text-clay">No addresses saved yet — add one at checkout.</p>
        )}
      </div>

      <div className="mt-8 border-t border-clay/20 pt-8">
        <h2 className="font-display text-xl text-ink">Orders</h2>
        <p className="mt-2 text-clay">Track past and current orders.</p>
        <Link to="/orders" className="mt-3 inline-block text-sm text-thread hover:underline">
          View order history →
        </Link>
      </div>
    </div>
  );
}
