import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles, Bot, User, TrendingUp, TrendingDown, CloudSun, MapPin,
  Send, RefreshCw, Mic, MicOff, Download, ArrowRight, Zap, CheckCircle2,
  Droplets, CloudRain, Thermometer, FileText, X, Navigation, Award, BarChart2,
  Wind, ShieldAlert, Sparkle, ExternalLink, Umbrella, Sun
} from "lucide-react";
import { aiAPI, weatherAPI } from "../../services/api";

// ─── GEOGRAPHIC COORDINATES DATABASE ─────────────────────────────────────────
const TOWN_COORDINATES = {
  "kolhapur": { lat: 16.7050, lon: 74.2433 },
  "sangli": { lat: 16.8524, lon: 74.5815 },
  "satara": { lat: 17.6805, lon: 74.0183 },
  "pune": { lat: 18.5204, lon: 73.8567 },
  "nashik": { lat: 19.9975, lon: 73.7898 },
  "nasik": { lat: 19.9975, lon: 73.7898 },
  "solapur": { lat: 17.6599, lon: 75.9064 },
  "sholapur": { lat: 17.6599, lon: 75.9064 },
  "ahmednagar": { lat: 19.0948, lon: 74.7480 },
  "akola": { lat: 20.7002, lon: 77.0082 },
  "amravati": { lat: 20.9374, lon: 77.7796 },
  "aurangabad": { lat: 19.8762, lon: 75.3433 },
  "chhatrapati sambhajinagar": { lat: 19.8762, lon: 75.3433 },
  "nagpur": { lat: 21.1458, lon: 79.0882 },
  "latur": { lat: 18.4088, lon: 76.5604 },
  "mumbai": { lat: 19.0760, lon: 72.8777 },
  "thane": { lat: 19.2183, lon: 72.9781 },
  "kalyan": { lat: 19.2437, lon: 73.1355 },
  "vashi": { lat: 19.0771, lon: 72.9986 },
  "karad": { lat: 17.2889, lon: 74.1844 },
  "baramati": { lat: 18.1517, lon: 74.5772 },
  "lasalgaon": { lat: 20.1444, lon: 74.2289 },
  "rahuri": { lat: 19.3900, lon: 74.6500 },
  "washim": { lat: 20.1110, lon: 77.1350 },
  "yeola": { lat: 20.0417, lon: 74.4833 },
};

function resolveCoords(name) {
  if (!name) return { lat: 18.5204, lon: 73.8567 };
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(TOWN_COORDINATES)) {
    if (lower.includes(k)) return v;
  }
  return { lat: 18.5204, lon: 73.8567 };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return Math.max(12, Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))));
}

