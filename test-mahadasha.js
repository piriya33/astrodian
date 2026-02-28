import { calculateMahadasha } from './src/lib/astrology/mahadasha';
import { getAstrologicalDayOfWeek } from './src/lib/astrology/engine';

const birth = new Date("2000-02-21T04:00:00.000+07:00"); // Monday 4am
const current = new Date("2026-02-21T12:00:00.000+07:00");

// Bangkok
const lat = 13.7563;
const lon = 100.5018;

const astroDay = getAstrologicalDayOfWeek(birth, lat, lon, 0);
console.log("Astrological Day (0=Sun):", astroDay); // Should be 0 (Sunday) because born Mon 4am!

const dasha = calculateMahadasha(birth, current, astroDay);
console.log("Age Yang:", dasha.ageYang);
console.log("Current Ruler:", dasha.currentRuler.thName);
console.log("Mahadasa Year:", dasha.mahadasaYear, "/", dasha.currentRuler.years);
console.log("Next Ruler:", dasha.nextRuler.thName);
