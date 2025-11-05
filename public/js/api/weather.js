import { WEATHER_PROVIDER, OPENWEATHER_KEY, DEFAULT_LOCATION } from '../config.js';

// returns { city, desc, temp, hum, icon }
export async function getWeather(coords = DEFAULT_LOCATION){
  if (WEATHER_PROVIDER === 'open-meteo'){
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`;
    const r = await fetch(url); const d = await r.json(); const w = d.current_weather;
    const codeMap = {0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Rime fog',
      51:'Light drizzle',61:'Light rain',71:'Snow',95:'Thunderstorm'};
    return { city: coords.city||'Current', desc: codeMap[w.weathercode]||'Weather', temp: Math.round(w.temperature), hum: '', icon:'03d' };
  }
  // default: openweather
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${OPENWEATHER_KEY}`;
  const r = await fetch(url); const d = await r.json();
  return { city:d.name, desc:d.weather[0].description.replace(/^./,c=>c.toUpperCase()), temp:Math.round(d.main.temp), hum:d.main.humidity, icon:d.weather[0].icon };
}
