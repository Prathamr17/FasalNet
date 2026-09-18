// pages/settings/SettingsPage.js — multilang: English + Marathi only
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Lock, CreditCard, AlertCircle, CheckCircle2, Smartphone,
  IndianRupee, Receipt, ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { settingsAPI } from "../../services/api";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { Container } from "../../components/ui/Container";
import Reveal from "../../components/ui/Reveal";

function SectionCard({ title, Icon, children }) {
  return (
    <Reveal>
      <Card className="mb-4 p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-pale text-accent">
            <Icon size={17} />
          </span>
          <h3 className="font-display text-base font-extrabold text-ink">{title}</h3>
        </div>
        {children}
      </Card>
    </Reveal>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3.5">
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{label}</label>
      {children}
    </div>
  );
}

function StatusMsg({ type, msg }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className={`mt-2.5 flex items-center gap-2 overflow-hidden rounded-md border px-3.5 py-2.5 text-[13px] ${
            type === "error" ? "border-danger bg-danger-bg text-danger" : "border-safe bg-safe-bg text-safe"
          }`}
        >
          {type === "error" ? <AlertCircle size={14} className="shrink-0" /> : <CheckCircle2 size={14} className="shrink-0" />}
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState("profile");

  const TABS = [
    { id: "profile", Icon: User, label: t("settings.profile") },
    { id: "security", Icon: Lock, label: t("settings.security") },
    { id: "payments", Icon: CreditCard, label: t("settings.payments") },
  ];

  return (
    <Container className="max-w-[720px] py-8">
      <Reveal className="mb-6">
        <h1 className="font-display text-[1.75rem] font-extrabold text-ink">{t("settings.title")}</h1>
        <p className="mt-1 text-[13px] text-ink-muted">{t("settings.manage_desc")}</p>
      </Reveal>

      <Reveal delay={0.05} className="relative mb-6 flex flex-wrap gap-1.5 rounded-md bg-surface-muted p-1.5">
        {TABS.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className="relative z-10 flex items-center gap-1.5 rounded-md px-4 py-2 text-[13px] transition-colors duration-150"
            style={{ color: tab === tb.id ? "var(--cp-text)" : "var(--tx-m)", fontWeight: tab === tb.id ? 700 : 500 }}
          >
            {tab === tb.id && (
              <motion.span
                layoutId="fn-settings-tab-indicator"
                className="absolute inset-0 -z-10 rounded-md bg-accent"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <tb.Icon size={14} /> {tb.label}
          </button>
        ))}
      </Reveal>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
          {tab === "profile" && <ProfileSection user={user} refreshUser={refreshUser} t={t} />}
          {tab === "security" && <SecuritySection t={t} />}
          {tab === "payments" && <PaymentsSection t={t} />}
        </motion.div>
      </AnimatePresence>
    </Container>
  );
}

function ProfileSection({ user, refreshUser, t }) {
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    district: user?.district || "",
    state: user?.state || "",
    language: user?.language || "en",
  });
  const [loading, setLoad] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    setLoad(true);
    setMsg({ type: "", text: "" });
    try {
      const { data } = await settingsAPI.updateProfile(form);
      refreshUser?.(data.user);
      setMsg({ type: "success", text: t("settings.save") + " ✓" });
    } catch (err) {
      setMsg({ type: "error", text: err.response?.data?.error || "Update failed" });
    } finally {
      setLoad(false);
    }
  };

  return (
    <SectionCard title={t("settings.profile")} Icon={User}>
      <form onSubmit={handleSave}>
        <div className="mb-4 flex items-center gap-3 rounded-md border border-line bg-surface-light p-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent font-display text-lg font-extrabold text-accent-fg">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-semibold text-ink">{user?.name}</div>
            <div className="flex items-center gap-1 text-[11px] text-ink-muted">
              <Smartphone size={11} /> {user?.phone} · {user?.role}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Field label={t("auth.name")}>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" />
          </Field>
          <Field label={t("auth.email")}>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@example.com" />
          </Field>
          <Field label={t("auth.district")}>
            <Input value={form.district} onChange={(e) => set("district", e.target.value)} placeholder="District" />
          </Field>
          <Field label={t("auth.state")}>
            <Input value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="State" />
          </Field>
          <Field label={t("auth.preferred_language")}>
            <select
              value={form.language}
              onChange={(e) => set("language", e.target.value)}
              className="w-full rounded-sm border-[1.5px] border-line bg-surface-light px-3.5 py-2.5 text-sm text-ink outline-none transition-all focus:border-accent focus:shadow-glow-accent"
            >
              <option value="en">{t("common.english")}</option>
              <option value="mr">{t("common.marathi")}</option>
            </select>
          </Field>
        </div>

        <Button type="submit" disabled={loading} className="mt-1 w-full justify-center py-3 text-sm">
          {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : t("settings.save")}
        </Button>
        <StatusMsg type={msg.type} msg={msg.text} />
      </form>
    </SectionCard>
  );
}

