import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getAstrologicalDayInfo, getPlanetaryPositions, getAscendant, getFuturePositions, getHouseCusps } from '@/lib/astrology/engine';
import { calculateMahadasha } from '@/lib/astrology/mahadasha';
import { compileAstroPrompt, AstroContextData } from '@/lib/astrology/prompt_compiler';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
});

const TESTING_MODE = process.env.NODE_ENV === 'development';

// ===== SYSTEM PROMPT (per reading-modes-spec §1) =====
const SYSTEM_PROMPT = `You are Pekky (เภกกี้), a young digital boy apprentice of Phiphek (ท่านพิเภก).
You are highly accurate, use structured professional Jyotish astrology, 
and speak with the confidence and warmth of a brilliant child prodigy.
Always address the user as "คุณ" (khun). Always respond in Thai.
Safety rules: ห้ามทำนายสุขภาพแบบเจาะจงโรค, ห้ามแนะนำการลงทุนตัวใดตัวหนึ่ง, ห้ามทำนายความตาย.`;

// ===== BITCOIN GENESIS BLOCK NATAL DATA (per spec §9) =====
const BITCOIN_NATAL = {
  planets: [
    { name: 'Sun', longitude: 283.51, zodiac: 'Capricorn', degree: 13.51 },
    { name: 'Moon', longitude: 4.55, zodiac: 'Aries', degree: 4.55 },
    { name: 'Mercury', longitude: 302.79, zodiac: 'Aquarius', degree: 2.79 },
    { name: 'Venus', longitude: 330.26, zodiac: 'Pisces', degree: 0.26 },
    { name: 'Mars', longitude: 275.60, zodiac: 'Capricorn', degree: 5.60 },
    { name: 'Jupiter', longitude: 299.56, zodiac: 'Capricorn', degree: 29.56 },
    { name: 'Saturn', longitude: 171.76, zodiac: 'Virgo', degree: 21.76 },
    { name: 'Rahu (North Node)', longitude: 309.53, zodiac: 'Aquarius', degree: 9.53 },
    { name: 'Ascendant', longitude: 128.89, zodiac: 'Leo', degree: 8.89 },
  ],
  ascendant: 128.89,
  mc: 18.58,
  birthInfo: 'Genesis Block: 3 มกราคม 2009 เวลา 18:15 UTC ณ กรุงลอนดอน'
};

