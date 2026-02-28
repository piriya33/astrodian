import sweph from 'sweph';

// Helper to calculate Julian Day from a Date object
export function getJulianDay(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // Month is 0-indexed in JS Date
  const day = date.getUTCDate();
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  // Use sweph built-in for julian day
  return sweph.julday(year, month, day, hour, sweph.constants.SE_GREG_CAL);
}

// Helper to determine Astrological Day of Week (considering sunrise)
// If birth is before sunrise, the day of week is the previous day.
export function getAstrologicalDayInfo(
  date: Date,
  lat: number,
  lon: number,
  elev: number = 0
): { dayOfWeek: number; isRahu: boolean } {
  const jd_birth = getJulianDay(date);

  // To find the sunrise for the birth day, we need LOCAL midnight (not UTC midnight).
  // UTC midnight (00:00Z) = 07:00 Bangkok, which is AFTER sunrise (~06:00-06:30).
  // If we use UTC midnight, rise_trans() finds NEXT day's sunrise → wrong day!
  // Fix (per natal-chart-manual §8): subtract longitude-based TZ offset.
  const approxTzHours = Math.round(lon / 15); // e.g. Bangkok 100.5° → +7
  const midnight = new Date(date.getTime());
  midnight.setUTCHours(0, 0, 0, 0);
  midnight.setTime(midnight.getTime() - approxTzHours * 3600000); // local midnight in UTC
  const jd_midnight = getJulianDay(midnight);

  const geopos: [number, number, number] = [lon, lat, elev];
  const rsmi_rise = sweph.constants.SE_CALC_RISE | sweph.constants.SE_BIT_DISC_CENTER;
  const rsmi_set = sweph.constants.SE_CALC_SET | sweph.constants.SE_BIT_DISC_CENTER;
  
  // Calculate Sunrise for the current local day
  const rise_result = sweph.rise_trans(
    jd_midnight, 
    sweph.constants.SE_SUN, 
    "", 
    sweph.constants.SEFLG_SWIEPH, 
    rsmi_rise, 
    geopos, 
    0, 
    0
  );
  
  // Calculate Sunset for the current local day
  const set_result = sweph.rise_trans(
    jd_midnight, 
    sweph.constants.SE_SUN, 
    "", 
    sweph.constants.SEFLG_SWIEPH, 
    rsmi_set, 
    geopos, 
    0, 
    0
  );
  
  const sunrise_jd = rise_result.data;
  const sunset_jd = set_result.data;
  const isBeforeSunrise = jd_birth < sunrise_jd;
  
  let dayOfWeek = date.getUTCDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday (UTC-based)
  let isRahu = false;
  
  if (isBeforeSunrise) {
    // Shift to the previous day if born before sunrise
    dayOfWeek = (dayOfWeek + 6) % 7;
    if (dayOfWeek === 3) {
      isRahu = true; // Thursday morning before sunrise -> Wednesday night (Rahu)
    }
  } else {
    // If born on Wednesday after sunset, it's Rahu
    if (dayOfWeek === 3 && jd_birth >= sunset_jd) {
      isRahu = true;
    }
  }
  
  return { dayOfWeek, isRahu };
}

// Helper to get Zodiac Sign from Longitude Degree (0 - 360)
const signs = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 
  'Leo', 'Virgo', 'Libra', 'Scorpio', 
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

// Helper to get Zodiac Sign from Longitude Degree (0 - 360)
function getZodiacSign(longitude: number) {
  const signIndex = Math.floor(longitude / 30);
  const degree = longitude % 30;
  return { sign: signs[signIndex], degree: parseFloat(degree.toFixed(2)) };
}

// Navamsa (D9) Calculation
function getNavamsaSign(longitude: number): string {
  const signIndex = Math.floor(longitude / 30);
  const degreesInSign = longitude % 30;
  const navamsaIndex = Math.floor(degreesInSign / (3 + 1/3)); // 3deg 20min per navamsa
  
  let startSignIndex = 0;
  const element = signIndex % 4;
  
  if (element === 0) startSignIndex = 0; // Fire (Aries, Leo, Sag) -> Starts Aries
  else if (element === 1) startSignIndex = 9; // Earth (Taurus, Virgo, Cap) -> Starts Cap
  else if (element === 2) startSignIndex = 6; // Air (Gemini, Libra, Aqua) -> Starts Libra
  else startSignIndex = 3; // Water (Cancer, Scorpio, Pisces) -> Starts Cancer
  
  return signs[(startSignIndex + navamsaIndex) % 12];
}

