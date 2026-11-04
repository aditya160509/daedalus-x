/**
 * The timing importer returns zero-based positions into its `rows` array, not `run_no` labels.
 * Keep that mapping explicit so a flagged row is matched by position and every row stays present.
 */
export function outlierRowIndices(rowCount: number, indices: readonly number[]): number[] {
  return [...new Set(indices)]
    .filter((index) => Number.isInteger(index) && index >= 0 && index < rowCount)
    .toSorted((a, b) => a - b);
}

export function isOutlierRow(
  rowCount: number,
  indices: readonly number[],
  rowIndex: number,
): boolean {
  return outlierRowIndices(rowCount, indices).includes(rowIndex);
}
