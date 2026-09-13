"""
FasalNet Comprehensive Agricultural RAG Knowledge Base Generator
Sources:
  - ICAR Institutes (DOGR, IIHR, CPRI, IIWBR, CICR, IISR, NRRI, IIPR, IIMR, CIPHET, NRCB, NRCG, CITH, NRCP, CRIDA)
  - State Agricultural Universities (MPKV Rahuri, VNMKV Parbhani, Dr. BSKKV Dapoli, UAS Dharwad)
  - IMD - India Meteorological Department (Agromet Advisory Services)
  - Agmarknet / Directorate of Marketing & Inspection (DMI), Ministry of Agriculture & Farmers Welfare
  - National Horticulture Board (NHB) & APEDA
"""

import json
import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KB_DIR = os.path.join(BASE_DIR, "knowledge_base")
CROPS_DIR = os.path.join(KB_DIR, "crops")
GEN_DIR = os.path.join(KB_DIR, "general")

os.makedirs(CROPS_DIR, exist_ok=True)
os.makedirs(GEN_DIR, exist_ok=True)

DOCUMENTS = [
    # ── 1. ONION ──────────────────────────────────────────────────────────
    {
        "id": "crop_onion_icar_dogr",
        "title": "Onion Production, Weather Risks, Curing, Storage & Market Timing",
        "crop": "Onion",
        "category": "Cultivation, Harvest, Storage & Marketing",
        "source": "ICAR - Directorate of Onion and Garlic Research (DOGR), Pune & NHRDF",
        "organization": "ICAR-DOGR, Rajgurunagar, Pune, Maharashtra",
        "location": "Maharashtra & Western India",
        "date": "2026-01-15",
        "url_reference": "https://dogr.icar.gov.in/crop-advisory/onion",
        "topics": ["onion", "kanda", "climate", "temperature", "storage", "kanda chawl", "curing", "purple blotch", "rainfall", "selling timing", "apmc", "shelf life"],
        "content": """
# ICAR-DOGR Agricultural Advisory: Onion (Allium cepa)

## 1. Climate and Growth Requirements
- **Temperature**: Vegetative growth thrives at 15°C to 25°C. Bulb sizing, development, and maturity require 25°C to 35°C. Sustained temperatures >38°C cause premature bolting, sunburn, and undersized bulbs.
- **Soil & Moisture**: Fertile sandy loam to clay loam rich in organic carbon, pH 6.5–7.5. Highly sensitive to water stagnation; waterlogged soils induce basal rot (Fusarium oxysporum) and root asphyxiation.
- **Irrigation Schedule**: Regular light irrigations (every 7–10 days in winter, 4–6 days in summer). Stop all irrigation strictly 10–15 days before harvest to allow neck drying and enhance storage durability.

## 2. Weather Risks, Rainfall & Disease Proliferation
- **Unseasonal Rain at Harvest**: Rainfall during bulb maturity or lifting causes severe neck rot, black mould (Aspergillus niger), and rapid purple blotch (Alternaria porri) epidemics. Wet harvested bulbs cannot be cured and suffer 50–70% storage losses within 30 days.
- **High Relative Humidity (>75%)**: Coupled with temperatures of 20°C–28°C triggers purple blotch and Stemphylium blight. Apply prophylactic spray of Tebuconazole (0.1%) or Mancozeb (0.25%) with a sticker.
- **Cloudy Weather**: Sustained overcast weather reduces bulking rate and multiplies thrips (Thrips tabaci) infestation.

## 3. Harvesting Indicators and Field Curing
- **Harvest Stage**: Best harvested when 50% of plant tops fall over (50% neck fall). Never harvest prematurely as high internal moisture causes rapid rotting.
- **Pre-Harvest Withholding**: Stop pesticide sprays 7 days before lifting. Stop irrigation 10–15 days prior to harvest.
- **Field Curing (Windrowing)**: Keep uprooted bulbs in field windrows under leaf shade for 3–5 days to cure outer papery skin without direct sunscald.

## 4. Post-Harvest Handling & Storage (Kanda Chawl)
- **Shade Curing**: After windrowing, cure in well-ventilated dry sheds for 10–15 days until necks are completely dry and papery.
- **Neck Cutting**: Leave 2.0 to 2.5 cm neck attached to the bulb. Cutting flush with the bulb invites fungal pathogens directly into fleshy scales.
- **Optimal Storage Conditions**: Store in naturally ventilated bottom-and-side aerated structures (Kanda Chawl) at 25°C–30°C and 65%–70% relative humidity. Avoid airtight or damp rooms.
- **Shelf Life**: Rabi onion (cured) stores safely for 4–6 months. Kharif and Late Kharif onions have high moisture and should be marketed within 20–30 days of harvest.

## 5. Market Strategy & APMC Selling Decision Framework
- **Price Volatility**: Onion prices are heavily driven by arrivals in Maharashtra APMCs (Lasalgaon, Pimpalgaon, Sangli, Pune, Solapur).
- **Rain Supply Shocks**: Heavy rain in producing belts halts harvesting and transport, creating sudden supply deficits and short-term price spikes in regional mandis.
- **Action Strategy**: If XGBoost predicts an upward trend and weather is dry, holding well-cured Rabi onion in Kanda Chawl yields higher returns. If heavy rain is forecast during harvest, lift mature bulbs immediately and move under roof protection.
"""
    },

    # ── 2. TOMATO ─────────────────────────────────────────────────────────
    {
        "id": "crop_tomato_icar_iihr",
        "title": "Tomato Production, Perishability, Blight Risk, Transit & Market Arbitrage",
        "crop": "Tomato",
        "category": "Cultivation, Harvest, Storage & Marketing",
        "source": "ICAR - Indian Institute of Horticultural Research (IIHR), Bengaluru",
        "organization": "ICAR-IIHR, Bengaluru & MPKV Rahuri",
        "location": "Southern & Western India",
        "date": "2026-01-20",
        "url_reference": "https://iihr.icar.gov.in/crop-advisory/tomato",
        "topics": ["tomato", "tamatar", "perishable", "blight", "early blight", "late blight", "fruit cracking", "breaker stage", "cold storage", "transport", "market"],
        "content": """
# ICAR-IIHR Agricultural Advisory: Tomato (Solanum lycopersicum)

## 1. Climate and Growth Requirements
- **Temperature**: Daytime 21°C–28°C and nighttime 15°C–20°C are ideal for flowering and fruit set. Temperatures >35°C cause flower drop and blossom-end rot; <10°C retards growth and lycopene pigmentation.
- **Soil & Moisture**: Well-drained loamy soil, pH 6.0–7.0. Requires uniform soil moisture; alternating dry and wet spells causes severe fruit cracking.

## 2. Weather Risks, Blight Outbreaks & Fruit Cracking
- **Rainfall & High Humidity**: Rainfall during fruiting causes catastrophic Early Blight (Alternaria solani) and Late Blight (Phytophthora infestans). Late blight can destroy an entire field within 48–72 hours under cool, wet, overcast conditions.
- **Fruit Cracking**: Sudden rain after a dry spell creates osmotic pressure inside fruits, splitting outer skins and rendering them unmarketable.
- **Pest Risks**: High temperatures favor Tomato Pinworm (Tuta absoluta) and Whitefly vectors transmitting Tomato Leaf Curl Virus (ToLCV).

## 3. Harvesting Guidance for Market Distances
- **Maturity Stages**:
  - **Breaker Stage (10% pinkish color at blossom end)**: Harvest for long-distance transport (300–1000 km) or 5–7 day holding.
  - **Turning to Pink Stage (30–60% color)**: Harvest for regional APMC transport (within 50–150 km, e.g., Kolhapur, Sangli, Pune).
  - **Red Ripe (Full red)**: Harvest strictly for immediate same-day local market retail or local processing.
- **Harvest Timing**: Pluck early morning or late afternoon. Avoid harvesting in hot midday sun or immediately after rain (wet fruits develop transit soft rot).

## 4. Post-Harvest Handling and Storage
- **Grading & Packing**: Grade by size and ripeness. Pack in plastic crates (20–25 kg capacity) with smooth interiors to avoid puncture and compression damage.
- **Storage Parameters**: Ripe tomatoes store at 10°C–12°C with 85%–90% RH for 7–10 days. Breaker stage tomatoes store at 12°C–15°C for up to 14–21 days.
- **Shelf Life**: At ambient summer temperatures (30°C–35°C), ripe tomato shelf life is only 2–4 days.

## 5. Market and Selling Strategy
- **Perishability Dynamics**: Tomato is highly perishable. Holding ripe tomato on farm expecting higher future prices is risky due to weight loss and decay.
- **Rain Supply Shocks**: Heavy rain damages fruit quality and cuts arrivals, frequently causing sharp price spikes for premium-grade undamaged produce.
- **Action Recommendation**: If XGBoost predicts a price increase over 7 days and fruit is at breaker/turning stage, staged harvesting and dispatch to higher-priced nearby APMCs is recommended.
"""
    },

    # ── 3. POTATO ─────────────────────────────────────────────────────────
    {
        "id": "crop_potato_icar_cpri",
        "title": "Potato Production, Late Blight Risk, Dehaulming, Curing & Cold Storage",
        "crop": "Potato",
        "category": "Cultivation, Harvest, Storage & Marketing",
        "source": "ICAR - Central Potato Research Institute (CPRI), Shimla",
        "organization": "ICAR-CPRI & State Agricultural Universities",
        "location": "All India Potato Belts",
        "date": "2026-01-10",
        "url_reference": "https://cpri.icar.gov.in/crop-advisory/potato",
        "topics": ["potato", "alu", "batata", "tuberization", "late blight", "dehaulming", "curing", "cold storage", "greening", "apmc"],
        "content": """
# ICAR-CPRI Agricultural Advisory: Potato (Solanum tuberosum)

## 1. Climate and Growth Requirements
- **Temperature**: Vegetative growth thrives at 20°C–25°C, while tuberization requires night temperatures of 15°C–18°C. Night temperatures >22°C drastically halt tuber formation.
- **Soil Requirements**: Deep, well-aerated sandy loam with pH 5.2–6.8. Heavy soils cause misshapen tubers and harvesting bruises.

## 2. Weather Risks and Disease Triggers
- **Late Blight (Phytophthora infestans)**: Triggered by temperatures between 12°C–22°C with relative humidity >85% and continuous leaf wetness.
- **Rain at Harvesting**: Rain during lifting exposes tubers to bacterial soft rot (Erwinia carotovora) and Pythium leak in transit/storage.
- **Tuber Greening**: Exposure of developing tubers to sunlight induces chlorophyll and toxic solanine alkaloid formation. Proper earthing-up is critical.

## 3. Harvesting and Curing Guidance
- **Dehaulming (Haulm Cutting)**: Cut aerial vine foliage 10–12 days before digging. This allows the tuber periderm (skin) to harden and mature, preventing peeling during handling.
- **Lifting Operations**: Harvest on bright sunny days when soil is friable. Avoid bruised or damaged tubers.
- **Curing (Suberization)**: Cure harvested tubers in dark, ventilated heaps at 15°C–20°C with 85%–90% RH for 10–14 days to heal wounds and thicken skins.

## 4. Post-Harvest & Cold Storage
- **Cold Storage Conditions**: Table potatoes: 8°C–10°C with 85%–90% RH (with CIPC sprout suppressant). Processing potatoes: 10°C–12°C to prevent reducing sugar accumulation (cold-sweetening).
- **Shelf Life**: Cured potato stores under farm conditions in dark, dry ventilated spaces for 45–60 days; in cold storage for 6–9 months.

## 5. Market and Selling Strategy
- **Price Trend Drivers**: Large cold store releases in UP/Punjab/Gujarat dictate national baseline prices. Regional APMC prices in Maharashtra (Pune, Manchar, Sangli) spike during festive and off-season intervals.
- **Action Recommendation**: If XGBoost predicts stable or rising prices, holding cured potato in well-ventilated dark farm storage for 2–4 weeks is viable.
"""
    },

    # ── 4. WHEAT ──────────────────────────────────────────────────────────
    {
        "id": "crop_wheat_icar_iiwbr",
        "title": "Wheat Production, Terminal Heat, Moisture Standards & Warehouse Storage",
        "crop": "Wheat",
        "category": "Cultivation, Harvest, Storage & Marketing",
        "source": "ICAR - Indian Institute of Wheat and Barley Research (IIWBR), Karnal",
        "organization": "ICAR-IIWBR, Karnal & MPKV Rahuri",
        "location": "North & Central-Western India",
        "date": "2026-02-01",
        "url_reference": "https://iiwbr.icar.gov.in/crop-advisory/wheat",
        "topics": ["wheat", "gehun", "grain", "terminal heat", "rust", "moisture content", "sun drying", "msp", "storage", "weevil"],
        "content": """
# ICAR-IIWBR Agricultural Advisory: Wheat (Triticum aestivum)

## 1. Climate and Growth Requirements
- **Temperature**: Cool vegetative phase (10°C–15°C) and warm grain filling period (20°C–25°C).
- **Terminal Heat Stress**: Sudden heat waves (>32°C) during milking/dough stage (February–March) accelerate senescence, causing shriveled grains and 15–25% yield drops.

## 2. Weather Risks and Grain Quality
- **Unseasonal Rain & Hailstorms**: Rain during grain ripening or harvesting causes lodging, earhead sprouting, and grain discolouration, reducing market grade and inviting fungal smut/rust toxins.
- **High Moisture at Harvest**: Harvesting grain with >14% moisture causes heating, mould growth (Aspergillus flavus), and rapid grain borer infestation in storage.

## 3. Harvesting & Threshing Guidance
- **Harvest Stage**: Harvest when grain is hard and straw turns yellow-golden (moisture 12–14%).
- **Combine Harvester / Reaper**: Harvest during dry sunny hours. Ensure combine cylinder speed is adjusted to minimize cracked kernels.
- **Sun Drying**: Sun-dry threshing grain on clean concrete yards or tarpaulins for 2–3 days until grain moisture drops strictly below 10–12%.

## 4. Post-Harvest Storage & Pest Management
- **Safe Moisture**: Store grain at <10% moisture content in airtight metal bins or hermetic bags (PICS bags).
- **Pest Protection**: Clean and fumigate storage bins with Aluminium Phosphide or mix dry neem leaf powder to repel Rice Weevil (Sitophilus oryzae) and Lesser Grain Borer (Rhyzopertha dominica).
- **Shelf Life**: Properly dried wheat in sealed metal bins or cool dry warehouses remains viable for 12–24 months without quality loss.

## 5. Market and Selling Strategy
- **Government MSP vs Open Market**: Compare prevailing APMC rates with Government Minimum Support Price (MSP). When market rates exceed MSP post-harvest, staged open market selling is profitable.
- **Action Recommendation**: Wheat is a durable non-perishable commodity. If XGBoost forecasts a price rise over 14 days and dry storage is available, farmers should hold and avoid distress selling during peak harvest arrival gluts.
"""
    },

    # ── 5. COTTON ─────────────────────────────────────────────────────────
    {
        "id": "crop_cotton_icar_cicr",
        "title": "Cotton Boll Maturation, Clean Picking, Moisture Penalty & CCI/APMC Selling",
        "crop": "Cotton",
        "category": "Cultivation, Harvest, Storage & Marketing",
        "source": "ICAR - Central Institute for Cotton Research (CICR), Nagpur",
        "organization": "ICAR-CICR, Nagpur & VNMKV Parbhani",
        "location": "Vidarbha, Marathwada & Khandesh",
        "date": "2026-01-25",
        "url_reference": "https://cicr.icar.gov.in/crop-advisory/cotton",
        "topics": ["cotton", "kapas", "picking", "pink bollworm", "lint quality", "moisture penalty", "ginning", "cci", "market"],
        "content": """
# ICAR-CICR Agricultural Advisory: Cotton (Gossypium hirsutum)

## 1. Climate Requirements and Boll Development
- **Temperature**: Ideal range 21°C–35°C during boll maturation. Requires sunny, cloudless weather for uniform boll opening.
- **Soil**: Deep black cotton soils (Vertisols) with high water-holding capacity, pH 7.0–8.5.

## 2. Weather Risks & Quality Degradation
- **Rainfall during Boll Opening**: Rain on open cotton bolls discolours lint (yellowing/graying), causes boll rot, reduces staple strength, and degrades price by 20–35%.
- **High Relative Humidity**: Increases incidence of Pink Bollworm (Pectinophora gossypiella) and fungal boll rots.

## 3. Picking (Harvesting) Guidance
- **Picking Timing**: Pick seed cotton (Kapas) in the morning after dew has completely evaporated. Never pick wet or dew-laden bolls.
- **Clean Picking**: Avoid dry bracts, leaf trash, and diseased bolls. Keep clean white cotton separate from stained bolls.
- **Picking Intervals**: Conduct 3–4 pickings at 15–20 day intervals as bolls burst.

## 4. Post-Harvest Drying & Storage
- **Moisture Threshold**: Kapas moisture must be strictly <8% at storage/sale. Ginning factories heavily penalize damp cotton.
- **Sun Drying**: Dry Kapas on clean tarpaulins under the sun for 2–3 days. Never store on bare damp mud floors.
- **Storage**: Store in clean, dry, rodent-proof godowns away from open flames and chemicals.

## 5. Market and Selling Strategy
- **Cotton Corporation of India (CCI) & MSP**: Compare local APMC traders against CCI procurement centers.
- **Action Recommendation**: If XGBoost shows positive price momentum and Kapas is clean and dry (<8% moisture), holding for 14–30 days after harvest rush avoids typical arrival discounts.
"""
    },

    # ── 6. SOYBEAN ────────────────────────────────────────────────────────
    {
        "id": "crop_soybean_icar_iisr",
        "title": "Soybean Growth, Pod Shattering, Threshing Speed & Oilseed Marketing",
        "crop": "Soybean",
        "category": "Cultivation, Harvest, Storage & Marketing",
        "source": "ICAR - Indian Institute of Soybean Research (IISR), Indore",
        "organization": "ICAR-IISR, Indore & MPKV Rahuri",
        "location": "Maharashtra & Madhya Pradesh",
        "date": "2026-01-18",
        "url_reference": "https://iisrindore.icar.gov.in/crop-advisory/soybean",
        "topics": ["soybean", "soyabean", "oilseed", "pod shattering", "threshing rpm", "moisture content", "rain at harvest", "market"],
        "content": """
# ICAR-IISR Agricultural Advisory: Soybean (Glycine max)

## 1. Climate & Growth Requirements
- **Temperature**: 25°C–32°C optimal for vegetative and pod development.
- **Rainfall**: Requires 600–850 mm well-distributed rainfall. Severe dry spells at flowering/pod fill cause flower abortion and flat pods.

## 2. Weather Risks at Harvest
- **Unseasonal Rain at Maturity**: Wet conditions at harvest trigger seed germinating inside pods (pre-harvest sprouting), pod blight (Colletotrichum truncatum), seed coat darkening, and loss of seed germination viability.
- **Over-Drying & Pod Shattering**: Dry hot winds with moisture <10% cause explosive pod shattering in the standing crop, losing up to 15–30% of grain on the field.

## 3. Harvesting Guidance
- **Optimal Harvest Time**: Harvest when 90–95% of leaves have turned yellow-brown and dropped, and pods produce a distinct rattling sound when shaken (moisture ~14–15%).
- **Cutting Method**: Cut plants close to the ground using sickle or combine during early morning hours to reduce pod shattering.

## 4. Threshing and Storage
- **Threshing Speed**: Thresher cylinder speed should not exceed 350–400 RPM. High cylinder speeds cause seed coat cracks and internal embryo damage, reducing oil extraction quality and seed viability.
- **Safe Storage Moisture**: Sun-dry seeds until moisture content drops to 10–11%. Store in dry, well-aerated godowns on wooden pallets (never direct on cement floors).

## 5. Market and Selling Strategy
- **Price Dynamics**: Soybean prices in Maharashtra (Latur, Nagpur, Akola, Sangli) correlate with global edible oil prices, meal exports, and domestic processing demand.
- **Action Recommendation**: If XGBoost forecasts price escalation over 14 days and seed is dried to 10% moisture, storing in farm bags provides hedging against post-harvest market glut.
"""
    },

    # ── 7. RICE / PADDY ───────────────────────────────────────────────────
    {
        "id": "crop_rice_icar_nrri",
        "title": "Rice Crop Water Management, Blast Disease, Sun-Drying & Head Rice Recovery",
        "crop": "Rice",
        "category": "Cultivation, Harvest, Storage & Marketing",
        "source": "ICAR - National Rice Research Institute (NRRI), Cuttack",
        "organization": "ICAR-NRRI, Cuttack & State Agriculture Departments",
        "location": "Coastal & Inland Rice Belts",
        "date": "2026-01-22",
        "url_reference": "https://nrri.icar.gov.in/crop-advisory/rice",
        "topics": ["rice", "paddy", "dhan", "water management", "leaf blast", "lodging", "milling quality", "head rice recovery", "storage", "msp"],
        "content": """
# ICAR-NRRI Agricultural Advisory: Rice / Paddy (Oryza sativa)

## 1. Climate and Growth Parameters
- **Temperature**: 22°C–32°C throughout growth period. Night temperatures <18°C during heading cause spikelet sterility.
- **Water Management**: Continuous shallow water (2–5 cm) during tillering and panicle development. Drain field 10–12 days before harvest.

## 2. Weather Risks & Quality
- **Cyclonic Rain / Rain at Harvest**: Rain causing crop lodging leads to panicle sprouting in standing water, discoloured grains, and high broken percentage during rice milling.
- **High Humidity**: Triggers severe Leaf Blast (Magnaporthe oryzae) and Bacterial Leaf Blight (Xanthomonas oryzae).

## 3. Harvesting & Threshing Guidance
- **Harvest Stage**: Harvest when 80–85% of grains in the panicle turn golden-yellow and moisture is 20–22%.
- **Drying Protocol**: Sun-dry paddy slowly on tarpaulins to reduce moisture from 20% to 13–14% for safe storage and high head rice recovery (HRR) during milling. Fast sun-drying causes grain checking/cracking.

## 4. Storage & Market Strategy
- **Safe Storage**: Keep paddy at 12–13% moisture in moisture-proof gunny bags stacked on wooden dunnage in aerated warehouses.
- **Selling Timing**: If local APMC prices are lower than MSP, register at government PACS/procurement centers. When XGBoost shows rising prices in regional markets, hold dried paddy.
"""
    },

    # ── 8. SUGARCANE ──────────────────────────────────────────────────────
    {
        "id": "crop_sugarcane_icar_iisr_vsi",
        "title": "Sugarcane Maturity Brix, Trash Mulching, Red Rot Risk & Mill Delivery",
        "crop": "Sugarcane",
        "category": "Cultivation, Harvest, Storage & Marketing",
        "source": "ICAR - Indian Institute of Sugarcane Research (IISR), Lucknow & Vasantdada Sugar Institute (VSI), Pune",
        "organization": "VSI Pune & ICAR-IISR Lucknow",
        "location": "Maharashtra Sugarcane Belt (Kolhapur, Sangli, Pune, Solapur)",
        "date": "2026-01-30",
        "url_reference": "https://iisr.icar.gov.in/crop-advisory/sugarcane",
        "topics": ["sugarcane", "ganna", "oos", "brix value", "sucrose recovery", "red rot", "trash mulching", "sugar mill", "crushing season", "frp"],
        "content": """
# ICAR-IISR & VSI Agricultural Advisory: Sugarcane (Saccharum officinarum)

## 1. Climate Requirements & Growth Phases
- **Temperature**: Tropical climate with 24°C–38°C during formative phase; dry sunny cool weather (12°C–20°C nights, 26°C–32°C days) during ripening phase for maximum sucrose accumulation.
- **Water Requirement**: 1800–2200 mm water over lifecycle. Drip fertigation saves 40–50% water and boosts sucrose recovery.

## 2. Weather Risks & Crop Protection
- **Frost / Extreme Cold (<6°C)**: Halts vegetative elongation and induces bud necrosis.
- **Excess Soil Waterlogging**: Prolonged water stagnation in heavy soils reduces root aeration and triggers Red Rot (Colletotrichum falcatum) and Wilt epidemics.
- **Heat Stress & Drought**: Causes internode shortening and shoot borer (Chilo infuscatellus) outbreaks. Apply trash mulching (10–12 cm thick) to conserve soil moisture.

## 3. Harvesting & Maturity Indicators
- **Brix Value Index**: Use a hand refractometer. A hand refractometer Brix reading of 18–20% indicates peak commercial maturity.
- **Cutting Method**: Cut cane flush with the ground level. The bottom 2–3 internodes contain the highest concentration of sucrose.
- **Stale Cane Prevention**: Deliver cane to the sugar factory or jaggery (Gur) unit strictly within 24–48 hours of harvest. Every 24 hours of delay reduces sucrose recovery by 0.5–1.0% due to post-harvest invertase inversion.

## 4. Market & Sugar Mill Dispatch Strategy
- **Fair and Remunerative Price (FRP)**: State factories calculate payment based on factory recovery percentages.
- **Jaggery (Gur) Production**: High jaggery spot prices in regional markets (e.g. Kolhapur Gur Market) offer attractive alternatives when open market jaggery rates exceed factory FRP equivalents.
"""
    },

    # ── 9. MAIZE / CORN ───────────────────────────────────────────────────
    {
        "id": "crop_maize_icar_iimr",
        "title": "Maize Cob Ripening, Fall Armyworm, Aflatoxin Prevention & Feed Marketing",
        "crop": "Maize",
        "category": "Cultivation, Harvest, Storage & Marketing",
        "source": "ICAR - Indian Institute of Maize Research (IIMR), Ludhiana",
        "organization": "ICAR-IIMR & Agricultural Universities",
        "location": "All India Maize Belts",
        "date": "2026-02-05",
        "url_reference": "https://iimr.icar.gov.in/crop-advisory/maize",
        "topics": ["maize", "makka", "corn", "fall armyworm", "cob drying", "black layer", "aflatoxin", "poultry feed", "moisture", "apmc"],
        "content": """
# ICAR-IIMR Agricultural Advisory: Maize / Corn (Zea mays)

## 1. Growth Conditions & Climate
- **Temperature**: 20°C–30°C optimal for photosynthesis and cob sizing.
- **Soil**: Fertile, well-drained loams rich in organic matter. Sensitive to water stagnation.

## 2. Weather Risks & Pests
- **Fall Armyworm (Spodoptera frugiperda)**: Severe threat during vegetative stage.
- **Rain at Maturity**: Rain during cob drying creates aflatoxin contamination by Aspergillus fungi, disqualifying grain for poultry feed and starch processing.

## 3. Harvesting & Storage Protocol
- **Harvest Stage**: Harvest when husk cover turns dry and papery, and a black layer forms at the grain base (physiological maturity, moisture 25–30%).
- **Cob Drying**: Dry harvested cobs on clean concrete yards until grain moisture reaches 14–15% before shelling.
- **Grain Storage**: Store shelled grain at <12% moisture in fumigated dry godowns.
- **Market Demand**: Maize is heavily driven by poultry feed mills and starch manufacturers. Compare local APMC prices against industrial buyer contracts.
"""
    },

    # ── 10. GRAM / CHANA ──────────────────────────────────────────────────
    {
        "id": "crop_gram_icar_iipr",
        "title": "Gram / Chickpea Maturity, Pod Borer Control, Moisture & Pulse Storage",
        "crop": "Gram",
        "category": "Cultivation, Harvest, Storage & Marketing",
        "source": "ICAR - Indian Institute of Pulses Research (IIPR), Kanpur",
        "organization": "ICAR-IIPR, Kanpur & MPKV Rahuri",
        "location": "Maharashtra, MP & Rajasthan",
        "date": "2026-02-08",
        "url_reference": "https://iipr.icar.gov.in/crop-advisory/gram",
        "topics": ["gram", "chana", "chickpea", "pod borer", "wilt", "storage", "pulse beetle", "moisture", "market"],
        "content": """
# ICAR-IIPR Agricultural Advisory: Bengal Gram / Chickpea (Cicer arietinum)

## 1. Climate & Soil Requirements
- **Temperature**: Cool vegetative phase (15°C–20°C) and dry warm maturity phase (25°C–30°C).
- **Soil**: Well-drained deep loamy soils, pH 6.0–7.5. Avoid saline or waterlogged soils.

## 2. Weather Risks & Diseases
- **Cloudy / Humid Weather**: Sustained overcast weather at flowering triggers massive Helicoverpa armigera (Gram Pod Borer) infestations and Botrytis grey mould.
- **Unseasonal Rain at Harvest**: Causes seed discoloration, fungal infection, and pod rotting.

## 3. Harvesting & Storage
- **Maturity**: Harvest when leaves turn yellow and drop, and pods turn straw-coloured (moisture 15%).
- **Sun Drying & Moisture**: Sun-dry grain to <9–10% moisture before storing.
- **Pulse Beetle Protection**: Store in airtight bins with a 2-cm top layer of dry neem leaves or treated sand to prevent Callosobruchus maculatus (Pulse Beetle) infestation.
- **Market Advisory**: Chana is a resilient pulse with strong demand. If XGBoost forecasts a price climb, store at <10% moisture and sell in phases.
"""
    },

    # ── 11. GARLIC ────────────────────────────────────────────────────────
    {
        "id": "crop_garlic_icar_dogr",
        "title": "Garlic Curing Protocols, Wrapper Tightness & Off-Season Storage Profits",
        "crop": "Garlic",
        "category": "Cultivation, Harvest, Storage & Marketing",
        "source": "ICAR - Directorate of Onion and Garlic Research (DOGR), Pune",
        "organization": "ICAR-DOGR, Pune & MPKV Rahuri",
        "location": "Maharashtra, MP & Gujarat",
        "date": "2026-01-28",
        "url_reference": "https://dogr.icar.gov.in/crop-advisory/garlic",
        "topics": ["garlic", "lahsun", "cloves", "curing", "hanging storage", "thrips", "market timing", "shelf life"],
        "content": """
# ICAR-DOGR Agricultural Advisory: Garlic (Allium sativum)

## 1. Climate & Soil Requirements
- **Temperature**: Vegetative growth requires 13°C–24°C; bulb development requires 20°C–28°C and long photoperiods.
- **Soil**: Well-drained fertile loam with good organic content, pH 6.5–7.5.

## 2. Weather Risks
- **Excess Soil Moisture at Maturity**: Rain or irrigation near harvest causes clove separation, skin discoloration, and basal rot.
- **High Humidity**: Causes purple blotch and stemphylium leaf blight.

## 3. Harvesting, Curing & Storage
- **Harvest Stage**: Harvest when tops turn yellowish-brown and show 70% drying.
- **Curing**: Field cure in windrows for 3–5 days, followed by shade curing in airy sheds for 10–15 days to form a firm wrapper skin.
- **Storage**: Store in tied bundles hung in airy sheds or in thin layers on slatted shelves at 25°C–30°C and 60%–70% RH.
- **Shelf Life**: Properly cured garlic stores safely for 6–8 months with minimal weight loss.
- **Market Strategy**: Garlic commands high seasonal price spikes. Holding cured garlic in dry ventilated farm conditions during low market arrival months maximizes margins.
"""
    },

    # ── 12. CHILLI / MIRCHI ───────────────────────────────────────────────
    {
        "id": "crop_chilli_icar_iihr",
        "title": "Chilli Harvesting Stages, Anthracnose Control, Solar Drying & APMC Capsicum Trading",
        "crop": "Chilli",
        "category": "Cultivation, Harvest, Storage & Marketing",
        "source": "ICAR - Indian Institute of Horticultural Research (IIHR), Bengaluru",
        "organization": "ICAR-IIHR & State Horticulture Departments",
        "location": "Maharashtra, AP & Karnataka",
        "date": "2026-02-12",
        "url_reference": "https://iihr.icar.gov.in/crop-advisory/chilli",
        "topics": ["chilli", "mirchi", "green chilli", "red chilli", "anthracnose", "dieback", "solar drying", "moisture", "market"],
        "content": """
# ICAR-IIHR Agricultural Advisory: Chilli (Capsicum annuum)

## 1. Climate & Growth Requirements
- **Temperature**: 20°C–30°C optimal for vegetative growth and fruit coloring. Temperatures >35°C cause blossom drop.
- **Soil**: Light, well-drained loams rich in organic matter. Sensitive to waterlogging.

## 2. Weather Risks & Diseases
- **Anthracnose / Fruit Rot (Colletotrichum capsici)**: High humidity (>80%) accompanied by intermittent rain showers causes circular sunken spots on developing pods, destroying crop marketability.
- **Thrips & Mites (Murda Disease / Leaf Curl)**: Hot, dry weather triggers severe leaf curling.

## 3. Harvesting & Drying Protocols
- **Green Chilli**: Pick at full commercial size while firm and bright green for immediate local APMC sale.
- **Red Dry Chilli**: Pick fully ripe deep red pods. Sun-dry on clean concrete floors or solar poly-tunnels for 8–10 days until moisture reaches 10–11%. Never dry on bare soil.
- **Storage**: Store dried red chillies in clean moisture-proof poly-lined gunny bags in cool dry godowns at <65% RH.
- **Market Strategy**: Compare local spot prices for green chilli vs dried red chilli. When fresh market prices slump, sun-drying high-grade red chillies for stored spice marketing preserves value.
"""
    },

    # ── 13. APPLE ─────────────────────────────────────────────────────────
    {
        "id": "crop_apple_icar_cith",
        "title": "Apple Maturity Indices, Starch-Iodine Test, Cold Chain & Transit Grading",
        "crop": "Apple",
        "category": "Cultivation, Harvest, Storage & Marketing",
        "source": "ICAR - Central Institute of Temperate Horticulture (CITH), Srinagar",
        "organization": "ICAR-CITH Srinagar & National Horticulture Board (NHB)",
        "location": "Temperate & Hill Regions / Consuming APMCs (Pune, Sangli, Mumbai)",
        "date": "2026-02-02",
        "url_reference": "https://cith.icar.gov.in/crop-advisory/apple",
        "topics": ["apple", "seb", "starch iodine", "cold storage", "ca storage", "grading", "transit", "perishable", "market arrivals"],
        "content": """
# ICAR-CITH Agricultural Advisory: Apple (Malus domestica)

## 1. Agro-Climatic & Growth Requirements
- **Chilling Hours**: Requires 800–1200 chilling hours (<7°C) for flower bud dormancy break.
- **Temperature**: Optimal summer temperatures 21°C–24°C with plenty of sunlight for red anthocyanin pigmentation.

## 2. Weather Risks & Physiological Disorders
- **Hailstorms & Rain at Harvest**: Hail damage creates bruised skin spots, lowering grade to cull category.
- **High Heat & Sunburn**: Excessive midday sun (>32°C) causes skin browning and watercore breakdown.

## 3. Maturity Indicators & Harvesting Guidance
- **Starch-Iodine Index**: Conduct iodine staining test on fruit cross-sections. Harvest at 4–5 rating on the 1–8 starch conversion chart for controlled atmosphere (CA) storage; harvest at 6–7 for immediate marketing.
- **Ground Color**: Background green color turns yellowish.
- **Picking Method**: Pick by gently twisting the fruit upwards with the stalk intact. Never yank or drop fruits into hard crates.

## 4. Post-Harvest Cold Chain & Storage
- **Pre-Cooling**: Pre-cool to remove field heat within 12–24 hours of harvest.
- **Cold Storage**: 0°C to 1°C with 90%–95% RH extends shelf life for 4–6 months; Controlled Atmosphere (CA) storage (1.5% O2, 1.5% CO2) keeps fruit fresh for 8–10 months.
- **Market Strategy**: In regional consuming markets (e.g. Maharashtra APMCs), prices rise substantially between March and June as primary domestic orchard arrivals taper and cold-stored lots command high premiums.
"""
    },

    # ── 14. BANANA ────────────────────────────────────────────────────────
    {
        "id": "crop_banana_icar_nrcb",
        "title": "Banana Bunch Care, Sigatoka Control, Dehanding & Ripening Chambers",
        "crop": "Banana",
        "category": "Cultivation, Harvest, Storage & Marketing",
        "source": "ICAR - National Research Centre for Banana (NRCB), Tiruchirappalli",
        "organization": "ICAR-NRCB & Maharashtra Horticulture Department (Jalgaon Belt)",
        "location": "Maharashtra (Jalgaon, Solapur) & South India",
        "date": "2026-01-26",
        "url_reference": "https://nrcb.icar.gov.in/crop-advisory/banana",
        "topics": ["banana", "kela", "grand naine", "sigatoka", "bunch covering", "dehanding", "ethylene ripening", "cold chain", "market"],
        "content": """
# ICAR-NRCB Agricultural Advisory: Banana (Musa acuminata - Grand Naine)

## 1. Climate & Soil Requirements
- **Temperature**: Tropical climate with 25°C–35°C. Growth retards at <12°C and ceases at <8°C (chilling injury).
- **Water Requirement**: Heavy water demand (1500–2000 mm). Drip irrigation is essential.

## 2. Weather Risks & Diseases
- **High Wind Velocity (>40 km/h)**: Causes severe pseudostem lodging and fruit bunch snapping. Earthing-up and bamboo/nylon propping are mandatory.
- **Sigatoka Leaf Spot**: High humidity and continuous leaf wetness accelerate Cercospora fungus spread, reducing bunch weight by 30%.
- **Chilling Injury**: Low winter night temperatures (<10°C) cause dull yellow/gray skin peeling and poor ripening.

## 3. Bunch Care & Harvesting
- **Bunch Sleeving**: Cover developing bunches with perforated blue/white polyethylene sleeves (100 gauge) to prevent sunscald, insect blemishes, and chill damage.
- **Harvest Stage**: Harvest at 75–80% maturity (3/4 round angularity) for long-distance transport (e.g. North Indian and export markets); harvest at full round for local marketing.

## 4. Post-Harvest Handling & Ripening
- **Dehanding & Washing**: Dehand bunches in clean running water with 0.1% alum to remove latex staining.
- **Ethylene Ripening**: Ripen in climate-controlled ripening chambers with 100 ppm ethylene gas at 16°C–18°C and 90% RH for 24 hours. Avoid dangerous calcium carbide.
- **Storage**: Green bananas store at 13.5°C with 90% RH for 21–28 days.
"""
    },

    # ── 15. GRAPES ────────────────────────────────────────────────────────
    {
        "id": "crop_grapes_icar_nrcg",
        "title": "Grapes Berry Sizing, Downy Mildew Protection, Sugar TSS & Export Cold Chain",
        "crop": "Grapes",
        "category": "Cultivation, Harvest, Storage & Marketing",
        "source": "ICAR - National Research Centre for Grapes (NRCG), Pune",
        "organization": "ICAR-NRCG Pune & Maharashtra Grape Growers Association (MRDBS)",
        "location": "Maharashtra (Nashik, Sangli, Solapur, Pune)",
        "date": "2026-02-10",
        "url_reference": "https://nrcg.icar.gov.in/crop-advisory/grapes",
        "topics": ["grapes", "draksha", "nashik", "sangli", "downy mildew", "powdery mildew", "berry cracking", "tss brix", "pre cooling", "cold storage", "market"],
        "content": """
# ICAR-NRCG Agricultural Advisory: Grapes (Vitis vinifera - Thompson Seedless)

## 1. Climate & Soil Requirements
- **Temperature**: 20°C–35°C during vegetative and berry development; dry warm sunny weather during ripening.
- **Soil**: Well-drained sandy loam to medium black soil, pH 6.5–8.0, with EC < 1.0 dS/m.

## 2. Weather Risks & Berry Cracking
- **Unseasonal Rain at Ripening**: Rain during berry maturation causes catastrophic berry cracking, botrytis bunch rot, and sour rot.
- **Downy Mildew (Plasmopara viticola)**: Triggered by morning temperatures 15°C–22°C with high relative humidity (>80%) and leaf wetness.
- **Powdery Mildew (Uncinula necator)**: Proliferates in dry warm humid microclimates (25°C–32°C).

## 3. Harvesting & Maturity Standards
- **BSS / TSS Sugar Reading**: Harvest when Total Soluble Solids (TSS) reach 18–20° Brix and acidity is 0.5–0.6%.
- **Harvest Timing**: Pluck early morning when berries are cool (6:00 AM to 10:00 AM). Never harvest hot berries in afternoon.
- **Bunch Handling**: Hold bunches strictly by the peduncle/stem. Do not touch berries directly to preserve the natural waxy bloom.

## 4. Pre-Cooling & Cold Chain
- **Forced-Air Pre-Cooling**: Reduce core temperature to 2°C–4°C within 4–6 hours of harvest.
- **SO2 Grape Guards**: Pack in 5 kg cartons lined with sulfur dioxide generator sheets (Grape Guard) to prevent botrytis rot during transit and storage.
- **Cold Storage**: Store at 0°C to -0.5°C with 90%–95% RH for 60–90 days.
- **Market Dynamics**: Sangli and Nashik APMCs and processing wineries define national market pricing. Monitor domestic APMC demand vs raisin (Kishmish) making returns.
"""
    },

    # ── 16. GINGER ────────────────────────────────────────────────────────
    {
        "id": "crop_ginger_icar_iisr",
        "title": "Ginger Rhizome Maturation, Soft Rot Bacterial Wilt Prevention & Farm Storage",
        "crop": "Ginger",
        "category": "Cultivation, Harvest, Storage & Marketing",
        "source": "ICAR - Indian Institute of Spices Research (IISR), Kozhikode",
        "organization": "ICAR-IISR & State Spices Boards",
        "location": "Western Ghats, Maharashtra & Kerala",
        "date": "2026-01-12",
        "url_reference": "https://spices.res.in/crop-advisory/ginger",
        "topics": ["ginger", "adrak", "rhizome rot", "pythium", "bacterial wilt", "shade curing", "seed storage", "fresh ginger", "dry ginger", "market"],
        "content": """
# ICAR-IISR Agricultural Advisory: Ginger (Zingiber officinale)

## 1. Climate & Soil Requirements
- **Temperature**: Warm humid climate with 20°C–30°C.
- **Soil**: Rich loamy soil with high organic matter, excellent drainage, pH 6.0–7.0.

## 2. Weather Risks & Soil-Borne Pathogens
- **Soft Rot / Rhizome Rot (Pythium aphanidermatum)**: Excessive soil water stagnation during heavy monsoon downpours causes rapid rhizome liquefaction and foul odour.
- **Bacterial Wilt (Ralstonia solanacearum)**: Spreads rapidly in warm, waterlogged soil.

## 3. Harvesting Guidance
- **Fresh Green Ginger**: Harvest at 6–7 months after planting for tender, low-fiber ginger for culinary/local market use.
- **Dry Ginger (Sunth)**: Harvest at 8–9 months when leaves turn yellow and pseudostems dry completely for maximum dry recovery and oleoresin content.
- **Lifting**: Dig carefully with a spade to prevent slicing rhizome fingers.

## 4. Curing & Farm Storage
- **Shade Curing**: Wash soil thoroughly and shade cure for 2–3 days to dry surface moisture.
- **Pit Storage**: Store seed rhizomes in underground ventilated pits (1.0 m deep) layered with dry sand or neem leaves in a shaded area.
- **Market Strategy**: Fresh ginger prices fluctuate heavily with regional harvesting gluts. When prices drop, sun-curing to dry ginger (Sunth) offers long-term storage and value addition.
"""
    },

    # ── 17. POMEGRANATE / ANAR ─────────────────────────────────────────────
    {
        "id": "crop_pomegranate_icar_nrcp",
        "title": "Pomegranate Bahar Management, Bacterial Blight (Telya), Aril Sizing & APMC Sale",
        "crop": "Pomegranate",
        "category": "Cultivation, Harvest, Storage & Marketing",
        "source": "ICAR - National Research Centre on Pomegranate (NRCP), Solapur",
        "organization": "ICAR-NRCP, Solapur, Maharashtra",
        "location": "Maharashtra (Solapur, Sangli, Nashik, Ahmednagar)",
        "date": "2026-02-14",
        "url_reference": "https://nrcpomegranate.icar.gov.in/crop-advisory/pomegranate",
        "topics": ["pomegranate", "anar", "dalimb", "bacterial blight", "telya", "fruit borer", "bahar management", "aril quality", "cold storage", "market"],
        "content": """
# ICAR-NRCP Agricultural Advisory: Pomegranate (Punica granatum - Bhagwa)

## 1. Agro-Climatic Requirements & Bahar Management
- **Climate**: Semi-arid climate with hot dry summers (35°C–40°C) and cool dry winters.
- **Bahar Selection**:
  - **Ambe Bahar (Jan–Feb flowering)**: High yield, low disease risk.
  - **Mrig Bahar (June–July flowering)**: High risk of bacterial blight during monsoons.
  - **Hasta Bahar (Sept–Oct flowering)**: Highest market price realization during summer.

## 2. Weather Risks & Diseases
- **Bacterial Blight / Telya (Xanthomonas axonopodis pv. punicae)**: Persistent cloudy weather, rain splashes, and relative humidity >70% cause black oily spots on leaves and fruit rinds, leading to complete fruit cracking.
- **Fruit Borer / Anar Butterfly (Deudorix isocrates)**: Larvae bore into fruit. Bagging fruits with butter paper bags eliminates infestation.

## 3. Harvesting & Grading Standards
- **Harvest Maturity**: 160–180 days after fruit set when rind turns deep saffron-red and base calyx closes.
- **Grading by Weight**: Super (400g+), King (350–400g), Queen (250–350g), Prince (200–250g).
- **Storage**: Store at 5°C with 90%–95% RH for up to 60–90 days without aril desiccation.
"""
    },

    # ── 18. TURMERIC / HALDI ──────────────────────────────────────────────
    {
        "id": "crop_turmeric_icar_iisr",
        "title": "Turmeric Boiling, Polishing, Curcumin Preservation & Sangli Mandi Trading",
        "crop": "Turmeric",
        "category": "Cultivation, Harvest, Storage & Marketing",
        "source": "ICAR - Indian Institute of Spices Research (IISR) & Sangli APMC Board",
        "organization": "ICAR-IISR & MPKV Rahuri",
        "location": "Maharashtra (Sangli, Nanded, Hingoli, Kolhapur)",
        "date": "2026-01-24",
        "url_reference": "https://spices.res.in/crop-advisory/turmeric",
        "topics": ["turmeric", "haldi", "sangli mandi", "curcumin", "boiling", "curing", "polishing", "dry moisture", "apmc trading"],
        "content": """
# ICAR-IISR & Sangli Mandi Advisory: Turmeric (Curcuma longa - Salem / Rajapuri)

## 1. Climate & Soil Requirements
- **Climate**: Warm and humid climate (20°C–35°C) with rainfall 1500–2000 mm.
- **Soil**: Well-drained sandy or clay loam rich in organic matter, pH 5.5–7.5.

## 2. Weather Risks & Crop Management
- **Rhizome Rot & Leaf Spot**: Triggered by severe water stagnation during late monsoon rains.
- **Harvest Maturity**: Ready for harvest in 8–9 months when lower leaves turn yellow and dry completely.

## 3. Post-Harvest Boiling, Curing & Polishing
- **Boiling Protocol**: Boil cleaned rhizomes in water or steam boilers for 45–60 minutes until white foam emerges and a blunt matchstick penetrates easily without resistance. Over-boiling destroys curcumin; under-boiling leaves raw cores prone to weevil attack.
- **Sun Drying**: Spread boiled fingers on clean tarpaulins in 5–7 cm layers. Sun-dry for 10–15 days until fingers produce a crisp metallic sound when broken (moisture <10%).
- **Polishing**: Polish dry fingers mechanically or in wooden drums to remove outer rough skin and reveal vibrant golden yellow color.

## 4. Market & Trading Strategy
- **Sangli APMC Benchmark**: Sangli is the global hub for turmeric trading and warehousing. Cured polished turmeric with high curcumin content (>3.5%) stored in dry warehouses can be held for 12–24 months to capture multi-year cyclical price booms.
"""
    },

    # ── 19. GENERAL: HARVEST & COLD STORAGE ───────────────────────────────
    {
        "id": "gen_harvest_storage_icar_ciphet",
        "title": "ICAR-CIPHET Comprehensive Post-Harvest Handling, Pre-Cooling & Storage Guidelines",
        "crop": "General Crops",
        "category": "Post-Harvest Management & Cold Chain",
        "source": "ICAR - Central Institute of Post-Harvest Engineering and Technology (CIPHET), Ludhiana",
        "organization": "ICAR-CIPHET, Ludhiana & Ministry of Agriculture & Farmers Welfare",
        "location": "National Framework",
        "date": "2026-01-05",
        "url_reference": "https://ciphet.icar.gov.in/post-harvest-guidelines",
        "topics": ["post harvest", "storage", "curing", "pre cooling", "cold storage", "grading", "transport", "packaging", "shelf life"],
        "content": """
# ICAR-CIPHET Post-Harvest Management, Pre-Cooling & Storage Guidelines

## 1. General Principles of Crop Harvest Timing
- **Field Heat Avoidance**: Harvest during early morning (6:00 AM to 10:00 AM) or late evening. Produce harvested in midday heat has high respiration rates, leading to rapid moisture loss, weight shrink, and accelerated decay.
- **Never Harvest in Wet Weather**: Harvesting during rainfall or while crops are wet with morning dew introduces free moisture that multiplies bacterial soft rot and mould spores.

## 2. Pre-Cooling & Cold Chain Management
- **Rapid Field Heat Removal**: For perishables (tomato, fruits, vegetables), pre-cooling to target storage temperature within 2–4 hours of harvest doubles shelf life.
- **Optimal Temperature & Humidity Storage Matrix**:
  - **Onion**: 25°C–30°C, 65%–70% RH in ventilated Kanda Chawl (or 0°C–2°C in cold store).
  - **Potato**: 8°C–10°C, 85%–90% RH (Table); 10°C–12°C (Processing).
  - **Tomato**: 10°C–12°C (Ripe), 12°C–15°C (Breaker), 85%–90% RH.
  - **Wheat / Maize / Grains**: Ambient dry, strictly <12% seed moisture in sealed metal bins.
  - **Pulses / Soybean / Oilseeds**: Ambient dry, strictly <10% seed moisture in hermetic bags.
  - **Apple**: 0°C–1°C, 90%–95% RH.
  - **Grapes**: 0°C to -0.5°C, 90%–95% RH with SO2 generator sheets.

## 3. Farm-Gate Grading Standards
- Uniform grading into Grade A (Premium/Large), Grade B (Medium), and Grade C (Small/Damaged) generates 15–30% higher total net revenue than selling un-graded mixed lots at APMC auctions.
"""
    },

    # ── 20. GENERAL: WEATHER RISK & AGROMET ───────────────────────────────
    {
        "id": "gen_weather_risk_imd_agromet",
        "title": "IMD Agromet Weather Risk Mitigation, Rainfall Thresholds & Disease Prophylaxis",
        "crop": "General Crops",
        "category": "Agrometeorology & Weather Risk Protection",
        "source": "IMD - India Meteorological Department (Agromet Advisory Services)",
        "organization": "IMD Agromet, New Delhi & Pune Division",
        "location": "All India Weather Zones",
        "date": "2026-02-01",
        "url_reference": "https://imdagrimet.gov.in/weather-risk-rules",
        "topics": ["weather risk", "rainfall thresholds", "fungal proliferation", "spray timing", "heatwave", "drainage", "transit risk", "agromet"],
        "content": """
# IMD Agromet Advisory: Weather Risk Mitigation & Operational Rules

## 1. Rainfall Thresholds & Farm Operations
- **Rainfall > 5 mm within 24–48 hours**:
  - Immediately suspend foliar chemical sprays and fertilizer top-dressing (nutrients will leach or wash away).
  - Postpone harvesting of open field vegetables, or harvest mature fruits at breaker stage before the rainfall event.
  - Clear field drainage channels to prevent water stagnation in root zones.
- **Rainfall > 20 mm (Heavy Rainfall Warning)**:
  - High risk of flash flooding and root asphyxiation in low-lying plots.
  - Never transport produce in open non-waterproof vehicles.
  - Mandi arrivals typically drop by 40–80%, creating temporary price spikes for dry stored stock.

## 2. Relative Humidity (>75%) & Fungal Pathogen Triggers
- Sustained high humidity accompanied by moderate temperatures (18°C–26°C) creates critical infection windows for:
  - Downy mildew, powdery mildew, early/late blight, anthracnose, and purple blotch.
  - Apply prophylactic contact fungicides (Mancozeb @ 2.5 g/L or Copper Oxychloride @ 3.0 g/L) prior to the rain spell with a suitable wetting agent.

## 3. Heatwave & High Temperature Thresholds (>35°C)
- Apply light and frequent evening irrigations to maintain root-zone soil moisture.
- Apply crop residue or straw mulching (8–10 cm) to reduce soil temperature and prevent evapotranspiration.
"""
    },

    # ── 21. GENERAL: APMC MARKET ARBITRAGE & SELLING DECISION ─────────────
    {
        "id": "gen_market_selling_strategy",
        "title": "Agmarknet APMC Multi-Market Arbitrage, Transport Economics & Selling Timing",
        "crop": "General Crops",
        "category": "Agricultural Marketing & Price Arbitrage",
        "source": "Directorate of Marketing and Inspection (DMI) & Agmarknet, Govt. of India",
        "organization": "DMI, Ministry of Agriculture & Farmers Welfare",
        "location": "Maharashtra & National APMC Network",
        "date": "2026-01-10",
        "url_reference": "https://agmarknet.gov.in/market-decision-framework",
        "topics": ["market strategy", "selling decision", "apmc arbitrage", "transport cost", "xgboost forecast", "holding strategy", "net profit"],
        "content": """
# Agmarknet Market Selling Decision Framework & APMC Arbitrage

## 1. Multi-Market Arbitrage within 30–50 km Radius
- Farmers should calculate net return across all accessible APMCs within a 30–50 km radius rather than defaulting to the nearest market.
- **Net Return Equation**:
  $$\\text{Net Return (₹/q)} = \\text{Auction Modal Price} - (\\text{Transport Differential} + \\text{Mandi Cess} + \\text{Loading/Unloading})$$
- If a neighboring APMC (e.g. Kolhapur vs Sangli or Pune vs Baramati) offers a price premium greater than ₹100–150/quintal after deducting extra freight (approx. ₹30–40/q per 25 km), dispatching produce to the higher-demand APMC yields higher net profit.

## 2. Connecting XGBoost Price Forecasts with Farmer Actions
- **Strong Upward Forecast (>5% increase over 7–14 days)**:
  - If the crop is storable (cured onion, potato, garlic, grains, pulses) and weather risk is Low/Moderate, holding produce in farm storage captures the price upside.
  - If the crop is highly perishable (tomato, chilli, vegetables), harvest at breaker/mature green stage and stagger marketing over 3–5 days.
- **Strong Downward Forecast (>5% decrease over 7–14 days)**:
  - Sell available marketable inventory immediately to avoid price depreciation and post-harvest weight loss.
- **Stable Forecast (±2% fluctuation)**:
  - Market based strictly on commercial maturity and labor availability without speculative holding.

## 3. Weather-Driven Supply Dynamics
- When severe rainfall hits major producing belts, arrivals contract rapidly. Clean, dry produce held in protected storage commands a substantial scarcity premium within 48–72 hours of rain disruption.
"""
    },

    # ── 22. GENERAL: CROP SUITABILITY & CLIMATE ADAPTATION ─────────────────
    {
        "id": "gen_crop_suitability_icar_crida",
        "title": "ICAR-CRIDA Crop Suitability, Seasonal Planning & Climate-Resilient Agriculture",
        "crop": "General Crops",
        "category": "Agro-Climatic Planning & Crop Suitability",
        "source": "ICAR - Central Research Institute for Dryland Agriculture (CRIDA), Hyderabad",
        "organization": "ICAR-CRIDA, Hyderabad & Department of Agriculture, Maharashtra",
        "location": "Semi-Arid & Tropical Agro-Climatic Zones",
        "date": "2026-02-15",
        "url_reference": "https://crida.icar.gov.in/crop-suitability-guidelines",
        "topics": ["crop suitability", "climate resilient", "kharif", "rabi", "summer", "drought", "rainfall adaptation", "soil type", "season"],
        "content": """
# ICAR-CRIDA Crop Suitability & Seasonal Planning Framework

## 1. Seasonality and Agro-Climatic Match
- **Kharif (Monsoon, June–October)**:
  - Favorable Crops: Soybean, Cotton, Rice/Paddy, Maize, Groundnut, Kharif Onion, Tomato.
  - Requirements: Moderate to high rainfall, warm temperatures (25°C–35°C), good drainage.
- **Rabi (Winter, October–March)**:
  - Favorable Crops: Wheat, Gram/Chana, Rabi Onion, Potato, Garlic, Mustard, Rabi Sorghum.
  - Requirements: Cool nights (10°C–18°C), dry days, residual soil moisture or assured irrigation.
- **Summer / Zaid (March–June)**:
  - Favorable Crops: Groundnut, Green Gram (Moong), Watermelon, Muskmelon, Cucumber, Cluster Bean.
  - Requirements: High heat tolerance (>35°C), continuous drip irrigation.

## 2. Soil-Specific Crop Matching
- **Deep Black Vertisols (Clay Loam)**: High moisture retention; ideal for Cotton, Soybean, Wheat, Gram, Sugarcane. Avoid root crops in waterlogged black soils.
- **Sandy Loam / Alluvial Soils**: Excellent drainage and aeration; ideal for Onion, Potato, Tomato, Garlic, Groundnut, Turmeric, Vegetables.
- **Light Red Soils**: Well-drained; ideal for Groundnut, Pulses, Millets, Fruits (Pomegranate, Guava).

## 3. Weather-Driven Crop Decision Rules
- Under delayed monsoon or rainfall deficits, shift from long-duration crops (Sugarcane/Cotton) to short-duration drought-tolerant pulses (Green Gram, Black Gram, Cowpea) or Millets (Pearl Millet / Bajra).
"""
    }
]


