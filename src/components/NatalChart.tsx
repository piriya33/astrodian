'use client';

import React from 'react';

export interface PlanetData {
  name: string;
  longitude: number;
  zodiac: string;
  degree: number;
  navamsa?: string;
}

interface HouseCuspsData {
  cusps: number[];    // 12 house cusp longitudes
  ascendant: number;  // ASC longitude
  mc: number;         // MC longitude
}

interface NatalChartProps {
  planets: PlanetData[];
  houseCusps?: HouseCuspsData;
}

const ZODIAC_SIGNS = [
  { name: 'Aries', symbol: '♈', start: 0, color: '#f87171' }, 
  { name: 'Taurus', symbol: '♉', start: 30, color: '#4ade80' }, 
  { name: 'Gemini', symbol: '♊', start: 60, color: '#facc15' }, 
  { name: 'Cancer', symbol: '♋', start: 90, color: '#60a5fa' }, 
  { name: 'Leo', symbol: '♌', start: 120, color: '#fb923c' }, 
  { name: 'Virgo', symbol: '♍', start: 150, color: '#a3e635' }, 
  { name: 'Libra', symbol: '♎', start: 180, color: '#f472b6' }, 
  { name: 'Scorpio', symbol: '♏', start: 210, color: '#9f1239' }, 
  { name: 'Sagittarius', symbol: '♐', start: 240, color: '#f97316' }, 
  { name: 'Capricorn', symbol: '♑', start: 270, color: '#166534' }, 
  { name: 'Aquarius', symbol: '♒', start: 300, color: '#22d3ee' }, 
  { name: 'Pisces', symbol: '♓', start: 330, color: '#3730a3' } 
];

const PLANET_SYMBOLS: Record<string, string> = {
  'Sun': '☉',
  'Moon': '☽',
  'Mars': '♂',
  'Mercury': '☿',
  'Jupiter': '♃',
  'Venus': '♀',
  'Saturn': '♄',
  'Rahu (North Node)': '☊'
};

const PLANET_COLORS: Record<string, string> = {
  'Sun': '#ef4444',
  'Moon': '#fbbf24',
  'Mars': '#f472b6',
  'Mercury': '#10b981',
  'Jupiter': '#f97316',
  'Venus': '#38bdf8',
  'Saturn': '#818cf8',
  'Rahu (North Node)': '#a8a29e'
};

const ASPECT_RULES = [
  { name: 'Conjunction', angle: 0, orb: 10, color: '#facc15' },
  { name: 'Opposition', angle: 180, orb: 8, color: '#ef4444' },
  { name: 'Trine', angle: 120, orb: 8, color: '#10b981' },
  { name: 'Square', angle: 90, orb: 8, color: '#ef4444' },
  { name: 'Sextile', angle: 60, orb: 6, color: '#38bdf8' }
];

// Format longitude to degree°minute' format
const formatDegree = (longitude: number): string => {
  const degInSign = longitude % 30;
  const deg = Math.floor(degInSign);
  const min = Math.round((degInSign - deg) * 60);
  return `${deg}°${String(min).padStart(2, '0')}'`;
};

const SIGN_SYMBOLS: Record<string, string> = {
  'Aries': '♈', 'Taurus': '♉', 'Gemini': '♊', 'Cancer': '♋',
  'Leo': '♌', 'Virgo': '♍', 'Libra': '♎', 'Scorpio': '♏',
  'Sagittarius': '♐', 'Capricorn': '♑', 'Aquarius': '♒', 'Pisces': '♓'
};

const getSignForLongitude = (lng: number): string => {
  const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  return signs[Math.floor(lng / 30) % 12];
};

