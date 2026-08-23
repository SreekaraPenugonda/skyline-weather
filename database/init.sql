CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    city_name VARCHAR(100) NOT NULL,
    country VARCHAR(50),
    temperature DECIMAL(5, 2),
    weather_condition VARCHAR(100),
    humidity INTEGER,
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_searched_at ON search_history(searched_at DESC);
