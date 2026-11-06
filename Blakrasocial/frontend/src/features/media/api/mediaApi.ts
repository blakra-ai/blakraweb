import { request } from "@/shared/api/httpClient";
import type { UploadUrlRequest, UploadUrlResponse } from "@/shared/api/types";

export const mediaApi = {
  requestUploadUrl: (body: UploadUrlRequest) =>
    request<UploadUrlResponse>("/media/upload-url", { method: "POST", body }),
};
