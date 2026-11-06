import { useQuery } from "@tanstack/react-query";
import { request } from "@/shared/api/httpClient";
import type { ContentSpec, ContentType, Platform, PlatformRulesResponse } from "@/shared/api/types";

/** Platform limits come from the backend, so the UI enforces exactly what the server enforces. */
export function usePlatformRules() {
  return useQuery({
    queryKey: ["platform-rules"],
    queryFn: ({ signal }) => request<PlatformRulesResponse>("/platforms/rules", { anonymous: true, signal }),
    staleTime: 60 * 60 * 1000,
    select: (data) => new RulesIndex(data),
  });
}

export class RulesIndex {
  private readonly specs = new Map<Platform, Map<ContentType, ContentSpec>>();
  private readonly connectable = new Set<Platform>();

  constructor(data: PlatformRulesResponse) {
    for (const platform of data.platforms) {
      this.specs.set(platform.platform, new Map(platform.contentTypes.map((c) => [c.contentType, c])));
      if (platform.connectable) this.connectable.add(platform.platform);
    }
  }

  /** Whether customers can connect this network themselves in this deployment. */
  isConnectable(platform: Platform): boolean {
    return this.connectable.has(platform);
  }

  contentTypes(platform: Platform): ContentType[] {
    return [...(this.specs.get(platform)?.keys() ?? [])];
  }

  spec(platform: Platform, contentType: ContentType): ContentSpec | undefined {
    return this.specs.get(platform)?.get(contentType);
  }
}