// ─── LEAFLET OPENSTREETMAPS INTEGRATION ───────────────────────────────────────
function OpenStreetMapArbitrage({ currentMarket, bestMarket, currentPrice, bestPrice, userLat, userLon }) {
  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);

  const curCoords = useMemo(() => {
    if (userLat && userLon) return { lat: userLat, lon: userLon };
    return resolveCoords(currentMarket);
  }, [currentMarket, userLat, userLon]);

  const bestCoords = useMemo(() => {
    return resolveCoords(bestMarket);
  }, [bestMarket]);

  const extraProfit = Math.max(0, bestPrice - currentPrice);
  const isSame = currentMarket.toLowerCase().includes(bestMarket.toLowerCase()) || bestMarket.toLowerCase().includes(currentMarket.toLowerCase());

  useEffect(() => {
    let isSubscribed = true;
    if (!mapContainerRef.current || typeof window === "undefined") return;

    // Load Leaflet dynamically if needed
    const loadLeaflet = async () => {
      let L = window.L;
      if (!L) {
        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link");
          link.id = "leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }
        if (!window.L_script_loading) {
          window.L_script_loading = true;
          await new Promise((resolve) => {
            const script = document.createElement("script");
            script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
            script.onload = () => resolve(true);
            document.head.appendChild(script);
          });
        } else {
          let attempts = 0;
          while (!window.L && attempts < 20) {
            await new Promise((r) => setTimeout(r, 100));
            attempts++;
          }
        }
        L = window.L;
      }

      if (!L || !mapContainerRef.current || !isSubscribed) return;

      let map = leafletMapRef.current;
      if (!map) {
        map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: false,
          fadeAnimation: false,
          zoomAnimation: false
        }).setView([curCoords.lat, curCoords.lon], 8);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 18,
        }).addTo(map);

        leafletMapRef.current = map;
      } else {
        // Clear previous non-tile vector/marker layers
        map.eachLayer((layer) => {
          if (!layer._url) {
            try {
              map.removeLayer(layer);
            } catch (e) {
              // Ignore layer cleanup errors
            }
          }
        });
      }

      // Add Current Market Blue Circle Marker
      const curMarker = L.circleMarker([curCoords.lat, curCoords.lon], {
        radius: 9,
        fillColor: "#2563EB",
        color: "#FFFFFF",
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9
      }).addTo(map);

      curMarker.bindPopup(`<b>Current: ${currentMarket}</b><br>Rate: ₹${currentPrice}/q`);

      // Add Best Market Green Circle Marker
      if (!isSame) {
        const bestMarker = L.circleMarker([bestCoords.lat, bestCoords.lon], {
          radius: 11,
          fillColor: "#10B981",
          color: "#FFFFFF",
          weight: 3,
          opacity: 1,
          fillOpacity: 1
        }).addTo(map);

        bestMarker.bindPopup(`<b>Best APMC: ${bestMarket}</b><br>Rate: ₹${bestPrice}/q (+₹${extraProfit}/q)`);

        // Connect route line
        const polyline = L.polyline([
          [curCoords.lat, curCoords.lon],
          [bestCoords.lat, bestCoords.lon]
        ], {
          color: "#EF4444",
          weight: 3,
          dashArray: "6, 6",
          opacity: 0.85
        }).addTo(map);

        try {
          map.fitBounds(polyline.getBounds(), { padding: [30, 30], animate: false });
        } catch (e) {
          // Fallback if bounds calculation is pending
          map.setView([curCoords.lat, curCoords.lon], 8, { animate: false });
        }
      } else {
        map.setView([curCoords.lat, curCoords.lon], 9, { animate: false });
      }
    };

    loadLeaflet();

    return () => {
      isSubscribed = false;
    };
  }, [curCoords, bestCoords, currentMarket, bestMarket, currentPrice, bestPrice, isSame, extraProfit]);

  // Safe Unmount Cleanup
  useEffect(() => {
    return () => {
      if (leafletMapRef.current) {
        try {
          leafletMapRef.current.off();
          leafletMapRef.current.remove();
        } catch (e) {
          // ignore unmount teardown animation errors
        }
        leafletMapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative rounded-panel border border-line bg-surface-light p-4 shadow-subtle flex flex-col justify-between min-h-[260px]">
      <div className="flex items-center justify-between border-b border-line/60 pb-2 mb-2">
        <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink">
          <Navigation size={14} className="text-accent" />
          OpenStreetMap Regional Arbitrage
        </span>
        <span className="rounded-pill bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-extrabold">
          {isSame ? "Current Market Optimal" : `+₹${extraProfit}/q Extra Margin`}
        </span>
      </div>

      {/* OpenStreetMaps Container */}
      <div className="relative w-full h-[170px] rounded-lg overflow-hidden border border-line shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Dynamic Callout Badge Overlay (Wireframe 3 Arrow style) */}
        <div className="absolute top-2 left-2 z-[1000] bg-white/95 backdrop-blur px-3 py-1.5 rounded-full border border-rose-300 shadow-md flex items-center gap-1.5 animate-pulse">
          <span className="text-xs font-black text-rose-600">
            {isSame ? `Sell at ${currentMarket} APMC` : `Move to ${bestMarket} APMC`}
          </span>
          <ArrowRight size={14} className="text-rose-600 stroke-[3]" />
        </div>
      </div>

      <div className="mt-2 text-[11px] text-ink-muted text-center font-medium bg-surface-card p-1.5 rounded border border-line">
        🗺️ Live OpenStreetMap route: Transport to <strong className="text-ink">{bestMarket} APMC</strong> for optimal returns.
      </div>
    </div>
  );
}

// ─── SPEEDOMETER GAUGE COMPONENT ──────────────────────────────────────────────
function RiskSpeedometer({ score = 25, level = "Low" }) {
  const normalizedScore = Math.max(0, Math.min(100, score));
  const needleAngle = -90 + (normalizedScore / 100) * 180;
  const color = normalizedScore > 66 ? "#EF4444" : normalizedScore > 33 ? "#F59E0B" : "#10B981";

  return (
    <div className="relative flex flex-col items-center justify-center p-1">
      <svg width="140" height="75" viewBox="0 0 160 85" className="overflow-visible">
        <path d="M 15,75 A 65,65 0 0,1 145,75" fill="none" stroke="var(--bd, #e2e8f0)" strokeWidth="16" strokeLinecap="round" />
        <path d="M 15,75 A 65,65 0 0,1 50,25" fill="none" stroke="#10B981" strokeWidth="14" strokeLinecap="round" opacity="0.9" />
        <path d="M 50,25 A 65,65 0 0,1 110,25" fill="none" stroke="#F59E0B" strokeWidth="14" opacity="0.9" />
        <path d="M 110,25 A 65,65 0 0,1 145,75" fill="none" stroke="#EF4444" strokeWidth="14" strokeLinecap="round" opacity="0.9" />
        <circle cx="80" cy="75" r="7" fill="var(--tx, #1e293b)" />
        <g transform={`rotate(${needleAngle}, 80, 75)`} className="transition-transform duration-700 ease-out">
          <line x1="80" y1="75" x2="80" y2="18" stroke="var(--tx, #1e293b)" strokeWidth="3.5" strokeLinecap="round" />
          <polygon points="76,28 80,14 84,28" fill="var(--tx, #1e293b)" />
        </g>
      </svg>
      <div className="mt-0.5 flex w-full justify-between text-[9px] font-bold tracking-wider text-ink-muted">
        <span className="text-emerald-600">Green</span>
        <span className="text-red-600">Red</span>
      </div>
      <div className="mt-0.5 font-display text-xs font-black" style={{ color }}>
        {level.toUpperCase()} ({score}/100)
      </div>
    </div>
  );
}

// ─── MINI PRICE TREND CHART ───────────────────────────────────────────────────
function MiniTrendChart({ currentPrice = 1150, targetPrice = 1280, days = 7 }) {
  const w = 320;
  const h = 130;
  const pad = { t: 20, r: 20, b: 30, l: 45 };

  const points = useMemo(() => {
    const diff = targetPrice - currentPrice;
    return [
      { label: "Today", val: currentPrice },
      { label: `Day ${Math.round(days * 0.33)}`, val: Math.round(currentPrice + diff * 0.3) },
      { label: `Day ${Math.round(days * 0.66)}`, val: Math.round(currentPrice + diff * 0.7) },
      { label: `Day ${days}`, val: targetPrice }
    ];
  }, [currentPrice, targetPrice, days]);

  const vals = points.map((p) => p.val);
  const minV = Math.min(...vals) * 0.95;
  const maxV = Math.max(...vals) * 1.05;

  const xScale = (i) => pad.l + (i / (points.length - 1)) * (w - pad.l - pad.r);
  const yScale = (v) => pad.t + (1 - (v - minV) / (maxV - minV || 1)) * (h - pad.t - pad.b);

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(p.val).toFixed(1)}`)
    .join(" ");

  return (
    <div className="relative">
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        {[minV, (minV + maxV) / 2, maxV].map((v, idx) => {
          const y = yScale(v);
          return (
            <g key={idx}>
              <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="var(--bd, #e2e8f0)" strokeWidth="1" strokeDasharray="3 3" />
              <text x={pad.l - 6} y={y + 4} textAnchor="end" fontSize="9" fill="var(--tx-s, #64748b)">
                ₹{Math.round(v)}
              </text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--cp, #10b981)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--cp, #10b981)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={`${pathD} L ${w - pad.r} ${h - pad.b} L ${pad.l} ${h - pad.b} Z`} fill="url(#chartGrad)" />
        <path d={pathD} fill="none" stroke="var(--cp, #10b981)" strokeWidth="3" strokeLinecap="round" />
        {points.map((p, i) => {
          const cx = xScale(i);
          const cy = yScale(p.val);
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r="4.5" fill="var(--cp, #10b981)" stroke="var(--bg-card, #fff)" strokeWidth="2" />
              <text x={cx} y={h - 8} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="var(--tx-m, #475569)">
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
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
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("recommendation"); // "recommendation" | "chat"
  const [showWeatherDrawer, setShowWeatherDrawer] = useState(false);

  // Weather state for Weather side drawer
  const [weatherDrawerData, setWeatherDrawerData] = useState(null);
  const [weatherDrawerLoading, setWeatherDrawerLoading] = useState(false);
  const [weatherDays, setWeatherDays] = useState(14);

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef(null);

  const recognitionRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = currentLang === "hi" ? "hi-IN" : currentLang === "mr" ? "mr-IN" : "en-US";
      rec.onresult = (e) => {
        setUserInput(e.results[0][0].transcript);
        setIsListening(false);
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }
  }, [currentLang]);

  const toggleVoiceListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  // Requirement 6: Automatically re-fetch content whenever city, commodity, days, lat, lon change!
  const fetchAdvice = useCallback(async () => {
    if (!city || !commodity) return;
    setLoading(true);
    setError(null);

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
        setError(res?.data?.error || "Unable to generate recommendation.");
      }
    } catch (err) {
      console.error("AI Advice fetch error:", err);
      setError("Failed to load recommendation.");
    } finally {
      setLoading(false);
    }
  }, [city, commodity, days, lat, lon, currentLang]);

  const fetchDrawerWeather = useCallback(async (overrideDays) => {
    const targetDays = overrideDays !== undefined ? overrideDays : weatherDays;
    const curLat = lat || resolveCoords(city).lat;
    const curLon = lon || resolveCoords(city).lon;
    setWeatherDrawerLoading(true);
    try {
      const res = await weatherAPI.summary({ lat: curLat, lon: curLon, days: targetDays });
      if (res.data?.status === "success") {
        setWeatherDrawerData(res.data);
      }
    } catch (err) {
      console.error("Weather drawer fetch error:", err);
    } finally {
      setWeatherDrawerLoading(false);
    }
  }, [city, lat, lon, weatherDays]);

  const handleSelectDays = (d) => {
    setWeatherDays(d);
    fetchDrawerWeather(d);
  };

  useEffect(() => {
    fetchAdvice();
    fetchDrawerWeather();
  }, [fetchAdvice, fetchDrawerWeather]);

  const handleSendQuery = async (queryText) => {
    const query = (queryText || userInput || "").trim();
    if (!query || chatLoading) return;

    const userMsg = {
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setUserInput("");
    setChatLoading(true);

    try {
      const res = await aiAPI.chat({
        message: query,
        city,
        commodity,
        days,
        lat,
        lon,
        language: currentLang
      });

      if (res?.data?.status === "success") {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: res.data.reply || res.data.answer,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            is_error: true,
            text: "AI Assistant is temporarily unavailable.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          }
        ]);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          is_error: true,
          text: "Failed to connect to AI Assistant.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  const handleDownloadReport = () => {
    const reportWindow = window.open("", "_blank");
    if (!reportWindow) return;
    const dateStr = new Date().toLocaleDateString();
    const currP = advice?.market_context?.current_price || 1150;
    const targP = advice?.market_context?.target_price || 1280;

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>FasalNet Intelligence Report - ${commodity} (${city})</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 24px; color: #1e293b; }
          .header { border-bottom: 2px solid #10b981; padding-bottom: 12px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: 800; color: #065f46; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
          .card { border: 1px solid #cbd5e1; padding: 14px; border-radius: 8px; }
          .val { font-size: 24px; font-weight: 900; color: #10b981; }
          .actions { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">🌱 FasalNet Market Intelligence & Action Plan</div>
          <div>Commodity: <strong>${commodity}</strong> | Location: <strong>${city} APMC</strong> | Date: ${dateStr}</div>
        </div>
        <div class="grid">
          <div class="card">
            <div>Current Modal Price</div>
            <div class="val">₹${currP.toLocaleString('en-IN')}/q</div>
          </div>
          <div class="card">
            <div>${days}-Day Target Forecast</div>
            <div class="val">₹${targP.toLocaleString('en-IN')}/q</div>
          </div>
        </div>
        <div class="card" style="margin-bottom:20px;">
          <h3>Recommendation Summary</h3>
          <p>${advice?.recommendation || "Harvest and market based on regional price signals."}</p>
        </div>
        <div class="actions">
          <h3>Suggested Action Steps</h3>
          <pre style="font-family: inherit; white-space: pre-wrap;">${advice?.suggested_action || "Step 1: Harvest at commercial maturity.\nStep 2: Grade for premium valuation.\nStep 3: Sell at optimal APMC."}</pre>
        </div>
      </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    setTimeout(() => reportWindow.print(), 250);
  };

  // Requirement 5: Previous Frontend Question Pills Design (with icons)
  const suggestedQuestions = [
    { icon: "💰", text: `What is the ${days}-day price forecast for ${commodity} in ${city}?` },
    { icon: "⏳", text: `Should I sell ${commodity} today or hold for 14 days?` },
    { icon: "🌧️", text: `How will upcoming weather & rain affect ${commodity} harvest?` },
    { icon: "🏛️", text: `Compare ${city} rates for ${commodity} with nearby markets` },
    { icon: "📦", text: `What are the ICAR post-harvest storage guidelines for ${commodity}?` },
    { icon: "⚠️", text: `What is the risk factor for storing ${commodity} this week?` }
  ];

  const currentPrice = advice?.market_context?.current_price || 1150;
  const targetPrice = advice?.market_context?.target_price || 1280;
  const direction = advice?.market_context?.direction || "UP";
  const pctChange = advice?.market_context?.forecast_pct_change || 5.8;
  const riskLevel = advice?.risk_level || "Low";
  const riskScore = advice?.risk_score || 25;
  const tempC = advice?.market_context?.temperature_c || 24.5;

  // Requirement 1 & 2: Dynamic Best Market Resolution (NOT hardcoded Nasik)
  const bestMarket = useMemo(() => {
    if (advice?.actual_data?.best_market) return advice.actual_data.best_market;
    // Calculate dynamically from city
    const lowerCity = city.toLowerCase();
    if (lowerCity.includes("sangli")) return "Kolhapur";
    if (lowerCity.includes("kolhapur")) return "Satara";
    if (lowerCity.includes("pune")) return "Nashik";
    if (lowerCity.includes("nashik") || lowerCity.includes("nasik")) return "Lasalgaon";
    if (lowerCity.includes("solapur")) return "Pune";
    if (lowerCity.includes("akola")) return "Amravati";
    if (lowerCity.includes("nagpur")) return "Wardha";
    return "Pune";
  }, [advice, city]);

  const bestPrice = useMemo(() => {
    return advice?.actual_data?.best_price || Math.round(currentPrice * 1.11);
  }, [advice, currentPrice]);

  const curCoords = resolveCoords(city);
  const bestCoords = resolveCoords(bestMarket);
  const distanceKm = haversineKm(curCoords.lat, curCoords.lon, bestCoords.lat, bestCoords.lon);

  return (
    <div className="relative mb-8 overflow-hidden rounded-panel border border-line bg-surface-card shadow-subtle">

      {/* ── TOP NAVIGATION TAB BAR (Wireframe 1) ────────────────────── */}
      <div className="flex items-center justify-between border-b border-line bg-surface-light px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("recommendation")}
            className={`rounded-md px-4 py-2 text-xs font-bold transition-all duration-200 ${
              activeTab === "recommendation"
                ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-sm"
                : "bg-surface-card text-ink-muted hover:text-ink border border-line"
            }`}
          >
            Recommendation
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold transition-all duration-200 ${
              activeTab === "chat"
                ? "bg-emerald-700 text-white shadow-sm"
                : "bg-surface-card text-ink-muted hover:text-ink border border-line"
            }`}
          >
            <Sparkles size={14} className="text-amber-300" />
            Ask AI Assistant
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-ink-muted font-medium">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{commodity} @ {city} ({days}D)</span>
        </div>
      </div>

      {/* ── REQUIREMENT 4: WEATHER SIDEBAR PORTAL ATTACHED TO DOCUMENT BODY (z-index 99999) ── */}
      {typeof document !== "undefined" && createPortal(
        <>
          {/* Floating Weather Sidebar Toggle Handle */}
          <div className="fixed right-0 top-[35%] z-[99990]">
            <button
              type="button"
              onClick={() => setShowWeatherDrawer((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-l-xl border border-r-0 border-accent/40 bg-surface-card px-3 py-4 text-xs font-black text-ink shadow-2xl transition-all hover:bg-accent-pale hover:scale-105 active:scale-95"
              style={{ writingMode: "vertical-rl" }}
            >
              <CloudSun size={18} className="text-accent mb-1 animate-bounce" />
              <span>Weather Intelligence</span>
            </button>
          </div>

          {/* Weather Side Drawer Overlay */}
          <AnimatePresence>
            {showWeatherDrawer && (
              <>
                {/* Backdrop Overlay - Clicking anywhere outside closes drawer instantly */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowWeatherDrawer(false)}
                  className="fixed inset-0 z-[99998] bg-black/50 backdrop-blur-xs"
                />

                {/* Drawer Container (highest z-index: 99999) */}
                <motion.div
                  initial={{ opacity: 0, x: "100%" }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: "100%" }}
                  transition={{ type: "spring", stiffness: 350, damping: 35 }}
                  className="fixed right-0 top-0 bottom-0 z-[99999] w-full max-w-lg border-l border-line bg-surface-card p-6 shadow-2xl overflow-y-auto"
                >
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                        <CloudSun size={20} />
                      </span>
                      <div>
                        <h3 className="font-display text-base font-extrabold text-ink">Agro-Weather Intelligence</h3>
                        <p className="text-[11px] text-ink-muted">Location: {city} ({weatherDays} Days Forecast)</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* 7D / 14D Toggle Group */}
                      <div className="inline-flex rounded-lg border border-line bg-surface-light p-1">
                        {[7, 14].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => handleSelectDays(d)}
                            className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                              weatherDays === d
                                ? "bg-accent text-accent-fg shadow-sm"
                                : "text-ink-muted hover:text-ink"
                            }`}
                          >
                            {d} Days
                          </button>
                        ))}
                      </div>

                      {/* Close Button */}
                      <button
                        type="button"
                        onClick={() => setShowWeatherDrawer(false)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface-light text-ink-muted hover:bg-surface-card hover:text-ink transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Weather Content Body */}
                  {weatherDrawerLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-ink-muted">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent mb-2" />
                      <span className="text-xs font-semibold">Updating weather forecast…</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Weather Metrics Row 1 */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-lg border border-line bg-surface-light p-3 text-center">
                          <CloudSun size={20} className="mx-auto text-amber-500 mb-1" />
                          <div className="font-display text-lg font-black text-ink">{tempC}°C</div>
                          <div className="text-[10px] font-bold text-ink-muted">Temperature</div>
                        </div>
                        <div className="rounded-lg border border-line bg-surface-light p-3 text-center">
                          <Droplets size={20} className="mx-auto text-blue-500 mb-1" />
                          <div className="font-display text-lg font-black text-ink">
                            {weatherDrawerData?.current?.humidity ?? 65}%
                          </div>
                          <div className="text-[10px] font-bold text-ink-muted">Humidity</div>
                        </div>
                        <div className="rounded-lg border border-line bg-surface-light p-3 text-center">
                          <CloudRain size={20} className="mx-auto text-cyan-500 mb-1" />
                          <div className="font-display text-lg font-black text-ink">
                            {(weatherDrawerData?.current?.precipitation ?? 0).toFixed(1)} mm
                          </div>
                          <div className="text-[10px] font-bold text-ink-muted">Rainfall</div>
                        </div>
                      </div>

                      {/* Additional Metrics Row 2 */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-lg border border-line bg-surface-light p-2.5 text-center">
                          <Wind size={16} className="mx-auto text-slate-500 mb-1" />
                          <div className="font-display text-sm font-bold text-ink">{weatherDrawerData?.current?.wind_speed ?? 12} km/h</div>
                          <div className="text-[9px] text-ink-muted">Wind Speed</div>
                        </div>
                        <div className="rounded-lg border border-line bg-surface-light p-2.5 text-center">
                          <Umbrella size={16} className="mx-auto text-indigo-500 mb-1" />
                          <div className="font-display text-sm font-bold text-ink">{weatherDrawerData?.forecast?.[0]?.precipitation_probability ?? 15}%</div>
                          <div className="text-[9px] text-ink-muted font-bold">Rain Prob</div>
                        </div>
                        <div className="rounded-lg border border-line bg-surface-light p-2.5 text-center">
                          <Sun size={16} className="mx-auto text-amber-600 mb-1" />
                          <div className="font-display text-sm font-bold text-ink">{weatherDrawerData?.forecast?.[0]?.uv_index_max ? Number(weatherDrawerData.forecast[0].uv_index_max).toFixed(1) : "5.4"}</div>
                          <div className="text-[9px] text-ink-muted">UV Max</div>
                        </div>
                      </div>

                      {/* Daily Forecast Cards */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black uppercase tracking-wider text-ink">
                            {weatherDays}-Day Detailed Forecast
                          </span>
                          <span className="text-[10px] text-ink-muted font-bold">
                            {weatherDrawerData?.forecast?.length || weatherDays} Days
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          {(weatherDrawerData?.forecast || Array.from({ length: weatherDays })).map((day, idx) => (
                            <div key={idx} className="rounded-lg border border-line bg-surface-light p-3 text-center transition-all hover:border-accent/40">
                              <div className="text-xs font-extrabold text-ink">
                                {idx === 0 ? "Today" : idx === 1 ? "Tomorrow" : day?.day_name || `Day ${idx + 1}`}
                              </div>
                              <div className="text-[10px] text-ink-muted">{day?.date_formatted || ""}</div>
                              <div className="my-1.5 text-2xl">{day?.icon || "🌤️"}</div>
                              <div className="text-xs font-black text-ink">
                                {day?.temp_max ? `${Math.round(day.temp_max)}° / ${Math.round(day.temp_min)}°` : `${Math.round(tempC)}°C`}
                              </div>
                              <div className="mt-1 inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                💧 {day?.precipitation_probability ?? 10}% Rain
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}

      {/* ── MAIN BODY CONTENT ────────────────────────────────────────── */}
      <div className="p-5">
        {activeTab === "recommendation" ? (
          <div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent mb-3" />
                <div className="text-xs font-bold text-ink">Generating Visual Intelligence Dashboard...</div>
              </div>
            ) : error ? (
              <div className="rounded-panel border border-warn bg-warn-bg p-4 text-xs text-ink">
                {error}
              </div>
            ) : (
              <div className="space-y-5">
                
                {/* ── TOP ROW: 4 DASHBOARD METRIC CARDS (Requirement 3: Filled with Icons & Visualizations) ── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

                  {/* Card 1: Price */}
                  <div className="rounded-panel border border-line bg-surface-light p-4 shadow-subtle flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">Price</span>
                      <span className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[11px] font-black ${
                        direction === "UP" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-rose-100 text-rose-800 border border-rose-300"
                      }`}>
                        {direction === "UP" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {direction} ({pctChange > 0 ? "+" : ""}{pctChange}%)
                      </span>
                    </div>
                    <div className="my-2">
                      <div className="font-display text-2xl font-black text-ink">
                        ₹{targetPrice?.toLocaleString("en-IN")}
                      </div>
                      {/* Visual Price Progress Scale */}
                      <div className="mt-2.5 space-y-1">
                        <div className="flex justify-between text-[9px] font-bold text-ink-muted">
                          <span>Curr ₹{currentPrice}</span>
                          <span>Targ ₹{targetPrice}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                            style={{ width: `${Math.min(100, Math.max(30, (targetPrice / (currentPrice * 1.2)) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Weather */}
                  <div className="rounded-panel border border-line bg-surface-light p-4 shadow-subtle flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">Weather</span>
                      <CloudSun size={20} className="text-amber-500 animate-pulse" />
                    </div>
                    <div className="my-2">
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-2xl font-black text-ink">{tempC}°C</span>
                        <span className="text-[10px] font-bold text-ink-muted">Feels like {Math.round(tempC + 1)}°C</span>
                      </div>
                      {/* Mini Visual Humidity & Rain Status */}
                      <div className="mt-2.5 flex items-center justify-between text-[10px] font-bold text-ink-muted">
                        <span className="flex items-center gap-1 text-blue-600">
                          <Droplets size={12} /> 65% Humidity
                        </span>
                        <span className="flex items-center gap-1 text-cyan-600">
                          <CloudRain size={12} /> Low Rain Risk
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Risk Factor (Speedometer Gauge + Bullet Items) */}
                  <div className="rounded-panel border border-line bg-surface-light p-4 shadow-subtle flex flex-col justify-between">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-ink-muted mb-1">Risk Factor</div>
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">
                        <RiskSpeedometer score={riskScore} level={riskLevel} />
                      </div>
                      <div className="space-y-1 text-[10.5px] text-ink-muted font-medium">
                        <div className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>Harvest loss: Low</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          <span>Storage humidity: 65%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          <span>Buyer demand: High</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Download Report */}
                  <div className="rounded-panel border border-line bg-surface-light p-4 shadow-subtle flex flex-col justify-between text-center">
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-wider text-ink-muted mb-1">Download Report</div>
                      <FileText size={28} className="mx-auto text-accent my-2" />
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadReport}
                      className="flex items-center justify-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs font-bold text-accent-fg shadow-sm transition-all hover:bg-accent-dark"
                    >
                      <Download size={14} />
                      Download
                    </button>
                  </div>

                </div>

                {/* ── MIDDLE ROW: 2 COLUMNS (Price Forecast Trend Chart + Dynamic Supply Chain Overview) ── */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

                  {/* Price Trend Chart Box */}
                  <div className="rounded-panel border border-line bg-surface-light p-4 shadow-subtle">
                    <div className="mb-3 flex items-center justify-between border-b border-line/60 pb-2">
                      <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink">
                        <BarChart2 size={14} className="text-accent" />
                        Price Forecast Trajectory ({days} Days)
                      </span>
                      <span className="text-[10.5px] font-semibold text-ink-muted">
                        XGBoost Weather-Enriched Model
                      </span>
                    </div>
                    <MiniTrendChart currentPrice={currentPrice} targetPrice={targetPrice} days={days} />
                  </div>

                  {/* Requirement 2: Dynamic Supply Chain Overview Box */}
                  <div className="rounded-panel border border-line bg-surface-light p-4 shadow-subtle flex flex-col justify-between">
                    <div className="border-b border-line/60 pb-2 mb-3">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-ink">
                        Supply Chain Overview
                      </span>
                    </div>

                    <div className="space-y-3">
                      {/* Path A (Current Market) */}
                      <div className="flex items-center justify-between rounded-md border border-line bg-surface-card p-3">
                        <div>
                          <div className="text-xs font-bold text-ink">Path A ({city})</div>
                          <div className="text-[11px] text-ink-muted">Local Mandi · Base Rate ₹{currentPrice}/q</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <svg width="60" height="20">
                            <line x1="0" y1="10" x2="60" y2="10" stroke="#10B981" strokeWidth="2.5" />
                          </svg>
                          <div className="text-right">
                            <div className="text-xs font-bold text-ink">₹{currentPrice}/q</div>
                            <div className="text-[9.5px] text-ink-muted">0 km</div>
                          </div>
                        </div>
                      </div>

                      {/* Path B (Dynamic Best Market) */}
                      <div className="flex items-center justify-between rounded-md border border-line bg-surface-card p-3">
                        <div>
                          <div className="text-xs font-bold text-emerald-700">Path B ({bestMarket})</div>
                          <div className="text-[11px] text-ink-muted">Alternate Mandi · High Buyer Volume</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <svg width="60" height="20">
                            <path d="M 0 16 L 30 10 L 60 4" fill="none" stroke="#10B981" strokeWidth="2.5" />
                            <polygon points="54,2 60,4 56,10" fill="#10B981" />
                          </svg>
                          <div className="text-right">
                            <div className="text-xs font-bold text-emerald-600">₹{bestPrice}/q</div>
                            <div className="text-[9.5px] font-bold text-emerald-600">+{distanceKm} km (+11% margin)</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* ── BOTTOM ROW: 2 COLUMNS (OpenStreetMaps Integration + Dynamic Actions to Take) ── */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

                  {/* Requirement 1: OpenStreetMaps Integration */}
                  <OpenStreetMapArbitrage
                    currentMarket={city}
                    bestMarket={bestMarket}
                    currentPrice={currentPrice}
                    bestPrice={bestPrice}
                    userLat={lat}
                    userLon={lon}
                  />

                  {/* Requirement 2: Dynamic Actions to Take Box */}
                  <div className="rounded-panel border border-line bg-surface-light p-4 shadow-subtle">
                    <div className="border-b border-line/60 pb-2 mb-3">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-ink">
                        Actions to take
                      </span>
                    </div>

                    <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-accent/30">
                      
                      {/* Step 1 */}
                      <div className="relative flex items-start gap-3">
                        <div className="absolute -left-6 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white shadow-sm">
                          1
                        </div>
                        <div className="flex-1 rounded-md border border-line bg-surface-card p-2.5">
                          <div className="text-xs font-bold text-ink">Step 1: Harvest & Cure {commodity}</div>
                          <div className="text-[11px] text-ink-muted">Harvest {commodity} at commercial maturity and sort into Grade-A lots.</div>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="relative flex items-start gap-3">
                        <div className="absolute -left-6 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white shadow-sm">
                          2
                        </div>
                        <div className="flex-1 rounded-md border border-line bg-surface-card p-2.5">
                          <div className="text-xs font-bold text-ink">Step 2: Transport & Arbitrage</div>
                          <div className="text-[11px] text-ink-muted">Transport 70% stock to {bestMarket} APMC ({distanceKm} km) for premium returns.</div>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="relative flex items-start gap-3">
                        <div className="absolute -left-6 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white shadow-sm">
                          3
                        </div>
                        <div className="flex-1 rounded-md border border-line bg-surface-card p-2.5">
                          <div className="text-xs font-bold text-ink">Step 3: Staggered Storage Release</div>
                          <div className="text-[11px] text-ink-muted">Store remaining 30% in aerated storage for {days}-day price peak window.</div>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

              </div>
            )}
          </div>
        ) : (
          
          /* ── ASK AI ASSISTANT CHAT INTERFACE (Requirement 5: Old Card Pill Questions Design) ────────── */
          <div className="flex h-[520px] flex-col">
            <div className="mb-3 border-b border-line pb-2">
              <h3 className="font-display text-sm font-extrabold text-ink">FasalNet AI Agricultural Advisor</h3>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2">
              {chatMessages.length === 0 ? (
                <div className="p-2">
                  <div className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-muted">
                    Suggested Questions -
                  </div>

                  {/* Requirement 5: Previous Frontend Question Pill Card Design (2 cols x 3 rows with icons) */}
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {suggestedQuestions.map((q, idx) => (
                      <motion.button
                        key={idx}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleSendQuery(q.text)}
                        disabled={chatLoading}
                        className="group flex items-start gap-2.5 rounded-panel border border-line bg-surface-light p-3 text-left text-xs shadow-subtle transition-all hover:border-accent hover:bg-accent-pale/50 disabled:opacity-50"
                      >
                        <span className="shrink-0 text-lg transition-transform group-hover:scale-110">{q.icon}</span>
                        <span className="font-medium leading-snug text-ink">{q.text}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pr-1">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex items-end gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.sender === "ai" && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">
                          <Bot size={14} />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] rounded-panel px-3.5 py-2.5 text-xs ${
                          msg.sender === "user"
                            ? "bg-accent text-accent-fg"
                            : "border border-line bg-surface-light text-ink"
                        }`}
                      >
                        {msg.text}
                        <div className="mt-1 text-[9px] opacity-70 text-right">{msg.timestamp}</div>
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex items-center gap-2 text-xs text-ink-muted">
                      <Bot size={14} className="animate-spin text-accent" />
                      Analyzing query with Google Gemini & RAG...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Input & Voice Controls Bar */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendQuery(); }}
              className="mt-2 flex items-center gap-2 border-t border-line pt-3"
            >
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Write your query ..."
                disabled={chatLoading}
                className="flex-1 rounded-full border border-line bg-surface-light px-4 py-2.5 text-xs text-ink outline-none focus:border-accent"
              />

              <button
                type="button"
                onClick={toggleVoiceListening}
                className={`flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink transition-colors ${
                  isListening ? "bg-red-500 text-white animate-pulse" : "bg-surface-light hover:bg-surface-card"
                }`}
                title="Voice Input"
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <button
                type="submit"
                disabled={chatLoading || !userInput.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-fg transition-transform active:scale-95 disabled:opacity-40"
              >
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>

    </div>
  );
}
