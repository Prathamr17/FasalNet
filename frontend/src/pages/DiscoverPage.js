// pages/DiscoverPage.js — v9: live capacity polling, operator storage fix
import { useState, useEffect, useCallback } from "react";
import { farmerAPI } from "../services/api";
import StorageMap   from "../components/map/StorageMap";
import StorageList  from "../components/map/StorageList";
import BookingModal from "../components/booking/BookingModal";

const DEMO_STORAGES = [
  { id:1,  name:"GreenGrain Cold Store",   address:"Kagal Road",         district:"Kolhapur",  state:"Maharashtra",   lat:16.705, lon:74.243, total_capacity_kg:50000,  available_capacity_kg:22000, price_per_kg_per_day:1.80, temp_min_celsius:2, temp_max_celsius:8,  status:"available" },
  { id:2,  name:"AgroKool Facility",       address:"Hatkanangle",        district:"Kolhapur",  state:"Maharashtra",   lat:16.695, lon:74.265, total_capacity_kg:80000,  available_capacity_kg:45000, price_per_kg_per_day:2.10, temp_min_celsius:3, temp_max_celsius:10, status:"available" },
  { id:3,  name:"Sahyadri Cold Hub",       address:"Jaysingpur",         district:"Kolhapur",  state:"Maharashtra",   lat:16.720, lon:74.220, total_capacity_kg:30000,  available_capacity_kg:5000,  price_per_kg_per_day:1.50, temp_min_celsius:2, temp_max_celsius:8,  status:"available" },
  { id:4,  name:"FreshChain Storage",      address:"Ichalkaranji",       district:"Kolhapur",  state:"Maharashtra",   lat:16.680, lon:74.290, total_capacity_kg:60000,  available_capacity_kg:38000, price_per_kg_per_day:2.50, temp_min_celsius:1, temp_max_celsius:6,  status:"available" },
  { id:5,  name:"Vaibhav Cold Warehouse",  address:"Karveer",            district:"Kolhapur",  state:"Maharashtra",   lat:16.740, lon:74.200, total_capacity_kg:40000,  available_capacity_kg:15000, price_per_kg_per_day:1.90, temp_min_celsius:2, temp_max_celsius:8,  status:"available" },
  { id:6,  name:"Nashik AgroCold Hub",     address:"Mumbai-Agra Hwy",    district:"Nashik",    state:"Maharashtra",   lat:20.011, lon:73.790, total_capacity_kg:70000,  available_capacity_kg:42000, price_per_kg_per_day:1.70, temp_min_celsius:2, temp_max_celsius:8,  status:"available" },
  { id:7,  name:"Pune FreshStore",         address:"Hadapsar",           district:"Pune",      state:"Maharashtra",   lat:18.502, lon:73.927, total_capacity_kg:55000,  available_capacity_kg:31000, price_per_kg_per_day:2.20, temp_min_celsius:1, temp_max_celsius:7,  status:"available" },
  { id:8,  name:"Bangalore AgroFreeze",    address:"Yelahanka",          district:"Bengaluru", state:"Karnataka",     lat:13.100, lon:77.593, total_capacity_kg:90000,  available_capacity_kg:60000, price_per_kg_per_day:2.50, temp_min_celsius:1, temp_max_celsius:6,  status:"available" },
  { id:9,  name:"Ahmedabad AgroCold",      address:"Naroda GIDC",        district:"Ahmedabad", state:"Gujarat",       lat:23.073, lon:72.678, total_capacity_kg:100000, available_capacity_kg:75000, price_per_kg_per_day:1.60, temp_min_celsius:2, temp_max_celsius:8,  status:"available" },
  { id:10, name:"Jaipur AgroKool",         address:"Sitapura Industrial", district:"Jaipur",   state:"Rajasthan",     lat:26.793, lon:75.853, total_capacity_kg:60000,  available_capacity_kg:35000, price_per_kg_per_day:1.70, temp_min_celsius:2, temp_max_celsius:10, status:"available" },
  { id:11, name:"Lucknow AgroFreeze",      address:"Amausi",             district:"Lucknow",   state:"Uttar Pradesh", lat:26.763, lon:80.886, total_capacity_kg:90000,  available_capacity_kg:65000, price_per_kg_per_day:1.50, temp_min_celsius:1, temp_max_celsius:7,  status:"available" },
  { id:12, name:"Ludhiana AgroCold",       address:"Focal Point",        district:"Ludhiana",  state:"Punjab",        lat:30.910, lon:75.857, total_capacity_kg:100000, available_capacity_kg:72000, price_per_kg_per_day:1.55, temp_min_celsius:1, temp_max_celsius:6,  status:"available" },
  { id:13, name:"Chennai AgroCold",        address:"Ambattur",           district:"Chennai",   state:"Tamil Nadu",    lat:13.113, lon:80.155, total_capacity_kg:95000,  available_capacity_kg:68000, price_per_kg_per_day:2.20, temp_min_celsius:1, temp_max_celsius:7,  status:"available" },
  { id:14, name:"Hyderabad Cold Hub",      address:"Patancheru",         district:"Hyderabad", state:"Telangana",     lat:17.527, lon:78.264, total_capacity_kg:100000, available_capacity_kg:72000, price_per_kg_per_day:2.10, temp_min_celsius:1, temp_max_celsius:7,  status:"available" },
  { id:15, name:"Kolkata AgroCold",        address:"Dankuni",            district:"Howrah",    state:"West Bengal",   lat:22.680, lon:88.299, total_capacity_kg:100000, available_capacity_kg:72000, price_per_kg_per_day:1.80, temp_min_celsius:1, temp_max_celsius:7,  status:"available" },
];

