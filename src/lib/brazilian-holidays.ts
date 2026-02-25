// Brazilian national holidays and business day utilities
// Convention: 252 business days per year

// Easter date calculation using the Meeus algorithm
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getBrazilianHolidays(year: number): Date[] {
  const easter = getEasterDate(year);

  const holidays: Date[] = [
    // Fixed holidays
    new Date(year, 0, 1),   // Ano Novo
    new Date(year, 3, 21),  // Tiradentes
    new Date(year, 4, 1),   // Dia do Trabalho
    new Date(year, 8, 7),   // Independência
    new Date(year, 9, 12),  // Nossa Senhora Aparecida
    new Date(year, 10, 2),  // Finados
    new Date(year, 10, 15), // Proclamação da República
    new Date(year, 11, 25), // Natal

    // Moveable holidays (relative to Easter)
    addDays(easter, -48),   // Segunda de Carnaval
    addDays(easter, -47),   // Terça de Carnaval
    addDays(easter, -2),    // Sexta-feira Santa
    addDays(easter, 60),    // Corpus Christi
  ];

  return holidays;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Cache holidays by year
const holidayCache = new Map<number, Set<string>>();

function getHolidaySet(year: number): Set<string> {
  if (!holidayCache.has(year)) {
    const holidays = getBrazilianHolidays(year);
    holidayCache.set(year, new Set(holidays.map(dateKey)));
  }
  return holidayCache.get(year)!;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isBrazilianHoliday(date: Date): boolean {
  const set = getHolidaySet(date.getFullYear());
  return set.has(dateKey(date));
}

export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isBrazilianHoliday(date);
}

export function countBusinessDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  // Move to the next day after start
  current.setDate(current.getDate() + 1);

  while (current <= end) {
    if (isBusinessDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

export function addBusinessDays(startDate: Date, businessDays: number): Date {
  const current = new Date(startDate);
  let count = 0;

  while (count < businessDays) {
    current.setDate(current.getDate() + 1);
    if (isBusinessDay(current)) {
      count++;
    }
  }

  return current;
}
