const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 30_000;
const DEFAULT_JITTER_FACTOR = 0.3;

export interface ReconnectConfig {
  readonly maxRetries?: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly jitterFactor?: number;
}

export type ReconnectState = "idle" | "connecting" | "connected" | "backoff" | "exhausted";

export interface ReconnectEvents {
  onStateChange?: (state: ReconnectState) => void;
  onAttempt?: (attempt: number, delayMs: number) => void;
}

export class ReconnectManager {
  private readonly _maxRetries: number;
  private readonly _baseDelay: number;
  private readonly _maxDelay: number;
  private readonly _jitter: number;
  private _attempt = 0;
  private _state: ReconnectState = "idle";
  private _timer: ReturnType<typeof setTimeout> | undefined;
  private readonly _events: ReconnectEvents;

  constructor(config: ReconnectConfig = {}, events: ReconnectEvents = {}) {
    this._maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this._baseDelay = config.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    this._maxDelay = config.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
    this._jitter = config.jitterFactor ?? DEFAULT_JITTER_FACTOR;
    this._events = events;
  }

  get state(): ReconnectState {
    return this._state;
  }

  get attempt(): number {
    return this._attempt;
  }

  computeDelay(attempt: number): number {
    const exp = this._baseDelay * Math.pow(2, attempt);
    const capped = Math.min(exp, this._maxDelay);
    const jitterRange = capped * this._jitter;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    return Math.max(0, Math.round(capped + jitter));
  }

  scheduleRetry(connect: () => Promise<boolean>): boolean {
    if (this._attempt >= this._maxRetries) {
      this._setState("exhausted");
      return false;
    }

    const delay = this.computeDelay(this._attempt);
    this._setState("backoff");
    this._events.onAttempt?.(this._attempt, delay);

    this._timer = setTimeout(async () => {
      this._attempt++;
      this._setState("connecting");
      try {
        const ok = await connect();
        if (ok) {
          this._setState("connected");
          this._attempt = 0;
        } else {
          this.scheduleRetry(connect);
        }
      } catch {
        this.scheduleRetry(connect);
      }
    }, delay);

    return true;
  }

  onDisconnect(connect: () => Promise<boolean>): boolean {
    if (this._state === "exhausted") return false;
    return this.scheduleRetry(connect);
  }

  onConnected(): void {
    this._attempt = 0;
    this._setState("connected");
  }

  reset(): void {
    if (this._timer !== undefined) {
      clearTimeout(this._timer);
      this._timer = undefined;
    }
    this._attempt = 0;
    this._setState("idle");
  }

  dispose(): void {
    if (this._timer !== undefined) {
      clearTimeout(this._timer);
      this._timer = undefined;
    }
  }

  private _setState(s: ReconnectState): void {
    if (this._state !== s) {
      this._state = s;
      this._events.onStateChange?.(s);
    }
  }
}
