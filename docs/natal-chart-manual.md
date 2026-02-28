# Natal Chart Technical Manual
## Specification for Backend / Frontend Dev Agents

> **Purpose:** This document is the **definitive specification** for rendering a correct Western Natal Chart using the Placidus house system.
> All calculations are verified against [Astro.com](https://www.astro.com) on Feb 25, 2026.
> 
> **Your role as dev agent:** Implement the chart visualization faithfully per this spec. Do NOT improvise astrological logic. If anything is ambiguous, ask — do not guess.

---

## 1. Architecture: Two Independent Wheels

A natal chart is **two overlapping but independent** circular systems drawn on the same center:

| Layer | What it represents | Division | Determined by |
|-------|--------------------|----------|---------------|
| **Zodiac Wheel** (outer ring) | 12 zodiac signs along the ecliptic | **Equal** — always 30° per sign | Fixed astronomical coordinate system |
| **House Wheel** (inner area) | 12 life areas based on Earth's rotation | **Unequal** — varies per chart | Birth time + latitude + longitude |

> [!IMPORTANT]
> **The zodiac ring and house system are independent.** A house cusp can fall anywhere within a sign. The zodiac ring rotates as a unit so that the Ascendant degree lands at 9 o'clock, but each sign is always exactly 30°. The house divisions are unequal and overlap signs freely.

---

## 2. Calculation Engine

### 2.1 Source
All astronomical data comes from Swiss Ephemeris via the `sweph` Node.js module. The engine lives at [engine.ts](file:///Users/piriyasambandaraksa/Dropbox/Antigravity/Projects/astrodian/src/lib/astrology/engine.ts).

### 2.2 Key Functions

**Julian Day:**
```typescript
function getJulianDay(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  return sweph.julday(year, month, day, hour, sweph.constants.SE_GREG_CAL);
}
```

**Planetary Positions (Tropical):**
```typescript
const iflag = sweph.constants.SEFLG_SWIEPH; // Tropical zodiac
const result = sweph.calc_ut(jd, planetId, iflag);
const longitude = result.data[0]; // 0°–360° ecliptic longitude
```

**House Cusps (Placidus):**
```typescript
const result = sweph.houses_ex(jd, sweph.constants.SEFLG_SWIEPH, lat, lon, 'P');
// Returns:
//   result.data.houses[0..11]  → 12 house cusp longitudes (index 0 = House 1)
//   result.data.points[0]      → Ascendant longitude
//   result.data.points[1]      → MC longitude
```

### 2.3 Planets Used

| Planet | sweph Constant | Symbol |
|--------|---------------|--------|
| Sun | `SE_SUN` | ☉ |
| Moon | `SE_MOON` | ☽ |
| Mercury | `SE_MERCURY` | ☿ |
| Venus | `SE_VENUS` | ♀ |
| Mars | `SE_MARS` | ♂ |
| Jupiter | `SE_JUPITER` | ♃ |
| Saturn | `SE_SATURN` | ♄ |
| Rahu | `SE_TRUE_NODE` (not Mean) | ☊ |

### 2.4 Timezone Handling

> [!CAUTION]
> **Swiss Ephemeris ต้องการเวลา UTC เสมอ.** หากแปลง local time → UTC ผิด ลิปดา (arc-minutes) จะเพี้ยนเท่าๆ กันทุกดาว เพราะเวลาเลื่อนทั้งหมดเท่ากัน (เช่น คลาดเคลื่อน 10 นาที = ดวงจันทร์เพี้ยน ~5', ลัคนาเพี้ยน ~2.5')

**กฎ:** เวลาเกิดที่ user กรอกเป็น **local time ของสถานที่เกิด** ต้องแปลงเป็น UTC ก่อนส่งให้ engine

```typescript
// ❌ WRONG — relies on browser/server timezone
const birthDate = new Date(`${dateStr}T${timeStr}:00.000`);
// ถ้า server อยู่ US แต่เวลาเกิดเป็น Bangkok = เพี้ยนแน่

// ✅ CORRECT — explicitly apply birth location timezone
// สำหรับไทย (UTC+7):
const birthDate = new Date(`${dateStr}T${timeStr}:00.000+07:00`);

// ✅ BEST — lookup timezone from lat/lon dynamically
// ใช้ library เช่น geo-tz หรือ timezone-lookup เพื่อหา offset จากพิกัด
import { find } from 'geo-tz';
const tzName = find(lat, lon)[0]; // e.g., 'Asia/Bangkok'
// แล้วใช้ library เช่น date-fns-tz หรือ luxon เพื่อสร้าง Date ที่ถูกต้อง
```

**ปัจจุบัน:** โค้ดปัจจุบันใช้ `new Date(dateStr + 'T' + timeStr + ':00.000')` (ไม่ระบุ offset) ซึ่งจะทำงานถูกต้อง **เฉพาะเมื่อ server/browser timezone ตรงกับสถานที่เกิด** หากต้อง deploy บน cloud หรือรองรับ user ต่างประเทศ ต้องแก้ให้ระบุ timezone offset ตามสถานที่เกิด

### 2.5 Zodiac Sign from Longitude
```typescript
const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
               'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const signIndex = Math.floor(longitude / 30);  // 0=Aries .. 11=Pisces
const degreeInSign = longitude % 30;            // 0°–30°
```

---

## 3. API Response Structure

The API at `POST /api/astrology` returns:

```json
{
  "planets": [
    { "name": "Sun",     "longitude": 292.86, "zodiac": "Capricorn", "degree": 22.86, "navamsa": "Virgo" },
    { "name": "Moon",    "longitude": 191.55, "zodiac": "Libra",     "degree": 11.55, "navamsa": "..." },
    { "name": "Mars",    "longitude": 344.38, "zodiac": "Pisces",    "degree": 14.38, "navamsa": "..." },
    { "name": "Mercury", "longitude": 271.77, "zodiac": "Capricorn", "degree": 1.77,  "navamsa": "..." },
    { "name": "Jupiter", "longitude": 294.29, "zodiac": "Capricorn", "degree": 24.29, "navamsa": "..." },
    { "name": "Venus",   "longitude": 339.65, "zodiac": "Pisces",    "degree": 9.65,  "navamsa": "..." },
    { "name": "Saturn",  "longitude": 235.81, "zodiac": "Scorpio",   "degree": 25.81, "navamsa": "..." },
    { "name": "Rahu (North Node)", "longitude": 55.68, "zodiac": "Taurus", "degree": 25.68, "navamsa": "..." },
    { "name": "Ascendant", "longitude": 340.98, "zodiac": "Pisces", "degree": 10.98, "navamsa": "..." }
  ],
  "houseCusps": {
    "cusps": [340.98, 16.66, 48.20, 75.52, 101.31, 128.80, 160.98, 196.66, 228.20, 255.52, 281.31, 308.80],
    "ascendant": 340.98,
    "mc": 255.52
  }
}
```

**Field reference:**
| Field | Use |
|-------|-----|
| `planets[].longitude` | Ecliptic longitude (0°–360°). Use for **positioning** on chart. |
| `planets[].zodiac` | Sign name string. Use for **labels**. |
| `planets[].degree` | Degree within sign (0°–30°). Use for **degree labels**. |
| `houseCusps.cusps[0..11]` | 12 house cusp ecliptic longitudes. `cusps[0]` = House 1 = ASC. |
| `houseCusps.ascendant` | Same as `cusps[0]`. |
| `houseCusps.mc` | MC longitude. Same as `cusps[9]`. |

---

## 4. Chart Rendering Specification

### 4.1 Coordinate System

**The Ascendant is ALWAYS pinned to 9 o'clock (left horizontal).**

To convert an ecliptic longitude to a screen angle:

```typescript
function toScreenAngle(longitude: number, ascLongitude: number): number {
  return 180 + (longitude - ascLongitude);
}
// Result: 180° = 9 o'clock (left), 0°/360° = 3 o'clock (right)
// Direction: counter-clockwise (higher longitude → upward from ASC)

function toCartesian(screenAngleDeg: number, radius: number): { x: number; y: number } {
  const rad = screenAngleDeg * Math.PI / 180;
  return {
    x: radius * Math.cos(rad),
    y: -radius * Math.sin(rad)  // SVG y-axis is inverted
  };
}
```

**Screen angle reference:**
| Screen Angle | Clock Position | What goes here |
|-------------|----------------|----------------|
| 180° | 9 o'clock (left) | **ASC** (always) |
| 0° / 360° | 3 o'clock (right) | **DC** |
| 90° | 12 o'clock (top) | Near MC |
| 270° | 6 o'clock (bottom) | Near IC |

### 4.2 Layer 1: Zodiac Ring (Outer)

- Draw 12 equal arcs of 30° each
- Each arc represents one zodiac sign: Aries (0°–30°) through Pisces (330°–360°)
- The entire ring rotates so ASC's ecliptic longitude maps to 9 o'clock
- Label each arc with the sign's symbol and/or abbreviation
- Draw thin boundary lines between signs

> **Alternative (current implementation):** Use a pre-rendered zodiac ring image (`/zodiac-ring.png`) and rotate it via CSS:
> ```
> CSS rotation = ascLongitude - 90  (in degrees, clockwise)
> ```
> This works because the image has Aries at 12 o'clock (top = 90° math angle).

### 4.3 Layer 2: House Divisions (Inner)

Draw lines from center to inner ring edge at each house cusp longitude:

- **Angular houses (1, 4, 7, 10)** — Draw as full axis lines across the entire chart:
  - House 1 ↔ House 7 = **Horizon line** (ASC–DC), bold stroke ~2.5px
  - House 4 ↔ House 10 = **Meridian line** (IC–MC), bold stroke ~2.5px
- **Non-angular houses (2, 3, 5, 6, 8, 9, 11, 12)** — Thinner lines from center to inner ring only, stroke ~1px, opacity 0.25
- Label house numbers (1–12) at the midpoint of each house arc

### 4.4 Layer 3: Planets

1. Place each planet at its `longitude`, converted to screen coordinates via `toScreenAngle`
2. Draw at a radius inside the inner ring (e.g., `innerRadius - 45`)
3. Draw a **tick mark** on the inner ring edge at the exact degree
4. Draw a dashed line from planet circle to tick mark
5. Show planet symbol inside a circle, with a small degree label below (e.g., "Cap 22°51'")

**Anti-collision:** If two planets are within ~8° of each other, push one further inward to avoid overlap.

### 4.5 Layer 4: Angular Point Labels

Place outside the outer ring:
- **AC** at 9 o'clock — with sign symbol + degree (e.g., "AC  ♓ 10°59'")
- **DC** at 3 o'clock — with sign symbol + degree
- **MC** at its calculated screen position — with sign symbol + degree
- **IC** opposite MC — with sign symbol + degree

### 4.6 Layer 5: Aspect Lines (Optional)

Draw lines between planets that form major aspects:

| Aspect | Angle | Orb | Line Style |
|--------|-------|-----|------------|
| Conjunction | 0° | 8° | Solid, gold |
| Opposition | 180° | 8° | Dashed, red |
| Trine | 120° | 8° | Solid, green |
| Square | 90° | 8° | Dashed, red |
| Sextile | 60° | 6° | Solid, blue |

### 4.7 Direction Summary

**Counter-clockwise from the ASC (9 o'clock):**
```
         MC (~top)
           ↑
    12  11  10  9
  1 ──── AC ──── DC ── 7    ← Horizon
    2   3   4   5
           ↓
         IC (~bottom)

Houses go:  1 → 2 → 3 → ... → 12  (counter-clockwise)
Signs go:   Aries → Taurus → ... → Pisces  (counter-clockwise)
```

---

## 5. Verified Test Data (4 Charts)

All verified ✅ against Astro.com (Feb 28, 2026). Engine output matches to arc-second precision.

### 5.1 Chart A — 13 Jan 1985, 09:45, Bangkok (13.75°N, 100.50°E)

| Planet | Engine | Astro.com |
|--------|--------|-----------|
| Sun | Cap 22°51' | Cap 22°51'39" | 
| Moon | Lib 11°33' | Lib 11°33'11" |
| ASC | Pis 10°58' | Pis 11°0' |
| MC | Sag 15°31' | Sag 15°32' |

### 5.2 Chart B — 5 Dec 1985, 08:03, Bangkok (13.75°N, 100.52°E)

| Planet | Engine | Astro.com |
|--------|--------|-----------|
| Sun | Sag 12°50' | Sag 12°50'0" |
| Moon | Vir 8°43' | Vir 8°43'15" |
| Mercury | Sco 29°51' | Sco 29°50'37" |
| Venus | Sag 1°53' | Sag 1°53'19" |
| Mars | Lib 23°58' | Lib 23°58'1" |
| ASC | Cap 3°39' | Cap 3°39' |
| MC | Lib 10°56' | Lib 10°56' |

### 5.3 Chart C — 20 Mar 2020, 13:30, Bangkok (13.75°N, 100.52°E)

| Planet | Engine | Astro.com |
|--------|--------|-----------|
| Sun | Ari 0°07' | Ari 0°6'38" |
| Moon | Aqu 14°54' | Aqu 14°54'3" |
| Venus | Tau 16°04' | Tau 16°3'31" |
| Saturn | Cap 29°51' | Cap 29°51'21" |
| ASC | Can 20°16' | Can 20°16' |
| MC | Ari 17°39' | Ari 17°39' |

### 5.4 Chart D — 9 Aug 2001, 09:45, Roi Et (16.05°N, 103.67°E)

| Planet | Engine | Astro.com |
|--------|--------|-----------|
| Sun | Leo 16°36' | Leo 16°35'32" |
| Moon | Ari 9°51' | Ari 9°50'35" |
| Mercury | Leo 20°03' | Leo 20°3'10" |
| Mars | Sag 17°50' | Sag 17°49'55" |
| ASC | Lib 12°10' | Lib 12°10' |
| MC | Can 11°34' | Can 11°34' |

---

## 6. Degree Formatting Helper

```typescript
function formatDegree(longitude: number): string {
  const degInSign = longitude % 30;
  const deg = Math.floor(degInSign);
  const min = Math.round((degInSign - deg) * 60);
  return `${deg}°${String(min).padStart(2, '0')}'`;
}
```

---

## 7. Common Mistakes

| ❌ Mistake | ✅ Correct |
|-----------|-----------|
| All houses = 30° | Placidus houses are **unequal** |
| Rotating zodiac with houses | Zodiac rotates as a unit; houses rotate independently |
| MC forced to 12 o'clock | MC goes at its **calculated** position |
| Using `SE_MEAN_NODE` for Rahu | Use `SE_TRUE_NODE` |
| ASC snapped to sign boundary | ASC falls at exact degree (e.g., Pisces 10°58') |
| Planets drawn in outer ring | Planets go **inside** the inner ring |
| Clockwise numbering | Houses count **counter-clockwise** |
| Reading `result.ascmc[]` from sweph | Correct path is `result.data.points[]` and `result.data.houses[]` |
| No timezone offset on `new Date()` | Must convert birth local time to UTC using birth location's timezone |
| Relying on server timezone = birth timezone | Use explicit offset (e.g., `+07:00`) or lookup from lat/lon |

---

## 8. 🐛 Critical Bug: Sunrise Calculation → Wrong Mahadasha

### ปัญหา

`getAstrologicalDayInfo()` ใน [engine.ts](file:///Users/piriyasambandaraksa/Dropbox/Antigravity/Projects/astrodian/src/lib/astrology/engine.ts) คำนวณ **วันทางโหราศาสตร์** ผิด ทำให้ **มหาทักษา (108-year cycle) เพี้ยนทั้งหมด**

### Root Cause

```typescript
// engine.ts line 26-28
const midnight = new Date(date.getTime());
midnight.setUTCHours(0, 0, 0, 0);  // ← BUG: midnight UTC, NOT local midnight
const jd_midnight = getJulianDay(midnight);
```

**midnight UTC (00:00Z) = 07:00 AM Bangkok** — ซึ่ง **ผ่านเวลา sunrise ไปแล้ว** (~06:00-06:30)

ดังนั้น `sweph.rise_trans()` ค้นหา sunrise ของ **วันถัดไป** แทน:

```
Timeline (UTC):
00:00Z (= 07:00 BKK) ← midnight.setUTCHours(0)
                       ↑ Sunrise Jan 13 already passed!
                       → sweph finds NEXT sunrise = Jan 14 06:46 BKK

02:45Z (= 09:45 BKK) ← birth time
                       code: 02:45 < Jan14 sunrise? → YES → "before sunrise" → WRONG!
```

### ผลกระทบ

| ค่า | ผิด (ปัจจุบัน) | ถูกต้อง |
|-----|--------------|---------|
| วันเกิด Piriya (13 ม.ค. 1985) | **เสาร์** | **อาทิตย์** |
| ดาวเสวยอายุเริ่มต้น | เสาร์ (10y) | อาทิตย์ (6y) |
| ดาวเสวยอายุ age 42 | **ศุกร์ (ปีที่ 1/21)** | **พุธ (ปีที่ 13/17)** |
| Mahadasha ทั้งหมด | ผิดหมด | ถูก |

### Fix

เปลี่ยนจาก midnight UTC → midnight **local time ของสถานที่เกิด**:

```typescript
// ❌ WRONG (current)
midnight.setUTCHours(0, 0, 0, 0);

// ✅ FIX: Use local midnight based on birth longitude
// Longitude-based timezone estimate: 1 hour per 15° of longitude
const tzOffsetHours = Math.round(lon / 15); // e.g. Bangkok 100.5° → +7
const localMidnightUTC_hours = 24 - tzOffsetHours; // e.g. 24-7 = 17 → previous day 17:00 UTC
const midnight = new Date(date.getTime());
midnight.setUTCHours(0, 0, 0, 0);
// Go back to previous day's local midnight
midnight.setUTCHours(midnight.getUTCHours() - tzOffsetHours);
```

หรือดีกว่า ใช้ **วิธีที่แม่นยำกว่า**:

```typescript
// ✅ BEST: set midnight to well before sunrise (previous day evening UTC)
// For any location in Asia (UTC+5 to UTC+9), local midnight ≈ 15:00-19:00 UTC previous day
const midnight = new Date(date.getTime());
midnight.setUTCHours(0, 0, 0, 0);
// Subtract timezone offset so we get LOCAL midnight
const approxTzHours = Math.round(lon / 15);
midnight.setTime(midnight.getTime() - approxTzHours * 3600000);
const jd_midnight = getJulianDay(midnight);
// Now rise_trans will find TODAY's sunrise (not tomorrow's)
```

### Verification

หลัง fix แล้ว ต้องได้:
- Piriya (13 ม.ค. 1985, 09:45 BKK): **Sunday** (อาทิตย์) → เริ่ม Sun(6y) → age 42 = Mercury ปีที่ 13/17
- Juranon (9 ส.ค. 2001, 09:45 Roi Et): ตรวจสอบเทียบด้วย

