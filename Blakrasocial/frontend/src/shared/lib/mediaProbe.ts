/** Reads dimensions and duration in the browser, for instant feedback before upload.
 *  The backend measures the stored file again; these numbers are never trusted server-side. */
export interface ProbedMedia {
  kind: "image" | "video";
  width: number;
  height: number;
  durationSeconds: number | null;
}

export function probeMedia(file: File): Promise<ProbedMedia> {
  const url = URL.createObjectURL(file);
  const done = <T,>(value: T): T => {
    URL.revokeObjectURL(url);
    return value;
  };

  if (file.type.startsWith("image/")) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(done({ kind: "image", width: img.naturalWidth, height: img.naturalHeight, durationSeconds: null }));
      img.onerror = () => reject(done(new Error("unreadable image")));
      img.src = url;
    });
  }
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () =>
      resolve(done({ kind: "video", width: video.videoWidth, height: video.videoHeight, durationSeconds: video.duration }));
    video.onerror = () => reject(done(new Error("unreadable video")));
    video.src = url;
  });
}
