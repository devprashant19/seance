const DEFAULT_RATE = 60;
const DEFAULT_BURST = 120;
const MAX_FRAME_BYTES = 64 * 1024;

export interface RateLimiterConfig {
  readonly ratePerSecond?: number;
  readonly burst?: number;
}

export class TokenBucket {
  private _tokens: number;
  private _lastRefill: number;
  private readonly _rate: number;
  private readonly _burst: number;

  constructor(config: RateLimiterConfig = {}) {
    this._rate = config.ratePerSecond ?? DEFAULT_RATE;
    this._burst = config.burst ?? DEFAULT_BURST;
    this._tokens = this._burst;
    this._lastRefill = Date.now();
  }

  consume(): boolean {
    this._refill();
    if (this._tokens < 1) return false;
    this._tokens -= 1;
    return true;
  }

  get tokens(): number {
    this._refill();
    return this._tokens;
  }

  private _refill(): void {
    const now = Date.now();
    const elapsed = (now - this._lastRefill) / 1000;
    this._tokens = Math.min(this._burst, this._tokens + elapsed * this._rate);
    this._lastRefill = now;
  }
}

export function checkFrameSize(data: string | ArrayBuffer): boolean {
  const size = typeof data === "string" ? new TextEncoder().encode(data).byteLength : data.byteLength;
  return size <= MAX_FRAME_BYTES;
}

export { MAX_FRAME_BYTES, DEFAULT_RATE, DEFAULT_BURST };
