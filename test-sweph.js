const sweph = require('sweph');

try {
  sweph.set_ephe_path(__dirname);

  // E.g. Feb 21, 2026, 4:00 AM BKK
  // We want the sunrise of Feb 21. 
  // Let's get the UT Julian Day for Feb 21, 00:00 Local Time (Feb 20, 17:00 UT)
  const jd_midnight = sweph.julday(2026, 2, 20, 17, sweph.constants.SE_GREG_CAL);
  
  // Birth time 4:00 AM Local (Feb 20, 21:00 UT)
  const jd_birth = sweph.julday(2026, 2, 20, 21, sweph.constants.SE_GREG_CAL);

  const geopos = [100.5018, 13.7563, 0]; // lon, lat, elev
  const rsmi = sweph.constants.SE_CALC_RISE | sweph.constants.SE_BIT_DISC_CENTER;
  
  const result = sweph.rise_trans(jd_midnight, sweph.constants.SE_SUN, "", sweph.constants.SEFLG_SWIEPH, rsmi, geopos, 0, 0);
  
  const sunrise_jd = result.data;
  
  console.log("Sunrise JD:", sunrise_jd);
  console.log("Birth JD:", jd_birth);
  console.log("Is birth before sunrise?", jd_birth < sunrise_jd);
  console.log("Hours before sunrise:", (sunrise_jd - jd_birth) * 24);
  
} catch (e) {
  console.error("Error:", e);
}
