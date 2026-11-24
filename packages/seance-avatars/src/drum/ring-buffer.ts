/**
 * Fixed-capacity circular buffer for real-time sensor streams.
 */

export class ChannelRingBuffer {
  readonly capacity: number;
  private _t: Float64Array;
  private _v: Float32Array;
  private _head = 0;
  private _count = 0;

  constructor(capacity = 5000) {
    this.capacity = Math.max(16, capacity);
    this._t = new Float64Array(this.capacity);
    this._v = new Float32Array(this.capacity);
  }

  push(t: number, v: number): void {
    const idx = (this._head + this._count) % this.capacity;
    if (this._count < this.capacity) {
      this._t[idx] = t;
      this._v[idx] = v;
      this._count++;
    } else {
      this._t[this._head] = t;
      this._v[this._head] = v;
      this._head = (this._head + 1) % this.capacity;
    }
  }

  get length(): number {
    return this._count;
  }

  clear(): void {
    this._head = 0;
    this._count = 0;
  }

  toArray(): { t: Float64Array; v: Float32Array } {
    const outT = new Float64Array(this._count);
    const outV = new Float32Array(this._count);

    for (let i = 0; i < this._count; i++) {
      const idx = (this._head + i) % this.capacity;
      outT[i] = this._t[idx]!;
      outV[i] = this._v[idx]!;
    }

    return { t: outT, v: outV };
  }
}
