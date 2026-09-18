const STYLES = {
  // Order statuses
  payment_pending:      "bg-amber-100 text-amber-700",
  payment_verification: "bg-amber-100 text-amber-800",
  placed:               "bg-clay/10 text-clay",
  confirmed:            "bg-moss/10 text-moss",
  processing:           "bg-moss/10 text-moss",
  shipped:              "bg-thread/10 text-thread",
  delivered:            "bg-moss/15 text-moss",
  payment_failed:       "bg-red-50 text-red-600",
  cancelled:            "bg-red-50 text-red-600",
  returned:             "bg-red-50 text-red-600",
};

const LABELS = {
  payment_pending:      "Awaiting Payment",
  payment_verification: "Verifying Payment",
  payment_failed:       "Payment Failed",
};

export default function StatusBadge({ status }) {
  const label = LABELS[status] || status;
  return (
    <span className={`rounded-full px-3 py-1 text-xs capitalize ${STYLES[status] || "bg-clay/10 text-clay"}`}>
      {label}
    </span>
  );
}
