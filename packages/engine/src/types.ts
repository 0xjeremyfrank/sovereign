export interface RegionMap {
  width: number;
  height: number;
  regions: number[]; // length = width * height; region id per cell
}

// Three-state cell for UI/engine interoperability
export type CellState = 'blank' | 'marked' | 'sovereign';

export interface BoardState {
  size: number;
  cells: CellState[]; // length = size * size
  history: CellState[][]; // stack of previous cell arrays for undo
}

export type RuleType = 'column' | 'region' | 'adjacent' | 'contiguous';

export interface ValidationViolation {
  rule: RuleType;
  cells: number[]; // linear indices r*size + c
}

export interface ValidationResult {
  isValid: boolean;
  isComplete: boolean; // every row has a sovereign and no violations
  violations: ValidationViolation[];
}
