export const ZODIAC_SIGNS = {
  Aries: {
    thName: 'เมษ',
    element: 'Fire',
    quality: 'Cardinal',
    ruler: 'Mars',
    characteristics: ['ริเริ่ม', 'กล้าหาญ', 'ใจร้อน', 'เป็นผู้นำ']
  },
  Taurus: {
    thName: 'พฤษภ',
    element: 'Earth',
    quality: 'Fixed',
    ruler: 'Venus',
    characteristics: ['มั่นคง', 'ดื้อรั้น', 'ชอบสะสม', 'รักความสบาย']
  },
  Gemini: {
    thName: 'เมถุน',
    element: 'Air',
    quality: 'Mutable',
    ruler: 'Mercury',
    characteristics: ['สื่อสารเก่ง', 'สองจิตสองใจ', 'เรียนรู้เร็ว', 'ปรับตัวเก่ง']
  },
  Cancer: {
    thName: 'กรกฎ',
    element: 'Water',
    quality: 'Cardinal',
    ruler: 'Moon',
    characteristics: ['อ่อนไหว', 'รักครอบครัว', 'ชอบดูแลผู้อื่น', 'อารมณ์แปรปรวน']
  },
  Leo: {
    thName: 'สิงห์',
    element: 'Fire',
    quality: 'Fixed',
    ruler: 'Sun',
    characteristics: ['สง่างาม', 'ใจกว้าง', 'หยิ่งยโส', 'ต้องการการยอมรับ']
  },
  Virgo: {
    thName: 'กันย์',
    element: 'Earth',
    quality: 'Mutable',
    ruler: 'Mercury',
    characteristics: ['เจ้าระเบียบ', 'วิเคราะห์เก่ง', 'ชอบบริการ', 'คิดจุกจิก']
  },
  Libra: {
    thName: 'ตุลย์',
    element: 'Air',
    quality: 'Cardinal',
    ruler: 'Venus',
    characteristics: ['รักความยุติธรรม', 'มีสุนทรียภาพ', 'ต้องการคู่คิด', 'โลเล']
  },
  Scorpio: {
    thName: 'พิจิก',
    element: 'Water',
    quality: 'Fixed',
    ruler: 'Mars', // Pluto in modern
    characteristics: ['ลึกลับ', 'เด็ดขาด', 'พยาบาท', 'มีอำนาจซ่อนเร้น']
  },
  Sagittarius: {
    thName: 'ธนู',
    element: 'Fire',
    quality: 'Mutable',
    ruler: 'Jupiter',
    characteristics: ['มองโลกในแง่ดี', 'รักอิสระ', 'ชอบเดินทาง/ปรัชญา', 'พูดตรงเกินไป']
  },
  Capricorn: {
    thName: 'มังกร',
    element: 'Earth',
    quality: 'Cardinal',
    ruler: 'Saturn',
    characteristics: ['ทะเยอทะยาน', 'อดทน', 'บ้างาน', 'เคร่งเครียด']
  },
  Aquarius: {
    thName: 'กุมภ์',
    element: 'Air',
    quality: 'Fixed',
    ruler: 'Saturn', // Uranus in modern
    characteristics: ['แหวกแนว', 'มนุษยธรรม', 'ดื้อเงียบ', 'คิดการณ์ไกล']
  },
  Pisces: {
    thName: 'มีน',
    element: 'Water',
    quality: 'Mutable',
    ruler: 'Jupiter', // Neptune in modern
    characteristics: ['เสียสละ', 'จินตนาการสูง', 'หลีกหนีความจริง', 'มีเมตตา']
  }
};

export const THAI_PLANET_RELATIONSHIPS = {
  // คู่มิตร (Friends / Allies)
  FRIENDS: [
    ['Sun', 'Jupiter'], // อาทิตย์ - พฤหัส (คู่มิตรใหญ่)
    ['Moon', 'Mercury'], // จันทร์ - พุธ (คู่มิตรทางศิลปะ/การพูด)
    ['Venus', 'Mars'],   // ศุกร์ - อังคาร (คู่มิตรกามารมณ์/ความหลงใหล)
    ['Saturn', 'Rahu (North Node)'] // เสาร์ - ราหู (คู่มิตรนักเลง/ธุรกิจสีเทา)
  ],
  
  // คู่ธาตุ (Same Element Pairings - Support)
  ELEMENTS: [
    ['Sun', 'Saturn'], // คู่ธาตุไฟ
    ['Moon', 'Venus'], // คู่ธาตุน้ำ
    ['Mars', 'Rahu (North Node)'], // คู่ธาตุลม
    ['Mercury', 'Jupiter'] // คู่ธาตุดิน
  ],
  
  // คู่สมพล (Power Pair - Good for success but hard work)
  POWER: [
    ['Sun', 'Saturn'],
    ['Moon', 'Jupiter'],
    ['Mars', 'Mercury'],
    ['Venus', 'Rahu (North Node)']
  ],
  
  // คู่ศัตรู (Enemies / Conflict)
  ENEMIES: [
    ['Sun', 'Mars'], // อุบัติเหตุ, แตกหัก
    ['Moon', 'Jupiter'], // ขัดแย้งทางอารมณ์และเหตุผล
    ['Mercury', 'Rahu (North Node)'], // ปากเสียง, เอกสารผิดพลาด, โดนหลอก
    ['Venus', 'Saturn'] // ความรักอมทุกข์, พลัดพราก
  ]
};

export const ASPECTS = {
  Conjunction: {
    angle: 0,
    orb: 10,
    meaning: 'การกุมกัน (ทับกัน) พลังงานสองดาวผสมผสานกันอย่างรุนแรง (ดีหรือร้ายขึ้นอยู่กับคู่ดาว)'
  },
  Sextile: {
    angle: 60,
    orb: 6,
    meaning: 'โยคเกณฑ์ (Sextile) พลังงานเกื้อหนุนกัน โอกาสและความราบรื่น (เหมือนคู่มิตร)'
  },
  Square: {
    angle: 90,
    orb: 8,
    meaning: 'จตุโกณ (Square) ความขัดแย้ง อุปสรรคที่ต้องเผชิญและฝ่าฟัน (เหมือนคู่ศัตรู)'
  },
  Trine: {
    angle: 120,
    orb: 10,
    meaning: 'ตรีโกณ (Trine) ความโชคดี พรสวรรค์ พลังงานไหลลื่นที่สุด (เหมือนคู่ธาตุ)'
  },
  Opposition: {
    angle: 180,
    orb: 10,
    meaning: 'เล็ง (Opposition) เผชิญหน้า ดึงดูดแต่มีความขัดแย้งในตัว (ดึงดัน)'
  }
};
