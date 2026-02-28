// yogas.ts - Advanced Thai Astrological Yoga Classifications

export interface YogaResult {
  name: string;
  type: 'BLESSING' | 'WARNING' | 'NEUTRAL';
  description: string;
}

export const HOUSE_CLASSIFICATIONS = {
  // Kendra (เรือนเกณฑ์) - Houses of maximum power and action
  KENDRA: [1, 4, 7, 10],
  // Dusthana (ทุสถานภพ) - Houses of suffering, obstacles, or transformation
  DUSTHANA: [6, 8, 12],
  // Trikona (ตรีโกณ) - Houses of fortune and merit
  TRIKONA: [1, 5, 9]
};

// Evaluate Special Yogas (ดวงพิเศษ / ดวงแตก) based on Planet and House
export function evaluateYogas(planetName: string, houseNumber: number, ascendantZodiac: string): YogaResult[] {
  const results: YogaResult[] = [];

  // 1. ทุสถานภพ (Dusthana Placements)
  if (HOUSE_CLASSIFICATIONS.DUSTHANA.includes(houseNumber)) {
    results.push({
      name: 'ตกทุสถานภพ (Dusthana)',
      type: 'WARNING',
      description: `ดาวตกในภพที่ ${houseNumber} (อริ/มรณะ/วินาศ) มักนำมาซึ่งอุปสรรค ความเหน็ดเหนื่อย หรือความสูญเสียในเรื่องความหมายของดาวนั้น`
    });
  }

  // 2. เรือนเกณฑ์ (Kendra Placements)
  if (HOUSE_CLASSIFICATIONS.KENDRA.includes(houseNumber) && houseNumber !== 1) {
    results.push({
      name: 'ได้เกณฑ์ (Kendra)',
      type: 'BLESSING',
      description: `ดาวตกในภพที่ ${houseNumber} เป็นเรือนเกณฑ์ ส่งผลให้ดาวมีพลังงานเข้มแข็ง โดดเด่น และส่งผลต่อชีวิตอย่างเป็นรูปธรรม`
    });
  }

  // 3. พินทุบาทว์ (Broken Destiny / ดวงแตก)
  // This is a simplified mathematical check based on standard Thai rules
  const isBrokenDestiny = 
    (planetName === 'Saturn' && houseNumber === 7) || // เสาร์เล็งลัคน์ (ภพ 7) - ดวงแตกเรื่องคู่
    (planetName === 'Mars' && houseNumber === 8) ||   // อังคารมรณะ - ระวังอุบัติเหตุร้ายแรง
    (planetName === 'Rahu (North Node)' && houseNumber === 2) || // ราหูค้นทรัพย์ (ภพ 2) - เก็บเงินไม่อยู่
    (planetName === 'Sun' && houseNumber === 1 && ascendantZodiac === 'Aries') || // อาทิตย์กุมลัคน์ในเมษ (ร้อนเกินไป)
    (planetName === 'Venus' && houseNumber === 7 && ascendantZodiac === 'Scorpio'); // ศุกร์ในพิจิกภพ 7 (รักรุนแรง/พินทุบาทว์)

  if (isBrokenDestiny) {
    results.push({
      name: 'ดวงพินทุบาทว์ (Broken Destiny)',
      type: 'WARNING',
      description: 'จุดเปราะบางรุนแรงของดวงชะตา (ดวงแตก)! ห้ามประมาทในเรื่องที่ดาวรูปนี้สถิตอยู่ เพราะจะนำความเดือดร้อนมาให้หลีกเลี่ยงไม่ได้'
    });
  }

  // 4. ปทุมเกณฑ์ (Lotus Yoga / ดวงดอกบัว)
  // Auspicious placements that guarantee charm, protection, and success.
  const isLotusYoga = 
    (planetName === 'Jupiter' && [1, 4, 7, 10].includes(houseNumber)) || // พฤหัสบดีเป็นเกณฑ์แก่ลัคนา
    (planetName === 'Venus' && houseNumber === 4) || // ศุกร์เป็นสี่แก่ลัคนา (พันธุ)
    (planetName === 'Moon' && houseNumber === 11);   // จันทร์เป็นสิบเอ็ดแก่ลัคนา (ลาภะ)

  if (isLotusYoga) {
    results.push({
      name: 'ดวงปทุมเกณฑ์ (Lotus Yoga)',
      type: 'BLESSING',
      description: 'ดวงชะตามีเกณฑ์พิเศษ "ปทุมเกณฑ์" ดุจดอกบัวเหนือน้ำ บ่งบอกถึงได้รับความคุ้มครอง เสน่ห์เมตตามหานิยมตกน้ำไม่ไหลตกไฟไม่ไหม้'
    });
  }

  return results;
}
