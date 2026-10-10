/* Demo data, used only when nothing live answers. Every view built from it is
 * flagged dataSource 'demo' so the UI says so — a flood app must never pass
 * invented water levels off as real ones.
 *
 * The gauges sit at real HCFWS sites (real names, positions and flood stages)
 * on Brays, Buffalo, White Oak, Sims, Greens, Hunting Bayou, Cypress Creek and
 * the Addicks/Barker dams. The levels, trends and tiers are invented: a wet
 * afternoon with mostly calm water, a few gauges rising, one over its banks. */

import { tierForBuffer, type BackendGauge } from './contract';

// Ids well above any real HCFWS site id, so live extras never attach to them.
export const DEMO_ID_BASE = 900_000;

export interface DemoGauge extends BackendGauge {
  name: string;
  trend: number; // ft/hr
}

// [site id, name, lat, lng, flood stage ft, headroom ft, trend ft/hr]
const SITES: Array<[number, string, number, number, number, number, number]> = [
  [420, 'Brays Bayou @ South Main Street', 29.697018, -95.412138, 38.0, 6.8, 0.04],
  [430, 'Brays Bayou @ Stella Link Road', 29.690953, -95.439914, 45.4, 4.1, 0.18],
  [440, 'Brays Bayou @ Rice Avenue', 29.678605, -95.467271, 48.3, 3.2, 0.21],
  [460, 'Brays Bayou @ Gessner Road', 29.672371, -95.527994, 54.0, 7.5, 0.06],
  [485, 'Brays Bayou @ SH 6', 29.715071, -95.643933, 78.0, 9.4, 0.0],
  [2220, 'Buffalo Bayou @ Milam Street', 29.764808, -95.361102, 18.8, 8.9, 0.02],
  [2240, 'Buffalo Bayou @ Shepherd Drive', 29.760145, -95.408655, 25.0, 7.6, 0.05],
  [2245, 'Buffalo Bayou @ Woodway Drive', 29.764643, -95.457926, 40.0, 6.1, 0.09],
  [2260, 'Buffalo Bayou @ San Felipe Drive', 29.751207, -95.505614, 51.3, 5.4, 0.11],
  [2290, 'Buffalo Bayou @ Dairy Ashford Road', 29.761597, -95.606442, 70.2, 8.2, 0.03],
  [520, 'White Oak Bayou @ Heights Boulevard', 29.774876, -95.397145, 29.0, 1.4, 0.42],
  [530, 'White Oak Bayou @ Ella Boulevard', 29.803438, -95.429368, 50.9, 3.6, 0.27],
  [540, 'White Oak Bayou @ Alabonson Road', 29.870424, -95.480366, 72.9, 6.4, 0.08],
  [555, 'White Oak Bayou @ Jones Road', 29.917687, -95.584556, 111.3, 8.0, 0.02],
  [340, 'Sims Bayou @ Telephone Road', 29.674494, -95.289014, 23.2, 7.1, 0.03],
  [370, 'Sims Bayou @ SH 288', 29.632178, -95.386657, 41.5, 4.6, 0.15],
  [380, 'Sims Bayou @ Hiram Clarke Rd', 29.619293, -95.445887, 47.2, 6.9, 0.05],
  [1620, 'Greens Bayou @ Ley Road', 29.837012, -95.233773, 27.0, -0.4, 0.31],
  [1640, 'Greens Bayou @ US 59', 29.91791, -95.306565, 52.0, 1.8, 0.36],
  [1645, 'Greens Bayou @ Beltway 8', 29.938692, -95.34932, 66.3, 4.3, 0.19],
  [1670, 'Greens Bayou @ Cutten Road', 29.948976, -95.51977, 109.4, 7.7, 0.04],
  [1110, 'Cypress Creek @ Cypresswood Drive', 30.031016, -95.330033, 61.2, 1.2, 0.33],
  [1120, 'Cypress Creek @ I-45', 30.036344, -95.428694, 82.5, 6.0, 0.07],
  [1150, 'Cypress Creek @ SH 249', 29.985654, -95.569924, 114.0, 8.6, 0.03],
  [1175, 'Cypress Creek @ US 290', 29.95686, -95.6782, 133.4, 9.1, 0.01],
  [820, 'Hunting Bayou @ I-10', 29.771615, -95.227954, 16.5, 5.6, 0.06],
  [840, 'Hunting Bayou @ Lockwood Drive', 29.808314, -95.310118, 37.6, 3.9, 0.14],
  [2110, 'Addicks Dam', 29.7907, -95.625, 93.0, 8.4, 0.02],
  [2010, 'Barker Dam', 29.7707, -95.6466, 90.2, 7.3, 0.03],
];

export const DEMO_GAUGES: readonly DemoGauge[] = SITES.map(
  ([site, name, lat, lng, flood, buffer, trend]) => ({
    id: DEMO_ID_BASE + site,
    name,
    latitude: lat,
    longitude: lng,
    current_level_ft: Math.round((flood - buffer) * 100) / 100,
    flood_level_ft: flood,
    buffer_ft: buffer,
    risk_tier: tierForBuffer(buffer),
    trend,
  }),
);
