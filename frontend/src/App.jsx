import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { ArrowUpRight, Bell, Check, CloudSun, Copy, Download, Droplets, Eye, Gauge, LocateFixed, MapPin, Mic, Moon, Printer, RefreshCw, Search, Share2, Sparkles, Sun, Sunrise, Sunset, Wind, X } from 'lucide-react';
import './App.css';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recently' : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatLocalTime(timestamp, timezone, twentyFourHour) {
  const date = new Date((Number(timestamp) + Number(timezone)) * 1000);
  return Number.isNaN(date.getTime()) ? '--:--' : new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', hour12: !twentyFourHour, timeZone: 'UTC' }).format(date);
}

function formatForecastDay(value) {
  return new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(`${value}T12:00:00`));
}

function formatHour(value, twentyFourHour) {
  return new Intl.DateTimeFormat('en', { hour: 'numeric', hour12: !twentyFourHour }).format(new Date(value * 1000));
}

function windDirection(degrees) {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(degrees / 45) % 8];
}

function csvCell(value) { return `"${String(value ?? '').replaceAll('"', '""')}"`; }

function weatherInsight(value) {
  if (!value) return 'Search for a city to get a tailored outlook.';
  if (value.condition === 'Rain' || value.rain_1h > 0) return 'Keep an umbrella close. A wetter spell is moving through.';
  if (value.temperature >= 28) return 'Warm conditions ahead. Take water and seek shade at midday.';
  if (value.temperature <= 5) return 'Bundle up. Cold air makes the feels-like temperature sharper.';
  if (value.wind_speed >= 25) return 'Breezy outside. Secure loose items and allow extra travel time.';
  return 'A comfortable window for getting outside and making the most of the day.';
}

function conditionClass(condition = '') {
  return condition.toLowerCase().replace(/\s+/g, '-');
}

function weatherType(value) {
  const condition = value?.condition?.toLowerCase() || '';
  if (condition.includes('rain') || condition.includes('drizzle')) return 'rainy';
  if (condition.includes('snow')) return 'snowy';
  if (condition.includes('cloud')) return 'cloudy';
  if (condition.includes('wind')) return 'windy';
  return 'sunny';
}

function getActivities(value) {
  const activities = { sunny: ['Walk outside', 'Visit a park', 'Take golden-hour photos'], rainy: ['Read indoors', 'Plan a movie night', 'Try a warm recipe'], snowy: ['Build a snow scene', 'Take winter photos', 'Warm up with cocoa'], cloudy: ['Go cycling', 'Garden or explore', 'Shoot soft-light photos'], windy: ['Fly a kite', 'Take a brisk walk', 'Secure outdoor items'] };
  return activities[weatherType(value)];
}

function getPackingList(value) {
  const items = [];
  if (value.temperature < 10) items.push('Warm jacket');
  if (value.temperature > 25) items.push('Light layers');
  if (value.rain_1h > 0 || value.condition === 'Rain') items.push('Umbrella');
  if (value.condition === 'Snow') items.push('Waterproof boots');
  if (value.humidity > 70 || value.temperature > 25) items.push('Water bottle');
  if (!items.length) items.push('Comfortable layers', 'Sunglasses');
  return items;
}

function getWeatherFact(value) {
  const facts = { sunny: 'Sunlight takes about eight minutes to travel from the Sun to Earth.', rainy: 'Rain smells fresh because plants release oils when the ground gets wet.', snowy: 'Fresh snow can muffle sound, making snowy days feel unusually quiet.', cloudy: 'Clouds can weigh millions of pounds while still floating above us.' };
  return facts[weatherType(value)];
}

