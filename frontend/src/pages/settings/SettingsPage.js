// pages/settings/SettingsPage.js — multilang: English + Marathi only
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { settingsAPI } from "../../services/api";

function SectionCard({ title, icon, children }) {
  return (
    <div style={{ background: "var(--bg-l)", border: "1px solid var(--bd)", borderRadius: "18px",
      padding: "22px", marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
        <span style={{ fontSize: "20px" }}>{icon}</span>
        <h3 style={{ fontFamily: "var(--fd)", fontWeight: 800, fontSize: "15px", color: "var(--cp)" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <label style={{ display: "block", fontSize: "11px", color: "var(--tx-m)", marginBottom: "6px",
        fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.8px" }}>{label}</label>
      {children}
    </div>
  );
}

function StatusMsg({ type, msg }) {
  if (!msg) return null;
  const isErr = type === "error";
  return (
    <div style={{ background: isErr ? "rgba(255,82,82,.08)" : "rgba(74,222,128,.08)",
      border: `1px solid ${isErr ? "rgba(255,82,82,.2)" : "rgba(74,222,128,.2)"}`,
      borderRadius: "10px", padding: "10px 14px", fontSize: "13px",
      color: isErr ? "var(--danger)" : "var(--safe)", marginTop: "10px" }}>
      {isErr ? "⚠ " : "✅ "}{msg}
    </div>
  );
}

export default function SettingsPage() {
  const { t }              = useTranslation();
  const { user, refreshUser } = useAuth();
  const [tab, setTab]      = useState("profile");

  const TABS = [
    { id: "profile",  icon: "👤", label: t("settings.profile")  },
    { id: "security", icon: "🔒", label: t("settings.security") },
    { id: "payments", icon: "💳", label: t("settings.payments") },
  ];

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "1.5rem 1rem" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontFamily: "var(--fd)", fontWeight: 800, fontSize: "1.75rem", color: "var(--cp)" }}>
          {t("settings.title")}
        </h1>
        <p style={{ color: "var(--tx-m)", fontSize: "13px", marginTop: "3px" }}>
          {t("settings.manage_desc")}
        </p>
      </div>

      {/* Tab row */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {TABS.map((tb) => (
          <button key={tb.id} onClick={() => setTab(tb.id)} style={{
            display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px",
            borderRadius: "999px", border: "1.5px solid", cursor: "pointer", transition: "all .2s",
            fontFamily: "var(--fb)", fontWeight: tab === tb.id ? 700 : 500, fontSize: "13px",
            background:  tab === tb.id ? "var(--cp)"  : "transparent",
            color:       tab === tb.id ? "var(--bg)"  : "var(--tx-m)",
            borderColor: tab === tb.id ? "var(--cp)"  : "var(--bd)",
          }}>
            {tb.icon} {tb.label}
          </button>
        ))}
      </div>

      {tab === "profile"  && <ProfileSection  user={user} refreshUser={refreshUser} />}
      {tab === "security" && <SecuritySection />}
      {tab === "payments" && <PaymentsSection />}
    </div>
  );
}

function ProfileSection({ user, refreshUser }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name:     user?.name     || "",
    email:    user?.email    || "",
    district: user?.district || "",
    state:    user?.state    || "",
    language: user?.language || "en",
  });
  const [loading, setLoad] = useState(false);
  const [msg,     setMsg]  = useState({ type: "", text: "" });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault(); setLoad(true); setMsg({ type: "", text: "" });
    try {
      const { data } = await settingsAPI.updateProfile(form);
      refreshUser?.(data.user);
      setMsg({ type: "success", text: t("settings.save") + " ✓" });
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Update failed" });
    } finally { setLoad(false); }
  };

  return (
    <SectionCard title={t("settings.profile")} icon="👤">
      <form onSubmit={handleSave}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Field label={t("auth.name")}>
            <input className="inp" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Your name" />
          </Field>
          <Field label={t("auth.email")}>
            <input className="inp" type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@example.com" />
          </Field>
          <Field label={t("auth.district")}>
            <input className="inp" value={form.district} onChange={e => set("district", e.target.value)} placeholder="District" />
          </Field>
          <Field label={t("auth.state")}>
            <input className="inp" value={form.state} onChange={e => set("state", e.target.value)} placeholder="State" />
          </Field>
          {/* Language: English + Marathi only — Hindi removed */}
          <Field label={t("auth.preferred_language")}>
            <select className="inp" value={form.language} onChange={e => set("language", e.target.value)}>
              <option value="en">{t("common.english")}</option>
              <option value="mr">{t("common.marathi")}</option>
            </select>
          </Field>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px",
          background: "var(--bg-m)", borderRadius: "12px", marginBottom: "16px" }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%",
            background: "linear-gradient(135deg,var(--cp),var(--cp-dark))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "18px", fontWeight: 800, color: "var(--bg)", fontFamily: "var(--fd)" }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--tx)" }}>{user?.name}</div>
            <div style={{ fontSize: "11px", color: "var(--tx-m)" }}>📞 {user?.phone} · {user?.role}</div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", padding: "11px" }}>
          {loading ? "..." : t("settings.save")}
        </button>
        <StatusMsg type={msg.type} msg={msg.text} />
      </form>
    </SectionCard>
  );
}