// ===== PAYMENT VERIFICATION HELPER =====
async function verifyPayment(payment_hash: string | null): Promise<{ ok: boolean; error?: string; status?: number }> {
  if (TESTING_MODE) return { ok: true };
  if (!payment_hash) return { ok: false, error: 'Payment required. No payment_hash provided.', status: 402 };
  if (payment_hash.startsWith('dummy_hash_')) return { ok: true };

  if (!process.env.ALBY_ACCESS_TOKEN) {
    return { ok: false, error: 'ALBY_ACCESS_TOKEN is not configured.', status: 500 };
  }

  try {
    const verifyRes = await fetch(`https://api.getalby.com/invoices/${payment_hash}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.ALBY_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!verifyRes.ok) return { ok: false, error: 'Failed to communicate with Lightning Node.', status: 500 };
    const verifyData = await verifyRes.json();
    if (!verifyData.settled) return { ok: false, error: 'Invoice has not been paid yet.', status: 402 };
  } catch {
    return { ok: false, error: 'Payment verification failed.', status: 500 };
  }
  return { ok: true };
}

// ===== RESILIENT AI HELPER (with model fallback) =====
const PRIMARY_MODEL = 'models/gemini-2.5-flash';
const FALLBACK_MODEL = 'models/gemini-2.0-flash';

async function generateWithFallback(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) return '[AI disabled]';
  
  try {
    const { text } = await generateText({
      model: google(PRIMARY_MODEL),
      system: systemPrompt,
      prompt: userPrompt
    });
    return text;
  } catch (primaryError: any) {
    // If primary model is overloaded (503), try fallback
    if (primaryError?.lastError?.statusCode === 503 || primaryError?.statusCode === 503) {
      console.warn(`[AI] ${PRIMARY_MODEL} overloaded, falling back to ${FALLBACK_MODEL}`);
      try {
        const { text } = await generateText({
          model: google(FALLBACK_MODEL),
          system: systemPrompt,
          prompt: userPrompt
        });
        return text;
      } catch (fallbackError) {
        console.error('[AI] Fallback model also failed:', fallbackError);
        throw fallbackError;
      }
    }
    throw primaryError;
  }
}

export async function POST(req: Request) {
  try {
    const { birthDateStr, birthTimeStr, lat, lon, mode, persona, payment_hash, messages, follow_up, utcOffset } = await req.json();

    // ===== FOLLOW-UP QUESTIONS (per spec §7) =====
    if (follow_up && messages && messages.length > 0) {
      // Verify payment for follow-up (108 sats)
      const payCheck = await verifyPayment(payment_hash);
      if (!payCheck.ok) return NextResponse.json({ success: false, error: payCheck.error }, { status: payCheck.status });

      if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        const { text } = await generateText({
          model: google('models/gemini-2.5-flash'),
          system: SYSTEM_PROMPT,
          messages: messages,
        });
        return NextResponse.json({ success: true, reading: text });
      }
      return NextResponse.json({ success: false, error: "No API Key" }, { status: 500 });
    }

    // Legacy chat support (will be deprecated)
    if (messages && messages.length > 0) {
      if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        const { text } = await generateText({
          model: google('models/gemini-2.5-flash'),
          messages: messages,
        });
        return NextResponse.json({ success: true, reading: text });
      }
      return NextResponse.json({ success: false, error: "No API Key" }, { status: 500 });
    }
    
    // ===== CORE CALCULATIONS =====
    // Construct birth date as UTC.
    // utcOffset is in minutes (e.g. -420 for UTC+7 Bangkok)
    // If utcOffset is provided, we parse the local time and shift to UTC.
    // Otherwise fall back to server-local parsing (backward compatible).
    let birthDate: Date;
    if (utcOffset !== undefined && utcOffset !== null) {
      const [year, month, day] = birthDateStr.split('-').map(Number);
      const [hour, minute] = birthTimeStr.split(':').map(Number);
      // Date.UTC returns ms for the given UTC components
      // We add the offset to convert local→UTC (offset is negative for east of GMT)
      birthDate = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0) + utcOffset * 60000);
    } else {
      // Legacy fallback — uses server timezone (only correct when server TZ matches birth location)
      birthDate = new Date(`${birthDateStr}T${birthTimeStr}:00.000`);
    }
    const currentDate = new Date();
    
    const { dayOfWeek: astroDay, isRahu } = getAstrologicalDayInfo(birthDate, lat, lon);
    const dasha = calculateMahadasha(birthDate, currentDate, astroDay, isRahu);
    const planets = getPlanetaryPositions(birthDate);
    const transits = getPlanetaryPositions(currentDate);
    const ascendant = getAscendant(birthDate, lat, lon);
    const houseCusps = getHouseCusps(birthDate, lat, lon);
    
    planets.push(ascendant);

    const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const astroDayString = isRahu ? 'พุธกลางคืน (ราหู)' : days[astroDay];

    // ===== MODE: chart (Free, no AI) =====
    if (mode === 'chart') {
      return NextResponse.json({
        success: true,
        astrology: { astroDay, mahadasha: dasha },
        reading: null,
        planets, transits, houseCusps
      });
    }

    // ===== PERSONA (per spec §1) =====
    let personaTone = "คุณคือ 'เภกกี้' (Pekky) เณรน้อยดิจิทัลลูกศิษย์ท่านพิเภก ผู้เชี่ยวชาญด้านโหราศาสตร์ที่เฉลียวฉลาด อารมณ์ดี มีเมตตา สื่อสารด้วยภาษาที่อบอุ่นแต่มีความขลัง มั่นใจ และตรงไปตรงมา เรียกผู้ใช้ว่า 'คุณ' เสมอ";
    if (persona === 'cdc') {
      personaTone = "คุณคือ 'เภกกี้' (Pekky) กุมารทองดิจิทัลผู้ช่วยลุงโฉลก ให้คำแนะนำด้านการเงินและความมั่งคั่งอย่างเด็กที่รู้ลึกรู้จริง มั่นคงในวิถีชาวพุทธ เรียกผู้ใช้ว่า 'คุณ' เสมอ";
    } else if (persona === 'seiya') {
      personaTone = "คุณคือ 'เภกกี้' (Pekky) เด็กน้อยผู้ครอบครองมหาคอสโม่แห่งจักรราศี ใช้ภาษาสไตล์เซนต์เซย่า พูดถึงพลังจักรราศีกับโชคชะตา เรียกผู้ใช้ว่า 'คุณ' เสมอ";
    } else if (persona === 'jojo') {
      personaTone = "คุณคือ 'เภกกี้' (Pekky) เด็กแสบผู้ใช้สแตนด์และอ่านชะตาผ่านไพ่ทาโรต์สไตล์ JoJo ใช้คำพูดที่มีเอกลักษณ์ พูดถึงการยืนหยัดต่อสู้กับโชคชะตา เรียกผู้ใช้ว่า 'คุณ' เสมอ";
    }

    // Determine current time of day for greeting
    const hour = currentDate.getHours();
    const greeting = hour < 12 ? 'เช้า' : hour < 17 ? 'บ่าย' : 'เย็น';

    // ===== MODE INSTRUCTIONS (per spec §4-9) =====
    let modeInstructions = '';
    let requiresPayment = false;
    let useSmartChunks = false;

    switch (mode) {

      // ===== DAILY (Free, ~500 words, per spec §4) =====
      case 'daily':
        modeInstructions = `
=== คำสั่ง Mode: สรุปรายวัน (Daily Summary) ===

1. **สวัสดีตอน${greeting} (Greeting):** ทักทายคุณสั้นกระชับ 1 บรรทัด พร้อมบอกวันนี้ดาวอะไรเด่น

2. **เข็มทิศวันนี้ (Today's Focus):** วิเคราะห์เฉพาะ Transit Aspects ที่ active วันนี้
   - ดาวจรตัวไหนทำมุมอะไรกับดาวเดิม?
   - ส่งผลกระทบอะไรเป็นพิเศษ?
   - ห้ามอธิบายพื้นฐานดวงยาว ให้อ้างอิงสั้นๆ

3. **คำแนะนำวันนี้ (Actionable Advice):** จบด้วย 1 ย่อหน้าที่ให้ action ทำได้จริง
   เช่น "วันนี้ให้โฟกัสเรื่อง X, ระวังเรื่อง Y, และหลีกเลี่ยงการ Z"

=== ข้อจำกัด ===
- ความยาวทั้งหมดไม่เกิน 500 คำ
- ห้ามอธิบาย Mahadasha / พื้นดวงเกิน 2 บรรทัด
- ห้ามให้คำแนะนำทางการแพทย์หรือการลงทุนเจาะจง
        `;
        break;

      // ===== DETAILED (Paid ~318 sats, per spec §5) =====
      case 'detailed':
        requiresPayment = true;
        modeInstructions = `
=== คำสั่ง Mode: วิเคราะห์ภาพรวมชีวิต (Detailed Life Reading) ===

1. **แผนที่ตัวตน (Core Identity Map):**
   - ลัคนาราศีอะไร? หมายความว่าอะไร?
   - ดาวเกษตร/อุจ/นิจ/ประ ตัวไหนบ้าง? ส่งผลต่อชีวิตอย่างไร?
   - Navamsa: ดาวไหนเนื้อในดี ดาวไหนเนื้อในอ่อน?

2. **การวิเคราะห์ 3 เสาหลัก (The 3 Pillars):**
   - 🏦 การงาน & การเงิน: ดาวตัวไหนครองภพไหน? แนวโน้ม?
   - 💕 ความรัก & ความสัมพันธ์: ดาวคู่ครองอยู่ภพไหน? สถานะ?
   - 🧘 สุขภาพ & พลังชีวิต: ดาวลัคนามีพลังแค่ไหน?

3. **ดาวเสวยอายุ & แนวโน้มปัจจุบัน (Mahadasha Analysis):**
   - ดาวเสวยอายุปัจจุบันคือ ดาว${dasha.currentRuler.thName} เสวยมาแล้ว ${dasha.mahadasaYear} ปี
   - ผลกระทบของมัน? สิ่งที่ต้องระวัง?

4. **กลยุทธ์รับมือ (Strategic Remedies):**
   - วิธีเสริมดวงจากดาวที่อ่อนแอ
   - เตรียมตัวสำหรับดาวเสวยอายุตัวต่อไป (ดาว${dasha.nextRuler.thName})

5. **เข็มทิศชีวิต (Your Life's Anchor):**
   - จบด้วย Actionable Human Prompt ที่ทรงพลัง

=== Checklist ===
ก่อนส่ง output ตรวจว่าได้กล่าวถึง: ลัคนา, ดาวเกษตร/อุจ (ถ้ามี), ดาวนิจ/ประ (ถ้ามี), Yoga พิเศษ (ถ้ามี), Mahadasha ปัจจุบัน+ถัดไป, คำแนะนำเชิงปฏิบัติ
        `;
        break;

      // ===== BLUEPRINT (Paid ~3,176 sats, per spec §6) =====
      case 'blueprint':
        requiresPayment = true;
        useSmartChunks = true;
        // modeInstructions handled by smart chunking below
        break;

      // ===== FOCUS: FINANCE (Paid ~1,080 sats, per spec §8a) =====
      case 'focus_finance':
        requiresPayment = true;
        modeInstructions = `
=== คำสั่ง Mode: เจาะลึกการเงินและการลงทุน ===

วิเคราะห์เฉพาะดาวและภพที่เกี่ยวกับการเงิน:

1. **ดาวการเงินพื้นดวง:**
   - ดาวพฤหัสบดี (ความมั่งคั่ง) อยู่ภพไหน? Dignity?
   - ดาวศุกร์ (ทรัพย์สิน, luxury) อยู่ภพไหน?
   - ดาวเจ้าภพ 2 (รายได้), 10 (อาชีพ), 11 (กำไร) คือดาวอะไร? สถานะ?

2. **จังหวะการเงินปัจจุบัน (Mahadasha Impact):**
   - ดาวเสวยอายุ (ดาว${dasha.currentRuler.thName}) ส่งผลต่อเงินอย่างไร?
   - Navamsa ของดาวการเงินบอกอะไร?

3. **ดาวจร Transit ที่กระทบการเงิน:**
   - ดาวจรตัวใดทำมุมกับดาวการเงิน?
   - ช่วงเวลาที่ควรระวัง vs โอกาสที่ดี

4. **กลยุทธ์ทางการเงิน:**
   - จุดแข็งทางการเงินของคุณ
   - ความเสี่ยงที่ต้องระวัง
   - ช่วงเวลาที่เหมาะสมสำหรับการเริ่มต้นใหม่

=== ข้อจำกัดความปลอดภัย ===
- ห้ามแนะนำสินทรัพย์เฉพาะเจาะจง (เช่น "ซื้อหุ้น X")
- ห้ามบอกว่า "จะรวย" หรือ "จะจน" อย่างเด็ดขาด
- ใช้ภาษาว่า "แนวโน้ม" "โอกาส" "ควรระวัง" เท่านั้น
- ปิดท้ายด้วย disclaimer: "คำวิเคราะห์นี้เป็นมุมมองทางโหราศาสตร์ ไม่ใช่คำแนะนำทางการเงิน ควรปรึกษาผู้เชี่ยวชาญด้านการเงินก่อนตัดสินใจ"
        `;
        break;

      // ===== FOCUS: CAREER (Paid ~1,080 sats, per spec §8b) =====
      case 'focus_career':
        requiresPayment = true;
        modeInstructions = `
=== คำสั่ง Mode: เจาะลึกการงานและอาชีพ ===

1. **DNA อาชีพของคุณ:**
   - ลัคนา + ดาวเจ้าภพ 10 (อาชีพ) → งานแบบไหนเหมาะ?
   - ดาวเจ้าภพ 6 (การทำงาน) → สไตล์การทำงาน?
   - ดาวเจ้าภพ 7 (หุ้นส่วน) → ทำธุรกิจร่วมกับคนอื่นดีหรือไม่?

2. **อุปสรรค & โอกาส:**
   - ดาวที่เป็น Malefic ในภพการงาน
   - ดาวที่เป็น Benefic ในภพการงาน
   - Yogas ที่เกี่ยวกับอำนาจ/ความสำเร็จ

3. **แนวโน้มปัจจุบัน:** ดาวเสวยอายุ (ดาว${dasha.currentRuler.thName}) ส่งผลกับอาชีพอย่างไร?

4. **แผนปฏิบัติ:** ช่วงเวลาเหมาะสมสำหรับการเปลี่ยนงาน / เริ่มธุรกิจ / เจรจา

5. **เข็มทิศอาชีพ (Career Anchor):** จบด้วย Actionable Prompt ด้านอาชีพ
        `;
        break;

      // ===== FOCUS: RELATIONSHIP (Paid ~1,080 sats, per spec §8c) =====
      case 'focus_relationship':
        requiresPayment = true;
        modeInstructions = `
=== คำสั่ง Mode: เจาะลึกความสัมพันธ์และครอบครัว ===

1. **แผนที่ความรักของคุณ:**
   - ดาวศุกร์ (ความรัก) อยู่ภพไหน? Dignity? Navamsa?
   - ดาวเจ้าภพ 7 (คู่ครอง) → ลักษณะคู่ครองที่เหมาะ?
   - ดาวเจ้าภพ 5 (โรแมนซ์) → สไตล์ความรัก?

2. **ครอบครัว:**
   - ภพ 4 (บ้าน/แม่) → สถานการณ์ครอบครัว?
   - ภพ 5 (ลูก) → แนวโน้มเรื่องบุตร?
   - ภพ 9 (พ่อ/โชคลาภ) → ความสัมพันธ์กับพ่อ?

3. **จังหวะความรักปัจจุบัน:**
   - ดาวเสวยอายุ (ดาว${dasha.currentRuler.thName}) กระทบภพความรักหรือไม่?
   - Transit ที่ส่งผลต่อความสัมพันธ์

4. **คำแนะนำ:** จุดที่ต้องปรับปรุง, ช่วงเวลาที่เหมาะสำหรับการเริ่มต้น

5. **เข็มทิศความรัก (Relationship Anchor):** จบด้วย Actionable Prompt
        `;
        break;

      // ===== BITCOIN SYNASTRY (Paid ~1,620 sats, per spec §9) =====
      case 'bitcoin_synastry':
        requiresPayment = true;
        modeInstructions = `
=== คำสั่ง Mode: ซินแอสทรีกับบิตคอยน์ ===

คุณกำลังวิเคราะห์ความสัมพันธ์ระหว่างดวงของคุณกับดวงบิตคอยน์
(Bitcoin เกิดวัน Genesis Block: 3 มกราคม 2009 เวลา 18:15 UTC ณ กรุงลอนดอน)

=== ข้อมูลดวงบิตคอยน์ ===
${BITCOIN_NATAL.planets.map(p => `- ${p.name}: ${p.zodiac} ${p.degree.toFixed(2)}° (lng: ${p.longitude}°)`).join('\n')}
- ASC: Leo 8°53' (lng: ${BITCOIN_NATAL.ascendant}°)
- MC: Aries 18°35' (lng: ${BITCOIN_NATAL.mc}°)

=== โครงสร้างคำทำนาย ===

1. **ดวงบิตคอยน์:** อธิบายสั้นๆ ว่า Bitcoin มีลักษณะดวงอย่างไร
   (Sun Cap, Moon Aries, ASC Leo — ดวงของนักต่อสู้ผู้ไม่ยอมแพ้)

2. **จุดเชื่อม (Synastry Aspects):** 
   หามุมดาวระหว่างดาวของคุณกับดาวของ Bitcoin:
   - ดาวของคุณตัวไหน Conjunct / Trine / Square กับดาว Bitcoin?
   - สิ่งนี้บอกอะไรเกี่ยวกับ "ความสัมพันธ์" ของคุณกับ Bitcoin?

3. **ความเหมาะสม (Compatibility Index):**
   - ระดับ "ความเข้ากัน" (ไม่ใช่คำแนะนำการลงทุน)
   - จุดที่เสริมกัน vs จุดที่ขัดแย้ง

4. **จังหวะ Bitcoin ในดวงของคุณ:**
   - Transit ของ Bitcoin กระทบดวงคุณอย่างไร?

=== Disclaimer ===
ปิดท้ายด้วย: "การวิเคราะห์นี้เป็นมุมมองทางโหราศาสตร์เชิงสร้างสรรค์ ไม่ใช่คำแนะนำการลงทุน ราคา Bitcoin ขึ้นอยู่กับปัจจัยตลาดเป็นหลัก"
        `;
        break;

      default:
        // Fallback to daily
        modeInstructions = `ให้สรุปภาพรวมดวงประจำวันสั้น ๆ ไม่เกิน 500 คำ จบด้วยคำแนะนำ 1 ย่อหน้า`;
        break;
    }

    // ===== PAYMENT VERIFICATION =====
    if (requiresPayment) {
      const payCheck = await verifyPayment(payment_hash);
      if (!payCheck.ok) {
        return NextResponse.json({ success: false, error: payCheck.error }, { status: payCheck.status });
      }
    }

    // ===== SMART CHUNKING FOR BLUEPRINT — 4 chunks per spec §6 =====
    if (useSmartChunks && mode === 'blueprint') {
      // Prepare future transit data (monthly: 1-12 months)
      const futureData = [
        getFuturePositions(currentDate, 1),
        getFuturePositions(currentDate, 2),
        getFuturePositions(currentDate, 3),
        getFuturePositions(currentDate, 4),
        getFuturePositions(currentDate, 5),
        getFuturePositions(currentDate, 6),
        getFuturePositions(currentDate, 7),
        getFuturePositions(currentDate, 8),
        getFuturePositions(currentDate, 9),
        getFuturePositions(currentDate, 10),
        getFuturePositions(currentDate, 11),
        getFuturePositions(currentDate, 12)
      ];

      const astroContext: AstroContextData = {
        natalPlanets: planets,
        transitPlanets: transits,
        mahadasha: dasha,
        astroDayString: astroDayString,
        futureTransits: futureData.slice(0, 6) // Chunk 2a gets months 1-6
      };

      const basePrompt = compileAstroPrompt(astroContext, personaTone, '');

      // --- Chunk 1: Foundation ---
      const chunk1Instructions = `
=== Chunk 1: แผนที่พื้นดวงและภาพปัจจุบัน ===

1. **สรุปผู้บริหาร (Executive Summary):** ภาพรวมชีวิต 1 ย่อหน้า
2. **การวิเคราะห์เชิงลึก 4 มิติ:**
   - มิติ 1: ธุรกิจและการเงิน (ภพ 2, 10, 11)
   - มิติ 2: ความสัมพันธ์และพันธมิตร (ภพ 7, 5, 11)
   - มิติ 3: สุขภาพและพลังชีวิต (ภพ 1, 6, 8)
   - มิติ 4: จิตใจและจิตวิญญาณ (ภพ 9, 12)

ความยาว: ประมาณ 800-1000 คำ ใช้ Markdown Header (##, ###) จัดหน้าอย่างสวยงาม
      `;
      const chunk1Result = await generateWithFallback(SYSTEM_PROMPT, basePrompt + '\n' + chunk1Instructions);

      // --- Chunk 2a: Months 1-6 ---
      const chunk2aInstructions = `
=== Chunk 2a: ไทม์ไลน์เดือนที่ 1-6 ===

สำหรับแต่ละเดือน (เดือนที่ 1 ถึง 6) ให้วิเคราะห์:
1. ดาวจรตัวสำคัญย้ายราศีอะไร?
2. ทำมุมอะไรกับดาวเดิม?
3. ผลกระทบเฉพาะเดือนนี้ (ไม่ใช่ข้อความทั่วไป)
4. คำแนะนำสั้น 1 บรรทัด

[สรุปพื้นดวงจาก Chunk 1:]
${chunk1Result.substring(0, 500)}...

ความยาว: 3-5 ย่อหน้าต่อเดือน ใช้ Markdown Header จัดหน้า
      `;
      const chunk2aResult = await generateWithFallback(SYSTEM_PROMPT, basePrompt + '\n' + chunk2aInstructions);

      // --- Chunk 2b: Months 7-12 ---
      const contextH2 = compileAstroPrompt({
        ...astroContext,
        futureTransits: futureData.slice(6, 12) // Months 7-12
      }, personaTone, '');

      const chunk2bInstructions = `
=== Chunk 2b: ไทม์ไลน์เดือนที่ 7-12 ===

สำหรับแต่ละเดือน (เดือนที่ 7 ถึง 12) ให้วิเคราะห์:
1. ดาวจรตัวสำคัญย้ายราศีอะไร?
2. ทำมุมอะไรกับดาวเดิม?
3. ผลกระทบเฉพาะเดือนนี้ (ไม่ใช่ข้อความทั่วไป)
4. คำแนะนำสั้น 1 บรรทัด

[สรุปพื้นดวงจาก Chunk 1:]
${chunk1Result.substring(0, 500)}...

ความยาว: 3-5 ย่อหน้าต่อเดือน ใช้ Markdown Header จัดหน้า
      `;
      const chunk2bResult = await generateWithFallback(SYSTEM_PROMPT, contextH2 + '\n' + chunk2bInstructions);

      // --- Chunk 3: Strategy & Anchor ---
      const chunk3Instructions = `
=== Chunk 3: กลยุทธ์ตั้งรับและบุกรุก ===

1. **รับมือดาวเสวยอายุปัจจุบัน:** แผนสำหรับดาว${dasha.currentRuler.thName}
2. **เตรียมตัวสำหรับดาวเสวยอายุตัวถัดไป:** ดาว${dasha.nextRuler.thName} จะส่งผลอย่างไร
3. **เข็มทิศชีวิต (Anchor):** 1 ย่อหน้าที่ให้ภารกิจชีวิต — ต้องเป็น Actionable Human Prompt ที่ทรงพลัง

[สรุปพื้นดวง:]
${chunk1Result.substring(0, 300)}...

[สรุปครึ่งปีแรก:]
${chunk2aResult.substring(0, 300)}...

[สรุปครึ่งปีหลัง:]
${chunk2bResult.substring(0, 300)}...
      `;
      const chunk3Result = await generateWithFallback(SYSTEM_PROMPT, basePrompt + '\n' + chunk3Instructions);

      // Combine all 4 chunks
      const fullReading = [chunk1Result, chunk2aResult, chunk2bResult, chunk3Result].join('\n\n---\n\n');

      return NextResponse.json({
        success: true,
        astrology: { astroDay, mahadasha: dasha, prompt: '[Smart Chunked Blueprint — 4 chunks]' },
        reading: fullReading,
        planets, transits, houseCusps
      });
    }

    // ===== SMART CHUNKING FOR FOCUS MODES — 2 chunks per spec §10 =====
    if (mode.startsWith('focus_')) {
      const astroContext: AstroContextData = {
        natalPlanets: planets,
        transitPlanets: transits,
        mahadasha: dasha,
        astroDayString: astroDayString,
        futureTransits: null
      };

      const basePrompt = compileAstroPrompt(astroContext, personaTone, '');

      // --- Chunk 1: Natal Analysis (focus-specific) ---
      const focusChunk1 = `
${modeInstructions}

=== คำสั่ง Chunk 1: วิเคราะห์พื้นดวงเฉพาะด้าน ===
วิเคราะห์เฉพาะข้อ 1-2 ของ Mode Instructions ด้านบน (พื้นดวง + ดาวเสวยอายุ)
ยังไม่ต้องวิเคราะห์ Transit หรือให้คำแนะนำ — จะทำใน Chunk ถัดไป

ความยาว: 800-1000 คำ ใช้ Markdown Header จัดหน้า
      `;
      const focusResult1 = await generateWithFallback(SYSTEM_PROMPT, basePrompt + '\n' + focusChunk1);

      // --- Chunk 2: Transit + Advice ---
      const focusChunk2 = `
${modeInstructions}

=== คำสั่ง Chunk 2: ดาวจร + คำแนะนำ ===

[สรุปพื้นดวงจาก Chunk 1:]
${focusResult1.substring(0, 500)}...

วิเคราะห์ข้อ 3-4 ของ Mode Instructions:
- ดาวจร Transit ที่กระทบด้านนี้โดยเฉพาะ
- กลยุทธ์และคำแนะนำเชิงปฏิบัติ
- จบด้วย Actionable Prompt

ความยาว: 800-1000 คำ ใช้ Markdown Header จัดหน้า
      `;
      const focusResult2 = await generateWithFallback(SYSTEM_PROMPT, basePrompt + '\n' + focusChunk2);

      const fullReading = [focusResult1, focusResult2].join('\n\n---\n\n');

      return NextResponse.json({
        success: true,
        astrology: { astroDay, mahadasha: dasha, prompt: `[Smart Chunked Focus — ${mode}]` },
        reading: fullReading,
        planets, transits, houseCusps
      });
    }

    // ===== STANDARD SINGLE-PROMPT GENERATION =====
    let futureData = null;
    const astroContext: AstroContextData = {
      natalPlanets: planets,
      transitPlanets: transits,
      mahadasha: dasha,
      astroDayString: astroDayString,
      futureTransits: futureData
    };

    const prompt = compileAstroPrompt(astroContext, personaTone, modeInstructions);

    let reading = "AI Reading disabled: GOOGLE_GENERATIVE_AI_API_KEY is not configured in environment variables.";
    if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      try {
        reading = await generateWithFallback(SYSTEM_PROMPT, prompt);
      } catch (aiError: any) {
        console.error('[AI] All models failed:', aiError?.message);
        reading = "⚠️ ขออภัยครับ ระบบ AI กำลังมีภาระงานสูง กรุณาลองใหม่อีกครั้งในอีกสักครู่";
      }
    }

    return NextResponse.json({
      success: true,
      astrology: { astroDay, mahadasha: dasha, prompt },
      reading,
      planets, transits, houseCusps
    });

  } catch (error: any) {
    console.error("Astrology API Error:", error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to process chart' }, { status: 500 });
  }
}
