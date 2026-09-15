import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { aiAPI } from "../../services/api";

// ── Clean Lightweight Zero-Dependency SVG Icons ─────────────────────────────
const SparklesIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const BotIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
  </svg>
);

const UserIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const TrendingUpIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const CloudRainIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
  </svg>
);

const MapPinIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const BookOpenIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const ShieldAlertIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CheckCircleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);

const SendIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const RefreshIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const MessageSquareIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

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
        // Backend returned a handled error (e.g. AI_SERVICE_UNAVAILABLE)
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
      // Clean friendly message without raw error strings, HTTP status codes, or provider JSON
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
    switch ((risk || "").toLowerCase()) {
      case "high":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800">
            <ShieldAlertIcon className="w-3.5 h-3.5" />
            High Risk {score ? `(${score}/100)` : ""}
          </span>
        );
      case "moderate":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800">
            <ShieldAlertIcon className="w-3.5 h-3.5" />
            Moderate Risk {score ? `(${score}/100)` : ""}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800">
            <ShieldCheckIcon className="w-3.5 h-3.5" />
            Low Risk {score ? `(${score}/100)` : ""}
          </span>
        );
    }
  };

  const getConfidenceBadge = (conf, score) => {
    switch ((conf || "").toLowerCase()) {
      case "high":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
            High Confidence {score ? `(${score}%)` : ""}
          </span>
        );
      case "medium":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300">
            Medium Confidence {score ? `(${score}%)` : ""}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            Low Confidence {score ? `(${score}%)` : ""}
          </span>
        );
    }
  };

  // Dynamic quick questions based on currently selected commodity & city
  const quickQuestions = [
    {
      icon: "💰",
      text: t("ai_advisor.quick_q1", { commodity, city, defaultValue: `What is the 7-day price forecast for ${commodity} in ${city}?` })
    },
    {
      icon: "⏳",
      text: t("ai_advisor.quick_q2", { commodity, city, defaultValue: `Should I sell ${commodity} today or hold for 14 days?` })
    },
    {
      icon: "🌧️",
      text: t("ai_advisor.quick_q3", { commodity, city, defaultValue: `How will upcoming weather and rain affect ${commodity} harvesting?` })
    },
    {
      icon: "🏛️",
      text: t("ai_advisor.quick_q4", { commodity, city, defaultValue: `Compare ${city} mandi rates for ${commodity} with nearby markets` })
    },
    {
      icon: "📦",
      text: t("ai_advisor.quick_q5", { commodity, city, defaultValue: `What are the ICAR post-harvest storage guidelines for ${commodity}?` })
    },
    {
      icon: "⚠️",
      text: t("ai_advisor.quick_q6", { commodity, city, defaultValue: `What is the risk level for storing ${commodity} this week?` })
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-emerald-100 dark:border-gray-700 overflow-hidden transition-all duration-300 mb-8">
      {/* ── Top Header Bar ────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/20 shadow-inner">
              <SparklesIcon className="w-6 h-6 text-amber-300 animate-pulse motion-reduce:animate-none" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400 border-2 border-emerald-800"></span>
              </span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">
                  {t("ai_advisor.title", "AI Agricultural & Market Advisor")}
                </h2>
                <span className="bg-emerald-500/30 text-emerald-100 border border-emerald-400/30 text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Google Gemini + RAG
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none"></span>
                <span className="text-emerald-100 text-xs font-medium">
                  {chatLoading || loading ? t("ai_advisor.status_analyzing", "Analyzing...") : t("ai_advisor.status_ready", "Online & Grounded")}
                </span>
                <span className="text-emerald-300/60">•</span>
                <span className="text-emerald-100/90 text-xs">
                  {commodity} @ {city} ({days}D)
                </span>
              </div>
            </div>
          </div>

          {/* Tab Navigation & Refresh */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <div className="bg-emerald-900/40 p-1 rounded-xl border border-white/10 flex items-center gap-1 shadow-inner">
              <button
                onClick={() => setActiveTab("advisory")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  activeTab === "advisory"
                    ? "bg-white text-emerald-900 shadow-sm font-semibold scale-100"
                    : "text-emerald-100 hover:text-white hover:bg-white/5"
                }`}
              >
                {t("ai_advisor.tab_advisory", "Recommendation")}
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all duration-200 ${
                  activeTab === "chat"
                    ? "bg-white text-emerald-900 shadow-sm font-semibold scale-100"
                    : "text-emerald-100 hover:text-white hover:bg-white/5"
                }`}
              >
                <MessageSquareIcon className="w-3.5 h-3.5" />
                {t("ai_advisor.tab_chat", "Ask AI Assistant")}
              </button>
            </div>

            <button
              onClick={fetchAdvice}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-medium flex items-center gap-1.5 transition-all duration-200 disabled:opacity-50 active:scale-95 shadow-sm"
              title={t("ai_advisor.refresh", "Refresh AI Analysis")}
            >
              <RefreshIcon className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>{t("ai_advisor.generate_analysis", "Generate AI Analysis")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content Body ─────────────────────────────────────── */}
      <div className="p-6">
        {activeTab === "chat" ? (
          /* ── Modern Redesigned Conversational AI Chat View ──────────────── */
          <div className="flex flex-col h-[520px]">
            {/* Scrollable Messages / Welcome Area */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-3">
              {chatMessages.length === 0 ? (
                /* Empty / Welcome State */
                <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg mb-3 shadow-emerald-500/20">
                    <SparklesIcon className="w-8 h-8 text-amber-300 animate-pulse motion-reduce:animate-none" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {t("ai_advisor.welcome_title", "FasalNet AI Agricultural Advisor")}
                  </h3>
                  <div className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800">
                    <span>⚡</span>
                    <span>{t("ai_advisor.welcome_badge", "Google Gemini + XGBoost + RAG")}</span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 max-w-md leading-relaxed">
                    {t("ai_advisor.welcome_desc", "Ask anything about live mandi prices, 7 & 14-day XGBoost price forecasts, Open-Meteo weather risks, and ICAR crop storage guidelines.")}
                  </p>

                  {/* 6 Contextual Quick Question Chips */}
                  <div className="w-full max-w-xl mt-6">
                    <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5 text-left flex items-center gap-1.5">
                      <SparklesIcon className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{t("ai_advisor.quick_questions_title", { commodity, city, defaultValue: `Suggested Questions for ${commodity} in ${city}:` })}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {quickQuestions.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendQuery(q.text)}
                          disabled={chatLoading}
                          className="group p-2.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/90 dark:bg-gray-700/60 dark:hover:bg-gray-700 border border-emerald-100 dark:border-gray-600 text-left transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 shadow-sm hover:shadow text-xs flex items-start gap-2 disabled:opacity-50"
                        >
                          <span className="text-base shrink-0 group-hover:scale-110 transition-transform">{q.icon}</span>
                          <span className="text-emerald-900 dark:text-emerald-200 font-medium leading-snug">
                            {q.text}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Chat Messages Stream */
                chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-end gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
                  >
                    {/* AI Avatar */}
                    {msg.sender === "ai" && (
                      <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-700/20">
                        <BotIcon className="w-4 h-4 text-amber-300" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3.5 text-xs leading-relaxed transition-all ${
                        msg.sender === "user"
                          ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-tr-none shadow-md shadow-emerald-600/10"
                          : msg.is_error
                          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 rounded-tl-none border border-amber-200 dark:border-amber-800 shadow-sm"
                          : "bg-emerald-50/60 dark:bg-gray-700/90 text-gray-800 dark:text-gray-100 rounded-tl-none border border-emerald-100 dark:border-gray-600 shadow-sm"
                      }`}
                    >
                      {/* Message Content */}
                      {msg.is_error ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                            <ShieldAlertIcon className="w-4 h-4 text-amber-600" />
                            <span>{msg.text}</span>
                          </div>
                          <button
                            onClick={() => handleRetry(msg.retryQuery)}
                            disabled={chatLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold transition-all active:scale-95 shadow-sm disabled:opacity-50"
                          >
                            <RefreshIcon className="w-3 h-3" />
                            <span>{t("ai_advisor.retry_btn", "Retry")}</span>
                          </button>
                        </div>
                      ) : (
                        <div className="whitespace-pre-line font-normal space-y-1">
                          {msg.text}
                        </div>
                      )}

                      {/* Cited Sources Pill Badges */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-emerald-200/60 dark:border-gray-600/60 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                            Grounded Sources:
                          </span>
                          {msg.sources.map((s, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[9px] px-2 py-0.5 rounded-md bg-white/80 dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-gray-600 font-medium"
                            >
                              📚 {s.source || s.institution || s.title}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer: Model & Timestamp */}
                      <div className="mt-1.5 flex items-center justify-between text-[10px] opacity-80 pt-0.5">
                        {msg.sender === "ai" && !msg.is_error && (
                          <span className="text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1">
                            <span>⚡</span>
                            <span>{msg.ai_engine || "Google Gemini (gemini-flash)"}</span>
                          </span>
                        )}
                        <span className={msg.sender === "user" ? "text-emerald-100 ml-auto" : "text-gray-400 dark:text-gray-400"}>
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>

                    {/* User Avatar */}
                    {msg.sender === "user" && (
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Thinking / Typing Animated State */}
              {chatLoading && (
                <div className="flex items-end gap-2.5 justify-start">
                  <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-700/20">
                    <BotIcon className="w-4 h-4 text-amber-300" />
                  </div>
                  <div className="bg-emerald-50/80 dark:bg-gray-700/90 rounded-2xl rounded-tl-none px-4 py-3 border border-emerald-100 dark:border-gray-600 shadow-sm flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce"></span>
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                    <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                      {t("ai_advisor.thinking_message", "FasalNet AI is analyzing with Google Gemini, XGBoost & Weather data...")}
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Prompt Bar (when conversation is ongoing) */}
            {chatMessages.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
                {quickQuestions.slice(0, 4).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendQuery(q.text)}
                    disabled={chatLoading}
                    className="shrink-0 text-[11px] px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all duration-200 disabled:opacity-50 active:scale-95"
                  >
                    {q.icon} {q.text}
                  </button>
                ))}
              </div>
            )}

            {/* Chat Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuery();
              }}
              className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700"
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
                className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white transition-all"
              />
              <button
                type="submit"
                disabled={chatLoading || !userInput.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 active:scale-95 flex items-center justify-center"
                title={t("ai_advisor.send_btn", "Send")}
              >
                <SendIcon className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : loading && !advice ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-4">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <SparklesIcon className="w-5 h-5 text-emerald-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
              {loadingStages[loadingStage] || t("ai_advisor.synthesizing", "Synthesizing AI Agricultural Intelligence...")}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md">
              Connecting Open-Meteo weather parameters, training XGBoost multi-horizon forecast, and querying ICAR agricultural vector database...
            </p>
          </div>
        ) : error && !advice ? (
          <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-3 shadow-sm">
            <ShieldAlertIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {t("ai_advisor.notice_title", "Advisory Status")}
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">{error}</p>
            </div>
          </div>
        ) : advice ? (
          <div className="space-y-6">
            {/* Timestamp & Provenance Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-gray-500 dark:text-gray-400 pb-1 border-b border-gray-100 dark:border-gray-700/60">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>
                  {t("ai_advisor.live_analysis_for", "Live analysis for")} <strong className="text-gray-700 dark:text-gray-200">{commodity}</strong> {t("ai_advisor.at", "at")} <strong className="text-gray-700 dark:text-gray-200">{city} APMC</strong>
                </span>
                <span>•</span>
                <span>{advice.data_timestamp ? new Date(advice.data_timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Live Grounded Data"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {advice.data_provenance_labels?.actual || "🟢 Actual Data"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {advice.data_provenance_labels?.prediction || "🔵 Model Prediction"}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {advice.data_provenance_labels?.recommendation || "🟣 AI Recommendation"}
                </span>
              </div>
            </div>

            {/* 1. Recommendation Highlight Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white dark:from-emerald-950/30 dark:via-gray-800 dark:to-gray-800 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    {t("ai_advisor.actionable_recommendation", "Actionable Recommendation")}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    🟣 AI Recommendation
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getRiskBadge(advice.risk_level, advice.risk_score)}
                  {getConfidenceBadge(advice.confidence, advice.confidence_score)}
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                {advice.recommendation}
              </h3>

              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 font-normal leading-relaxed">
                {advice.reason}
              </p>

              {advice.risk_factors && advice.risk_factors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-emerald-100 dark:border-emerald-800/40 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Risk Drivers:</span>
                  {advice.risk_factors.map((rf, idx) => (
                    <span key={idx} className="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      • {rf}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Multi-Signal Intelligence Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* XGBoost Price Forecast Card */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUpIcon className="w-3.5 h-3.5 text-blue-500" />
                    {t("ai_advisor.price_forecast_title", "XGBoost Price Forecast")}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                    🔵 Prediction
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-gray-900 dark:text-white">
                      ₹{advice.market_context?.target_price?.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 line-through">
                      ₹{advice.market_context?.current_price?.toLocaleString()}
                    </span>
                    <span className="text-xs font-medium text-gray-500">/ quintal</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    advice.market_context?.direction === "UP"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                      : advice.market_context?.direction === "DOWN"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}>
                    {advice.market_context?.direction} ({advice.market_context?.forecast_pct_change > 0 ? "+" : ""}{advice.market_context?.forecast_pct_change}%)
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-3">
                  {advice.price_forecast_summary}
                </p>
              </div>

              {/* Weather & Climate Impact Card */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CloudRainIcon className="w-3.5 h-3.5 text-cyan-500" />
                    {t("ai_advisor.weather_impact_title", "Weather & Climate Risk")}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                    🟢 Actual / 🔵 Forecast
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 dark:text-gray-300">
                  <span className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                    {advice.market_context?.temperature_c}°C
                  </span>
                  <span>•</span>
                  <span>{advice.market_context?.humidity_percent}% Humidity</span>
                  <span>•</span>
                  <span>{advice.market_context?.rainy_days || 0} rainy days ({advice.market_context?.rainfall_sum_mm || 0} mm)</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-3">
                  {advice.weather_impact}
                </p>
              </div>

              {/* Nearby Market Arbitrage Card */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPinIcon className="w-3.5 h-3.5 text-amber-500" />
                    {t("ai_advisor.market_comparison_title", "Nearby APMC Arbitrage")}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                    🟢 Actual DB
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                  {advice.market_analysis}
                </p>
              </div>
            </div>

            {/* 3. Agronomic Guidance (RAG Grounded) & Suggested Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800/40">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                  <BookOpenIcon className="w-3.5 h-3.5 text-emerald-600" />
                  {t("ai_advisor.crop_guidance_title", "ICAR Agronomic & Post-Harvest Advice")}
                </h4>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                  {advice.crop_advice}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800/40">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-1.5">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-blue-600" />
                  {t("ai_advisor.suggested_actions_title", "Suggested Step-by-Step Actions")}
                </h4>
                <div className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                  {advice.suggested_action}
                </div>
              </div>
            </div>

            {/* 4. Cited Knowledge Sources Footer */}
            {advice.sources && advice.sources.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <button
                  onClick={() => setShowSources(!showSources)}
                  className="flex items-center justify-between w-full text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                    {t("ai_advisor.grounded_sources", "Verified Knowledge Sources Consulted")} ({advice.sources.length})
                  </span>
                  <span>{showSources ? "▲" : "▼"}</span>
                </button>

                {showSources && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {advice.sources.map((s, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 text-xs"
                      >
                        <div className="font-semibold text-gray-800 dark:text-gray-200">
                          {s.title}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {s.institution || s.source}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

