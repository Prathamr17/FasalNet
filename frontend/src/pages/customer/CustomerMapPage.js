// pages/customer/CustomerMapPage.js — v5: route to storage + delivery ETA
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import { farmerAPI } from "../../services/api";

// Fix default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── Custom icons ────────────────────────────────────────────────
const makeIcon = (emoji, color, size=36) => L.divIcon({
  className: "",
  html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};
    border:2.5px solid rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;
    font-size:${size*0.5}px;box-shadow:0 3px 12px rgba(0,0,0,.35);cursor:pointer;">${emoji}</div>`,
  iconSize:    [size,size],
  iconAnchor:  [size/2,size/2],
  popupAnchor: [0,-size/2-4],
});

const customerIcon  = makeIcon("📍","#F97316");
const deliveryIcon  = makeIcon("🏠","#16A34A");
const storageIcon   = (status) => makeIcon(
  status==="available" ? "❄️" : status==="full" ? "🔴" : "🔧",
  status==="available" ? "#22D3EE" : status==="full" ? "#FF5252" : "#F5B942",
  40
);

// Haversine distance
function haversine(lat1,lon1,lat2,lon2) {
  const R=6371, φ1=lat1*Math.PI/180, φ2=lat2*Math.PI/180,
    Δφ=(lat2-lat1)*Math.PI/180, Δλ=(lon2-lon1)*Math.PI/180,
    a=Math.sin(Δφ/2)**2+Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    try { map.fitBounds(L.latLngBounds(points), { padding:[60,60], maxZoom:14 }); } catch {}
  }, [points, map]);
  return null;
}

// Simple curved polyline between two points
function RoutePolyline({ from, to, color }) {
  if (!from || !to) return null;
  // Mid point slightly elevated for visual curve
  const mid = [(from[0]+to[0])/2 + 0.01, (from[1]+to[1])/2];
  const points = [from, mid, to];
  return (
    <Polyline
      positions={points}
      pathOptions={{
        color, weight:4, opacity:0.8,
        dashArray:"10 6",
      }}
    />
  );
}

const INDIA_STATES = ["Maharashtra","Karnataka","Gujarat","Rajasthan","UP","MP","Punjab","Haryana","Bihar","Tamil Nadu"];

const DEMO_STORAGES = [
  { id:1, name:"GreenGrain Cold Store",  district:"Kolhapur", state:"Maharashtra", lat:16.705, lon:74.243, total_capacity_kg:50000, available_capacity_kg:22000, price_per_kg_per_day:1.80, temp_min_celsius:2, temp_max_celsius:8,  status:"available", operator_name:"Sunita Patil" },
  { id:2, name:"AgroKool Facility",      district:"Sangli",   state:"Maharashtra", lat:16.865, lon:74.565, total_capacity_kg:80000, available_capacity_kg:45000, price_per_kg_per_day:2.10, temp_min_celsius:3, temp_max_celsius:10, status:"available", operator_name:"Raj Kumar" },
  { id:3, name:"Sahyadri Cold Hub",      district:"Pune",     state:"Maharashtra", lat:18.520, lon:73.856, total_capacity_kg:30000, available_capacity_kg:5000,  price_per_kg_per_day:1.50, temp_min_celsius:2, temp_max_celsius:8,  status:"full",      operator_name:"Meena Deshpande" },
  { id:4, name:"FreshChain Storage",     district:"Mumbai",   state:"Maharashtra", lat:19.076, lon:72.877, total_capacity_kg:60000, available_capacity_kg:38000, price_per_kg_per_day:2.50, temp_min_celsius:1, temp_max_celsius:6,  status:"available", operator_name:"Vinod Shah" },
  { id:5, name:"Deccan Coolhouse",       district:"Nashik",   state:"Maharashtra", lat:19.997, lon:73.791, total_capacity_kg:40000, available_capacity_kg:15000, price_per_kg_per_day:1.90, temp_min_celsius:2, temp_max_celsius:8,  status:"available", operator_name:"Pradeep Jagtap" },
];

