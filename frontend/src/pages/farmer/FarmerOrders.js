// pages/farmer/FarmerOrders.js — Orders placed by customers for a farmer's products
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Package, User, Phone, MapPin, Truck, ShoppingBag } from "lucide-react";
import { farmerAPI } from "../../services/api";
import { Card } from "../../components/ui/Card";
import { Container } from "../../components/ui/Container";
import Reveal from "../../components/ui/Reveal";
import { RevealGroup, RevealItem } from "../../components/ui/RevealGroup";

function StatusBadge({ status, t }) {
  const map = {
    pending: { cls: "bg-warn-bg text-warn", label: t("orders.status_pending") },
    confirmed: { cls: "bg-safe-bg text-safe", label: t("orders.status_confirmed") },
    in_transit: { cls: "bg-info-bg text-info", label: t("orders.status_in_transit") },
    delivered: { cls: "bg-safe-bg text-safe", label: t("orders.status_delivered") },
    rejected: { cls: "bg-danger-bg text-danger", label: t("orders.status_rejected") },
    cancelled: { cls: "bg-surface-muted text-ink-muted", label: t("orders.status_cancelled") },
  };
  const cfg = map[status] || map.pending;
  return <span className={`rounded-pill px-2.5 py-0.5 text-[11px] font-bold ${cfg.cls}`}>{cfg.label}</span>;
}

export default function FarmerOrders() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data } = await farmerAPI.getCustomerOrders();
      setOrders(data.orders || []);
    } catch (err) {
      console.error("Failed to load orders:", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "pending") return o.status === "pending";
    if (filter === "confirmed") return o.status === "confirmed" || o.status === "in_transit";
    if (filter === "delivered") return o.status === "delivered";
    return true;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed" || o.status === "in_transit").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  };

  const STAT_CARDS = [
    { label: t("orders.total_orders"), value: stats.total, cls: "text-accent" },
    { label: t("orders.pending"), value: stats.pending, cls: "text-warn" },
    { label: t("orders.active"), value: stats.confirmed, cls: "text-info" },
    { label: t("orders.delivered"), value: stats.delivered, cls: "text-safe" },
  ];

  const FILTERS = [
    { id: "all", label: t("orders.all_orders"), count: stats.total },
    { id: "pending", label: t("orders.pending"), count: stats.pending },
    { id: "confirmed", label: t("orders.active"), count: stats.confirmed },
    { id: "delivered", label: t("orders.delivered"), count: stats.delivered },
  ];

  return (
    <Container className="max-w-[1000px] py-6">
      <Reveal className="mb-6">
        <h1 className="mb-1.5 flex items-center gap-2 font-display text-2xl font-extrabold text-ink">
          <ShoppingBag size={22} className="text-accent" /> {t("orders.title")}
        </h1>
        <p className="text-[13px] text-ink-muted">{t("orders.subtitle")}</p>
      </Reveal>

      <RevealGroup className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4" stagger={0.06}>
        {STAT_CARDS.map((s, i) => (
          <RevealItem key={i}>
            <Card className="p-4">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{s.label}</div>
              <div className={`font-mono text-[1.75rem] font-extrabold ${s.cls}`}>{s.value}</div>
            </Card>
          </RevealItem>
        ))}
      </RevealGroup>

      <Reveal delay={0.06} className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-md border-[1.5px] px-4 py-2 text-[13px] font-semibold transition-all duration-150 ${
              filter === f.id ? "border-accent bg-accent-pale text-accent" : "border-line bg-surface-light text-ink-muted hover:border-accent/40"
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span
                className="ml-1.5 rounded-pill px-1.5 py-0.5 text-[11px] font-bold"
                style={{ background: filter === f.id ? "var(--cp)" : "var(--bg-m)", color: filter === f.id ? "#fff" : "var(--tx-m)" }}
              >
                {f.count}
              </span>
            )}
          </button>
        ))}
      </Reveal>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="skel" style={{ height: "140px", borderRadius: "14px" }} />)}
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-5 py-16 text-center">
          <Package size={32} className="text-ink-soft" />
          <div className="font-display text-base font-bold text-ink">
            {t("orders.no_orders", { filter: filter !== "all" ? FILTERS.find((f) => f.id === filter)?.label.toLowerCase() : "" })}
          </div>
          <p className="text-[13px] text-ink-muted">{t("orders.no_orders_desc")}</p>
        </Card>
      ) : (
        <RevealGroup className="flex flex-col gap-3" stagger={0.05}>
          {filteredOrders.map((order) => (
            <RevealItem key={order.id}>
              <Card className="p-4.5">
                <div className="mb-3.5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 text-[15px] font-bold text-ink">{order.product_name}</div>
                    <div className="text-xs text-ink-muted">
                      {t("orders.order_hash")} #{order.id} · {new Date(order.created_at).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                  <StatusBadge status={order.status} t={t} />
                </div>

                <div className="mb-3 rounded-md bg-surface-muted p-3">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                    {t("orders.customer_details")}
                  </div>
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                    <User size={13} /> {order.customer_name}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                    <Phone size={12} /> {order.customer_phone}
                  </div>
                  {order.delivery_address && (
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
                      <MapPin size={12} /> {order.delivery_address}
                    </div>
                  )}
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {[
                    [t("orders.quantity"), `${order.quantity_kg} kg`],
                    [t("orders.price_per_kg"), `₹${parseFloat(order.price_per_kg || 0).toFixed(2)}`],
                    [t("orders.total_amount"), `₹${parseFloat(order.total_amount || 0).toLocaleString("en-IN")}`],
                    [t("orders.delivery_date"), order.delivery_date ? new Date(order.delivery_date).toLocaleDateString("en-IN") : "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md bg-surface-muted p-2.5">
                      <div className="mb-0.5 text-[10px] uppercase tracking-wide text-ink-soft">{label}</div>
                      <div className="font-mono text-[13px] font-semibold text-ink">{value}</div>
                    </div>
                  ))}
                </div>

                {order.delivery_boy_name && (
                  <div className="rounded-md border border-info/25 bg-info-bg p-2.5">
                    <div className="mb-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-info">
                      <Truck size={12} /> {t("orders.delivery_assigned")}
                    </div>
                    <div className="text-xs text-ink">{order.delivery_boy_name} · {order.delivery_boy_phone}</div>
                  </div>
                )}

                {order.notes && (
                  <div className="mt-2 rounded-md bg-surface-muted p-2.5 text-xs text-ink-muted">
                    <strong className="text-ink">{t("orders.note")}:</strong> {order.notes}
                  </div>
                )}
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </Container>
  );
}
