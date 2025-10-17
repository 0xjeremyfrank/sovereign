export interface RegionMap {
  width: number;
  height: number;
  regions: number[]; // length = width * height; region id per cell
}

export interface BoardState {
  size: number;
  // For each row, the column index (0..size-1) or -1 if empty
  sovereigns: number[];
}

export type RuleType = 'column' | 'region' | 'adjacent';

export interface ValidationViolation {
  rule: RuleType;
  cells: number[]; // linear indices r*size + c
}

export interface ValidationResult {
  isValid: boolean;
  isComplete: boolean; // every row has a sovereign and no violations
  violations: ValidationViolation[];
}
