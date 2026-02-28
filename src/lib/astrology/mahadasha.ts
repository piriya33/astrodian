// Mahadasha (กำลังของดาวตามปีเสวยอายุ) logic
// based on "ตำราพรหมชาติ"

export interface PlanetPeriod {
  name: string;
  thName: string;
  years: number;
}

export const mahadashaSequence: PlanetPeriod[] = [
  { name: 'Sun', thName: 'อาทิตย์', years: 6 },       // 0
  { name: 'Moon', thName: 'จันทร์', years: 15 },      // 1
  { name: 'Mars', thName: 'อังคาร', years: 8 },       // 2
  { name: 'Mercury', thName: 'พุธ', years: 17 },      // 3
  { name: 'Saturn', thName: 'เสาร์', years: 10 },      // 4
  { name: 'Jupiter', thName: 'พฤหัสบดี', years: 19 },    // 5
  { name: 'Rahu', thName: 'ราหู', years: 12 },       // 6
  { name: 'Venus', thName: 'ศุกร์', years: 21 },       // 7
];

export interface MahadashaResult {
  currentRuler: PlanetPeriod;
  nextRuler: PlanetPeriod;
  ageYang: number; // อายุย่าง
  mahadasaYear: number; // ปีที่เท่าไหร่ของดาวเสวยอายุนี้
}

function getStartIndex(dayOfWeek: number, isRahu: boolean): number {
  if (isRahu) return 6; // Rahu
  switch (dayOfWeek) {
    case 0: return 0; // Sun
    case 1: return 1; // Mon
    case 2: return 2; // Tue
    case 3: return 3; // Mercury
    case 4: return 5; // Thu (Jupiter)
    case 5: return 7; // Fri (Venus)
    case 6: return 4; // Sat (Saturn)
    default: return 0;
  }
}

export function calculateMahadasha(
  birthDate: Date,
  currentDate: Date,
  astrologicalDayOfWeek: number,
  isRahu: boolean
): MahadashaResult {
  // 1. Calculate Integer Age + 1 (อายุย่าง)
  let age = currentDate.getFullYear() - birthDate.getFullYear();
  const m = currentDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && currentDate.getDate() < birthDate.getDate())) {
    age--;
  }
  const ageYang = age + 1;

  // 2. Determine Starting Planet
  const startIdx = getStartIndex(astrologicalDayOfWeek, isRahu);

  // 3. Subtract years to find current ruler
  let remainingAge = ageYang;
  let currentIdx = startIdx;

  // Since total cycle is 108 years, a person older than 108 will loop.
  // We can just modulo the age by 108 just in case.
  remainingAge = (remainingAge - 1) % 108 + 1; 

  while (remainingAge > mahadashaSequence[currentIdx].years) {
    remainingAge -= mahadashaSequence[currentIdx].years;
    currentIdx = (currentIdx + 1) % mahadashaSequence.length;
  }

  const currentRuler = mahadashaSequence[currentIdx];
  const nextRuler = mahadashaSequence[(currentIdx + 1) % mahadashaSequence.length];

  return {
    currentRuler,
    nextRuler,
    ageYang,
    mahadasaYear: remainingAge, // e.g. year 7 out of 8 for Mars
  };
}
