import Client, {
  type CurrentUser,
  type MeUpdate,
  type ProfilePictureUpload,
} from "../src/index.js";
import {
  INTERN_PROTOCOL_VERSION,
  createRuntimeHost,
  type InternRuntime,
  type MeImplementation,
} from "../src/runtime/index.js";

declare const implementation: MeImplementation;

const runtime = {
  protocolVersion: INTERN_PROTOCOL_VERSION,
  plugins: { me: implementation },
} satisfies InternRuntime;

const client = new Client({ runtime });
const host = createRuntimeHost(() => runtime);
const current: Promise<CurrentUser> = client.me.get();
const update: MeUpdate = { name: "Ada" };
const picture: ProfilePictureUpload = {
  bytes: new Uint8Array(),
  contentType: "image/png",
  filename: "avatar.png",
};

void current;
void host;
void client.me.update(update);
void client.me.updateProfilePicture(picture);

// @ts-expect-error Runtime and resolver are mutually exclusive.
new Client({ runtime, resolveRuntime: () => runtime });

// @ts-expect-error me.update accepts only declared profile fields.
void client.me.update({ displayName: "Ada" });

// @ts-expect-error me.update must change at least one field.
void client.me.update({});

void client.me.updateProfilePicture({
  // @ts-expect-error profile picture bytes are binary, not base64 strings.
  bytes: "AP8=",
  contentType: "image/png",
  filename: "a.png",
});