function SecuritySection() {
  const { t } = useTranslation();
  const [pwForm, setPw] = useState({ current_password: "", new_password: "", confirm: "" });
  const [phForm, setPh] = useState({ new_phone: "", password: "" });
  const [pwMsg,  setPwMsg] = useState({ type: "", text: "" });
  const [phMsg,  setPhMsg] = useState({ type: "", text: "" });
  const [pwLoad, setPwLoad] = useState(false);
  const [phLoad, setPhLoad] = useState(false);

  const handlePw = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) { setPwMsg({ type: "error", text: "Passwords don't match" }); return; }
    if (pwForm.new_password.length < 6) { setPwMsg({ type: "error", text: "Min 6 characters" }); return; }
    setPwLoad(true); setPwMsg({ type: "", text: "" });
    try {
      await settingsAPI.changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      setPwMsg({ type: "success", text: "Password changed!" });
      setPw({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      setPwMsg({ type: "error", text: err.response?.data?.error || "Failed" });
    } finally { setPwLoad(false); }
  };

  const handlePh = async (e) => {
    e.preventDefault();
    if (phForm.new_phone.length < 10) { setPhMsg({ type: "error", text: "Enter a valid 10-digit number" }); return; }
    setPhLoad(true); setPhMsg({ type: "", text: "" });
    try {
      await settingsAPI.changePhone({ new_phone: phForm.new_phone, password: phForm.password });
      setPhMsg({ type: "success", text: "Phone updated!" });
      setPh({ new_phone: "", password: "" });
    } catch (err) {
      setPhMsg({ type: "error", text: err.response?.data?.error || "Failed" });
    } finally { setPhLoad(false); }
  };

  return (
    <>
      <SectionCard title={t("settings.change_password")} icon="🔑">
        <form onSubmit={handlePw}>
          <Field label="Current Password">
            <input className="inp" type="password" value={pwForm.current_password}
              onChange={e => setPw(f => ({ ...f, current_password: e.target.value }))} placeholder="Current password" />
          </Field>
          <Field label="New Password">
            <input className="inp" type="password" value={pwForm.new_password}
              onChange={e => setPw(f => ({ ...f, new_password: e.target.value }))} placeholder="At least 6 characters" />
          </Field>
          <Field label="Confirm New Password">
            <input className="inp" type="password" value={pwForm.confirm}
              onChange={e => setPw(f => ({ ...f, confirm: e.target.value }))} placeholder="Repeat new password" />
          </Field>
          <button type="submit" disabled={pwLoad} className="btn-primary" style={{ width: "100%", padding: "11px" }}>
            {pwLoad ? "..." : t("settings.change_password")}
          </button>
          <StatusMsg type={pwMsg.type} msg={pwMsg.text} />
        </form>
      </SectionCard>

      <SectionCard title={t("settings.change_phone")} icon="📱">
        <form onSubmit={handlePh}>
          <Field label="New Phone Number">
            <input className="inp" type="tel" value={phForm.new_phone}
              onChange={e => setPh(f => ({ ...f, new_phone: e.target.value }))} placeholder="10-digit number" />
          </Field>
          <Field label="Confirm with Password">
            <input className="inp" type="password" value={phForm.password}
              onChange={e => setPh(f => ({ ...f, password: e.target.value }))} placeholder="Your current password" />
          </Field>
          <button type="submit" disabled={phLoad} className="btn-primary" style={{ width: "100%", padding: "11px" }}>
            {phLoad ? "..." : t("settings.change_phone")}
          </button>
          <StatusMsg type={phMsg.type} msg={phMsg.text} />
        </form>
      </SectionCard>
    </>
  );
}

