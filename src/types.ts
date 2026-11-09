export interface ValidationResult {
  valid: boolean;
  /** Normalized input that was checked. */
  value: string;
  /** Why validation failed. Only set when `valid` is false. */
  reason?: string;
  /** Extra information derived from a valid value (bank, province, E.164 …). */
  details?: Record<string, unknown>;
}
