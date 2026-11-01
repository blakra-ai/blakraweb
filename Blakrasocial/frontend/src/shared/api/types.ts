/** DTOs come from the backend's OpenAPI document (npm run gen:api), so shapes cannot drift. */
import type { components } from "./schema.gen";

type Schemas = components["schemas"];

export type Platform = Schemas["Platform"];
export type ContentType = Schemas["ContentType"];
export type MediaKind = Schemas["MediaKind"];
export type PublishState = Schemas["PublishState"];
export type TikTokVisibility = Schemas["TikTokVisibility"];
export type LinkedInVisibility = Schemas["LinkedInVisibility"];

export type Account = Schemas["AccountResponse"];
export type AccountsResponse = Schemas["AccountsResponse"];
export type ConnectUrlResponse = Schemas["ConnectUrlResponse"];

export type UploadUrlRequest = Schemas["UploadUrlRequest"];
export type UploadUrlResponse = Schemas["UploadUrlResponse"];

export type PublishPostRequest = Schemas["PublishPostRequest"];
export type PublishPostResponse = Schemas["PublishPostResponse"];
export type PostStatus = Schemas["PostStatusOut"];
export type PlatformResult = Schemas["PlatformResultOut"];
export type PostListResponse = Schemas["PostListResponse"];
export type Issue = Schemas["ProblemIssue"];

export type PlatformRulesResponse = Schemas["PlatformRulesResponse"];
export type PlatformRules = Schemas["PlatformRulesOut"];
export type ContentSpec = Schemas["ContentSpecOut"];
export type MediaConstraints = Schemas["MediaConstraintsOut"];

export type TargetRequest = PublishPostRequest["targets"][number];

export const PLATFORMS = ["instagram", "facebook", "tiktok", "linkedin", "whatsapp"] as const satisfies readonly Platform[];
export const CONTENT_TYPES = ["post", "reel", "story", "carousel", "video", "photo", "document", "message"] as const satisfies readonly ContentType[];
export const TIKTOK_VISIBILITIES = ["public", "friends", "followers", "private"] as const satisfies readonly TikTokVisibility[];
export const LINKEDIN_VISIBILITIES = ["public", "connections", "loggedin"] as const satisfies readonly LinkedInVisibility[];
