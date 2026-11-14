import { WeightCategory } from "../adapters/types";

export interface WeightCategoryInfo {
  category: WeightCategory;
  label: string;
  minLbs: number;
  maxLbs: number | null;
  annualStandardTax: number;
  annualLoggingTax: number;
}

const LETTERS: WeightCategory[] = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K",
  "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W",
];

/**
 * IRS Form 2290 annual tax table (REQ-CALC-001):
 * - Category A (55,000 lbs): $100
 * - Categories B..U: +$22 per additional 1,000 lbs up to 75,000 lbs
 * - Category V (> 75,000 lbs): $550 cap
 * - Category W (Suspended <= 5,000 / 7,500 miles): $0
 * - Logging vehicles: 75% of standard rate (25% reduction)
 */
export const WEIGHT_CATEGORIES: WeightCategoryInfo[] = LETTERS.map((cat, idx) => {
  if (cat === "A") {
    return {
      category: "A",
      label: "A — 55,000 lbs",
      minLbs: 55000,
      maxLbs: 55000,
      annualStandardTax: 100,
      annualLoggingTax: 75,
    };
  }
  if (cat === "V") {
    return {
      category: "V",
      label: "V — Over 75,000 lbs",
      minLbs: 75001,
      maxLbs: null,
      annualStandardTax: 550,
      annualLoggingTax: 412.5,
    };
  }
  if (cat === "W") {
    return {
      category: "W",
      label: "W — Suspended (≤ 5,000 mi / ≤ 7,500 mi ag)",
      minLbs: 55000,
      maxLbs: null,
      annualStandardTax: 0,
      annualLoggingTax: 0,
    };
  }
  const minLbs = 55000 + (idx - 1) * 1000 + 1;
  const maxLbs = 55000 + idx * 1000;
  const standard = 100 + idx * 22;
  const logging = Number((standard * 0.75).toFixed(2));
  return {
    category: cat,
    label: `${cat} — ${minLbs.toLocaleString()}–${maxLbs.toLocaleString()} lbs`,
    minLbs,
    maxLbs,
    annualStandardTax: standard,
    annualLoggingTax: logging,
  };
});

export const WEIGHT_CATEGORY_MAP = new Map<WeightCategory, WeightCategoryInfo>(
  WEIGHT_CATEGORIES.map((c) => [c.category, c]),
);

export const TAX_PERIOD_MONTHS: { month: number; name: string; remainingMonths: number }[] = [
  { month: 7, name: "July", remainingMonths: 12 },
  { month: 8, name: "August", remainingMonths: 11 },
  { month: 9, name: "September", remainingMonths: 10 },
  { month: 10, name: "October", remainingMonths: 9 },
  { month: 11, name: "November", remainingMonths: 8 },
  { month: 12, name: "December", remainingMonths: 7 },
  { month: 1, name: "January", remainingMonths: 6 },
  { month: 2, name: "February", remainingMonths: 5 },
  { month: 3, name: "March", remainingMonths: 4 },
  { month: 4, name: "April", remainingMonths: 3 },
  { month: 5, name: "May", remainingMonths: 2 },
  { month: 6, name: "June", remainingMonths: 1 },
];

export function getRemainingMonths(firstUsedMonth: number): number {
  const found = TAX_PERIOD_MONTHS.find((m) => m.month === firstUsedMonth);
  return found ? found.remainingMonths : 12;
}

export function getMonthName(month: number): string {
  return TAX_PERIOD_MONTHS.find((m) => m.month === month)?.name ?? "July";
}

/**
 * REQ-CALC-002: Prorated tax = Full Annual Tax * (Remaining Months / 12)
 */
export function calculateVehicleTax(
  category: WeightCategory,
  isLogging: boolean,
  firstUsedMonth: number,
): number {
  const info = WEIGHT_CATEGORY_MAP.get(category);
  if (!info || category === "W") return 0;
  const annual = isLogging ? info.annualLoggingTax : info.annualStandardTax;
  const remaining = getRemainingMonths(firstUsedMonth);
  return Number(((annual * remaining) / 12).toFixed(2));
}

/**
 * REQ-POST-002: Weight increase amendment incremental tax due.
 */
export function calculateWeightIncreaseTax(
  priorCategory: WeightCategory,
  newCategory: WeightCategory,
  isLogging: boolean,
  monthOfIncrease: number,
): number {
  const oldTax = calculateVehicleTax(priorCategory, isLogging, monthOfIncrease);
  const newTax = calculateVehicleTax(newCategory, isLogging, monthOfIncrease);
  return Math.max(0, Number((newTax - oldTax).toFixed(2)));
}

/**
 * REQ-REG-007: Statutory filing deadline (Aug 31 for July; end of month following first-use month).
 */
export function getFilingDeadline(taxYear: string, firstUsedMonth: number): string {
  const startYear = Number.parseInt(taxYear.split("-")[0] || "2026", 10);
  if (firstUsedMonth === 7) {
    return `August 31, ${startYear}`;
  }
  const calendarYear = firstUsedMonth >= 8 ? startYear : startYear + 1;
  const dueMonth = firstUsedMonth === 12 ? 1 : firstUsedMonth + 1;
  const dueYear = firstUsedMonth === 12 ? calendarYear + 1 : calendarYear;
  const lastDay = new Date(dueYear, dueMonth, 0).getDate();
  const dueMonthName = getMonthName(dueMonth);
  return `${dueMonthName} ${lastDay}, ${dueYear}`;
}

export function deriveNameControl(legalName: string): string {
  const cleaned = legalName
    .toUpperCase()
    .replace(/\b(LLC|INC|CORP|CO|LTD|LP|LLP)\b/g, "")
    .replace(/[^A-Z0-9]/g, "");
  return cleaned.slice(0, 4).padEnd(4, "X");
}

