// components/map/StorageList.js — v11: Fully localized & clean UI
import { useTranslation } from "react-i18next";

export default function StorageList({ storages=[], selectedId, riskLevel, onSelect, onBook }) {
  const { t } = useTranslation();

  if (storages.length === 0) {
    return (
      <div style={{ textAlign:"center", padding:"32px 16px", color:"var(--tx-m)" }}>
        <div style={{ fontSize:"2rem", marginBottom:"8px" }}>🏭</div>
        <div style={{ fontSize:"13px" }}>{t("farmer.no_storages_match")}</div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
      {storages.map((s, idx) => {
        const pct  = s.total_capacity_kg > 0
          ? Math.round((1 - s.available_capacity_kg / s.total_capacity_kg) * 100) : 0;
        const avMT = (parseFloat(s.available_capacity_kg)/1000).toFixed(1);
        const isSelected = s.id === selectedId;
        const urgent = riskLevel === "CRITICAL" && idx === 0;
        const isFull = pct >= 95;
        const isNew = s.created_at && (Date.now() - new Date(s.created_at).getTime()) < 86400000;

        return (
          <div
            key={s.id}
            onClick={() => onSelect?.(s)}
            style={{
              padding:"12px 14px", borderRadius:"10px", cursor:"pointer",
              border:`1.5px solid ${isSelected ? "var(--cp)" : urgent ? "var(--danger)" : "var(--bd)"}`,
              background: isSelected ? "var(--cp-pale)" : urgent ? "var(--danger-bg)" : "var(--bg-l)",
              transition:"all .15s",
            }}
          >
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"flex-start", marginBottom:"7px", gap:"8px" }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
                  <span style={{ fontFamily:"var(--fm)", fontSize:"10px", fontWeight:700,
                    color:"var(--cp)", flexShrink:0 }}>#{idx+1}</span>
                  <span style={{ fontSize:"13px", fontWeight:700, color:"var(--tx)",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {s.name}
                  </span>
                  {s.verified && (
                    <span style={{ fontSize:"9px", color:"var(--safe)",
                      background:"var(--safe-bg)", padding:"1px 6px", borderRadius:"99px",
                      fontWeight:700, flexShrink:0 }}>✓ {t("storage.verified")}</span>
                  )}
                  {isNew && (
                    <span style={{ fontSize:"9px", color:"var(--info)",
                      background:"var(--info-bg)", padding:"1px 6px", borderRadius:"99px",
                      fontWeight:700, flexShrink:0 }}>{t("storage.new")}</span>
                  )}
                </div>
                <div style={{ fontSize:"11px", color:"var(--tx-m)", marginTop:"2px" }}>
                  {s.district}, {s.state}
                </div>
                {s.distance_km && (
                  <div style={{ fontSize:"10px", color:"var(--cp)", fontWeight:600, marginTop:"2px" }}>
                    📍 {s.distance_km} {t("storage.distance")}
                  </div>
                )}
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontFamily:"var(--fm)", fontWeight:700, fontSize:"13px",
                  color:"var(--cp)" }}>₹{parseFloat(s.price_per_kg_per_day).toFixed(2)}</div>
                <div style={{ fontSize:"10px", color:"var(--tx-s)" }}>{t("storage.price_per_kg_day")}</div>
              </div>
            </div>

            {/* Capacity bar */}
            <div style={{ marginBottom:"8px" }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                fontSize:"10px", color:"var(--tx-s)", marginBottom:"4px" }}>
                <span>{avMT} MT {t("storage.free")}</span>
                <span style={{ color: pct>80?"var(--danger)":pct>50?"var(--warn)":"var(--tx-s)", fontWeight: pct>80?700:400 }}>
                  {pct}% {t("storage.occupied")} {pct>=95 ? `(${t("storage.full")})` : ""}
                </span>
              </div>
              <div className="prog">
                <div className="prog-fill" style={{
                  "--w":`${pct}%`,
                  background: pct>80?"var(--danger)":pct>50?"var(--warn)":"var(--cp)"
                }}/>
              </div>
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:"10px", color:"var(--tx-s)" }}>
                {s.temp_min_celsius}–{s.temp_max_celsius}°C
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); if (!isFull) onBook?.(s); }}
                disabled={isFull}
                style={{
                  padding:"5px 12px", borderRadius:"7px", border:"none",
                  background: isFull ? "var(--bg-m)" : s.has_operator ? "var(--cp)" : "var(--safe)",
                  color: isFull ? "var(--tx-s)" : "var(--cp-text)",
                  fontSize:"11px", fontWeight:700,
                  cursor: isFull ? "not-allowed" : "pointer", flexShrink:0
                }}>
                {isFull ? t("storage.full") : t("farmer.book_now")}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
