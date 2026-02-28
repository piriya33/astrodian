export interface PlanetDignity {
  name: string;
  type: 'Kaset' | 'MahaUch' | 'Neech' | 'Pra' | 'Normal';
  meaning: string;
  powerLevel: number; // 1 to 5 (5 is strongest)
}

/**
 * Standard Thai Astrological Dignities (มาตรฐานดาว)
 * Mapped to the planet's host Zodiac sign.
 */
export const THAI_DIGNITIES: Record<string, Record<string, PlanetDignity>> = {
  // Sun (อาทิตย์)
  'Sun': {
    'Leo': { name: 'เกษตร (Kaset)', type: 'Kaset', meaning: 'มั่นคงถาวร เป็นปึกแผ่น ยิ่งใหญ่ในถิ่นของตน', powerLevel: 5 },
    'Aries': { name: 'มหาอุจ (Maha-Uch)', type: 'MahaUch', meaning: 'สูงส่ง โดดเด่น มีอำนาจวาสนามากที่สุด', powerLevel: 5 },
    'Libra': { name: 'นิจ (Neech)', type: 'Neech', meaning: 'ตกต่ำ ด้อยค่า อาภัพ หรือต้องพึ่งพาผู้อื่น', powerLevel: 1 },
    'Aquarius': { name: 'ประ (Pra)', type: 'Pra', meaning: 'ไม่แน่นอน อ่อนแอ หรือเป็นของผู้อื่น', powerLevel: 2 }
  },
  // Moon (จันทร์)
  'Moon': {
    'Cancer': { name: 'เกษตร (Kaset)', type: 'Kaset', meaning: 'ใจดี มีเมตตา อุดมสมบูรณ์ มั่นคงทางอารมณ์', powerLevel: 5 },
    'Taurus': { name: 'มหาอุจ (Maha-Uch)', type: 'MahaUch', meaning: 'มีเสน่ห์ดึงดูดสูงสุด มั่งคั่ง รุ่งเรือง', powerLevel: 5 },
    'Scorpio': { name: 'นิจ (Neech)', type: 'Neech', meaning: 'อารมณ์แปรปรวน วิตกกังวลง่าย ขาดความมั่นคงทางใจ', powerLevel: 1 },
    'Capricorn': { name: 'ประ (Pra)', type: 'Pra', meaning: 'พึ่งพาผู้อื่นเรื่องอารมณ์ หรือขาดความอบอุ่น', powerLevel: 2 }
  },
  // Mars (อังคาร)
  'Mars': {
    'Aries': { name: 'เกษตร (Kaset)', type: 'Kaset', meaning: 'กล้าหาญ ขยันขันแข็ง มั่นคงในการกระทำ', powerLevel: 5 },
    'Scorpio': { name: 'เกษตร (Kaset)', type: 'Kaset', meaning: 'เด็ดขาด มีพลังอำนาจลึกลับ', powerLevel: 5 },
    'Capricorn': { name: 'มหาอุจ (Maha-Uch)', type: 'MahaUch', meaning: 'มีพละกำลังสูงสุด ฟันฝ่าอุปสรรคเก่ง ได้รับการยกย่อง', powerLevel: 5 },
    'Cancer': { name: 'นิจ (Neech)', type: 'Neech', meaning: 'ขี้ขลาด อ่อนแอ พลังงานตก หรือป่วยง่าย', powerLevel: 1 },
    'Libra': { name: 'ประ (Pra)', type: 'Pra', meaning: 'ไม่กล้าตัดสินใจ ขาดความเด็ดขาด', powerLevel: 2 },
    'Taurus': { name: 'ประ (Pra)', type: 'Pra', meaning: 'ทำอะไรเชื่องช้า ขาดความกระตือรือร้น', powerLevel: 2 }
  },
  // Mercury (พุธ)
  'Mercury': {
    'Gemini': { name: 'เกษตร (Kaset)', type: 'Kaset', meaning: 'เจรจาเก่ง สติปัญญาดี มั่นคงในความคิด', powerLevel: 5 },
    'Virgo': { name: 'เกษตร (Kaset)', type: 'Kaset', meaning: 'ฉลาดหลักแหลม มีเหตุผล ละเอียดรอบคอบ', powerLevel: 5 },
    'Virgo_Uch': { name: 'มหาอุจ (Maha-Uch)', type: 'MahaUch', meaning: 'เป็นผู้รอบรู้ ปัญญาเลิศ วาทศิลป์ยอดเยี่ยม', powerLevel: 5 }, // Note: Virgo is both Kaset and Uch for Mercury conceptually, handled by sign usually.
    'Pisces': { name: 'นิจ (Neech)', type: 'Neech', meaning: 'พูดจาผิดพลาดง่าย ความคิดสับสน โดนหลอก', powerLevel: 1 }, // Also serves as Pra
    'Sagittarius': { name: 'ประ (Pra)', type: 'Pra', meaning: 'เจรจาไม่เป็นผล โลเล', powerLevel: 2 }
  },
  // Jupiter (พฤหัสบดี)
  'Jupiter': {
    'Sagittarius': { name: 'เกษตร (Kaset)', type: 'Kaset', meaning: 'มีศีลธรรม ฐานะมั่นคง เป็นที่เคารพนับถือ', powerLevel: 5 },
    'Pisces': { name: 'เกษตร (Kaset)', type: 'Kaset', meaning: 'มีเมตตาสูง ผู้ใหญ่เอ็นดู อุดมสมบูรณ์', powerLevel: 5 },
    'Cancer': { name: 'มหาอุจ (Maha-Uch)', type: 'MahaUch', meaning: 'โชคดีขั้นสุด ยิ่งใหญ่ทางสติปัญญาและคุณธรรม', powerLevel: 5 },
    'Capricorn': { name: 'นิจ (Neech)', type: 'Neech', meaning: 'ขาดผู้ใหญ่คอยอุปถัมภ์ โชคร้าย หรือไร้ศีลธรรม', powerLevel: 1 },
    'Gemini': { name: 'ประ (Pra)', type: 'Pra', meaning: 'ขาดความน่าเชื่อถือ ครูบาอาจารย์ไม่สนับสนุน', powerLevel: 2 },
    'Virgo': { name: 'ประ (Pra)', type: 'Pra', meaning: 'เชื่อพึ่งพาตนเองมากกว่าผู้ใหญ่ ขาดโชค', powerLevel: 2 }
  },
  // Venus (ศุกร์)
  'Venus': {
    'Taurus': { name: 'เกษตร (Kaset)', type: 'Kaset', meaning: 'การเงินมั่นคง มีทรัพย์สิน ความรักยั่งยืน', powerLevel: 5 },
    'Libra': { name: 'เกษตร (Kaset)', type: 'Kaset', meaning: 'มีเสน่ห์ มีความสุนทรีย์ ความรักรุ่งเรือง', powerLevel: 5 },
    'Pisces': { name: 'มหาอุจ (Maha-Uch)', type: 'MahaUch', meaning: 'มีความรักที่สมบูรณ์แบบ ทรัพย์สินมั่งคั่ง', powerLevel: 5 },
    'Virgo': { name: 'นิจ (Neech)', type: 'Neech', meaning: 'อาภัพรัก การเงินฝืดเคือง หรือใช้จ่ายฟุ่มเฟือย', powerLevel: 1 },
    'Scorpio': { name: 'ประ (Pra)', type: 'Pra', meaning: 'ความรักซ่อนเร้น หรือต้องเสียสละเพื่อความรัก', powerLevel: 2 },
    'Aries': { name: 'ประ (Pra)', type: 'Pra', meaning: 'ความรักไม่ยั่งยืน ได้เงินมาก็จ่ายไปเร็ว', powerLevel: 2 }
  },
  // Saturn (เสาร์)
  'Saturn': {
    'Capricorn': { name: 'เกษตร (Kaset)', type: 'Kaset', meaning: 'อดทนสูง มั่นคงในหน้าที่การงาน อสังหาริมทรัพย์ดี', powerLevel: 5 },
    'Aquarius': { name: 'เกษตร (Kaset)', type: 'Kaset', meaning: 'เพื่อนฝูงเยอะ รู้จักพลิกแพลงเอาตัวรอด', powerLevel: 5 },
    'Libra': { name: 'มหาอุจ (Maha-Uch)', type: 'MahaUch', meaning: 'มีอำนาจวาสนาทางการบริหาร ยิ่งใหญ่จากความอดทน', powerLevel: 5 },
    'Aries': { name: 'นิจ (Neech)', type: 'Neech', meaning: 'ท้อแท้ง่าย ขาดความทรหด ตำแหน่งตกต่ำ', powerLevel: 1 },
    'Cancer': { name: 'ประ (Pra)', type: 'Pra', meaning: 'หลักฐานไม่มั่นคง พึ่งพาบริวารไม่ได้', powerLevel: 2 },
    'Leo': { name: 'ประ (Pra)', type: 'Pra', meaning: 'เครียดง่าย ภาระตกอยู่ที่ตัวเอง', powerLevel: 2 }
  },
  // Rahu (ราหู)
  'Rahu (North Node)': {
    'Aquarius': { name: 'เกษตร (Kaset)', type: 'Kaset', meaning: 'มีชั้นเชิง ทันคน โชคลาภจากการเสี่ยง มั่นคง', powerLevel: 5 },
    'Scorpio': { name: 'มหาอุจ (Maha-Uch)', type: 'MahaUch', meaning: 'ผู้มีอิทธิพล ยิ่งใหญ่ในด้านมืด หรือมีลาภลอยก้อนโต', powerLevel: 5 },
    'Taurus': { name: 'นิจ (Neech)', type: 'Neech', meaning: 'สูญเสียเพราะความลุ่มหลง หรือถูกหลอกง่าย', powerLevel: 1 }, // Often debated in Thai astro, using standard approximation
    'Leo': { name: 'ประ (Pra)', type: 'Pra', meaning: 'ทำคุณคนไม่ขึ้น หรือหลงผิดง่าย', powerLevel: 2 }
  }
};

/**
 * Returns the Dignity of a Planet based on the Zodiac sign it is currently in.
 */
export function getPlanetDignity(planetName: string, zodiacSign: string): PlanetDignity {
  const defaultDignity: PlanetDignity = { name: 'มาตรฐานทั่วไป (Normal)', type: 'Normal', meaning: 'ส่งผลตามปกติ ไม่มีกำลังเสริมหรือข้อด้อยพิเศษ', powerLevel: 3 };
  
  if (!THAI_DIGNITIES[planetName]) return defaultDignity;

  const dignity = THAI_DIGNITIES[planetName][zodiacSign];
  return dignity ? dignity : defaultDignity;
}
