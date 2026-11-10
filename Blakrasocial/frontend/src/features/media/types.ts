import type { ProbedMedia } from "@/shared/lib/mediaProbe";

export type UploadStatus = "probing" | "uploading" | "done" | "error";

export interface UploadItem {
  id: string;
  file: File;
  previewUrl: string;
  status: UploadStatus;
  progress: number;
  probe?: ProbedMedia;
  /** Set once uploaded: what the publish request needs. */
  accessUrl?: string;
  mediaToken?: string;
  error?: string;
}

export const ACCEPTED_TYPES: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "video/mp4": [".mp4"],
  "video/quicktime": [".mov"],
};
export const MAX_FILE_BYTES = 5 * 1024 ** 3;
export const MAX_FILES = 35;
