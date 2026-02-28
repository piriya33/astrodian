import React, { useState } from 'react';
import { PLANETS } from '@/lib/astrology/knowledge/planets';
import { ZODIAC_SIGNS, ASPECTS } from '@/lib/astrology/knowledge/zodiac_aspects';
import { HOUSES_THAI } from '@/lib/astrology/knowledge/houses';
import styles from './EducationalLibrary.module.css';

export default function EducationalLibrary() {
  const [activeTab, setActiveTab] = useState<'planets' | 'zodiacs' | 'houses' | 'aspects'>('planets');

  return (
    <div className={styles.libraryContainer}>
      <h2 className={styles.title}>Astrological Reference Library</h2>
      <p className={styles.subtitle}>Explore the foundational meanings behind the stars to deepen your understanding or use as prompts for the AI.</p>
      
      <div className={styles.tabs}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'planets' ? styles.active : ''}`}
          onClick={() => setActiveTab('planets')}
        >
          Planets (ดาว)
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'houses' ? styles.active : ''}`}
          onClick={() => setActiveTab('houses')}
        >
          Houses (ภพ)
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'zodiacs' ? styles.active : ''}`}
          onClick={() => setActiveTab('zodiacs')}
        >
          Zodiacs (ราศี)
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'aspects' ? styles.active : ''}`}
          onClick={() => setActiveTab('aspects')}
        >
          Aspects (มุม)
        </button>
      </div>

      <div className={styles.contentArea}>
        {activeTab === 'planets' && (
          <div className={styles.grid}>
            {Object.entries(PLANETS).map(([key, data]) => (
              <div key={key} className={styles.card}>
                <h3 className={styles.cardTitle}>{key} (พระ{data.thName})</h3>
                <p><strong>Keywords:</strong> {data.keywords.join(', ')}</p>
                <p><strong>Strengths:</strong> {data.strengths.join(', ')}</p>
                <p><strong>Weaknesses:</strong> {data.weaknesses.join(', ')}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'houses' && (
          <div className={styles.grid}>
            {Object.entries(HOUSES_THAI).map(([key, data]) => (
              <div key={key} className={styles.card}>
                <h3 className={styles.cardTitle}>ภพที่ {key}: {data.name}</h3>
                <p>{data.meaning}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'zodiacs' && (
          <div className={styles.grid}>
            {Object.entries(ZODIAC_SIGNS).map(([key, data]) => (
              <div key={key} className={styles.card}>
                <h3 className={styles.cardTitle}>{key} (ราศี{data.thName})</h3>
                <p><strong>Element:</strong> {data.element} | <strong>Ruler:</strong> {data.ruler}</p>
                <p><strong>Traits:</strong> {data.characteristics.join(', ')}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'aspects' && (
          <div className={styles.grid}>
            {Object.entries(ASPECTS).map(([key, data]) => (
              <div key={key} className={styles.card}>
                <h3 className={styles.cardTitle}>{key} ({data.angle}°)</h3>
                <p>{data.meaning}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
