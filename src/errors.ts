// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

export class InternSDKError extends Error {
  override readonly name: string = "InternSDKError";
}

export class RuntimeUnavailableError extends InternSDKError {
  override readonly name = "RuntimeUnavailableError";

  constructor() {
    super(
      "Intern runtime is unavailable. Run inside an Intern host or pass a runtime to new Client({ runtime }).",
    );
  }
}

export class RuntimeProtocolError extends InternSDKError {
  override readonly name = "RuntimeProtocolError";

  constructor(readonly receivedVersion: unknown) {
    super(
      `Unsupported Intern runtime protocol version: ${String(receivedVersion)}`,
    );
  }
}

export class RuntimeContractError extends InternSDKError {
  override readonly name = "RuntimeContractError";

  constructor(detail: string) {
    super(`Intern runtime protocol is malformed: ${detail}`);
  }
}

export class PluginUnavailableError extends InternSDKError {
  override readonly name = "PluginUnavailableError";

  constructor(readonly plugin: string) {
    super(`Intern runtime plugin is unavailable: ${plugin}`);
  }
}

export class PluginContractError extends InternSDKError {
  override readonly name = "PluginContractError";

  constructor(readonly plugin: string) {
    super(`Intern runtime plugin has an invalid implementation: ${plugin}`);
  }
}