// Planetary Position Calculation
export function getPlanetaryPositions(date: Date) {
  const jd = getJulianDay(date);
  
  // Use Tropical flag (default)
  const iflag = sweph.constants.SEFLG_SWIEPH;
  
  // Array of planets to calculate (using True Node for better chart accuracy)
  const planetsToCalc = [
    { id: sweph.constants.SE_SUN, name: 'Sun' },
    { id: sweph.constants.SE_MOON, name: 'Moon' },
    { id: sweph.constants.SE_MARS, name: 'Mars' },
    { id: sweph.constants.SE_MERCURY, name: 'Mercury' },
    { id: sweph.constants.SE_JUPITER, name: 'Jupiter' },
    { id: sweph.constants.SE_VENUS, name: 'Venus' },
    { id: sweph.constants.SE_SATURN, name: 'Saturn' },
    { id: sweph.constants.SE_TRUE_NODE, name: 'Rahu (North Node)' }
  ];

  const positions: any[] = [];

  for (const planet of planetsToCalc) {
    // data[0] is longitude
    const result = sweph.calc_ut(jd, planet.id, iflag);
    const longitude = result.data[0];
    const zodiac = getZodiacSign(longitude);
    const navamsa = getNavamsaSign(longitude);
    
    positions.push({
      name: planet.name,
      longitude: parseFloat(longitude.toFixed(2)),
      zodiac: zodiac.sign,
      degree: zodiac.degree,
      navamsa: navamsa
    });
  }

  return positions;
}

export function getFuturePositions(baseDate: Date, monthsAhead: number) {
  // Create a new Date object in the future
  const futureDate = new Date(baseDate.getTime());
  futureDate.setMonth(futureDate.getMonth() + monthsAhead);
  
  const jd = getJulianDay(futureDate);
  
  // Use Tropical flag
  const iflag = sweph.constants.SEFLG_SWIEPH;
  
  // We only care about the slow-moving "Heavy" planets for long-term Thai forecasting
  const planetsToCalc = [
    { id: sweph.constants.SE_JUPITER, name: 'Jupiter' },
    { id: sweph.constants.SE_SATURN, name: 'Saturn' },
    { id: sweph.constants.SE_TRUE_NODE, name: 'Rahu (North Node)' }
  ];

  const positions: any[] = [];

  for (const planet of planetsToCalc) {
    const result = sweph.calc_ut(jd, planet.id, iflag);
    const longitude = result.data[0];
    const zodiac = getZodiacSign(longitude);
    
    positions.push({
      name: planet.name,
      longitude: parseFloat(longitude.toFixed(2)),
      zodiac: zodiac.sign,
      degree: zodiac.degree
    });
  }

  return { targetDate: futureDate, positions };
}

export function getAscendant(date: Date, lat: number, lon: number) {
  const jd = getJulianDay(date);
  const houseResult = sweph.houses_ex(jd, sweph.constants.SEFLG_SWIEPH, lat, lon, 'P');
  const houseData = houseResult as any;
  
  // sweph returns: data.houses[0..11] = cusps, data.points[0] = ASC, data.points[1] = MC
  const ascLongitude = houseData.data?.points?.[0] ?? houseData.data?.houses?.[0] ?? 0;
  const zodiac = getZodiacSign(ascLongitude);
  const navamsa = getNavamsaSign(ascLongitude);

  return {
    name: 'Ascendant',
    longitude: parseFloat(ascLongitude.toFixed(2)),
    zodiac: zodiac.sign,
    degree: zodiac.degree,
    navamsa: navamsa
  };
}

// Returns all 12 Placidus house cusps + ASC + MC for chart visualization
export function getHouseCusps(date: Date, lat: number, lon: number) {
  const jd = getJulianDay(date);
  const houseResult = sweph.houses_ex(jd, sweph.constants.SEFLG_SWIEPH, lat, lon, 'P');
  const houseData = houseResult as any;
  
  // sweph.houses_ex returns:
  //   data.houses[0..11] = 12 house cusps (House 1 through House 12)
  //   data.points[0] = Ascendant, data.points[1] = MC
  const cusps: number[] = [];
  const houses = houseData.data?.houses;
  for (let i = 0; i < 12; i++) {
    cusps.push(parseFloat((houses?.[i] ?? (i * 30)).toFixed(2)));
  }
  
  const ascendant = houseData.data?.points?.[0] ?? cusps[0];
  const mc = houseData.data?.points?.[1] ?? cusps[9];

  return {
    cusps,       // 12 house cusp longitudes [House1..House12]
    ascendant: parseFloat(ascendant.toFixed(2)),
    mc: parseFloat(mc.toFixed(2))
  };
}
