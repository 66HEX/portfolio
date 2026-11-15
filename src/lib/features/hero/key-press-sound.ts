type KeyPressSoundOptions = {
  src: string;
  volume: number;
};

/** One decoded recording, with independent voices for overlapping key presses. */
export function createKeyPressSound({ src, volume }: KeyPressSoundOptions) {
  const request = new AbortController();
  let disposed = false;
  let context: AudioContext | undefined;
  let gain: GainNode | undefined;
  let decoded: Promise<AudioBuffer | undefined> | undefined;
  const voices = new Set<AudioBufferSourceNode>();
  const data = fetch(src, { signal: request.signal })
    .then((response) => (response.ok ? response.arrayBuffer() : undefined))
    .catch(() => undefined);

  function play(): void {
    if (disposed || volume <= 0 || typeof AudioContext === "undefined") return;
    try {
      if (!context) {
        context = new AudioContext({ latencyHint: "interactive" });
        gain = context.createGain();
        gain.gain.value = Math.min(1, Math.max(0, volume));
        gain.connect(context.destination);
      }
      const current = context;
      // Resume in the input handler, before waiting for fetch or decoding.
      const resumed = current.state === "running" ? Promise.resolve() : current.resume();
      decoded ??= data
        .then((bytes) => (bytes && !disposed ? current.decodeAudioData(bytes) : undefined))
        .catch(() => undefined);
      void Promise.all([resumed, decoded])
        .then(([, buffer]) => {
          if (disposed || !buffer || current.state !== "running") return;
          const voice = current.createBufferSource();
          voice.buffer = buffer;
          voice.connect(gain!);
          voice.onended = () => {
            voices.delete(voice);
            voice.disconnect();
          };
          voices.add(voice);
          voice.start();
        })
        .catch(() => {
          // Audio may be unavailable; key actions and rendering remain usable.
        });
    } catch {
      // Unsupported or blocked audio must not interrupt the key callback.
    }
  }

  function destroy(): void {
    disposed = true;
    request.abort();
    for (const voice of voices) {
      voice.onended = null;
      voice.stop();
      voice.disconnect();
    }
    voices.clear();
    gain?.disconnect();
    if (context) void context.close().catch(() => {});
  }

  return { play, destroy };
}
