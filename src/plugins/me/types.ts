// Copyright (c) 2026 ArchAstro Inc. All Rights Reserved.

export type OrgRole = "admin" | "member" | "viewer";

export interface ProfilePicture {
  url: string;
  contentType: string | null;
  width: number | null;
  height: number | null;
}

export interface ViewerContext {
  userId: string;
  appId: string | null;
  orgId: string | null;
  orgName: string | null;
  orgSlug: string | null;
  orgRole: OrgRole | null;
  sandboxId: string | null;
}

export interface CurrentUser {
  id: string;
  email: string | null;
  name: string | null;
  profilePicture: ProfilePicture | null;
  viewer: ViewerContext;
}

export interface ProfilePictureUpload {
  bytes: Uint8Array;
  contentType: string;
  filename: string;
}

export type MeUpdate =
  | {
      name: string | null;
      profilePicture?: ProfilePictureUpload | null;
    }
  | {
      name?: string | null;
      profilePicture: ProfilePictureUpload | null;
    };
