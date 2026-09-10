import { useEffect, useState } from "react";
import { Check, X, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { getAllCustomOrdersRequest, respondToCustomOrderRequest } from "../../api/customOrders.js";

const STATUS_STYLES = {
  submitted:     "bg-sky-50 text-sky-700 ring-sky-200",
  in_discussion: "bg-amber-50 text-amber-700 ring-amber-200",
  approved:      "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected:      "bg-red-50 text-red-600 ring-red-200",
  converted:     "bg-purple-50 text-purple-700 ring-purple-200",
};

const STATUS_LABELS = {
  submitted:     "Submitted",
  in_discussion: "In Discussion",
  approved:      "Approved",
  rejected:      "Rejected",
  converted:     "Converted",
};

const ALL_STATUSES = ["submitted", "in_discussion", "approved", "rejected", "converted"];

function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || "bg-oat text-ink ring-clay/20";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${cls}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function AdminCustomOrders() {
  const [requests, setRequests]       = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading]         = useState(true);
  const [expandedId, setExpandedId]   = useState(null);

  // Per-card note drafts and saving state
  const [notesDraft, setNotesDraft]   = useState({});
  const [quoteDraft, setQuoteDraft]   = useState({});  // { [id]: priceString }
  const [savingId, setSavingId]       = useState(null);
  const [savedId, setSavedId]         = useState(null); // brief "Saved ✓" flash

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getAllCustomOrdersRequest(
        statusFilter ? { status: statusFilter } : {}
      );
      setRequests(data.customOrders);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleExpand = (id) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const [acceptError, setAcceptError] = useState({});  // { [id]: message }

  // Send only a status change (with current draft notes attached)
  const handleStatusChange = async (id, status) => {
    if (status === "rejected") {
      if (!window.confirm("Reject this custom order request? The customer will be notified.")) return;
    }
    if (status === "approved") {
      const price = Number(quoteDraft[id]);
      if (!price || price <= 0) {
        setAcceptError((prev) => ({ ...prev, [id]: "Enter a quoted price before accepting." }));
        return;
      }
      setAcceptError((prev) => ({ ...prev, [id]: "" }));
    }
    setSavingId(id);
    try {
      const { data } = await respondToCustomOrderRequest(id, {
        status,
        adminNotes: notesDraft[id] ?? requests.find((r) => r._id === id)?.adminNotes ?? "",
        quotedPrice: status === "approved" ? Number(quoteDraft[id]) : undefined,
      });
      setRequests((prev) => prev.map((r) => (r._id === id ? data.customOrder : r)));
    } finally {
      setSavingId(null);
    }
  };

  // Save notes without changing status
  const handleSaveNotes = async (id) => {
    const req = requests.find((r) => r._id === id);
    if (!req) return;
    setSavingId(id);
    try {
      const { data } = await respondToCustomOrderRequest(id, {
        adminNotes: notesDraft[id] ?? req.adminNotes ?? "",
      });
      setRequests((prev) => prev.map((r) => (r._id === id ? data.customOrder : r)));
      setSavedId(id);
      setTimeout(() => setSavedId((cur) => (cur === id ? null : cur)), 2500);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-ink">Custom order requests</h1>
          <p className="mt-1 text-sm text-clay">
            Review, accept, reject, and reply to customer custom requests.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-clay/30 bg-cream px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Stats strip */}
      {!loading && requests.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-3">
          {ALL_STATUSES.map((s) => {
            const count = requests.filter((r) => r.status === s).length;
            if (!count) return null;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
                className={`rounded-full px-3 py-1 text-xs ring-1 transition ${
                  statusFilter === s
                    ? STATUS_STYLES[s]
                    : "bg-oat text-clay ring-clay/20 hover:ring-clay/40"
                }`}
              >
                {STATUS_LABELS[s]} · {count}
              </button>
            );
          })}
        </div>
      )}

      {/* List */}
      {loading ? (
        <p className="mt-10 text-clay">Loading…</p>
      ) : requests.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-clay/30 py-16 text-center">
          <p className="text-clay">No requests found.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {requests.map((req) => {
            const isExpanded = expandedId === req._id;
            const isSaving   = savingId === req._id;
            const justSaved  = savedId === req._id;
            const currentNote = notesDraft[req._id] ?? req.adminNotes ?? "";

            return (
              <div
                key={req._id}
                className="overflow-hidden rounded-xl bg-cream ring-1 ring-clay/15"
              >
                {/* Summary row */}
                <button
                  type="button"
                  onClick={() => toggleExpand(req._id)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
                >
                  <div className="flex flex-1 items-center gap-3 min-w-0">
                    <StatusBadge status={req.status} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{req.productType}</p>
                      <p className="text-xs text-clay">
                        {req.customer?.name} · {req.customer?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-xs text-clay">
                    <span>
                      {new Date(req.createdAt).toLocaleDateString(undefined, {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </span>
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </div>
                </button>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="border-t border-clay/15 px-4 pb-5 pt-4 sm:px-5">

                    {/* Request details */}
                    <p className="text-sm text-clay">{req.description}</p>

                    {(req.preferredColor || req.preferredSize || req.budget) && (
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
                        {req.preferredColor && (
                          <div>
                            <dt className="text-clay">Colour</dt>
                            <dd className="text-ink">{req.preferredColor}</dd>
                          </div>
                        )}
                        {req.preferredSize && (
                          <div>
                            <dt className="text-clay">Size</dt>
                            <dd className="text-ink">{req.preferredSize}</dd>
                          </div>
                        )}
                        {req.budget && (
                          <div>
                            <dt className="text-clay">Budget</dt>
                            <dd className="text-ink">₹{req.budget}</dd>
                          </div>
                        )}
                      </dl>
                    )}

                    {req.referenceImages?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {req.referenceImages.map((img, i) => (
                          <a key={i} href={img.url} target="_blank" rel="noreferrer">
                            <img
                              src={img.url}
                              alt={`Reference ${i + 1}`}
                              className="h-20 w-20 rounded-lg object-cover ring-1 ring-clay/15 hover:ring-thread transition"
                            />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Notes textarea */}
                    <div className="mt-5">
                      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-ink">
                        <MessageSquare size={14} />
                        Reply / notes to customer
                      </label>
                      <textarea
                        value={currentNote}
                        onChange={(e) =>
                          setNotesDraft((prev) => ({ ...prev, [req._id]: e.target.value }))
                        }
                        rows={3}
                        placeholder="Write a message to the customer (optional)…"
                        className="w-full rounded-lg border border-clay/30 bg-oat px-3 py-2 text-sm text-ink placeholder:text-clay/50 focus:border-thread focus:outline-none"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveNotes(req._id)}
                          disabled={isSaving}
                          className="rounded-full border border-clay/30 px-4 py-1.5 text-xs text-ink hover:border-thread hover:text-thread disabled:opacity-50"
                        >
                          {isSaving ? "Saving…" : justSaved ? "Saved ✓" : "Save note"}
                        </button>
                      </div>
                    </div>

                    {/* Accept / Reject + other status actions */}
                    <div className="mt-5 flex flex-wrap items-start gap-3 border-t border-clay/15 pt-4">
                      <span className="mt-2 text-xs text-clay">Change status:</span>

                      {/* Primary actions: Accept & Reject */}
                      {!["approved", "rejected", "converted"].includes(req.status) && (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            {/* Quoted price — required before accepting */}
                            <div className="flex items-center gap-1.5 rounded-lg border border-clay/30 bg-oat px-2 py-1.5">
                              <span className="text-xs text-clay">₹</span>
                              <input
                                type="number"
                                min="1"
                                placeholder="Quote price"
                                value={quoteDraft[req._id] ?? ""}
                                onChange={(e) =>
                                  setQuoteDraft((prev) => ({ ...prev, [req._id]: e.target.value }))
                                }
                                className="w-28 bg-transparent text-xs text-ink placeholder:text-clay/50 focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(req._id, "approved")}
                              disabled={isSaving}
                              className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <Check size={13} />
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(req._id, "rejected")}
                              disabled={isSaving}
                              className="flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              <X size={13} />
                              Reject
                            </button>
                          </div>
                          {acceptError[req._id] && (
                            <p className="text-xs text-red-600">{acceptError[req._id]}</p>
                          )}
                        </div>
                      )}

                      {/* Already approved — show the quoted price */}
                      {req.status === "approved" && req.quotedPrice && (
                        <p className="mt-1 text-xs text-emerald-700">
                          Quoted price sent to customer: <strong>₹{req.quotedPrice}</strong> — awaiting payment
                        </p>
                      )}

                      {/* Secondary: full status dropdown for edge-case adjustments */}
                      <select
                        value=""
                        onChange={(e) => e.target.value && handleStatusChange(req._id, e.target.value)}
                        disabled={isSaving}
                        className="rounded-lg border border-clay/30 bg-oat px-3 py-1.5 text-xs text-ink"
                      >
                        <option value="">Other status…</option>
                        {ALL_STATUSES.filter((s) => s !== req.status).map((s) => (
                          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                        ))}
                      </select>
                    </div>

                    {/* Outcome message */}
                    {req.status === "approved" && (
                      <p className="mt-3 text-xs text-emerald-700">
                        ✓ Accepted — customer has been notified.
                        {req.quotedPrice && ` Quoted price: ₹${req.quotedPrice}.`}
                      </p>
                    )}
                    {req.status === "rejected" && (
                      <p className="mt-3 text-xs text-red-600">
                        ✕ Rejected — customer has been notified.
                      </p>
                    )}
                    {req.status === "converted" && req.convertedOrder && (
                      <p className="mt-3 text-xs text-purple-700">
                        ✓ Paid — order{" "}
                        <strong>
                          {req.convertedOrder?.orderNumber || req.convertedOrder}
                        </strong>{" "}
                        created. Track it in{" "}
                        <a
                          href={`/admin/orders`}
                          className="underline hover:text-purple-900"
                        >
                          Admin → Orders
                        </a>
                        .
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
