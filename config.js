window.APP_CONFIG = {
  THIRD_PARTY_SHARE: 0.0084,
  // Counties vector tileset config
  COUNTY_SOURCE_URL: 'mapbox://tosamuel.12053qy8',
  COUNTY_SOURCE_LAYER: 'tx_counties-71nsjj', // replace with the actual source-layer name if different
  COUNTY_KEY_PROPERTY: 'GEOID',
  CUSTOM_DEFAULTS: {
    // Turnout rate per VAP (0..1) and Dem share (0..1) - focused on 2024 baseline
    anglo: { turnout: 0.45, dem: 0.35 },
    asian: { turnout: 0.40, dem: 0.60 },
    black: { turnout: 0.50, dem: 0.85 },
    hisp:  { turnout: 0.40, dem: 0.60 },
  },
};