function SecuritySection({ t }) {
  const [pwForm, setPw] = useState({ current_password: "", new_password: "", confirm: "" });
  const [phForm, setPh] = useState({ new_phone: "", password: "" });
  const [pwMsg, setPwMsg] = useState({ type: "", text: "" });
  const [phMsg, setPhMsg] = useState({ type: "", text: "" });
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
      <SectionCard title={t("settings.change_password")} Icon={Lock}>
        <form onSubmit={handlePw}>
          <Field label="Current Password">
            <Input type="password" value={pwForm.current_password} onChange={(e) => setPw((f) => ({ ...f, current_password: e.target.value }))} placeholder="Current password" />
          </Field>
          <Field label="New Password">
            <Input type="password" value={pwForm.new_password} onChange={(e) => setPw((f) => ({ ...f, new_password: e.target.value }))} placeholder="At least 6 characters" />
          </Field>
          <Field label="Confirm New Password">
            <Input type="password" value={pwForm.confirm} onChange={(e) => setPw((f) => ({ ...f, confirm: e.target.value }))} placeholder="Repeat new password" />
          </Field>
          <Button type="submit" disabled={pwLoad} className="w-full justify-center py-3 text-sm">
            {pwLoad ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : t("settings.change_password")}
          </Button>
          <StatusMsg type={pwMsg.type} msg={pwMsg.text} />
        </form>
      </SectionCard>

      <SectionCard title={t("settings.change_phone")} Icon={Smartphone}>
        <form onSubmit={handlePh}>
          <Field label="New Phone Number">
            <Input type="tel" value={phForm.new_phone} onChange={(e) => setPh((f) => ({ ...f, new_phone: e.target.value }))} placeholder="10-digit number" />
          </Field>
          <Field label="Confirm with Password">
            <Input type="password" value={phForm.password} onChange={(e) => setPh((f) => ({ ...f, password: e.target.value }))} placeholder="Your current password" />
          </Field>
          <Button type="submit" disabled={phLoad} className="w-full justify-center py-3 text-sm">
            {phLoad ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : t("settings.change_phone")}
          </Button>
          <StatusMsg type={phMsg.type} msg={phMsg.text} />
        </form>
      </SectionCard>
    </>
  );
}

function PaymentsSection({ t }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalSpent, setTotal] = useState(0);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await settingsAPI.paymentHistory();
        setPayments(data.payments || []);
        setTotal(data.total_spent || 0);
      } catch {
        // No fabricated data — show a genuine empty/error state instead.
        setPayments([]);
        setTotal(0);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const METHOD_ICON = { upi: Smartphone, card: CreditCard, cod: IndianRupee, cash: IndianRupee };

  return (
    <SectionCard title={t("settings.payments")} Icon={CreditCard}>
      <div className="mb-4.5 grid grid-cols-3 gap-2.5">
        {[
          ["Total", `₹${parseFloat(totalSpent).toLocaleString("en-IN")}`, "text-accent"],
          ["Transactions", payments.length, "text-ink"],
          ["Successful", payments.filter((p) => p.status === "paid").length, "text-safe"],
        ].map(([label, value, cls]) => (
          <div key={label} className="rounded-md bg-surface-muted p-3 text-center">
            <div className={`font-mono text-[1.3rem] font-extrabold ${cls}`}>{value}</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wide text-ink-soft">{label}</div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="py-8 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-[3px] border-line border-t-accent" />
        </div>
      )}

      {!loading && loadError && (
        <div className="flex items-center gap-2.5 rounded-md border border-warn bg-warn-bg px-4 py-3 text-xs text-ink">
          <AlertCircle size={16} className="shrink-0 text-warn" />
          Unable to load payment history right now. Please try again later.
        </div>
      )}

      {!loading && !loadError && payments.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-ink-muted">
          <Receipt size={26} className="text-ink-soft" />
          <span className="text-xs">No payments yet.</span>
        </div>
      )}

      {!loading && payments.length > 0 && (
        <div className="flex flex-col gap-2">
          {payments.map((p) => {
            const MethodIcon = METHOD_ICON[p.method] || IndianRupee;
            return (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface-muted p-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-light text-ink-muted">
                    <MethodIcon size={16} />
                  </span>
                  <div>
                    <div className="text-[13px] font-semibold text-ink">{p.product_name}</div>
                    <div className="text-[11px] text-ink-muted">
                      {p.storage_name} · {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {p.method?.toUpperCase()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-extrabold text-accent">₹{parseFloat(p.amount).toLocaleString("en-IN")}</div>
                  <span className={`rounded-pill px-2 py-0.5 text-[10px] font-bold ${p.status === "paid" ? "bg-safe-bg text-safe" : "bg-danger-bg text-danger"}`}>
                    {p.status?.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center gap-1.5 text-[11px] text-ink-soft">
        <ShieldCheck size={12} /> Payments are securely processed and recorded against your account.
      </div>
    </SectionCard>
  );
}
