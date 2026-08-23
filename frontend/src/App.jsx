import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { ArrowUpRight, CloudSun, Copy, Download, Droplets, Eye, Gauge, LocateFixed, MapPin, Moon, Printer, RefreshCw, Search, Share2, Sun, Sunrise, Sunset, Wind, X } from 'lucide-react';
import './App.css';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });

function formatDate(value) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function formatLocalTime(timestamp, timezone) {
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }).format(new Date((timestamp + timezone) * 1000));
}

function formatForecastDay(value) {
  return new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(`${value}T12:00:00`));
}

function formatHour(value) {
  return new Intl.DateTimeFormat('en', { hour: 'numeric' }).format(new Date(value * 1000));
}

function windDirection(degrees) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(degrees / 45) % 8];
}

function App() {
  const [city, setCity] = useState('');
  const [weather, setWeather] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forecast, setForecast] = useState([]);
  const [hourly, setHourly] = useState([]);
  const [airQuality, setAirQuality] = useState(null);
  const [view, setView] = useState('overview');
  const [compareCity, setCompareCity] = useState('');
  const [comparison, setComparison] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('skyline-theme') || 'light');
  const [twentyFourHour, setTwentyFourHour] = useState(() => localStorage.getItem('skyline-clock') === '24');
  const [compact, setCompact] = useState(false);
  const [unit, setUnit] = useState(() => localStorage.getItem('skyline-unit') || 'C');
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('skyline-favorites') || '[]'));
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [notice, setNotice] = useState('');
  const inputRef = useRef(null);

  async function loadHistory() {
    try { setHistory((await api.get('/history')).data); } catch { setHistory([]); }
  }

  async function fetchWeather(value = city) {
    const query = value.trim();
    if (!query) return;
    setLoading(true); setError('');
    try {
      const result = (await api.get(`/weather/${encodeURIComponent(query)}`)).data;
      setWeather(result);
      const forecastResult = await api.get(`/weather/forecast/${encodeURIComponent(result.city)}`).catch(() => ({ data: [] }));
      setForecast(forecastResult.data.days || []); setHourly(forecastResult.data.hourly || []);
      const airResult = await api.get(`/weather/air-quality?lat=${result.latitude}&lon=${result.longitude}`).catch(() => ({ data: null }));
      setAirQuality(airResult.data);
      await api.post('/history', {
        city_name: result.city, country: result.country, temperature: result.temperature,
        weather_condition: result.condition, humidity: result.humidity,
      });
      await loadHistory();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to reach the weather service.');
    } finally { setLoading(false); }
  }

  useEffect(() => {
    loadHistory();
    const sharedCity = new URLSearchParams(window.location.search).get('city');
    if (sharedCity) { setCity(sharedCity); fetchWeather(sharedCity); }
  }, []);

  useEffect(() => { localStorage.setItem('skyline-unit', unit); }, [unit]);
  useEffect(() => { localStorage.setItem('skyline-favorites', JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem('skyline-theme', theme); document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { localStorage.setItem('skyline-clock', twentyFourHour ? '24' : '12'); }, [twentyFourHour]);
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') { event.preventDefault(); inputRef.current?.focus(); } };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  useEffect(() => {
    if (!autoRefresh || !weather) return undefined;
    const timer = window.setInterval(() => fetchWeather(weather.city), 600000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, weather]);

  const temperature = (value) => unit === 'C' ? Math.round(value) : Math.round(value * 9 / 5 + 32);
  const speed = (value) => unit === 'C' ? `${value} km/h` : `${Math.round(value / 1.609)} mph`;

  async function useMyLocation() {
    if (!navigator.geolocation) { setError('Location is not available in this browser.'); return; }
    setLoading(true); setError('');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const result = (await api.get(`/weather/coordinates/current?lat=${coords.latitude}&lon=${coords.longitude}`)).data;
        setCity(result.city); setWeather(result);
        const forecastResult = await api.get(`/weather/forecast/${encodeURIComponent(result.city)}`).catch(() => ({ data: [] }));
        setForecast(forecastResult.data.days || []); setHourly(forecastResult.data.hourly || []);
      } catch { setError('Unable to find weather for your location.'); } finally { setLoading(false); }
    }, () => { setError('Location permission was not granted.'); setLoading(false); });
  }

  function toggleFavorite() {
    if (!weather) return;
    setFavorites((items) => items.includes(weather.city) ? items.filter((item) => item !== weather.city) : [...items, weather.city]);
  }

  async function shareWeather() {
    const url = `${window.location.origin}?city=${encodeURIComponent(weather.city)}`;
    try { await navigator.clipboard.writeText(url); setNotice('Share link copied'); } catch { setNotice(url); }
    window.setTimeout(() => setNotice(''), 2500);
  }

  async function copyCoordinates() {
    await navigator.clipboard?.writeText(`${weather.latitude}, ${weather.longitude}`);
    setNotice('Coordinates copied'); window.setTimeout(() => setNotice(''), 2500);
  }

  async function compare() {
    if (!compareCity.trim()) return;
    try { setComparison((await api.get(`/weather/${encodeURIComponent(compareCity)}`)).data); } catch { setNotice('Comparison city not found'); window.setTimeout(() => setNotice(''), 2500); }
  }

  function downloadWeather() {
    const blob = new Blob([JSON.stringify({ weather, forecast, airQuality }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${weather.city.toLowerCase()}-weather.json`; link.click(); URL.revokeObjectURL(link.href);
  }

  async function removeHistory(id) {
    try { await api.delete(`/history/${id}`); await loadHistory(); } catch { /* history can be retried */ }
  }

  return (
    <div className={`app-shell ${compact ? 'compact' : ''}`}>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Skyline Weather home"><span className="brand-mark">S</span><span>skyline<span className="brand-dot">.</span></span></a>
        <div className="top-actions"><button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="Toggle theme">{theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}</button><button className={`unit-toggle ${unit === 'F' ? 'selected' : ''}`} onClick={() => setUnit(unit === 'C' ? 'F' : 'C')} aria-label="Toggle temperature units">°{unit}</button><span className="live-status"><i /> live conditions</span></div>
      </header>

      <main className="dashboard">
        <section className="intro">
          <p className="eyebrow">YOUR DAILY FORECAST</p>
          <h1>Read the sky<br /><em>before you go.</em></h1>
          <p className="intro-copy">A clear look at what is happening outside, wherever you are headed next.</p>
          <form className="search-form" onSubmit={(event) => { event.preventDefault(); fetchWeather(); }}>
            <Search size={19} aria-hidden="true" />
            <input ref={inputRef} value={city} onChange={(event) => setCity(event.target.value)} placeholder="Search any city..." aria-label="Search any city" />
            <button type="submit" disabled={loading}>{loading ? 'Loading' : 'Search'} <ArrowUpRight size={16} /></button>
          </form>
          <div className="quick-actions"><button onClick={useMyLocation}><LocateFixed size={14} /> Use my location</button><span>Press / to search</span></div>
          {favorites.length > 0 && <div className="favorite-chips">{favorites.map((favorite) => <button key={favorite} onClick={() => { setCity(favorite); fetchWeather(favorite); }}>★ {favorite}</button>)}</div>}
          {error && <p className="error-message" role="alert">{error}</p>}
          <div className="preference-row"><label><input type="checkbox" checked={twentyFourHour} onChange={(event) => setTwentyFourHour(event.target.checked)} /> 24-hour clock</label><label><input type="checkbox" checked={compact} onChange={(event) => setCompact(event.target.checked)} /> Compact view</label></div>
        </section>

        <section className="weather-panel" aria-live="polite">
          {weather ? <>
            <div className="panel-top"><span className="panel-label">CURRENT WEATHER</span><span className="panel-tools"><button onClick={() => fetchWeather(weather.city)} aria-label="Refresh weather"><RefreshCw size={14} /></button><button onClick={toggleFavorite} aria-label="Toggle favorite" className={favorites.includes(weather.city) ? 'active' : ''}>★</button><button onClick={shareWeather} aria-label="Share weather"><Share2 size={14} /></button><button onClick={downloadWeather} aria-label="Download weather data"><Download size={14} /></button><button onClick={() => window.print()} aria-label="Print weather"><Printer size={14} /></button><span className="updated">Updated {formatDate(weather.last_updated)}</span></span></div>
            <div className="location"><MapPin size={17} /><span>{weather.city}, {weather.country}</span><span className="timezone">UTC{weather.timezone >= 0 ? '+' : ''}{weather.timezone / 3600}</span></div>
            <div className="temperature-row"><span className="temperature">{temperature(weather.temperature)}<sup>°{unit}</sup></span><div className="condition"><img src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} alt="" /><strong>{weather.condition}</strong><span>{weather.description}</span></div></div>
            <div className="metrics"><div><Droplets size={18} /><span>Humidity</span><strong>{weather.humidity}%</strong></div><div><Wind size={18} /><span>Wind {windDirection(weather.wind_direction)}</span><strong>{speed(weather.wind_speed)}</strong></div><div><span className="feels-icon">°</span><span>Feels like</span><strong>{temperature(weather.feels_like)}°</strong></div></div>
            <div className="detail-grid"><div><Gauge size={17} /><span>Pressure</span><strong>{weather.pressure} hPa</strong></div><div><Eye size={17} /><span>Visibility</span><strong>{weather.visibility} km</strong></div><div><CloudSun size={17} /><span>Cloud cover</span><strong>{weather.cloudiness}%</strong></div><div><Sunrise size={17} /><span>Sunrise</span><strong>{formatLocalTime(weather.sunrise, weather.timezone)}</strong></div><div><Sunset size={17} /><span>Sunset</span><strong>{formatLocalTime(weather.sunset, weather.timezone)}</strong></div><div><Droplets size={17} /><span>Rain / snow</span><strong>{weather.rain_1h} / {weather.snow_1h} mm</strong></div></div>
            <div className="view-tabs"><button className={view === 'overview' ? 'active' : ''} onClick={() => setView('overview')}>Overview</button><button className={view === 'forecast' ? 'active' : ''} onClick={() => setView('forecast')}>Forecast</button><button className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>Map</button></div>
            <div className="forecast"><div className="subheading"><span>5-DAY OUTLOOK</span><label><input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} /> Auto-refresh</label></div><div className="forecast-grid">{forecast.map((day) => <div className="forecast-day" key={day.date}><strong>{formatForecastDay(day.date)}</strong><img src={`https://openweathermap.org/img/wn/${day.icon}.png`} alt="" /><span>{day.condition}</span><b>{temperature(day.max)}° <i>{temperature(day.min)}°</i></b><small>{day.rain_chance}% rain</small></div>)}</div></div>
            <div className="hourly-strip">{hourly.map((item) => <div key={item.time}><span>{formatHour(item.time)}</span><img src={`https://openweathermap.org/img/wn/${item.icon}.png`} alt="" /><strong>{temperature(item.temperature)}°</strong><small>{item.rain_chance}% rain</small></div>)}</div>
            {airQuality && <div className="air-quality"><span>AIR QUALITY</span><strong className={`aq-${airQuality.index}`}>{airQuality.label}</strong><small>Index {airQuality.index} · PM2.5 {Math.round(airQuality.components.pm2_5)} μg/m³</small></div>}
            <div className="map-wrap"><div className="map-heading"><span><MapPin size={14} /> LOCATION MAP</span><button onClick={copyCoordinates}><Copy size={12} /> {weather.latitude.toFixed(3)}, {weather.longitude.toFixed(3)}</button></div><iframe title={`Map showing ${weather.city}`} src={`https://www.openstreetmap.org/export/embed.html?bbox=${weather.longitude - 0.12}%2C${weather.latitude - 0.08}%2C${weather.longitude + 0.12}%2C${weather.latitude + 0.08}&layer=mapnik&marker=${weather.latitude}%2C${weather.longitude}`} loading="lazy" /></div>
            <div className="compare"><div><span>COMPARE ANOTHER CITY</span><small>See both temperatures side by side</small></div><input value={compareCity} onChange={(event) => setCompareCity(event.target.value)} placeholder="City name" onKeyDown={(event) => event.key === 'Enter' && compare()} /><button onClick={compare}>Compare</button></div>{comparison && <div className="comparison-result"><strong>{weather.city}</strong><b>{Math.round(weather.temperature)}°</b><span>vs</span><strong>{comparison.city}</strong><b>{Math.round(comparison.temperature)}°</b><button onClick={() => setComparison(null)} aria-label="Close comparison"><X size={14} /></button></div>}
          </> : <div className="empty-weather"><div className="sun-glyph">☼</div><h2>What’s the weather<br /><em>looking like?</em></h2><p>Search for a city to see its current conditions.</p></div>}
        </section>

        <aside className="history-panel"><div className="history-heading"><div><p className="eyebrow">RECENTLY VIEWED</p><h2>Search history</h2></div><span className="count">{history.length}</span></div>{history.length ? <div className="history-list">{history.map((item) => <div className="history-item" key={item.id}><button onClick={() => { setCity(item.city_name); fetchWeather(item.city_name); }}><span className="history-city">{item.city_name}<small>{item.country} · {formatDate(item.searched_at)}</small></span><span className="history-temp">{Math.round(item.temperature)}°</span></button><button className="remove-button" onClick={() => removeHistory(item.id)} aria-label={`Remove ${item.city_name}`}><X size={14} /></button></div>)}</div> : <p className="history-empty">Your searched cities will appear here.</p>}</aside>
      </main>
      {notice && <div className="toast" role="status">{notice}</div>}
      <footer><span>skyline weather</span><span>simple forecasts, beautifully clear</span></footer>
    </div>
  );
}

export default App;
