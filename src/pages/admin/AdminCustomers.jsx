import { useEffect, useState } from "react";
import { getCustomersRequest, setCustomerStatusRequest } from "../../api/customers.js";

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    getCustomersRequest()
      .then(({ data }) => setCustomers(data.customers))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (id, isActive) => {
    setSavingId(id);
    try {
      const { data } = await setCustomerStatusRequest(id, !isActive);
      setCustomers((prev) => prev.map((c) => (c._id === id ? data.customer : c)));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <h1 className="font-display text-3xl text-ink">Customers</h1>

      {loading ? (
        <p className="mt-10 text-clay">Loading…</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl ring-1 ring-clay/15">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream text-clay">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-clay/10">
              {customers.map((customer) => (
                <tr key={customer._id}>
                  <td className="px-4 py-3 text-ink">{customer.name}</td>
                  <td className="px-4 py-3 text-clay">{customer.email}</td>
                  <td className="px-4 py-3 text-clay">
                    {new Date(customer.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        customer.isActive ? "bg-moss/10 text-moss" : "bg-red-50 text-red-600"
                      }`}
                    >
                      {customer.isActive ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggle(customer._id, customer.isActive)}
                      disabled={savingId === customer._id}
                      className="text-xs text-thread hover:underline disabled:opacity-50"
                    >
                      {customer.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