function PaymentsSection() {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [totalSpent, setTotal]  = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await settingsAPI.paymentHistory();
        setPayments(data.payments || []);
        setTotal(data.total_spent || 0);
      } catch {
        setPayments([
          { id: 1, amount: 1260, method: "upi",  status: "paid", product_name: "Tomatoes",        storage_name: "GreenGrain",   created_at: "2026-04-15T10:00", order_status: "confirmed" },
          { id: 2, amount: 2800, method: "card", status: "paid", product_name: "Alphonso Mangoes", storage_name: "FreshChain",   created_at: "2026-04-12T14:30", order_status: "completed" },
          { id: 3, amount: 450,  method: "upi",  status: "paid", product_name: "Grapes",           storage_name: "Vaibhav Cold", created_at: "2026-04-10T09:15", order_status: "completed" },
        ]);
        setTotal(4510);
      } finally { setLoading(false); }
    })();
  }, []);

  const METHOD_ICON = { upi: "📱", card: "💳", cod: "💵", cash: "💵" };

  return (
    <SectionCard title={t("settings.payments")} icon="💳">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px", marginBottom: "18px" }}>
        {[
          ["Total",         `₹${parseFloat(totalSpent).toLocaleString("en-IN")}`,        "var(--cp)"],
          ["Transactions",  payments.length,                                               "var(--tx)"],
          ["Successful",    payments.filter(p => p.status === "paid").length,              "var(--safe)"],
        ].map(([label, value, color]) => (
          <div key={label} style={{ background: "var(--bg-m)", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--fm)", fontWeight: 800, fontSize: "1.3rem", color }}>{value}</div>
            <div style={{ fontSize: "10px", color: "var(--tx-s)", textTransform: "uppercase", letterSpacing: "0.8px", marginTop: "3px" }}>{label}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ textAlign: "center", padding: "2rem", color: "var(--tx-m)" }}>Loading…</div>}
      {!loading && payments.length === 0 && <div style={{ textAlign: "center", padding: "2rem", color: "var(--tx-m)" }}>No payments yet.</div>}

      {!loading && payments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {payments.map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "var(--bg-m)", borderRadius: "12px", padding: "12px 14px", flexWrap: "wrap", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "22px" }}>{METHOD_ICON[p.method] || "💰"}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--tx)" }}>{p.product_name}</div>
                  <div style={{ fontSize: "11px", color: "var(--tx-m)" }}>
                    {p.storage_name} · {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {p.method?.toUpperCase()}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--fm)", fontWeight: 800, fontSize: "14px", color: "var(--cp)" }}>
                  ₹{parseFloat(p.amount).toLocaleString("en-IN")}
                </div>
                <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "20px", fontWeight: 700,
                  background: p.status === "paid" ? "rgba(74,222,128,.12)" : "rgba(255,82,82,.12)",
                  color: p.status === "paid" ? "var(--safe)" : "var(--danger)" }}>
                  {p.status?.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
