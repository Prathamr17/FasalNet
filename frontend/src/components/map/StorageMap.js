// components/map/StorageMap.js — v8: Integrated mapflow routing + storage markers
// Uses leaflet-routing-machine (OSRM) to draw routes from farmer to selected storage
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet default icon URLs (webpack asset issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const STATUS_COLOR = { available: "#16A34A", full: "#DC2626", maintenance: "#D97706" };

const makePin = (color, rank) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:34px;height:34px;border-radius:50% 50% 50% 0;
      background:${color};border:2px solid #fff;
      transform:rotate(-45deg);display:flex;align-items:center;
      justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,.25);cursor:pointer;">
      <span style="transform:rotate(45deg);font-size:11px;font-weight:800;color:#fff;">${rank}</span>
    </div>`,
    iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -38],
  });

const farmerIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;">
    <div style="position:absolute;inset:-8px;background:rgba(37,99,235,.15);border-radius:50%;animation:ping 1.5s ease-in-out infinite;"></div>
    <div style="width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,.2);position:relative;"></div>
  </div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
});

const destinationIcon = L.divIcon({
  className: "",
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#DC2626;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.3);"></div>`,
  iconSize: [20, 20], iconAnchor: [10, 10],
});

// ── Routing Machine Component (leaflet-routing-machine) ─────────────────
function RoutingMachine({ start, end, onRouteFound }) {
  const map = useMap();
  const controlRef = useRef(null);

  useEffect(() => {
    if (!start || !end) {
      if (controlRef.current) {
        try { map.removeControl(controlRef.current); } catch {}
        controlRef.current = null;
      }
      return;
    }

    // Dynamically load leaflet-routing-machine
    import("leaflet-routing-machine").then(() => {
      if (controlRef.current) {
        try { map.removeControl(controlRef.current); } catch {}
      }
      const control = L.Routing.control({
        waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
        routeWhileDragging: false,
        showAlternatives: false,
        lineOptions: {
          styles: [{ color: "#2563EB", weight: 5, opacity: 0.85 }],
          extendToWaypoints: true,
          missingRouteTolerance: 0,
        },
        show: false,           // hide the default turn-by-turn panel
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        createMarker: () => null,  // suppress default routing markers (we use our own)
      }).addTo(map);

      control.on("routesfound", (e) => {
        const route = e.routes?.[0];
        if (route?.summary) onRouteFound?.(route.summary);
      });
      controlRef.current = control;
    }).catch(() => {});

    return () => {
      if (controlRef.current) {
        try { map.removeControl(controlRef.current); } catch {}
      }
    };
  }, [map, start, end]);

  return null;
}

// ── Auto-fit bounds ─────────────────────────────────────────────────────
function AutoFit({ storages, farmerPos }) {
  const map = useMap();
  useEffect(() => {
    const pts = storages.map(s => [parseFloat(s.lat), parseFloat(s.lon)]);
    if (farmerPos) pts.push(farmerPos);
    if (pts.length > 1) {
      try { map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 12 }); } catch {}
    }
  }, [storages, farmerPos, map]);
  return null;
}

// ── Route Info Banner ───────────────────────────────────────────────────
function RouteInfoBanner({ info, destination, onClear }) {
  if (!info) return null;
  const km  = (info.totalDistance / 1000).toFixed(1);
  const min = Math.round(info.totalTime / 60);
  return (
    <div style={{
      position: "absolute", bottom: "16px", left: "50%", transform: "translateX(-50%)",
      zIndex: 900, background: "var(--bg)", border: "1px solid var(--bd)",
      borderRadius: "12px", padding: "10px 16px", boxShadow: "0 4px 20px rgba(0,0,0,.15)",
      display: "flex", alignItems: "center", gap: "14px", whiteSpace: "nowrap",
    }}>
      <span style={{ fontSize: "18px" }}>🚗</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--tx)" }}>{destination}</div>
        <div style={{ fontSize: "11px", color: "var(--tx-m)" }}>
          {km} km · ~{min < 60 ? `${min} min` : `${Math.floor(min/60)}h ${min%60}m`}
        </div>
      </div>
      <button onClick={onClear} style={{ background: "var(--bg-m)", border: "none", borderRadius: "6px",
        padding: "4px 8px", cursor: "pointer", color: "var(--tx-m)", fontSize: "11px" }}>
        ✕ Clear
      </button>
    </div>
  );
}

