// Capital-city coordinates for the map's fallback center when the device's
// real position isn't available (permission denied/unavailable) but the
// user's account has a known country. Keyed by uppercase ISO 3166-1 alpha-2
// code, which is what `profiles.country` is expected to store — accepts a
// lowercase/mixed-case input too (see resolveCountryCenter below).
//
// Coverage: Europe (the app's stated launch market) plus a handful of other
// major markets. Not exhaustive — anything missing falls through to the EU
// centroid, same as an unknown/unset country.
export const COUNTRY_CAPITALS: Record<string, [number, number]> = {
  // Western / Central Europe
  NL: [52.3676, 4.9041], // Amsterdam
  BE: [50.8503, 4.3517], // Brussels
  DE: [52.52, 13.405], // Berlin
  FR: [48.8566, 2.3522], // Paris
  LU: [49.6116, 6.1319], // Luxembourg
  AT: [48.2082, 16.3738], // Vienna
  CH: [46.948, 7.4474], // Bern
  IE: [53.3498, -6.2603], // Dublin
  GB: [51.5072, -0.1276], // London
  // Southern Europe
  ES: [40.4168, -3.7038], // Madrid
  PT: [38.7223, -9.1393], // Lisbon
  IT: [41.9028, 12.4964], // Rome
  GR: [37.9838, 23.7275], // Athens
  MT: [35.8989, 14.5146], // Valletta
  CY: [35.1856, 33.3823], // Nicosia
  // Nordics
  DK: [55.6761, 12.5683], // Copenhagen
  SE: [59.3293, 18.0686], // Stockholm
  NO: [59.9139, 10.7522], // Oslo
  FI: [60.1699, 24.9384], // Helsinki
  IS: [64.1466, -21.9426], // Reykjavik
  // Central / Eastern Europe
  PL: [52.2297, 21.0122], // Warsaw
  CZ: [50.0755, 14.4378], // Prague
  SK: [48.1486, 17.1077], // Bratislava
  HU: [47.4979, 19.0402], // Budapest
  RO: [44.4268, 26.1025], // Bucharest
  BG: [42.6977, 23.3219], // Sofia
  HR: [45.815, 15.9819], // Zagreb
  SI: [46.0569, 14.5058], // Ljubljana
  RS: [44.7866, 20.4489], // Belgrade
  BA: [43.8563, 18.4131], // Sarajevo
  MK: [41.9981, 21.4254], // Skopje
  AL: [41.3275, 19.8187], // Tirana
  ME: [42.4304, 19.2594], // Podgorica
  XK: [42.6629, 21.1655], // Pristina
  // Baltics
  EE: [59.437, 24.7536], // Tallinn
  LV: [56.9496, 24.1052], // Riga
  LT: [54.6872, 25.2797], // Vilnius
  // Eastern Europe / Caucasus (partial EU-adjacent coverage)
  UA: [50.4501, 30.5234], // Kyiv
  MD: [47.0105, 28.8638], // Chisinau
  // Other major markets
  US: [38.9072, -77.0369], // Washington, D.C.
  CA: [45.4215, -75.6972], // Ottawa
  AU: [-35.2809, 149.13], // Canberra
  NZ: [-41.2865, 174.7762], // Wellington
};

// Wide-Europe fallback per the design doc — used whenever the country is
// unknown, unset, or not in the table above.
export const EU_CENTROID: [number, number] = [50.1, 9.9];
export const EU_CENTROID_ZOOM = 4;
export const COUNTRY_CAPITAL_ZOOM = 10;

/** Case-insensitive lookup by ISO 3166-1 alpha-2 code. Returns null if unknown. */
export function resolveCountryCenter(
  countryCode: string | null | undefined,
): [number, number] | null {
  if (!countryCode) return null;
  return COUNTRY_CAPITALS[countryCode.trim().toUpperCase()] ?? null;
}
