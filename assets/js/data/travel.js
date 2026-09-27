/* ==========================================================================
   TRAVEL — every pin on the Play page map comes from this list.

   ADD A TRIP: add one object. Only city, country, lat, lon and region are
   required; everything else is optional and hidden when empty.
     city       name shown on the pin
     country    shown after the city
     lat, lon   decimal degrees (north / east positive)
     region     'americas' | 'europe' | 'mena'  — which zoom preset it belongs to
     year       e.g. '2024'           → "Visited 2024"
     note       one short line        → shown under the name
     photo      optional { src, alt } → small image in the tooltip
     home       true for Houston only (drawn in red, labelled Home)

   Source: Sayf's own list. Coordinates are city centres; Costa Rica is
   plotted at the country's centre because no city was given.
   ========================================================================== */

export const travelLocations = [
  // Home
  { city: 'Houston', country: 'United States', lat: 29.7604, lon: -95.3698, region: 'americas', home: true, note: 'Born here' },

  // United States
  { city: 'Austin', country: 'United States', lat: 30.2672, lon: -97.7431, region: 'americas' },
  { city: 'Dallas', country: 'United States', lat: 32.7767, lon: -96.797, region: 'americas' },
  { city: 'San Antonio', country: 'United States', lat: 29.4241, lon: -98.4936, region: 'americas' },
  { city: 'Oklahoma City', country: 'United States', lat: 35.4676, lon: -97.5164, region: 'americas' },
  { city: 'Denver', country: 'United States', lat: 39.7392, lon: -104.9903, region: 'americas' },
  { city: 'Salt Lake City', country: 'United States', lat: 40.7608, lon: -111.891, region: 'americas' },
  { city: 'Seattle', country: 'United States', lat: 47.6062, lon: -122.3321, region: 'americas' },
  { city: 'Los Angeles', country: 'United States', lat: 34.0522, lon: -118.2437, region: 'americas' },
  { city: 'San Diego', country: 'United States', lat: 32.7157, lon: -117.1611, region: 'americas' },
  { city: 'Tampa', country: 'United States', lat: 27.9506, lon: -82.4572, region: 'americas' },
  { city: 'Orlando', country: 'United States', lat: 28.5383, lon: -81.3792, region: 'americas' },
  { city: 'Philadelphia', country: 'United States', lat: 39.9526, lon: -75.1652, region: 'americas' },
  { city: 'New York City', country: 'United States', lat: 40.7128, lon: -74.006, region: 'americas' },
  { city: 'Boston', country: 'United States', lat: 42.3601, lon: -71.0589, region: 'americas' },

  // Central America
  { city: 'Costa Rica', country: 'Costa Rica', lat: 9.7489, lon: -83.7534, region: 'americas' },

  // Europe
  { city: 'London', country: 'United Kingdom', lat: 51.5072, lon: -0.1276, region: 'europe' },
  { city: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, region: 'europe' },
  { city: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lon: 4.9041, region: 'europe' },
  { city: 'Rotterdam', country: 'Netherlands', lat: 51.9244, lon: 4.4777, region: 'europe' },
  { city: 'Munich', country: 'Germany', lat: 48.1351, lon: 11.582, region: 'europe' },
  { city: 'Barcelona', country: 'Spain', lat: 41.3874, lon: 2.1686, region: 'europe' },
  { city: 'Florence', country: 'Italy', lat: 43.7696, lon: 11.2558, region: 'europe' },
  { city: 'Rome', country: 'Italy', lat: 41.9028, lon: 12.4964, region: 'europe' },

  // Middle East & North Africa
  { city: 'Tunis', country: 'Tunisia', lat: 36.8065, lon: 10.1815, region: 'mena' },
  { city: 'Cairo', country: 'Egypt', lat: 30.0444, lon: 31.2357, region: 'mena' },
  { city: 'Mecca', country: 'Saudi Arabia', lat: 21.3891, lon: 39.8579, region: 'mena' },
  { city: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lon: 55.2708, region: 'mena' },
  { city: 'Abu Dhabi', country: 'United Arab Emirates', lat: 24.4539, lon: 54.3773, region: 'mena' },
  { city: 'Muscat', country: 'Oman', lat: 23.588, lon: 58.3829, region: 'mena' },
];

/* Zoom presets for the region buttons, as [west, north, east, south] degrees. */
export const travelRegions = [
  { id: 'world',    label: 'World',       bounds: [-180, 80, 180, -56] },
  { id: 'americas', label: 'Americas',    bounds: [-130, 52, -62, 4] },
  { id: 'europe',   label: 'Europe',      bounds: [-11, 56, 20, 35] },
  { id: 'mena',     label: 'Middle East & North Africa', short: 'Middle East', bounds: [4, 41, 64, 16] },
];
