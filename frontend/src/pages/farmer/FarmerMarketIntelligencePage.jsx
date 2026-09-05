// pages/farmer/FarmerMarketIntelligencePage.jsx — v12
// Changes v12:
//   1. Market shows latest data; Sync Now button actually refreshes chart data after sync
//   2. Proper ARIMA forecast: dashed line, side-panel with per-day values, 7/30 day toggle
//   3. Forecast line is dashed/dotted
//   4. Min/max prices shown as shaded regression band
//   5. Tab renamed: "ML Predict" → "Price Tools"
//   6. Removed "Total Records", renamed "Latest DB Date" → "Latest Date", show cities list

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { marketAPI, mlAPI } from "../../services/api";
import TrendIndicators from "../../components/farmer/TrendIndicators";

const PALETTE = [
  "#3F6B33","#2B4570","#B4741E","#8B3A2B",
  "#5C3A5C","#0891B2","#EA580C","#5C3A5C",
];

function useDims(ref) {
  const [dims, setDims] = useState({ w: 600, h: 260 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) =>
      setDims({ w: e.contentRect.width, h: 260 })
    );
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return dims;
}

// ─── GEOGRAPHIC COORDINATES DATABASE & 30-40KM RADIUS FINDER ──────────────────
const DISTRICT_COORDINATES = {
  "ahmednagar": { lat: 19.0948, lon: 74.7480 },
  "ahilyanagar": { lat: 19.0948, lon: 74.7480 },
  "akola": { lat: 20.7002, lon: 77.0082 },
  "amravati": { lat: 20.9374, lon: 77.7796 },
  "amarawati": { lat: 20.9374, lon: 77.7796 },
  "beed": { lat: 18.9891, lon: 75.7601 },
  "bhandara": { lat: 21.1714, lon: 79.6548 },
  "buldhana": { lat: 20.5310, lon: 76.1847 },
  "chandrapur": { lat: 19.9615, lon: 79.2961 },
  "chattrapati sambhajinagar": { lat: 19.8762, lon: 75.3433 },
  "aurangabad": { lat: 19.8762, lon: 75.3433 },
  "dharashiv": { lat: 18.1853, lon: 76.0419 },
  "osmanabad": { lat: 18.1853, lon: 76.0419 },
  "dhule": { lat: 20.9042, lon: 74.7749 },
  "gadchiroli": { lat: 20.1849, lon: 79.9948 },
  "gondia": { lat: 21.4554, lon: 80.1961 },
  "hingoli": { lat: 19.7196, lon: 77.1477 },
  "jalgaon": { lat: 21.0077, lon: 75.5626 },
  "jalna": { lat: 19.8410, lon: 75.8864 },
  "jalana": { lat: 19.8410, lon: 75.8864 },
  "kolhapur": { lat: 16.7050, lon: 74.2433 },
  "latur": { lat: 18.4088, lon: 76.5604 },
  "mumbai": { lat: 19.0760, lon: 72.8777 },
  "nagpur": { lat: 21.1458, lon: 79.0882 },
  "nanded": { lat: 19.1383, lon: 77.3210 },
  "nandurbar": { lat: 21.3686, lon: 74.2415 },
  "nashik": { lat: 19.9975, lon: 73.7898 },
  "nasik": { lat: 19.9975, lon: 73.7898 },
  "palghar": { lat: 19.6967, lon: 72.7699 },
  "parbhani": { lat: 19.2686, lon: 76.7708 },
  "pune": { lat: 18.5204, lon: 73.8567 },
  "raigad": { lat: 18.5158, lon: 73.1822 },
  "ratnagiri": { lat: 16.9902, lon: 73.3120 },
  "sangli": { lat: 16.8524, lon: 74.5815 },
  "satara": { lat: 17.6805, lon: 74.0183 },
  "sindhudurg": { lat: 16.1118, lon: 73.6980 },
  "solapur": { lat: 17.6599, lon: 75.9064 },
  "sholapur": { lat: 17.6599, lon: 75.9064 },
  "thane": { lat: 19.2183, lon: 72.9781 },
  "wardha": { lat: 20.7453, lon: 78.6022 },
  "washim": { lat: 20.1110, lon: 77.1350 },
  "vashim": { lat: 20.1110, lon: 77.1350 },
  "yavatmal": { lat: 20.3888, lon: 78.1204 }
};

