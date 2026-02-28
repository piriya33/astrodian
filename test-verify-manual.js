/**
 * Engine Verification Script
 * Tests against the verified data from "Natal Chart Manual"
 * Birth: January 13, 1985, 09:45 AM, Bangkok (13.7563°N, 100.5018°E)
 * All values verified against Astro.com on Feb 25, 2026.
 */
const sweph = require('sweph');

// ===== VERIFIED EXPECTED VALUES FROM MANUAL =====
const EXPECTED_PLANETS = {
  'Sun':     { lng: 292.86, sign: 'Capricorn', deg: '22°51\'' },
  'Moon':    { lng: 191.55, sign: 'Libra',     deg: '11°33\'' },
  'Mercury': { lng: 271.77, sign: 'Capricorn', deg: '1°46\'' },
  'Venus':   { lng: 339.65, sign: 'Pisces',    deg: '9°39\'' },
  'Mars':    { lng: 344.38, sign: 'Pisces',    deg: '14°22\'' },
  'Jupiter': { lng: 294.29, sign: 'Capricorn', deg: '24°17\'' },
  'Saturn':  { lng: 235.81, sign: 'Scorpio',   deg: '25°48\'' },
  'Rahu':    { lng: 55.68,  sign: 'Taurus',    deg: '25°40\'' },
};

const EXPECTED_CUSPS = [340.98, 16.66, 48.20, 75.52, 101.31, 128.80, 160.98, 196.66, 228.20, 255.52, 281.31, 308.80];
const EXPECTED_ASC = 340.98;
const EXPECTED_MC = 255.52;

// ===== HELPERS =====
const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

function getZodiacSign(lng) {
  const idx = Math.floor(lng / 30);
  const deg = lng % 30;
  return { sign: signs[idx], degree: parseFloat(deg.toFixed(2)) };
}

function formatDeg(lng) {
  const d = lng % 30;
  const deg = Math.floor(d);
  const min = Math.round((d - deg) * 60);
  return `${deg}°${String(min).padStart(2, '0')}'`;
}

// ===== MAIN =====
try {
  // Birth: Jan 13, 1985 09:45 AM Bangkok (UTC+7) = Jan 13, 02:45 UTC
  const year = 1985, month = 1, day = 13;
  const hour = 2 + 45/60; // 02:45 UTC
  const lat = 13.7563, lon = 100.5018;

  const jd = sweph.julday(year, month, day, hour, sweph.constants.SE_GREG_CAL);
  console.log('Julian Day:', jd.toFixed(6));
  console.log('');

  // --- Planets ---
  const planetIds = [
    { id: sweph.constants.SE_SUN,       name: 'Sun' },
    { id: sweph.constants.SE_MOON,      name: 'Moon' },
    { id: sweph.constants.SE_MARS,      name: 'Mars' },
    { id: sweph.constants.SE_MERCURY,   name: 'Mercury' },
    { id: sweph.constants.SE_JUPITER,   name: 'Jupiter' },
    { id: sweph.constants.SE_VENUS,     name: 'Venus' },
    { id: sweph.constants.SE_SATURN,    name: 'Saturn' },
    { id: sweph.constants.SE_TRUE_NODE, name: 'Rahu' },
  ];

  const iflag = sweph.constants.SEFLG_SWIEPH;
  console.log('=== PLANETARY POSITIONS ===');
  console.log('Planet      | Got Lng     | Exp Lng     | Got Sign     | Exp Sign     | Got Deg    | Exp Deg    | Δ');
  console.log('------------|-------------|-------------|--------------|--------------|------------|------------|------');

  let allPass = true;
  for (const p of planetIds) {
    const result = sweph.calc_ut(jd, p.id, iflag);
    const lng = result.data[0];
    const z = getZodiacSign(lng);
    const exp = EXPECTED_PLANETS[p.name];
    const delta = Math.abs(lng - exp.lng);
    const pass = delta < 0.1 && z.sign === exp.sign;
    if (!pass) allPass = false;
    console.log(
      `${p.name.padEnd(12)}| ${lng.toFixed(2).padEnd(12)}| ${exp.lng.toFixed(2).padEnd(12)}| ${z.sign.padEnd(13)}| ${exp.sign.padEnd(13)}| ${formatDeg(lng).padEnd(11)}| ${exp.deg.padEnd(11)}| ${delta < 0.1 ? '✅' : '❌ Δ=' + delta.toFixed(2)}`
    );
  }

  // --- Houses ---
  console.log('\n=== HOUSE CUSPS (Placidus) ===');
  const houseResult = sweph.houses_ex(jd, sweph.constants.SEFLG_SWIEPH, lat, lon, 'P');
  const hd = houseResult;

  console.log('House | Got Lng     | Exp Lng     | Δ');
  console.log('------|-------------|-------------|------');

  const houses = hd.data?.houses || [];
  for (let i = 0; i < 12; i++) {
    const got = houses[i] ?? -1;
    const exp = EXPECTED_CUSPS[i];
    const delta = Math.abs(got - exp);
    const pass = delta < 0.15;
    if (!pass) allPass = false;
    console.log(`H${String(i+1).padEnd(4)} | ${got.toFixed(2).padEnd(12)}| ${exp.toFixed(2).padEnd(12)}| ${pass ? '✅' : '❌ Δ=' + delta.toFixed(2)}`);
  }

  // ASC and MC
  const gotAsc = hd.data?.points?.[0] ?? -1;
  const gotMC  = hd.data?.points?.[1] ?? -1;
  console.log(`\nASC:  Got ${gotAsc.toFixed(2)} | Exp ${EXPECTED_ASC} | ${Math.abs(gotAsc - EXPECTED_ASC) < 0.15 ? '✅' : '❌'}`);
  console.log(`MC:   Got ${gotMC.toFixed(2)} | Exp ${EXPECTED_MC} | ${Math.abs(gotMC - EXPECTED_MC) < 0.15 ? '✅' : '❌'}`);

  console.log(`\n${allPass ? '🎉 ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}`);
} catch (e) {
  console.error('Error:', e);
}
