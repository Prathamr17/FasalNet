-- FasalNet – Extended Cold Storage Seed Data (Multi-State)
-- Run after schema.sql to add storages across India

INSERT INTO storages (name,address,district,state,lat,lon,total_capacity_kg,available_capacity_kg,price_per_kg_per_day,temp_min_celsius,temp_max_celsius,status,verified,contact_phone) VALUES

-- Maharashtra (existing 5 stay, adding more)
('Nashik AgroCold Hub','Mumbai-Agra Hwy, Nashik','Nashik','Maharashtra',20.011,73.790,70000,42000,1.70,2,8,'available',true,'9800001001'),
('Pune FreshStore','Hadapsar, Pune','Pune','Maharashtra',18.502,73.927,55000,31000,2.20,1,7,'available',true,'9800001002'),
('Sangli Cold Chain','Miraj Road, Sangli','Sangli','Maharashtra',16.856,74.564,45000,28000,1.60,2,8,'available',false,'9800001003'),
('Aurangabad Kisan Cold','Waluj MIDC, Aurangabad','Aurangabad','Maharashtra',19.877,75.332,60000,38000,1.80,2,9,'available',true,'9800001004'),
('Nagpur Central ColdStore','Butibori, Nagpur','Nagpur','Maharashtra',21.099,79.043,80000,55000,1.50,3,10,'available',true,'9800001005'),

-- Karnataka
('Bangalore AgroFreeze','Yelahanka, Bengaluru','Bengaluru Urban','Karnataka',13.100,77.593,90000,60000,2.50,1,6,'available',true,'9800002001'),
('Mysuru Cold Hub','Hebbal Industrial Area, Mysuru','Mysuru','Karnataka',12.310,76.665,40000,22000,1.90,2,8,'available',true,'9800002002'),
('Hubli FreshChain','Gokul Road, Hubli','Dharwad','Karnataka',15.348,75.135,35000,18000,1.70,2,9,'available',false,'9800002003'),
('Belgaum Cold Storage','Udyambag, Belagavi','Belagavi','Karnataka',15.852,74.497,50000,32000,1.80,2,8,'available',true,'9800002004'),

-- Gujarat
('Ahmedabad AgroCold','Naroda GIDC, Ahmedabad','Ahmedabad','Gujarat',23.073,72.678,100000,75000,1.60,2,8,'available',true,'9800003001'),
('Surat Fresh Cold','Kim, Surat','Surat','Gujarat',21.201,72.832,70000,45000,1.70,1,7,'available',true,'9800003002'),
('Rajkot Cold Hub','Aji GIDC, Rajkot','Rajkot','Gujarat',22.308,70.800,50000,30000,1.50,2,9,'available',false,'9800003003'),
('Anand Dairy Cold','Anand Industrial Estate','Anand','Gujarat',22.556,72.951,45000,28000,1.80,1,6,'available',true,'9800003004'),

-- Rajasthan
('Jaipur AgroKool','Sitapura Industrial, Jaipur','Jaipur','Rajasthan',26.793,75.853,60000,35000,1.70,2,10,'available',true,'9800004001'),
('Jodhpur Cold Store','Mandore Road, Jodhpur','Jodhpur','Rajasthan',26.320,73.033,40000,22000,1.50,3,12,'available',false,'9800004002'),
('Kota Fresh Warehouse','Rawatbhata Road, Kota','Kota','Rajasthan',25.182,75.838,45000,27000,1.60,2,10,'available',true,'9800004003'),

-- Uttar Pradesh
('Agra Cold Chain','Firozabad Road, Agra','Agra','Uttar Pradesh',27.180,78.012,80000,52000,1.40,2,8,'available',true,'9800005001'),
('Lucknow AgroFreeze','Amausi, Lucknow','Lucknow','Uttar Pradesh',26.763,80.886,90000,65000,1.50,1,7,'available',true,'9800005002'),
('Varanasi Cold Hub','Babatpur, Varanasi','Varanasi','Uttar Pradesh',25.452,82.855,50000,30000,1.45,2,9,'available',false,'9800005003'),
('Kanpur FreshStore','Panki, Kanpur','Kanpur','Uttar Pradesh',26.440,80.315,70000,45000,1.40,2,8,'available',true,'9800005004'),