const INDIA_STATES = [
  "Andhra Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa",
  "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
  "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Odisha",
  "Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh",
  "Uttarakhand","West Bengal",
];

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default function DiscoverPage() {
  const [storages,      setStorages]      = useState([]);
  const [recommended,   setRecommended]   = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [bookingTarget, setBookingTarget] = useState(null);
  const [farmerPos,     setFarmerPos]     = useState([20.5937, 78.9629]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [toast,         setToast]         = useState("");
  const [lastRefresh,   setLastRefresh]   = useState(null);

  // Shared filters — both map and list respond to these
  const [cityFilter,  setCityFilter]  = useState("");
  const [stateFilter, setStateFilter] = useState("");

  // ── Live storage fetch (runs on mount + every 30s for capacity refresh) ──
  const fetchStorages = useCallback(async (silent = false) => {
    if (!silent) setLoadingStores(true);
    try {
      const { data } = await farmerAPI.listStorages({ status: "available" });
      const fetched = data.storages || [];
      // Use API data whenever it returns any results — don't suppress operator's
      // newly registered storage just because count < 5
      setStorages(fetched.length > 0 ? fetched : DEMO_STORAGES);
      setLastRefresh(new Date());
    } catch {
      // Keep existing storages on network error; fall back to demo only on first load
      setStorages(prev => prev.length > 0 ? prev : DEMO_STORAGES);
    } finally {
      setLoadingStores(false);
    }
  }, []);

  useEffect(() => {
    fetchStorages();
    const interval = setInterval(() => fetchStorages(true), 30000); // silent refresh every 30s
    return () => clearInterval(interval);
  }, [fetchStorages]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setFarmerPos([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }, []);



  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  // Compute base list (recommended or all), add distance, apply shared filters, sort by distance
  const baseList = recommended.length ? recommended : storages;

  const filteredDisplay = baseList
    .map(s => ({
      ...s,
      distance_km: haversineKm(farmerPos[0], farmerPos[1], parseFloat(s.lat), parseFloat(s.lon)).toFixed(1),
    }))
    .filter(s => {
      if (cityFilter  && !s.district?.toLowerCase().includes(cityFilter.toLowerCase())) return false;
      if (stateFilter && s.state !== stateFilter) return false;
      return true;
    })
    .sort((a, b) => parseFloat(a.distance_km) - parseFloat(b.distance_km));

  return (
    <div style={{ maxWidth:"1280px", margin:"0 auto", padding:"24px 20px" }}>

      {/* Page header */}
      <div style={{ marginBottom:"24px" }} className="anim-fadeup">
        <h1 style={{ fontSize:"22px", fontWeight:800, color:"var(--tx)", marginBottom:"4px" }}>
          Discover Cold Storage
        </h1>
        <p style={{ fontSize:"13px", color:"var(--tx-m)" }}>
          Find and book the best-matched cold storage near you.
        </p>
      </div>

      {/* Shared filter bar */}
      <div className="card anim-fadeup d1" style={{ padding:"12px 16px", marginBottom:"16px",
        display:"flex", gap:"10px", alignItems:"center", flexWrap:"wrap" }}>
        <span style={{ fontSize:"11px", fontWeight:700, color:"var(--tx-s)",
          textTransform:"uppercase", letterSpacing:".6px", whiteSpace:"nowrap" }}>
          🔍 Filter Storages:
        </span>
        <input
          className="inp" value={cityFilter} onChange={e => setCityFilter(e.target.value)}
          placeholder="City / District…"
          style={{ flex:1, minWidth:"130px", padding:"6px 10px", fontSize:"12px" }}
        />
        <select className="inp" value={stateFilter} onChange={e => setStateFilter(e.target.value)}
          style={{ padding:"6px 10px", fontSize:"12px", minWidth:"130px" }}>
          <option value="">All States</option>
          {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(cityFilter || stateFilter) && (
          <button className="btn btn-ghost" onClick={() => { setCityFilter(""); setStateFilter(""); }}
            style={{ padding:"6px 12px", fontSize:"12px" }}>✕ Clear</button>
        )}
        <span style={{ fontSize:"11px", color:"var(--tx-s)", whiteSpace:"nowrap" }}>
          {filteredDisplay.length} results · sorted by distance
        </span>
        {lastRefresh && (
          <span style={{ fontSize:"10px", color:"var(--cp)", fontWeight:600,
            display:"flex", alignItems:"center", gap:"4px", whiteSpace:"nowrap" }}>
            <span style={{ width:"6px", height:"6px", borderRadius:"50%",
              background:"var(--cp)", display:"inline-block",
              animation:"ping 1.5s ease-in-out infinite" }}/>
            Live · {lastRefresh.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
          </span>
        )}
      </div>



      {/* Row 2: Map + List */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:"20px", alignItems:"start" }}>
        {/* Map — receives filtered list */}
        <div className="card anim-fadeup d3" style={{ height:"460px", overflow:"hidden", padding:0 }}>
          <StorageMap
            storages={filteredDisplay}
            farmerPos={farmerPos}
            onSelectStorage={setSelectedStore}
            onBookStorage={setBookingTarget}
            externalCityFilter={cityFilter}
            externalStateFilter={stateFilter}
            onFilterChange={(city, state) => { setCityFilter(city); setStateFilter(state); }}
          />
        </div>

        {/* Storage list — same filtered list */}
        <div className="card anim-fadeup d4" style={{ maxHeight:"460px", overflowY:"auto", padding:"16px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
            <span style={{ fontSize:"12px", fontWeight:700, textTransform:"uppercase",
              letterSpacing:".6px", color:"var(--tx-m)" }}>
              {recommended.length ? "Ranked Matches" : "Nearest Storages"}
            </span>
  
          </div>
          {loadingStores ? (
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              {[1,2,3,4].map(i => <div key={i} className="skel" style={{ height:"70px" }} />)}
            </div>
          ) : (
            <StorageList
              storages={filteredDisplay}
              selectedId={selectedStore?.id}

              onSelect={setSelectedStore}
              onBook={setBookingTarget}
            />
          )}
        </div>
      </div>

      {bookingTarget && (
        <BookingModal
          storage={bookingTarget}

          onClose={() => setBookingTarget(null)}
          onSuccess={() => { setBookingTarget(null); showToast("Booking sent! Operator will confirm shortly."); }}
        />
      )}

      {toast && (
        <div className="toast">
          <span style={{ color:"var(--safe)" }}>✓</span> {toast}
        </div>
      )}
    </div>
  );
}
