// Helpers to turn stored video URLs into something embeddable/playable.

export function getEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    // YouTube watch → embed
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      return `https://player.vimeo.com/video${u.pathname}`;
    }
  } catch {
    // ignore, return original
  }
  return url;
}

export function videoSrc(videoType: string | null | undefined, videoUrl: string | null | undefined): string {
  if (!videoUrl) return "";
  if (videoType === "upload") {
    // backend stores an api path like /api/v1/uploads/learning-videos/xxx
    return videoUrl.startsWith("http")
      ? videoUrl
      : `${process.env.NEXT_PUBLIC_API_URL ?? ""}${videoUrl.startsWith("/") ? "" : "/"}${videoUrl}`;
  }
  return getEmbedUrl(videoUrl);
}
