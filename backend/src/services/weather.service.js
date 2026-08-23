import axios from 'axios';

const weatherUrl = 'https://api.openweathermap.org/data/2.5/weather';
const forecastUrl = 'https://api.openweathermap.org/data/2.5/forecast';
const airQualityUrl = 'https://api.openweathermap.org/data/2.5/air_pollution';

function assertConfigured() {
  if (!process.env.OPENWEATHER_API_KEY) {
    const error = new Error('Weather service is not configured yet. Add OPENWEATHER_API_KEY to backend/.env.');
    error.status = 503;
    throw error;
  }
}

function normalizeWeather(data) {
  return {
    city: data.name,
    country: data.sys.country,
    latitude: data.coord.lat,
    longitude: data.coord.lon,
    timezone: data.timezone,
    temperature: Math.round(data.main.temp * 10) / 10,
    feels_like: Math.round(data.main.feels_like * 10) / 10,
    condition: data.weather[0].main,
    description: data.weather[0].description,
    icon: data.weather[0].icon,
    humidity: data.main.humidity,
    pressure: data.main.pressure,
    visibility: Math.round((data.visibility || 0) / 100) / 10,
    cloudiness: data.clouds.all,
    wind_speed: Math.round(data.wind.speed * 3.6 * 10) / 10,
    wind_direction: data.wind.deg,
    rain_1h: data.rain?.['1h'] || 0,
    snow_1h: data.snow?.['1h'] || 0,
    sunrise: data.sys.sunrise,
    sunset: data.sys.sunset,
    last_updated: new Date().toISOString(),
  };
}

export async function getWeatherByCity(city) {
  assertConfigured();

  const { data } = await axios.get(weatherUrl, {
    params: { q: city, appid: process.env.OPENWEATHER_API_KEY, units: 'metric' },
    timeout: 8000,
  });

  return normalizeWeather(data);
}

export async function getWeatherByCoordinates(latitude, longitude) {
  assertConfigured();
  const { data } = await axios.get(weatherUrl, { params: { lat: latitude, lon: longitude, appid: process.env.OPENWEATHER_API_KEY, units: 'metric' }, timeout: 8000 });
  return normalizeWeather(data);
}

export async function getForecast(city) {
  assertConfigured();
  const { data } = await axios.get(forecastUrl, { params: { q: city, appid: process.env.OPENWEATHER_API_KEY, units: 'metric' }, timeout: 8000 });
  const days = new Map();
  data.list.forEach((item) => {
    const date = item.dt_txt.slice(0, 10);
    if (!days.has(date)) days.set(date, { date, min: item.main.temp_min, max: item.main.temp_max, rain_chance: Math.round((item.pop || 0) * 100), icon: item.weather[0].icon, condition: item.weather[0].main });
    const day = days.get(date);
    day.min = Math.min(day.min, item.main.temp_min);
    day.max = Math.max(day.max, item.main.temp_max);
    day.rain_chance = Math.max(day.rain_chance, Math.round((item.pop || 0) * 100));
  });
  return { days: Array.from(days.values()).slice(0, 5), hourly: data.list.slice(0, 8).map((item) => ({ time: item.dt, temperature: Math.round(item.main.temp), icon: item.weather[0].icon, rain_chance: Math.round((item.pop || 0) * 100) })) };
}

export async function getAirQuality(latitude, longitude) {
  assertConfigured();
  const { data } = await axios.get(airQualityUrl, { params: { lat: latitude, lon: longitude, appid: process.env.OPENWEATHER_API_KEY }, timeout: 8000 });
  const item = data.list[0];
  const labels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very poor'];
  return { index: item.main.aqi, label: labels[item.main.aqi - 1], components: item.components, updated: item.dt };
}
