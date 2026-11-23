export interface BarClock {
  readonly bpm: number;
  readonly beatsPerBar: number;
  readonly barLengthS: number;
  setBpm(bpm: number): void;
  currentBeat(now: number): number;
  currentBar(now: number): number;
  nextBarStart(now: number): number;
  beatDurationS(): number;
}

export function createBarClock(
  initialBpm: number,
  startTime: number,
  beatsPerBar = 4,
): BarClock {
  let bpm = Math.max(60, Math.min(160, initialBpm));

  function beatDurationS(): number {
    return 60 / bpm;
  }

  function barLengthS(): number {
    return beatDurationS() * beatsPerBar;
  }

  function elapsed(now: number): number {
    return Math.max(0, now - startTime);
  }

  return {
    get bpm() { return bpm; },
    get beatsPerBar() { return beatsPerBar; },
    get barLengthS() { return barLengthS(); },

    setBpm(newBpm: number) {
      bpm = Math.max(60, Math.min(160, newBpm));
    },

    currentBeat(now: number): number {
      return Math.floor(elapsed(now) / beatDurationS()) % beatsPerBar;
    },

    currentBar(now: number): number {
      return Math.floor(elapsed(now) / barLengthS());
    },

    nextBarStart(now: number): number {
      const bar = Math.floor(elapsed(now) / barLengthS());
      return startTime + (bar + 1) * barLengthS();
    },

    beatDurationS,
  };
}
