-- V15: Create weather_cache and satellite_cache
-- Dependencies: V1

CREATE TABLE weather_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lat NUMERIC(10,6) NOT NULL,
    lng NUMERIC(10,6) NOT NULL,
    date DATE NOT NULL,
    temperature NUMERIC(5,2),
    rainfall_mm NUMERIC(10,2),
    humidity NUMERIC(5,2),
    wind_speed NUMERIC(5,2),
    source VARCHAR(50),
    cached_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE satellite_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lat NUMERIC(10,6) NOT NULL,
    lng NUMERIC(10,6) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    ndvi_values JSONB,
    mean_ndvi NUMERIC(5,4),
    min_ndvi NUMERIC(5,4),
    anomaly_detected BOOLEAN DEFAULT FALSE,
    is_mock BOOLEAN DEFAULT FALSE,
    cached_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_weather_cache_coords ON weather_cache(lat, lng, date);
CREATE INDEX idx_satellite_cache_coords ON satellite_cache(lat, lng, start_date, end_date);
