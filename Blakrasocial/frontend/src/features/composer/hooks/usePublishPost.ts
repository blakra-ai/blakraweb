import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { request } from "@/shared/api/httpClient";
import type { PublishPostRequest, PublishPostResponse } from "@/shared/api/types";

/** Publishes with an Idempotency-Key. Retrying the *same* payload (after a timeout or a
 *  network error) reuses the key, so the backend never posts twice; a changed payload gets a new key. */
export function usePublishPost() {
  const client = useQueryClient();
  const last = useRef<{ fingerprint: string; key: string } | null>(null);

  return useMutation({
    mutationFn: (body: PublishPostRequest) => {
      const fingerprint = JSON.stringify(body);
      if (last.current?.fingerprint !== fingerprint) {
        last.current = { fingerprint, key: crypto.randomUUID() };
      }
      return request<PublishPostResponse>("/posts", {
        method: "POST",
        body,
        headers: { "Idempotency-Key": last.current.key },
      });
    },
    onSuccess: () => {
      last.current = null;
      void client.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
