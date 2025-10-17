export interface BoardState {
  size: number;
  sovereigns: number[];
}

export const createEmptyBoard = (size: number): BoardState => {
  return { size, sovereigns: Array.from({ length: size }, () => -1) };
};