function isCurrentWeather(value) {
  return value && typeof value.city === 'string' && Number.isFinite(Number(value.latitude)) && Number.isFinite(Number(value.longitude));
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
  const [online, setOnline] = useState(navigator.onLine);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [activeHour, setActiveHour] = useState(0);
  const [listening, setListening] = useState(false);
  const [journal, setJournal] = useState(() => JSON.parse(localStorage.getItem('skyline-journal') || '[]'));
  const [journalNote, setJournalNote] = useState('');
  const [notifications, setNotifications] = useState(() => typeof Notification !== 'undefined' && Notification.permission === 'granted');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const inputRef = useRef(null);

  async function loadHistory() {
    try {
      const result = (await api.get('/history')).data;
      setHistory(Array.isArray(result) ? result : []);
    } catch { setHistory([]); }
  }

  async function requestWithRetry(path, attempts = 2) {
    const cached = localStorage.getItem(`skyline-cache:${path}`);
    for (let attempt = 0; attempt <= attempts; attempt += 1) {
      try {
        const result = await api.get(path);
        localStorage.setItem(`skyline-cache:${path}`, JSON.stringify(result.data));
        return result.data;
      } catch (requestError) {
        if (attempt === attempts && cached) {
          try {
            const cachedValue = JSON.parse(cached);
            if (!path.includes('/weather/') || path.includes('/forecast/') || path.includes('/air-quality')) { setNotice('Showing cached weather'); return cachedValue; }
            if (isCurrentWeather(cachedValue)) { setNotice('Showing cached weather'); return cachedValue; }
            localStorage.removeItem(`skyline-cache:${path}`);
          } catch { localStorage.removeItem(`skyline-cache:${path}`); }
        }
        if (attempt === attempts) throw requestError;
      }
    }
  }

  async function fetchWeather(value = city) {
    const query = value.trim();
    if (!query) return;
    setLoading(true); setError('');
    try {
      const result = await requestWithRetry(`/weather/${encodeURIComponent(query)}`);
      if (!isCurrentWeather(result)) throw new Error('The weather service returned incomplete data.');
      setWeather(result);
      const forecastResult = await requestWithRetry(`/weather/forecast/${encodeURIComponent(result.city)}`).catch(() => ({}));
      setForecast(forecastResult.days || []); setHourly(forecastResult.hourly || []);
      const airResult = await requestWithRetry(`/weather/air-quality?lat=${result.latitude}&lon=${result.longitude}`).catch(() => null);
      setAirQuality(airResult);
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
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    const onlineState = () => setOnline(navigator.onLine);
    window.addEventListener('online', onlineState); window.addEventListener('offline', onlineState);
    return () => { window.removeEventListener('online', onlineState); window.removeEventListener('offline', onlineState); };
  }, []);

  useEffect(() => { localStorage.setItem('skyline-unit', unit); }, [unit]);
  useEffect(() => { localStorage.setItem('skyline-favorites', JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem('skyline-theme', theme); document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { localStorage.setItem('skyline-clock', twentyFourHour ? '24' : '12'); }, [twentyFourHour]);
  useEffect(() => { localStorage.setItem('skyline-journal', JSON.stringify(journal)); }, [journal]);
  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') { event.preventDefault(); inputRef.current?.focus(); } if (event.key === 'Escape') { setCity(''); setShowShortcuts(false); } if (event.key.toLowerCase() === 'c' && document.activeElement?.tagName !== 'INPUT') setUnit((value) => value === 'C' ? 'F' : 'C'); if (event.key === '?' && document.activeElement?.tagName !== 'INPUT') setShowShortcuts((value) => !value); };
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
        const forecastResult = await requestWithRetry(`/weather/forecast/${encodeURIComponent(result.city)}`).catch(() => ({}));
        setForecast(forecastResult.days || []); setHourly(forecastResult.hourly || []);
        setAirQuality(await requestWithRetry(`/weather/air-quality?lat=${result.latitude}&lon=${result.longitude}`).catch(() => null));
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
    setCopied(true); setNotice('Coordinates copied'); window.setTimeout(() => { setNotice(''); setCopied(false); }, 2500);
  }

  function startVoiceSearch() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setNotice('Voice search is not supported here'); window.setTimeout(() => setNotice(''), 2500); return; }
    const recognition = new Recognition(); setListening(true); recognition.lang = 'en-US';
    recognition.onresult = (event) => { const value = event.results[0][0].transcript; setCity(value); fetchWeather(value); };
    recognition.onerror = () => setNotice('Voice search could not hear that');
    recognition.onend = () => setListening(false); recognition.start();
  }

  async function enableNotifications() {
    if (!('Notification' in window)) { setNotice('Notifications are not supported'); return; }
    const permission = await Notification.requestPermission(); setNotifications(permission === 'granted');
    if (permission === 'granted') setNotice('Weather alerts enabled');
    window.setTimeout(() => setNotice(''), 2500);
  }

  function saveJournalEntry() {
    if (!weather || !journalNote.trim()) return;
    setJournal((entries) => [{ id: Date.now(), city: weather.city, note: journalNote.trim(), date: new Date().toISOString() }, ...entries].slice(0, 8)); setJournalNote(''); setNotice('Journal entry saved'); window.setTimeout(() => setNotice(''), 2500);
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

  async function clearHistory() {
    if (!window.confirm('Clear all search history?')) return;
    try { await api.delete('/history'); await loadHistory(); setNotice('History cleared'); window.setTimeout(() => setNotice(''), 2500); } catch { setError('Could not clear history.'); }
  }

  function exportHistory() {
    const rows = [['City', 'Country', 'Temperature', 'Condition', 'Humidity', 'Searched at'], ...history.map((item) => [item.city_name, item.country, item.temperature, item.weather_condition, item.humidity, item.searched_at])];
    const blob = new Blob([rows.map((row) => row.map(csvCell).join(',')).join('\n')], { type: 'text/csv' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'skyline-search-history.csv'; link.click(); URL.revokeObjectURL(link.href);
  }

  return (
    <div className={`app-shell ${compact ? 'compact' : ''} weather-${conditionClass(weather?.condition || 'clear')}`}>
      <header className="topbar">
        <a className="brand" href="/" aria-label="Skyline Weather home"><span className="brand-mark">S</span><span>skyline<span className="brand-dot">.</span></span></a>
        <div className="top-actions"><span className="header-clock">{new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', hour12: !twentyFourHour }).format(now)}</span><button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="Toggle theme">{theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}</button><button className={`unit-toggle ${unit === 'F' ? 'selected' : ''}`} onClick={() => setUnit(unit === 'C' ? 'F' : 'C')} aria-label="Toggle temperature units">°{unit}</button><span className="live-status"><i /> live conditions</span></div>
      </header>

      <main className="dashboard">
        <section className="intro">
          <p className="eyebrow">YOUR DAILY FORECAST</p>
          <h1>Read the sky<br /><em>before you go.</em></h1>
          <p className="intro-copy">A clear look at what is happening outside, wherever you are headed next.</p>
          <form className="search-form" onSubmit={(event) => { event.preventDefault(); fetchWeather(); }}>
            <Search size={19} aria-hidden="true" />
            <input ref={inputRef} list="city-suggestions" value={city} onChange={(event) => setCity(event.target.value)} placeholder="Search any city..." aria-label="Search any city" />
            <datalist id="city-suggestions">{[...new Set([...(Array.isArray(history) ? history.map((item) => item.city_name) : []), ...favorites])].map((suggestion) => <option key={suggestion} value={suggestion} />)}</datalist>
            {city && <button type="button" className="clear-search" onClick={() => setCity('')} aria-label="Clear city search"><X size={14} /></button>}
            <button type="submit" disabled={loading}>{loading ? 'Loading' : 'Search'} <ArrowUpRight size={16} /></button>
          </form>
          <div className="quick-actions"><button onClick={useMyLocation}><LocateFixed size={14} /> Use my location</button><span>{online ? 'Online' : 'Offline mode'} · Press / to search</span></div>
          {favorites.length > 0 && <div className="favorite-chips">{favorites.map((favorite) => <button key={favorite} onClick={() => { setCity(favorite); fetchWeather(favorite); }}>★ {favorite}</button>)}</div>}
          {error && <p className="error-message" role="alert">{error}</p>}
          <div className="preference-row"><label><input type="checkbox" checked={twentyFourHour} onChange={(event) => setTwentyFourHour(event.target.checked)} /> 24-hour clock</label><label><input type="checkbox" checked={compact} onChange={(event) => setCompact(event.target.checked)} /> Compact view</label></div>
        </section>

        <section className="weather-panel" aria-live="polite" aria-busy={loading}>
          {loading && <div className="loading-bar" aria-label="Loading weather" />}
          {weather && <div className="weather-scene" aria-hidden="true"><span className="scene-sun" /><span className="scene-cloud scene-cloud-one" /><span className="scene-cloud scene-cloud-two" /><span className="scene-rain scene-rain-one" /><span className="scene-rain scene-rain-two" /><span className="scene-rain scene-rain-three" /><span className="scene-snow scene-snow-one" /><span className="scene-snow scene-snow-two" /></div>}
          {weather ? <>
            <div className="panel-top"><span className="panel-label">CURRENT WEATHER</span><span className="panel-tools"><button onClick={() => fetchWeather(weather.city)} aria-label="Refresh weather"><RefreshCw size={14} /></button><button onClick={toggleFavorite} aria-label="Toggle favorite" className={favorites.includes(weather.city) ? 'active' : ''}>★</button><button onClick={shareWeather} aria-label="Share weather"><Share2 size={14} /></button><button onClick={downloadWeather} aria-label="Download weather data"><Download size={14} /></button><button onClick={() => window.print()} aria-label="Print weather"><Printer size={14} /></button><span className="updated">Updated {formatDate(weather.last_updated)}</span></span></div>
            <div className="location"><MapPin size={17} /><span>{weather.city}, {weather.country}</span><span className="timezone">UTC{weather.timezone >= 0 ? '+' : ''}{weather.timezone / 3600}</span></div>
            <div className="temperature-row"><span className="temperature">{temperature(weather.temperature)}<sup>°{unit}</sup></span><div className="condition"><img src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} alt="" /><strong>{weather.condition}</strong><span>{weather.description}</span></div></div>
            <div className="metrics"><div><Droplets size={18} /><span>Humidity</span><strong>{weather.humidity}%</strong></div><div><Wind size={18} /><span>Wind {windDirection(weather.wind_direction)}</span><strong>{speed(weather.wind_speed)}</strong></div><div><span className="feels-icon">°</span><span>Feels like</span><strong>{temperature(weather.feels_like)}°</strong></div></div>
            <div className="insight"><Sparkles size={17} /><div><span>SKYLINE INSIGHT</span><p>{weatherInsight(weather)}</p></div></div>
            <div className="detail-grid"><div><Gauge size={17} /><span>Pressure</span><strong>{weather.pressure} hPa</strong></div><div><Eye size={17} /><span>Visibility</span><strong>{weather.visibility} km</strong></div><div><CloudSun size={17} /><span>Cloud cover</span><strong>{weather.cloudiness}%</strong></div><div><Sunrise size={17} /><span>Sunrise</span><strong>{formatLocalTime(weather.sunrise, weather.timezone, twentyFourHour)}</strong></div><div><Sunset size={17} /><span>Sunset</span><strong>{formatLocalTime(weather.sunset, weather.timezone, twentyFourHour)}</strong></div><div><Droplets size={17} /><span>Rain / snow</span><strong>{weather.rain_1h} / {weather.snow_1h} mm</strong></div></div>
            <div className="view-tabs"><button className={view === 'overview' ? 'active' : ''} onClick={() => setView('overview')}>Overview</button><button className={view === 'forecast' ? 'active' : ''} onClick={() => setView('forecast')}>Forecast</button><button className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>Map</button></div>
            {view !== 'map' && <div className="forecast"><div className="subheading"><span>5-DAY OUTLOOK</span><label><input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} /> Auto-refresh</label></div><div className="forecast-grid">{forecast.map((day) => <div className="forecast-day" key={day.date}><strong>{formatForecastDay(day.date)}</strong><img src={`https://openweathermap.org/img/wn/${day.icon}.png`} alt="" /><span>{day.condition}</span><b>{temperature(day.max)}° <i>{temperature(day.min)}°</i></b><small>{day.rain_chance}% rain</small></div>)}</div></div>}
            {view !== 'map' && <><div className="hourly-strip">{hourly.map((item, index) => <button className={activeHour === index ? 'selected-hour' : ''} key={item.time} onClick={() => setActiveHour(index)}><span>{formatHour(item.time, twentyFourHour)}</span><img src={`https://openweathermap.org/img/wn/${item.icon}.png`} alt="" /><strong>{temperature(item.temperature)}°</strong><small>{item.rain_chance}% rain</small></button>)}</div>{hourly[activeHour] && <div className="hour-detail"><span>SELECTED HOUR</span><strong>{formatHour(hourly[activeHour].time, twentyFourHour)} · {temperature(hourly[activeHour].temperature)}°{unit}</strong><small>{hourly[activeHour].rain_chance}% precipitation chance</small></div>}</>}
            {airQuality && <div className="air-quality"><span>AIR QUALITY</span><strong className={`aq-${airQuality.index}`}>{airQuality.label}</strong><small>Index {airQuality.index} · PM2.5 {Math.round(airQuality.components.pm2_5)} μg/m³</small></div>}
            {view !== 'forecast' && <div className="map-wrap"><div className="map-heading"><span><MapPin size={14} /> LOCATION MAP</span><button onClick={copyCoordinates}>{copied ? <Check size={12} /> : <Copy size={12} />} {weather.latitude.toFixed(3)}, {weather.longitude.toFixed(3)}</button></div><iframe title={`Map showing ${weather.city}`} src={`https://www.openstreetmap.org/export/embed.html?bbox=${weather.longitude - 0.12}%2C${weather.latitude - 0.08}%2C${weather.longitude + 0.12}%2C${weather.latitude + 0.08}&layer=mapnik&marker=${weather.latitude}%2C${weather.longitude}`} loading="lazy" /></div>}
            <div className="compare"><div><span>COMPARE ANOTHER CITY</span><small>See both temperatures side by side</small></div><input value={compareCity} onChange={(event) => setCompareCity(event.target.value)} placeholder="City name" onKeyDown={(event) => event.key === 'Enter' && compare()} /><button onClick={compare}>Compare</button></div>{comparison && <div className="comparison-result"><strong>{weather.city}</strong><b>{Math.round(weather.temperature)}°</b><span>vs</span><strong>{comparison.city}</strong><b>{Math.round(comparison.temperature)}°</b><button onClick={() => setComparison(null)} aria-label="Close comparison"><X size={14} /></button></div>}
            <div className="feature-grid"><article className="feature-card activities"><div className="feature-title"><Sparkles size={15} /><span>SMART SUGGESTIONS</span></div><p>Good conditions for:</p>{getActivities(weather).map((activity) => <button key={activity} onClick={() => setNotice(`${activity} added to your plan`)}><Check size={13} /> {activity}</button>)}</article><article className="feature-card packing"><div className="feature-title"><span className="feature-emoji">◌</span><span>WHAT TO PACK</span></div><div className="pack-list">{getPackingList(weather).map((item) => <span key={item}>{item}</span>)}</div><small>{getWeatherFact(weather)}</small></article><article className="feature-card story"><div className="feature-title"><span className="feature-emoji">✦</span><span>TODAY'S SKY</span></div><p>{weatherInsight(weather)}</p><small>{getWeatherFact(weather)}</small></article></div>
            <div className="utility-row"><button onClick={startVoiceSearch} className={listening ? 'listening' : ''}><Mic size={14} /> {listening ? 'Listening...' : 'Voice search'}</button><button onClick={enableNotifications} className={notifications ? 'enabled' : ''}><Bell size={14} /> {notifications ? 'Alerts enabled' : 'Enable weather alerts'}</button></div>
            <div className="journal"><div><span>WEATHER JOURNAL</span><small>Capture how this place feels today.</small></div><div className="journal-input"><input value={journalNote} onChange={(event) => setJournalNote(event.target.value)} placeholder="Write a note..." onKeyDown={(event) => event.key === 'Enter' && saveJournalEntry()} /><button onClick={saveJournalEntry}>Save</button></div>{journal.filter((entry) => entry.city === weather.city).slice(0, 2).map((entry) => <p key={entry.id}><b>{formatDate(entry.date)}</b> {entry.note}</p>)}</div>
          </> : <div className="empty-weather"><div className="sun-glyph">☼</div><h2>What’s the weather<br /><em>looking like?</em></h2><p>Search for a city to see its current conditions.</p><div className="starter-cities"><span>Try</span>{['London', 'New York', 'Tokyo'].map((starter) => <button key={starter} onClick={() => { setCity(starter); fetchWeather(starter); }}>{starter}</button>)}</div></div>}
        </section>

        <aside className="history-panel"><div className="history-heading"><div><p className="eyebrow">RECENTLY VIEWED</p><h2>Search history</h2></div><span className="count">{history.length}</span></div><div className="history-actions"><button onClick={exportHistory} disabled={!history.length}><Download size={13} /> Export CSV</button><button onClick={clearHistory} disabled={!history.length}><X size={13} /> Clear all</button></div>{history.length ? <div className="history-list">{history.map((item) => <div className="history-item" key={item.id}><button onClick={() => { setCity(item.city_name); fetchWeather(item.city_name); }}><span className="history-city">{item.city_name}<small>{item.country} · {formatDate(item.searched_at)}</small></span><span className="history-temp">{Math.round(item.temperature)}°</span></button><button className="remove-button" onClick={() => removeHistory(item.id)} aria-label={`Remove ${item.city_name}`}><X size={14} /></button></div>)}</div> : <p className="history-empty">Your searched cities will appear here.</p>}</aside>
      </main>
      {notice && <div className="toast" role="status">{notice}</div>}
      {showShortcuts && <div className="shortcuts-modal" role="dialog" aria-label="Keyboard shortcuts"><button onClick={() => setShowShortcuts(false)} aria-label="Close shortcuts"><X size={15} /></button><h3>Keyboard shortcuts</h3><p><kbd>/</kbd> Focus search</p><p><kbd>Esc</kbd> Clear search</p><p><kbd>C</kbd> Toggle units</p><p><kbd>?</kbd> Show shortcuts</p></div>}
      <footer><span>skyline weather</span><span>simple forecasts, beautifully clear</span></footer>
    </div>
  );
}

export default App;