// ── Main StorageMap ─────────────────────────────────────────────────────
export default function StorageMap({ storages = [], farmerPos, onSelectStorage, onBookStorage }) {
  const [routeStart,   setRouteStart]   = useState(null);
  const [routeEnd,     setRouteEnd]     = useState(null);
  const [routeInfo,    setRouteInfo]    = useState(null);
  const [routeDest,    setRouteDest]    = useState("");

  const handleGetDirections = (storage) => {
    if (!farmerPos) return;
    setRouteStart(farmerPos);
    setRouteEnd([parseFloat(storage.lat), parseFloat(storage.lon)]);
    setRouteDest(storage.name);
    setRouteInfo(null);
  };

  const clearRoute = () => {
    setRouteStart(null);
    setRouteEnd(null);
    setRouteInfo(null);
    setRouteDest("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      {/* Ping animation CSS */}
      <style>{`
        @keyframes ping {
          0%   { transform: scale(1); opacity: .8; }
          70%  { transform: scale(2); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        .leaflet-routing-container { display: none !important; }
      `}</style>

      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <MapContainer
          center={farmerPos || [20.5937, 78.9629]}
          zoom={5}
          style={{ width: "100%", height: "100%" }}
          scrollWheelZoom
          zoomControl
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />

          <AutoFit storages={storages} farmerPos={farmerPos} />

          {/* Routing layer */}
          <RoutingMachine
            start={routeStart}
            end={routeEnd}
            onRouteFound={setRouteInfo}
          />

          {/* Farmer location marker */}
          {farmerPos && (
            <Marker position={farmerPos} icon={farmerIcon} zIndexOffset={1000}>
              <Popup>
                <div style={{ padding: "8px", fontFamily: "sans-serif" }}>
                  <strong style={{ color: "#2563EB" }}>📍 Your Location</strong>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Route destination marker */}
          {routeEnd && (
            <Marker position={routeEnd} icon={destinationIcon} zIndexOffset={999} />
          )}

          {/* Storage markers */}
          {storages.map((s, idx) => (
            <Marker
              key={s.id}
              position={[parseFloat(s.lat), parseFloat(s.lon)]}
              icon={makePin(STATUS_COLOR[s.status] || "#16A34A", idx + 1)}
              eventHandlers={{ click: () => onSelectStorage?.(s) }}
            >
              <Popup maxWidth={230}>
                <div style={{ padding: "14px", fontFamily: "sans-serif", minWidth: "180px" }}>
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "#111827", marginBottom: "4px" }}>
                    {s.name}
                  </div>
                  <div style={{ fontSize: "11px", color: "#6B7280", marginBottom: "10px" }}>
                    {s.district}{s.state ? `, ${s.state}` : ""}
                    {s.distance_km && (
                      <span style={{ marginLeft: "8px", color: "#16A34A" }}>📍 {s.distance_km} km</span>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px",
                    fontSize: "11px", marginBottom: "10px" }}>
                    <div><span style={{ color: "#9CA3AF" }}>Available</span><br />
                      <strong>{(parseFloat(s.available_capacity_kg) / 1000).toFixed(1)} MT</strong></div>
                    <div><span style={{ color: "#9CA3AF" }}>Rate</span><br />
                      <strong>₹{parseFloat(s.price_per_kg_per_day).toFixed(2)}/kg/d</strong></div>
                    <div><span style={{ color: "#9CA3AF" }}>Temp</span><br />
                      <strong>{s.temp_min_celsius}–{s.temp_max_celsius}°C</strong></div>
                    <div><span style={{ color: "#9CA3AF" }}>Status</span><br />
                      <strong style={{ color: STATUS_COLOR[s.status] || "#16A34A", textTransform: "capitalize" }}>
                        {s.status}
                      </strong></div>
                  </div>

                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={e => { e.stopPropagation(); onBookStorage?.(s); }}
                      style={{ flex: 2, background: "#16A34A", color: "#fff", border: "none",
                        borderRadius: "7px", padding: "7px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                      Book Now →
                    </button>
                    {farmerPos && (
                      <button onClick={e => { e.stopPropagation(); handleGetDirections(s); }}
                        style={{ flex: 1, background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE",
                          borderRadius: "7px", padding: "7px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                        🗺 Route
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Route info banner (inside map container) */}
        {routeInfo && (
          <RouteInfoBanner
            info={routeInfo}
            destination={routeDest}
            onClear={clearRoute}
          />
        )}
      </div>
    </div>
  );
}
