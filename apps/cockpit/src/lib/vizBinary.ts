/**
 * Typed views over the flow-export blob.
 *
 * `src/daedalus/viz/binary.py` writes `offset` as a **byte** offset and `length` as an
 * **element** count. Reading `length` as bytes silently truncates every layer to a quarter,
 * which is easy to miss until a mesh renders as stray triangles.
 */
export type BinaryRef = { offset: number; length: number; type: string };

export function readF32(buffer: ArrayBuffer, ref: BinaryRef): Float32Array {
  return new Float32Array(buffer, ref.offset, ref.length);
}

export function readU32(buffer: ArrayBuffer, ref: BinaryRef): Uint32Array {
  return new Uint32Array(buffer, ref.offset, ref.length);
}
