export type Unit =
  | "m"
  | "s"
  | "ms"
  | "Hz"
  | "rad"
  | "deg"
  | "rad/s"
  | "m/s^2"
  | "kg/m^3"
  | "Pa"
  | "GPa"
  | "dBFS"
  | "px"
  | "degC"
  | "K"
  | "1/s"
  | "1";

export type Quantity<U extends Unit> = number & { readonly __unit: U };

export function q<U extends Unit>(value: number, _unit: U): Quantity<U> {
  return value as Quantity<U>;
}

export function add<U extends Unit>(
  a: Quantity<U>,
  b: Quantity<U>,
): Quantity<U> {
  return ((a as number) + (b as number)) as Quantity<U>;
}

export function sub<U extends Unit>(
  a: Quantity<U>,
  b: Quantity<U>,
): Quantity<U> {
  return ((a as number) - (b as number)) as Quantity<U>;
}

export function scale<U extends Unit>(
  a: Quantity<U>,
  factor: number,
): Quantity<U> {
  return ((a as number) * factor) as Quantity<U>;
}

export function negate<U extends Unit>(a: Quantity<U>): Quantity<U> {
  return (-(a as number)) as Quantity<U>;
}

export function abs<U extends Unit>(a: Quantity<U>): Quantity<U> {
  return Math.abs(a as number) as Quantity<U>;
}

export function rawValue<U extends Unit>(a: Quantity<U>): number {
  return a as number;
}

type ConversionPair = `${Unit}->${Unit}`;

const CONVERSION_FACTORS: Partial<Record<ConversionPair, number>> = {
  "deg->rad": Math.PI / 180,
  "rad->deg": 180 / Math.PI,
  "ms->s": 0.001,
  "s->ms": 1000,
  "Hz->1/s": 1,
  "1/s->Hz": 1,
  "Pa->GPa": 1e-9,
  "GPa->Pa": 1e9,
  "degC->K": 1,
  "K->degC": 1,
};

const CONVERSION_OFFSETS: Partial<Record<ConversionPair, number>> = {
  "degC->K": 273.15,
  "K->degC": -273.15,
};

export function convert<From extends Unit, To extends Unit>(
  value: Quantity<From>,
  _from: From,
  to: To,
): Quantity<To> {
  const key = `${_from}->${to}` as ConversionPair;
  const factor = CONVERSION_FACTORS[key];
  if (factor === undefined) {
    throw new Error(`No conversion from "${_from}" to "${to}"`);
  }
  const offset = CONVERSION_OFFSETS[key] ?? 0;
  return ((value as number) * factor + offset) as Quantity<To>;
}

export function isConvertible(from: Unit, to: Unit): boolean {
  return `${from}->${to}` in CONVERSION_FACTORS;
}
