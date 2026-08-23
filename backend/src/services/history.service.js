import { pool } from '../config/database.js';

const memoryHistory = [];

export async function listHistory() {
  if (!pool) return memoryHistory;
  const { rows } = await pool.query(
    'SELECT id, city_name, country, temperature, weather_condition, humidity, searched_at FROM search_history ORDER BY searched_at DESC LIMIT 10'
  );
  return rows;
}

export async function saveHistory(entry) {
  if (!pool) {
    const saved = { ...entry, id: Date.now(), searched_at: new Date().toISOString() };
    memoryHistory.unshift(saved);
    memoryHistory.splice(10);
    return saved;
  }
  const { rows } = await pool.query(
    'INSERT INTO search_history (city_name, country, temperature, weather_condition, humidity) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [entry.city_name, entry.country, entry.temperature, entry.weather_condition, entry.humidity]
  );
  return rows[0];
}

export async function deleteHistory(id) {
  if (!pool) {
    const index = memoryHistory.findIndex((entry) => entry.id === id);
    if (index >= 0) memoryHistory.splice(index, 1);
    return;
  }
  await pool.query('DELETE FROM search_history WHERE id = $1', [id]);
}

export async function clearHistory() {
  if (!pool) {
    memoryHistory.length = 0;
    return;
  }
  await pool.query('DELETE FROM search_history');
}
