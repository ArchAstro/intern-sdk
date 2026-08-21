// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

export type RuntimeWireValue =
  | { readonly type: "undefined" }
  | { readonly type: "null" }
  | { readonly type: "boolean"; readonly value: boolean }
  | { readonly type: "number"; readonly value: number }
  | { readonly type: "string"; readonly value: string }
  | { readonly type: "bytes"; readonly value: string }
  | { readonly type: "array"; readonly value: readonly RuntimeWireValue[] }
  | {
      readonly type: "object";
      readonly value: Readonly<Record<string, RuntimeWireValue>>;
    };

/** Converts supported invocation values into an unambiguous JSON-safe tree. */
export function encodeRuntimeWireValue(value: unknown): RuntimeWireValue {
  return encode(value, new WeakSet<object>());
}

/** Restores a JSON-parsed runtime wire tree, including binary values. */
export function decodeRuntimeWireValue(value: RuntimeWireValue): unknown {
  switch (value.type) {
    case "undefined":
      return undefined;
    case "null":
      return null;
    case "boolean":
    case "number":
    case "string":
      return value.value;
    case "bytes":
      return decodeBase64(value.value);
    case "array":
      return value.value.map(decodeRuntimeWireValue);
    case "object":
      return Object.fromEntries(
        Object.entries(value.value).map(([key, child]) => [
          key,
          decodeRuntimeWireValue(child),
        ]),
      );
  }
}

function encode(value: unknown, ancestors: WeakSet<object>): RuntimeWireValue {
  if (value === undefined) return { type: "undefined" };
  if (value === null) return { type: "null" };
  if (typeof value === "boolean") return { type: "boolean", value };
  if (typeof value === "string") return { type: "string", value };
  if (typeof value === "number" && Number.isFinite(value)) {
    return { type: "number", value };
  }
  if (value instanceof Uint8Array) {
    return { type: "bytes", value: encodeBase64(value) };
  }
  if (typeof value !== "object") {
    throw new TypeError(`Unsupported Intern runtime value: ${typeof value}`);
  }
  if (ancestors.has(value)) {
    throw new TypeError("Intern runtime values cannot contain cycles");
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return {
        type: "array",
        value: value.map((child) => encode(child, ancestors)),
      };
    }
    const prototype = Object.getPrototypeOf(value) as object | null;
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("Intern runtime values must use plain objects");
    }
    return {
      type: "object",
      value: Object.fromEntries(
        Object.entries(value).map(([key, child]) => [
          key,
          encode(child, ancestors),
        ]),
      ),
    };
  } finally {
    ancestors.delete(value);
  }
}

function encodeBase64(bytes: Uint8Array): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let encoded = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const bits = (first << 16) | (second << 8) | third;
    encoded += alphabet[(bits >> 18) & 63];
    encoded += alphabet[(bits >> 12) & 63];
    encoded += index + 1 < bytes.length ? alphabet[(bits >> 6) & 63] : "=";
    encoded += index + 2 < bytes.length ? alphabet[bits & 63] : "=";
  }
  return encoded;
}

function decodeBase64(value: string): Uint8Array {
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      value,
    )
  ) {
    throw new TypeError("Invalid Intern runtime byte encoding");
  }
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const output: number[] = [];
  for (let index = 0; index < value.length; index += 4) {
    const first = alphabet.indexOf(value[index] ?? "");
    const second = alphabet.indexOf(value[index + 1] ?? "");
    const third =
      value[index + 2] === "=" ? 0 : alphabet.indexOf(value[index + 2] ?? "");
    const fourth =
      value[index + 3] === "=" ? 0 : alphabet.indexOf(value[index + 3] ?? "");
    const bits = (first << 18) | (second << 12) | (third << 6) | fourth;
    output.push((bits >> 16) & 255);
    if (value[index + 2] !== "=") output.push((bits >> 8) & 255);
    if (value[index + 3] !== "=") output.push(bits & 255);
  }
  return Uint8Array.from(output);
}
