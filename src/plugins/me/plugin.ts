// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

import type { RuntimeProvider } from "../../runtime/provider.js";
import type { CurrentUser, MeUpdate, ProfilePictureUpload } from "./types.js";

interface MeOperations {
  get: { input: undefined; output: CurrentUser };
  update: { input: MeUpdate; output: CurrentUser };
}

export interface MePlugin {
  get(): Promise<CurrentUser>;
  update(input: MeUpdate): Promise<CurrentUser>;
  updateProfilePicture(
    profilePicture: ProfilePictureUpload | null,
  ): Promise<CurrentUser>;
}

/** @internal */
export class MePluginClient implements MePlugin {
  readonly #runtime: RuntimeProvider;

  /** @internal Client owns plugin construction. */
  constructor(runtime: RuntimeProvider) {
    this.#runtime = runtime;
  }

  async get(): Promise<CurrentUser> {
    return this.#invoke("get", undefined);
  }

  async update(input: MeUpdate): Promise<CurrentUser> {
    return this.#invoke("update", input);
  }

  async updateProfilePicture(
    profilePicture: ProfilePictureUpload | null,
  ): Promise<CurrentUser> {
    return this.update({ profilePicture });
  }

  #invoke<Operation extends keyof MeOperations>(
    operation: Operation,
    input: MeOperations[Operation]["input"],
  ): Promise<MeOperations[Operation]["output"]> {
    return this.#runtime.invoke<MeOperations[Operation]["output"]>(
      "me",
      operation,
      input,
    );
  }
}