-- Punjab
('Amritsar Cold Store','Vallah, Amritsar','Amritsar','Punjab',31.634,74.873,75000,50000,1.60,1,7,'available',true,'9800006001'),
('Ludhiana AgroCold','Focal Point, Ludhiana','Ludhiana','Punjab',30.910,75.857,100000,72000,1.55,1,6,'available',true,'9800006002'),
('Patiala Fresh Hub','Rajpura Road, Patiala','Patiala','Punjab',30.339,76.395,45000,28000,1.65,2,8,'available',false,'9800006003'),

-- Haryana
('Gurugram AgroFreeze','Manesar, Gurugram','Gurugram','Haryana',28.366,76.938,85000,60000,2.00,1,7,'available',true,'9800007001'),
('Karnal Cold Chain','HSIIDC, Karnal','Karnal','Haryana',29.686,76.990,60000,38000,1.70,2,8,'available',true,'9800007002'),
('Hisar Cold Hub','Barwala Road, Hisar','Hisar','Haryana',29.168,75.725,40000,24000,1.55,2,9,'available',false,'9800007003'),

-- Tamil Nadu
('Chennai AgroCold','Ambattur, Chennai','Chennai','Tamil Nadu',13.113,80.155,95000,68000,2.20,1,7,'available',true,'9800008001'),
('Coimbatore Cold Store','SIDCO Estate, Coimbatore','Coimbatore','Tamil Nadu',11.017,76.995,65000,42000,1.90,2,8,'available',true,'9800008002'),
('Madurai Fresh Hub','Kappalur, Madurai','Madurai','Tamil Nadu',9.925,78.119,45000,28000,1.80,2,9,'available',false,'9800008003'),
('Salem AgroFreeze','Omalur Road, Salem','Salem','Tamil Nadu',11.779,78.154,50000,32000,1.75,2,8,'available',true,'9800008004'),

-- Telangana
('Hyderabad Cold Hub','Patancheru, Hyderabad','Hyderabad','Telangana',17.527,78.264,100000,72000,2.10,1,7,'available',true,'9800009001'),
('Warangal AgroCold','Kazipet, Warangal','Warangal','Telangana',17.970,79.602,50000,30000,1.80,2,9,'available',false,'9800009002'),

-- Andhra Pradesh
('Vijayawada Cold Store','Auto Nagar, Vijayawada','Krishna','Andhra Pradesh',16.508,80.648,70000,45000,1.90,1,8,'available',true,'9800010001'),
('Visakhapatnam Fresh','Autonagar, Visakhapatnam','Visakhapatnam','Andhra Pradesh',17.686,83.218,75000,50000,2.00,2,8,'available',true,'9800010002'),

-- Madhya Pradesh
('Indore AgroCold','Pithampur, Indore','Indore','Madhya Pradesh',22.524,75.913,80000,55000,1.60,2,9,'available',true,'9800011001'),
('Bhopal Cold Chain','Mandideep, Bhopal','Bhopal','Madhya Pradesh',23.259,77.412,60000,38000,1.55,2,8,'available',false,'9800011002'),
('Gwalior Fresh Store','Malanpur, Gwalior','Gwalior','Madhya Pradesh',26.228,78.183,40000,24000,1.50,3,10,'available',true,'9800011003'),

-- Bihar
('Patna AgroFreeze','Hajipur, Patna','Patna','Bihar',25.694,85.137,70000,48000,1.40,2,9,'available',true,'9800012001'),
('Muzaffarpur Cold Hub','Motipur, Muzaffarpur','Muzaffarpur','Bihar',26.121,85.391,45000,28000,1.35,2,10,'available',false,'9800012002'),

-- West Bengal
('Kolkata AgroCold','Dankuni, Kolkata','Howrah','West Bengal',22.680,88.299,100000,72000,1.80,1,7,'available',true,'9800013001'),
('Siliguri Cold Store','Bagdogra, Siliguri','Darjeeling','West Bengal',26.681,88.428,50000,32000,1.70,1,8,'available',true,'9800013002')

ON CONFLICT DO NOTHING;
