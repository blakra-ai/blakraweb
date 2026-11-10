import { Briefcase, Camera, MessageCircle, Music2, ThumbsUp, type LucideIcon } from "lucide-react";
import type { ContentType, Platform } from "@/shared/api/types";
import { cn } from "@/shared/lib/cn";

export interface PlatformMeta {
  id: Platform;
  name: string;
  icon: LucideIcon;
  /** Tailwind classes for the brand tile. */
  tile: string;
  /** Preview frame aspect (width / height) per content type. */
  previewRatio: Partial<Record<ContentType, number>>;
}

export const PLATFORM_META: Record<Platform, PlatformMeta> = {
  instagram: {
    id: "instagram",
    name: "Instagram",
    icon: Camera,
    tile: "bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 text-white",
    previewRatio: { post: 4 / 5, carousel: 4 / 5, reel: 9 / 16, story: 9 / 16 },
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    icon: ThumbsUp,
    tile: "bg-[#1877F2] text-white",
    previewRatio: { post: 1.91, reel: 9 / 16, story: 9 / 16 },
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    icon: Music2,
    tile: "bg-black text-white ring-1 ring-white/10",
    previewRatio: { video: 9 / 16, photo: 9 / 16 },
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    icon: Briefcase,
    tile: "bg-[#0A66C2] text-white",
    previewRatio: { post: 1.91, video: 16 / 9, document: 3 / 4 },
  },
  whatsapp: {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageCircle,
    tile: "bg-[#25D366] text-white",
    previewRatio: { message: 3 / 4 },
  },
};

export function PlatformTile({ platform, size = "md" }: { platform: Platform; size?: "sm" | "md" | "lg" }) {
  const meta = PLATFORM_META[platform];
  const Icon = meta.icon;
  const dims = { sm: "size-7 rounded-lg [&_svg]:size-3.5", md: "size-10 rounded-xl [&_svg]:size-5", lg: "size-12 rounded-2xl [&_svg]:size-6" }[size];
  return (
    <span className={cn("inline-flex shrink-0 items-center justify-center shadow-sm", meta.tile, dims)} aria-hidden>
      <Icon />
    </span>
  );
}
