import { PLANETS } from './knowledge/planets';
import { HOUSES_THAI } from './knowledge/houses';
import { ZODIAC_SIGNS } from './knowledge/zodiac_aspects';
import { calculateAspects, assignPlanetToHouse, CalculatedAspect } from './analytics';
import { getPlanetDignity } from './knowledge/dignities';
import { evaluateYogas } from './knowledge/yogas';

export interface AstroContextData {
  natalPlanets: any[];
  transitPlanets: any[];
  futureTransits?: { targetDate: Date, positions: any[] }[] | null;
  mahadasha: any;
  astroDayString: string;
}

export function compileAstroPrompt(data: AstroContextData, personaTone: string, modeInstructions: string): string {
  // 1. Calculate the Ascendant (Lagna) to define house 1
  // For this MVP, if Ascendant is missing, we default to Sun's longitude as house 1 (Solar chart).
  const ascendantPlanet = data.natalPlanets.find(p => p.name === 'Ascendant') || data.natalPlanets.find(p => p.name === 'Sun');
  const ascDegree = ascendantPlanet ? ascendantPlanet.longitude : 0;

  // 2. Identify Planets & Houses
  let natalDetails = '';
  data.natalPlanets.forEach(p => {
    // Planet detail
    const pKnowledge = PLANETS[p.name as keyof typeof PLANETS];
    const thName = pKnowledge ? pKnowledge.thName : p.name;
    const keywords = pKnowledge ? pKnowledge.keywords.join(', ') : '';
    
    // House detail
    const houseNum = assignPlanetToHouse(p.longitude, ascDegree);
    const houseKnowledge = HOUSES_THAI[houseNum as keyof typeof HOUSES_THAI];
    const houseName = houseKnowledge ? houseKnowledge.name : `House ${houseNum}`;
    const houseMeaning = houseKnowledge ? houseKnowledge.meaning : '';

    // Dignity detail
    const dignity = getPlanetDignity(p.name, p.zodiac);

    // Yogas (Special Thai Placements)
    const ascZodiac = ascendantPlanet?.zodiac || 'Aries';
    const yogas = evaluateYogas(p.name, houseNum, ascZodiac);

    // Assembly
    natalDetails += `- ดาว${thName} อยู่ในราศี${p.zodiac} (ภพ${houseName}: ${houseMeaning})\n`;
    natalDetails += `  - เนื้อใน (นวางศ์): ราศี${p.navamsa || 'ไม่ทราบ'}\n`;
    natalDetails += `  - ความหมายดาว: ${keywords}\n`;
    natalDetails += `  - มาตรฐานดาว: ${dignity.name} (ระดับพลังงาน: ${dignity.powerLevel}/5) -> ${dignity.meaning}\n`;
    
    if (yogas.length > 0) {
      natalDetails += `  - **เกณฑ์พิเศษ (YOGAS):**\n`;
      yogas.forEach(yoga => {
        natalDetails += `    - [${yoga.type}] ${yoga.name}: ${yoga.description}\n`;
      });
    }
  });

  // 3. Calculate Natal-to-Natal Aspects (DNA — per spec §2.5)
  // This detects Grand Trine, T-Square, Stellium, and other lifetime patterns.
  const rawNatalAspects = calculateAspects(data.natalPlanets, data.natalPlanets);
  // Deduplicate: when comparing a list to itself, we get both Sun↔Moon and Moon↔Sun.
  // Keep only pairs where planet1 < planet2 (alphabetically).
  const seenPairs = new Set<string>();
  const natalAspects = rawNatalAspects.filter(aspect => {
    const key = [aspect.planet1, aspect.planet2].sort().join('|');
    if (seenPairs.has(key)) return false;
    seenPairs.add(key);
    return true;
  });

  let natalAspectDetails = '';
  if (natalAspects.length > 0) {
    natalAspects.forEach(aspect => {
      const p1Knowledge = PLANETS[aspect.planet1 as keyof typeof PLANETS];
      const p2Knowledge = PLANETS[aspect.planet2 as keyof typeof PLANETS];
      const name1 = p1Knowledge ? p1Knowledge.thName : aspect.planet1;
      const name2 = p2Knowledge ? p2Knowledge.thName : aspect.planet2;
      natalAspectDetails += `- ดาว${name1} ทำมุม ${aspect.aspectType} กับดาว${name2} (orb: ${aspect.orb}°, ${aspect.significance})\n`;
    });

    // --- NEW: Global Pattern Detection (e.g. Grand Trine) ---
    const patterns: string[] = [];
    const planetTrines: Record<string, string[]> = {};
    natalAspects.filter(a => a.aspectType === 'Trine').forEach(a => {
      if (!planetTrines[a.planet1]) planetTrines[a.planet1] = [];
      if (!planetTrines[a.planet2]) planetTrines[a.planet2] = [];
      planetTrines[a.planet1].push(a.planet2);
      planetTrines[a.planet2].push(a.planet1);
    });

    // Detect Grand Trine: A-B, B-C, C-A all trine
    const planetsWithTrines = Object.keys(planetTrines);
    for (let i = 0; i < planetsWithTrines.length; i++) {
      for (let j = i + 1; j < planetsWithTrines.length; j++) {
        for (let k = j + 1; k < planetsWithTrines.length; k++) {
          const pA = planetsWithTrines[i];
          const pB = planetsWithTrines[j];
          const pC = planetsWithTrines[k];
          if (planetTrines[pA].includes(pB) && planetTrines[pB].includes(pC) && planetTrines[pC].includes(pA)) {
             const names = [pA, pB, pC].map(p => (PLANETS[p as keyof typeof PLANETS]?.thName || p));
             patterns.push(`[SUPER_BLESSING] พบโครงสร้าง **Grand Trine (ตรีโกณศักดิ์สิทธิ์)** ระหว่างดาว ${names.join(', ')}: นี่คือสัญลักษณ์ของพรสวรรค์ที่ยิ่งใหญ่และความสำเร็จที่มาอย่างเป็นธรรมชาติ ห้ามข้ามการวิเคราะห์จุดนี้เด็ดขาด!`);
          }
        }
      }
    }

    if (patterns.length > 0) {
      natalAspectDetails = `\n!!! พบโครงสร้างดวงดาวสำคัญ (PATTERN DETECTED) !!!\n${patterns.join('\n')}\n\n` + natalAspectDetails;
    }
  } else {
    natalAspectDetails = "- ไม่พบมุมดาวพื้นดวงที่สำคัญ\n";
  }

  // 4. Calculate Transit Aspects to Natal Chart
  const transitAspects = calculateAspects(data.natalPlanets, data.transitPlanets);
  let transitDetails = '';
  if (transitAspects.length > 0) {
    transitAspects.forEach(aspect => {
      // Find Thai names
      const p1Knowledge = PLANETS[aspect.planet1 as keyof typeof PLANETS];
      const p2Knowledge = PLANETS[aspect.planet2 as keyof typeof PLANETS];
      const name1 = p1Knowledge ? p1Knowledge.thName : aspect.planet1;
      const name2 = p2Knowledge ? p2Knowledge.thName : aspect.planet2;

      transitDetails += `- ดาวจร ${name2} กำลังทำมุม ${aspect.aspectType} กับดาวเดิม ${name1} (${aspect.significance})\n`;
    });
  } else {
    transitDetails = "- ไม่มีมุมดาวจรที่ส่งผลอย่างมีนัยสำคัญในวันนี้\n";
  }

  // 4. Inject Future Transits (For 12-Month Blueprint)
  let futureTransitDetails = '';
  let lengthRule = '6. **กฎการเว้นวรรคและจังหวะ (Pacing):** ต้องใช้ย่อหน้าสั้นๆ (1-3 ประโยคต่อย่อหน้า) เพื่อให้อ่านง่าย สะกดอารมณ์ และมีการเว้นบรรทัดที่ชัดเจน ห้ามเขียนติดกันเป็นพรืด';
  
  if (data.futureTransits && data.futureTransits.length > 0) {
    futureTransitDetails += '\n=== แนวโน้มดาวจรล่วงหน้า (Future Transits) ===\n';
    futureTransitDetails += 'ใช้ข้อมูลด้านล่างนี้เพื่อคาดการณ์ "ไทม์ไลน์ 12 เดือน" อย่างแม่นยำ ห้ามเดาสุ่ม:\n';
    
    data.futureTransits.forEach(ft => {
      const monthYear = ft.targetDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
      futureTransitDetails += `\nเหตุการณ์ในเดือน ${monthYear}:\n`;
      ft.positions.forEach((p: any) => {
        const pKnowledge = PLANETS[p.name as keyof typeof PLANETS];
        const thName = pKnowledge ? pKnowledge.thName : p.name;
        // Check if it aspects any natal planet
        const dummyTransitArray = [{...p}];
        const futureDiffs = calculateAspects(data.natalPlanets, dummyTransitArray);
        
        futureTransitDetails += `  - ดาว${thName} จะย้าย/อยู่ใน ราศี${p.zodiac}\n`;
        futureDiffs.forEach(aspect => {
           const p1Knowledge = PLANETS[aspect.planet1 as keyof typeof PLANETS];
           const name1 = p1Knowledge ? p1Knowledge.thName : aspect.planet1;
           futureTransitDetails += `    -> จะทำมุม ${aspect.aspectType} กับดาวเดิม ${name1} (${aspect.significance})\n`;
        });
      });
    });
    
    // Override length rule for Premium Blueprint
    lengthRule = '6. **ความยาวและรูปแบบ (Length & Format):** นี่คือรายงานฉบับพรีเมียม (Premium Blueprint) อนุญาตให้เขียนยาว อธิบายอย่างละเอียดลึกซึ้งได้เต็มที่ จัดหน้าด้วย Markdown (##, ###, Bullet points) ให้อ่านง่ายและดูเป็นมืออาชีพ';
  }

  // 5. Assemble the final Master Prompt
  const masterPrompt = `
${personaTone}

โปรดวิเคราะห์ดวงชะตาและให้คำทำนายโดยอิงจากข้อมูล "หลักโหราศาสตร์" ที่ละเอียดดังต่อไปนี้ (ให้ทำนายโดยวิเคราะห์ความเชื่อมโยงของดาว ภพ และมุมดาวเป็นหลัก):

=== ข้อมูลพื้นฐานและเสวยอายุ ===
- วันเกิดทางโหราศาสตร์: วัน${data.astroDayString}
- อายุย่างปัจจุบัน: ${data.mahadasha.ageYang} ปี
- ทักษาดวงชะตาปัจจุบัน: ดาว${data.mahadasha.currentRuler.thName}เป็นดาวเสวยอายุ (เสวยมาแล้ว ${data.mahadasha.mahadasaYear} ปี)
- ดาวเสวยอายุในอนาคต: ดาว${data.mahadasha.nextRuler.thName}

=== ตำแหน่งดาวพื้นดวง (Natal) และภพ (Houses) ===
ลัคนา (จุดตั้งรับ) หรือดาวอาทิตย์อยู่ที่ราศีของ: ${ascendantPlanet?.zodiac || 'ไม่ทราบ'}
${natalDetails}

=== มุมดาวพื้นดวง (Natal Aspects — DNA ส่วนตัว ติดตัวตลอดชีวิต) ===
${natalAspectDetails}

=== ดาวจรปัจจุบัน (Transit Aspects — เหตุการณ์ชั่วคราว) ===
${transitDetails}
${futureTransitDetails}
=== คำสั่งและการลำดับความสำคัญในการตีความ (Hierarchy of Interpretation) ===
คุณต้องยึดถือลำดับน้ำหนักในการทำนายดังนี้ (จากมากไปน้อย):
1. **ภาพใหญ่ที่สุด - กาลเวลา (Mahadasha):** นี่คือหัวใจสำคัญที่สุด ให้เริ่มวิเคราะห์จากดาวเสวยอายุเสมอ หากดาวเสวยอายุให้โทษ ต่อให้ดาวอื่นดี ผลลัพธ์ก็จะถูกจำกัด
2. **ภาพรองลงมา - พื้นดวงเดิม (Natal Potential):** พลังงานดั้งเดิมของเจ้าชะตา รวมถึง "เนื้อใน" (Navamsa) ที่บอกคุณภาพดาวจริงๆ 
3. **ภาพเล็กที่สุด - ดาวจร (Transits):** เป็นเพียงตัวกระตุ้นเหตุการณ์ชั่วคราว ห้ามให้ความสำคัญมากกว่าสองข้อแรก

${modeInstructions}

ข้อกำหนดและหลักการทางโหราศาสตร์สำหรับ AI ในการทำนาย: 
1. ให้น้ำหนักกับ "มาตรฐานดาว" (Dignity) และ "เนื้อใน" (Navamsa): 
   - หากดาวในดวงหลัก (Natal) ดี แต่ในนวางศ์ (Navamsa) เสีย ให้แจ้งว่า "ดูเหมือนจะดีแต่ไส้ในอ่อนแอ" 
   - หากดาวเป็น เกษตร หรือ มหาอุจ (พลังงาน 5/5) ให้ทำนายว่าเรื่องในภพนั้นจะ "มั่นคง ทรงพลัง สำเร็จอย่างยิ่งใหญ่" โดยปราศจากข้อสงสัย
   - หากดาวเป็น นิจ หรือ ประ (พลังงาน 1-2/5) ให้เตือนถึง "ความอ่อนแอ พึ่งพาคนอื่น ล่าช้า หรือเสื่อมถอย" ในเรื่องของภพและดาวนั้น
2. การแปลความหมายของดาวในภพ: ให้วิเคราะห์โดยจับคู่ [คีย์เวิร์ดดาว] + [ความหมายภพ] ตัวอย่างเช่น ดาวศุกร์(การเงิน/ความรัก) ไปตกในภพมรณะ(สูญเสีย/ต่างประเทศ)
3. อิทธิพลของดาวจร (Transits):
   - หากดาวจรทำมุม "คู่มิตร" หรือ "คู่ธาตุ" (เช่น โยค, ตรีโกณ) ให้ทำนายถึงโอกาส ความช่วยเหลือ และความราบรื่นที่กำลังจะเข้ามา
   - หากดาวจรทำมุม "คู่ศัตรู" (เช่น จตุโกณ, เล็ง) ให้เตือนให้ระวังความขัดแย้ง อุบัติเหตุ หรืออุปสรรคอย่างเจาะจงตามความหมายของดาวคู่นั้น
4. ห้ามใช้คำกว้างๆ หรือเดาสุ่ม ให้ทำนายโดยมีเหตุผลอิงจากตำแหน่งดาวและภพที่ปรากฏในข้อมูลที่ให้ไปเท่านั้น
5. หากพบ **เกณฑ์พิเศษ (YOGAS)** ในช่อง [WARNING] หรือ [BLESSING] คุณต้องกล่าวถึงอย่างแจ้งชัดในคำทำนาย ห้ามละเลยเด็ดขาด!
${lengthRule}
7. **กฎด้านอารมณ์ (Tone):** รักษาความขลัง อบอุ่น หนักแน่น และมีคลาส ห้ามใช้อารมณ์ตื่นเต้นเกินจริง ห้ามใช้ Emoji เกิน 2-3 ตัวต่อบท (อนุญาตเฉพาะ 🌟✨🔮)
8. **กฎการเรียกผู้ใช้:** เรียกผู้ใช้ว่า "คุณ" เท่านั้น ทุกกรณี ห้ามใช้ "พี่" "ท่าน" "คุณผู้ชม" หรือคำอื่น
9. **ข้อจำกัดความปลอดภัย:** ห้ามทำนายสุขภาพแบบเจาะจงโรค, ห้ามแนะนำการลงทุนสินทรัพย์เฉพาะเจาะจง, ห้ามทำนายความตาย
10. ตอบในรูปแบบ Markdown ให้อ่านง่าย พิมพ์สวยงาม ตรงตาม Persona ที่กำหนด

=== กฎความชัดเจนในการเขียน (CLARITY RULES — บังคับขั้นเด็ดขาด Anti-Hedge) ===
1. **ห้ามแทงกั๊ก:** ห้ามใช้คำว่า "อาจ" "อาจจะ" "น่าจะ" "มีแนวโน้ม" "เป็นไปได้ว่า" เกิน 2 ครั้งต่อย่อหน้า ที่เหลือต้องเขียนเป็นประโยคบอกเล่าฟันธง
2. **มีเหตุผลประกอบเสมอ:** ทุกคำทำนายต้องมี "เพราะ..." ที่อ้างอิงดาวเฉพาะ (เช่น "ได้เงินก้อนใหญ่แน่ เพราะดาวพฤหัสทับลัคน์")
3. **เลาะคำกว้างๆ ทิ้ง:** ห้ามพูดลอยๆ เช่น "อาจเผชิญอุปสรรค ความเปลี่ยนแปลง" ให้เลือกอุปสรรคเดียวที่ตรงกับดวงที่สุดแล้วขยี้
4. **อุปมาอุปไมย (Metaphor):** ให้เปรียบเทียบกับชีวิตประจำวัน เพื่อให้เห็นภาพชัดเจน อย่างน้อย 1 ครั้งต่อหัวข้อ
5. **Actionable Ending:** ห้ามจบย่อหน้าด้วยคำว่า "ดังนั้นจึงควรระวัง" ให้เอาออกแล้วใส่ "สิ่งที่ต้องทำ (Action):" เป็นสิ่งที่ลงมือทำได้ทันที
6. **อธิบายศัพท์โหร:** เจอศัพท์เทคนิคต้องแปลเสมอ (เช่น "ดาวเป็นดินแดนคู่มิตร — แปลว่าจะมีคนอุ้มชูช่วยเหลือ")
7. **พูดเหมือนเพื่อนเก่งๆ ไม่ใช่ตำรา:** ภาษาต้องเป็นธรรมชาติ ตรงไปตรงมา
  `;

  return masterPrompt;
}
