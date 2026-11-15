import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { test, type TestContext } from "node:test";
import { createKeyPressSound } from "../src/lib/features/hero/key-press-sound.ts";

function audioStub(t: TestContext) {
  class Voice {
    buffer = undefined;
    onended: (() => void) | null = null;
    started = false;
    stopped = false;
    connected = false;
    connect() {
      this.connected = true;
    }
    disconnect() {
      this.connected = false;
    }
    start() {
      this.started = true;
    }
    stop() {
      this.stopped = true;
    }
  }
  const contexts: Context[] = [];
  class Context {
    state = "suspended";
    decodeCount = 0;
    voices: Voice[] = [];
    destination = {};
    constructor() {
      contexts.push(this);
    }
    createGain() {
      return { gain: { value: 0 }, connect() {}, disconnect() {} };
    }
    resume() {
      this.state = "running";
      return Promise.resolve();
    }
    decodeAudioData() {
      this.decodeCount++;
      return Promise.resolve({ duration: 0.195 });
    }
    createBufferSource() {
      const voice = new Voice();
      this.voices.push(voice);
      return voice;
    }
    close() {
      this.state = "closed";
      return Promise.resolve();
    }
  }
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "AudioContext");
  Object.defineProperty(globalThis, "AudioContext", { configurable: true, value: Context });
  t.after(() => {
    if (descriptor) Object.defineProperty(globalThis, "AudioContext", descriptor);
    else Reflect.deleteProperty(globalThis, "AudioContext");
  });
  return contexts;
}

test("key sound waits for activation and reuses one decode with overlapping voices", async (t) => {
  const contexts = audioStub(t);
  let signal: AbortSignal | null | undefined;
  const fetch = t.mock.method(globalThis, "fetch", async (...[_url, init]: Parameters<typeof globalThis.fetch>) => {
    signal = init?.signal;
    return new Response(new Uint8Array([1, 2, 3]));
  });
  const sound = createKeyPressSound({ src: "/sounds/keycap-press.wav", volume: 0.35 });
  await setImmediate();
  assert.equal(contexts.length, 0, "preloading must not create or start an audio context");
  sound.play();
  assert.equal(contexts[0].state, "running", "resume happens in the input handler");
  sound.play();
  await setImmediate();
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(contexts[0].decodeCount, 1);
  assert.equal(contexts[0].voices.length, 2);
  assert.ok(contexts[0].voices.every((voice) => voice.started && !voice.stopped));
  contexts[0].voices[0].onended?.();
  assert.equal(contexts[0].voices[0].connected, false);
  sound.destroy();
  assert.equal(contexts[0].voices[1].stopped, true);
  assert.equal(contexts[0].state, "closed");
  assert.equal(signal?.aborted, true);
  sound.play();
  assert.equal(contexts[0].voices.length, 2, "disposed players cannot start another voice");
});

test("teardown cancels a pending first press before its recording becomes available", async (t) => {
  const contexts = audioStub(t);
  let resolve!: (value: Response) => void;
  t.mock.method(globalThis, "fetch", () => new Promise<Response>((done) => (resolve = done)));
  const sound = createKeyPressSound({ src: "/sounds/keycap-press.wav", volume: 0.35 });
  sound.play();
  sound.destroy();
  resolve(new Response(new Uint8Array([1, 2, 3])));
  await setImmediate();
  assert.equal(contexts[0].decodeCount, 0);
  assert.equal(contexts[0].voices.length, 0);
});

test("an unavailable recording leaves the key handler usable", async (t) => {
  const contexts = audioStub(t);
  t.mock.method(globalThis, "fetch", () => Promise.reject(new Error("Offline")));
  const sound = createKeyPressSound({ src: "/sounds/keycap-press.wav", volume: 0.35 });
  assert.doesNotThrow(() => sound.play());
  await setImmediate();
  assert.equal(contexts[0].voices.length, 0);
  sound.destroy();
});