const TOWN_COORDINATES = {
  // Kolhapur District
  "kolhapur": { lat: 16.7050, lon: 74.2433 },
  "vadgaonpeth": { lat: 16.8242, lon: 74.2965 },
  "vadgaon": { lat: 16.8242, lon: 74.2965 },
  "ichalkaranji": { lat: 16.6975, lon: 74.4649 },
  "gadhinglaj": { lat: 16.2285, lon: 74.3541 },
  "jaysingpur": { lat: 16.7800, lon: 74.5500 },
  "gargoti": { lat: 16.3100, lon: 74.1500 },
  "kagal": { lat: 16.5800, lon: 74.3100 },

  // Sangli District
  "sangli": { lat: 16.8524, lon: 74.5815 },
  "miraj": { lat: 16.8286, lon: 74.6469 },
  "islampur": { lat: 17.0478, lon: 74.2642 },
  "urunkoli": { lat: 17.0478, lon: 74.2642 },
  "tasgaon": { lat: 17.0344, lon: 74.6033 },
  "palus": { lat: 17.0988, lon: 74.4533 },
  "vita": { lat: 17.2750, lon: 74.5372 },
  "atpadi": { lat: 17.4200, lon: 74.9500 },
  "jat": { lat: 17.0400, lon: 75.3300 },
  "shirala": { lat: 16.9800, lon: 74.1300 },
  "kadegaon": { lat: 17.3000, lon: 74.3300 },

  // Satara District
  "satara": { lat: 17.6805, lon: 74.0183 },
  "karad": { lat: 17.2889, lon: 74.1844 },
  "phaltan": { lat: 17.9867, lon: 74.4317 },
  "koregaon": { lat: 17.7014, lon: 74.1708 },
  "lonand": { lat: 18.0417, lon: 74.1917 },
  "patan": { lat: 17.3700, lon: 73.9000 },
  "vaduj": { lat: 17.6000, lon: 74.4500 },
  "vai": { lat: 17.9500, lon: 73.9000 },
  "wai": { lat: 17.9500, lon: 73.9000 },
  "khandala": { lat: 18.0600, lon: 74.0300 },

  // Pune District
  "pune": { lat: 18.5204, lon: 73.8567 },
  "baramati": { lat: 18.1517, lon: 74.5772 },
  "dound": { lat: 18.4650, lon: 74.5786 },
  "indapur": { lat: 18.1158, lon: 75.0292 },
  "bhigwan": { lat: 18.2917, lon: 74.7708 },
  "nimgaon": { lat: 18.1700, lon: 74.9000 },
  "junnar": { lat: 19.2089, lon: 73.8767 },
  "narayangaon": { lat: 19.1200, lon: 73.9700 },
  "alephata": { lat: 19.1900, lon: 74.1200 },
  "otur": { lat: 19.2600, lon: 73.9200 },
  "khed": { lat: 18.8475, lon: 73.9022 },
  "chakan": { lat: 18.7564, lon: 73.8572 },
  "shel": { lat: 18.8100, lon: 73.8800 },
  "manchar": { lat: 19.0000, lon: 73.9400 },
  "shirur": { lat: 18.8250, lon: 74.3750 },
  "khadiki": { lat: 18.5600, lon: 73.8300 },
  "manjri": { lat: 18.5000, lon: 73.9800 },
  "moshi": { lat: 18.6700, lon: 73.8400 },
  "pimpri": { lat: 18.6275, lon: 73.8009 },
  "saswad": { lat: 18.3444, lon: 74.0306 },
  "nira": { lat: 18.1000, lon: 74.2200 },

  // Solapur District
  "solapur": { lat: 17.6599, lon: 75.9064 },
  "sholapur": { lat: 17.6599, lon: 75.9064 },
  "pandharpur": { lat: 17.6778, lon: 75.3267 },
  "barshi": { lat: 18.2333, lon: 75.6833 },
  "akkalkot": { lat: 17.5244, lon: 76.2056 },
  "karmala": { lat: 18.4100, lon: 75.2000 },
  "kurduwadi": { lat: 18.0900, lon: 75.4300 },
  "mangolwedha": { lat: 17.5100, lon: 75.4500 },
  "mohol": { lat: 17.8100, lon: 75.6500 },
  "sangole": { lat: 17.4300, lon: 75.2000 },
  "malshiras": { lat: 17.8500, lon: 74.9000 },

  // Nashik District
  "nashik": { lat: 19.9975, lon: 73.7898 },
  "nasik": { lat: 19.9975, lon: 73.7898 },
  "malegaon": { lat: 20.5539, lon: 74.5289 },
  "lasalgaon": { lat: 20.1444, lon: 74.2289 },
  "niphad": { lat: 20.0800, lon: 74.1100 },
  "yeola": { lat: 20.0417, lon: 74.4833 },
  "chandwad": { lat: 20.3278, lon: 74.2417 },
  "sinnar": { lat: 19.8456, lon: 73.9986 },
  "dindori": { lat: 20.2000, lon: 73.8300 },
  "kalwan": { lat: 20.4900, lon: 73.9400 },
  "satana": { lat: 20.5900, lon: 74.2000 },
  "deola": { lat: 20.4400, lon: 74.1800 },
  "pimpalgaon": { lat: 20.1700, lon: 73.9800 },
  "ghoti": { lat: 19.7200, lon: 73.6600 },
  "igatpuri": { lat: 19.7000, lon: 73.5600 },

  // Ahmednagar District
  "ahmednagar": { lat: 19.0948, lon: 74.7480 },
  "ahilyanagar": { lat: 19.0948, lon: 74.7480 },
  "shrirampur": { lat: 19.6167, lon: 74.6500 },
  "kopargaon": { lat: 19.8800, lon: 74.4800 },
  "rahata": { lat: 19.7100, lon: 74.4800 },
  "shirdi": { lat: 19.7667, lon: 74.4767 },
  "sangamner": { lat: 19.5700, lon: 74.2100 },
  "rahuri": { lat: 19.3900, lon: 74.6500 },
  "shevgaon": { lat: 19.3400, lon: 75.2200 },
  "pathardi": { lat: 19.1700, lon: 75.1800 },
  "parner": { lat: 19.0000, lon: 74.4400 },
  "shrigonda": { lat: 18.6167, lon: 74.6967 },
  "karjat": { lat: 18.9100, lon: 75.0000 },
  "jamkhed": { lat: 18.7300, lon: 75.3200 },
  "akole": { lat: 19.5400, lon: 73.9300 },
  "nevasa": { lat: 19.5500, lon: 74.9200 },

  // Chhatrapati Sambhajinagar
  "chhatrapati sambhajinagar": { lat: 19.8762, lon: 75.3433 },
  "aurangabad": { lat: 19.8762, lon: 75.3433 },
  "paithan": { lat: 19.4800, lon: 75.3800 },
  "vaijapur": { lat: 19.9200, lon: 74.7300 },
  "gangapur": { lat: 19.7000, lon: 75.0100 },
  "kannad": { lat: 20.2600, lon: 75.1300 },
  "sillod": { lat: 20.3000, lon: 75.6500 },
  "lasur": { lat: 19.8400, lon: 75.0500 },

  // Jalgaon District
  "jalgaon": { lat: 21.0077, lon: 75.5626 },
  "bhusawal": { lat: 21.0458, lon: 75.7972 },
  "chalisgaon": { lat: 20.4633, lon: 74.9967 },
  "chopada": { lat: 21.2500, lon: 75.3000 },
  "amalner": { lat: 21.0433, lon: 75.0567 },
  "pachora": { lat: 20.6667, lon: 75.3500 },
  "jamner": { lat: 20.8100, lon: 75.7800 },
  "raver": { lat: 21.2400, lon: 75.9700 },
  "yawal": { lat: 21.1700, lon: 75.7000 },

  // Nagpur District
  "nagpur": { lat: 21.1458, lon: 79.0882 },
  "katol": { lat: 21.2700, lon: 78.5800 },
  "saoner": { lat: 21.3900, lon: 78.9100 },
  "ramtek": { lat: 21.4000, lon: 79.3300 },
  "umred": { lat: 20.8500, lon: 79.3300 },
  "kalmeshwar": { lat: 21.2300, lon: 78.9200 },
  "hingna": { lat: 21.0600, lon: 78.9600 },
  "narkhed": { lat: 21.3500, lon: 78.5300 },
  "kamthi": { lat: 21.2300, lon: 79.1900 },

  // Mumbai & Thane & Raigad
  "mumbai": { lat: 19.0760, lon: 72.8777 },
  "vashi": { lat: 19.0771, lon: 72.9986 },
  "kalyan": { lat: 19.2437, lon: 73.1355 },
  "thane": { lat: 19.2183, lon: 72.9781 },
  "ulhasnagar": { lat: 19.2215, lon: 73.1644 },
  "bhiwandi": { lat: 19.2967, lon: 73.0631 },
  "palghar": { lat: 19.6967, lon: 72.7699 },
  "vasai": { lat: 19.3919, lon: 72.8397 },
  "panvel": { lat: 18.9894, lon: 73.1175 },
  "alibag": { lat: 18.6414, lon: 72.8722 },
  "pen": { lat: 18.7300, lon: 73.0900 },
  "mahad": { lat: 18.0800, lon: 73.4200 },

  // Amravati, Akola, Buldhana, Washim
  "amravati": { lat: 20.9374, lon: 77.7796 },
  "amarawati": { lat: 20.9374, lon: 77.7796 },
  "achlapur": { lat: 21.2600, lon: 77.5100 },
  "morshi": { lat: 21.3200, lon: 78.0100 },
  "warud": { lat: 21.4600, lon: 78.2600 },
  "daryapur": { lat: 20.9300, lon: 77.3300 },
  "akola": { lat: 20.7002, lon: 77.0082 },
  "akot": { lat: 21.1000, lon: 77.0600 },
  "khamgaon": { lat: 20.6900, lon: 76.5700 },
  "malkapur": { lat: 20.8800, lon: 76.2000 },
  "chikhli": { lat: 20.3500, lon: 76.2500 },
  "mehkar": { lat: 20.1500, lon: 76.5700 },
  "shegaon": { lat: 20.7900, lon: 76.6900 },
  "washim": { lat: 20.1110, lon: 77.1350 },
  "vashim": { lat: 20.1110, lon: 77.1350 },
  "risod": { lat: 19.9700, lon: 76.7800 },
  "karanja": { lat: 20.4800, lon: 77.4900 },

  // Nanded, Latur, Parbhani, Hingoli, Beed, Jalna, Dharashiv
  "nanded": { lat: 19.1383, lon: 77.3210 },
  "latur": { lat: 18.4088, lon: 76.5604 },
  "udgir": { lat: 18.3900, lon: 77.1200 },
  "ahmedpur": { lat: 18.7000, lon: 76.9300 },
  "nilanga": { lat: 18.1300, lon: 76.7500 },
  "parbhani": { lat: 19.2686, lon: 76.7708 },
  "gangakhed": { lat: 18.9500, lon: 76.7500 },
  "jintur": { lat: 19.6100, lon: 76.6900 },
  "hingoli": { lat: 19.7196, lon: 77.1477 },
  "beed": { lat: 18.9891, lon: 75.7601 },
  "georai": { lat: 19.2600, lon: 75.7500 },
  "majilgaon": { lat: 19.1500, lon: 76.0700 },
  "ambajogai": { lat: 18.7300, lon: 76.3800 },
  "parli": { lat: 18.8500, lon: 76.5300 },
  "jalna": { lat: 19.8410, lon: 75.8864 },
  "ambad": { lat: 19.6100, lon: 75.8000 },
  "partur": { lat: 19.6000, lon: 76.2100 },
  "dharashiv": { lat: 18.1853, lon: 76.0419 },
  "tuljapur": { lat: 18.0100, lon: 76.0800 },
  "omerga": { lat: 17.8400, lon: 76.6200 },

  // Wardha, Chandrapur, Yavatmal, Bhandara, Gondia, Gadchiroli
  "wardha": { lat: 20.7453, lon: 78.6022 },
  "hinganghat": { lat: 20.5500, lon: 78.8400 },
  "arvi": { lat: 20.9800, lon: 78.2300 },
  "chandrapur": { lat: 19.9615, lon: 79.2961 },
  "warora": { lat: 20.2300, lon: 79.0000 },
  "bhadravati": { lat: 20.1000, lon: 79.1200 },
  "yavatmal": { lat: 20.3888, lon: 78.1204 },
  "pusad": { lat: 19.9100, lon: 77.5800 },
  "wani": { lat: 20.0600, lon: 78.9500 },
  "digras": { lat: 20.1100, lon: 77.7200 },
  "darwha": { lat: 20.3100, lon: 77.7700 },
  "umarkhed": { lat: 19.6000, lon: 77.7000 },
  "bhandara": { lat: 21.1714, lon: 79.6548 },
  "tumsar": { lat: 21.3800, lon: 79.7400 },
  "sakoli": { lat: 21.0800, lon: 79.9800 },
  "gondia": { lat: 21.4554, lon: 80.1961 },
  "tirora": { lat: 21.4100, lon: 79.9300 },
  "gadchiroli": { lat: 20.1849, lon: 79.9948 },
  "dhule": { lat: 20.9042, lon: 74.7749 },
  "shirpur": { lat: 21.3500, lon: 74.8800 },
  "dondaicha": { lat: 21.3300, lon: 74.5700 },
  "nandurbar": { lat: 21.3686, lon: 74.2415 },
  "shahada": { lat: 21.5400, lon: 74.4700 },
  "taloda": { lat: 21.5600, lon: 74.2100 },
  "ratnagiri": { lat: 16.9902, lon: 73.3120 },
  "chiplun": { lat: 17.5300, lon: 73.5100 },
  "sindhudurg": { lat: 16.1118, lon: 73.6980 },
  "kankavli": { lat: 16.2700, lon: 73.7100 },
  "kudal": { lat: 16.0000, lon: 73.6900 },
  "sawantwadi": { lat: 15.9000, lon: 73.8200 }
};

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getMarketCoordinate(marketName) {
  if (!marketName) return null;
  const lower = marketName.toLowerCase();

  // 1. Check parenthesized token first
  const parenMatch = lower.match(/\((.*?)\)/);
  if (parenMatch && parenMatch[1]) {
    const insideTokens = parenMatch[1].match(/[a-zA-Z]+/g) || [];
    for (const tk of insideTokens) {
      if (TOWN_COORDINATES[tk]) return TOWN_COORDINATES[tk];
    }
  }

  // 2. Check main town words
  const clean = lower
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(apmc|market|committee|produce|agriculture|phale|bhajipura|bhajipala)\b/g, " ");
  const tokens = clean.match(/[a-zA-Z]+/g) || [];

  for (const tk of tokens) {
    if (TOWN_COORDINATES[tk]) return TOWN_COORDINATES[tk];
    if (DISTRICT_COORDINATES[tk]) return DISTRICT_COORDINATES[tk];
  }

  return null;
}

function findNearbyMarkets(userLat, userLon, allCities, maxRadiusKm = 40) {
  if (!userLat || !userLon || !Array.isArray(allCities) || !allCities.length) {
    return [];
  }

  const matched = [];

  for (const city of allCities) {
    const coords = getMarketCoordinate(city);
    if (!coords) continue;

    const distKm = haversineDistance(userLat, userLon, coords.lat, coords.lon);
    if (distKm <= maxRadiusKm) {
      matched.push({
        market: city,
        distanceKm: Math.round(distKm * 10) / 10
      });
    }
  }

  // Sort strictly by distance from the user's current location (closest first)
  matched.sort((a, b) => a.distanceKm - b.distanceKm);

  return matched;
}

