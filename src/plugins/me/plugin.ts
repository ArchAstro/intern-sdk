// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

import type { MeImplementation } from "./implementation.js";
import type { CurrentUser, MeUpdate, ProfilePictureUpload } from "./types.js";

type ImplementationProvider = () => MeImplementation;

export interface MePlugin {
  get(): Promise<CurrentUser>;
  update(input: MeUpdate): Promise<CurrentUser>;
  updateProfilePicture(
    profilePicture: ProfilePictureUpload | null,
  ): Promise<CurrentUser>;
}

/** @internal */
export class MePluginClient implements MePlugin {
  readonly #implementation: ImplementationProvider;

  /** @internal Client owns plugin construction. */
  constructor(implementation: ImplementationProvider) {
    this.#implementation = implementation;
  }

  async get(): Promise<CurrentUser> {
    return this.#implementation().get();
  }

  async update(input: MeUpdate): Promise<CurrentUser> {
    return this.#implementation().update(input);
  }

  async updateProfilePicture(
    profilePicture: ProfilePictureUpload | null,
  ): Promise<CurrentUser> {
    return this.update({ profilePicture });
  }
}
