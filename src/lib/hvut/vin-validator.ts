const TRANSLITERATION: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4,
  "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
};

const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export interface VinValidationResult {
  valid: boolean;
  normalized: string;
  errors: string[];
  checkDigitWarning?: string;
}

export function computeVinCheckDigit(vin17: string): string | null {
  const upper = vin17.toUpperCase();
  if (upper.length !== 17) return null;
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const ch = upper[i];
    const val = TRANSLITERATION[ch];
    if (val === undefined) return null;
    sum += val * WEIGHTS[i];
  }
  const rem = sum % 11;
  return rem === 10 ? "X" : String(rem);
}

/**
 * REQ-REG-006: Validate 17 alphanumeric chars, forbid I/O/Q, and check ISO 3779 check digit.
 */
export function validateVin(rawVin: string, allowPre1981Override = false): VinValidationResult {
  const normalized = rawVin.trim().toUpperCase();
  const errors: string[] = [];

  if (normalized.length !== 17) {
    errors.push(`VIN must be exactly 17 characters (found ${normalized.length}).`);
  }
  if (/[^A-Z0-9]/.test(normalized)) {
    errors.push("VIN must contain only alphanumeric characters.");
  }
  if (/[IOQ]/.test(normalized)) {
    errors.push("VIN cannot contain the letters I, O, or Q.");
  }

  let checkDigitWarning: string | undefined;
  if (errors.length === 0) {
    const expected = computeVinCheckDigit(normalized);
    if (expected && normalized[8] !== expected) {
      const msg = `ISO 3779 check digit mismatch at position 9 (expected '${expected}', got '${normalized[8]}').`;
      if (allowPre1981Override) {
        checkDigitWarning = msg;
      } else {
        errors.push(msg);
      }
    }
  }

  return {
    valid: errors.length === 0,
    normalized,
    errors,
    checkDigitWarning,
  };
}

/**
 * Generates a realistic Freightliner/Kenworth/Peterbilt ISO-valid 17-char VIN for PoC testing.
 */
export function generateValidTestVin(seedNumber?: number): string {
  const wmis = ["1FU", "1XK", "1XP", "3AK", "2HS"];
  const wmi = wmis[Math.floor(Math.random() * wmis.length)];
  const vds = "JGLD5";
  const yearCodes = ["N", "P", "R", "S", "T"];
  const year = yearCodes[Math.floor(Math.random() * yearCodes.length)];
  const plant = "L";
  const serialNum = seedNumber !== undefined
    ? String(seedNumber % 1000000).padStart(6, "0")
    : String(Math.floor(100000 + Math.random() * 899999));

  const draft = `${wmi}${vds}0${year}${plant}${serialNum}`;
  const check = computeVinCheckDigit(draft) ?? "0";
  return `${wmi}${vds}${check}${year}${plant}${serialNum}`;
}

export function validateEin(rawEin: string): { valid: boolean; formatted: string; error?: string } {
  const digits = rawEin.replace(/\D/g, "");
  if (digits.length !== 9) {
    return { valid: false, formatted: rawEin, error: "EIN must be exactly 9 digits (XX-XXXXXXX)." };
  }
  if (/^(\d)\1{8}$/.test(digits) || digits.startsWith("00") || digits.startsWith("66")) {
    return { valid: false, formatted: rawEin, error: "Invalid EIN prefix or repeating digits (SSNs are not permitted)." };
  }
  return {
    valid: true,
    formatted: `${digits.slice(0, 2)}-${digits.slice(2)}`,
  };
}

