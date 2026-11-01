import { useCallback, useEffect, useRef, useState } from "react";
import { probeMedia } from "@/shared/lib/mediaProbe";
import { mediaApi } from "../api/mediaApi";
import { uploadToPresignedUrl } from "../services/directUploader";
import type { UploadItem } from "../types";

/** Manages a list of files: browser-side probe → presigned URL → direct upload with progress. */
export function useMediaUpload() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const controllers = useRef(new Map<string, AbortController>());

  const patch = useCallback((id: string, update: Partial<UploadItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...update } : item)));
  }, []);

  const uploadOne = useCallback(
    async (item: UploadItem) => {
      const controller = new AbortController();
      controllers.current.set(item.id, controller);
      try {
        const probe = await probeMedia(item.file).catch(() => undefined);
        patch(item.id, { probe, status: "uploading" });
        const ticket = await mediaApi.requestUploadUrl({
          fileName: item.file.name,
          contentType: item.file.type,
          sizeBytes: item.file.size,
        });
        await uploadToPresignedUrl(
          ticket.uploadUrl,
          item.file,
          ticket.contentType,
          (progress) => patch(item.id, { progress }),
          controller.signal,
        );
        patch(item.id, { status: "done", progress: 100, accessUrl: ticket.accessUrl, mediaToken: ticket.mediaToken });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        patch(item.id, { status: "error", error: error instanceof Error ? error.message : "upload_failed" });
      } finally {
        controllers.current.delete(item.id);
      }
    },
    [patch],
  );

  const add = useCallback(
    (files: File[]) => {
      const created = files.map<UploadItem>((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "probing",
        progress: 0,
      }));
      setItems((current) => [...current, ...created]);
      created.forEach((item) => void uploadOne(item));
    },
    [uploadOne],
  );

  const remove = useCallback((id: string) => {
    controllers.current.get(id)?.abort();
    setItems((current) => {
      const item = current.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return current.filter((i) => i.id !== id);
    });
  }, []);

  const retry = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (item) {
        patch(id, { status: "probing", progress: 0, error: undefined });
        void uploadOne(item);
      }
    },
    [items, patch, uploadOne],
  );

  const move = useCallback((id: string, delta: -1 | 1) => {
    setItems((current) => {
      const index = current.findIndex((i) => i.id === id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setItems((current) => {
      current.forEach((i) => URL.revokeObjectURL(i.previewUrl));
      return [];
    });
  }, []);

  useEffect(() => {
    const active = controllers.current;
    return () => active.forEach((c) => c.abort());
  }, []);

  const isUploading = items.some((i) => i.status === "probing" || i.status === "uploading");
  return { items, add, remove, retry, move, reset, isUploading };
}