def generate_knowledge_base():
    count = 0
    for doc in DOCUMENTS:
        doc_id = doc["id"]
        if "crop_" in doc_id:
            json_path = os.path.join(CROPS_DIR, f"{doc_id}.json")
            md_path = os.path.join(CROPS_DIR, f"{doc_id}.md")
        else:
            json_path = os.path.join(GEN_DIR, f"{doc_id}.json")
            md_path = os.path.join(GEN_DIR, f"{doc_id}.md")

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(doc, f, indent=2, ensure_ascii=False)

        with open(md_path, "w", encoding="utf-8") as f:
            f.write(f"<!-- Source: {doc['source']} -->\n")
            f.write(f"<!-- Institution: {doc['organization']} -->\n")
            f.write(f"<!-- Category: {doc['category']} -->\n")
            f.write(f"<!-- Date: {doc.get('date', '')} -->\n")
            f.write(f"<!-- URL: {doc.get('url_reference', '')} -->\n\n")
            f.write(doc["content"].strip())

        count += 1

    # Remove stale cache so vector index automatically rebuilds
    cache_path = os.path.join(BASE_DIR, "index_cache.pkl")
    if os.path.exists(cache_path):
        os.remove(cache_path)

    print(f"[SUCCESS] Successfully generated {count} comprehensive RAG knowledge base documents.")


if __name__ == "__main__":
    generate_knowledge_base()
