import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles, Bot, User, TrendingUp, CloudRain, MapPin, BookOpen,
  ShieldCheck, ShieldAlert, CheckCircle, Send, RefreshCw, MessageSquare,
  Zap, ChevronDown, ChevronUp,
} from "lucide-react";
import { aiAPI } from "../../services/api";

export default function AIAgriculturalAdvisor({
  city = "Sangli",
  commodity = "Onion",
  days = 7,
  lat = null,
  lon = null
}) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n?.language || "en";

  const [advice, setAdvice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("advisory"); // "advisory" | "chat"
  const [showSources, setShowSources] = useState(false);

  // Conversational Chat State
  const [conversationId, setConversationId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const chatEndRef = useRef(null);

  const loadingStages = [
    t("ai_advisor.stage_db", "📡 Connecting to Mandi Price Database..."),
    t("ai_advisor.stage_weather", "🌦️ Retrieving Open-Meteo Sensor & Weather Forecast..."),
    t("ai_advisor.stage_xgboost", "📈 Executing XGBoost Horizon Predictor..."),
    t("ai_advisor.stage_rag", "📚 Searching ICAR Agricultural Vector Knowledge..."),
    t("ai_advisor.stage_synthesis", "🧠 Synthesizing Grounded Advisory...")
  ];

  const fetchAdvice = useCallback(async () => {
    if (!city || !commodity) return;
    setLoading(true);
    setLoadingStage(0);
    setError(null);

    const interval = setInterval(() => {
      setLoadingStage((prev) => (prev < loadingStages.length - 1 ? prev + 1 : prev));
    }, 350);

    try {
      const res = await aiAPI.getMarketAdvice({
        city,
        commodity,
        days: days === 14 ? 14 : 7,
        lat,
        lon,
        language: currentLang
      });
      if (res?.data?.status === "success") {
        setAdvice(res.data);
      } else {
        setError(res?.data?.error || t("ai_advisor.error_loading", "Unable to generate AI agricultural advice."));
      }
    } catch (err) {
      console.error("AI Advisor error:", err);
      const errMsg = err?.response?.data?.error || err.message || t("ai_advisor.error_loading", "Failed to connect to AI Advisor.");
      setError(errMsg);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }, [city, commodity, days, lat, lon, currentLang, t]);

  // Reset advice and re-fetch whenever market, crop, horizon or language changes
  useEffect(() => {
    setAdvice(null);
    setChatMessages([]);
    fetchAdvice();
  }, [fetchAdvice]);

  const handleSendQuery = async (queryText) => {
    const query = (queryText || userInput || "").trim();
    if (!query || chatLoading) return;

    setLastQuery(query);
    const userMsg = {
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setUserInput("");
    setChatLoading(true);

    // Format previous chat history turns for Gemini conversation memory
    const formattedHistory = chatMessages
      .filter((m) => (m.sender === "user" || m.sender === "ai") && !m.is_error)
      .slice(-6)
      .map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text
      }));

    try {
      const res = await aiAPI.chat({
        message: query,
        city,
        commodity,
        days: days === 14 ? 14 : 7,
        lat,
        lon,
        conversation_id: conversationId,
        language: currentLang,
        chat_history: formattedHistory
      });

      if (res?.data?.status === "success") {
        if (res.data.conversation_id) {
          setConversationId(res.data.conversation_id);
        }
        const aiMsg = {
          sender: "ai",
          text: res.data.reply || res.data.answer,
          sources: res.data.sources || [],
          ai_engine: res.data.ai_engine || "Google Gemini (gemini-flash)",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        };
        setChatMessages((prev) => [...prev, aiMsg]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            is_error: true,
            text: t("ai_advisor.service_unavailable", "AI Assistant is temporarily unavailable. Please try again in a moment."),
            retryQuery: query,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          is_error: true,
          text: t("ai_advisor.service_unavailable", "AI Assistant is temporarily unavailable. Please try again in a moment."),
          retryQuery: query,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  const handleRetry = (queryToRetry) => {
    handleSendQuery(queryToRetry || lastQuery);
  };

  const getRiskBadge = (risk, score) => {
    const cls =
      (risk || "").toLowerCase() === "high"
        ? "text-danger bg-danger-bg border-danger"
        : (risk || "").toLowerCase() === "moderate"
        ? "text-warn bg-warn-bg border-warn"
        : "text-safe bg-safe-bg border-safe";
    const label =
      (risk || "").toLowerCase() === "high" ? "High Risk" : (risk || "").toLowerCase() === "moderate" ? "Moderate Risk" : "Low Risk";
    return (
      <span className={`inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
        <ShieldAlert size={13} />
        {label} {score ? `(${score}/100)` : ""}
      </span>
    );
  };

  const getConfidenceBadge = (conf, score) => {
    const cls =
      (conf || "").toLowerCase() === "high"
        ? "text-safe bg-safe-bg"
        : (conf || "").toLowerCase() === "medium"
        ? "text-info bg-info-bg"
        : "text-ink-muted bg-surface-muted";
    const label = (conf || "").toLowerCase() === "high" ? "High Confidence" : (conf || "").toLowerCase() === "medium" ? "Medium Confidence" : "Low Confidence";
    return (
      <span className={`rounded-pill px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
        {label} {score ? `(${score}%)` : ""}
      </span>
    );
  };

  // Dynamic quick questions based on currently selected commodity & city
  const quickQuestions = [
    { icon: "💰", text: t("ai_advisor.quick_q1", { commodity, city, defaultValue: `What is the 7-day price forecast for ${commodity} in ${city}?` }) },
    { icon: "⏳", text: t("ai_advisor.quick_q2", { commodity, city, defaultValue: `Should I sell ${commodity} today or hold for 14 days?` }) },
    { icon: "🌧️", text: t("ai_advisor.quick_q3", { commodity, city, defaultValue: `How will upcoming weather and rain affect ${commodity} harvesting?` }) },
    { icon: "🏛️", text: t("ai_advisor.quick_q4", { commodity, city, defaultValue: `Compare ${city} mandi rates for ${commodity} with nearby markets` }) },
    { icon: "📦", text: t("ai_advisor.quick_q5", { commodity, city, defaultValue: `What are the ICAR post-harvest storage guidelines for ${commodity}?` }) },
    { icon: "⚠️", text: t("ai_advisor.quick_q6", { commodity, city, defaultValue: `What is the risk level for storing ${commodity} this week?` }) }
  ];

  return (
    <div className="mb-8 overflow-hidden rounded-panel border border-line bg-surface-card shadow-subtle transition-shadow duration-300 hover:shadow-card">
      {/* ── Top Header Bar ────────────────────────────────────────── */}
      <div className="bg-accent px-6 py-5 text-accent-fg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative rounded-md border border-white/20 bg-white/10 p-2.5 backdrop-blur-md">
              <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                <Sparkles size={22} className="text-amber-300" />
              </motion.div>
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-accent-dark bg-white" />
              </span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-xl font-bold tracking-tight">
                  {t("ai_advisor.title", "AI Agricultural & Market Advisor")}
                </h2>
                <span className="rounded-pill border border-white/30 bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
                  Google Gemini + RAG
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs">
                <span className="h-2 w-2 animate-[tickerPulse_1.8s_ease-in-out_infinite] rounded-full bg-white" />
                <span className="font-medium opacity-90">
                  {chatLoading || loading ? t("ai_advisor.status_analyzing", "Analyzing...") : t("ai_advisor.status_ready", "Online & Grounded")}
                </span>
                <span className="opacity-50">•</span>
                <span className="opacity-90">{commodity} @ {city} ({days}D)</span>
              </div>
            </div>
          </div>

          {/* Tab Navigation & Refresh */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className="relative flex items-center gap-1 rounded-md border border-white/10 bg-black/10 p-1">
              {[
                { id: "advisory", label: t("ai_advisor.tab_advisory", "Recommendation") },
                { id: "chat", label: t("ai_advisor.tab_chat", "Ask AI Assistant"), Icon: MessageSquare },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative z-10 flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-xs font-medium transition-colors duration-150"
                  style={{ color: activeTab === tab.id ? "var(--cp)" : "rgba(255,255,255,0.85)" }}
                >
                  {activeTab === tab.id && (
                    <motion.span
                      layoutId="fn-ai-tab-indicator"
                      className="absolute inset-0 -z-10 rounded-[6px] bg-white"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  {tab.Icon && <tab.Icon size={13} />}
                  {tab.label}
                </button>
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={fetchAdvice}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-150 hover:bg-white/20 disabled:opacity-50"
              title={t("ai_advisor.refresh", "Refresh AI Analysis")}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              <span>{t("ai_advisor.generate_analysis", "Generate AI Analysis")}</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Main Content Body ─────────────────────────────────────── */}
      <div className="p-6">
        {activeTab === "chat" ? (
          <div className="flex h-[520px] flex-col">
            {/* Scrollable Messages / Welcome Area */}
            <div className="mb-3 flex-1 space-y-4 overflow-y-auto pr-2">
              {chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-panel bg-accent text-white shadow-lifted">
                    <Sparkles size={28} className="text-amber-300" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-ink">
                    {t("ai_advisor.welcome_title", "FasalNet AI Agricultural Advisor")}
                  </h3>
                  <div className="mt-1 inline-flex items-center gap-1.5 rounded-pill border border-accent/25 bg-accent-pale px-2.5 py-0.5 text-[11px] font-semibold text-accent-dark">
                    <Zap size={11} />
                    <span>{t("ai_advisor.welcome_badge", "Google Gemini + XGBoost + RAG")}</span>
                  </div>
                  <p className="mt-2 max-w-md text-xs leading-relaxed text-ink-muted">
                    {t("ai_advisor.welcome_desc", "Ask anything about live mandi prices, 7 & 14-day XGBoost price forecasts, Open-Meteo weather risks, and ICAR crop storage guidelines.")}
                  </p>

                  <div className="mt-6 w-full max-w-xl">
                    <div className="mb-2.5 flex items-center gap-1.5 text-left text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                      <Sparkles size={13} className="text-accent" />
                      <span>{t("ai_advisor.quick_questions_title", { commodity, city, defaultValue: `Suggested Questions for ${commodity} in ${city}:` })}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {quickQuestions.map((q, idx) => (
                        <motion.button
                          key={idx}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleSendQuery(q.text)}
                          disabled={chatLoading}
                          className="group flex items-start gap-2 rounded-md border border-line bg-accent-pale/50 p-2.5 text-left text-xs shadow-subtle transition-colors hover:bg-accent-pale disabled:opacity-50"
                        >
                          <span className="shrink-0 text-base transition-transform group-hover:scale-110">{q.icon}</span>
                          <span className="font-medium leading-snug text-ink">{q.text}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {chatMessages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`flex items-end gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.sender === "ai" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-dark text-white shadow-subtle">
                          <Bot size={16} className="text-amber-300" />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-panel px-4 py-3.5 text-xs leading-relaxed sm:max-w-[78%] ${
                          msg.sender === "user"
                            ? "rounded-tr-none bg-accent text-accent-fg shadow-subtle"
                            : msg.is_error
                            ? "rounded-tl-none border border-warn bg-warn-bg text-ink shadow-subtle"
                            : "rounded-tl-none border border-line bg-surface-light text-ink shadow-subtle"
                        }`}
                      >
                        {msg.is_error ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 font-semibold text-warn">
                              <ShieldAlert size={15} />
                              <span>{msg.text}</span>
                            </div>
                            <button
                              onClick={() => handleRetry(msg.retryQuery)}
                              disabled={chatLoading}
                              className="inline-flex items-center gap-1.5 rounded-md bg-warn px-3 py-1 text-[11px] font-semibold text-white transition-transform active:scale-95 disabled:opacity-50"
                            >
                              <RefreshCw size={12} />
                              <span>{t("ai_advisor.retry_btn", "Retry")}</span>
                            </button>
                          </div>
                        ) : (
                          <div className="whitespace-pre-line font-normal">{msg.text}</div>
                        )}

                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line/60 pt-2">
                            <span className="text-[10px] font-bold opacity-80">Grounded Sources:</span>
                            {msg.sources.map((s, sIdx) => (
                              <span key={sIdx} className="rounded-md border border-line/60 bg-black/5 px-2 py-0.5 text-[9px] font-medium">
                                📚 {s.source || s.institution || s.title}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-1.5 flex items-center justify-between pt-0.5 text-[10px] opacity-80">
                          {msg.sender === "ai" && !msg.is_error && (
                            <span className="flex items-center gap-1 font-medium">
                              <Zap size={10} />
                              <span>{msg.ai_engine || "Google Gemini (gemini-flash)"}</span>
                            </span>
                          )}
                          <span className="ml-auto">{msg.timestamp}</span>
                        </div>
                      </div>

                      {msg.sender === "user" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg shadow-subtle">
                          <User size={16} />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}

              {/* Thinking / Typing Animated State */}
              {chatLoading && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-start gap-2.5">
                  <motion.div
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-dark text-white shadow-subtle"
                  >
                    <Bot size={16} className="text-amber-300" />
                  </motion.div>
                  <div className="flex items-center gap-3 rounded-panel rounded-tl-none border border-line bg-surface-light px-4 py-3 shadow-subtle">
                    <div className="flex items-center gap-1.5 py-0.5">
                      {[0, 1, 2].map((d) => (
                        <span
                          key={d}
                          className="h-2 w-2 animate-[bounceWave_1.2s_infinite_ease-in-out] rounded-full bg-accent"
                          style={{ animationDelay: `${d * 160}ms` }}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-medium text-ink-muted">
                      {t("ai_advisor.thinking_message", "FasalNet AI is analyzing with Google Gemini, XGBoost & Weather data...")}
                    </span>
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Prompt Bar (when conversation is ongoing) */}
            {chatMessages.length > 0 && (
              <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-2">
                {quickQuestions.slice(0, 4).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendQuery(q.text)}
                    disabled={chatLoading}
                    className="shrink-0 rounded-pill border border-line bg-accent-pale px-3 py-1 text-[11px] text-accent-dark transition-colors hover:bg-accent-pale/70 disabled:opacity-50"
                  >
                    {q.icon} {q.text}
                  </button>
                ))}
              </div>
            )}

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendQuery(); }}
              className="flex items-center gap-2 border-t border-line pt-2"
            >
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={t(
                  "ai_advisor.chat_placeholder",
                  `Ask anything about ${commodity} in ${city} (e.g., 'Should I sell now or wait?', 'How does rain affect storage?')`
                )}
                disabled={chatLoading}
                className="flex-1 rounded-md border border-line bg-surface-light px-4 py-2.5 text-xs text-ink outline-none transition-all focus:border-accent focus:shadow-glow-accent"
              />
              <motion.button
                whileTap={{ scale: 0.92 }}
                type="submit"
                disabled={chatLoading || !userInput.trim()}
                className="flex items-center justify-center rounded-md bg-accent p-2.5 text-accent-fg shadow-subtle transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                title={t("ai_advisor.send_btn", "Send")}
              >
                <Send size={16} />
              </motion.button>
            </form>
          </div>
        ) : loading && !advice ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-accent border-t-transparent" />
              <Sparkles size={18} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse text-accent" />
            </div>
            <h3 className="font-display text-base font-semibold text-ink">
              {loadingStages[loadingStage] || t("ai_advisor.synthesizing", "Synthesizing AI Agricultural Intelligence...")}
            </h3>
            <p className="mt-1 max-w-md text-xs text-ink-muted">
              Connecting Open-Meteo weather parameters, training XGBoost multi-horizon forecast, and querying ICAR agricultural vector database...
            </p>
          </div>
        ) : error && !advice ? (
          <div className="flex items-start gap-3 rounded-panel border border-warn bg-warn-bg p-5 shadow-subtle">
            <ShieldAlert size={20} className="mt-0.5 shrink-0 text-warn" />
            <div>
              <h4 className="text-sm font-semibold text-ink">{t("ai_advisor.notice_title", "Advisory Status")}</h4>
              <p className="mt-0.5 text-xs text-ink-muted">{error}</p>
            </div>
          </div>
        ) : advice ? (
          <div className="space-y-6">
            {/* Timestamp & Provenance Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-1 pb-1 text-xs text-ink-soft">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-safe" />
                <span>
                  {t("ai_advisor.live_analysis_for", "Live analysis for")} <strong className="text-ink-muted">{commodity}</strong> {t("ai_advisor.at", "at")} <strong className="text-ink-muted">{city} APMC</strong>
                </span>
                <span>•</span>
                <span>{advice.data_timestamp ? new Date(advice.data_timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Live Grounded Data"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-[6px] border border-safe bg-safe-bg px-2 py-0.5 text-[10px] text-safe">
                  {advice.data_provenance_labels?.actual || "🟢 Actual Data"}
                </span>
                <span className="rounded-[6px] border border-info bg-info-bg px-2 py-0.5 text-[10px] text-info">
                  {advice.data_provenance_labels?.prediction || "🔵 Model Prediction"}
                </span>
                <span className="rounded-[6px] border border-accent bg-accent-pale px-2 py-0.5 text-[10px] text-accent-dark">
                  {advice.data_provenance_labels?.recommendation || "🟣 AI Recommendation"}
                </span>
              </div>
            </div>

            {/* 1. Recommendation Highlight Banner */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-panel border border-accent/25 bg-gradient-to-br from-accent-pale via-surface-light to-surface-light p-5 shadow-subtle"
            >
              <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-safe opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-safe" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-accent-dark">
                    {t("ai_advisor.actionable_recommendation", "Actionable Recommendation")}
                  </span>
                  <span className="rounded-[6px] border border-accent bg-accent-pale px-2 py-0.5 text-[10px] font-semibold text-accent-dark">
                    🟣 AI Recommendation
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getRiskBadge(advice.risk_level, advice.risk_score)}
                  {getConfidenceBadge(advice.confidence, advice.confidence_score)}
                </div>
              </div>

              <h3 className="font-display text-lg font-bold leading-snug text-ink">{advice.recommendation}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{advice.reason}</p>

              {advice.risk_factors && advice.risk_factors.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-accent/20 pt-3">
                  <span className="text-[11px] font-semibold text-ink-soft">Risk Drivers:</span>
                  {advice.risk_factors.map((rf, idx) => (
                    <span key={idx} className="rounded-md border border-warn bg-warn-bg px-2 py-0.5 text-[11px] text-warn">
                      • {rf}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>

            {/* 2. Multi-Signal Intelligence Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-md border border-line bg-surface-light p-4 shadow-subtle">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                    <TrendingUp size={14} className="text-info" />
                    {t("ai_advisor.price_forecast_title", "XGBoost Price Forecast")}
                  </span>
                  <span className="rounded-[6px] bg-info-bg px-1.5 py-0.5 text-[10px] font-semibold text-info">🔵 Prediction</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-display text-2xl font-black text-ink">₹{advice.market_context?.target_price?.toLocaleString()}</span>
                    <span className="text-xs text-ink-soft line-through">₹{advice.market_context?.current_price?.toLocaleString()}</span>
                    <span className="text-xs font-medium text-ink-soft">/ quintal</span>
                  </div>
                  <span
                    className={`rounded-[6px] px-2 py-0.5 text-xs font-bold ${
                      advice.market_context?.direction === "UP"
                        ? "bg-safe-bg text-safe"
                        : advice.market_context?.direction === "DOWN"
                        ? "bg-danger-bg text-danger"
                        : "bg-surface-muted text-ink-muted"
                    }`}
                  >
                    {advice.market_context?.direction} ({advice.market_context?.forecast_pct_change > 0 ? "+" : ""}{advice.market_context?.forecast_pct_change}%)
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-xs text-ink-muted">{advice.price_forecast_summary}</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-md border border-line bg-surface-light p-4 shadow-subtle">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                    <CloudRain size={14} className="text-info" />
                    {t("ai_advisor.weather_impact_title", "Weather & Climate Risk")}
                  </span>
                  <span className="rounded-[6px] bg-safe-bg px-1.5 py-0.5 text-[10px] font-semibold text-safe">🟢 Actual / 🔵 Forecast</span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-ink-muted">
                  <span className="text-sm font-semibold text-ink">{advice.market_context?.temperature_c}°C</span>
                  <span>•</span>
                  <span>{advice.market_context?.humidity_percent}% Humidity</span>
                  <span>•</span>
                  <span>{advice.market_context?.rainy_days || 0} rainy days ({advice.market_context?.rainfall_sum_mm || 0} mm)</span>
                </div>
                <p className="mt-2 line-clamp-3 text-xs text-ink-muted">{advice.weather_impact}</p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-md border border-line bg-surface-light p-4 shadow-subtle">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                    <MapPin size={14} className="text-warn" />
                    {t("ai_advisor.market_comparison_title", "Nearby APMC Arbitrage")}
                  </span>
                  <span className="rounded-[6px] bg-safe-bg px-1.5 py-0.5 text-[10px] font-semibold text-safe">🟢 Actual DB</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{advice.market_analysis}</p>
              </motion.div>
            </div>

            {/* 3. Agronomic Guidance (RAG Grounded) & Suggested Actions */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-md border border-accent/25 bg-accent-pale/40 p-4 shadow-subtle">
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent-dark">
                  <BookOpen size={14} />
                  {t("ai_advisor.crop_guidance_title", "ICAR Agronomic & Post-Harvest Advice")}
                </h4>
                <p className="text-xs leading-relaxed text-ink-muted">{advice.crop_advice}</p>
              </div>

              <div className="rounded-md border border-info/25 bg-info-bg/40 p-4 shadow-subtle">
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-info">
                  <CheckCircle size={14} />
                  {t("ai_advisor.suggested_actions_title", "Suggested Step-by-Step Actions")}
                </h4>
                <div className="whitespace-pre-line text-xs leading-relaxed text-ink-muted">{advice.suggested_action}</div>
              </div>
            </div>

            {/* 4. Cited Knowledge Sources Footer */}
            {advice.sources && advice.sources.length > 0 && (
              <div className="border-t border-line pt-4">
                <button
                  onClick={() => setShowSources(!showSources)}
                  className="flex w-full items-center justify-between text-xs font-medium text-ink-muted transition-colors hover:text-accent"
                >
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-safe" />
                    {t("ai_advisor.grounded_sources", "Verified Knowledge Sources Consulted")} ({advice.sources.length})
                  </span>
                  {showSources ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                <AnimatePresence>
                  {showSources && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 grid grid-cols-1 gap-2 overflow-hidden sm:grid-cols-2"
                    >
                      {advice.sources.map((s, idx) => (
                        <div key={idx} className="rounded-md border border-line bg-surface-light p-2.5 text-xs">
                          <div className="font-semibold text-ink">{s.title}</div>
                          <div className="mt-0.5 text-[11px] text-ink-soft">{s.institution || s.source}</div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
