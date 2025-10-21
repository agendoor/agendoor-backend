/**
 * Utility functions for checking Brazilian holidays
 */

interface Holiday {
  day: number;
  month: number;
  name: string;
}

// Feriados nacionais fixos
const NATIONAL_HOLIDAYS: Holiday[] = [
  { day: 1, month: 1, name: "Ano Novo" },
  { day: 21, month: 4, name: "Tiradentes" },
  { day: 1, month: 5, name: "Dia do Trabalho" },
  { day: 7, month: 9, name: "Independência do Brasil" },
  { day: 12, month: 10, name: "Nossa Senhora Aparecida" },
  { day: 2, month: 11, name: "Finados" },
  { day: 15, month: 11, name: "Proclamação da República" },
  { day: 25, month: 12, name: "Natal" }
];

// Feriados estaduais (exemplo: São Paulo)
const STATE_HOLIDAYS: { [state: string]: Holiday[] } = {
  "SP": [
    { day: 9, month: 7, name: "Revolução Constitucionalista" }
  ],
  "RJ": [
    { day: 20, month: 11, name: "Dia da Consciência Negra" }
  ]
};

// Feriados municipais (exemplo: São Paulo capital)
const CITY_HOLIDAYS: { [city: string]: Holiday[] } = {
  "São Paulo": [
    { day: 25, month: 1, name: "Aniversário de São Paulo" }
  ]
};

/**
 * Verifica se uma data é feriado nacional
 */
export function isNationalHoliday(date: Date): boolean {
  const day = date.getDate();
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed

  return NATIONAL_HOLIDAYS.some(h => h.day === day && h.month === month);
}

/**
 * Verifica se uma data é feriado estadual
 */
export function isStateHoliday(date: Date, state: string): boolean {
  const day = date.getDate();
  const month = date.getMonth() + 1;

  const stateHolidays = STATE_HOLIDAYS[state] || [];
  return stateHolidays.some(h => h.day === day && h.month === month);
}

/**
 * Verifica se uma data é feriado municipal
 */
export function isCityHoliday(date: Date, city: string): boolean {
  const day = date.getDate();
  const month = date.getMonth() + 1;

  const cityHolidays = CITY_HOLIDAYS[city] || [];
  return cityHolidays.some(h => h.day === day && h.month === month);
}

/**
 * Calcula a Páscoa para um ano específico (Algoritmo de Meeus/Jones/Butcher)
 */
export function getEasterDate(year: number): Date {
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

/**
 * Verifica se uma data é Carnaval (47 dias antes da Páscoa)
 */
export function isCarnaval(date: Date): boolean {
  const easter = getEasterDate(date.getFullYear());
  const carnaval = new Date(easter);
  carnaval.setDate(easter.getDate() - 47);

  return (
    date.getDate() === carnaval.getDate() &&
    date.getMonth() === carnaval.getMonth() &&
    date.getFullYear() === carnaval.getFullYear()
  );
}

/**
 * Verifica se uma data é Sexta-feira Santa (2 dias antes da Páscoa)
 */
export function isGoodFriday(date: Date): boolean {
  const easter = getEasterDate(date.getFullYear());
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);

  return (
    date.getDate() === goodFriday.getDate() &&
    date.getMonth() === goodFriday.getMonth() &&
    date.getFullYear() === goodFriday.getFullYear()
  );
}

/**
 * Verifica se uma data é Corpus Christi (60 dias após a Páscoa)
 */
export function isCorpusChristi(date: Date): boolean {
  const easter = getEasterDate(date.getFullYear());
  const corpusChristi = new Date(easter);
  corpusChristi.setDate(easter.getDate() + 60);

  return (
    date.getDate() === corpusChristi.getDate() &&
    date.getMonth() === corpusChristi.getMonth() &&
    date.getFullYear() === corpusChristi.getFullYear()
  );
}