// ─── SEARCHABLE CITY MULTI-SELECT ─────────────────────────────────────────────
function CitySearchSelect({ cities, selectedCities, onToggle, onClearAll }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const filtered = cities.filter(c => c.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div onClick={() => setOpen(o => !o)} style={{
        width: "100%", background: "var(--bg-l)", border: "1px solid var(--bd)",
        color: "var(--tx)", fontFamily: "var(--fb)", fontSize: "12px",
        padding: "8px 10px", borderRadius: "9px", cursor: "pointer",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxSizing: "border-box", userSelect: "none",
      }}>
        <span style={{ color: selectedCities.length ? "var(--tx)" : "var(--tx-s)" }}>
          {selectedCities.length === 0 ? t("mi.no_markets_selected", "No markets selected")
            : selectedCities.length === 1 ? selectedCities[0]
            : `${selectedCities.length} ${t("market.markets_available", "markets selected")}`}
        </span>
        <span style={{ fontSize: "10px", color: "var(--tx-s)" }}>{open ? "▲" : "▼"}</span>
      </div>

      {selectedCities.length === 0 && (
        <div style={{
          marginTop: "6px", padding: "8px 10px", background: "var(--bg-l)",
          border: "1px dashed var(--bd)", borderRadius: "8px",
          fontSize: "11px", color: "var(--tx-s)", textAlign: "center"
        }}>
          {t("mi.no_markets_selected", "No markets selected")}
        </div>
      )}

      {selectedCities.length > 0 && (
        <div style={{
          display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px",
          maxHeight: "150px", overflowY: "auto", scrollbarWidth: "thin", paddingRight: "2px"
        }}>
          {selectedCities.map((city, idx) => (
            <div key={`${city}-${idx}`} style={{
              display: "flex", alignItems: "center", gap: "4px",
              background: "var(--cp-pale)", border: "1px solid rgba(63,107,51,.3)",
              borderRadius: "20px", padding: "2px 8px 2px 10px",
              fontSize: "10px", color: "var(--cp)", fontWeight: 600,
            }}>
              {city}
              <span onClick={(e) => { e.stopPropagation(); onToggle(city); }}
                style={{ cursor: "pointer", fontSize: "13px", lineHeight: 1, color: "var(--cp)", fontWeight: 900, marginLeft: "2px" }}>×</span>
            </div>
          ))}
        </div>
      )}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 999,
          background: "var(--bg-m)", border: "1px solid var(--bd)", borderRadius: "10px",
          boxShadow: "0 8px 30px rgba(0,0,0,.3)", overflow: "hidden",
        }}>
          <div style={{ padding: "8px", borderBottom: "1px solid var(--bd)" }}>
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t("farmer.filter_city", "Type to search markets…")}
              style={{ width: "100%", background: "var(--bg-l)", border: "1px solid var(--bd)",
                color: "var(--tx)", fontFamily: "var(--fb)", fontSize: "12px",
                padding: "6px 10px", borderRadius: "7px", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: "8px", padding: "6px 10px", borderBottom: "1px solid var(--bd)", alignItems: "center" }}>
            <button onClick={() => filtered.forEach(c => { if (!selectedCities.includes(c)) onToggle(c); })}
              style={{ fontSize: "10px", color: "var(--cp)", background: "none", border: "none", cursor: "pointer", fontWeight: 700, padding: 0 }}>{t("common.select_all", "Select All")}</button>
            <span style={{ color: "var(--tx-s)", fontSize: "10px" }}>·</span>
            <button onClick={onClearAll || (() => [...selectedCities].forEach(c => onToggle(c)))}
              style={{ fontSize: "10px", color: "var(--danger)", background: "none", border: "none", cursor: "pointer", fontWeight: 700, padding: 0 }}>{t("common.clear_all", "Clear All")}</button>
            <span style={{ fontSize: "10px", color: "var(--tx-s)", marginLeft: "auto" }}>{filtered.length} / {cities.length}</span>
          </div>
          <div style={{ maxHeight: "200px", overflowY: "auto", scrollbarGutter: "stable" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "16px", textAlign: "center", fontSize: "12px", color: "var(--tx-s)" }}>{t("mi.no_markets_match")} "{search}"</div>
            ) : filtered.map(city => {
              const isSel = selectedCities.includes(city);
              return (
                <label key={city} style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "7px 12px", cursor: "pointer",
                  background: isSel ? "var(--cp-pale)" : "transparent",
                  transition: "background .12s",
                }}>
                  <input type="checkbox" checked={isSel} onChange={() => onToggle(city)}
                    style={{ accentColor: "var(--cp)", width: 14, height: 14, cursor: "pointer" }} />
                  <span style={{ fontSize: "12px", color: isSel ? "var(--cp)" : "var(--tx)", fontWeight: isSel ? 700 : 400 }}>{city}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ENHANCED LINE CHART: actual + ARIMA forecast + min/max band ──────────────
function LineChart({ series, forecastSeries = [] }) {
  const { t } = useTranslation();
  const ref    = useRef(null);
  const svgRef = useRef(null);
  const dims   = useDims(ref);
  const { w, h } = dims;
  const PAD = { t: 36, r: 24, b: 44, l: 62 };

  const [tooltip, setTooltip] = useState(null);

  const todayStr    = new Date().toISOString().split("T")[0];
  const tomorrowStr = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })();

  // Collect all points (actual + forecast)
  const allActualPrices  = series.flatMap(s => s.points.map(p => p.price).filter(Boolean));
  const allFcPrices      = forecastSeries.flatMap(s => s.points.map(p => p.price).filter(Boolean));
  const allMinMax        = [
    ...series.flatMap(s => s.points.flatMap(p => [p.min_price, p.max_price].filter(Boolean))),
    ...forecastSeries.flatMap(s => s.points.flatMap(p => [p.min_price, p.max_price].filter(Boolean))),
  ];
  const allPrices   = [...allActualPrices, ...allFcPrices, ...allMinMax];
  const allDates    = [
    ...series.flatMap(s => s.points.map(p => p.date)),
    ...forecastSeries.flatMap(s => s.points.map(p => p.date)),
  ];
  const uniqueDates = [...new Set(allDates)].sort();

  if (!allPrices.length || !uniqueDates.length) {
    return (
      <div ref={ref} style={{ height: h, display: "flex", alignItems: "center",
        justifyContent: "center", color: "var(--tx-s)", fontSize: "13px" }}>
        {t("mi.no_data")}
      </div>
    );
  }

  const minP = Math.min(...allPrices) * 0.93;
  const maxP = Math.max(...allPrices) * 1.07;
  const cW   = w - PAD.l - PAD.r;
  const cH   = h - PAD.t - PAD.b;

  const domainDates = [...new Set([...uniqueDates, todayStr, tomorrowStr])].sort();
  const xScale = (i) => PAD.l + (i / (domainDates.length - 1 || 1)) * cW;
  const yScale = (v) => PAD.t + cH - ((v - minP) / ((maxP - minP) || 1)) * cH;

  const yTicks = 5;
  const yGrid = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = minP + ((maxP - minP) * i) / yTicks;
    return { y: yScale(v), label: `₹${Math.round(v).toLocaleString("en-IN")}` };
  });

  const xStep = Math.max(1, Math.floor(domainDates.length / 7));
  const xLabels = domainDates
    .map((d, i) => ({ d, i }))
    .filter(({ d, i }) => i % xStep === 0 || i === domainDates.length - 1 || d === todayStr || d === tomorrowStr)
    .map(({ d, i }) => ({ date: d, x: xScale(i), isToday: d === todayStr, isTomorrow: d === tomorrowStr }));

  const toPath = (points) => {
    const valid = points.map(p => {
      const idx = domainDates.indexOf(p.date);
      return idx >= 0 && p.price != null ? `${xScale(idx).toFixed(1)},${yScale(p.price).toFixed(1)}` : null;
    }).filter(Boolean);
    return valid.length ? "M" + valid.join("L") : "";
  };

  // Build min/max band path for a series (area between min and max)
  const toBandPath = (points) => {
    const validPts = points.filter(p => {
      const idx = domainDates.indexOf(p.date);
      return idx >= 0 && p.min_price != null && p.max_price != null;
    });
    if (validPts.length < 2) return "";
    const top    = validPts.map(p => `${xScale(domainDates.indexOf(p.date)).toFixed(1)},${yScale(p.max_price).toFixed(1)}`);
    const bottom = [...validPts].reverse().map(p => `${xScale(domainDates.indexOf(p.date)).toFixed(1)},${yScale(p.min_price).toFixed(1)}`);
    return `M${top.join("L")}L${bottom.join("L")}Z`;
  };

  const todayX    = xScale(domainDates.indexOf(todayStr));
  const tomorrowX = xScale(domainDates.indexOf(tomorrowStr));
  const lastActualX = series.length > 0
    ? xScale(domainDates.indexOf([...new Set(series.flatMap(s => s.points.map(p => p.date)))].sort().pop() || ""))
    : PAD.l;

  const handleMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (mx < PAD.l || mx > w - PAD.r || my < PAD.t || my > h - PAD.b) { setTooltip(null); return; }
    const ratio   = (mx - PAD.l) / cW;
    const rawIdx  = Math.round(ratio * (domainDates.length - 1));
    const nearIdx = Math.max(0, Math.min(domainDates.length - 1, rawIdx));
    const nearDate = domainDates[nearIdx];
    const nearX    = xScale(nearIdx);

    const actualHits = series.map(s => {
      const pt = s.points.find(p => p.date === nearDate);
      return pt && pt.price != null ? { label: s.label, color: s.color, price: pt.price, isForecast: false } : null;
    }).filter(Boolean);

    const fcHits = forecastSeries.map(s => {
      const pt = s.points.find(p => p.date === nearDate);
      return pt && pt.price != null ? { label: s.label + " (forecast)", color: s.color, price: pt.price, isForecast: true } : null;
    }).filter(Boolean);

    const hits = [...actualHits, ...fcHits];
    if (!hits.length) { setTooltip(null); return; }
    setTooltip({ date: nearDate, hits, x: nearX, svgY: my });
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <svg ref={svgRef} width={w} height={h}
        style={{ overflow: "visible", display: "block", cursor: "crosshair" }}
        onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>

        {yGrid.map(({ y, label }) => (
          <g key={y}>
            <line x1={PAD.l} y1={y} x2={w - PAD.r} y2={y} stroke="var(--bd)" strokeWidth="1" strokeDasharray="4 3" />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--tx-s)">{label}</text>
          </g>
        ))}

        {/* Future shading */}
        {lastActualX < w - PAD.r && (
          <rect x={lastActualX} y={PAD.t} width={w - PAD.r - lastActualX} height={cH}
            fill="rgba(255,255,255,0.025)" />
        )}

        {/* Min/max shaded band for actual series */}
        {series.map((s, si) => {
          const bandPath = toBandPath(s.points);
          if (!bandPath) return null;
          return (
            <path key={`band-actual-${si}`} d={bandPath}
              fill={s.color} opacity="0.12" />
          );
        })}

        {/* Min/max shaded band for forecast series */}
        {forecastSeries.map((s, si) => {
          const bandPath = toBandPath(s.points);
          if (!bandPath) return null;
          return (
            <path key={`band-fc-${si}`} d={bandPath}
              fill={s.color} opacity="0.08" />
          );
        })}

        {/* Today/Tomorrow markers */}
        <g>
          <line x1={todayX} y1={PAD.t} x2={todayX} y2={PAD.t + cH} stroke="#2B4570" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.8" />
          <text x={todayX} y={PAD.t + 6} textAnchor="start" fontSize="9" fontWeight="700" fill="#2B4570" letterSpacing="0.5"
            transform={`rotate(-90, ${todayX}, ${PAD.t + 6})`}>{t("mi.today")?.toUpperCase()}</text>
        </g>
        <g>
          <line x1={tomorrowX} y1={PAD.t} x2={tomorrowX} y2={PAD.t + cH} stroke="#B4741E" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.8" />
          <text x={tomorrowX} y={PAD.t + 6} textAnchor="start" fontSize="9" fontWeight="700" fill="#B4741E" letterSpacing="0.5"
            transform={`rotate(-90, ${tomorrowX}, ${PAD.t + 6})`}>{t("mi.tomorrow")?.toUpperCase()}</text>
        </g>

        {xLabels.map(({ date, x, isToday, isTomorrow }) => (
          <text key={date} x={x} y={h - 6} textAnchor="middle"
            fontSize={isToday || isTomorrow ? "9" : "10"}
            fontWeight={isToday || isTomorrow ? "700" : "400"}
            fill={isToday ? "#2B4570" : isTomorrow ? "#B4741E" : "var(--tx-s)"}>
            {isToday ? t("mi.today") : isTomorrow ? t("mi.tomorrow") : date.slice(5)}
          </text>
        ))}

        {/* Actual data lines — solid */}
        {series.map((s, si) => {
          const path = toPath(s.points);
          if (!path) return null;
          return (
            <g key={`actual-${si}`}>
              <path d={path} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {(() => {
                const last = s.points[s.points.length - 1];
                const idx  = last ? domainDates.indexOf(last.date) : -1;
                return last && last.price != null && idx >= 0 ? (
                  <circle cx={xScale(idx)} cy={yScale(last.price)} r="4" fill={s.color} stroke="var(--bg)" strokeWidth="2" />
                ) : null;
              })()}
            </g>
          );
        })}

        {/* Forecast lines — DASHED */}
        {forecastSeries.map((s, si) => {
          const path = toPath(s.points);
          if (!path) return null;
          return (
            <g key={`fc-${si}`}>
              <path d={path} fill="none" stroke={s.color} strokeWidth="2.5"
                strokeDasharray="6 4" strokeLinecap="round" strokeLinejoin="round"
                opacity="0.85" />
              {(() => {
                const last = s.points[s.points.length - 1];
                const idx  = last ? domainDates.indexOf(last.date) : -1;
                return last && last.price != null && idx >= 0 ? (
                  <circle cx={xScale(idx)} cy={yScale(last.price)} r="4"
                    fill={s.color} stroke="var(--bg)" strokeWidth="2"
                    strokeDasharray="none" opacity="0.85" />
                ) : null;
              })()}
            </g>
          );
        })}

        {/* Hover crosshair */}
        {tooltip && (
          <line x1={tooltip.x} y1={PAD.t} x2={tooltip.x} y2={PAD.t + cH}
            stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="3 2" />
        )}
        {tooltip && tooltip.hits.map((hit, i) => {
          const allSeries = [...series, ...forecastSeries];
          const pt = allSeries.find(s =>
            s.label === hit.label.replace(" (forecast)", "") ||
            (hit.isForecast && s.label === hit.label.replace(" (forecast)", ""))
          )?.points.find(p => p.date === tooltip.date);
          if (!pt || pt.price == null) return null;
          return (
            <circle key={i} cx={tooltip.x} cy={yScale(pt.price)} r="5"
              fill={hit.color} stroke="var(--bg)" strokeWidth="2.5" />
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (() => {
        const tipW = 200;
        const leftPos = tooltip.x + 14 > w - tipW ? tooltip.x - tipW - 8 : tooltip.x + 14;
        return (
          <div style={{
            position: "absolute", left: leftPos, top: Math.max(0, tooltip.svgY - 20),
            background: "var(--bg-m)", border: "1px solid var(--bd)", borderRadius: "10px",
            padding: "10px 13px", boxShadow: "0 4px 24px rgba(0,0,0,.3)",
            zIndex: 100, pointerEvents: "none", width: `${tipW}px`,
          }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--tx-s)",
              textTransform: "uppercase", letterSpacing: ".6px", marginBottom: "8px",
              paddingBottom: "6px", borderBottom: "1px solid var(--bd)" }}>
              📅 {tooltip.date}
            </div>
            {tooltip.hits.map((hit, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "7px",
                marginBottom: i < tooltip.hits.length - 1 ? "6px" : 0 }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: hit.color, flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: "11px", color: "var(--tx-m)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {hit.label.replace(/ APMC$/, "")}
                  {hit.isForecast && <span style={{ color: "#5C3A5C", marginLeft: 4, fontSize: "9px", fontWeight: 700 }}>ARIMA</span>}
                </div>
                <div style={{ fontWeight: 800, fontSize: "12px", color: "var(--tx)", fontFamily: "var(--fd)", flexShrink: 0 }}>
                  ₹{hit.price.toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "8px" }}>
        {series.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: 12, height: 3, borderRadius: 2, background: s.color }} />
            <span style={{ fontSize: "11px", color: "var(--tx-m)" }}>{s.label}</span>
          </div>
        ))}
        {forecastSeries.map((s, i) => (
          <div key={`fc-${i}`} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <svg width="16" height="6" style={{ flexShrink: 0 }}>
              <line x1="0" y1="3" x2="16" y2="3" stroke={s.color} strokeWidth="2.5" strokeDasharray="5 3" />
            </svg>
            <span style={{ fontSize: "11px", color: s.color, fontWeight: 600 }}>{s.label} (ARIMA)</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="#2B4570" strokeWidth="2" strokeDasharray="4 3" /></svg>
          <span style={{ fontSize: "11px", color: "#2B4570", fontWeight: 600 }}>{t("mi.today")}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="#B4741E" strokeWidth="2" strokeDasharray="4 3" /></svg>
          <span style={{ fontSize: "11px", color: "#B4741E", fontWeight: 600 }}>{t("mi.tomorrow")}</span>
        </div>
        {(series.some(s => s.points.some(p => p.min_price)) || forecastSeries.some(s => s.points.some(p => p.min_price))) && (
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: 12, height: 8, background: "rgba(63,107,51,0.18)", borderRadius: 2 }} />
            <span style={{ fontSize: "11px", color: "var(--tx-s)" }}>{t("mi.min_max_band")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BAR CHART ────────────────────────────────────────────────────────────────
function BarChart({ data, valueKey, labelKey, color = "#3F6B33" }) {
  const { t } = useTranslation();
  const ref  = useRef(null);
  const dims = useDims(ref);
  const { w } = dims;
  const h = 200;
  const PAD = { t: 16, r: 20, b: 60, l: 70 };
  if (!data?.length) return (
    <div ref={ref} style={{ height: h, display: "flex", alignItems: "center",
      justifyContent: "center", color: "var(--tx-s)", fontSize: "13px" }}>{t("mi.no_data")}</div>
  );
  const values = data.map(d => parseFloat(d[valueKey]) || 0);
  const maxV   = Math.max(...values) * 1.1;
  const cW = w - PAD.l - PAD.r;
  const cH = h - PAD.t - PAD.b;
  const bW = (cW / data.length) * 0.65;
  const gap = cW / data.length;
  return (
    <div ref={ref}>
      <svg width={w} height={h} style={{ display: "block" }}>
        {data.map((d, i) => {
          const v  = parseFloat(d[valueKey]) || 0;
          const bH = (v / (maxV || 1)) * cH;
          const x  = PAD.l + i * gap + (gap - bW) / 2;
          const y  = PAD.t + cH - bH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={bW} height={bH} fill={color} rx="4" opacity="0.85" />
              <text x={x + bW / 2} y={y - 4} textAnchor="middle" fontSize="10" fill="var(--tx-m)">₹{Math.round(v).toLocaleString("en-IN")}</text>
              <text x={x + bW / 2} y={PAD.t + cH + 14} textAnchor="middle" fontSize="9" fill="var(--tx-s)">{String(d[labelKey]).slice(0, 10)}</text>
            </g>
          );
        })}
        <line x1={PAD.l} y1={PAD.t + cH} x2={w - PAD.r} y2={PAD.t + cH} stroke="var(--bd)" strokeWidth="1" />
      </svg>
    </div>
  );
}

// ─── HEATMAP ──────────────────────────────────────────────────────────────────
function HeatmapGrid({ matrix, dates, commodities }) {
  const { t } = useTranslation();
  if (!commodities?.length || !dates?.length)
    return <div style={{ color: "var(--tx-s)", fontSize: "13px", padding: "24px 0" }}>{t("mi.no_data")}</div>;
  const allVals = commodities.flatMap(c => dates.map(d => matrix?.[c]?.[d] || 0).filter(Boolean));
  const maxV    = Math.max(...allVals, 1);
  const toColor = (v) => `rgba(63,107,51,${Math.min(1, (v / maxV) * 0.9 + 0.1).toFixed(2)})`;
  const shown      = commodities.slice(0, 20);
  const shownDates = dates.filter((_, i) => i % Math.max(1, Math.floor(dates.length / 15)) === 0 || i === dates.length - 1);
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", fontSize: "10px", minWidth: "100%" }}>
        <thead>
          <tr>
            <th style={{ padding: "4px 8px", color: "var(--tx-s)", textAlign: "left", fontWeight: 600, minWidth: "120px" }}>{t("market.commodity")}</th>
            {shownDates.map(d => (
              <th key={d} style={{ padding: "4px 4px", color: "var(--tx-s)", fontWeight: 500, minWidth: "32px",
                transform: "rotate(-30deg)", transformOrigin: "bottom left", whiteSpace: "nowrap" }}>{d.slice(5)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map(c => (
            <tr key={c}>
              <td style={{ padding: "3px 8px", color: "var(--tx-m)", fontWeight: 500, maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c}</td>
              {shownDates.map(d => {
                const v = matrix?.[c]?.[d] || 0;
                return (
                  <td key={d} title={`${c} | ${d} | ₹${Math.round(v).toLocaleString("en-IN")}`}
                    style={{ background: toColor(v), padding: "3px 4px", textAlign: "center",
                      color: "transparent", userSelect: "none", border: "1px solid var(--bg)", cursor: "default" }}>{Math.round(v)}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: "10px", color: "var(--tx-s)", marginTop: "6px" }}>
        {commodities.length > 20 && ` Showing top 20 of ${commodities.length} commodities.`}
      </div>
    </div>
  );
}

// ─── SHARED STYLES ─────────────────────────────────────────────────────────────
const CARD = { background: "var(--bg-m)", borderRadius: "14px", padding: "18px 20px", border: "1px solid var(--bd)" };
const INP  = { width: "100%", background: "var(--bg-l)", border: "1px solid var(--bd)", color: "var(--tx)", fontFamily: "var(--fb)", fontSize: "13px", padding: "8px 12px", borderRadius: "9px", outline: "none", boxSizing: "border-box" };
const LBL  = { fontSize: "10px", fontWeight: 700, color: "var(--tx-m)", textTransform: "uppercase", letterSpacing: ".7px", display: "block", marginBottom: "4px" };
const BTN  = { background: "linear-gradient(135deg,var(--cp),var(--cp-dark))", color: "var(--bg)", border: "none", borderRadius: "9px", padding: "9px 18px", fontFamily: "var(--fd)", fontWeight: 800, fontSize: "13px", cursor: "pointer" };
const SECONDARY_BTN = { background: "var(--bg-l)", color: "var(--tx-m)", border: "1px solid var(--bd)", borderRadius: "9px", padding: "8px 16px", fontFamily: "var(--fd)", fontWeight: 600, fontSize: "12px", cursor: "pointer" };

function Spin() {
  return <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />;
}

function StatCard({ label, value, sub }) {
  return (
    <div style={CARD} className="text-center shadow-sm">
      <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--tx-s)", textTransform: "uppercase", letterSpacing: ".7px", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--cp)", fontFamily: "var(--fd)", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "var(--tx-s)", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

// ─── ML PANELS (Price Tools tab) ──────────────────────────────────────────────
function QuickPricePredict({ meta }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ state: "Maharashtra", district: "Pune", market: "Pune", commodity: "Onion", variety: "Local", grade: "FAQ", month: String(new Date().getMonth() + 1) });
  const [loading, setLoad] = useState(false);
  const [result, setRes]   = useState(null);
  const [error, setErr]    = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoad(true); setErr(""); setRes(null);
    try { const { data } = await mlAPI.price(form); setRes(data); }
    catch (err) { setErr(err.response?.data?.error || "Prediction failed."); }
    finally { setLoad(false); }
  };
  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <span style={{ fontSize: "1.5rem" }}>💰</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--tx)" }}>{t("ml.price_title")}</div>
          <div style={{ fontSize: "11px", color: "var(--tx-m)" }}>{t("ml.price_sub")}</div>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
          {[
            { label: t("ml.state"), key: "state", opts: meta?.states || ["Maharashtra"] },
            { label: t("ml.district"), key: "district", opts: meta?.districts?.[form.state] || ["Pune"] },
            { label: t("ml.commodity"), key: "commodity", opts: meta?.commodities || ["Onion"] },
            { label: t("ml.month"), key: "month", opts: (meta?.month_names || []).map((m, i) => ({ v: i + 1, l: m })) },
          ].map(({ label, key, opts }) => (
            <div key={key}>
              <label style={LBL}>{label}</label>
              <select style={INP} value={form[key]} onChange={e => set(key, e.target.value)}>
                {opts.map(o => typeof o === "object" ? <option key={o.v} value={o.v}>{o.l}</option> : <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        {error && <div style={{ color: "var(--danger)", fontSize: "12px", marginBottom: "8px" }}>{error}</div>}
        <button type="submit" style={{ ...BTN, display: "flex", alignItems: "center", gap: "6px" }} disabled={loading}>
          {loading ? <><Spin /> {t("ml.predicting")}</> : `🔮 ${t("ml.predict_price_btn")}`}
        </button>
      </form>
      {result && (
        <div style={{ marginTop: "14px", padding: "14px", background: "var(--bg-l)", borderRadius: "10px", border: "1px solid var(--bd)", textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: "var(--tx-s)", textTransform: "uppercase", letterSpacing: "1px" }}>{t("ml.expected_price")}</div>
          <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "var(--cp)", fontFamily: "var(--fd)", margin: "4px 0" }}>₹{result.prediction?.toLocaleString("en-IN")}</div>
          <div style={{ fontSize: "11px", color: "var(--tx-s)" }}>{t("ml.per_quintal")} · {result.model}</div>
        </div>
      )}
    </div>
  );
}

function QuickMarketRec({ meta }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ commodity: "Onion", state: "Maharashtra", variety: "Local", month: String(new Date().getMonth() + 1) });
  const [loading, setLoad] = useState(false);
  const [result, setRes]   = useState(null);
  const [error, setErr]    = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoad(true); setErr(""); setRes(null);
    try { const { data } = await mlAPI.market(form); setRes(data); }
    catch (err) { setErr(err.response?.data?.error || "Recommendation failed."); }
    finally { setLoad(false); }
  };
  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <span style={{ fontSize: "1.5rem" }}>🗺️</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--tx)" }}>{t("ml.market_title")}</div>
          <div style={{ fontSize: "11px", color: "var(--tx-m)" }}>{t("ml.market_sub")}</div>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
          <div><label style={LBL}>{t("ml.commodity")}</label>
            <select style={INP} value={form.commodity} onChange={e => set("commodity", e.target.value)}>
              {(meta?.commodities || ["Onion", "Tomato"]).map(c => <option key={c}>{c}</option>)}
            </select></div>
          <div><label style={LBL}>{t("ml.month")}</label>
            <select style={INP} value={form.month} onChange={e => set("month", e.target.value)}>
              {(meta?.month_names || []).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select></div>
        </div>
        {error && <div style={{ color: "var(--danger)", fontSize: "12px", marginBottom: "8px" }}>{error}</div>}
        <button type="submit" style={{ ...BTN, display: "flex", alignItems: "center", gap: "6px" }} disabled={loading}>
          {loading ? <><Spin /> {t("ml.predicting")}</> : `🔍 ${t("ml.find_best_market_btn")}`}
        </button>
      </form>
      {result?.recommendations && (
        <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {result.recommendations.slice(0, 5).map(m => (
            <div key={m.market} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", background: "var(--bg-l)", borderRadius: "9px", border: "1px solid var(--bd)" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, background: m.rank === 1 ? "var(--cp)" : "var(--bg)", color: m.rank === 1 ? "var(--bg)" : "var(--tx-m)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, border: "1px solid var(--bd)" }}>{m.rank}</div>
              <div style={{ flex: 1, fontSize: "12px" }}>
                <div style={{ fontWeight: 700, color: "var(--tx)" }}>{m.market}</div>
                <div style={{ color: "var(--tx-s)", fontSize: "11px" }}>{m.district}</div>
              </div>
              <div style={{ fontWeight: 800, fontSize: "14px", color: m.rank === 1 ? "var(--cp)" : "var(--tx)", fontFamily: "var(--fd)" }}>₹{m.predicted_price?.toLocaleString("en-IN")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function FarmerMarketIntelligencePage() {
  const { t, i18n } = useTranslation();

  const TABS = [
    { icon: "📈", label: t("market.tab_trend") },
    { icon: "📊", label: t("market.tab_compare") },
    { icon: "🗓", label: t("market.tab_heatmap") },
    { icon: "🧰", label: t("ml.title") },
  ];
  const [cities,          setCities]          = useState([]);
  const [commodities,     setCommodities]     = useState([]);
  const [syncStatus,      setSyncStatus]      = useState(null);
  const [selectedCities,  setSelectedCities]  = useState([]);
  const [commodity,       setCommodity]       = useState("");
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 60); return d.toISOString().split("T")[0]; });
  const [endDate,   setEndDate]   = useState(new Date().toISOString().split("T")[0]);
  const [trendData,   setTrendData]   = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [heatData,    setHeatData]    = useState(null);
  const [heatCity,    setHeatCity]    = useState("");
  const [mlMeta,      setMlMeta]      = useState(null);
  const [activeTab,   setActiveTab]   = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [syncing,     setSyncing]     = useState(false);
  const [toast,       setToast]       = useState("");

  // Location detection state & run-once refs
  const hasAutoLocatedRef = useRef(false);
  const citiesRef         = useRef([]);
  citiesRef.current       = cities;

  const [locating,        setLocating]        = useState(false);
  const [locationStatus,  setLocationStatus]  = useState("idle"); // idle | locating | detected | denied | unavailable
  const [detectedPlace,   setDetectedPlace]   = useState("");
  const [locationError,   setLocationError]   = useState("");

  // ARIMA & V3 Forecast state
  const [arimaLoading,  setArimaLoading]  = useState(false);
  const [arimaData,     setArimaData]     = useState(null);  // { city, commodity, forecast, actual_context }
  const [v3Data,        setV3Data]        = useState(null);  // v3 forecast & trend indicators
  const [arimaDays,     setArimaDays]     = useState(7);
  const [arimaCity,     setArimaCity]     = useState("");
  const [arimaCommodity,setArimaCommodity]= useState("");
  const [arimaError,    setArimaError]    = useState("");
  const [showCitiesPanel, setShowCitiesPanel] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const detectUserLocation = useCallback((availableCities, isManual = false) => {
    if (!isManual && hasAutoLocatedRef.current) return;
    hasAutoLocatedRef.current = true;
    const pool = (availableCities && availableCities.length) ? availableCities : citiesRef.current;
    if (!pool || !pool.length) return;
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }
    setLocating(true);
    setLocationStatus("locating");
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        let placeName = "";
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
            signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined
          });
          const d = await res.json();
          const addr = d.address || {};
          placeName = addr.city || addr.town || addr.county || addr.state_district || addr.state || "";
        } catch {}

        const nearby = findNearbyMarkets(lat, lon, pool, 40);
        if (nearby && nearby.length > 0) {
          const resolved = nearby.map(n => n.market);
          setSelectedCities(resolved);
          setHeatCity(resolved[0]);
          setArimaCity(resolved[0]);
          const label = placeName || resolved[0].replace(/ APMC$/i, "");
          setDetectedPlace(label);
          setLocationStatus("detected");
          showToast(`📍 ${t("mi.location_detected", { location: label })}: ${resolved.map(r => r.replace(/ APMC$/i, '')).join(', ')}`);
        } else {
          setLocationStatus("manual");
          setLocationError(t("mi.no_nearby_markets", "No APMC markets found within 30–40 km of your location. Please select a market manually."));
          setSelectedCities([]);
        }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocationStatus(err.code === 1 ? "denied" : "unavailable");
        if (err.code === 1) {
          setLocationError(t("mi.location_unavailable", "Location permission denied. Please select your market manually."));
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  }, [t]);

  useEffect(() => {
    Promise.all([
      marketAPI.cities(),
      marketAPI.commodities(),
      marketAPI.syncStatus(),
      mlAPI.metadata(),
    ]).then(([citiesRes, commsRes, syncRes, mlRes]) => {
      const cityList = citiesRes.data || [];
      setCities(cityList);
      citiesRef.current = cityList;

      const commList = commsRes.data || [];
      setCommodities(commList);
      if (commList.length > 0) {
        setCommodity(commList[0]);
        setArimaCommodity(commList[0]);
      }

      if (syncRes.data) setSyncStatus(syncRes.data);
      if (mlRes.data) setMlMeta(mlRes.data);

      // Auto-detect location once with freshly loaded cities
      detectUserLocation(cityList, false);
    }).catch((err) => {
      console.error("Failed to load initial market data:", err);
    });
  }, [detectUserLocation]);

  const fetchTrend = useCallback(() => {
    if (!selectedCities.length || !commodity) return;
    setLoading(true);
    marketAPI.trend({ cities: selectedCities.join(","), commodity, start: startDate, end: endDate })
      .then(({ data }) => setTrendData(data))
      .catch(() => setTrendData(null))
      .finally(() => setLoading(false));
  }, [selectedCities, commodity, startDate, endDate]);

  const fetchCompare = useCallback(() => {
    if (!selectedCities.length) return;
    marketAPI.compare({ cities: selectedCities.join(","), commodity, start: startDate, end: endDate })
      .then(({ data }) => setCompareData(data.data))
      .catch(() => setCompareData(null));
  }, [selectedCities, commodity, startDate, endDate]);

  const fetchHeatmap = useCallback(() => {
    if (!heatCity) return;
    marketAPI.heatmap({ city: heatCity, start: startDate, end: endDate })
      .then(({ data }) => setHeatData(data))
      .catch(() => setHeatData(null));
  }, [heatCity, startDate, endDate]);

  useEffect(() => {
    if (activeTab === 0) fetchTrend();
    if (activeTab === 1) fetchCompare();
    if (activeTab === 2) fetchHeatmap();
  }, [activeTab, fetchTrend, fetchCompare, fetchHeatmap]);

  // Change #1: Sync Now → after sync, reload data
  const handleSync = async () => {
    setSyncing(true);
    try {
      await marketAPI.refresh({ start: startDate, end: endDate });
      showToast("🔄 Sync started — reloading data shortly…");
      setTimeout(() => {
        marketAPI.syncStatus().then(({ data }) => setSyncStatus(data)).catch(() => {});
        if (activeTab === 0) fetchTrend();
        if (activeTab === 1) fetchCompare();
        if (activeTab === 2) fetchHeatmap();
      }, 4000);
    } catch { showToast("⚠ Sync failed — check backend."); }
    finally { setSyncing(false); }
  };

  const toggleCity = (city) =>
    setSelectedCities(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]);

  const lineSeries = trendData?.series
    ? Object.entries(trendData.series).map(([city, pts], i) => ({
        label: city, color: PALETTE[i % PALETTE.length], points: pts,
      }))
    : [];

  // ARIMA & V3 Market Forecast
  const handleArimaForecast = async () => {
    // Use the first selected city from the trend sidebar (most recently applied)
    const city = selectedCities[0] || "";
    const comm = commodity || "";
    if (!city || !comm) { setArimaError("Select a market and commodity from the sidebar first."); return; }
    setArimaLoading(true); setArimaError(""); setArimaData(null); setV3Data(null);
    try {
      const [arimaRes, v3Res] = await Promise.allSettled([
        marketAPI.arimaForecast({ city, commodity: comm, days: arimaDays }),
        marketAPI.forecastV3Predictions({ city, commodity: comm })
      ]);

      if (v3Res.status === "fulfilled" && v3Res.value?.data?.status === "success") {
        setV3Data(v3Res.value.data);
      }

      if (arimaRes.status === "fulfilled" && arimaRes.value?.data) {
        setArimaData(arimaRes.value.data);
      } else if (v3Res.status === "fulfilled" && v3Res.value?.data?.status === "success") {
        const v3 = v3Res.value.data;
        const target7 = v3.forecast?.["7_day"];
        const target14 = v3.forecast?.["14_day"];
        const pts = [];
        if (target7) pts.push({ date: target7.target_date, price: target7.forecasted_price, min_price: target7.confidence_bounds?.lower_95, max_price: target7.confidence_bounds?.upper_95 });
        if (target14 && arimaDays >= 14) pts.push({ date: target14.target_date, price: target14.forecasted_price, min_price: target14.confidence_bounds?.lower_95, max_price: target14.confidence_bounds?.upper_95 });
        setArimaData({ city, commodity: comm, forecast: pts });
      } else {
        const err = v3Res.reason?.response?.data?.error || arimaRes.reason?.response?.data?.error || "Forecast failed.";
        setArimaError(err);
      }
    } catch (err) {
      setArimaError(err.response?.data?.error || "Forecast failed.");
    } finally { setArimaLoading(false); }
  };

  // Build forecast chart series
  const arimaChartActual = arimaData?.actual_context
    ? [{ label: arimaData.city, color: PALETTE[0], points: arimaData.actual_context }]
    : [];
  const arimaChartForecast = arimaData?.forecast
    ? [{ label: arimaData.city, color: PALETTE[0], points: arimaData.forecast }]
    : [];

  const dateLocale  = i18n.language === "mr" ? "mr-IN" : i18n.language === "hi" ? "hi-IN" : "en-IN";
  const todayFmt    = new Date().toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" });
  const tomorrowFmt = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" }); })();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      {toast && (
        <div className="fixed bottom-5 right-5 z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-900 dark:text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="animate-[fadeup_0.4s_ease-out] mb-6">
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--tx)", display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              📊 {t('mi.title', 'Market Intelligence')}
            </h1>
            <p style={{ fontSize: "13px", color: "var(--tx-m)" }}>
              {t('mi.subtitle', 'Live APMC price data · Maharashtra · Auto-updated daily')}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {syncStatus?.newest && (
              <div style={{ fontSize: "11px", color: "var(--tx-s)", background: "var(--bg-l)", padding: "6px 14px", borderRadius: "20px", border: "1px solid var(--bd)" }}>
                {t('mi.latest_date', 'Latest:')} {syncStatus.newest}
              </div>
            )}
            <button onClick={handleSync} disabled={syncing} style={SECONDARY_BTN}>
              {syncing ? <><Spin /> {t('mi.forecasting', 'Syncing…')}</> : `🔄 ${t('mi.sync_now', 'Sync Now')}`}
            </button>
          </div>
        </div>
      </div>

      {/* Market Overview & Crop Cards */}
      {syncStatus && (
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--tx)", marginBottom: "12px" }}>
            {t('mi.market_overview', 'Market Overview')}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px" }}>
            <StatCard label={t('mi.latest_date', 'Latest Date')} value={syncStatus.newest || "—"} sub={syncStatus.oldest ? `from ${syncStatus.oldest}` : ""} />
            <StatCard label={t('mi.cities_tracked', 'Cities Tracked')} value={cities.length || "—"} />
            <StatCard label={t('mi.commodities', 'Commodities')} value={commodities.length || "—"} />
            <StatCard label={t('market.live_apmc_data', 'Live APMC Data')} value={t('market.active', 'Active')} />
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "248px 1fr", gap: "16px", alignItems: "start" }}>

        {/* SIDEBAR */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={CARD}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "4px" }}>
              <div style={LBL}>
                {t("market.markets_cities")}
                {selectedCities.length > 0 && <span style={{ color: "var(--cp)", marginLeft: "6px", fontWeight: 700, fontSize: "10px" }}>({selectedCities.length})</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                {selectedCities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCities([])}
                    title={t("common.clear_all", "Clear All")}
                    style={{
                      background: "var(--bg-m)", border: "1px solid var(--bd)", borderRadius: "6px",
                      padding: "2px 7px", fontSize: "10px", color: "var(--danger)", fontWeight: 700,
                      cursor: "pointer", display: "flex", alignItems: "center", gap: "3px",
                      transition: "all .15s"
                    }}
                  >
                    <span>✕</span>
                    {t("common.clear_all", "Clear All")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => detectUserLocation(citiesRef.current, true)}
                  disabled={locating}
                  title={t("mi.detect_location", "Detect nearest markets by GPS")}
                  style={{
                    background: "var(--bg-m)", border: "1px solid var(--bd)", borderRadius: "6px",
                    padding: "2px 8px", fontSize: "10px", color: "var(--cp)", fontWeight: 700,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: "4px",
                    transition: "all .15s"
                  }}
                >
                  <span>📍</span>
                  {locating
                    ? t("mi.detecting_location", "Detecting…")
                    : detectedPlace
                      ? detectedPlace
                      : t("mi.detect_location", "Detect")}
                </button>
              </div>
            </div>

            {locationError && (
              <div style={{
                marginBottom: "8px", padding: "6px 8px", background: "var(--warn-bg)",
                border: "1px solid var(--warn)", borderRadius: "6px", fontSize: "10.5px",
                color: "var(--tx)", lineHeight: 1.4
              }}>
                {locationError}
              </div>
            )}

            <CitySearchSelect
              cities={cities}
              selectedCities={selectedCities}
              onToggle={toggleCity}
              onClearAll={() => setSelectedCities([])}
            />

            {/* Quick-pick popular Mandis when no city is selected */}
            {selectedCities.length === 0 && (
              <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid var(--bd)" }}>
                <div style={{ fontSize: "10px", color: "var(--tx-s)", marginBottom: "6px", fontWeight: 600 }}>
                  {t("mi.quick_markets", "Popular Mandis:")}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {["Pune", "Nashik", "Nagpur", "Mumbai", "Chhatrapati Sambhajinagar", "Kolhapur", "Solapur", "Jalgaon"].map(hub => {
                    const match = cities.find(c => c.toLowerCase() === hub.toLowerCase() || c.toLowerCase().startsWith(hub.toLowerCase()));
                    if (!match) return null;
                    return (
                      <button
                        key={hub}
                        type="button"
                        onClick={() => toggleCity(match)}
                        style={{
                          background: "var(--bg-m)", border: "1px solid var(--bd)",
                          borderRadius: "12px", padding: "2px 8px", fontSize: "10px",
                          color: "var(--tx-m)", cursor: "pointer", transition: "all .12s"
                        }}
                      >
                        + {hub}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div style={CARD}>
            <label style={LBL}>{t("market.commodity")}</label>
            <select style={INP} value={commodity} onChange={e => setCommodity(e.target.value)}>
              <option value="">— {t("market.all_commodities")} —</option>
              {commodities.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div style={CARD}>
            <label style={LBL}>{t("market.date_range")}</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div><div style={{ ...LBL, marginBottom: "3px" }}>{t("market.from")}</div><input type="date" style={INP} value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
              <div><div style={{ ...LBL, marginBottom: "3px" }}>{t("market.to")}</div><input type="date" style={INP} value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            </div>
            <div style={{ marginTop: "8px", padding: "8px 10px", background: "rgba(43,69,112,.06)", border: "1px solid rgba(43,69,112,.15)", borderRadius: "8px", fontSize: "11px", lineHeight: 1.7 }}>
              <span style={{ color: "#2B4570", fontWeight: 700 }}>● {t("mi.today")}:</span>
              <span style={{ color: "var(--tx-m)", marginLeft: "4px" }}>{todayFmt}</span><br />
              <span style={{ color: "#B4741E", fontWeight: 700 }}>● {t("mi.tomorrow")}:</span>
              <span style={{ color: "var(--tx-m)", marginLeft: "4px" }}>{tomorrowFmt}</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "10px" }}>
              {[{ label: "7d", d: 7 }, { label: "30d", d: 30 }, { label: "90d", d: 90 }, { label: "1yr", d: 365 }].map(({ label, d }) => (
                <button key={label} onClick={() => {
                  const end = new Date(), start = new Date(); start.setDate(end.getDate() - d);
                  setStartDate(start.toISOString().split("T")[0]); setEndDate(end.toISOString().split("T")[0]);
                }} style={{ ...SECONDARY_BTN, padding: "4px 10px", fontSize: "11px" }}>{label}</button>
              ))}
            </div>
            <button onClick={() => {
              if (activeTab === 0) fetchTrend();
              if (activeTab === 1) fetchCompare();
              if (activeTab === 2) fetchHeatmap();
            }} style={{ ...BTN, width: "100%", marginTop: "10px", justifyContent: "center", display: "flex", alignItems: "center", gap: "6px" }}>
              {loading ? <><Spin /> {t("market.loading")}</> : t("market.apply")}
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ minWidth: 0 }}>
          {/* Tabs */}
          <div style={{ display: "flex", marginBottom: "18px", borderBottom: "2px solid var(--bd)" }}>
            {TABS.map((tab, i) => (
              <button key={i} onClick={() => setActiveTab(i)} style={{
                background: "transparent", border: "none",
                borderBottom: activeTab === i ? "3px solid var(--cp)" : "3px solid transparent",
                marginBottom: "-2px", padding: "8px 18px", cursor: "pointer",
                fontFamily: "var(--fd)", fontWeight: activeTab === i ? 700 : 500,
                fontSize: "13px", color: activeTab === i ? "var(--cp)" : "var(--tx-m)",
                display: "flex", alignItems: "center", gap: "5px", transition: "all .18s", whiteSpace: "nowrap",
              }}>{tab.icon} {tab.label}</button>
            ))}
          </div>

          {/* TAB 0: Unified Trend + ARIMA chart, plus ARIMA side panel */}
          {activeTab === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

              {/* ── Single unified chart card ── */}
              <div style={CARD}>
                {/* Chart header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "15px", color: "var(--tx)" }}>
                      {t("market.price_trend")} — {commodity || t("market.all_commodities")}
                    </div>
                  </div>
                  {(loading || arimaLoading) && <Spin />}
                </div>

                {/* The single chart — passes both actual + forecast series together */}
                {lineSeries.length > 0 || arimaChartActual.length > 0
                  ? <LineChart series={lineSeries} forecastSeries={arimaChartForecast} />
                  : <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--tx-s)" }}>
                      <div style={{ fontSize: "36px", marginBottom: "10px" }}>📍</div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--tx)", marginBottom: "6px" }}>
                        {t("mi.select_markets_prompt", "Select one or more markets to view live price trends & forecasts.")}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--tx-m)", maxWidth: "440px", margin: "0 auto 16px" }}>
                        {locationStatus === "denied"
                          ? t("mi.location_unavailable", "Location access unavailable. Please select your market manually from the left panel.")
                          : t("mi.location_permission_needed", "Allow location access to auto-detect nearest APMC markets.")}
                      </div>
                      <button
                        type="button"
                        onClick={() => detectUserLocation(citiesRef.current, true)}
                        disabled={locating}
                        style={{ ...BTN, display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 18px", fontSize: "12px", margin: "0 auto" }}
                      >
                        {locating ? <><Spin /> {t("mi.detecting_location", "Detecting…")}</> : <>📍 {t("mi.detect_location", "Auto-Detect Nearest Markets")}</>}
                      </button>
                    </div>}
              </div>

              {/* ── ARIMA controls + side panel ── */}
              <div style={CARD}>
                {/* Section header */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div>
                    <h3 style={{ fontSize: "16px", fontWeight: 800, color: "var(--tx)", lineHeight: 1.2 }}>
                      {t('mi.forecast_title', 'AI Price Forecast')}
                    </h3>
                    <p style={{ fontSize: "12px", color: "var(--tx-m)", marginTop: "2px" }}>
                      {t('mi.forecast_desc', 'Forecast overlays directly onto the chart above. Select city, crop & horizon.')}
                    </p>
                  </div>
                </div>

                {/* Controls row */}
                <div style={{
                  display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between",
                  gap: "14px", padding: "12px 16px", marginBottom: "20px",
                  background: "var(--bg-l)", borderRadius: "10px", border: "1px solid var(--bd)"
                }}>
                  <div style={{ fontSize: "13px", color: "var(--tx-m)" }}>
                    {t('mi.using', 'Configured:')}{' '}
                    <span style={{ fontWeight: 700, color: "var(--tx)" }}>{selectedCities[0] || '—'}</span>
                    {' · '}
                    <span style={{ fontWeight: 700, color: "var(--tx)" }}>{commodity || '—'}</span>
                  </div>
                  
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--tx-s)", textTransform: "uppercase", letterSpacing: ".6px" }}>{t('mi.horizon', 'Horizon')}</span>
                      <div style={{ display: "flex", background: "var(--bg-m)", padding: "2px", borderRadius: "8px", border: "1px solid var(--bd)" }}>
                        {[7, 14].map(d => (
                          <button
                            key={d}
                            onClick={() => setArimaDays(d)}
                            style={{
                              padding: "4px 10px", fontSize: "12px", fontWeight: 700, borderRadius: "6px", border: "none", cursor: "pointer",
                              background: arimaDays === d ? "var(--cp)" : "transparent",
                              color: arimaDays === d ? "var(--cp-text)" : "var(--tx-m)",
                              transition: "all .15s"
                            }}
                          >
                            {d}d
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <button
                      onClick={handleArimaForecast}
                      disabled={arimaLoading}
                      style={{ ...BTN, display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontSize: "12px" }}
                    >
                      {arimaLoading ? (
                        <>
                          <Spin /> {t('mi.forecasting', 'Forecasting...')}
                        </>
                      ) : (
                        <>🔮 {t('mi.run_forecast', 'Run Forecast')}</>
                      )}
                    </button>
                  </div>
                </div>

                {arimaError && (
                  <div style={{
                    marginBottom: "20px", padding: "12px 16px", borderRadius: "10px",
                    border: "1px solid var(--danger)", background: "var(--danger-bg)", color: "var(--danger)",
                    fontSize: "13px", display: "flex", alignItems: "center", gap: "8px"
                  }}>
                    ⚠️ {arimaError}
                  </div>
                )}

                {/* ── Side panel: per-day values (shown after forecast runs) ── */}
                {arimaData ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid var(--bd)", paddingBottom: "8px" }}>
                      <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--tx-s)", textTransform: "uppercase", letterSpacing: ".8px" }}>
                        {arimaDays}-{t('mi.daily_forecast_suffix', 'Day Daily Forecast')} — {arimaData.city} · {arimaData.commodity}
                      </span>
                    </div>

                    {/* Summary stats grid */}
                    {(() => {
                      const prices = arimaData.forecast.map(p => p.price);
                      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
                      const delta = prices[prices.length - 1] - prices[0];
                      const peak = Math.max(...arimaData.forecast.map(p => p.max_price));
                      const trough = Math.min(...arimaData.forecast.map(p => p.min_price));
                      
                      return (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
                          {[
                            {
                              label: t('mi.avg_price', 'Avg Price'),
                              val: `₹${Math.round(avg).toLocaleString('en-IN')}`,
                              color: "var(--info)",
                            },
                            {
                              label: t('mi.forecast_trend', 'Forecasted Trend'),
                              val: `${delta >= 0 ? '▲' : '▼'} ₹${Math.abs(Math.round(delta)).toLocaleString('en-IN')}`,
                              color: delta >= 0 ? "var(--safe)" : "var(--danger)",
                            },
                            {
                              label: t('mi.peak_max', 'Peak (Max)'),
                              val: `₹${Math.round(peak).toLocaleString('en-IN')}`,
                              color: "var(--warn)",
                            },
                            {
                              label: t('mi.floor_min', 'Floor (Min)'),
                              val: `₹${Math.round(trough).toLocaleString('en-IN')}`,
                              color: "var(--cp)",
                            }
                          ].map(({ label, val, color }) => (
                            <div key={label} style={{
                              padding: "12px", borderRadius: "10px", border: "1px solid var(--bd)",
                              background: "var(--bg-l)", textAlign: "center"
                            }}>
                              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--tx-s)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: "4px" }}>{label}</div>
                              <div style={{ fontSize: "18px", fontWeight: 900, color, fontFamily: "var(--fd)" }}>{val}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Daily horizontal cards */}
                    <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "10px" }}>
                      {arimaData.forecast.map((pt, i) => {
                        const prevPrice = i === 0 ? arimaData.last_actual_price : arimaData.forecast[i - 1].price;
                        const change = pt.price - prevPrice;
                        const isUp = change >= 0;
                        return (
                          <div
                            key={i}
                            style={{
                              minWidth: "115px", flexShrink: 0, background: "var(--bg-l)",
                              border: "1px solid var(--bd)",
                              borderTop: `4px solid ${isUp ? 'var(--safe)' : 'var(--danger)'}`,
                              borderRadius: "10px", padding: "10px", textAlign: "center"
                            }}
                          >
                            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--tx-s)", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: "6px" }}>
                              {t('mi.day', 'Day')} {i + 1}
                              <span style={{ display: "block", fontSize: "9px", fontWeight: 400, color: "var(--tx-s)", marginTop: "2px" }}>{pt.date.slice(5)}</span>
                            </div>
                            
                            <div style={{ fontWeight: 900, fontSize: "14px", color: "var(--tx)", fontFamily: "var(--fd)", marginBottom: "4px" }}>
                              ₹{pt.price.toLocaleString('en-IN')}
                            </div>
                            
                            <div style={{
                              fontSize: "10px", fontWeight: 700, marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "2px",
                              color: isUp ? "var(--safe)" : "var(--danger)"
                            }}>
                              {isUp ? '▲' : '▼'} ₹{Math.abs(Math.round(change)).toLocaleString('en-IN')}
                            </div>
                            
                            <div style={{ fontSize: "10px", color: "var(--tx-m)", borderTop: "1px solid var(--bd)", paddingTop: "6px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "4px", marginBottom: "2px" }}>
                                <span style={{ color: "var(--tx-s)" }}>{t('mi.high_short', 'H:')}</span>
                                <span style={{ fontWeight: 600, color: "var(--tx)" }}>₹{Math.round(pt.max_price).toLocaleString('en-IN')}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "4px" }}>
                                <span style={{ color: "var(--tx-s)" }}>{t('mi.low_short', 'L:')}</span>
                                <span style={{ fontWeight: 600, color: "var(--tx)" }}>₹{Math.round(pt.min_price).toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  !arimaLoading && (
                    <div style={{
                      padding: "36px 20px", textAlign: "center",
                      background: "var(--bg-l)", border: "1px dashed var(--bd)", borderRadius: "12px"
                    }}>
                      <span style={{ fontSize: "2rem", display: "block", marginBottom: "8px" }}>🔮</span>
                      <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--tx)", marginBottom: "4px" }}>
                        {t('mi.no_forecast', 'No forecast runs active')}
                      </p>
                      <p style={{ fontSize: "12px", color: "var(--tx-s)" }}>
                        {t('mi.no_forecast_sub', 'Select a city & commodity, choose horizon, and click Run Forecast to overlay predictions.')}
                      </p>
                    </div>
                  )
                )}

                {/* ── Extended Market Trends (v3 Signals Ensemble) ── */}
                {v3Data?.trend_indicators && (
                  <TrendIndicators trends={v3Data.trend_indicators} modelInfo={v3Data.model_info} />
                )}
              </div>
            </div>
          )}

          {/* TAB 1: Compare */}
          {activeTab === 1 && (
            <div style={CARD}>
              <div style={{ fontWeight: 800, fontSize: "15px", color: "var(--tx)", marginBottom: "4px" }}>{t("market.tab_compare")}</div>
              <div style={{ fontSize: "11px", color: "var(--tx-m)", marginBottom: "16px" }}>{t("market.avg_modal_per_market")} · {commodity || t("market.all_commodities")}</div>
              {compareData?.length > 0 ? (
                <>
                  <BarChart data={compareData} valueKey="avg_modal" labelKey="market" color="var(--cp)" />
                  <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {compareData.map((d, i) => (
                      <div key={d.market} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", background: "var(--bg-l)", borderRadius: "9px", border: "1px solid var(--bd)" }}>
                        <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: i === 0 ? "var(--cp)" : "var(--bg)", color: i === 0 ? "var(--bg)" : "var(--tx-s)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 800, border: "1px solid var(--bd)" }}>{i + 1}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--tx)" }}>{d.market}</div>
                          <div style={{ fontSize: "11px", color: "var(--tx-s)" }}>{t("market.min")} ₹{Number(d.min_price).toLocaleString("en-IN")} · {t("market.max")} ₹{Number(d.max_price).toLocaleString("en-IN")}</div>
                        </div>
                        <div style={{ fontWeight: 900, fontFamily: "var(--fd)", fontSize: "16px", color: i === 0 ? "var(--cp)" : "var(--tx)" }}>₹{Number(d.avg_modal).toLocaleString("en-IN")}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--tx-s)", fontSize: "13px" }}>{loading ? t("market.loading") : t("market.select_market_notice")}</div>
              )}
            </div>
          )}

          {/* TAB 2: Heatmap */}
          {activeTab === 2 && (
            <div style={CARD}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px", flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: "15px", color: "var(--tx)" }}>{t("market.tab_heatmap")}</div>
                  <div style={{ fontSize: "11px", color: "var(--tx-m)" }}>{t("market.heatmap_sub")}</div>
                </div>
                <div>
                  <label style={LBL}>{t("market.city")}</label>
                  <select style={{ ...INP, width: "160px" }} value={heatCity} onChange={e => setHeatCity(e.target.value)}>
                    {cities.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              {heatData
                ? <HeatmapGrid matrix={heatData.matrix} dates={heatData.dates} commodities={heatData.commodities} />
                : <div style={{ padding: "40px", textAlign: "center", color: "var(--tx-s)", fontSize: "13px" }}>{t("market.select_city_notice")}</div>}
            </div>
          )}

          {/* TAB 3: Price Tools (was ML Predict) */}
          {activeTab === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <QuickPricePredict meta={mlMeta} />
              <QuickMarketRec    meta={mlMeta} />
            </div>
          )}

        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}