/* English — the reference dictionary. Every other language is typed against
 * these keys. {name} marks a parameter. */

export const en = {
  // Data status
  'status.live': 'Live',
  'status.partial': 'Partial data',
  'status.demo': 'Demo data',
  'status.waking': 'Waking up',
  'status.live.tip': 'Risk scores come from the BayouGuard model and gauge readings from the backend, refreshed every few minutes.',
  'status.partial.tip': 'Some of this is live and some is not — for example, readings straight from Harris County while the BayouGuard model is offline.',
  'status.demo.tip': 'Sample numbers that show how BayouGuard works. These are not real water levels.',
  'wake.message': 'Waking up the flood model — the first load can take up to a minute.',
  'wake.failed': 'The flood model didn’t answer. Showing demo data for now.',

  // Search
  'search.reading': 'Reading gauges…',
  'error.unreachable': 'Could not reach the flood service.',
  'error.notFound': 'We couldn’t find that address. Try adding the street number or ZIP code.',
  'error.outOfArea': 'BayouGuard covers the Houston area for now.',
  'action.retry': 'Try again',

  // Risk
  'tier.LOW': 'Low',
  'tier.MEDIUM': 'Medium',
  'tier.HIGH': 'High',
  'tier.CRITICAL': 'Critical',
  'riskSource.model': 'ML model score',
  'riskSource.rules': 'Rule-based estimate',
  'riskSource.gauge-estimate': 'Estimate from nearest gauge — model unavailable',
  'riskSource.demo': 'Demo',
  'risk.sentence': '{tier} flood risk. The nearest gauge, {miles} mi away, has {buffer} ft of room before it floods.',
  'risk.sentenceOver': '{tier} flood risk. The nearest gauge, {miles} mi away, is {buffer} ft over flood stage.',
  'risk.sentenceNoGauge': '{tier} flood risk.',

  // Drive verdict
  'drive.YES': 'Safe to drive',
  'drive.CAUTION': 'Drive with caution',
  'drive.NO': 'Do not drive',
  'drive.YES.msg': 'Roads clear. Normal driving conditions.',
  'drive.CAUTION.msg': 'Some low-lying roads may flood. Avoid underpasses.',
  'drive.NO.msg': 'High-water risk on local roads. Turn around, don’t drown.',

  // Outlook
  'outlook.title': 'Next 6 hours',
  'outlook.level.CLEAR': 'Clear',
  'outlook.level.WATCH': 'Watch',
  'outlook.level.WARNING': 'Warning',
  'outlook.worsening': 'Conditions worsening',
  'outlook.rising': 'Water rising — stay aware',
  'outlook.rain': 'Rain incoming — stay aware',
  'outlook.receding': 'Water receding',
  'outlook.steady': 'Holding steady',
  'outlook.gauge.rising': 'The nearest gauge is rising {rate} ft/hr with {buffer} ft of headroom.',
  'outlook.gauge.falling': 'The nearest gauge is falling {rate} ft/hr with {buffer} ft of headroom.',
  'outlook.gauge.steady': 'The nearest gauge is steady with {buffer} ft of headroom.',
  'outlook.rain.heavy': '{inches}″ of rain expected in the next 6 hours.',
  'outlook.rain.light': 'Light rain ({inches}″) possible.',
  'outlook.rain.none': 'No significant rain in the forecast.',
  'outlook.official': 'Follow official guidance.',
  'outlook.note': 'Projected from the gauge trend and the rain forecast, not the ML model.',

  // Trend
  'trend.steady': 'steady',
  'trend.rising': 'Rising {rate} ft/hr',
  'trend.falling': 'Falling {rate} ft/hr',

  // Inspector footer
  'footer.live': 'Gauge readings from the Harris County Flood Warning System via the BayouGuard backend; risk score from the BayouGuard model.',
  'footer.partial': 'Part of this is live and part is estimated — see the labels above.',
  'footer.demo': 'Demo data — sample numbers, not real water levels.',
  'footer.disclaimer': 'Not a substitute for official alerts from Harris County or the National Weather Service.',

  // Graph
  'graph.empty.title': 'No gauges to draw yet',
  'graph.empty.body': 'The gauge network hasn’t loaded. The map view still works.',
  'graph.empty.action': 'Switch to map',

  // Weather (WMO codes)
  'wx.0': 'Clear',
  'wx.1': 'Mainly clear',
  'wx.2': 'Partly cloudy',
  'wx.3': 'Overcast',
  'wx.45': 'Fog',
  'wx.48': 'Rime fog',
  'wx.51': 'Light drizzle',
  'wx.53': 'Drizzle',
  'wx.55': 'Heavy drizzle',
  'wx.61': 'Light rain',
  'wx.63': 'Rain',
  'wx.65': 'Heavy rain',
  'wx.66': 'Freezing rain',
  'wx.67': 'Freezing rain',
  'wx.71': 'Light snow',
  'wx.73': 'Snow',
  'wx.75': 'Heavy snow',
  'wx.80': 'Rain showers',
  'wx.81': 'Rain showers',
  'wx.82': 'Violent showers',
  'wx.95': 'Thunderstorm',
  'wx.96': 'Thunderstorm with hail',
  'wx.99': 'Severe thunderstorm',
  'wx.unknown': '—',
} as const;

export type MsgKey = keyof typeof en;
