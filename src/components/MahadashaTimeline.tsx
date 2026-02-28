'use client';

import React from 'react';
import { mahadashaSequence, PlanetPeriod, MahadashaResult } from '@/lib/astrology/mahadasha';
import styles from './MahadashaTimeline.module.css';

interface MahadashaTimelineProps {
  result: MahadashaResult;
}

// Colors derived from traditional Thai astrology for each planet
const PLANET_COLORS: Record<string, string> = {
  'Sun': '#dc2626',      // Red
  'Moon': '#fcd34d',     // Pale Yellow/White
  'Mars': '#f472b6',     // Pink
  'Mercury': '#22c55e',  // Green
  'Saturn': '#8b5cf6',   // Purple/Black
  'Jupiter': '#f97316',  // Orange
  'Rahu': '#334155',     // Dark Grey
  'Venus': '#3b82f6',    // Blue
};

export default function MahadashaTimeline({ result }: MahadashaTimelineProps) {
  const { currentRuler, ageYang, mahadasaYear } = result;

  // We map the sequence into a flat array of 108 years to show blocks,
  // but a simpler visualization is to show the blocks proportionally.
  
  // Find the exact starting age for each period based on the current cycle
  // This requires knowing the starting index. We can reconstruct this by working backwards
  // from the current ruler, but it's simpler to just show the 108-year absolute sequence
  // starting from the user's birth planet if we pass the root sequence down in the future.
  
  // For now, we will display the generic sequence proportional blocks and highlight where they are.
  // We need to calculate cumulative years to place the marker.
  
  // Reconstruct cycle starting from the ruler at birth.
  // We know ageYang and mahadasaYear. 
  // This means they entered the current ruler at age: ageYang - mahadasaYear + 1
  const ageEnteredCurrent = ageYang - mahadasaYear + 1;
  
  // Find index of current ruler
  const currentIdx = mahadashaSequence.findIndex(p => p.name === currentRuler.name);
  if (currentIdx === -1) return null;
  
  // Work backwards to find the planet at age 1
  let ageCursor = ageEnteredCurrent;
  let startIdx = currentIdx;
  
  while (ageCursor > 1) {
    startIdx = (startIdx - 1 + mahadashaSequence.length) % mahadashaSequence.length;
    ageCursor -= mahadashaSequence[startIdx].years;
  }
  
  // If ageCursor < 1, it means the birth planet (startIdx) governs the first N years.
  // Typically, birth day dictates the starting planet, and age 1 starts at year 1 of that planet.
  // So let's build the 108 array from startIdx.
  
  const blocks: { planet: PlanetPeriod, startAge: number, endAge: number }[] = [];
  let trackingAge = 1;
  
  for (let i = 0; i < mahadashaSequence.length; i++) {
    const idx = (startIdx + i) % mahadashaSequence.length;
    const planet = mahadashaSequence[idx];
    blocks.push({
      planet,
      startAge: trackingAge,
      endAge: trackingAge + planet.years - 1
    });
    trackingAge += planet.years;
  }

  // Calculate percentage position for the marker
  // The total track is 108 years (trackingAge - 1)
  const totalYears = 108;
  const clampedAge = Math.min(Math.max(1, ageYang), 108); // Ensure it's within bounds for visual
  const markerPosition = ((clampedAge - 1) / totalYears) * 100;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>108-Year Cycle of Destiny (มหาทักษา)</h3>
      <p className={styles.subtitle}>Your life traverses through 8 planetary eras, each tinting your fate with its unique hue.</p>
      
      <div className={styles.timelineWrapper}>
        {/* The Track */}
        <div className={styles.track}>
          {blocks.map((block, i) => {
            const widthPct = (block.planet.years / totalYears) * 100;
            const isCurrent = block.planet.name === currentRuler.name;
            
            return (
              <div 
                key={i} 
                className={`${styles.block} ${isCurrent ? styles.currentBlock : ''}`}
                style={{ 
                  width: `${widthPct}%`, 
                  backgroundColor: PLANET_COLORS[block.planet.name] || '#ccc' 
                }}
                title={`${block.planet.thName} (${block.planet.years} yrs) | Age: ${block.startAge}-${block.endAge}`}
              >
                <span className={styles.blockLabel}>{block.planet.thName}</span>
                <span className={styles.blockYears}>{block.planet.years}y</span>
              </div>
            );
          })}
        </div>

        {/* Current Age Marker */}
        <div 
          className={styles.markerContainer}
          style={{ left: `${markerPosition}%` }}
        >
          <div className={styles.markerPin}></div>
          <div className={styles.markerLabel}>
            <span>You are here</span>
            <strong>Age {ageYang}</strong>
          </div>
        </div>
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: PLANET_COLORS[currentRuler.name] }}></div>
          <span>Current Era: <strong>พระ{currentRuler.thName}</strong> (Year {mahadasaYear} of {currentRuler.years})</span>
        </div>
      </div>
    </div>
  );
}
