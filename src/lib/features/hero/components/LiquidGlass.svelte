<script lang="ts">
  // Pixi's CSP adapter replaces generated functions with static uniform sync.
  import "pixi.js/unsafe-eval";
  import {
    Application,
    Geometry,
    Mesh,
    RendererType,
    Shader,
    RenderTarget,
    RenderTexture,
    UPDATE_PRIORITY,
  } from "pixi.js";
  import { onMount } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { cn } from "$lib/utils.js";

  const rendererFailureHandlers = new WeakMap<Application, (reason: string) => void>();

  function clampNumber(value: number, min: number, max: number, step: number): number {
    const finite = Number.isFinite(value) ? value : min;
    const rounded = Math.round((finite - min) / step) * step + min;
    return Math.min(max, Math.max(min, rounded));
  }

  function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "The graphics backend could not be initialized.";
  }

  async function initializeScene<T extends { app: Application; backend: ShaderBackend; destroy(): void }>(
    create: (preference: ShaderBackend) => Promise<T>,
    preference: ShaderBackend | undefined,
    cancelled: () => boolean,
    adopt: (scene: T) => void,
    onStatus?: (status: ShaderRuntimeStatus) => void,
    onRendererLost?: (backend: ShaderBackend, reason: string) => void,
  ): Promise<T> {
    let scene: T;
    let fallbackReason: string | undefined;
    try {
      try {
        scene = await create(preference ?? "webgpu");
      } catch (error) {
        if (cancelled() || preference === "webgl") throw error;
        fallbackReason = errorMessage(error);
        try {
          scene = await create("webgl");
        } catch (fallbackError) {
          throw new AggregateError([error, fallbackError], errorMessage(fallbackError), {
            cause: fallbackError,
          });
        }
      }
    } catch (error) {
      if (!cancelled()) onStatus?.({ state: "error", reason: errorMessage(error) });
      throw error;
    }
    // Consumer callbacks run after ownership transfer, outside backend selection.
    // Their errors must dispose this scene without initializing another renderer.
    try {
      if (onRendererLost) {
        const stop = observeRendererLoss(scene.app, scene.backend, onRendererLost);
        const dispose = scene.destroy;
        scene.destroy = () => {
          stop();
          dispose();
        };
      }
      adopt(scene);
      if (cancelled()) throw new Error("Shader mount was cancelled.");
      onStatus?.(
        scene.backend === "webgl" && preference !== "webgl"
          ? {
              state: "fallback",
              backend: "webgl",
              reason: fallbackReason ?? "WebGPU was unavailable; PixiJS selected WebGL.",
            }
          : { state: "ready", backend: scene.backend },
      );
      if (cancelled()) throw new Error("Shader mount was cancelled.");
      return scene;
    } catch (error) {
      scene.destroy();
      throw error;
    }
  }

  function runCleanup(cleanup: Array<() => void>): void {
    for (const dispose of cleanup.splice(0).reverse()) {
      try {
        dispose();
      } catch {
        // Cleanup is best-effort so one failed disposer cannot retain later resources.
      }
    }
  }

  type TextureLimits = { maxDimension: number; maxPixels: number };
  const textureLimitsCache = new WeakMap<Application["renderer"], TextureLimits>();
  function rendererTextureLimits(renderer: Application["renderer"]): TextureLimits {
    const cached = textureLimitsCache.get(renderer);
    if (cached) return cached;
    const backend = renderer as unknown as {
      gl?: WebGL2RenderingContext;
      gpu?: { device: { limits: { maxTextureDimension2D: number } } };
    };
    const maximum =
      backend.gpu?.device.limits.maxTextureDimension2D ??
      (backend.gl
        ? Math.min(
            Number(backend.gl.getParameter(backend.gl.MAX_TEXTURE_SIZE)),
            Number(backend.gl.getParameter(backend.gl.MAX_RENDERBUFFER_SIZE)),
          )
        : 4096);
    const limits = { maxDimension: Math.max(1, Math.floor(maximum)), maxPixels: 4_194_304 };
    textureLimitsCache.set(renderer, limits);
    return limits;
  }

  function fitTextureSize(width: number, height: number, limits: TextureLimits) {
    const w = Math.max(1, Number.isFinite(width) ? width : 1);
    const h = Math.max(1, Number.isFinite(height) ? height : 1);
    const pixels = Math.max(1, Math.floor(limits.maxPixels));
    const dimension = Math.max(1, Math.min(Math.floor(limits.maxDimension), pixels));
    const scale = Math.min(1, dimension / w, dimension / h, Math.sqrt(pixels / w / h));
    return {
      width: Math.max(1, Math.floor(w * scale)),
      height: Math.max(1, Math.floor(h * scale)),
    };
  }

  function waitForRenderableSize(target: HTMLElement, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return Promise.reject(new Error("Shader mount was cancelled."));
    if (target.clientWidth > 0 && target.clientHeight > 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        observer.disconnect();
        signal.removeEventListener("abort", abort);
      };
      const check = () => {
        if (target.clientWidth > 0 && target.clientHeight > 0) {
          cleanup();
          resolve();
        }
      };
      const abort = () => {
        cleanup();
        reject(new Error("Shader mount was cancelled."));
      };
      const observer = new ResizeObserver(check);
      signal.addEventListener("abort", abort, { once: true });
      observer.observe(target);
      check();
    });
  }

  const RENDER_PIXEL_BUDGET = 4194304;

  const rendererSizes = new WeakMap<object, { width: number; height: number; resolution: number }>();

  function resizeRenderer(app: Application, target: HTMLElement, resolution: number, maxPixels: number) {
    if (target.clientWidth <= 0 || target.clientHeight <= 0) {
      rendererSizes.delete(app.renderer);
      app.stop();
      return;
    }
    const limits = rendererTextureLimits(app.renderer);
    const logicalWidth = Math.max(1, target.clientWidth);
    const logicalHeight = Math.max(1, target.clientHeight);
    const desired = Math.max(Number.EPSILON, resolution);
    const requestedWidth = Math.max(1, Math.round(logicalWidth * desired));
    const requestedHeight = Math.max(1, Math.round(logicalHeight * desired));
    const physical = fitTextureSize(requestedWidth, requestedHeight, {
      ...limits,
      maxPixels,
    });
    resolution =
      physical.width === requestedWidth && physical.height === requestedHeight
        ? desired
        : Math.min(desired, physical.width / logicalWidth, physical.height / logicalHeight);
    // Pixi rounds logical size times resolution; retain at least one physical texel.
    const width = Math.max(logicalWidth, 1 / resolution);
    const height = Math.max(logicalHeight, 1 / resolution);
    const previous = rendererSizes.get(app.renderer);
    if (previous?.width === width && previous.height === height && previous.resolution === resolution) {
      return { ...previous, changed: false };
    }
    app.renderer.resize(width, height, resolution);
    const texture = app.renderer.view.texture;
    // Pixi omits the source resize event when only resolution changes at the same pixel size.
    if (texture.width !== texture.source.width || texture.height !== texture.source.height) {
      texture.update();
      app.renderer.resize(width, height, resolution);
    }
    app.canvas.style.width = "100%";
    app.canvas.style.height = "100%";
    const size = { width, height, resolution: app.renderer.resolution };
    rendererSizes.set(app.renderer, size);
    return { ...size, changed: true };
  }

  function observePixelRatio(resize: () => void): () => void {
    let ratio = window.devicePixelRatio || 1;
    let query: MediaQueryList;
    const arm = () => {
      query = window.matchMedia("(resolution: " + ratio + "dppx)");
      query.addEventListener("change", changed);
    };
    const changed = () => {
      query.removeEventListener("change", changed);
      ratio = window.devicePixelRatio || 1;
      arm();
      resize();
    };
    const check = () => {
      if ((window.devicePixelRatio || 1) !== ratio) changed();
    };
    arm();
    window.addEventListener("resize", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      query.removeEventListener("change", changed);
      window.removeEventListener("resize", check);
      document.removeEventListener("visibilitychange", check);
    };
  }

  type SceneMountOptions = MountOptions & {
    onRendererLost?: (backend: ShaderBackend, reason: string) => void;
  };

  function observeRendererLoss(
    app: Application,
    backend: ShaderBackend,
    notify: (backend: ShaderBackend, reason: string) => void,
  ): () => void {
    let disposed = false;
    let notified = false;
    const canvas = app.canvas;
    const device =
      backend === "webgpu"
        ? (
            app.renderer as unknown as {
              gpu: { device: { lost: Promise<{ message: string }>; destroy(): void } };
            }
          ).gpu.device
        : undefined;
    const lost = (reason: string) => {
      if (disposed || notified) return;
      notified = true;
      app.stop();
      notify(backend, reason);
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      lost("The WebGL context was lost.");
    };
    canvas.addEventListener("webglcontextlost", contextLost);
    rendererFailureHandlers.set(app, lost);
    void device?.lost.then((info) => lost(info.message || "The WebGPU device was lost."));
    return () => {
      disposed = true;
      rendererFailureHandlers.delete(app);
      canvas.removeEventListener("webglcontextlost", contextLost);
      // Devices belong to this private application, including preview devices.
      device?.destroy();
    };
  }

  async function mountShader(target: HTMLElement, options: MountOptions = {}): Promise<ShaderController> {
    let disposed = false;
    let current: ShaderController | undefined;
    let pending: AbortController | undefined;
    let values = normalizeValues(options.values ?? {});
    let paused = options.paused ?? false;

    let maxDpr = options.maxDpr ?? 2;
    let resolutionScale = options.resolutionScale ?? 1;
    let revision = 0;
    let recovering = false;
    let recoveryAttempts = 0;
    let lastReady = performance.now();
    const destroy = () => {
      if (disposed) return;
      disposed = true;
      options.signal?.removeEventListener("abort", destroy);
      current?.destroy();
      current = undefined;
      pending?.abort();
      pending = undefined;
    };
    const publish = (status: ShaderRuntimeStatus) => {
      if (!disposed) options.onStatus?.(status);
    };
    const fail = (error: unknown) => {
      if (disposed) return;
      try {
        publish({ state: "error", reason: errorMessage(error) });
      } finally {
        destroy();
      }
    };
    const rebuild = async (preference: ShaderBackend | undefined): Promise<void> => {
      for (;;) {
        if (disposed) throw new Error("Shader mount was cancelled.");
        const attempt = new AbortController();
        pending = attempt;
        const startedAtRevision = revision;
        let installed = false;
        let lostDuringMount: ShaderBackend | undefined;
        let status: ShaderRuntimeStatus | undefined;
        try {
          await waitForRenderableSize(target, attempt.signal);
          const next = await mountSceneController(target, {
            ...options,
            preference: preference ?? "webgpu",
            values,
            paused,
            maxDpr,
            resolutionScale,

            signal: attempt.signal,
            onStatus(nextStatus) {
              if (attempt.signal.aborted) return;
              if (installed) publish(nextStatus);
              else status = nextStatus;
            },
            onRendererLost(backend, reason) {
              if (disposed || attempt.signal.aborted) return;

              if (!installed) {
                lostDuringMount = backend;
                attempt.abort();
                return;
              }
              if (recovering) return;
              recovering = true;
              current?.destroy();
              current = undefined;
              attempt.abort();
              if (performance.now() - lastReady > 30_000) recoveryAttempts = 0;
              try {
                publish({ state: "recovering", backend, reason });
                if (++recoveryAttempts > 2) throw new Error("The graphics device repeatedly failed during recovery.");
              } catch (error) {
                fail(error);
                return;
              }
              const preferred = backend === "webgpu" && recoveryAttempts === 1 ? "webgpu" : "webgl";
              void rebuild(preferred)
                .catch(fail)
                .catch((error) => {
                  queueMicrotask(() => {
                    throw error;
                  });
                });
            },
          });
          if (disposed || attempt.signal.aborted) {
            next.destroy();
            throw new Error("Shader mount was cancelled.");
          }
          current = next;
          installed = true;
          if (revision !== startedAtRevision) {
            next.update(values);
            next.setPaused(paused);

            next.setQuality(maxDpr, resolutionScale);
          }
          if (recovering && status?.state === "ready" && status.backend === "webgl" && options.preference !== "webgl") {
            status = {
              state: "fallback",
              backend: "webgl",
              reason: "WebGPU repeatedly lost its device; rendering resumed with WebGL.",
            };
          }
          recovering = false;
          lastReady = performance.now();
          if (status) publish(status);
          return;
        } catch (error) {
          attempt.abort();
          if (!disposed && lostDuringMount && ++recoveryAttempts <= 2) {
            preference = lostDuringMount === "webgpu" && recoveryAttempts === 1 ? "webgpu" : "webgl";
            continue;
          }
          if (!recovering && status?.state === "error") publish(status);
          throw error;
        }
      }
    };
    const controller: ShaderController = {
      update(next) {
        if (disposed) return;
        const normalized = normalizeValues({ ...values, ...next });
        if ((Object.keys(normalized) as Array<keyof ShaderValues>).every((key) => normalized[key] === values[key]))
          return;
        values = normalized;
        revision += 1;
        current?.update(next);
      },
      setPaused(next) {
        if (disposed || paused === next) return;
        paused = next;
        revision += 1;
        current?.setPaused(next);
      },

      setQuality(nextMaxDpr, nextResolutionScale) {
        if (disposed) return;
        maxDpr = nextMaxDpr;
        resolutionScale = nextResolutionScale;
        revision += 1;
        current?.setQuality(maxDpr, resolutionScale);
      },
      pause() {
        controller.setPaused(true);
      },
      resume() {
        controller.setPaused(false);
      },
      reset() {
        if (disposed) return;
        values = normalizeValues({ ...DEFAULT_VALUES });
        revision += 1;
        current?.reset();
      },
      resize() {
        if (!disposed) current?.resize();
      },
      destroy,
    };
    options.signal?.addEventListener("abort", destroy, { once: true });
    if (options.signal?.aborted) destroy();
    try {
      await rebuild(options.preference);
      if (disposed) throw new Error("Shader mount was cancelled.");
      return controller;
    } catch (error) {
      destroy();
      throw error;
    }
  }

  function createRenderLoop(
    app: Application,
    options: {
      visible: () => boolean;
      animated: () => boolean;
      active: () => boolean;
      update: (elapsed: number) => void;
      render: () => void;
    },
  ) {
    let dirty = false;
    let disposed = false;
    const sync = () => {
      if (disposed) return;
      if (options.visible() && (dirty || (options.animated() && options.active()))) app.start();
      else app.stop();
    };
    const update = () => {
      dirty = false;
      if (options.animated() && options.active()) {
        options.update(Math.min(Math.max(app.ticker.elapsedMS / 1000, 0), 0.1));
      }
    };
    const render = () => options.render();
    app.ticker.remove(app.render, app);
    app.ticker.add(update);
    app.ticker.add(render, undefined, UPDATE_PRIORITY.LOW);
    app.ticker.add(sync, undefined, -10001);
    return {
      sync,
      invalidate() {
        if (disposed) return;
        dirty = true;
        sync();
      },
      destroy() {
        if (disposed) return;
        disposed = true;
        app.stop();
        app.ticker.remove(update);
        app.ticker.remove(render);
        app.ticker.remove(sync);
      },
    };
  }

  function syncRenderMetrics(
    uniforms: Record<string, unknown>,
    width: number,
    height: number,
    pixelRatio: number,
  ): void {
    const logicalWidth = Math.max(1, width);
    const logicalHeight = Math.max(1, height);
    const ratio = Math.max(Number.EPSILON, pixelRatio);
    uniforms["uResolution"] = [logicalWidth, logicalHeight];
    uniforms["uRenderResolution"] = [
      Math.max(1, Math.round(logicalWidth * ratio)),
      Math.max(1, Math.round(logicalHeight * ratio)),
    ];
    uniforms["uPixelRatio"] = ratio;
  }

  function srgbToLinear(value: number): number {
    return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  }

  function normalizeColor(value: string, fallback: string): string {
    if (typeof value !== "string") return fallback;
    const normalized = value.trim().toUpperCase();
    return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : fallback;
  }

  function toLinearRgba(value: string): [number, number, number, number] {
    const hex = normalizeColor(value, "#000000").slice(1);
    return [
      srgbToLinear(Number.parseInt(hex.slice(0, 2), 16) / 255),
      srgbToLinear(Number.parseInt(hex.slice(2, 4), 16) / 255),
      srgbToLinear(Number.parseInt(hex.slice(4, 6), 16) / 255),
      1,
    ];
  }

  function consumeLinearTargetError(gl: WebGL2RenderingContext): number {
    let first: number = gl.NO_ERROR;
    for (let error = gl.getError(); error !== gl.NO_ERROR; error = gl.getError()) {
      if (first === gl.NO_ERROR) first = error;
    }
    return first;
  }

  function linearOutputAntialias(app: Application, depth: boolean): boolean {
    const renderer = app.renderer;
    if (!("gl" in renderer)) return depth;
    const gl = renderer.gl;
    if (
      renderer.context.webGLVersion !== 2 ||
      !(gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float"))
    ) {
      throw new Error("The WebGL backend cannot render the required half-float color target.");
    }
    // Pixi uses four samples for antialiased render textures. Preserve half-float
    // precision and depth on devices whose color/depth formats cannot both do 4x MSAA.
    if (
      !depth ||
      ![gl.RGBA16F, gl.DEPTH24_STENCIL8].every((format) =>
        (gl.getInternalformatParameter(gl.RENDERBUFFER, format, gl.SAMPLES) as Int32Array).includes(4),
      )
    )
      return false;
    const readFramebuffer = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
    const drawFramebuffer = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
    const renderbuffer = gl.getParameter(gl.RENDERBUFFER_BINDING) as WebGLRenderbuffer | null;
    const framebuffer = gl.createFramebuffer();
    const color = gl.createRenderbuffer();
    const depthBuffer = gl.createRenderbuffer();
    try {
      if (!framebuffer || !color || !depthBuffer) {
        consumeLinearTargetError(gl);
        return false;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      for (const [buffer, format, attachment] of [
        [color, gl.RGBA16F, gl.COLOR_ATTACHMENT0],
        [depthBuffer, gl.DEPTH24_STENCIL8, gl.DEPTH_STENCIL_ATTACHMENT],
      ] as const) {
        gl.bindRenderbuffer(gl.RENDERBUFFER, buffer);
        gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 4, format, 1, 1);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, attachment, gl.RENDERBUFFER, buffer);
      }
      const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      return consumeLinearTargetError(gl) === gl.NO_ERROR && complete;
    } finally {
      // Restore the exact GL bindings; Pixi's cached state remains unchanged.
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, readFramebuffer);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, drawFramebuffer);
      gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
      gl.deleteFramebuffer(framebuffer);
      gl.deleteRenderbuffer(color);
      gl.deleteRenderbuffer(depthBuffer);
    }
  }

  function validateLinearTarget(app: Application, target: RenderTarget): void {
    const renderer = app.renderer;
    if (!("gl" in renderer)) return;
    const gl = renderer.gl;
    const system = renderer.renderTarget;
    const previous = system.renderTarget ? system.getBindState() : { target: renderer.view.renderTarget, clear: false };
    const readFramebuffer = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
    const renderbuffer = gl.getParameter(gl.RENDERBUFFER_BINDING) as WebGLRenderbuffer | null;
    const check = () => {
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      const error = consumeLinearTargetError(gl);
      if (status !== gl.FRAMEBUFFER_COMPLETE || error !== gl.NO_ERROR) {
        throw new Error(
          "The WebGL half-float color target is unavailable (framebuffer status " + status + ", error " + error + ").",
        );
      }
    };
    try {
      // Binding through Pixi allocates the actual color, depth and MSAA attachments.
      system.bind({ target, clear: false });
      check();
      const gpuTarget = system.getGpuRenderTarget(target);
      if (gpuTarget.msaa) {
        system.adaptor.bindFramebuffer(gpuTarget.resolveTargetFramebuffer);
        check();
      }
    } finally {
      system.bind(previous);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, readFramebuffer);
      gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    }
  }

  function installLinearOutput(app: Application, depth: boolean): () => void {
    const cleanup: Array<() => void> = [];
    try {
      const antialias = linearOutputAntialias(app, depth);
      const texture = RenderTexture.create({
        width: 1,
        height: 1,
        format: "rgba16float",
        scaleMode: "nearest",
        alphaMode: "premultiplied-alpha",
        antialias,
      });
      cleanup.push(() => texture.destroy(true));
      const target = new RenderTarget({ colorTextures: [texture], depth });
      cleanup.push(() => target.destroy());
      validateLinearTarget(app, target);
      const geometry = new Geometry({
        attributes: {
          aPosition: { buffer: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), format: "float32x2" },
          aUV: { buffer: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), format: "float32x2" },
        },
        indexBuffer: new Uint32Array([0, 1, 2, 0, 2, 3]),
      });
      cleanup.push(() => geometry.destroy(true));
      const gpuSource =
        "\nstruct GlobalUniforms {\n\tuProjectionMatrix: mat3x3<f32>,\n\tuWorldTransformMatrix: mat3x3<f32>,\n\tuWorldColorAlpha: vec4<f32>,\n\tuResolution: vec2<f32>,\n}\n\nstruct LocalUniforms {\n\tuTransformMatrix: mat3x3<f32>,\n\tuColor: vec4<f32>,\n\tuRound: f32,\n}\nstruct VertexOutput {\n\t@builtin(position) position: vec4<f32>,\n\t@location(0) uv: vec2<f32>,\n}\n@group(0) @binding(0) var<uniform> globalUniforms: GlobalUniforms;\n@group(1) @binding(0) var<uniform> localUniforms: LocalUniforms;\n@group(2) @binding(0) var uLinearTexture: texture_2d<f32>;\n@group(2) @binding(1) var uLinearSampler: sampler;\n@vertex\nfn mainVertex(\n\t@location(0) aPosition: vec2<f32>,\n\t@location(1) aUV: vec2<f32>,\n) -> VertexOutput {\n\tvar output: VertexOutput;\n\tlet mvp = globalUniforms.uProjectionMatrix\n\t\t* globalUniforms.uWorldTransformMatrix\n\t\t* localUniforms.uTransformMatrix;\n\toutput.position = vec4<f32>((mvp * vec3<f32>(aPosition, 1.0)).xy, 0.0, 1.0);\n\toutput.uv = aUV;\n\treturn output;\n}\n\nfn linearToSrgb(color: vec3<f32>) -> vec3<f32> {\n  let safe = max(color, vec3<f32>(0.0));\n  return select(1.055 * pow(safe, vec3<f32>(1.0 / 2.4)) - vec3<f32>(0.055),\n    safe * 12.92, safe <= vec3<f32>(0.0031308));\n}\nfn displayColor(linearColor: vec4<f32>) -> vec4<f32> {\n  let alpha = clamp(linearColor.a, 0.0, 1.0);\n  if (alpha <= 0.0) { return vec4<f32>(0.0); }\n  return vec4<f32>(clamp(linearToSrgb(linearColor.rgb / alpha), vec3<f32>(0.0), vec3<f32>(1.0)) * alpha, alpha);\n}\n\n@fragment\nfn mainFragment(input: VertexOutput) -> @location(0) vec4<f32> {\n  return displayColor(textureSampleLevel(uLinearTexture, uLinearSampler, input.uv, 0.0));\n}\n";
      const shader = Shader.from({
        gl: {
          vertex:
            "\n#version 300 es\nin vec2 aPosition;\nin vec2 aUV;\nout vec2 vUV;\n\nuniform mat3 uProjectionMatrix;\nuniform mat3 uWorldTransformMatrix;\nuniform mat3 uTransformMatrix;\n\nvoid main() {\n\tvUV = aUV;\n\tmat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;\n\tgl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);\n}\n",
          fragment:
            "\n#version 300 es\nprecision highp float;\nin vec2 vUV;\nout vec4 finalColor;\nuniform sampler2D uLinearTexture;\n\nvec3 linearToSrgb(vec3 color) {\n  vec3 safe = max(color, vec3(0.0));\n  return mix(1.055 * pow(safe, vec3(1.0 / 2.4)) - 0.055,\n    safe * 12.92, lessThanEqual(safe, vec3(0.0031308)));\n}\nvec4 displayColor(vec4 linearColor) {\n  float alpha = clamp(linearColor.a, 0.0, 1.0);\n  if (alpha <= 0.0) return vec4(0.0);\n  return vec4(clamp(linearToSrgb(linearColor.rgb / alpha), 0.0, 1.0) * alpha, alpha);\n}\n\nvoid main() {\n  finalColor = displayColor(texture(uLinearTexture, vUV));\n}\n",
        },
        gpu: {
          vertex: { source: gpuSource, entryPoint: "mainVertex" },
          fragment: { source: gpuSource, entryPoint: "mainFragment" },
        },
        resources: { uLinearTexture: texture.source, uLinearSampler: texture.source.style },
      });
      cleanup.push(() => shader.destroy());
      const output = new Mesh({ geometry, shader });
      cleanup.push(() => output.destroy());
      output.blendMode = "none";
      const originalRender = app.render;
      const render = () => {
        const width = Math.max(1, app.screen.width);
        const height = Math.max(1, app.screen.height);
        const resolution = app.renderer.resolution;
        try {
          if (texture.width !== width || texture.height !== height || texture.source.resolution !== resolution) {
            target.resize(width, height, resolution);
            texture.update();
            validateLinearTarget(app, target);
          }
        } catch (error) {
          const fail = rendererFailureHandlers.get(app);
          if (!fail) throw error;
          fail(errorMessage(error));
          return;
        }
        output.width = width;
        output.height = height;
        app.renderer.render({
          container: app.stage,
          target,
          clear: true,
          clearColor: [0, 0, 0, 0],
        });
        app.renderer.render({ container: output, clear: true, clearColor: [0, 0, 0, 0] });
      };
      app.ticker.remove(originalRender, app);
      app.render = render;
      app.ticker.add(render, app, UPDATE_PRIORITY.LOW);
      cleanup.push(() => {
        app.ticker.remove(render, app);
        app.render = originalRender;
        app.ticker.add(originalRender, app, UPDATE_PRIORITY.LOW);
      });
      return () => runCleanup(cleanup);
    } catch (error) {
      runCleanup(cleanup);
      throw error;
    }
  }

  type ShaderValues = {
    color1: string;
    color2: string;
    speed: number;
    scale: number;
    frequency: number;
    refraction: number;
    chromaticAberration: number;
    blur: number;
    grain: number;
    grainSize: number;
  };

  type ShaderBackend = "webgpu" | "webgl";
  type ShaderRuntimeStatus =
    | { state: "ready"; backend: ShaderBackend }
    | { state: "recovering"; backend: ShaderBackend; reason: string }
    | { state: "fallback"; backend: "webgl"; reason: string }
    | { state: "error"; reason: string };

  type ShaderController = {
    update(values: Partial<ShaderValues>): void;
    setPaused(paused: boolean): void;

    setQuality(maxDpr: number, resolutionScale: number): void;
    pause(): void;
    resume(): void;
    reset(): void;
    resize(): void;
    destroy(): void;
  };

  type MountOptions = {
    values?: Partial<ShaderValues>;
    preference?: ShaderBackend;
    maxDpr?: number;
    resolutionScale?: number;
    paused?: boolean;

    signal?: AbortSignal;
    onStatus?: (status: ShaderRuntimeStatus) => void;
  };

  const DEFAULT_VALUES: ShaderValues = {
    color1: "#9084FF",
    color2: "#16171D",
    speed: 0.1,
    scale: 2.5,
    frequency: 8,
    refraction: 2,
    chromaticAberration: 0,
    blur: 1,
    grain: 0.25,
    grainSize: 0.5,
  };
  const WEBGPU_SOURCE =
    "struct GlobalUniforms {\n\tuProjectionMatrix: mat3x3<f32>,\n\tuWorldTransformMatrix: mat3x3<f32>,\n\tuWorldColorAlpha: vec4<f32>,\n\tuResolution: vec2<f32>,\n}\n\nstruct LocalUniforms {\n\tuTransformMatrix: mat3x3<f32>,\n\tuColor: vec4<f32>,\n\tuRound: f32,\n}\n\nstruct LiquidGlassUniforms {\n\tuTime: f32,\n\tuResolution: vec2<f32>,\n\tuColor1: vec4<f32>,\n\tuColor2: vec4<f32>,\n\tuSpeed: f32,\n\tuScale: f32,\n\tuFrequency: f32,\n\tuRefraction: f32,\n\tuChromaticAberration: f32,\n\tuBlur: f32,\n\tuGrain: f32,\n\tuGrainSize: f32,\n\tuRenderResolution: vec2<f32>,\n\tuPixelRatio: f32,\n}\n\nstruct VertexOutput {\n\t@builtin(position) position: vec4<f32>,\n\t@location(0) uv: vec2<f32>,\n}\n\n@group(0) @binding(0) var<uniform> globalUniforms: GlobalUniforms;\n@group(1) @binding(0) var<uniform> localUniforms: LocalUniforms;\n@group(2) @binding(0) var<uniform> liquidGlassUniforms: LiquidGlassUniforms;\n\n@vertex\nfn mainVertex(\n\t@location(0) aPosition: vec2<f32>,\n\t@location(1) aUV: vec2<f32>,\n) -> VertexOutput {\n\tvar output: VertexOutput;\n\tlet mvp = globalUniforms.uProjectionMatrix\n\t\t* globalUniforms.uWorldTransformMatrix\n\t\t* localUniforms.uTransformMatrix;\n\toutput.position = vec4<f32>((mvp * vec3<f32>(aPosition, 1.0)).xy, 0.0, 1.0);\n\toutput.uv = aUV;\n\treturn output;\n}\n\nfn spaceHash(cell: vec3<f32>) -> f32 {\n  var p = fract(cell * 0.1031);\n  p += vec3<f32>(dot(p, p.yzx + vec3<f32>(33.33)));\n  return fract((p.x + p.y) * p.z);\n}\n\nfn spaceNoise(point: vec3<f32>) -> f32 {\n  let cell = floor(point);\n  let f = fract(point);\n  let u = f * f * f * (f * (f * 6.0 - vec3<f32>(15.0)) + vec3<f32>(10.0));\n  return mix(\n    mix(mix(spaceHash(cell), spaceHash(cell + vec3<f32>(1, 0, 0)), u.x),\n      mix(spaceHash(cell + vec3<f32>(0, 1, 0)), spaceHash(cell + vec3<f32>(1, 1, 0)), u.x), u.y),\n    mix(mix(spaceHash(cell + vec3<f32>(0, 0, 1)), spaceHash(cell + vec3<f32>(1, 0, 1)), u.x),\n      mix(spaceHash(cell + vec3<f32>(0, 1, 1)), spaceHash(cell + vec3<f32>(1, 1, 1)), u.x), u.y), u.z);\n}\n\nfn evolvingNoise(point: vec2<f32>, time: f32) -> f32 {\n  var p = vec3<f32>(point, time);\n  let value = spaceNoise(p) * 0.66;\n  p = vec3<f32>(p.xy * mat2x2<f32>(0.8, -0.6, 0.6, 0.8) * 2.03, p.z * 1.37) + vec3<f32>(7.1, 13.4, 3.2);\n  return value + spaceNoise(p) * 0.34;\n}\n\n\n\n\nfn pcg2d(input: vec2<u32>) -> vec2<u32> {\n  var value = input * 1664525u + vec2<u32>(1013904223u);\n  value.x += value.y * value.y * 1664525u + 1013904223u;\n  value.y += value.x * value.x * 1664525u + 1013904223u;\n  value ^= value >> vec2<u32>(16u);\n  value.x += value.y * value.y * 1664525u + 1013904223u;\n  value.y += value.x * value.x * 1664525u + 1013904223u;\n  return value;\n}\n\nfn pcgGrain(pixel: vec2<f32>) -> f32 {\n  let value = pcg2d(bitcast<vec2<u32>>(floor(pixel) + vec2<f32>(0.5)));\n  return f32(value.x ^ value.y) / f32(0xffffffffu);\n}\n\n\nfn sampleMeshGrain(pixel: vec2<f32>, cssPixel: vec2<f32>, grainSize: f32, pixelRatio: f32) -> vec2<f32> {\n  let fine = pcgGrain(pixel) * 2.0 - 1.0;\n  let paperPoint = cssPixel / max(grainSize, 1.0 / max(pixelRatio, 0.001));\n  let paper = (evolvingNoise(paperPoint * 0.72 + vec2<f32>(19.3, 7.1), 2.7) - 0.5) * 2.0;\n  let mottling = (spaceNoise(vec3<f32>(paperPoint * 0.13, 8.4)) - 0.5) * 2.0;\n  let pigment = fine * 0.55 + paper * 0.80 + mottling * 0.20;\n  return vec2<f32>(fine, pigment);\n}\n\nfn meshGrainField(field: f32, grain: vec2<f32>, strength: f32) -> f32 {\n  return field + grain.y * strength * 0.24;\n}\n\nfn applyMeshGrain(color: vec3<f32>, grain: vec2<f32>, strength: f32) -> vec3<f32> {\n  let textured = color * exp2(grain.y * strength * 0.85);\n  return textured + vec3<f32>(grain.x * strength * 0.004);\n}\n\n\nfn distort(pointInput: vec2<f32>, offset: f32, time: f32) -> vec2<f32> {\n\tvar point = pointInput + vec2<f32>(offset);\n\tfor (var i = 1; i < 4; i += 1) {\n\t\tlet harmonic = f32(i);\n\t\tpoint.x += 0.3 / harmonic * sin(harmonic * 2.8 * point.y + time);\n\t\tpoint.y += 0.3 / harmonic * cos(harmonic * 2.8 * point.x + time);\n\t}\n\treturn point;\n}\n\nfn swirl(uv: vec2<f32>, time: f32) -> vec3<f32> {\n\tlet t = time * 0.5;\n\tlet detail = 4.2;\n\tlet d1 = vec2<f32>(\n\t\tuv.x + sin(uv.y * detail * 1.7 + t * 0.8) * 0.12 + cos(uv.x * detail * 0.9 - t * 0.5) * 0.05,\n\t\tuv.y + cos(uv.x * detail * 1.3 - t * 0.6) * 0.12 + sin(uv.y * detail * 1.1 + t * 0.7) * 0.05,\n\t);\n\tlet p1 = sin(d1.x * detail * 2.1 + d1.y * detail * 1.8 + t * 0.4);\n\tlet d2 = vec2<f32>(\n\t\td1.x + cos(d1.y * detail * 2.7 - t * 0.45) * 0.07 + sin(d1.x * detail * 1.9 + t * 0.6) * 0.04,\n\t\td1.y + sin(d1.x * detail * 2.3 + t * 0.65) * 0.07 + cos(d1.y * detail * 1.6 - t * 0.4) * 0.04,\n\t);\n\tlet p2 = cos(d2.x * detail * 1.4 - d2.y * detail * 1.9 + t * 0.35);\n\tlet combined = p1 * 0.45 + p2 * 0.35;\n\tlet blendFactor = smoothstep(0.3, 0.7, combined * 0.5 + 0.5 - 0.192);\n\treturn mix(liquidGlassUniforms.uColor2.rgb, liquidGlassUniforms.uColor1.rgb, blendFactor);\n}\n\nfn blurredSwirl(uv: vec2<f32>, time: f32) -> vec3<f32> {\n\tlet pixel = vec2<f32>(1.0) / max(\n\t\tliquidGlassUniforms.uRenderResolution,\n\t\tvec2<f32>(1.0),\n\t);\n\tlet blurRadius = 40.0 * liquidGlassUniforms.uBlur;\n\tvar accumulated = swirl(uv, time);\n\taccumulated += swirl(uv + pixel * vec2<f32>(-0.737, 0.675) * blurRadius, time);\n\taccumulated += swirl(uv + pixel * vec2<f32>(0.087, -0.996) * blurRadius, time);\n\taccumulated += swirl(uv + pixel * vec2<f32>(0.608, 0.794) * blurRadius, time);\n\taccumulated += swirl(uv + pixel * vec2<f32>(-0.985, -0.174) * blurRadius, time);\n\taccumulated += swirl(uv + pixel * vec2<f32>(0.844, -0.537) * blurRadius, time);\n\taccumulated += swirl(uv + pixel * vec2<f32>(-0.259, 0.966) * blurRadius, time);\n\taccumulated += swirl(uv + pixel * vec2<f32>(-0.460, -0.888) * blurRadius, time);\n\taccumulated += swirl(uv + pixel * vec2<f32>(0.940, 0.342) * blurRadius, time);\n\treturn accumulated / 9.0;\n}\n\nfn glassDepthField(point: vec2<f32>, time: f32) -> f32 {\n\tlet wave = sin(distort(point, 0.0, time).x * liquidGlassUniforms.uFrequency) * 0.5 + 0.5;\n\tlet depth = pow(wave, 1.1);\n\treturn -depth * 0.3;\n}\n\n@fragment\nfn mainFragment(input: VertexOutput) -> @location(0) vec4<f32> {\n\tlet fragCoord = input.uv * liquidGlassUniforms.uResolution;\n\tlet uv = fragCoord / liquidGlassUniforms.uResolution;\n\tlet minResolution = min(liquidGlassUniforms.uResolution.x, liquidGlassUniforms.uResolution.y);\n\tvar point = (fragCoord * 2.0 - liquidGlassUniforms.uResolution) / minResolution;\n\tpoint /= max(liquidGlassUniforms.uScale, 0.001);\n\tlet time = liquidGlassUniforms.uTime * liquidGlassUniforms.uSpeed;\n\tlet surfaceDepth = glassDepthField(point, time);\n\n\tlet epsilon = 0.004;\n\tlet gradX = (glassDepthField(point + vec2<f32>(epsilon, 0.0), time) - surfaceDepth) / epsilon;\n\tlet gradY = (glassDepthField(point + vec2<f32>(0.0, epsilon), time) - surfaceDepth) / epsilon;\n\tlet depthNorm = clamp(-surfaceDepth / 0.3, 0.0, 1.0);\n\tlet refractionStrength = (1.0 - depthNorm) * (1.0 - depthNorm);\n\tlet aspect = liquidGlassUniforms.uResolution.x / liquidGlassUniforms.uResolution.y;\n\tlet offset = vec2<f32>(-gradX / aspect, -gradY) * 1.57 * 0.15 * refractionStrength * liquidGlassUniforms.uRefraction;\n\tlet lensUv = uv + offset;\n\tlet chroma = offset * 0.06 * liquidGlassUniforms.uChromaticAberration;\n\tlet red = blurredSwirl(lensUv + chroma, time).r;\n\tlet green = blurredSwirl(lensUv, time).g;\n\tlet blue = blurredSwirl(lensUv - chroma, time).b;\n\tlet blurred = vec3<f32>(red, green, blue);\n\tvar color = blurred;\n\tif (liquidGlassUniforms.uGrain > 0.0001) {\n\t\tcolor = applyMeshGrain(color, sampleMeshGrain(input.uv * liquidGlassUniforms.uRenderResolution, input.uv * liquidGlassUniforms.uResolution, liquidGlassUniforms.uGrainSize, liquidGlassUniforms.uPixelRatio), liquidGlassUniforms.uGrain);\n\t}\n\treturn vec4<f32>(clamp(color, vec3<f32>(0.0), vec3<f32>(1.0)), 1.0);\n}";
  const WEBGL_VERTEX =
    "#version 300 es\nin vec2 aPosition;\nin vec2 aUV;\nout vec2 vUV;\n\nuniform mat3 uProjectionMatrix;\nuniform mat3 uWorldTransformMatrix;\nuniform mat3 uTransformMatrix;\n\nvoid main() {\n\tvUV = aUV;\n\tmat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;\n\tgl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);\n}";
  const WEBGL_FRAGMENT =
    "#version 300 es\nprecision highp float;\n\nin vec2 vUV;\nout vec4 finalColor;\n\nuniform float uTime;\nuniform vec2 uResolution;\nuniform vec4 uColor1;\nuniform vec4 uColor2;\nuniform float uSpeed;\nuniform float uScale;\nuniform float uFrequency;\nuniform float uRefraction;\nuniform float uChromaticAberration;\nuniform float uBlur;\nuniform float uGrain;\nuniform float uGrainSize;\nuniform vec2 uRenderResolution;\nuniform float uPixelRatio;\n\n\nfloat spaceHash(vec3 cell) {\n  vec3 p = fract(cell * 0.1031);\n  p += dot(p, p.yzx + 33.33);\n  return fract((p.x + p.y) * p.z);\n}\n\nfloat spaceNoise(vec3 point) {\n  vec3 cell = floor(point);\n  vec3 f = fract(point);\n  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);\n  return mix(\n    mix(mix(spaceHash(cell), spaceHash(cell + vec3(1, 0, 0)), u.x),\n      mix(spaceHash(cell + vec3(0, 1, 0)), spaceHash(cell + vec3(1, 1, 0)), u.x), u.y),\n    mix(mix(spaceHash(cell + vec3(0, 0, 1)), spaceHash(cell + vec3(1, 0, 1)), u.x),\n      mix(spaceHash(cell + vec3(0, 1, 1)), spaceHash(cell + vec3(1, 1, 1)), u.x), u.y), u.z);\n}\n\nfloat evolvingNoise(vec2 point, float time) {\n  vec3 p = vec3(point, time);\n  float value = spaceNoise(p) * 0.66;\n  p = vec3(p.xy * mat2(0.8, -0.6, 0.6, 0.8) * 2.03, p.z * 1.37) + vec3(7.1, 13.4, 3.2);\n  return value + spaceNoise(p) * 0.34;\n}\n\n\n\n\nhighp uvec2 pcg2d(highp uvec2 value) {\n  value = value * 1664525u + 1013904223u;\n  value.x += value.y * value.y * 1664525u + 1013904223u;\n  value.y += value.x * value.x * 1664525u + 1013904223u;\n  value ^= value >> 16u;\n  value.x += value.y * value.y * 1664525u + 1013904223u;\n  value.y += value.x * value.x * 1664525u + 1013904223u;\n  return value;\n}\n\nhighp float pcgGrain(highp vec2 pixel) {\n  highp uvec2 value = pcg2d(floatBitsToUint(floor(pixel) + 0.5));\n  return float(value.x ^ value.y) / float(0xffffffffu);\n}\n\n\nvec2 sampleMeshGrain(vec2 pixel, vec2 cssPixel, float grainSize, float pixelRatio) {\n  float fine = pcgGrain(pixel) * 2.0 - 1.0;\n  vec2 paperPoint = cssPixel / max(grainSize, 1.0 / max(pixelRatio, 0.001));\n  float paper = (evolvingNoise(paperPoint * 0.72 + vec2(19.3, 7.1), 2.7) - 0.5) * 2.0;\n  float mottling = (spaceNoise(vec3(paperPoint * 0.13, 8.4)) - 0.5) * 2.0;\n  float pigment = fine * 0.55 + paper * 0.80 + mottling * 0.20;\n  return vec2(fine, pigment);\n}\n\nfloat meshGrainField(float field, vec2 grain, float strength) {\n  return field + grain.y * strength * 0.24;\n}\n\nvec3 applyMeshGrain(vec3 color, vec2 grain, float strength) {\n  color *= exp2(grain.y * strength * 0.85);\n  return color + vec3(grain.x * strength * 0.004);\n}\n\n\nvec2 distort(vec2 point, float offset, float time) {\n\tpoint += offset;\n\tfor (int i = 1; i < 4; i++) {\n\t\tfloat harmonic = float(i);\n\t\tpoint.x += 0.3 / harmonic * sin(harmonic * 2.8 * point.y + time);\n\t\tpoint.y += 0.3 / harmonic * cos(harmonic * 2.8 * point.x + time);\n\t}\n\treturn point;\n}\n\nvec3 swirl(vec2 uv, float time) {\n\tfloat t = time * 0.5;\n\tfloat detail = 4.2;\n\tvec2 d1 = vec2(\n\t\tuv.x + sin(uv.y * detail * 1.7 + t * 0.8) * 0.12 + cos(uv.x * detail * 0.9 - t * 0.5) * 0.05,\n\t\tuv.y + cos(uv.x * detail * 1.3 - t * 0.6) * 0.12 + sin(uv.y * detail * 1.1 + t * 0.7) * 0.05\n\t);\n\tfloat p1 = sin(d1.x * detail * 2.1 + d1.y * detail * 1.8 + t * 0.4);\n\tvec2 d2 = vec2(\n\t\td1.x + cos(d1.y * detail * 2.7 - t * 0.45) * 0.07 + sin(d1.x * detail * 1.9 + t * 0.6) * 0.04,\n\t\td1.y + sin(d1.x * detail * 2.3 + t * 0.65) * 0.07 + cos(d1.y * detail * 1.6 - t * 0.4) * 0.04\n\t);\n\tfloat p2 = cos(d2.x * detail * 1.4 - d2.y * detail * 1.9 + t * 0.35);\n\tfloat combined = p1 * 0.45 + p2 * 0.35;\n\tfloat blendFactor = smoothstep(0.3, 0.7, combined * 0.5 + 0.5 - 0.192);\n\treturn mix(uColor2.rgb, uColor1.rgb, blendFactor);\n}\n\nvec3 blurredSwirl(vec2 uv, float time) {\n\tvec2 pixel = 1.0 / max(uRenderResolution, vec2(1.0));\n\tfloat blurRadius = 40.0 * uBlur;\n\tvec3 acc = vec3(0.0);\n\tacc += swirl(uv, time);\n\tacc += swirl(uv + pixel * vec2(-0.737, 0.675) * blurRadius, time);\n\tacc += swirl(uv + pixel * vec2(0.087, -0.996) * blurRadius, time);\n\tacc += swirl(uv + pixel * vec2(0.608, 0.794) * blurRadius, time);\n\tacc += swirl(uv + pixel * vec2(-0.985, -0.174) * blurRadius, time);\n\tacc += swirl(uv + pixel * vec2(0.844, -0.537) * blurRadius, time);\n\tacc += swirl(uv + pixel * vec2(-0.259, 0.966) * blurRadius, time);\n\tacc += swirl(uv + pixel * vec2(-0.460, -0.888) * blurRadius, time);\n\tacc += swirl(uv + pixel * vec2(0.940, 0.342) * blurRadius, time);\n\treturn acc / 9.0;\n}\n\nfloat glassDepthField(vec2 point, float time) {\n\tfloat wave = sin(distort(point, 0.0, time).x * uFrequency) * 0.5 + 0.5;\n\tfloat depth = pow(wave, 1.1);\n\treturn -depth * 0.3;\n}\n\nvoid main() {\n\tvec2 fragCoord = vUV * uResolution;\n\tvec2 uv = fragCoord / uResolution;\n\tfloat minResolution = min(uResolution.x, uResolution.y);\n\tvec2 point = (fragCoord * 2.0 - uResolution) / minResolution;\n\tpoint /= max(uScale, 0.001);\n\tfloat time = uTime * uSpeed;\n\tfloat surfaceDepth = glassDepthField(point, time);\n\n\tfloat epsilon = 0.004;\n\tfloat gradX = (glassDepthField(point + vec2(epsilon, 0.0), time) - surfaceDepth) / epsilon;\n\tfloat gradY = (glassDepthField(point + vec2(0.0, epsilon), time) - surfaceDepth) / epsilon;\n\tfloat depthNorm = clamp(-surfaceDepth / 0.3, 0.0, 1.0);\n\tfloat refractionStrength = (1.0 - depthNorm) * (1.0 - depthNorm);\n\tfloat aspect = uResolution.x / uResolution.y;\n\tvec2 offset = vec2(-gradX / aspect, -gradY) * 1.57 * 0.15 * refractionStrength * uRefraction;\n\tvec2 lensUv = uv + offset;\n\tvec2 chroma = offset * 0.06 * uChromaticAberration;\n\tvec3 blurred = vec3(\n\t\tblurredSwirl(lensUv + chroma, time).r,\n\t\tblurredSwirl(lensUv, time).g,\n\t\tblurredSwirl(lensUv - chroma, time).b\n\t);\n\tvec3 color = blurred;\n\tif (uGrain > 0.0001) {\n\t\tcolor = applyMeshGrain(color, sampleMeshGrain(vUV * uRenderResolution, vUV * uResolution, uGrainSize, uPixelRatio), uGrain);\n\t}\n\tfinalColor = vec4(clamp(color, 0.0, 1.0), 1.0);\n}";

  function normalizeValues(candidate: Partial<ShaderValues>): ShaderValues {
    return {
      color1: normalizeColor(candidate.color1 ?? DEFAULT_VALUES.color1, "#9084FF"),
      color2: normalizeColor(candidate.color2 ?? DEFAULT_VALUES.color2, "#16171D"),
      speed: clampNumber(candidate.speed ?? DEFAULT_VALUES.speed, 0, 2, 0.01),
      scale: clampNumber(candidate.scale ?? DEFAULT_VALUES.scale, 0.35, 2.5, 0.01),
      frequency: clampNumber(candidate.frequency ?? DEFAULT_VALUES.frequency, 1, 8, 0.05),
      refraction: clampNumber(candidate.refraction ?? DEFAULT_VALUES.refraction, 0, 3, 0.05),
      chromaticAberration: clampNumber(candidate.chromaticAberration ?? DEFAULT_VALUES.chromaticAberration, 0, 3, 0.1),
      blur: clampNumber(candidate.blur ?? DEFAULT_VALUES.blur, 0, 2.5, 0.05),
      grain: clampNumber(candidate.grain ?? DEFAULT_VALUES.grain, 0, 1, 0.01),
      grainSize: clampNumber(candidate.grainSize ?? DEFAULT_VALUES.grainSize, 0.5, 4, 0.1),
    };
  }

  function createUniformResources() {
    return {
      uTime: { value: 0, type: "f32" },
      uResolution: { value: [1, 1], type: "vec2<f32>" },

      uColor1: { value: toLinearRgba("#9084FF"), type: "vec4<f32>" },
      uColor2: { value: toLinearRgba("#16171D"), type: "vec4<f32>" },
      uSpeed: { value: 0.1, type: "f32" },
      uScale: { value: 2.5, type: "f32" },
      uFrequency: { value: 8, type: "f32" },
      uRefraction: { value: 2, type: "f32" },
      uChromaticAberration: { value: 0, type: "f32" },
      uBlur: { value: 1, type: "f32" },
      uGrain: { value: 0.25, type: "f32" },
      uGrainSize: { value: 0.5, type: "f32" },
      uRenderResolution: { value: [1, 1], type: "vec2<f32>" },
      uPixelRatio: { value: 1, type: "f32" },
    };
  }

  function applyValues(uniforms: Record<string, unknown>, values: ShaderValues): void {
    uniforms["uColor1"] = toLinearRgba(values.color1);
    uniforms["uColor2"] = toLinearRgba(values.color2);
    uniforms["uSpeed"] = values.speed;
    uniforms["uScale"] = values.scale;
    uniforms["uFrequency"] = values.frequency;
    uniforms["uRefraction"] = values.refraction;
    uniforms["uChromaticAberration"] = values.chromaticAberration;
    uniforms["uBlur"] = values.blur;
    uniforms["uGrain"] = values.grain;
    uniforms["uGrainSize"] = values.grainSize;
  }

  async function mountSceneController(target: HTMLElement, options: SceneMountOptions = {}): Promise<ShaderController> {
    let destroyed = options.signal?.aborted ?? false;
    let cleanedUp = false;
    let paused = options.paused ?? false;

    let maxDpr = clampNumber(options.maxDpr ?? 2, 1, 3, 0.1);
    let resolutionScale = clampNumber(options.resolutionScale ?? 1, 0.25, 1, 0.05);
    let hidden = document.hidden;
    let intersecting = true;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let values = normalizeValues(options.values ?? {});
    const mountCleanup: { destroy: () => void } = { destroy: () => undefined };
    const rendererResolution = () => Math.min(window.devicePixelRatio || 1, maxDpr) * resolutionScale;
    const abortMount = () => {
      destroyed = true;
      mountCleanup.destroy();
    };
    options.signal?.addEventListener("abort", abortMount, { once: true });
    if (destroyed) {
      options.signal?.removeEventListener("abort", abortMount);
      throw new Error("Shader mount was cancelled.");
    }

    const createScene = async (preference: ShaderBackend) => {
      const app = new Application();
      const cleanup: Array<() => void> = [() => app.destroy(true, { children: true })];
      try {
        const resolution = 1;

        await app.init({
          preference,
          preferWebGLVersion: 2,
          powerPreference: "high-performance",
          autoStart: false,
          autoDensity: true,
          antialias: false,
          backgroundAlpha: 0,
          width: 1,
          height: 1,
          resolution,
        });

        cleanup.push(installLinearOutput(app, false));
        const backend =
          app.renderer.type === RendererType.WEBGPU
            ? ("webgpu" as const)
            : app.renderer.type === RendererType.WEBGL
              ? ("webgl" as const)
              : undefined;
        if (!backend || (preference === "webgl" && backend !== "webgl")) {
          throw new Error(`PixiJS initialized an unexpected renderer: ${app.renderer.type}.`);
        }

        if (destroyed) throw new Error("Shader mount was cancelled.");

        const geometry = new Geometry({
          attributes: {
            aPosition: [0, 0, 1, 0, 1, 1, 0, 1],
            aUV: [0, 0, 1, 0, 1, 1, 0, 1],
          },
          indexBuffer: [0, 1, 2, 0, 2, 3],
        });
        cleanup.push(() => geometry.destroy(true));
        const shader = Shader.from({
          gl: { vertex: WEBGL_VERTEX, fragment: WEBGL_FRAGMENT },
          gpu: {
            vertex: { source: WEBGPU_SOURCE, entryPoint: "mainVertex" },
            fragment: { source: WEBGPU_SOURCE, entryPoint: "mainFragment" },
          },
          resources: {
            liquidGlassUniforms: createUniformResources(),
          },
        });
        cleanup.push(() => shader.destroy());
        const mesh = new Mesh({ geometry, shader });
        const uniformGroup = shader.resources["liquidGlassUniforms"] as {
          uniforms: Record<string, unknown>;
        };
        applyValues(uniformGroup.uniforms, values);

        app.stage.addChild(mesh);
        cleanup.push(() => app.stage.removeChild(mesh));
        app.canvas.setAttribute("aria-hidden", "true");
        app.canvas.style.position = "absolute";
        app.canvas.style.inset = "0";
        app.canvas.style.display = "block";
        app.canvas.style.width = "100%";
        app.canvas.style.height = "100%";
        target.append(app.canvas);

        let invalidate = () => app.render();

        const resize = () => {
          const size = resizeRenderer(app, target, rendererResolution(), RENDER_PIXEL_BUDGET);
          if (!size?.changed) return;
          const { width, height } = size;
          mesh.width = width;
          mesh.height = height;
          syncRenderMetrics(uniformGroup.uniforms, width, height, app.renderer.resolution);
          invalidate();
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(target);
        cleanup.push(() => resizeObserver.disconnect());
        cleanup.push(observePixelRatio(resize));
        resize();

        const advance = (elapsed: number) => {
          uniformGroup.uniforms["uTime"] = (uniformGroup.uniforms["uTime"] as number) + elapsed;
        };
        const loop = createRenderLoop(app, {
          visible: () => !destroyed && !hidden && intersecting && target.clientWidth > 0 && target.clientHeight > 0,
          animated: () => !paused && !reducedMotion.matches,
          active: () => values.speed !== 0,
          update: advance,
          render: () => app.render(),
        });
        invalidate = loop.invalidate;
        cleanup.push(() => loop.destroy());

        return {
          app,
          loop,
          mesh,
          shader,
          geometry,
          uniforms: uniformGroup.uniforms,

          resizeObserver,
          resize,
          backend,
          destroy: () => runCleanup(cleanup),
        };
      } catch (error) {
        runCleanup(cleanup);
        throw error;
      }
    };

    let scene: Awaited<ReturnType<typeof createScene>>;
    try {
      scene = await initializeScene(
        createScene,
        options.preference,
        () => destroyed,
        (current) => {
          mountCleanup.destroy = current.destroy;
        },
        options.onStatus,
        options.onRendererLost,
      );
    } catch (error) {
      options.signal?.removeEventListener("abort", abortMount);
      throw error;
    }

    const syncPlayback = () => {
      if (destroyed) return;
      scene.loop.sync();
    };
    const handleVisibility = () => {
      hidden = document.hidden;
      syncPlayback();
    };
    const handleReducedMotion = () => {
      syncPlayback();
      scene.loop.invalidate();
    };
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        intersecting = entry?.isIntersecting ?? false;
        syncPlayback();
      },
      { rootMargin: "100px" },
    );
    intersectionObserver.observe(target);
    document.addEventListener("visibilitychange", handleVisibility);
    reducedMotion.addEventListener("change", handleReducedMotion);
    syncPlayback();

    const destroy = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      destroyed = true;

      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      reducedMotion.removeEventListener("change", handleReducedMotion);
      options.signal?.removeEventListener("abort", abortMount);
      scene.destroy();
    };
    const controller: ShaderController = {
      update(nextValues) {
        if (destroyed) return;

        values = normalizeValues({ ...values, ...nextValues });
        applyValues(scene.uniforms, values);

        scene.loop.invalidate();
      },
      setPaused(nextPaused) {
        if (destroyed) return;
        paused = nextPaused;
        syncPlayback();
      },

      setQuality(nextMaxDpr, nextResolutionScale) {
        if (destroyed) return;
        maxDpr = clampNumber(nextMaxDpr, 1, 3, 0.1);
        resolutionScale = clampNumber(nextResolutionScale, 0.25, 1, 0.05);
        scene.resize();
      },
      pause() {
        controller.setPaused(true);
      },
      resume() {
        controller.setPaused(false);
      },
      reset() {
        if (destroyed) return;
        values = normalizeValues(DEFAULT_VALUES);
        applyValues(scene.uniforms, values);
        scene.uniforms["uTime"] = 0;

        scene.loop.invalidate();
      },
      resize() {
        if (!destroyed) scene.resize();
      },
      destroy,
    };
    mountCleanup.destroy = destroy;
    if (destroyed) {
      destroy();
      throw new Error("Shader mount was cancelled.");
    }
    return controller;
  }

  type Props = Omit<HTMLAttributes<HTMLDivElement>, "color"> & {
    /** First color blended into the flowing pattern. @default "#9084FF" */
    color1?: string;
    /** Second color blended into the flowing pattern. @default "#16171D" */
    color2?: string;
    /** Animation speed multiplier. Set to zero for a still frame. @default 0.1 */
    speed?: number;
    /** Scale multiplier for the distorted field. @default 2.5 */
    scale?: number;
    /** Spatial frequency of the distorted folds. @default 8 */
    frequency?: number;
    /** Strength of the refraction through the flowing folds. @default 2 */
    refraction?: number;
    /** Strength of RGB separation inside the refracted surface. @default 0 */
    chromaticAberration?: number;
    /** Radius multiplier for the internal nine-sample blur. @default 1 */
    blur?: number;
    /** Strength of the dusty texture and scattered pigment. @default 0.25 */
    grain?: number;
    /** Size of the coarse grain in CSS pixels, independent of the pattern. @default 0.5 */
    grainSize?: number;
    /** Stops rendering while preserving the current frame. @default false */
    paused?: boolean;

    /** Maximum device-pixel ratio used by the renderer. @default 2 */
    maxDpr?: number;
    /** GPU resolution multiplier that does not affect layout. @default 1 */
    resolutionScale?: number;
    onReady?: (backend: ShaderBackend) => void;
    onRendererChange?: (backend: ShaderBackend, reason: string) => void;
    onError?: (error: Error) => void;
  };

  let {
    class: className,
    color1 = "#9084FF",
    color2 = "#16171D",
    speed = 0.1,
    scale = 2.5,
    frequency = 8,
    refraction = 2,
    chromaticAberration = 0,
    blur = 1,
    grain = 0.25,
    grainSize = 0.5,
    paused = false,

    maxDpr = 2,
    resolutionScale = 1,
    onReady,
    onRendererChange,
    onError,
    ...rest
  }: Props = $props();

  let root: HTMLDivElement;
  let controller: ShaderController | undefined;

  function currentValues(): ShaderValues {
    return {
      color1: color1,
      color2: color2,
      speed: speed,
      scale: scale,
      frequency: frequency,
      refraction: refraction,
      chromaticAberration: chromaticAberration,
      blur: blur,
      grain: grain,
      grainSize: grainSize,
    };
  }

  $effect(() => {
    const nextValues = currentValues();
    controller?.update(nextValues);
  });
  $effect(() => {
    const nextPaused = paused;
    controller?.setPaused(nextPaused);
  });

  $effect(() => {
    const nextMaxDpr = maxDpr;
    const nextResolutionScale = resolutionScale;
    controller?.setQuality(nextMaxDpr, nextResolutionScale);
  });

  export function pause(): void {
    controller?.pause();
  }

  export function resume(): void {
    controller?.resume();
  }

  export function reset(): void {
    controller?.reset();
  }

  export function resize(): void {
    controller?.resize();
  }

  export function destroy(): void {
    controller?.destroy();
    controller = undefined;
  }

  onMount(() => {
    let cancelled = false;
    let errorReported = false;
    const abortController = new AbortController();
    void mountShader(root, {
      values: currentValues(),
      paused,

      maxDpr,
      resolutionScale,
      signal: abortController.signal,
      onStatus(status) {
        if (status.state === "ready") onReady?.(status.backend);
        if (status.state === "fallback") {
          onRendererChange?.(status.backend, status.reason);
          onReady?.(status.backend);
        }
        if (status.state === "error") {
          errorReported = true;
          onError?.(new Error(status.reason));
        }
      },
    })
      .then((instance) => {
        if (cancelled) instance.destroy();
        else {
          controller = instance;
          controller.update(currentValues());
          controller.setPaused(paused);

          controller.setQuality(maxDpr, resolutionScale);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && !errorReported) onError?.(error instanceof Error ? error : new Error(String(error)));
      });

    return () => {
      cancelled = true;
      abortController.abort();
      controller?.destroy();
      controller = undefined;
    };
  });
</script>

<div bind:this={root} class={cn("relative size-full overflow-hidden", className)} {...rest}></div>
