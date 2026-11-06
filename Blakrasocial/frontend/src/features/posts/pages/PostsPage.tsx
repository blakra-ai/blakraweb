import { PenSquare } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ApiError } from "@/shared/api/ApiError";
import type { Platform } from "@/shared/api/types";
import { PLATFORMS } from "@/shared/api/types";
import { PLATFORM_META } from "@/shared/platform";
import { Button, Label, NativeSelect, Skeleton } from "@/shared/ui";
import { ErrorState, PageHeader } from "@/app/layout/PageParts";
import { PostRow } from "../components/PostRow";
import { useDeletePost, usePosts } from "../hooks/usePosts";

export default function PostsPage() {
  const { t } = useTranslation();
  const [platform, setPlatform] = useState<Platform | "">("");
  const [lastDays, setLastDays] = useState(30);
  const posts = usePosts({ platform: platform || undefined, lastDays });
  const remove = useDeletePost();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("posts.title")}
        description={t("posts.description")}
        action={
          <Button asChild>
            <Link to="/compose">
              <PenSquare /> {t("nav.compose")}
            </Link>
          </Button>
        }
      />
      <div className="flex flex-wrap gap-3">
        <div className="w-44 space-y-1">
          <Label htmlFor="filter-platform">{t("posts.network")}</Label>
          <NativeSelect id="filter-platform" value={platform} onChange={(e) => setPlatform(e.target.value as Platform | "")}>
            <option value="">{t("posts.allNetworks")}</option>
            {PLATFORMS.filter((p) => p !== "whatsapp").map((p) => (
              <option key={p} value={p}>
                {PLATFORM_META[p].name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="w-44 space-y-1">
          <Label htmlFor="filter-days">{t("posts.period")}</Label>
          <NativeSelect id="filter-days" value={lastDays} onChange={(e) => setLastDays(Number(e.target.value))}>
            {[7, 30, 90, 365].map((d) => (
              <option key={d} value={d}>
                {t("posts.lastDays", { count: d })}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {posts.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : posts.isError ? (
        <ErrorState error={posts.error} onRetry={() => void posts.refetch()} />
      ) : posts.data.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{t("posts.empty")}</div>
      ) : (
        <div className="space-y-3">
          {posts.data.items.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              deleting={remove.isPending && remove.variables === post.id}
              onDelete={() =>
                remove.mutate(post.id, {
                  onSuccess: () => toast.success(t("posts.deleted")),
                  onError: (e) => toast.error(e instanceof ApiError ? e.message : t("errors.generic")),
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
