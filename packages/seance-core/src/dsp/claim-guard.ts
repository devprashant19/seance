export const FORBIDDEN_CLAIM_PATTERNS: readonly RegExp[] = [
  /\bghost\s+detected\b/i,
  /\bghost\s+confirmed\b/i,
  /\bhaunting\s+confirmed\b/i,
  /\bparanormal\s+entity\b/i,
  /\bspirit\s+presence\s+confirmed\b/i,
  /\bfully\s+accessible\b/i,
  /\bwcag\s+aaa\s+(?:ready|audited)\b/i,
  /\bghost\s+ear\s+audited\b/i,
  /\b100%\s+of\s+participants\b/i,
  /\bmedical\s+diagnosis\b/i,
  /\bcures?\s+(?:disease|illness|syndrome)\b/i,
  /\bstructural\s+safety\s+certified\b/i,
  /\bearthquake\s+safe\b/i,
  /\bwave\s+speed\s+across\s+(?:the\s+)?table\b/i,
];

export interface ClaimValidationResult {
  readonly valid: boolean;
  readonly violations: readonly string[];
}

/**
 * Validates text against Séance ethical and scientific ground rules.
 * Strictly blocks supernatural confirmation, unverified accessibility,
 * medical diagnostic claims, and structural certifications.
 */
export function validateClaimText(text: string): ClaimValidationResult {
  const violations: string[] = [];

  for (const pattern of FORBIDDEN_CLAIM_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      violations.push(`Forbidden phrase match: "${match[0]}"`);
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Throws an Error if any forbidden claim phrase is detected.
 */
export function assertValidClaimText(text: string): void {
  const result = validateClaimText(text);
  if (!result.valid) {
    throw new Error(`ClaimGuard rejection: ${result.violations.join("; ")}`);
  }
}