export default function NatalChart({ planets, houseCusps }: NatalChartProps) {
  const size = 560;
  const center = size / 2;
  const outerRadius = 220;
  const innerRadius = 180;
  
  // 1. Find the rotation offset (Ascendant)
  const ascLongitude = houseCusps?.ascendant ?? 
    (planets?.find(p => p.name === 'Ascendant')?.longitude ?? 0);
  
  // In a standard natal chart, the Ascendant is placed at 9 o'clock (180° in SVG/screen coords)
  // All other points rotate relative to it.
  // Counter-clockwise: higher ecliptic longitudes go upward from ASC toward MC.
  const toScreenAngle = (longitude: number): number => {
    return 180 + (longitude - ascLongitude);
  };

  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  const getCoordinates = (longitude: number, radius: number) => {
    const angle = toRadians(toScreenAngle(longitude));
    return {
      x: radius * Math.cos(angle),
      y: -radius * Math.sin(angle) // SVG y is inverted
    };
  };

  // Build the zodiac sign arc path (outer ring - always equal 30° segments)
  const zodiacArcPath = (startDeg: number, endDeg: number, outerR: number, innerR: number) => {
    const start1 = getCoordinates(startDeg, outerR);
    const end1 = getCoordinates(endDeg, outerR);
    const start2 = getCoordinates(endDeg, innerR);
    const end2 = getCoordinates(startDeg, innerR);
    
    // Determine if the arc should be the "large arc" (> 180°)
    let sweep = endDeg - startDeg;
    if (sweep < 0) sweep += 360;
    const largeArc = sweep > 180 ? 1 : 0;

    return `M ${start1.x} ${start1.y} 
            A ${outerR} ${outerR} 0 ${largeArc} 0 ${end1.x} ${end1.y}
            L ${start2.x} ${start2.y}
            A ${innerR} ${innerR} 0 ${largeArc} 1 ${end2.x} ${end2.y}
            Z`;
  };

  // House cusps: use real data or fallback to equal houses
  const cusps = houseCusps?.cusps ?? Array.from({length: 12}, (_, i) => (ascLongitude + i * 30) % 360);
  const mcLongitude = houseCusps?.mc ?? cusps[9];

  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '2.5rem 0', width: '100%' }}>
      <svg width="100%" height="auto" viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: '500px' }}>
        <defs>
          <pattern id="parchmentPattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="var(--bg-secondary)" />
            <path d="M0 0 L100 100 M100 0 L0 100" stroke="var(--accent-gold)" strokeOpacity="0.03" strokeWidth="0.5" />
          </pattern>
          <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g transform={`translate(${center}, ${center})`}>
          {/* Inner chart background */}
          <circle r={innerRadius} fill="var(--chart-bg-inner)" stroke="var(--accent-gold)" strokeWidth="2" />

          {/* Pre-rendered Zodiac Ring (single rotated image) */}
          {/* 
            The image has Aries at 12 o'clock (top = 90° math angle).
            We rotate it so that 0° ecliptic aligns with its correct screen position.
            screenAngle(0°) = 180 + (0 - ascLongitude) = 180 - ascLongitude
            Image's Aries is at 90° (top).
            CSS rotation (clockwise) = 90 - screenAngle(0°) = 90 - (180 - ascLongitude) = ascLongitude - 90
          */}
          {(() => {
            const ringRotation = ascLongitude - 90;
            const ringSize = (outerRadius + 15) * 2;
            return (
              <g transform={`rotate(${ringRotation})`}>
                <image
                  href="/zodiac-ring.png"
                  x={-ringSize / 2}
                  y={-ringSize / 2}
                  width={ringSize}
                  height={ringSize}
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            );
          })()}

          {/* Horizon Line (H1 ↔ H7 = ASC–DC axis) */}
          {(() => {
            const ascCoord = getCoordinates(cusps[0], outerRadius + 5);
            const dcCoord = getCoordinates(cusps[6], outerRadius + 5);
            return (
              <line x1={ascCoord.x} y1={ascCoord.y} x2={dcCoord.x} y2={dcCoord.y}
                stroke="var(--accent-gold)" strokeWidth="2.5" strokeOpacity="0.7" />
            );
          })()}

          {/* Meridian Line (H4 ↔ H10 = IC–MC axis) */}
          {(() => {
            const icCoord = getCoordinates(cusps[3], outerRadius + 5);
            const mcCoord = getCoordinates(cusps[9], outerRadius + 5);
            return (
              <line x1={icCoord.x} y1={icCoord.y} x2={mcCoord.x} y2={mcCoord.y}
                stroke="var(--accent-gold)" strokeWidth="2.5" strokeOpacity="0.7" />
            );
          })()}

          {/* Non-Angular House Division Lines (center to inner ring) */}
          {cusps.map((cusp, i) => {
            const isAngular = (i === 0 || i === 3 || i === 6 || i === 9);
            if (isAngular) return null; // Already drawn as axis lines
            const innerCoord = getCoordinates(cusp, 0);
            const outerCoord = getCoordinates(cusp, innerRadius);
            return (
              <line 
                key={`house-${i}`}
                x1={innerCoord.x} y1={innerCoord.y} 
                x2={outerCoord.x} y2={outerCoord.y} 
                stroke="var(--accent-gold)" 
                strokeWidth={1} 
                strokeOpacity={0.25} 
              />
            );
          })}

          {/* House Number Labels */}
          {cusps.map((cusp, i) => {
            // Place number at the midpoint of the house arc
            const nextCusp = cusps[(i + 1) % 12];
            let midDeg = cusp + ((nextCusp - cusp + 360) % 360) / 2;
            if (midDeg >= 360) midDeg -= 360;
            const coord = getCoordinates(midDeg, innerRadius - 25);
            return (
              <text
                key={`hnum-${i}`}
                x={coord.x}
                y={coord.y}
                fill="var(--accent-gold)"
                textAnchor="middle"
                alignmentBaseline="central"
                fontSize="10px"
                fontWeight="bold"
                opacity="0.35"
              >
                {i + 1}
              </text>
            );
          })}

          {/* AC / DC / MC / IC Labels with degree info */}
          {(() => {
            const dcLongitude = (ascLongitude + 180) % 360;
            const icLongitude = (mcLongitude + 180) % 360;
            const labels = [
              { deg: ascLongitude, label: 'AC' },
              { deg: dcLongitude, label: 'DC' },
              { deg: mcLongitude, label: 'MC' },
              { deg: icLongitude, label: 'IC' }
            ];
            return labels.map(({ deg, label }) => {
              const coord = getCoordinates(deg, outerRadius + 30);
              const signName = getSignForLongitude(deg);
              const signSym = SIGN_SYMBOLS[signName] || '';
              return (
                <g key={label}>
                  <text
                    x={coord.x}
                    y={coord.y - 7}
                    fill="var(--accent-gold)"
                    textAnchor="middle"
                    alignmentBaseline="central"
                    fontSize="11px"
                    fontWeight="bold"
                    opacity="0.9"
                  >
                    {label}
                  </text>
                  <text
                    x={coord.x}
                    y={coord.y + 7}
                    fill="var(--accent-gold)"
                    textAnchor="middle"
                    alignmentBaseline="central"
                    fontSize="9px"
                    fontWeight="normal"
                    opacity="0.7"
                  >
                    {signSym} {formatDegree(deg)}
                  </text>
                </g>
              );
            });
          })()}

          {/* Aspect Lines Between Planets */}
          <g opacity="0.8">
            {planets?.filter(p => p.name !== 'Ascendant').map((p1, i, filtered) => {
              return filtered.slice(i + 1).map((p2) => {
                let diff = Math.abs(p1.longitude - p2.longitude);
                if (diff > 180) diff = 360 - diff;

                const aspect = ASPECT_RULES.find(rule => Math.abs(diff - rule.angle) <= rule.orb);
                if (aspect) {
                  const coord1 = getCoordinates(p1.longitude, innerRadius - 50);
                  const coord2 = getCoordinates(p2.longitude, innerRadius - 50);
                  return (
                    <line 
                      key={`${p1.name}-${p2.name}`} 
                      x1={coord1.x} y1={coord1.y} 
                      x2={coord2.x} y2={coord2.y} 
                      stroke={aspect.color} 
                      strokeWidth="1.5"
                      strokeDasharray={aspect.name === 'Opposition' || aspect.name === 'Square' ? '4 2' : 'none'}
                      opacity="0.5"
                    />
                  );
                }
                return null;
              });
            })}
          </g>

          {/* Planets */}
          {(() => {
            const filteredPlanets = planets?.filter(p => p.name !== 'Ascendant') || [];
            const sortedPlanets = [...filteredPlanets].sort((a, b) => a.longitude - b.longitude);
            const displayData = sortedPlanets.map(planet => ({ ...planet, radiusOffset: 0 }));

            // Anti-collision: push overlapping planets outward
            for (let i = 0; i < displayData.length; i++) {
              for (let j = i + 1; j < displayData.length; j++) {
                let diff = Math.abs(displayData[i].longitude - displayData[j].longitude);
                if (diff > 180) diff = 360 - diff;
                if (diff < 8 && displayData[i].radiusOffset === displayData[j].radiusOffset) {
                  displayData[j].radiusOffset += 22;
                }
              }
            }

            return displayData.map((planet) => {
              const radiusPlot = innerRadius - 45 - planet.radiusOffset;
              const pCoord = getCoordinates(planet.longitude, radiusPlot);
              const tickCoord = getCoordinates(planet.longitude, innerRadius - 5);
              const tickCoord2 = getCoordinates(planet.longitude, innerRadius + 5);
              
              return (
                <g key={planet.name}>
                  {/* Tick mark on inner ring showing exact degree */}
                  <line x1={tickCoord.x} y1={tickCoord.y} x2={tickCoord2.x} y2={tickCoord2.y} stroke={PLANET_COLORS[planet.name] || 'var(--accent-gold)'} strokeWidth="2" opacity="0.7" />
                  
                  {/* Dashed line from planet to tick */}
                  <line x1={pCoord.x} y1={pCoord.y} x2={tickCoord.x} y2={tickCoord.y} stroke="var(--accent-gold)" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.3" />
                  
                  {/* Planet Circle */}
                  <circle cx={pCoord.x} cy={pCoord.y} r="14" fill="var(--bg-secondary)" stroke={PLANET_COLORS[planet.name] || 'var(--accent-gold)'} strokeWidth="1.5" filter="url(#goldGlow)" />
                  <text 
                    x={pCoord.x} 
                    y={pCoord.y - 2} 
                    fill={PLANET_COLORS[planet.name] || 'var(--text-primary)'} 
                    textAnchor="middle" 
                    alignmentBaseline="central"
                    fontSize="16px"
                    fontWeight="bold"
                  >
                    {PLANET_SYMBOLS[planet.name] || '•'}
                  </text>
                  {/* Degree label below planet */}
                  <text
                    x={pCoord.x}
                    y={pCoord.y + 22}
                    fill="var(--text-secondary)"
                    textAnchor="middle"
                    alignmentBaseline="central"
                    fontSize="7px"
                    opacity="0.7"
                  >
                    {planet.zodiac?.substring(0, 3)} {formatDegree(planet.longitude)}
                  </text>
                </g>
              );
            });
          })()}

          {/* Center piece */}
          <circle r={30} fill="url(#parchmentPattern)" stroke="var(--accent-gold)" strokeWidth="2" />
          <circle r={25} fill="transparent" stroke="var(--accent-gold)" strokeWidth="1" strokeDasharray="4 2" opacity="0.5" />
          <circle r={5} fill="var(--accent-gold)" filter="url(#goldGlow)" />
          <circle r={2} fill="var(--bg-secondary)" />
        </g>
      </svg>
    </div>
  );
}
