const STYLES = {
  placed: "bg-clay/10 text-clay",
  confirmed: "bg-moss/10 text-moss",
  processing: "bg-moss/10 text-moss",
  shipped: "bg-thread/10 text-thread",
  delivered: "bg-moss/15 text-moss",
  cancelled: "bg-red-50 text-red-600",
  returned: "bg-red-50 text-red-600",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs capitalize ${STYLES[status] || "bg-clay/10 text-clay"}`}>
      {status}
    </span>
  );
}
