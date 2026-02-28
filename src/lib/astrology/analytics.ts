import { PLANETS } from './knowledge/planets';
import { HOUSES_THAI, HOUSES_WESTERN } from './knowledge/houses';
import { ZODIAC_SIGNS, THAI_PLANET_RELATIONSHIPS, ASPECTS } from './knowledge/zodiac_aspects';

export interface CalculatedAspect {
  planet1: string;
  planet2: string;
  aspectType: string;
  orb: number;
  exactAngle: number;
  significance: string;
}

/**
 * Calculates astrological aspects between two sets of planets (e.g. Natal vs Natal, or Natal vs Transit)
 */
export function calculateAspects(planets1: any[], planets2: any[]): CalculatedAspect[] {
  const activeAspects: CalculatedAspect[] = [];

  for (const p1 of planets1) {
    for (const p2 of planets2) {
      if (p1.name === p2.name) continue; // Don't aspect itself usually, unless returning transit

      // Calculate the absolute angular distance (shortest distance on a circle)
      let diff = Math.abs(p1.longitude - p2.longitude);
      if (diff > 180) {
        diff = 360 - diff;
      }

      // Check against defined Aspects and within allowed Orb
      for (const [aspectName, aspectData] of Object.entries(ASPECTS)) {
        if (Math.abs(diff - aspectData.angle) <= aspectData.orb) {
          
          // Determine Astrological Significance (Is it a pair of friends? Enemies?)
          let pairType = 'Neutral Phase';
          const pair = [p1.name, p2.name];

          const isFriend = THAI_PLANET_RELATIONSHIPS.FRIENDS.some(f => (f[0] === pair[0] && f[1] === pair[1]) || (f[0] === pair[1] && f[1] === pair[0]));
          const isEnemy = THAI_PLANET_RELATIONSHIPS.ENEMIES.some(e => (e[0] === pair[0] && e[1] === pair[1]) || (e[0] === pair[1] && e[1] === pair[0]));
          const isElement = THAI_PLANET_RELATIONSHIPS.ELEMENTS.some(e => (e[0] === pair[0] && e[1] === pair[1]) || (e[0] === pair[1] && e[1] === pair[0]));

          if (isFriend) pairType = 'คู่มิตร (Great Synergy/Friendship)';
          if (isEnemy) pairType = 'คู่ศัตรู (Friction/Conflict)';
          if (isElement) pairType = 'คู่ธาตุ (Strong Foundation)';

          activeAspects.push({
            planet1: p1.name,
            planet2: p2.name,
            aspectType: aspectName,
            orb: parseFloat(Math.abs(diff - aspectData.angle).toFixed(2)),
            exactAngle: parseFloat(diff.toFixed(2)),
            significance: pairType
          });
        }
      }
    }
  }

  return activeAspects;
}

/**
 * Very basic formulation to find which House a planet sits in 
 * Note: Real astro software calculates specific House Cusps based on exact birth time + Lat/Lon.
 * For this MVP, we use the simple "Whole Sign House" system starting at Aries = 1st House, OR
 * starting the Ascendant at 0 degrees of house 1.
 */
export function assignPlanetToHouse(planetLongitude: number, ascendantLongitude: number): number {
  // Simple Equal House system based on Ascendant
  let houseDegree = planetLongitude - ascendantLongitude;
  if (houseDegree < 0) {
    houseDegree += 360;
  }
  
  // 30 degrees per House
  const houseNumber = Math.floor(houseDegree / 30) + 1;
  return houseNumber;
}