export default function CustomerMapPage() {
  const { t } = useTranslation();
  const [storages,     setStorages]    = useState([]);
  const [selected,     setSelected]    = useState(null);
  const [customerPos,  setCustomerPos] = useState([18.52, 73.856]); // Pune default
  const [deliveryPos,  setDeliveryPos] = useState(null);
  const [districtFilter, setDistrict]  = useState("");
  const [stateFilter,    setState]     = useState("");
  const [showRoute,    setShowRoute]   = useState(false);
  const [eta,          setEta]         = useState(null);
  const [loading,      setLoading]     = useState(true);

  // Load storages
  useEffect(() => {
    (async () => {
      try {
        const { data } = await farmerAPI.listStorages({ status:"available" });
        setStorages(data.storages?.length ? data.storages : DEMO_STORAGES);
      } catch {
        setStorages(DEMO_STORAGES);
      } finally { setLoading(false); }
    })();
  }, []);

  // Geolocation
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (p) => setCustomerPos([p.coords.latitude, p.coords.longitude]),
      () => {}
    );
  }, []);

  const handleSelectStorage = (s) => {
    setSelected(s);
    setShowRoute(false); setEta(null);
  };

  const handleRoute = (s) => {
    const dist = haversine(customerPos[0],customerPos[1],parseFloat(s.lat),parseFloat(s.lon));
    const hrs  = dist / 40; // assume 40 km/h
    setEta({ dist: dist.toFixed(1), hrs: hrs.toFixed(1), arr: new Date(Date.now()+hrs*3600000).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}) });
    setDeliveryPos([parseFloat(s.lat), parseFloat(s.lon)]);
    setShowRoute(true);
    setSelected(s);
  };

  // Filter
  const filtered = storages.filter((s) => {
    if (districtFilter && !s.district?.toLowerCase().includes(districtFilter.toLowerCase())) return false;
    if (stateFilter    && s.state !== stateFilter) return false;
    return true;
  });

  const mapPoints = [customerPos, ...filtered.map(s=>[parseFloat(s.lat),parseFloat(s.lon)])];

  return (
    <div style={{ maxWidth:"1300px", margin:"0 auto", padding:"1.25rem 1rem" }}>

      {/* Header */}
      <div style={{ marginBottom:"1.25rem" }}>
        <h1 style={{ fontFamily:"var(--fd)", fontWeight:800, fontSize:"1.6rem", color:"var(--cp)" }}>
          {t("customer.map_title","Storage Map & Delivery Planner")}
        </h1>
        <p style={{ fontSize:"13px", color:"var(--tx-m)", marginTop:"3px" }}>
          Find cold storages near you, view routes and estimated delivery times.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:"10px", flexWrap:"wrap", marginBottom:"1rem" }}>
        <input className="inp" placeholder="Filter by district…" value={districtFilter}
          onChange={e=>setDistrict(e.target.value)}
          style={{ maxWidth:"200px" }} />
        <select className="inp" value={stateFilter} onChange={e=>setState(e.target.value)}
          style={{ maxWidth:"180px" }}>
          <option value="">All States</option>
          {INDIA_STATES.map(s=><option key={s}>{s}</option>)}
        </select>
        {(districtFilter||stateFilter) && (
          <button className="btn-ghost" onClick={()=>{setDistrict("");setState("");}}>
            Clear
          </button>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:"16px", alignItems:"start" }}
        className="max-md:grid-cols-1">

        {/* Map */}
        <div style={{ height:"560px", borderRadius:"20px", overflow:"hidden", border:"1px solid var(--bd)" }}>
          {!loading && (
            <MapContainer center={customerPos} zoom={10} style={{ width:"100%",height:"100%" }} scrollWheelZoom>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FitBounds points={mapPoints} />

              {/* Customer position */}
              <Marker position={customerPos} icon={customerIcon}>
                <Popup>
                  <div style={{ padding:"8px", fontFamily:"var(--fb)" }}>
                    <strong style={{ color:"var(--cp,#F97316)" }}>📍 Your Location</strong>
                    <div style={{ fontSize:"11px", marginTop:"4px", color:"#666" }}>Tap a storage to plan route</div>
                  </div>
                </Popup>
              </Marker>

              {/* Delivery destination */}
              {deliveryPos && showRoute && (
                <>
                  <Marker position={deliveryPos} icon={deliveryIcon}>
                    <Popup>
                      <div style={{ padding:"8px", fontFamily:"var(--fb)" }}>
                        <strong style={{ color:"#16A34A" }}>🏠 Storage / Delivery Point</strong>
                        {eta && <div style={{ fontSize:"11px", marginTop:"4px" }}>ETA: ~{eta.hrs}h · {eta.dist} km</div>}
                      </div>
                    </Popup>
                  </Marker>
                  <RoutePolyline from={customerPos} to={deliveryPos} color="var(--cp,#F97316)" />
                  {/* Arrival radius ring */}
                  <Circle center={deliveryPos} radius={800}
                    pathOptions={{ color:"var(--cp,#F97316)", fillColor:"var(--cp,#F97316)", fillOpacity:0.07, weight:1.5, dashArray:"6 4" }} />
                </>
              )}

              {/* Storage markers */}
              {filtered.map((s, idx) => (
                <Marker key={s.id}
                  position={[parseFloat(s.lat), parseFloat(s.lon)]}
                  icon={storageIcon(s.status)}
                  eventHandlers={{ click: () => handleSelectStorage(s) }}
                >
                  <Popup maxWidth={240}>
                    <div style={{ padding:"12px", fontFamily:"var(--fb)", minWidth:"200px" }}>
                      <div style={{ fontWeight:800, fontSize:"13px", marginBottom:"4px" }}>{s.name}</div>
                      <div style={{ fontSize:"11px", color:"#666", marginBottom:"8px" }}>{s.district}, {s.state}</div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px", fontSize:"11px", marginBottom:"10px" }}>
                        <div><span style={{color:"#888"}}>Available:</span><br/><strong>{(parseFloat(s.available_capacity_kg)/1000).toFixed(1)} MT</strong></div>
                        <div><span style={{color:"#888"}}>Rate:</span><br/><strong>₹{parseFloat(s.price_per_kg_per_day).toFixed(2)}/kg/day</strong></div>
                        <div><span style={{color:"#888"}}>Temp:</span><br/><strong>{s.temp_min_celsius}–{s.temp_max_celsius}°C</strong></div>
                        <div><span style={{color:"#888"}}>Dist:</span><br/><strong>{haversine(customerPos[0],customerPos[1],parseFloat(s.lat),parseFloat(s.lon)).toFixed(1)} km</strong></div>
                      </div>
                      <button
                        onClick={() => handleRoute(s)}
                        style={{ width:"100%", padding:"7px", borderRadius:"8px",
                          background:"#F97316", color:"#fff", border:"none",
                          fontWeight:700, fontSize:"12px", cursor:"pointer" }}>
                        🗺 Show Route & ETA
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
          {loading && (
            <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--bg-m)", color:"var(--tx-m)" }}>
              <div className="aspin" style={{ width:28,height:28,border:"3px solid var(--bd)",borderTopColor:"var(--cp)",borderRadius:"50%",marginRight:10 }} />
              Loading map…
            </div>
          )}
        </div>

        {/* Sidebar panel */}
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>

          {/* ETA card */}
          {eta && (
            <div className="ap" style={{ background:"var(--bg-l)", border:"1px solid var(--bd)", borderRadius:"16px", padding:"16px" }}>
              <div style={{ fontFamily:"var(--fd)", fontWeight:800, fontSize:"14px", color:"var(--cp)", marginBottom:"10px" }}>
                🗺 Route Details
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
                {[
                  ["Distance",  `${eta.dist} km`],
                  ["Est. Time", `~${eta.hrs} hrs`],
                  ["Arrival",   eta.arr],
                  ["Speed",     "40 km/h avg"],
                ].map(([k,v])=>(
                  <div key={k} style={{ background:"var(--bg-m)", borderRadius:"10px", padding:"8px 10px" }}>
                    <div style={{ fontSize:"9px", color:"var(--tx-s)", textTransform:"uppercase", letterSpacing:"0.8px" }}>{k}</div>
                    <div style={{ fontSize:"13px", fontWeight:700, color:"var(--tx)", marginTop:"2px" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected storage detail */}
          {selected && (
            <div className="au" style={{ background:"var(--bg-l)", border:"1.5px solid var(--cp)", borderRadius:"16px", padding:"16px" }}>
              <div style={{ fontFamily:"var(--fd)", fontWeight:800, fontSize:"14px", color:"var(--cp)", marginBottom:"8px" }}>
                ❄️ {selected.name}
              </div>
              <div style={{ fontSize:"12px", color:"var(--tx-m)", marginBottom:"10px" }}>
                {selected.district}, {selected.state}
              </div>
              {[
                ["Operator",    selected.operator_name],
                ["Available",   `${(parseFloat(selected.available_capacity_kg)/1000).toFixed(1)} MT`],
                ["Rate",        `₹${parseFloat(selected.price_per_kg_per_day).toFixed(2)}/kg/day`],
                ["Temperature", `${selected.temp_min_celsius}–${selected.temp_max_celsius}°C`],
                ["Status",      selected.status],
              ].map(([k,v])=>(
                <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                  padding:"6px 0", borderBottom:"1px solid var(--bd)", fontSize:"12px" }}>
                  <span style={{ color:"var(--tx-m)" }}>{k}</span>
                  <span style={{ fontWeight:600, color:"var(--tx)", textTransform:"capitalize" }}>{v}</span>
                </div>
              ))}
              <button onClick={() => handleRoute(selected)}
                style={{ width:"100%", marginTop:"12px", padding:"9px",
                  background:"var(--cp)", color:"var(--bg)", border:"none",
                  borderRadius:"10px", fontFamily:"var(--fd)", fontWeight:700,
                  fontSize:"13px", cursor:"pointer" }}>
                Get Route →
              </button>
            </div>
          )}

          {/* Storage list */}
          <div style={{ background:"var(--bg-l)", border:"1px solid var(--bd)", borderRadius:"16px", padding:"14px" }}>
            <div style={{ fontFamily:"var(--fd)", fontWeight:700, fontSize:"13px", color:"var(--tx-m)",
              textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:"10px" }}>
              {filtered.length} Storage{filtered.length !== 1 ? "s" : ""}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"8px", maxHeight:"280px", overflowY:"auto" }}>
              {filtered.map((s) => {
                const dist = haversine(customerPos[0],customerPos[1],parseFloat(s.lat),parseFloat(s.lon));
                return (
                  <button key={s.id} onClick={()=>handleSelectStorage(s)}
                    style={{ textAlign:"left", background: selected?.id===s.id ? "var(--bg-glass,rgba(249,115,22,.06))" : "var(--bg-m)",
                      border:`1.5px solid ${selected?.id===s.id?"var(--cp)":"var(--bd)"}`,
                      borderRadius:"10px", padding:"10px", cursor:"pointer", transition:"all .2s" }}>
                    <div style={{ fontWeight:700, fontSize:"12px", color:"var(--tx)", marginBottom:"2px" }}>{s.name}</div>
                    <div style={{ fontSize:"11px", color:"var(--tx-m)" }}>{s.district} · {dist.toFixed(1)} km · ₹{parseFloat(s.price_per_kg_per_day).toFixed(2)}/kg/day</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
