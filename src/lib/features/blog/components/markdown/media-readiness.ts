/** Decode is an animation enhancement, never an unbounded gate on interaction. */
export function decodeImage(image: HTMLImageElement, signal: AbortSignal, budget = 200): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve(false);
    const finish = (decoded = false) => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      resolve(decoded);
    };
    const abort = () => finish();
    const timeout = setTimeout(abort, budget);
    signal.addEventListener("abort", abort, { once: true });
    try {
      image.decode().then(() => finish(image.naturalWidth > 0), abort);
    } catch {
      finish();
    }
  });
}

export function videoFrame(video: HTMLVideoElement | undefined, poster: string) {
  if (video && video.readyState >= 2 && video.videoWidth && video.videoHeight) {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    try {
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0);
        return canvas;
      }
    } catch {
      // The media may lose its decoded frame between readyState and drawImage.
    }
  }
  const image = new Image();
  image.src = poster;
  image.alt = "";
  return image;
}

export function copyFrame(frame: HTMLElement, poster: string) {
  if (frame instanceof HTMLCanvasElement) {
    const copy = document.createElement("canvas");
    copy.width = frame.width;
    copy.height = frame.height;
    try {
      const context = copy.getContext("2d");
      if (context) {
        context.drawImage(frame, 0, 0);
        return copy;
      }
    } catch {
      // Canvas allocation/copy can fail under memory pressure.
    }
    return videoFrame(undefined, poster);
  }
  return frame.cloneNode(false) as HTMLElement;
}

/** Event-driven handoff: never delays a dialog transition, and every listener
 * belongs to the operation's AbortSignal. A stalled player keeps its poster. */
export function prepareVideo(video: HTMLVideoElement, time: number, signal: AbortSignal, ready: () => void) {
  if (signal.aborted) return;
  let sought = false;
  let finished = false;
  const events = ["loadedmetadata", "loadeddata", "canplay", "seeked"] as const;
  const cleanup = () => {
    finished = true;
    for (const event of events) video.removeEventListener(event, advance);
    video.removeEventListener("error", cleanup);
    signal.removeEventListener("abort", cleanup);
  };
  const advance = () => {
    if (finished || signal.aborted || video.readyState < 1) return;
    if (!sought) {
      sought = true;
      const target = Number.isFinite(video.duration) ? Math.min(time, video.duration) : time;
      if (Math.abs(video.currentTime - target) > 0.01) {
        try {
          video.currentTime = target;
        } catch {
          cleanup();
          return;
        }
      }
    }
    if (video.seeking || video.readyState < 2) return;
    cleanup();
    ready();
  };
  for (const event of events) video.addEventListener(event, advance);
  video.addEventListener("error", cleanup, { once: true });
  signal.addEventListener("abort", cleanup, { once: true });
  video.preload = "auto";
  if (video.networkState === HTMLMediaElement.NETWORK_EMPTY) video.load();
  advance();
}
