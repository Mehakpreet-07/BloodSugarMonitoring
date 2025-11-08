// public/js/api/weather.js
import { WEATHER_PROVIDER, OPENWEATHER_KEY, DEFAULT_LOCATION } from '../config.js';

// Return: { city, desc, temp, hum, icon }
export async function getWeather(coords = DEFAULT_LOCATION) {
  if (WEATHER_PROVIDER !== 'openweather') {
    throw new Error('Set WEATHER_PROVIDER to "openweather" in config.js');
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${OPENWEATHER_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather request failed');
  const d = await res.json();

 return {
    city: coords.city ?? d.name ?? 'Location',
    desc: (d.weather?.[0]?.description ?? 'Weather').replace(/^./, c => c.toUpperCase()),
    temp: Math.round(d.main?.temp ?? 0),
    hum:  d.main?.humidity ?? '',
    icon: d.weather?.[0]?.icon ?? '03d'
  };
}

// Optional helper if you ever want to call by city instead of coords.
export async function getWeatherByCity(city = 'Surrey,CA') {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${OPENWEATHER_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather request failed');
  const d = await res.json();
  return {
    city: d.name || city,
    desc: (d.weather?.[0]?.description ?? 'Weather').replace(/^./, c => c.toUpperCase()),
    temp: Math.round(d.main?.temp ?? 0),
    hum:  d.main?.humidity ?? '',
    icon: d.weather?.[0]?.icon ?? '03d'
  };
}
