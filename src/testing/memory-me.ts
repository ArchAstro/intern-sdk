// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

import type { MeImplementation } from "../plugins/me/implementation.js";
import type {
  CurrentUser,
  MeUpdate,
  ProfilePicture,
  ProfilePictureUpload,
} from "../plugins/me/types.js";

export class MemoryMeImplementation implements MeImplementation {
  #current: CurrentUser;

  constructor(initial: CurrentUser) {
    this.#current = clone(initial);
  }

  async get(): Promise<CurrentUser> {
    return clone(this.#current);
  }

  async update(input: MeUpdate): Promise<CurrentUser> {
    if (
      !Object.hasOwn(input, "name") &&
      !Object.hasOwn(input, "profilePicture")
    ) {
      throw new TypeError("ME update must change at least one field");
    }
    this.#current = {
      ...this.#current,
      name: Object.hasOwn(input, "name")
        ? (input.name ?? null)
        : this.#current.name,
      profilePicture: Object.hasOwn(input, "profilePicture")
        ? pictureFromUpload(input.profilePicture ?? null)
        : this.#current.profilePicture,
    };
    return clone(this.#current);
  }

  snapshot(): CurrentUser {
    return clone(this.#current);
  }
}

function pictureFromUpload(
  upload: ProfilePictureUpload | null,
): ProfilePicture | null {
  if (upload === null) return null;
  return {
    url: `data:${upload.contentType};base64,${base64(upload.bytes)}`,
    contentType: upload.contentType,
    width: null,
    height: null,
  };
}

function base64(bytes: Uint8Array): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let encoded = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    const bits = (first << 16) | (second << 8) | third;
    encoded += alphabet.charAt((bits >> 18) & 63);
    encoded += alphabet.charAt((bits >> 12) & 63);
    encoded +=
      index + 1 < bytes.length ? alphabet.charAt((bits >> 6) & 63) : "=";
    encoded += index + 2 < bytes.length ? alphabet.charAt(bits & 63) : "=";
  }
  return encoded;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
