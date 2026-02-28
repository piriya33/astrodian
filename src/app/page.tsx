'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import QRCode from 'react-qr-code';
import NatalChart from '@/components/NatalChart';
import EducationalLibrary from '@/components/EducationalLibrary';
import MahadashaTimeline from '@/components/MahadashaTimeline';
import ExportPDFButton from '@/components/ExportPDFButton';
import { generatePromptPayPayload } from '@/lib/payments/promptpay';
import styles from './page.module.css';

export interface UserProfile {
  id: string;
  name: string;
  birthDateStr: string;
  birthTimeStr: string;
  lat: number;
  lon: number;
  locationName: string;
}

export default function Home() {
  const [formData, setFormData] = useState({
    name: '',
    birthDateStr: '2000-01-01',
    birthTimeStr: '12:00',
    lat: 13.7563,
    lon: 100.5018,
    mode: 'daily',
    persona: 'expert',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isRahuMode, setIsRahuMode] = useState(false);
  const [readingHistory, setReadingHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingPose, setLoadingPose] = useState(0); // 0-3 for sprite cycle
  
  const [locationQuery, setLocationQuery] = useState('Bangkok, Thailand');
  const [locationResults, setLocationResults] = useState<any[]>([]);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'lightning' | 'promptpay'>('lightning');
  const [promptPayPayload, setPromptPayPayload] = useState<string | null>(null);
  const [isVerifyingSlip, setIsVerifyingSlip] = useState(false);
  const promptPayId = "1100700170411"; // PromptPay ID
  const TESTING_MODE = true; // Set to false for production

  // Profiles State
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [saveProfile, setSaveProfile] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  useEffect(() => {
    // Load profiles on mount
    const saved = localStorage.getItem('nox_profiles');
    if (saved) {
      setProfiles(JSON.parse(saved));
    }
    // Load reading history on mount
    const history = localStorage.getItem('pekky_reading_history');
    if (history) {
      setReadingHistory(JSON.parse(history));
    }
  }, []);

  // Cycle loading poses
  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingPose(prev => (prev + 1) % 4);
      }, 1500); // Change action every 1.5s
    } else {
      setLoadingPose(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Daily cache helpers
  const getDailyCacheKey = () => {
    const today = new Date().toISOString().split('T')[0];
    return `pekky_daily_${formData.birthDateStr}_${formData.birthTimeStr}_${formData.persona}_${today}`;
  };

  const getDailyCache = () => {
    try {
      const cached = localStorage.getItem(getDailyCacheKey());
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  };

  const setDailyCache = (data: any) => {
    localStorage.setItem(getDailyCacheKey(), JSON.stringify(data));
  };

  const saveToHistory = (data: any) => {
    const entry = {
      id: Date.now().toString(),
      mode: formData.mode,
      persona: formData.persona,
      date: new Date().toISOString(),
      reading: data.reading,
      astrology: data.astrology,
    };
    const updated = [entry, ...readingHistory].slice(0, 20); // Keep last 20
    setReadingHistory(updated);
    localStorage.setItem('pekky_reading_history', JSON.stringify(updated));
  };

  const handleProfileSelect = (profileId: string) => {
    setSelectedProfileId(profileId);
    if (!profileId) return;
    const p = profiles.find(x => x.id === profileId);
    if (p) {
      setFormData({
        ...formData,
        name: p.name,
        birthDateStr: p.birthDateStr,
        birthTimeStr: p.birthTimeStr,
        lat: p.lat,
        lon: p.lon
      });
      setLocationQuery(p.locationName);
    }
  };

  const handleDeleteProfile = () => {
    if (!selectedProfileId) return;
    const updated = profiles.filter(p => p.id !== selectedProfileId);
    setProfiles(updated);
    localStorage.setItem('nox_profiles', JSON.stringify(updated));
    setSelectedProfileId('');
    setFormData({ ...formData, name: '' }); 
  };

  // We use Nominatim (OpenStreetMap) for free geocoding
  const searchLocation = async (query: string) => {
    if (query.length < 3) {
      setLocationResults([]);
      return;
    }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      const data = await res.json();
      setLocationResults(data);
    } catch(e) {
      console.error(e);
    }
  };

  const selectLocation = (loc: any) => {
    setFormData({
      ...formData,
      lat: parseFloat(loc.lat),
      lon: parseFloat(loc.lon)
    });
    setLocationQuery(loc.display_name);
    setLocationResults([]);
  };

  // Lightning State
  const [invoice, setInvoice] = useState<string | null>(null);
  const [paymentHash, setPaymentHash] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [pollIntervalId, setPollIntervalId] = useState<NodeJS.Timeout | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setInvoice(null);
    setPaymentHash(null);
    
    // Execute Profile Saving if requested
    if (saveProfile && formData.name) {
      const newProfile: UserProfile = {
        id: Date.now().toString(),
        name: formData.name,
        birthDateStr: formData.birthDateStr,
        birthTimeStr: formData.birthTimeStr,
        lat: formData.lat,
        lon: formData.lon,
        locationName: locationQuery,
      };
      const updatedVault = [...profiles, newProfile];
      setProfiles(updatedVault);
      localStorage.setItem('nox_profiles', JSON.stringify(updatedVault));
      setSaveProfile(false); // Reset check
    }

    const PAID_MODES = ['detailed', 'blueprint', 'focus_finance', 'focus_career', 'focus_relationship', 'bitcoin_synastry'];
    if (PAID_MODES.includes(formData.mode)) {
      setLoading(true);
      setStep(3); // Move to dashboard immediately to show loader/paywall

      // TESTING: Skip payment entirely
      if (TESTING_MODE) {
        fetchReading();
        return;
      }

      try {
        let amountSats = 318; // 10.80 THB ~ Detailed
        let amountTHB = 10.80;
        let memo = 'PEKKY Detailed Reading (฿10.80)';
        
        if (formData.mode === 'blueprint') {
          amountSats = 3176; amountTHB = 108;
          memo = 'PEKKY 12-Month Blueprint (฿108)';
        } else if (formData.mode.startsWith('focus_')) {
          amountSats = 1080; amountTHB = 36;
          memo = `PEKKY Focus Reading (฿36)`;
        } else if (formData.mode === 'bitcoin_synastry') {
          amountSats = 1620; amountTHB = 54;
          memo = 'PEKKY Bitcoin Synastry (฿54)';
        }

        // Generate PromptPay Payload immediately
        const ppPayload = generatePromptPayPayload(promptPayId, amountTHB);
        setPromptPayPayload(ppPayload);

        const res = await fetch('/api/alby/invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amountSats, memo })
        });
        const data = await res.json();
        
        if (data.payment_request && data.payment_hash) {
          setInvoice(data.payment_request);
          setPaymentHash(data.payment_hash);
          setPolling(true);
          setLoading(false);
          startPolling(data.payment_hash);
        } else {
          alert("Failed to generate invoice");
          setLoading(false);
          setStep(2); // kick back on fail
        }
      } catch (err) {
        console.error(err);
        alert("Lightning API error");
        setLoading(false);
        setStep(2);
      }
      return;
    }
    
    // Free mode (Daily or Chart-Only) — check cache first for daily
    setStep(3);
    if (formData.mode === 'daily') {
      const cached = getDailyCache();
      if (cached) {
        setResult(cached);
      } else {
        fetchReading();
      }
    } else {
      // Chart-only mode — always fetch fresh (no cache needed)
      fetchReading();
    }
  };

  const startPolling = (hash: string) => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/alby/verify?payment_hash=${hash}`);
        const data = await res.json();
        if (data.settled) {
          clearInterval(id);
          setPolling(false);
          setInvoice(null);
          // Don't reset paymentHash yet so we can pass it
          fetchReading(hash); 
          setPaymentHash(null);
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 3000); // Check every 3 seconds
    
    setPollIntervalId(id);
  };

  const fetchReading = async (paidHash?: string) => {
    setLoading(true);
    try {
      const payload = { 
        ...formData, 
        // Send browser's UTC offset (minutes). getTimezoneOffset() returns
        // positive for west of UTC, negative for east (e.g. Bangkok UTC+7 = -420).
        // This is used by the backend to correctly convert local birth time → UTC.
        utcOffset: new Date().getTimezoneOffset(),
        ...(paidHash && { payment_hash: paidHash }),
        // Prompt minimization: for free tier, only send essential planets
        ...(formData.mode === 'daily' && { lite: true })
      };
      
      const res = await fetch('/api/astrology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setResult(data);
      
      // Cache daily readings
      if (formData.mode === 'daily' && data.success) {
        setDailyCache(data);
      }
      
      // Save paid readings to history
      if (formData.mode !== 'daily' && data.success) {
        saveToHistory(data);
      }
      
      // Initialize Chat if mode is chat
      if (formData.mode === 'chat' && data.astrology?.prompt) {
        setChatMessages([
          { role: 'system', content: data.astrology.prompt },
          { role: 'assistant', content: data.reading }
        ]);
      }
      
    } catch (err) {
      console.error(err);
      alert('Error calculating chart');
    }
    setLoading(false);
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = { role: 'user', content: chatInput };
    const newMessages = [...chatMessages, userMessage];
    
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/astrology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      
      if (data.reading) {
        setChatMessages([...newMessages, { role: 'assistant', content: data.reading }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      alert("Failed to get response from Pekky.");
    }
    setChatLoading(false);
  };

  const handleWebLNPay = async () => {
    try {
      if (typeof window.webln !== 'undefined') {
        await window.webln.enable();
        await window.webln.sendPayment(invoice as string);
        // Polling will catch the success automatically
      } else {
        alert("WebLN provider not found. Please use a mobile wallet to scan the QR code.");
      }
    } catch (e) {
      console.error("WebLN payment failed or cancelled:", e);
    }
  };

  const handleCancelPayment = () => {
    if (pollIntervalId) clearInterval(pollIntervalId);
    setInvoice(null);
    setPaymentHash(null);
    setPromptPayPayload(null);
    setPolling(false);
    setLoading(false);
    setStep(2);
  }

  const handleSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsVerifyingSlip(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        const amountTHB = formData.mode === 'daily' ? 0 : (formData.mode === 'detailed' ? 10.80 : 108);

        const res = await fetch('/api/verify-slip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image: base64, 
            expectedAmount: amountTHB,
            mode: formData.mode
          }),
        });
        const data = await res.json();

        if (data.success) {
          alert("Verification Successful! Opening your destiny...");
          fetchReading(); // Fetch without a paid hash (we trust the AI)
          setInvoice(null);
          setPromptPayPayload(null);
        } else {
          alert(`Verification failed: ${data.data?.reason || data.error || 'Unknown error'}`);
        }
        setIsVerifyingSlip(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert("Error uploading slip");
      setIsVerifyingSlip(false);
    }
  };

  const resetJourney = () => {
    setResult(null);
    setInvoice(null);
    setChatMessages([]);
    setStep(1);
  };

  const handleShare = async () => {
    if (!result?.reading) return;
    const paragraphs = result.reading.split('\n').filter((p: string) => p.trim() !== '');
    // Grab the last paragraph which is usually the actionable anchor, or fallback
    const snippet = paragraphs.length > 0 ? paragraphs[paragraphs.length - 1] : "Consult Pekky today!";
    const text = `${snippet}\n\n🔮 Get your Lightning-native astrology reading from Pekky: https://astrodian.vercel.app`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Pekky Reading',
          text: text,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      // Fallback to X (Twitter) Web Intent
      const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
      window.open(shareUrl, '_blank');
    }
  };

  return (
    <div data-theme={isRahuMode ? 'rahu' : 'day'} style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', transition: 'background-color 0.3s' }}>
    <main className={styles.main}>
      <div className={styles.container}>
        
        <header className={styles.header} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ marginBottom: '1rem', width: '150px', height: '150px', overflow: 'hidden', position: 'relative' }}>
            <Image 
              src="/pekky-sprites.png" 
              alt="Pekky Mascot" 
              width={300} 
              height={300} 
              style={{ 
                position: 'absolute',
                top: '-150px',
                left: '-150px',
                maxWidth: 'none',
                objectFit: 'contain'
              }} 
            />
          </div>
          <h1 className={styles.title} style={{ marginBottom: '0.5rem' }}>PEKKY</h1>
          <p className={styles.subtitle}>The Crystal Glass of Destiny</p>
          <button 
            type="button" 
            className={styles.themeToggle} 
            onClick={() => setIsRahuMode(!isRahuMode)}
            title={isRahuMode ? "Switch to Daylight" : "Enter Rahu Mode"}
          >
            {isRahuMode ? "🌞" : "🌘"}
          </button>
        </header>

        {step < 3 && (
          <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className={styles.form}>
            {step === 1 && (
              <div className={styles.cardSurface}>
                <h2 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Step 1: Temporal Identity</h2>
                
                {profiles.length > 0 && (
                  <div className={styles.inputGroup} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                    <label className={styles.label}>Select Saved Profile (Optional)</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select className={styles.select} value={selectedProfileId} onChange={(e) => handleProfileSelect(e.target.value)}>
                        <option value="" disabled>-- Choose an Identity --</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.birthDateStr})</option>
                        ))}
                      </select>
                      {selectedProfileId && (
                        <button type="button" onClick={handleDeleteProfile} className={styles.button} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0 1rem' }}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className={styles.inputGroup} style={{ marginBottom: '1rem' }}>
                  <label className={styles.label}>First Name</label>
                  <input type="text" required placeholder="To address you correctly..." className={styles.input} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>

                <div className={styles.grid}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Date of Birth</label>
                    <input type="date" required className={styles.input} value={formData.birthDateStr} onChange={(e) => setFormData({ ...formData, birthDateStr: e.target.value })} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Time of Birth</label>
                    <input type="time" required className={styles.input} value={formData.birthTimeStr} onChange={(e) => setFormData({ ...formData, birthTimeStr: e.target.value })} />
                  </div>
                </div>
                <button type="submit" className={styles.button}>Next: Location & Persona</button>
              </div>
            )}

            {step === 2 && (
              <div className={styles.cardSurface}>
                <h2 style={{ fontFamily: 'var(--font-cinzel)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Step 2: Spatial Data & Persona</h2>
                <div className={styles.grid}>
                  <div className={styles.inputGroup} style={{ position: 'relative', width: '100%', gridColumn: 'span 2' }}>
                    <label className={styles.label}>Place of Birth (City, Country)</label>
                    <input type="text" required placeholder="e.g. Bangkok, Thailand" className={styles.input} value={locationQuery} onChange={(e) => { setLocationQuery(e.target.value); searchLocation(e.target.value); }} />
                    {locationResults.length > 0 && (
                      <ul className={styles.autocompleteList}>
                        {locationResults.map((loc: any, i: number) => (
                          <li key={i} className={styles.autocompleteItem} onClick={() => selectLocation(loc)}>{loc.display_name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className={styles.grid}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Reading Mode</label>
                    <select className={styles.select} value={formData.mode} onChange={(e) => setFormData({ ...formData, mode: e.target.value })}>
                      <option value="chart">📊 Chart Only — Data View (Free)</option>
                      <option value="daily">🌅 Daily Summary (Free)</option>
                      <option value="detailed">🔮 Detailed Life Report (฿10.80 / ~318 Sats)</option>
                      <option value="focus_finance">🏦 Focus: Finance (฿36 / ~1,080 Sats)</option>
                      <option value="focus_career">💼 Focus: Career (฿36 / ~1,080 Sats)</option>
                      <option value="focus_relationship">💕 Focus: Relationship (฿36 / ~1,080 Sats)</option>
                      <option value="bitcoin_synastry">₿ Bitcoin Synastry (฿54 / ~1,620 Sats)</option>
                      <option value="blueprint">🗺️ 12-Month Destiny Blueprint (฿108 / ~3,176 Sats)</option>
                    </select>
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>AI Persona</label>
                    <select className={styles.select} value={formData.persona} onChange={(e) => setFormData({ ...formData, persona: e.target.value })}>
                      <option value="expert">The Oracle (Clear & Direct)</option>
                      <option value="cdc">Thai Master (Practical/Investment)</option>
                      <option value="seiya">Celestial Guardian (Mythic)</option>
                    </select>
                  </div>
                </div>

                <div className={styles.inputGroup} style={{ marginTop: '1.5rem', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="checkbox" 
                    id="saveProfile" 
                    checked={saveProfile} 
                    onChange={(e) => setSaveProfile(e.target.checked)} 
                    style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                  />
                  <label htmlFor="saveProfile" style={{ color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' }}>
                    Save this identity to my Local Vault for next time
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setStep(1)} className={styles.button} style={{ background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>Back</button>
                  <button type="button" onClick={handleSubmit} disabled={loading} className={styles.button} style={{ flex: 1 }}>Consult the Oracle</button>
                </div>
              </div>
            )}
          </form>
        )}

        <div className={styles.resultContainer}>
          {step === 3 && loading && !invoice && (
            <div className={styles.cardSurface} style={{ alignItems: 'center', textAlign: 'center', padding: '4rem 2rem' }}>
              <div className={styles.pekkyLoader}>
                <div style={{ width: '120px', height: '120px', overflow: 'hidden', position: 'relative' }}>
                  <Image 
                    src="/pekky-sprites.png" 
                    alt="Pekky Working" 
                    width={240} 
                    height={240} 
                    style={{ 
                      position: 'absolute',
                      top: loadingPose < 2 ? '0' : '-120px',
                      left: loadingPose % 2 === 0 ? '0' : '-120px',
                      maxWidth: 'none'
                    }} 
                  />
                </div>
              </div>
              <p style={{ marginTop: '1.5rem', color: 'var(--text-primary)', fontWeight: '500', fontSize: '1.1rem' }}>
                {loadingPose === 0 && "Checking the stars..."}
                {loadingPose === 1 && "Consulting ancient texts..."}
                {loadingPose === 2 && "Recording astral alignments..."}
                {loadingPose === 3 && "Meditating on your destiny..."}
              </p>
              <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Pekky is working hard for you.</p>
            </div>
          )}

          {step === 3 && invoice && (
            <div className={styles.paymentOverlay}>
              <div className={styles.invoiceCard}>
                <h2 className={styles.invoiceTitle}>Unlock Pekky Access</h2>
                
                {/* PromptPay tabs hidden for Phase 1 — will return in Phase 2 with gateway integration
                <div className={styles.paymentTabs}>
                  <button type="button" className={`${styles.tabButton} ${paymentMethod === 'lightning' ? styles.tabButtonActive : ''}`} onClick={() => setPaymentMethod('lightning')}>Lightning (Sats)</button>
                  <button type="button" className={`${styles.tabButton} ${paymentMethod === 'promptpay' ? styles.tabButtonActive : ''}`} onClick={() => setPaymentMethod('promptpay')}>PromptPay (Baht)</button>
                </div>
                */}

                {paymentMethod === 'lightning' ? (
                  <>
                    <div className={styles.invoiceAmount}>
                      ⚡ {formData.mode === 'blueprint' ? '3,176' : formData.mode.startsWith('focus_') ? '1,080' : formData.mode === 'bitcoin_synastry' ? '1,620' : '318'} Sats
                      <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        (~฿{formData.mode === 'blueprint' ? '108' : formData.mode.startsWith('focus_') ? '36' : formData.mode === 'bitcoin_synastry' ? '54' : '10.80'})
                      </span>
                    </div>
                    
                    {invoice && (
                      <div className={styles.qrContainer}>
                        <QRCode value={invoice} size={200} />
                      </div>
                    )}
                    
                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', alignItems: 'center', width: '100%'}}>
                      <button type="button" onClick={handleWebLNPay} className={styles.button} style={{width: '100%'}}>
                        Pay with WebLN
                      </button>
                      <a href={`lightning:${invoice}`} className={styles.cancelButton} style={{width: '100%', textDecoration: 'none'}}>
                        Open Desktop Wallet
                      </a>
                    </div>

                    {polling && (
                      <div style={{display: 'flex', alignItems: 'center', justifyItems: 'center', gap: '1rem', marginTop: '1.5rem'}}>
                        <div className={styles.pekkyChatLoader}>
                          <Image src="/pekky-logo.png" alt="Pekky Thinking" width={40} height={40} />
                          <p style={{color: 'var(--text-secondary)', margin: 0}}>Waiting for payment...</p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className={styles.invoiceAmount}>
                      ฿{formData.mode === 'blueprint' ? '108.00' : formData.mode.startsWith('focus_') ? '36.00' : formData.mode === 'bitcoin_synastry' ? '54.00' : '10.80'}
                      <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Scan & Pay with any Thai App
                      </span>
                    </div>

                    <div className={styles.qrContainer} style={{ background: 'white', padding: '1rem' }}>
                      <QRCode value={promptPayPayload || ''} size={200} />
                      <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                        <Image src="https://upload.wikimedia.org/wikipedia/commons/c/c5/PromptPay_logo.svg" alt="PromptPay" width={80} height={20} style={{ objectFit: 'contain' }} unoptimized />
                      </div>
                    </div>

                    <div className={styles.uploadSection}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        {isVerifyingSlip ? 'Pekky is reading your slip...' : 'Already paid? Upload your slip below:'}
                      </p>
                      
                      {isVerifyingSlip ? (
                         <div className={styles.pekkyChatLoader}>
                           <Image src="/pekky-logo.png" alt="Pekky Thinking" width={60} height={60} />
                         </div>
                      ) : (
                        <>
                          <input 
                            type="file" 
                            id="slipUpload" 
                            accept="image/*" 
                            style={{ display: 'none' }} 
                            onChange={handleSlipUpload} 
                          />
                          <label htmlFor="slipUpload" className={styles.uploadLabel}>
                            📤 Upload Transaction Slip
                          </label>
                        </>
                      )}
                    </div>
                  </>
                )}
                
                <button type="button" onClick={handleCancelPayment} className={styles.cancelButton} style={{marginTop: '1.5rem'}}>
                  Back to Profile
                </button>
              </div>
            </div>
          )}

          {result && (
            <div className={styles.resultCard} id="astrodian-reading-result">
              {result.error && <p className={styles.errorText}>{result.error}</p>}
              
              {result.success && (
                <>
                  <div className={styles.statsGrid}>
                    <div className={styles.statBox}>
                      <p className={styles.statLabel}>Astro Day</p>
                      <p className={styles.statValue}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][result.astrology.astroDay]}</p>
                    </div>
                    <div className={styles.statBox}>
                      <p className={styles.statLabel}>Age</p>
                      <p className={styles.statValue}>{result.astrology.mahadasha.ageYang}</p>
                    </div>
                    <div className={styles.statBox}>
                      <p className={styles.statLabel}>Current Ruler</p>
                      <p className={styles.statValue}>{result.astrology.mahadasha.currentRuler.name}</p>
                    </div>
                    <div className={styles.statBox}>
                      <p className={styles.statLabel}>Next Ruler</p>
                      <p className={styles.statValue}>{result.astrology.mahadasha.nextRuler.name}</p>
                    </div>
                  </div>

                  {/* 108-Year Cycle Component */}
                  <MahadashaTimeline result={result.astrology.mahadasha} />

                  <div className={styles.tableContainer}>
                  <h3 className={styles.readingTitle}>Natal Chart Visualization</h3>
                  <NatalChart planets={result.planets} houseCusps={result.houseCusps} />
                  
                  <h3 className={styles.readingTitle}>Natal Chart Data</h3>
                  <table className={styles.dataTable} style={{ marginBottom: '2rem' }}>
                    <thead>
                      <tr>
                        <th>Planet/Point</th>
                        <th>Zodiac Sign</th>
                        <th>Degree (°)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.planets?.map((planet: any, i: number) => (
                        <tr key={i}>
                          <td className={styles.planetName}>{planet.name}</td>
                          <td className={styles.planetZodiac}>{planet.zodiac}</td>
                          <td className={styles.planetDegree}>{planet.degree.toFixed(2)}°</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <h3 className={styles.readingTitle}>Current Transits (Today)</h3>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Planet/Point</th>
                        <th>Zodiac Sign</th>
                        <th>Degree (°)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.transits?.map((planet: any, i: number) => (
                        <tr key={i}>
                          <td className={styles.planetName}>{planet.name}</td>
                          <td className={styles.planetZodiac}>{planet.zodiac}</td>
                          <td className={styles.planetDegree}>{planet.degree.toFixed(2)}°</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {formData.mode !== 'chat' && result.reading ? (
                  <div className={styles.readingSection}>
                    <h3 className={styles.readingTitle}>AI Astrological Reading</h3>
                    <div className={styles.readingContent}>
                      {result.reading?.split('\n').map((line: string, i: number) => {
                        // Very basic markdown parser for bold and headers
                        if (line.trim() === '') return <br key={i} />;
                        if (line.startsWith('## ')) return <h2 key={i} style={{ marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--brand-highlight)' }}>{line.replace('## ', '')}</h2>;
                        if (line.startsWith('### ')) return <h3 key={i} style={{ marginTop: '1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{line.replace('### ', '')}</h3>;
                        
                        const processedLine = line.split('**').map((part, index) => {
                          if (index % 2 === 1) return <strong key={index} style={{ color: 'var(--brand-highlight)' }}>{part}</strong>;
                          return part;
                        });

                        return <p key={i} style={{ marginBottom: '0.5rem' }}>{processedLine}</p>;
                      })}
                    </div>
                    {formData.mode !== 'daily' && (
                      <p style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.5' }}>
                        🔮 If you consult Pekky again, she may read the stars a little differently — but it will always be grounded in the same astral data.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className={styles.chatSection}>
                    <h3 className={styles.readingTitle}>Chat with Pekky</h3>
                    <div className={styles.chatWindow}>
                      {chatMessages.filter(m => m.role !== 'system').map((msg, i) => (
                        <div key={i} className={msg.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAI}>
                          {msg.content.split('\n').map((line: string, idx: number) => (
                            <p key={idx}>{line}</p>
                          ))}
                        </div>
                      ))}
                      {chatLoading && (
                        <div className={styles.chatBubbleAI}>
                          <div className={styles.pekkyChatLoader}>
                            <Image src="/pekky-logo.png" alt="Pekky Thinking" width={40} height={40} />
                            <p style={{fontStyle: 'italic', opacity: 0.7, margin: 0}}>Pekky is consulting the stars...</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <form onSubmit={handleChatSubmit} className={styles.chatInputArea}>
                      <input 
                        type="text" 
                        value={chatInput} 
                        onChange={(e) => setChatInput(e.target.value)} 
                        placeholder="Ask a specific question about your destiny..." 
                        className={styles.input} 
                        disabled={chatLoading}
                      />
                      <button type="submit" disabled={chatLoading} className={styles.button} style={{width: 'auto', padding: '0 1.5rem'}}>
                        Ask
                      </button>
                    </form>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', width: '100%' }}>
                  {formData.mode !== 'chat' && (
                    <button onClick={handleShare} className={styles.button} style={{ flex: 1, background: 'var(--brand-highlight)', color: '#000' }}>
                      Share Reading
                    </button>
                  )}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', width: '100%' }}>
                    <div style={{ flex: 1 }}>
                      <button onClick={resetJourney} className={styles.button} style={{ width: '100%' }}>
                        Start New Reading
                      </button>
                    </div>
                    <div style={{ flex: 1 }}>
                      <ExportPDFButton targetId="astrodian-reading-result" filename={`Astrodian_Reading_${formData.name}.pdf`} />
                    </div>
                  </div>
                </div>
                </>
              )}
            </div>
          )}
        </div>

        <EducationalLibrary />

        {/* Reading History Vault */}
        {readingHistory.length > 0 && (
          <div className={styles.cardSurface} style={{ marginTop: '2rem' }}>
            <button 
              type="button" 
              onClick={() => setShowHistory(!showHistory)} 
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', width: '100%', textAlign: 'left', padding: '0.5rem 0', fontSize: '1.1rem', fontWeight: '600' }}
            >
              {showHistory ? '▼' : '▶'} My Past Readings ({readingHistory.length})
            </button>
            {showHistory && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {readingHistory.map((entry) => (
                  <div key={entry.id} style={{ padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--border-light)' }} onClick={() => { setResult({ success: true, reading: entry.reading, astrology: entry.astrology, planets: [], transits: [] }); setStep(3); }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600', fontSize: '0.9rem', textTransform: 'capitalize' }}>{entry.mode} Reading</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{new Date(entry.date).toLocaleDateString()}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.reading?.substring(0, 80)}...
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
    </div>
  );
}
