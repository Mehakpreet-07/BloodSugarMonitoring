// flip this later when your Node API is ready
export const USE_MOCKS = true;            // true => /mock/*.json , false => /api endpoints
export const BASE_API  = '/api';

// Weather provider config
export const WEATHER_PROVIDER = 'openweather'; // 'openweather' | 'open-meteo'
export const OPENWEATHER_KEY  = 'REPLACE_WITH_YOUR_KEY'; // only if using openweather
export const DEFAULT_LOCATION = { lat:49.19, lon:-122.85, city:'Surrey, BC' };
