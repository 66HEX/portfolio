<script lang="ts">
	import {
		Application,
		Geometry,
		Mesh,
		RendererType,
		Shader,
		BufferImageSource,
		ShaderStage,
		Texture,
		RenderTarget,
		RenderTexture,
		UPDATE_PRIORITY
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
		return error instanceof Error
			? error.message
			: "The graphics backend could not be initialized.";
	}

	async function initializeScene<
		T extends { app: Application; backend: ShaderBackend; destroy(): void }
	>(
		create: (preference: ShaderBackend) => Promise<T>,
		preference: ShaderBackend | undefined,
		cancelled: () => boolean,
		adopt: (scene: T) => void,
		onStatus?: (status: ShaderRuntimeStatus) => void,
		onRendererLost?: (backend: ShaderBackend, reason: string) => void
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
						cause: fallbackError
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
							reason: fallbackReason ?? "WebGPU was unavailable; PixiJS selected WebGL."
						}
					: { state: "ready", backend: scene.backend }
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
						Number(backend.gl.getParameter(backend.gl.MAX_RENDERBUFFER_SIZE))
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
			height: Math.max(1, Math.floor(h * scale))
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

	const RENDER_PIXEL_BUDGET = 2396745;

	const rendererSizes = new WeakMap<
		object,
		{ width: number; height: number; resolution: number }
	>();

	function resizeRenderer(
		app: Application,
		target: HTMLElement,
		resolution: number,
		maxPixels: number
	) {
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
			maxPixels
		});
		resolution =
			physical.width === requestedWidth && physical.height === requestedHeight
				? desired
				: Math.min(desired, physical.width / logicalWidth, physical.height / logicalHeight);
		// Pixi rounds logical size times resolution; retain at least one physical texel.
		const width = Math.max(logicalWidth, 1 / resolution);
		const height = Math.max(logicalHeight, 1 / resolution);
		const previous = rendererSizes.get(app.renderer);
		if (
			previous?.width === width &&
			previous.height === height &&
			previous.resolution === resolution
		) {
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
		notify: (backend: ShaderBackend, reason: string) => void
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

	async function mountShader(
		target: HTMLElement,
		options: MountOptions = {}
	): Promise<ShaderController> {
		let disposed = false;
		let current: ShaderController | undefined;
		let pending: AbortController | undefined;
		let values = normalizeValues(options.values ?? {});
		let paused = options.paused ?? false;
		let interactive = options.interactive ?? true;
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
						interactive,
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
								if (++recoveryAttempts > 2)
									throw new Error("The graphics device repeatedly failed during recovery.");
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
						}
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
						next.setInteractive(interactive);
						next.setQuality(maxDpr, resolutionScale);
					}
					if (
						recovering &&
						status?.state === "ready" &&
						status.backend === "webgl" &&
						options.preference !== "webgl"
					) {
						status = {
							state: "fallback",
							backend: "webgl",
							reason: "WebGPU repeatedly lost its device; rendering resumed with WebGL."
						};
					}
					recovering = false;
					lastReady = performance.now();
					if (status) publish(status);
					return;
				} catch (error) {
					attempt.abort();
					if (!disposed && lostDuringMount && ++recoveryAttempts <= 2) {
						preference =
							lostDuringMount === "webgpu" && recoveryAttempts === 1 ? "webgpu" : "webgl";
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
				if (
					(Object.keys(normalized) as Array<keyof ShaderValues>).every(
						(key) => normalized[key] === values[key]
					)
				)
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
			setInteractive(next) {
				if (disposed || interactive === next) return;
				interactive = next;
				revision += 1;
				current?.setInteractive(next);
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
				values = normalizeValues({
					...DEFAULT_VALUES,
					svgSource: values.svgSource,
					fontUrl: values.fontUrl
				});
				revision += 1;
				current?.reset();
			},
			resize() {
				if (!disposed) current?.resize();
			},
			destroy
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
		}
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
			}
		};
	}

	function dampValue(
		value: number,
		target: number,
		rate: number,
		elapsed: number,
		epsilon = 0.00001
	): number {
		const next = value + (target - value) * (1 - Math.exp(-rate * elapsed));
		return Math.abs(target - next) <= epsilon ? target : next;
	}

	function syncRenderMetrics(
		uniforms: Record<string, unknown>,
		width: number,
		height: number,
		pixelRatio: number
	): void {
		const logicalWidth = Math.max(1, width);
		const logicalHeight = Math.max(1, height);
		const ratio = Math.max(Number.EPSILON, pixelRatio);
		uniforms["uResolution"] = [logicalWidth, logicalHeight];
		uniforms["uRenderResolution"] = [
			Math.max(1, Math.round(logicalWidth * ratio)),
			Math.max(1, Math.round(logicalHeight * ratio))
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
			1
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
				(gl.getInternalformatParameter(gl.RENDERBUFFER, format, gl.SAMPLES) as Int32Array).includes(
					4
				)
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
				[depthBuffer, gl.DEPTH24_STENCIL8, gl.DEPTH_STENCIL_ATTACHMENT]
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
		const previous = system.renderTarget
			? system.getBindState()
			: { target: renderer.view.renderTarget, clear: false };
		const readFramebuffer = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
		const renderbuffer = gl.getParameter(gl.RENDERBUFFER_BINDING) as WebGLRenderbuffer | null;
		const check = () => {
			const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
			const error = consumeLinearTargetError(gl);
			if (status !== gl.FRAMEBUFFER_COMPLETE || error !== gl.NO_ERROR) {
				throw new Error(
					"The WebGL half-float color target is unavailable (framebuffer status " +
						status +
						", error " +
						error +
						")."
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
				antialias
			});
			cleanup.push(() => texture.destroy(true));
			const target = new RenderTarget({ colorTextures: [texture], depth });
			cleanup.push(() => target.destroy());
			validateLinearTarget(app, target);
			const geometry = new Geometry({
				attributes: {
					aPosition: { buffer: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), format: "float32x2" },
					aUV: { buffer: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), format: "float32x2" }
				},
				indexBuffer: new Uint32Array([0, 1, 2, 0, 2, 3])
			});
			cleanup.push(() => geometry.destroy(true));
			const gpuSource =
				"\nstruct GlobalUniforms {\n\tuProjectionMatrix: mat3x3<f32>,\n\tuWorldTransformMatrix: mat3x3<f32>,\n\tuWorldColorAlpha: vec4<f32>,\n\tuResolution: vec2<f32>,\n}\n\nstruct LocalUniforms {\n\tuTransformMatrix: mat3x3<f32>,\n\tuColor: vec4<f32>,\n\tuRound: f32,\n}\nstruct VertexOutput {\n\t@builtin(position) position: vec4<f32>,\n\t@location(0) uv: vec2<f32>,\n}\n@group(0) @binding(0) var<uniform> globalUniforms: GlobalUniforms;\n@group(1) @binding(0) var<uniform> localUniforms: LocalUniforms;\n@group(2) @binding(0) var uLinearTexture: texture_2d<f32>;\n@group(2) @binding(1) var uLinearSampler: sampler;\n@vertex\nfn mainVertex(\n\t@location(0) aPosition: vec2<f32>,\n\t@location(1) aUV: vec2<f32>,\n) -> VertexOutput {\n\tvar output: VertexOutput;\n\tlet mvp = globalUniforms.uProjectionMatrix\n\t\t* globalUniforms.uWorldTransformMatrix\n\t\t* localUniforms.uTransformMatrix;\n\toutput.position = vec4<f32>((mvp * vec3<f32>(aPosition, 1.0)).xy, 0.0, 1.0);\n\toutput.uv = aUV;\n\treturn output;\n}\n\nfn linearToSrgb(color: vec3<f32>) -> vec3<f32> {\n  let safe = max(color, vec3<f32>(0.0));\n  return select(1.055 * pow(safe, vec3<f32>(1.0 / 2.4)) - vec3<f32>(0.055),\n    safe * 12.92, safe <= vec3<f32>(0.0031308));\n}\nfn displayColor(linearColor: vec4<f32>) -> vec4<f32> {\n  let alpha = clamp(linearColor.a, 0.0, 1.0);\n  if (alpha <= 0.0) { return vec4<f32>(0.0); }\n  return vec4<f32>(clamp(linearToSrgb(linearColor.rgb / alpha), vec3<f32>(0.0), vec3<f32>(1.0)) * alpha, alpha);\n}\n\n@fragment\nfn mainFragment(input: VertexOutput) -> @location(0) vec4<f32> {\n  return displayColor(textureSampleLevel(uLinearTexture, uLinearSampler, input.uv, 0.0));\n}\n";
			const shader = Shader.from({
				gl: {
					vertex:
						"\n#version 300 es\nin vec2 aPosition;\nin vec2 aUV;\nout vec2 vUV;\n\nuniform mat3 uProjectionMatrix;\nuniform mat3 uWorldTransformMatrix;\nuniform mat3 uTransformMatrix;\n\nvoid main() {\n\tvUV = aUV;\n\tmat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;\n\tgl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);\n}\n",
					fragment:
						"\n#version 300 es\nprecision highp float;\nin vec2 vUV;\nout vec4 finalColor;\nuniform sampler2D uLinearTexture;\n\nvec3 linearToSrgb(vec3 color) {\n  vec3 safe = max(color, vec3(0.0));\n  return mix(1.055 * pow(safe, vec3(1.0 / 2.4)) - 0.055,\n    safe * 12.92, lessThanEqual(safe, vec3(0.0031308)));\n}\nvec4 displayColor(vec4 linearColor) {\n  float alpha = clamp(linearColor.a, 0.0, 1.0);\n  if (alpha <= 0.0) return vec4(0.0);\n  return vec4(clamp(linearToSrgb(linearColor.rgb / alpha), 0.0, 1.0) * alpha, alpha);\n}\n\nvoid main() {\n  finalColor = displayColor(texture(uLinearTexture, vUV));\n}\n"
				},
				gpu: {
					vertex: { source: gpuSource, entryPoint: "mainVertex" },
					fragment: { source: gpuSource, entryPoint: "mainFragment" }
				},
				resources: { uLinearTexture: texture.source, uLinearSampler: texture.source.style }
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
					if (
						texture.width !== width ||
						texture.height !== height ||
						texture.source.resolution !== resolution
					) {
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
					clearColor: [0, 0, 0, 0]
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

	type ShaderFontSource = {
		url: string;
		weight?: string;
		style?: string;
		stretch?: string;
		featureSettings?: string;
		variationSettings?: string;
	};
	type TextTypography = {
		fontSize: number;
		fontWeight: number;
		fontStyle: string;
		letterSpacing: number;
		lineHeight: number;
		padding: number;
		textAlign: string;
		verticalAlign: string;
		wrap: string;
		fit: string;
		direction: string;
	};
	type TextFontLease = { family: string; release(): void };
	type TextFontEntry = {
		refs: number;
		controller: AbortController;
		promise: Promise<FontFace>;
		face?: FontFace;
	};
	// Svelte/Vue can instantiate these declarations per component. A versioned
	// document key shares leases across standalone files and framework instances.
	const textFontCacheKey = Symbol.for("godsend.text-font-cache.v1");
	function textFontCache(owner: Document): Map<string, TextFontEntry> {
		const registry = owner as unknown as Record<symbol, Map<string, TextFontEntry> | undefined>;
		return (registry[textFontCacheKey] ??= new Map());
	}

	function normalizeTextFont(source: unknown): ShaderFontSource {
		if (typeof source === "string") return { url: source.trim() };
		if (
			!source ||
			typeof source !== "object" ||
			!("url" in source) ||
			typeof source.url !== "string"
		)
			throw new Error("Provide a font URL.");
		const result: ShaderFontSource = { url: source.url.trim() };
		for (const key of [
			"weight",
			"style",
			"stretch",
			"featureSettings",
			"variationSettings"
		] as const) {
			const value = (source as ShaderFontSource)[key];
			if (value === undefined) continue;
			if (typeof value !== "string" || value.length > 512)
				throw new Error("Invalid font " + key + ".");
			result[key] = value;
		}
		return result;
	}

	function textAbortError(): Error {
		return new DOMException("Text preparation was cancelled.", "AbortError");
	}
	function awaitTextTask<T>(task: Promise<T>, signal: AbortSignal): Promise<T> {
		if (signal.aborted) return Promise.reject(textAbortError());
		return new Promise((resolve, reject) => {
			const abort = () => {
				signal.removeEventListener("abort", abort);
				reject(textAbortError());
			};
			signal.addEventListener("abort", abort, { once: true });
			task.then(
				(value) => {
					signal.removeEventListener("abort", abort);
					resolve(value);
				},
				(error) => {
					signal.removeEventListener("abort", abort);
					reject(error);
				}
			);
		});
	}

	async function readTextFontBytes(url: string, signal: AbortSignal): Promise<ArrayBuffer> {
		const response = await fetch(url, { signal, credentials: "same-origin" });
		if (!response.ok)
			throw new Error("The font could not be loaded (HTTP " + response.status + ").");
		const limit = 16 * 1024 * 1024;
		if (Number(response.headers.get("content-length")) > limit) {
			await response.body?.cancel();
			throw new Error("Font files must be at most 16 MiB.");
		}
		if (!response.body) throw new Error("The font response is empty.");
		const reader = response.body.getReader();
		const chunks: Uint8Array[] = [];
		let length = 0;
		try {
			for (;;) {
				const part = await reader.read();
				if (part.done) break;
				length += part.value.byteLength;
				if (length > limit) throw new Error("Font files must be at most 16 MiB.");
				chunks.push(part.value);
			}
		} finally {
			await reader.cancel().catch(() => undefined);
			reader.releaseLock();
		}
		const bytes = new Uint8Array(length);
		let offset = 0;
		for (const chunk of chunks) {
			bytes.set(chunk, offset);
			offset += chunk.byteLength;
		}
		return bytes.buffer;
	}

	async function acquireTextFont(
		source: ShaderFontSource,
		signal: AbortSignal,
		owner: Document = document
	): Promise<TextFontLease> {
		if (signal.aborted) throw textAbortError();
		if (!source.url) throw new Error("Provide a font URL.");
		const url = new URL(source.url, owner.baseURI);
		if (!["http:", "https:", "blob:", "data:"].includes(url.protocol))
			throw new Error("Use an HTTP, blob, or data URL for the font.");
		const key = JSON.stringify({ ...source, url: url.href });
		const cache = textFontCache(owner);
		let entry = cache.get(key);
		if (!entry) {
			const controller = new AbortController();
			const next: TextFontEntry = {
				refs: 0,
				controller,
				promise: Promise.resolve(undefined as unknown as FontFace)
			};
			next.promise = (async () => {
				let timedOut = false;
				const timeout = setTimeout(() => {
					timedOut = true;
					controller.abort();
				}, 15000);
				try {
					const bytes = await readTextFontBytes(url.href, controller.signal);
					const family = "GodsendText" + crypto.getRandomValues(new Uint32Array(4)).join("x");
					const face = new FontFace(family, bytes, {
						weight: source.weight ?? "1 1000",
						style: source.style ?? "normal",
						stretch: source.stretch ?? "50% 200%",
						featureSettings: source.featureSettings ?? "normal",
						...(source.variationSettings ? { variationSettings: source.variationSettings } : {})
					});
					if (source.variationSettings && !("variationSettings" in face))
						throw new Error("This browser does not support custom font variation settings.");
					await awaitTextTask(face.load(), controller.signal);
					if (controller.signal.aborted || next.refs === 0) throw textAbortError();
					owner.fonts.add(face);
					next.face = face;
					return face;
				} catch (error) {
					if (timedOut)
						throw new Error("The font took longer than 15 seconds to load.", { cause: error });
					throw error;
				} finally {
					clearTimeout(timeout);
				}
			})();
			entry = next;
			cache.set(key, next);
		}
		const retained = entry;
		retained.refs++;
		let released = false;
		const release = () => {
			if (released) return;
			released = true;
			if (--retained.refs === 0) {
				retained.controller.abort();
				if (retained.face) owner.fonts.delete(retained.face);
				if (cache.get(key) === retained) cache.delete(key);
			}
		};
		try {
			const face = await awaitTextTask(retained.promise, signal);
			if (signal.aborted) throw textAbortError();
			return { family: face.family, release };
		} catch (error) {
			release();
			throw error;
		}
	}

	function configureTextContext(
		context: CanvasRenderingContext2D,
		family: string,
		style: TextTypography,
		size: number
	): void {
		context.font = style.fontStyle + " " + style.fontWeight + " " + size + 'px "' + family + '"';
		context.textBaseline = "alphabetic";
		context.textAlign = "left";
		context.fontKerning = "normal";
		context.textRendering = "optimizeLegibility";
		if ("letterSpacing" in context) context.letterSpacing = style.letterSpacing * size + "px";
		else if (style.letterSpacing !== 0)
			throw new Error("This browser does not support canvas letter spacing.");
	}

	const textSpacingBounds = new WeakMap<CanvasRenderingContext2D, boolean>();
	function measureTextInk(context: CanvasRenderingContext2D, text: string) {
		const metrics = context.measureText(text);
		let trailing = 0;
		if ("letterSpacing" in context) {
			let includesSpacing = textSpacingBounds.get(context);
			if (includesSpacing === undefined) {
				// Some canvas engines include trailing spacing even in actual ink bounds.
				// Probe a single glyph; its painted width cannot grow with letter spacing.
				const saved = context.letterSpacing;
				context.letterSpacing = "0px";
				const plain = context.measureText("M");
				context.letterSpacing = "1px";
				const spaced = context.measureText("M");
				context.letterSpacing = saved;
				includesSpacing =
					spaced.actualBoundingBoxRight +
						spaced.actualBoundingBoxLeft -
						plain.actualBoundingBoxRight -
						plain.actualBoundingBoxLeft >
					0.5;
				textSpacingBounds.set(context, includesSpacing);
			}
			if (text && includesSpacing) trailing = Number.parseFloat(context.letterSpacing) || 0;
		}
		const left = metrics.actualBoundingBoxLeft;
		return { metrics, left, width: Math.max(0, left + metrics.actualBoundingBoxRight - trailing) };
	}

	const KEYBOARD_LAYOUT: {
		bounds: [number, number, number, number];
		keys: Array<{
			id: string;
			label: string;
			row: number;
			column: number;
			center: [number, number];
			size: [number, number];
			legend: string;
			secondaryLegend?: string;
			legendIcon?: string;
			logo?: boolean;
			legendAnchor?: [number, number];
			secondaryLegendAnchor?: [number, number];
			legendAlign?: "left" | "center" | "right";
			secondaryLegendAlign?: "left" | "center" | "right";
		}>;
	} = {
		bounds: [-7.315, -11.14, 22.105, 0.94],
		keys: [
			{
				id: "Escape",
				label: "Escape",
				row: 0,
				column: 0,
				center: [-5.865, -10.2],
				size: [2.9, 1.88],
				legend: "esc",
				legendAnchor: [-0.39, 0.24],
				legendAlign: "left"
			},
			{
				id: "F1",
				label: "F1: Decrease brightness",
				row: 0,
				column: 1,
				center: [-3.315, -10.2],
				size: [1.88, 1.88],
				legend: "",
				secondaryLegend: "F1",
				legendAnchor: [0, -0.14],
				secondaryLegendAnchor: [0, 0.25],
				legendAlign: "center",
				legendIcon: "brightness-down"
			},
			{
				id: "F2",
				label: "F2: Increase brightness",
				row: 0,
				column: 2,
				center: [-1.275, -10.2],
				size: [1.88, 1.88],
				legend: "",
				secondaryLegend: "F2",
				legendAnchor: [0, -0.14],
				secondaryLegendAnchor: [0, 0.25],
				legendAlign: "center",
				legendIcon: "brightness-up"
			},
			{
				id: "F3",
				label: "F3: Mission Control",
				row: 0,
				column: 3,
				center: [0.765, -10.2],
				size: [1.88, 1.88],
				legend: "",
				secondaryLegend: "F3",
				legendAnchor: [0, -0.14],
				secondaryLegendAnchor: [0, 0.25],
				legendAlign: "center",
				legendIcon: "mission-control"
			},
			{
				id: "F4",
				label: "F4: Spotlight",
				row: 0,
				column: 4,
				center: [2.805, -10.2],
				size: [1.88, 1.88],
				legend: "",
				secondaryLegend: "F4",
				legendAnchor: [0, -0.14],
				secondaryLegendAnchor: [0, 0.25],
				legendAlign: "center",
				legendIcon: "search"
			},
			{
				id: "F5",
				label: "F5: Dictation",
				row: 0,
				column: 5,
				center: [4.845, -10.2],
				size: [1.88, 1.88],
				legend: "",
				secondaryLegend: "F5",
				legendAnchor: [0, -0.14],
				secondaryLegendAnchor: [0, 0.25],
				legendAlign: "center",
				legendIcon: "microphone"
			},
			{
				id: "F6",
				label: "F6: Do Not Disturb",
				row: 0,
				column: 6,
				center: [6.885, -10.2],
				size: [1.88, 1.88],
				legend: "",
				secondaryLegend: "F6",
				legendAnchor: [0, -0.14],
				secondaryLegendAnchor: [0, 0.25],
				legendAlign: "center",
				legendIcon: "moon"
			},
			{
				id: "F7",
				label: "F7: Previous track",
				row: 0,
				column: 7,
				center: [8.925, -10.2],
				size: [1.88, 1.88],
				legend: "",
				secondaryLegend: "F7",
				legendAnchor: [0, -0.14],
				secondaryLegendAnchor: [0, 0.25],
				legendAlign: "center",
				legendIcon: "previous"
			},
			{
				id: "F8",
				label: "F8: Play or pause",
				row: 0,
				column: 8,
				center: [10.965, -10.2],
				size: [1.88, 1.88],
				legend: "",
				secondaryLegend: "F8",
				legendAnchor: [0, -0.14],
				secondaryLegendAnchor: [0, 0.25],
				legendAlign: "center",
				legendIcon: "play-pause"
			},
			{
				id: "F9",
				label: "F9: Next track",
				row: 0,
				column: 9,
				center: [13.005, -10.2],
				size: [1.88, 1.88],
				legend: "",
				secondaryLegend: "F9",
				legendAnchor: [0, -0.14],
				secondaryLegendAnchor: [0, 0.25],
				legendAlign: "center",
				legendIcon: "next"
			},
			{
				id: "F10",
				label: "F10: Mute",
				row: 0,
				column: 10,
				center: [15.045, -10.2],
				size: [1.88, 1.88],
				legend: "",
				secondaryLegend: "F10",
				legendAnchor: [0, -0.14],
				secondaryLegendAnchor: [0, 0.25],
				legendAlign: "center",
				legendIcon: "mute"
			},
			{
				id: "F11",
				label: "F11: Decrease volume",
				row: 0,
				column: 11,
				center: [17.085, -10.2],
				size: [1.88, 1.88],
				legend: "",
				secondaryLegend: "F11",
				legendAnchor: [0, -0.14],
				secondaryLegendAnchor: [0, 0.25],
				legendAlign: "center",
				legendIcon: "volume-down"
			},
			{
				id: "F12",
				label: "F12: Increase volume",
				row: 0,
				column: 12,
				center: [19.125, -10.2],
				size: [1.88, 1.88],
				legend: "",
				secondaryLegend: "F12",
				legendAnchor: [0, -0.14],
				secondaryLegendAnchor: [0, 0.25],
				legendAlign: "center",
				legendIcon: "volume-up"
			},
			{
				id: "Power",
				label: "Touch ID / power",
				row: 0,
				column: 13,
				center: [21.165, -10.2],
				size: [1.88, 1.88],
				legend: "",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "Backquote",
				label: "Grave / tilde",
				row: 1,
				column: 0,
				center: [-6.375, -8.16],
				size: [1.88, 1.88],
				legend: "`",
				secondaryLegend: "~",
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "Digit1",
				label: "1",
				row: 1,
				column: 1,
				center: [-4.335, -8.16],
				size: [1.88, 1.88],
				legend: "1",
				secondaryLegend: "!",
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "Digit2",
				label: "2",
				row: 1,
				column: 2,
				center: [-2.295, -8.16],
				size: [1.88, 1.88],
				legend: "2",
				secondaryLegend: "@",
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "Digit3",
				label: "3",
				row: 1,
				column: 3,
				center: [-0.255, -8.16],
				size: [1.88, 1.88],
				legend: "3",
				secondaryLegend: "#",
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "Digit4",
				label: "4",
				row: 1,
				column: 4,
				center: [1.785, -8.16],
				size: [1.88, 1.88],
				legend: "4",
				secondaryLegend: "$",
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "Digit5",
				label: "5",
				row: 1,
				column: 5,
				center: [3.825, -8.16],
				size: [1.88, 1.88],
				legend: "5",
				secondaryLegend: "%",
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "Digit6",
				label: "6",
				row: 1,
				column: 6,
				center: [5.865, -8.16],
				size: [1.88, 1.88],
				legend: "6",
				secondaryLegend: "^",
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "Digit7",
				label: "7",
				row: 1,
				column: 7,
				center: [7.905, -8.16],
				size: [1.88, 1.88],
				legend: "7",
				secondaryLegend: "&",
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "Digit8",
				label: "8",
				row: 1,
				column: 8,
				center: [9.945, -8.16],
				size: [1.88, 1.88],
				legend: "8",
				secondaryLegend: "*",
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "Digit9",
				label: "9",
				row: 1,
				column: 9,
				center: [11.985, -8.16],
				size: [1.88, 1.88],
				legend: "9",
				secondaryLegend: "(",
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "Digit0",
				label: "0",
				row: 1,
				column: 10,
				center: [14.025, -8.16],
				size: [1.88, 1.88],
				legend: "0",
				secondaryLegend: ")",
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "Minus",
				label: "Minus / underscore",
				row: 1,
				column: 11,
				center: [16.065, -8.16],
				size: [1.88, 1.88],
				legend: "−",
				secondaryLegend: "_",
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "Equal",
				label: "Equals / plus",
				row: 1,
				column: 12,
				center: [18.105, -8.16],
				size: [1.88, 1.88],
				legend: "=",
				secondaryLegend: "+",
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "Backspace",
				label: "Delete",
				row: 1,
				column: 13,
				center: [20.655, -8.16],
				size: [2.9, 1.88],
				legend: "⌫",
				legendAnchor: [0.38, 0.2],
				legendAlign: "right"
			},
			{
				id: "Tab",
				label: "Tab",
				row: 2,
				column: 0,
				center: [-5.865, -6.12],
				size: [2.9, 1.88],
				legend: "⇥",
				legendAnchor: [-0.39, 0.23],
				legendAlign: "left"
			},
			{
				id: "KeyQ",
				label: "Q",
				row: 2,
				column: 1,
				center: [-3.315, -6.12],
				size: [1.88, 1.88],
				legend: "Q",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyW",
				label: "W",
				row: 2,
				column: 2,
				center: [-1.275, -6.12],
				size: [1.88, 1.88],
				legend: "W",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyE",
				label: "E",
				row: 2,
				column: 3,
				center: [0.765, -6.12],
				size: [1.88, 1.88],
				legend: "E",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyR",
				label: "R",
				row: 2,
				column: 4,
				center: [2.805, -6.12],
				size: [1.88, 1.88],
				legend: "R",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyT",
				label: "T",
				row: 2,
				column: 5,
				center: [4.845, -6.12],
				size: [1.88, 1.88],
				legend: "T",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyY",
				label: "Y",
				row: 2,
				column: 6,
				center: [6.885, -6.12],
				size: [1.88, 1.88],
				legend: "Y",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyU",
				label: "U",
				row: 2,
				column: 7,
				center: [8.925, -6.12],
				size: [1.88, 1.88],
				legend: "U",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyI",
				label: "I",
				row: 2,
				column: 8,
				center: [10.965, -6.12],
				size: [1.88, 1.88],
				legend: "I",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyO",
				label: "O",
				row: 2,
				column: 9,
				center: [13.005, -6.12],
				size: [1.88, 1.88],
				legend: "O",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyP",
				label: "P",
				row: 2,
				column: 10,
				center: [15.045, -6.12],
				size: [1.88, 1.88],
				legend: "P",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "BracketLeft",
				label: "Left bracket / brace",
				row: 2,
				column: 11,
				center: [17.085, -6.12],
				size: [1.88, 1.88],
				legend: "[",
				secondaryLegend: "{",
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "BracketRight",
				label: "Right bracket / brace",
				row: 2,
				column: 12,
				center: [19.125, -6.12],
				size: [1.88, 1.88],
				legend: "]",
				secondaryLegend: "}",
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "Backslash",
				label: "Backslash / vertical bar",
				row: 2,
				column: 13,
				center: [21.165, -6.12],
				size: [1.88, 1.88],
				legend: "\\",
				secondaryLegend: "|",
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "CapsLock",
				label: "Caps Lock",
				row: 3,
				column: 0,
				center: [-5.61, -4.08],
				size: [3.41, 1.88],
				legend: "⇪",
				legendAnchor: [-0.4, 0.21],
				legendAlign: "left"
			},
			{
				id: "KeyA",
				label: "A",
				row: 3,
				column: 1,
				center: [-2.805, -4.08],
				size: [1.88, 1.88],
				legend: "A",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyS",
				label: "S",
				row: 3,
				column: 2,
				center: [-0.765, -4.08],
				size: [1.88, 1.88],
				legend: "S",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyD",
				label: "D",
				row: 3,
				column: 3,
				center: [1.275, -4.08],
				size: [1.88, 1.88],
				legend: "D",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyF",
				label: "F",
				row: 3,
				column: 4,
				center: [3.315, -4.08],
				size: [1.88, 1.88],
				legend: "F",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyG",
				label: "G",
				row: 3,
				column: 5,
				center: [5.355, -4.08],
				size: [1.88, 1.88],
				legend: "G",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyH",
				label: "H",
				row: 3,
				column: 6,
				center: [7.395, -4.08],
				size: [1.88, 1.88],
				legend: "H",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyJ",
				label: "J",
				row: 3,
				column: 7,
				center: [9.435, -4.08],
				size: [1.88, 1.88],
				legend: "J",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyK",
				label: "K",
				row: 3,
				column: 8,
				center: [11.475, -4.08],
				size: [1.88, 1.88],
				legend: "K",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyL",
				label: "L",
				row: 3,
				column: 9,
				center: [13.515, -4.08],
				size: [1.88, 1.88],
				legend: "L",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "Semicolon",
				label: "Semicolon / colon",
				row: 3,
				column: 10,
				center: [15.555, -4.08],
				size: [1.88, 1.88],
				legend: ";",
				secondaryLegend: ":",
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "Quote",
				label: "Quote / double quote",
				row: 3,
				column: 11,
				center: [17.595, -4.08],
				size: [1.88, 1.88],
				legend: "'",
				secondaryLegend: '"',
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "Enter",
				label: "Return",
				row: 3,
				column: 12,
				center: [20.4, -4.08],
				size: [3.41, 1.88],
				legend: "↵",
				legendAnchor: [0.4, 0.21],
				legendAlign: "right"
			},
			{
				id: "ShiftLeft",
				label: "Left Shift",
				row: 4,
				column: 0,
				center: [-5.1, -2.04],
				size: [4.43, 1.88],
				legend: "⇧",
				legendAnchor: [-0.42, 0.22],
				legendAlign: "left"
			},
			{
				id: "KeyZ",
				label: "Z",
				row: 4,
				column: 1,
				center: [-1.785, -2.04],
				size: [1.88, 1.88],
				legend: "Z",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyX",
				label: "X",
				row: 4,
				column: 2,
				center: [0.255, -2.04],
				size: [1.88, 1.88],
				legend: "X",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyC",
				label: "C",
				row: 4,
				column: 3,
				center: [2.295, -2.04],
				size: [1.88, 1.88],
				legend: "C",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyV",
				label: "V",
				row: 4,
				column: 4,
				center: [4.335, -2.04],
				size: [1.88, 1.88],
				legend: "V",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyB",
				label: "B",
				row: 4,
				column: 5,
				center: [6.375, -2.04],
				size: [1.88, 1.88],
				legend: "B",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyN",
				label: "N",
				row: 4,
				column: 6,
				center: [8.415, -2.04],
				size: [1.88, 1.88],
				legend: "N",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "KeyM",
				label: "M",
				row: 4,
				column: 7,
				center: [10.455, -2.04],
				size: [1.88, 1.88],
				legend: "M",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "Comma",
				label: "Comma / less than",
				row: 4,
				column: 8,
				center: [12.495, -2.04],
				size: [1.88, 1.88],
				legend: ",",
				secondaryLegend: "<",
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "Period",
				label: "Period / greater than",
				row: 4,
				column: 9,
				center: [14.535, -2.04],
				size: [1.88, 1.88],
				legend: ".",
				secondaryLegend: ">",
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "Slash",
				label: "Slash / question mark",
				row: 4,
				column: 10,
				center: [16.575, -2.04],
				size: [1.88, 1.88],
				legend: "/",
				secondaryLegend: "?",
				legendAnchor: [0, 0.2],
				secondaryLegendAnchor: [0, -0.22],
				legendAlign: "center",
				secondaryLegendAlign: "center"
			},
			{
				id: "ShiftRight",
				label: "Right Shift",
				row: 4,
				column: 11,
				center: [19.89, -2.04],
				size: [4.43, 1.88],
				legend: "⇧",
				legendAnchor: [0.42, 0.22],
				legendAlign: "right"
			},
			{
				id: "Fn",
				label: "Function / Globe",
				row: 5,
				column: 0,
				center: [-6.375, 0],
				size: [1.88, 1.88],
				legend: "",
				secondaryLegend: "fn",
				legendAnchor: [-0.2, 0.2],
				secondaryLegendAnchor: [0.24, 0.25],
				legendAlign: "center",
				legendIcon: "globe"
			},
			{
				id: "ControlLeft",
				label: "Control",
				row: 5,
				column: 1,
				center: [-4.335, 0],
				size: [1.88, 1.88],
				legend: "⌃",
				secondaryLegend: "control",
				legendAnchor: [-0.22, -0.23],
				secondaryLegendAnchor: [0, 0.25],
				legendAlign: "center"
			},
			{
				id: "AltLeft",
				label: "Option",
				row: 5,
				column: 2,
				center: [-2.295, 0],
				size: [1.88, 1.88],
				legend: "⌥",
				secondaryLegend: "option",
				legendAnchor: [-0.22, -0.23],
				secondaryLegendAnchor: [0, 0.25],
				legendAlign: "center"
			},
			{
				id: "MetaLeft",
				label: "Logo key (Command)",
				row: 5,
				column: 3,
				center: [0, 0],
				size: [2.39, 1.88],
				legend: "⌘",
				secondaryLegend: "command",
				legendAnchor: [-0.28, -0.23],
				secondaryLegendAnchor: [0, 0.25],
				legendAlign: "center",
				logo: true
			},
			{
				id: "Space",
				label: "Space",
				row: 5,
				column: 4,
				center: [6.375, 0],
				size: [10.04, 1.88],
				legend: "",
				legendAnchor: [0, 0],
				legendAlign: "center"
			},
			{
				id: "MetaRight",
				label: "Logo key (right Command)",
				row: 5,
				column: 5,
				center: [12.75, 0],
				size: [2.39, 1.88],
				legend: "⌘",
				secondaryLegend: "command",
				legendAnchor: [0.27, -0.23],
				secondaryLegendAnchor: [0, 0.25],
				legendAlign: "center",
				logo: true
			},
			{
				id: "AltRight",
				label: "Right Option",
				row: 5,
				column: 6,
				center: [15.045, 0],
				size: [1.88, 1.88],
				legend: "⌥",
				secondaryLegend: "option",
				legendAnchor: [0.2, -0.23],
				secondaryLegendAnchor: [0, 0.25],
				legendAlign: "center"
			},
			{
				id: "ArrowLeft",
				label: "Left arrow",
				row: 5,
				column: 7,
				center: [17.085, 0.51],
				size: [1.88, 0.86],
				legend: "",
				legendAnchor: [0, 0],
				legendAlign: "center",
				legendIcon: "arrow-left"
			},
			{
				id: "ArrowUp",
				label: "Up arrow",
				row: 5,
				column: 8,
				center: [19.125, -0.51],
				size: [1.88, 0.86],
				legend: "",
				legendAnchor: [0, 0],
				legendAlign: "center",
				legendIcon: "arrow-up"
			},
			{
				id: "ArrowDown",
				label: "Down arrow",
				row: 5,
				column: 9,
				center: [19.125, 0.51],
				size: [1.88, 0.86],
				legend: "",
				legendAnchor: [0, 0],
				legendAlign: "center",
				legendIcon: "arrow-down"
			},
			{
				id: "ArrowRight",
				label: "Right arrow",
				row: 5,
				column: 10,
				center: [21.165, 0.51],
				size: [1.88, 0.86],
				legend: "",
				legendAnchor: [0, 0],
				legendAlign: "center",
				legendIcon: "arrow-right"
			}
		]
	};
	function drawKeyboardIcon(
		ctx: CanvasRenderingContext2D,
		icon: string,
		x: number,
		y: number,
		size: number
	) {
		ctx.save();
		ctx.translate(x, y);
		ctx.scale(size, size);
		ctx.lineWidth = 0.095;
		ctx.strokeStyle = "#fff";
		ctx.fillStyle = "#fff";
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		const line = (...p: number[]) => {
			ctx.beginPath();
			ctx.moveTo(p[0]!, p[1]!);
			for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i]!, p[i + 1]!);
			ctx.stroke();
		};
		const circle = (r: number) => {
			ctx.beginPath();
			ctx.arc(0, 0, r, 0, Math.PI * 2);
			ctx.stroke();
		};
		const rectangle = (a: number, b: number, w: number, h: number) => {
			ctx.strokeRect(a, b, w, h);
		};
		if (icon.startsWith("brightness-")) {
			circle(icon === "brightness-up" ? 0.22 : 0.16);
			for (let i = 0; i < 8; i++) {
				const a = (i * Math.PI) / 4;
				const r = icon === "brightness-up" ? 0.34 : 0.28;
				line(Math.cos(a) * r, Math.sin(a) * r, Math.cos(a) * 0.48, Math.sin(a) * 0.48);
			}
		} else if (icon === "mission-control") {
			rectangle(-0.48, -0.36, 0.96, 0.72);
			rectangle(-0.36, -0.24, 0.34, 0.25);
			rectangle(0.1, -0.24, 0.26, 0.48);
			rectangle(-0.36, 0.12, 0.34, 0.12);
		} else if (icon === "search") {
			ctx.beginPath();
			ctx.arc(-0.1, -0.1, 0.29, 0, Math.PI * 2);
			ctx.stroke();
			line(0.11, 0.11, 0.44, 0.44);
		} else if (icon === "microphone") {
			ctx.beginPath();
			ctx.roundRect(-0.14, -0.47, 0.28, 0.57, 0.14);
			ctx.stroke();
			ctx.beginPath();
			ctx.arc(0, 0.02, 0.28, 0, Math.PI);
			ctx.stroke();
			line(-0.28, -0.12, -0.28, 0.02);
			line(0.28, -0.12, 0.28, 0.02);
			line(0, 0.3, 0, 0.47);
			line(-0.13, 0.47, 0.13, 0.47);
		} else if (icon === "moon") {
			ctx.beginPath();
			ctx.arc(0, 0, 0.44, Math.PI * 0.05, Math.PI * 1.55);
			ctx.bezierCurveTo(-0.25, -0.02, 0.04, 0.25, 0.435, 0.069);
			ctx.stroke();
		} else if (icon === "previous" || icon === "next") {
			ctx.scale(icon === "previous" ? -1 : 1, 1);
			line(0.43, -0.36, 0.43, 0.36);
			ctx.beginPath();
			ctx.moveTo(-0.43, -0.36);
			ctx.lineTo(0.01, 0);
			ctx.lineTo(-0.43, 0.36);
			ctx.closePath();
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(0.0, -0.36);
			ctx.lineTo(0.43, 0);
			ctx.lineTo(0.0, 0.36);
			ctx.closePath();
			ctx.stroke();
		} else if (icon === "play-pause") {
			ctx.beginPath();
			ctx.moveTo(-0.45, -0.36);
			ctx.lineTo(0.05, 0);
			ctx.lineTo(-0.45, 0.36);
			ctx.closePath();
			ctx.stroke();
			line(0.22, -0.36, 0.22, 0.36);
			line(0.43, -0.36, 0.43, 0.36);
		} else if (icon === "mute" || icon === "volume-down" || icon === "volume-up") {
			line(
				-0.48,
				-0.14,
				-0.31,
				-0.14,
				-0.07,
				-0.36,
				-0.07,
				0.36,
				-0.31,
				0.14,
				-0.48,
				0.14,
				-0.48,
				-0.14
			);
			if (icon === "mute") {
				line(0.13, -0.17, 0.4, 0.17);
				line(0.13, 0.17, 0.4, -0.17);
			} else {
				ctx.beginPath();
				ctx.arc(-0.11, 0, 0.32, -0.65, 0.65);
				ctx.stroke();
				if (icon === "volume-up") {
					ctx.beginPath();
					ctx.arc(-0.11, 0, 0.56, -0.65, 0.65);
					ctx.stroke();
				}
			}
		} else if (icon === "globe") {
			circle(0.45);
			ctx.beginPath();
			ctx.ellipse(0, 0, 0.22, 0.45, 0, 0, Math.PI * 2);
			ctx.stroke();
			line(-0.45, 0, 0.45, 0);
			ctx.beginPath();
			ctx.ellipse(0, 0, 0.45, 0.18, 0, 0, Math.PI * 2);
			ctx.stroke();
		} else if (icon.startsWith("arrow-")) {
			const angle =
				icon === "arrow-right"
					? 0
					: icon === "arrow-down"
						? Math.PI / 2
						: icon === "arrow-left"
							? Math.PI
							: -Math.PI / 2;
			ctx.rotate(angle);
			line(-0.4, 0, 0.4, 0);
			line(0.12, -0.27, 0.4, 0, 0.12, 0.27);
		} else if (icon === "power") {
			ctx.beginPath();
			ctx.arc(0, 0.03, 0.41, -Math.PI * 0.35, Math.PI * 1.35);
			ctx.stroke();
			line(0, -0.46, 0, -0.04);
		}
		ctx.restore();
	}
	function rasterizeKeyboardLegends(
		family: string,
		legendScale: number,
		letterSpacing: number,
		limits: TextureLimits,
		owner: Document
	) {
		const [x0, z0, x1, z1] = KEYBOARD_LAYOUT.bounds;
		const width = x1 - x0,
			height = z1 - z0;
		const size = fitTextureSize(4096, (4096 * height) / width, {
			...limits,
			maxDimension: Math.min(limits.maxDimension, 4096),
			maxPixels: 8 * 1024 * 1024
		});
		const canvas = owner.createElement("canvas");
		canvas.width = size.width;
		canvas.height = size.height;
		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		if (!ctx) throw new Error("Canvas text rendering is unavailable.");
		ctx.setTransform(
			size.width / width,
			0,
			0,
			size.height / height,
			(-x0 * size.width) / width,
			(-z0 * size.height) / height
		);
		ctx.fillStyle = "#fff";
		const style: TextTypography = {
			fontSize: 0.34,
			fontWeight: 500,
			fontStyle: "normal",
			letterSpacing,
			lineHeight: 1,
			padding: 0,
			textAlign: "center",
			verticalAlign: "middle",
			wrap: "none",
			fit: "none",
			direction: "ltr"
		};
		const draw = (
			text: string,
			x: number,
			y: number,
			fontSize: number,
			align: "left" | "center" | "right" = "center"
		) => {
			configureTextContext(ctx, family, style, fontSize * legendScale);
			const ink = measureTextInk(ctx, text);
			const m = ink.metrics;
			const dy = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) * 0.5;
			const factor = align === "left" ? 0 : align === "right" ? 1 : 0.5;
			ctx.fillText(text, x + ink.left - ink.width * factor, y + dy);
		};
		for (const key of KEYBOARD_LAYOUT.keys) {
			if (key.logo) continue;
			const [x, z] = key.center;
			const [w, h] = key.size;
			const icon = key.legendIcon;
			const modifier = !!key.secondaryLegend && /^[a-z ]+$/i.test(key.secondaryLegend);
			const mainAnchor = key.legendAnchor ?? [
				0,
				key.secondaryLegend ? (icon || modifier ? -0.12 : 0.15) : 0
			];
			const secondaryAnchor = key.secondaryLegendAnchor ?? [0, icon || modifier ? 0.31 : -0.23];
			const mx = x + mainAnchor[0]! * w,
				mz = z + mainAnchor[1]! * h;
			const sx = x + secondaryAnchor[0]! * w,
				sz = z + secondaryAnchor[1]! * h;
			if (icon) drawKeyboardIcon(ctx, icon, mx, mz, Math.min(0.4, h * 0.48) * legendScale);
			else if (key.legend)
				draw(
					key.legend,
					mx,
					mz,
					key.legend.length > 3 ? 0.22 : Math.min(0.34, h * 0.42),
					key.legendAlign
				);
			if (key.secondaryLegend)
				draw(key.secondaryLegend, sx, sz, Math.min(0.19, h * 0.25), key.secondaryLegendAlign);
		}
		const rgba = ctx.getImageData(0, 0, size.width, size.height).data;
		const coverage = new Uint8Array(size.width * size.height);
		for (let i = 0; i < coverage.length; i++) coverage[i] = rgba[i * 4 + 3]!;
		canvas.width = 1;
		canvas.height = 1;
		return new Texture({
			source: new BufferImageSource({
				resource: coverage,
				width: size.width,
				height: size.height,
				format: "r8unorm",
				scaleMode: "nearest",
				addressMode: "clamp-to-edge",
				alphaMode: "no-premultiply-alpha",
				autoGenerateMipmaps: false
			})
		});
	}

	type ShaderValues = {
		svgSource: string;
		fontUrl: string | ShaderFontSource;
		scale: number;
		offsetX: number;
		offsetY: number;
		panX: number;
		panY: number;
		logoScale: number;
		legendScale: number;
		letterSpacing: number;
		backgroundColor: string;
		keyColor: string;
		logoColor: string;
		legendColor: string;
		roughness: number;
		lightAngle: number;
		lightElevation: number;
		lightIntensity: number;
		lightSize: number;
		lightColor: string;
		environmentRotation: number;
		environmentIntensity: number;
		exposure: number;
	};

	type ShaderBackend = "webgpu" | "webgl";
	type ShaderRuntimeStatus =
		| { state: "ready"; backend: ShaderBackend }
		| { state: "recovering"; backend: ShaderBackend; reason: string }
		| { state: "fallback"; backend: "webgl"; reason: string }
		| { state: "error"; reason: string };

	type ShaderKeyPress = {
		keyId: string;
		column: number;
		row: number;
		source: "pointer" | "keyboard" | "assistive";
	};

	type ShaderController = {
		update(values: Partial<ShaderValues>): void;
		setPaused(paused: boolean): void;
		setInteractive(interactive: boolean): void;
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
		interactive?: boolean;
		signal?: AbortSignal;
		onKeyPress?: (event: ShaderKeyPress) => void;
		onStatus?: (status: ShaderRuntimeStatus) => void;
	};

	type SvgSdf = {
		data: Float32Array | Uint16Array;
		width: number;
		height: number;
	};

	const DEFAULT_VALUES: ShaderValues = {
		svgSource: "",
		fontUrl: "",
		scale: 1.25,
		offsetX: 0.08,
		offsetY: 0,
		panX: 0,
		panY: 0,
		logoScale: 0.95,
		legendScale: 1,
		letterSpacing: 0,
		backgroundColor: "#202A2D",
		keyColor: "#273438",
		logoColor: "#ACB7AE",
		legendColor: "#ACB7AE",
		roughness: 0.55,
		lightAngle: -150.255119,
		lightElevation: 51.123345,
		lightIntensity: 1,
		lightSize: 1,
		lightColor: "#FFFFFF",
		environmentRotation: 0,
		environmentIntensity: 1,
		exposure: 1
	};
	const WEBGPU_SOURCE =
		"struct GlobalUniforms {\n\tuProjectionMatrix: mat3x3<f32>,\n\tuWorldTransformMatrix: mat3x3<f32>,\n\tuWorldColorAlpha: vec4<f32>,\n\tuResolution: vec2<f32>,\n}\n\nstruct LocalUniforms {\n\tuTransformMatrix: mat3x3<f32>,\n\tuColor: vec4<f32>,\n\tuRound: f32,\n}\nstruct KeycapLogoUniforms {\n  uTime: f32,\n  uResolution: vec2<f32>,\n  uScale: f32,\n  uOffsetX: f32,\n  uOffsetY: f32,\n  uCameraX: f32,\n  uCameraY: f32,\n  uLogoScale: f32,\n  uFontSize: f32,\n  uLetterSpacing: f32,\n  uBackgroundColor: vec4<f32>,\n  uKeyColor: vec4<f32>,\n  uLogoColor: vec4<f32>,\n  uLegendColor: vec4<f32>,\n  uRoughness: f32,\n  uLightAngle: f32,\n  uLightElevation: f32,\n  uLightIntensity: f32,\n  uLightSize: f32,\n  uLightColor: vec4<f32>,\n  uEnvironmentRotation: f32,\n  uEnvironmentIntensity: f32,\n  uExposure: f32,\n  uPressedKey: vec2<f32>,\n  uPress: f32,\n  uRenderResolution: vec2<f32>,\n  uPixelRatio: f32,\n}\n@group(0) @binding(0) var<uniform> globalUniforms: GlobalUniforms;\n@group(1) @binding(0) var<uniform> localUniforms: LocalUniforms;\n@group(2) @binding(0) var<uniform> keycapLogoUniforms: KeycapLogoUniforms;\n@group(2) @binding(1) var uSdf: texture_2d<f32>;\n@group(2) @binding(2) var uLegends: texture_2d<f32>;\nstruct VertexOutput {\n\t@builtin(position) position: vec4<f32>,\n\t@location(0) uv: vec2<f32>,\n}\n@vertex\nfn mainVertex(\n\t@location(0) aPosition: vec2<f32>,\n\t@location(1) aUV: vec2<f32>,\n) -> VertexOutput {\n\tvar output: VertexOutput;\n\tlet mvp = globalUniforms.uProjectionMatrix\n\t\t* globalUniforms.uWorldTransformMatrix\n\t\t* localUniforms.uTransformMatrix;\n\toutput.position = vec4<f32>((mvp * vec3<f32>(aPosition, 1.0)).xy, 0.0, 1.0);\n\toutput.uv = aUV;\n\treturn output;\n}\nfn sampleSvgField(uv: vec2<f32>) -> vec3<f32> {\n\tif (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {\n\t\treturn vec3<f32>(1.0, 0.0, 0.0);\n\t}\n\tlet dimensions = textureDimensions(uSdf);\n\tlet size = vec2<f32>(dimensions);\n\tlet texel = uv * size - vec2<f32>(0.5);\n\tlet base = floor(texel);\n\tlet fraction = fract(texel);\n\tlet maximum = size - vec2<f32>(1.0);\n\tlet p0 = vec2<i32>(clamp(base, vec2<f32>(0.0), maximum));\n\tlet p1 = vec2<i32>(clamp(base + vec2<f32>(1.0, 0.0), vec2<f32>(0.0), maximum));\n\tlet p2 = vec2<i32>(clamp(base + vec2<f32>(0.0, 1.0), vec2<f32>(0.0), maximum));\n\tlet p3 = vec2<i32>(clamp(base + vec2<f32>(1.0, 1.0), vec2<f32>(0.0), maximum));\n\tlet a = textureLoad(uSdf, p0, 0).rgb;\n\tlet b = textureLoad(uSdf, p1, 0).rgb;\n\tlet c = textureLoad(uSdf, p2, 0).rgb;\n\tlet d = textureLoad(uSdf, p3, 0).rgb;\n\treturn mix(mix(a, b, fraction.x), mix(c, d, fraction.x), fraction.y);\n}\n\n\nfn noiseCell(point: vec2<f32>) -> f32 {\n  let cell = bitcast<vec2<u32>>(vec2<i32>(point));\n  var value = (cell.x * 1597334677u) ^ (cell.y * 3812015801u);\n  value = (value ^ (value >> 16u)) * 2246822519u;\n  value = (value ^ (value >> 13u)) * 3266489917u;\n  value ^= value >> 16u;\n  return f32(value >> 8u) / 16777216.0;\n}\n\nfn noiseGradient(point: vec2<f32>) -> vec3<f32> {\n  let cell = floor(point);\n  let local = fract(point);\n  let curve = local * local * local * (local * (local * 6.0 - vec2<f32>(15.0)) + vec2<f32>(10.0));\n  let derivative = 30.0 * local * local * (local - vec2<f32>(1.0)) * (local - vec2<f32>(1.0));\n  let a = noiseCell(cell);\n  let b = noiseCell(cell + vec2<f32>(1.0, 0.0));\n  let c = noiseCell(cell + vec2<f32>(0.0, 1.0));\n  let d = noiseCell(cell + vec2<f32>(1.0));\n  return vec3<f32>(mix(mix(a, b, curve.x), mix(c, d, curve.x), curve.y),\n    mix(b - a, d - c, curve.y) * derivative.x,\n    mix(c - a, d - b, curve.x) * derivative.y);\n}\n\nconst PI: f32 = 3.14159265359;\nfn rectangle(p: vec2<f32>, size: vec2<f32>, radius: f32) -> f32 {\n  var q: vec2<f32> = abs(p) - size + vec2<f32>(radius);\n  return length(max(q, vec2<f32>(0.0))) + min(max(q.x, q.y), 0.0) - radius;\n}\nfn keyDepression(cell: vec2<f32>) -> f32 {\n  return (1.0 - step(0.5, length(cell - keycapLogoUniforms.uPressedKey))) * keycapLogoUniforms.uPress * 0.10;\n}\nstruct KeyData { bounds: vec4<f32>, identity: vec2<f32>, logo: f32, sensor: f32, }\nstruct KeyHit { distance: f32, key: KeyData, }\nfn rowKey0(x: f32) -> KeyData { if (x < 18.105) { return KeyData(vec4<f32>(17.085, 0.51, 0.94, 0.43), vec2<f32>(7.0, 5.0), 0.0, 0.0); } else { if (x < 20.145) { return KeyData(vec4<f32>(19.125, 0.51, 0.94, 0.43), vec2<f32>(9.0, 5.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(21.165, 0.51, 0.94, 0.43), vec2<f32>(10.0, 5.0), 0.0, 0.0); } } }\nfn rowKey1(x: f32) -> KeyData { if (x < -1.275) { if (x < -5.355) { return KeyData(vec4<f32>(-6.375, 0.0, 0.94, 0.94), vec2<f32>(0.0, 5.0), 0.0, 0.0); } else { if (x < -3.315) { return KeyData(vec4<f32>(-4.335, 0.0, 0.94, 0.94), vec2<f32>(1.0, 5.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(-2.295, 0.0, 0.94, 0.94), vec2<f32>(2.0, 5.0), 0.0, 0.0); } } } else { if (x < 11.475) { if (x < 1.275) { return KeyData(vec4<f32>(0.0, 0.0, 1.195, 0.94), vec2<f32>(3.0, 5.0), 1.0, 0.0); } else { return KeyData(vec4<f32>(6.375, 0.0, 5.02, 0.94), vec2<f32>(4.0, 5.0), 0.0, 0.0); } } else { if (x < 14.025) { return KeyData(vec4<f32>(12.75, 0.0, 1.195, 0.94), vec2<f32>(5.0, 5.0), 1.0, 0.0); } else { return KeyData(vec4<f32>(15.045, 0.0, 0.94, 0.94), vec2<f32>(6.0, 5.0), 0.0, 0.0); } } } }\nfn rowKey2(x: f32) -> KeyData { return KeyData(vec4<f32>(19.125, -0.51, 0.94, 0.43), vec2<f32>(8.0, 5.0), 0.0, 0.0); }\nfn rowKey3(x: f32) -> KeyData { if (x < 7.395) { if (x < 1.275) { if (x < -2.805) { return KeyData(vec4<f32>(-5.1, -2.04, 2.215, 0.94), vec2<f32>(0.0, 4.0), 0.0, 0.0); } else { if (x < -0.765) { return KeyData(vec4<f32>(-1.785, -2.04, 0.94, 0.94), vec2<f32>(1.0, 4.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(0.255, -2.04, 0.94, 0.94), vec2<f32>(2.0, 4.0), 0.0, 0.0); } } } else { if (x < 3.315) { return KeyData(vec4<f32>(2.295, -2.04, 0.94, 0.94), vec2<f32>(3.0, 4.0), 0.0, 0.0); } else { if (x < 5.355) { return KeyData(vec4<f32>(4.335, -2.04, 0.94, 0.94), vec2<f32>(4.0, 4.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(6.375, -2.04, 0.94, 0.94), vec2<f32>(5.0, 4.0), 0.0, 0.0); } } } } else { if (x < 13.515) { if (x < 9.435) { return KeyData(vec4<f32>(8.415, -2.04, 0.94, 0.94), vec2<f32>(6.0, 4.0), 0.0, 0.0); } else { if (x < 11.475) { return KeyData(vec4<f32>(10.455, -2.04, 0.94, 0.94), vec2<f32>(7.0, 4.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(12.495, -2.04, 0.94, 0.94), vec2<f32>(8.0, 4.0), 0.0, 0.0); } } } else { if (x < 15.555) { return KeyData(vec4<f32>(14.535, -2.04, 0.94, 0.94), vec2<f32>(9.0, 4.0), 0.0, 0.0); } else { if (x < 17.595) { return KeyData(vec4<f32>(16.575, -2.04, 0.94, 0.94), vec2<f32>(10.0, 4.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(19.89, -2.04, 2.215, 0.94), vec2<f32>(11.0, 4.0), 0.0, 0.0); } } } } }\nfn rowKey4(x: f32) -> KeyData { if (x < 6.375) { if (x < 0.255) { if (x < -3.825) { return KeyData(vec4<f32>(-5.61, -4.08, 1.705, 0.94), vec2<f32>(0.0, 3.0), 0.0, 0.0); } else { if (x < -1.785) { return KeyData(vec4<f32>(-2.805, -4.08, 0.94, 0.94), vec2<f32>(1.0, 3.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(-0.765, -4.08, 0.94, 0.94), vec2<f32>(2.0, 3.0), 0.0, 0.0); } } } else { if (x < 2.295) { return KeyData(vec4<f32>(1.275, -4.08, 0.94, 0.94), vec2<f32>(3.0, 3.0), 0.0, 0.0); } else { if (x < 4.335) { return KeyData(vec4<f32>(3.315, -4.08, 0.94, 0.94), vec2<f32>(4.0, 3.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(5.355, -4.08, 0.94, 0.94), vec2<f32>(5.0, 3.0), 0.0, 0.0); } } } } else { if (x < 12.495) { if (x < 8.415) { return KeyData(vec4<f32>(7.395, -4.08, 0.94, 0.94), vec2<f32>(6.0, 3.0), 0.0, 0.0); } else { if (x < 10.455) { return KeyData(vec4<f32>(9.435, -4.08, 0.94, 0.94), vec2<f32>(7.0, 3.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(11.475, -4.08, 0.94, 0.94), vec2<f32>(8.0, 3.0), 0.0, 0.0); } } } else { if (x < 16.575) { if (x < 14.535) { return KeyData(vec4<f32>(13.515, -4.08, 0.94, 0.94), vec2<f32>(9.0, 3.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(15.555, -4.08, 0.94, 0.94), vec2<f32>(10.0, 3.0), 0.0, 0.0); } } else { if (x < 18.615) { return KeyData(vec4<f32>(17.595, -4.08, 0.94, 0.94), vec2<f32>(11.0, 3.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(20.4, -4.08, 1.705, 0.94), vec2<f32>(12.0, 3.0), 0.0, 0.0); } } } } }\nfn rowKey5(x: f32) -> KeyData { if (x < 7.905) { if (x < -0.255) { if (x < -4.335) { return KeyData(vec4<f32>(-5.865, -6.12, 1.45, 0.94), vec2<f32>(0.0, 2.0), 0.0, 0.0); } else { if (x < -2.295) { return KeyData(vec4<f32>(-3.315, -6.12, 0.94, 0.94), vec2<f32>(1.0, 2.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(-1.275, -6.12, 0.94, 0.94), vec2<f32>(2.0, 2.0), 0.0, 0.0); } } } else { if (x < 3.825) { if (x < 1.785) { return KeyData(vec4<f32>(0.765, -6.12, 0.94, 0.94), vec2<f32>(3.0, 2.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(2.805, -6.12, 0.94, 0.94), vec2<f32>(4.0, 2.0), 0.0, 0.0); } } else { if (x < 5.865) { return KeyData(vec4<f32>(4.845, -6.12, 0.94, 0.94), vec2<f32>(5.0, 2.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(6.885, -6.12, 0.94, 0.94), vec2<f32>(6.0, 2.0), 0.0, 0.0); } } } } else { if (x < 14.025) { if (x < 9.945) { return KeyData(vec4<f32>(8.925, -6.12, 0.94, 0.94), vec2<f32>(7.0, 2.0), 0.0, 0.0); } else { if (x < 11.985) { return KeyData(vec4<f32>(10.965, -6.12, 0.94, 0.94), vec2<f32>(8.0, 2.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(13.005, -6.12, 0.94, 0.94), vec2<f32>(9.0, 2.0), 0.0, 0.0); } } } else { if (x < 18.105) { if (x < 16.065) { return KeyData(vec4<f32>(15.045, -6.12, 0.94, 0.94), vec2<f32>(10.0, 2.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(17.085, -6.12, 0.94, 0.94), vec2<f32>(11.0, 2.0), 0.0, 0.0); } } else { if (x < 20.145) { return KeyData(vec4<f32>(19.125, -6.12, 0.94, 0.94), vec2<f32>(12.0, 2.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(21.165, -6.12, 0.94, 0.94), vec2<f32>(13.0, 2.0), 0.0, 0.0); } } } } }\nfn rowKey6(x: f32) -> KeyData { if (x < 6.885) { if (x < -1.275) { if (x < -5.355) { return KeyData(vec4<f32>(-6.375, -8.16, 0.94, 0.94), vec2<f32>(0.0, 1.0), 0.0, 0.0); } else { if (x < -3.315) { return KeyData(vec4<f32>(-4.335, -8.16, 0.94, 0.94), vec2<f32>(1.0, 1.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(-2.295, -8.16, 0.94, 0.94), vec2<f32>(2.0, 1.0), 0.0, 0.0); } } } else { if (x < 2.805) { if (x < 0.765) { return KeyData(vec4<f32>(-0.255, -8.16, 0.94, 0.94), vec2<f32>(3.0, 1.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(1.785, -8.16, 0.94, 0.94), vec2<f32>(4.0, 1.0), 0.0, 0.0); } } else { if (x < 4.845) { return KeyData(vec4<f32>(3.825, -8.16, 0.94, 0.94), vec2<f32>(5.0, 1.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(5.865, -8.16, 0.94, 0.94), vec2<f32>(6.0, 1.0), 0.0, 0.0); } } } } else { if (x < 13.005) { if (x < 8.925) { return KeyData(vec4<f32>(7.905, -8.16, 0.94, 0.94), vec2<f32>(7.0, 1.0), 0.0, 0.0); } else { if (x < 10.965) { return KeyData(vec4<f32>(9.945, -8.16, 0.94, 0.94), vec2<f32>(8.0, 1.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(11.985, -8.16, 0.94, 0.94), vec2<f32>(9.0, 1.0), 0.0, 0.0); } } } else { if (x < 17.085) { if (x < 15.045) { return KeyData(vec4<f32>(14.025, -8.16, 0.94, 0.94), vec2<f32>(10.0, 1.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(16.065, -8.16, 0.94, 0.94), vec2<f32>(11.0, 1.0), 0.0, 0.0); } } else { if (x < 19.125) { return KeyData(vec4<f32>(18.105, -8.16, 0.94, 0.94), vec2<f32>(12.0, 1.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(20.655, -8.16, 1.45, 0.94), vec2<f32>(13.0, 1.0), 0.0, 0.0); } } } } }\nfn rowKey7(x: f32) -> KeyData { if (x < 7.905) { if (x < -0.255) { if (x < -4.335) { return KeyData(vec4<f32>(-5.865, -10.2, 1.45, 0.94), vec2<f32>(0.0, 0.0), 0.0, 0.0); } else { if (x < -2.295) { return KeyData(vec4<f32>(-3.315, -10.2, 0.94, 0.94), vec2<f32>(1.0, 0.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(-1.275, -10.2, 0.94, 0.94), vec2<f32>(2.0, 0.0), 0.0, 0.0); } } } else { if (x < 3.825) { if (x < 1.785) { return KeyData(vec4<f32>(0.765, -10.2, 0.94, 0.94), vec2<f32>(3.0, 0.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(2.805, -10.2, 0.94, 0.94), vec2<f32>(4.0, 0.0), 0.0, 0.0); } } else { if (x < 5.865) { return KeyData(vec4<f32>(4.845, -10.2, 0.94, 0.94), vec2<f32>(5.0, 0.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(6.885, -10.2, 0.94, 0.94), vec2<f32>(6.0, 0.0), 0.0, 0.0); } } } } else { if (x < 14.025) { if (x < 9.945) { return KeyData(vec4<f32>(8.925, -10.2, 0.94, 0.94), vec2<f32>(7.0, 0.0), 0.0, 0.0); } else { if (x < 11.985) { return KeyData(vec4<f32>(10.965, -10.2, 0.94, 0.94), vec2<f32>(8.0, 0.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(13.005, -10.2, 0.94, 0.94), vec2<f32>(9.0, 0.0), 0.0, 0.0); } } } else { if (x < 18.105) { if (x < 16.065) { return KeyData(vec4<f32>(15.045, -10.2, 0.94, 0.94), vec2<f32>(10.0, 0.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(17.085, -10.2, 0.94, 0.94), vec2<f32>(11.0, 0.0), 0.0, 0.0); } } else { if (x < 20.145) { return KeyData(vec4<f32>(19.125, -10.2, 0.94, 0.94), vec2<f32>(12.0, 0.0), 0.0, 0.0); } else { return KeyData(vec4<f32>(21.165, -10.2, 0.94, 0.94), vec2<f32>(13.0, 0.0), 0.0, 1.0); } } } } }\n\nfn keyDistance(p: vec3<f32>, key: KeyData) -> f32 {\n  let q = vec2<f32>(rectangle(p.xz - key.bounds.xy, key.bounds.zw, 0.18) + 0.045,\n    abs(p.y + keyDepression(key.identity) - 0.09) - 0.15 + 0.045);\n  return length(max(q, vec2<f32>(0.0))) + min(max(q.x, q.y), 0.0) - 0.045;\n}\nfn closestKey(p: vec3<f32>) -> KeyHit {\n    var hit = KeyHit(100000.0, rowKey0(p.x));\n    if (max(abs(p.z - 0.51) - 0.43, max(16.145 - p.x, p.x - 22.105)) < hit.distance) {\n      let key = rowKey0(p.x);\n      let distance = keyDistance(p, key);\n      if (distance < hit.distance) { hit = KeyHit(distance, key); }\n    }\nif (max(abs(p.z - 0.0) - 0.94, max(-7.315 - p.x, p.x - 15.985)) < hit.distance) {\n      let key = rowKey1(p.x);\n      let distance = keyDistance(p, key);\n      if (distance < hit.distance) { hit = KeyHit(distance, key); }\n    }\nif (max(abs(p.z - -0.51) - 0.43, max(18.185 - p.x, p.x - 20.065)) < hit.distance) {\n      let key = rowKey2(p.x);\n      let distance = keyDistance(p, key);\n      if (distance < hit.distance) { hit = KeyHit(distance, key); }\n    }\nif (max(abs(p.z - -2.04) - 0.94, max(-7.315 - p.x, p.x - 22.105)) < hit.distance) {\n      let key = rowKey3(p.x);\n      let distance = keyDistance(p, key);\n      if (distance < hit.distance) { hit = KeyHit(distance, key); }\n    }\nif (max(abs(p.z - -4.08) - 0.94, max(-7.315 - p.x, p.x - 22.105)) < hit.distance) {\n      let key = rowKey4(p.x);\n      let distance = keyDistance(p, key);\n      if (distance < hit.distance) { hit = KeyHit(distance, key); }\n    }\nif (max(abs(p.z - -6.12) - 0.94, max(-7.315 - p.x, p.x - 22.105)) < hit.distance) {\n      let key = rowKey5(p.x);\n      let distance = keyDistance(p, key);\n      if (distance < hit.distance) { hit = KeyHit(distance, key); }\n    }\nif (max(abs(p.z - -8.16) - 0.94, max(-7.315 - p.x, p.x - 22.105)) < hit.distance) {\n      let key = rowKey6(p.x);\n      let distance = keyDistance(p, key);\n      if (distance < hit.distance) { hit = KeyHit(distance, key); }\n    }\nif (max(abs(p.z - -10.2) - 0.94, max(-7.315 - p.x, p.x - 22.105)) < hit.distance) {\n      let key = rowKey7(p.x);\n      let distance = keyDistance(p, key);\n      if (distance < hit.distance) { hit = KeyHit(distance, key); }\n    }\n    return hit;\n  }\n  fn scene(p: vec3<f32>) -> f32 { return closestKey(p).distance; }\nfn sampleLegend(point: vec2<f32>) -> f32 {\n  var bounds: vec4<f32> = vec4<f32>(-7.315, -11.14, 22.105, 0.94);\n  var uv: vec2<f32> = (point - bounds.xy) / (bounds.zw - bounds.xy);\n  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { return 0.0; }\n  var size: vec2<f32> = vec2<f32>(textureDimensions(uLegends, 0));\n  var texel: vec2<f32> = uv * size - vec2<f32>(0.5);\n  var base: vec2<f32> = floor(texel);\n  var weight: vec2<f32> = fract(texel);\n  var a: vec2<i32> = vec2<i32>(clamp(base, vec2<f32>(0.0), size - vec2<f32>(1.0)));\n  var b: vec2<i32> = vec2<i32>(clamp(base + vec2<f32>(1.0, 0.0), vec2<f32>(0.0), size - vec2<f32>(1.0)));\n  var c: vec2<i32> = vec2<i32>(clamp(base + vec2<f32>(0.0, 1.0), vec2<f32>(0.0), size - vec2<f32>(1.0)));\n  var d: vec2<i32> = vec2<i32>(clamp(base + vec2<f32>(1.0), vec2<f32>(0.0), size - vec2<f32>(1.0)));\n  return mix(mix(textureLoad(uLegends, a, 0).r, textureLoad(uLegends, b, 0).r, weight.x),\n    mix(textureLoad(uLegends, c, 0).r, textureLoad(uLegends, d, 0).r, weight.x), weight.y);\n}\nfn normalAt(p: vec3<f32>) -> vec3<f32> {\n  var e: vec2<f32> = vec2<f32>(0.0007, 0.0);\n  return normalize(vec3<f32>(scene(p + e.xyy) - scene(p - e.xyy),\n    scene(p + e.yxy) - scene(p - e.yxy), scene(p + e.yyx) - scene(p - e.yyx)));\n}\nfn keyLightPosition() -> vec3<f32> {\n  var angle: f32 = radians(keycapLogoUniforms.uLightAngle);\n  var elevation: f32 = radians(keycapLogoUniforms.uLightElevation);\n  return vec3<f32>(cos(angle) * cos(elevation), sin(elevation), sin(angle) * cos(elevation)) * 6.42261629;\n}\nfn environmentPosition(p: vec3<f32>) -> vec3<f32> {\n  var angle: f32 = radians(keycapLogoUniforms.uEnvironmentRotation);\n  var c: f32 = cos(angle);\n  var s: f32 = sin(angle);\n  return vec3<f32>(c * p.x - s * p.z, p.y, s * p.x + c * p.z);\n}\nfn visibility(p: vec3<f32>, n: vec3<f32>) -> f32 {\n  var direction: vec3<f32> = normalize(keyLightPosition() - p);\n  var origin: vec3<f32> = p + n * 0.003;\n  var t: f32 = 0.008;\n  var shadow: f32 = 1.0;\n  for (var i = 0; i < 24; i++) {\n    var q: vec3<f32> = origin + direction * t;\n    if (q.y > 0.25) { break; }\n    var d: f32 = scene(q);\n    shadow = min(shadow, (5.0 / keycapLogoUniforms.uLightSize) * max(d, 0.0) / t);\n    if (d < 0.0002) { break; }\n    t += clamp(d, 0.004, 0.12);\n  }\n  return smoothstep(0.0, 1.0, shadow);\n}\nfn occlusion(p: vec3<f32>, n: vec3<f32>) -> f32 {\n  var sum: f32 = 0.0;\n  var weight: f32 = 1.0;\n  for (var i = 1; i < 5; i++) {\n    var reach: f32 = f32(i) * 0.035;\n    sum += max(reach - scene(p + n * reach), 0.0) * weight;\n    weight *= 0.6;\n  }\n  return clamp(1.0 - sum * 6.0, 0.25, 1.0);\n}\nfn softbox(p: vec3<f32>, ray: vec3<f32>, center: vec3<f32>, size: vec2<f32>, roughness: f32) -> f32 {\n  var az: vec3<f32> = normalize(-center);\n  var ax: vec3<f32> = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), az));\n  var ay: vec3<f32> = cross(az, ax);\n  var divisor: f32 = dot(ray, az);\n  if (divisor > -0.0001) { return 0.0; }\n  var travel: f32 = dot(center - p, az) / divisor;\n  if (travel <= 0.0) { return 0.0; }\n  var q: vec3<f32> = p + ray * travel - center;\n  var uv: vec2<f32> = vec2<f32>(dot(q, ax), dot(q, ay));\n  var blur: f32 = 0.008 + roughness * roughness * travel * 0.6;\n  var integral: vec2<f32> = (atan((size - uv) / blur) + atan((size + uv) / blur)) / PI;\n  return max(integral.x * integral.y, 0.0);\n}\nfn plastic(p: vec3<f32>, n: vec3<f32>, v: vec3<f32>, base: vec3<f32>, roughness: f32, shadow: f32, ao: f32) -> vec3<f32> {\n  var light: vec3<f32> = normalize(keyLightPosition() - p);\n  var diffuse: vec3<f32> = vec3<f32>(0.38 * keycapLogoUniforms.uEnvironmentIntensity)\n    + keycapLogoUniforms.uLightColor.rgb * (0.62 * keycapLogoUniforms.uLightIntensity * max(dot(n, light), 0.0) * shadow);\n  var nv: f32 = max(dot(n, v), 0.0);\n  var fresnel: f32 = 0.035 + 0.965 * pow(1.0 - nv, 5.0);\n  var reflection: vec3<f32> = reflect(-v, n);\n  var key: f32 = softbox(p, reflection, keyLightPosition(), vec2<f32>(2.0, 2.8) * keycapLogoUniforms.uLightSize, roughness);\n  var fill: f32 = softbox(p, reflection, environmentPosition(vec3<f32>(2.0, 4.0, -3.0)), vec2<f32>(2.0, 2.5), roughness);\n  var specular: vec3<f32> = vec3<f32>(1.0, 1.025, 1.04) *\n    (keycapLogoUniforms.uLightColor.rgb * (key * 1.4 * keycapLogoUniforms.uLightIntensity)\n      + vec3<f32>((fill * 0.18 + 0.012) * keycapLogoUniforms.uEnvironmentIntensity)) * fresnel;\n  return base * diffuse * ao + specular * mix(ao, 1.0, 0.3);\n}\n// Shallow engraved inlay; the SDF gradient supplies the cut wall's normal.\n// The 0.0035 depth is intentionally much smaller than the molded cap bevel.\nfn engraving(p: vec2<f32>, top: f32) -> vec4<f32> {\n  var scale: f32 = 1.20 * keycapLogoUniforms.uLogoScale;\n  var field: vec3<f32> = sampleSvgField(p / scale + vec2<f32>(0.5));\n  var width: f32 = 0.008;\n  var t: f32 = clamp(-field.x * scale / width, 0.0, 1.0);\n  var inset: f32 = t * t * (3.0 - 2.0 * t);\n  var slope: f32 = 0.0035 * 6.0 * t * (1.0 - t) / width;\n  return vec4<f32>(top - 0.0035 * inset, normalize(vec3<f32>(-field.y * slope, 1.0, -field.z * slope)));\n}\nfn shade(position: vec3<f32>, ro: vec3<f32>, aa: f32) -> vec3<f32> {\n  var p: vec3<f32> = position;\n  var key: KeyData = closestKey(p).key;\n  var cell: vec2<f32> = key.identity;\n  var local: vec2<f32> = p.xz - key.bounds.xy;\n  var geometric: vec3<f32> = normalAt(p);\n  var topFace: f32 = smoothstep(0.98, 0.9999, geometric.y);\n  var central: f32 = key.logo;\n  if (geometric.y > 0.9999) {\n    var ray: vec3<f32> = normalize(p - ro);\n    var top: f32 = 0.24 - keyDepression(cell);\n    // Refine the planar hit exactly: raymarch tolerance must not change the\n    // grain phase while a cap moves. The logo then solves its shallow recess.\n    p += ray * ((top - p.y) / min(ray.y, -0.1));\n    geometric = vec3<f32>(0.0, 1.0, 0.0);\n    if (central > 0.5) {\n      for (var i = 0; i < 4; i++) {\n        var surface: vec4<f32> = engraving(p.xz - key.bounds.xy, top);\n        p += ray * ((surface.x - p.y) / min(ray.y, -0.1));\n      }\n      geometric = engraving(p.xz - key.bounds.xy, top).yzw;\n    }\n  }\n  // Molded micro-grain: two continuous bands, filtered at the actual render\n  // footprint. The grain perturbs lighting, rather than overlaying white noise.\n  // Undo the key's rigid translation before sampling its molded material.\n  // World XZ keeps each key's original seed; rest Y anchors tops and sidewalls.\n  var restY: f32 = p.y + keyDepression(cell);\n  var grainUV: vec2<f32> = p.xz + vec2<f32>(restY * 0.7, restY * 0.4);\n  var coarse: vec3<f32> = noiseGradient(grainUV * 115.0);\n  var fine: vec3<f32> = noiseGradient(grainUV * 260.0);\n  var grainFootprint: f32 = aa / sin(1.06);\n  var filterA: f32 = exp(-grainFootprint * grainFootprint * 13225.0 * 0.35);\n  var filterB: f32 = exp(-grainFootprint * grainFootprint * 67600.0 * 0.35);\n  var bump: vec2<f32> = coarse.yz * (0.085 * filterA) + fine.yz * (0.032 * filterB);\n  var n: vec3<f32> = normalize(geometric + vec3<f32>(bump.x, 0.0, bump.y));\n  var v: vec3<f32> = normalize(ro - p);\n  var shadow: f32 = visibility(p, geometric);\n  var ao: f32 = occlusion(p, geometric);\n  var grain: f32 = (coarse.x - 0.5) * 0.055 * filterA + (fine.x - 0.5) * 0.025 * filterB;\n  var body: vec3<f32> = keycapLogoUniforms.uKeyColor.rgb * (1.0 + grain);\n  var color: vec3<f32> = plastic(p, n, v, body, keycapLogoUniforms.uRoughness, shadow, ao);\n  if (key.sensor > 0.5) {\n    var radius: f32 = length(local);\n    var disk: f32 = (1.0 - smoothstep(0.64 - aa, 0.64 + aa, radius)) * topFace;\n    var ring: f32 = 1.0 - smoothstep(0.006, 0.006 + aa, abs(radius - 0.64));\n    var sensor: vec3<f32> = plastic(p, geometric, v, keycapLogoUniforms.uKeyColor.rgb * 0.90, 0.24, shadow, ao);\n    color = mix(color, sensor, disk) * (1.0 - ring * topFace * 0.28);\n  }\n  if (central < 0.5) {\n    var coverage: f32 = sampleLegend(p.xz) * topFace;\n    var legend: vec3<f32> = plastic(p, geometric, v, keycapLogoUniforms.uLegendColor.rgb, 0.26, shadow, ao);\n    color = mix(color, legend, coverage);\n  }\n  if (central > 0.5) {\n    var field: f32 = sampleSvgField((p.xz - key.bounds.xy) / (1.20 * keycapLogoUniforms.uLogoScale) + vec2<f32>(0.5)).x;\n    var logo: f32 = (1.0 - smoothstep(-aa / 1.20, aa / 1.20, field)) * topFace;\n    var gloss: vec3<f32> = plastic(p, geometric, v, keycapLogoUniforms.uLogoColor.rgb, 0.14, shadow, ao);\n    var nv: f32 = max(dot(geometric, v), 0.0);\n    var clearcoat: f32 = softbox(p, reflect(-v, geometric), environmentPosition(vec3<f32>(0.8, 3.8, -2.0)), vec2<f32>(0.28, 1.5), 0.14)\n      * (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * 3.0 * keycapLogoUniforms.uEnvironmentIntensity;\n    gloss = mix(gloss, vec3<f32>(1.0), clamp(clearcoat, 0.0, 0.22));\n    color = mix(color, gloss, logo);\n\n  }\n  return color;\n}\nfn render(uv: vec2<f32>) -> vec3<f32> {\n  var aspect: f32 = keycapLogoUniforms.uResolution.x / max(keycapLogoUniforms.uResolution.y, 1.0);\n  var rd: vec3<f32> = -vec3<f32>(sin(-0.32) * cos(1.06), sin(1.06), cos(-0.32) * cos(1.06));\n  var right: vec3<f32> = normalize(cross(rd, vec3<f32>(0.0, 1.0, 0.0)));\n  var up: vec3<f32> = cross(right, rd);\n  var screen: vec2<f32> = vec2<f32>((uv.x - 0.5 - keycapLogoUniforms.uOffsetX) * aspect, 0.5 + keycapLogoUniforms.uOffsetY - uv.y) * 2.8 / keycapLogoUniforms.uScale;\n  var ro: vec3<f32> = vec3<f32>(0.0, 0.10, 0.0) - rd * 5.0 + right * (screen.x + keycapLogoUniforms.uCameraX) + up * (screen.y + keycapLogoUniforms.uCameraY);\n  var aa: f32 = 2.8 / (max(keycapLogoUniforms.uRenderResolution.y, 1.0) * keycapLogoUniforms.uScale);\n  var travel: f32 = (0.241 - ro.y) / rd.y;\n  var limit: f32 = (0.02 - ro.y) / rd.y;\n  var ground: vec3<f32> = ro + rd * limit;\n  var shadow: f32 = visibility(ground, vec3<f32>(0.0, 1.0, 0.0));\n  var contact: f32 = occlusion(ground, vec3<f32>(0.0, 1.0, 0.0));\n  var color: vec3<f32> = keycapLogoUniforms.uBackgroundColor.rgb * (vec3<f32>(0.55 * keycapLogoUniforms.uEnvironmentIntensity) + keycapLogoUniforms.uLightColor.rgb * (0.45 * keycapLogoUniforms.uLightIntensity * shadow)) * contact;\n  for (var i = 0; i < 96; i++) {\n    if (travel > limit) { break; }\n    var p: vec3<f32> = ro + rd * travel;\n    var distance: f32 = scene(p);\n    if (distance < 0.00018) {\n      color = shade(p, ro, aa);\n      break;\n    }\n    travel += max(distance * 0.85, 0.0001);\n  }\n  return color * keycapLogoUniforms.uExposure;\n}\n\n@fragment fn mainFragment(input: VertexOutput) -> @location(0) vec4<f32> {\n return vec4<f32>(render(input.uv), 1.0);\n}";
	const WEBGL_VERTEX =
		"#version 300 es\nin vec2 aPosition;\nin vec2 aUV;\nout vec2 vUV;\n\nuniform mat3 uProjectionMatrix;\nuniform mat3 uWorldTransformMatrix;\nuniform mat3 uTransformMatrix;\n\nvoid main() {\n\tvUV = aUV;\n\tmat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;\n\tgl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);\n}";
	const WEBGL_FRAGMENT =
		"#version 300 es\nprecision highp float;\nin vec2 vUV;\nout vec4 finalColor;\nuniform sampler2D uSdf;\nuniform sampler2D uLegends;\nuniform float uTime;\nuniform vec2 uResolution;\nuniform float uScale;\nuniform float uOffsetX;\nuniform float uOffsetY;\nuniform float uCameraX;\nuniform float uCameraY;\nuniform float uLogoScale;\nuniform float uFontSize;\nuniform float uLetterSpacing;\nuniform vec4 uBackgroundColor;\nuniform vec4 uKeyColor;\nuniform vec4 uLogoColor;\nuniform vec4 uLegendColor;\nuniform float uRoughness;\nuniform float uLightAngle;\nuniform float uLightElevation;\nuniform float uLightIntensity;\nuniform float uLightSize;\nuniform vec4 uLightColor;\nuniform float uEnvironmentRotation;\nuniform float uEnvironmentIntensity;\nuniform float uExposure;\nuniform vec2 uPressedKey;\nuniform float uPress;\nuniform vec2 uRenderResolution;\nuniform float uPixelRatio;\nvec3 sampleSvgField(vec2 uv) {\n\tif (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {\n\t\treturn vec3(1.0, 0.0, 0.0);\n\t}\n\tvec2 size = vec2(textureSize(uSdf, 0));\n\tvec2 texel = uv * size - 0.5;\n\tvec2 base = floor(texel);\n\tvec2 fraction = fract(texel);\n\tivec2 p0 = ivec2(clamp(base, vec2(0.0), size - 1.0));\n\tivec2 p1 = ivec2(clamp(base + vec2(1.0, 0.0), vec2(0.0), size - 1.0));\n\tivec2 p2 = ivec2(clamp(base + vec2(0.0, 1.0), vec2(0.0), size - 1.0));\n\tivec2 p3 = ivec2(clamp(base + vec2(1.0, 1.0), vec2(0.0), size - 1.0));\n\tvec3 a = texelFetch(uSdf, p0, 0).rgb;\n\tvec3 b = texelFetch(uSdf, p1, 0).rgb;\n\tvec3 c = texelFetch(uSdf, p2, 0).rgb;\n\tvec3 d = texelFetch(uSdf, p3, 0).rgb;\n\treturn mix(mix(a, b, fraction.x), mix(c, d, fraction.x), fraction.y);\n}\n\n\nfloat noiseCell(vec2 point) {\n  uvec2 cell = uvec2(ivec2(point));\n  uint value = (cell.x * 1597334677u) ^ (cell.y * 3812015801u);\n  value = (value ^ (value >> 16u)) * 2246822519u;\n  value = (value ^ (value >> 13u)) * 3266489917u;\n  value ^= value >> 16u;\n  return float(value >> 8u) / 16777216.0;\n}\n\nvec3 noiseGradient(vec2 point) {\n  vec2 cell = floor(point);\n  vec2 local = fract(point);\n  vec2 curve = local * local * local * (local * (local * 6.0 - 15.0) + 10.0);\n  vec2 derivative = 30.0 * local * local * (local - 1.0) * (local - 1.0);\n  float a = noiseCell(cell);\n  float b = noiseCell(cell + vec2(1.0, 0.0));\n  float c = noiseCell(cell + vec2(0.0, 1.0));\n  float d = noiseCell(cell + vec2(1.0));\n  return vec3(mix(mix(a, b, curve.x), mix(c, d, curve.x), curve.y),\n    mix(b - a, d - c, curve.y) * derivative.x,\n    mix(c - a, d - b, curve.x) * derivative.y);\n}\n\nconst float PI = 3.14159265359;\nfloat rectangle(vec2 p, vec2 size, float radius) {\n  vec2 q = abs(p) - size + vec2(radius);\n  return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - radius;\n}\nfloat keyDepression(vec2 cell) {\n  return (1.0 - step(0.5, length(cell - uPressedKey))) * uPress * 0.10;\n}\nstruct KeyData { vec4 bounds; vec2 identity; float logo; float sensor; };\nstruct KeyHit { float distance; KeyData key; };\nKeyData rowKey0(float x) { if (x < 18.105) { return KeyData(vec4(17.085, 0.51, 0.94, 0.43), vec2(7.0, 5.0), 0.0, 0.0); } else { if (x < 20.145) { return KeyData(vec4(19.125, 0.51, 0.94, 0.43), vec2(9.0, 5.0), 0.0, 0.0); } else { return KeyData(vec4(21.165, 0.51, 0.94, 0.43), vec2(10.0, 5.0), 0.0, 0.0); } } }\nKeyData rowKey1(float x) { if (x < -1.275) { if (x < -5.355) { return KeyData(vec4(-6.375, 0.0, 0.94, 0.94), vec2(0.0, 5.0), 0.0, 0.0); } else { if (x < -3.315) { return KeyData(vec4(-4.335, 0.0, 0.94, 0.94), vec2(1.0, 5.0), 0.0, 0.0); } else { return KeyData(vec4(-2.295, 0.0, 0.94, 0.94), vec2(2.0, 5.0), 0.0, 0.0); } } } else { if (x < 11.475) { if (x < 1.275) { return KeyData(vec4(0.0, 0.0, 1.195, 0.94), vec2(3.0, 5.0), 1.0, 0.0); } else { return KeyData(vec4(6.375, 0.0, 5.02, 0.94), vec2(4.0, 5.0), 0.0, 0.0); } } else { if (x < 14.025) { return KeyData(vec4(12.75, 0.0, 1.195, 0.94), vec2(5.0, 5.0), 1.0, 0.0); } else { return KeyData(vec4(15.045, 0.0, 0.94, 0.94), vec2(6.0, 5.0), 0.0, 0.0); } } } }\nKeyData rowKey2(float x) { return KeyData(vec4(19.125, -0.51, 0.94, 0.43), vec2(8.0, 5.0), 0.0, 0.0); }\nKeyData rowKey3(float x) { if (x < 7.395) { if (x < 1.275) { if (x < -2.805) { return KeyData(vec4(-5.1, -2.04, 2.215, 0.94), vec2(0.0, 4.0), 0.0, 0.0); } else { if (x < -0.765) { return KeyData(vec4(-1.785, -2.04, 0.94, 0.94), vec2(1.0, 4.0), 0.0, 0.0); } else { return KeyData(vec4(0.255, -2.04, 0.94, 0.94), vec2(2.0, 4.0), 0.0, 0.0); } } } else { if (x < 3.315) { return KeyData(vec4(2.295, -2.04, 0.94, 0.94), vec2(3.0, 4.0), 0.0, 0.0); } else { if (x < 5.355) { return KeyData(vec4(4.335, -2.04, 0.94, 0.94), vec2(4.0, 4.0), 0.0, 0.0); } else { return KeyData(vec4(6.375, -2.04, 0.94, 0.94), vec2(5.0, 4.0), 0.0, 0.0); } } } } else { if (x < 13.515) { if (x < 9.435) { return KeyData(vec4(8.415, -2.04, 0.94, 0.94), vec2(6.0, 4.0), 0.0, 0.0); } else { if (x < 11.475) { return KeyData(vec4(10.455, -2.04, 0.94, 0.94), vec2(7.0, 4.0), 0.0, 0.0); } else { return KeyData(vec4(12.495, -2.04, 0.94, 0.94), vec2(8.0, 4.0), 0.0, 0.0); } } } else { if (x < 15.555) { return KeyData(vec4(14.535, -2.04, 0.94, 0.94), vec2(9.0, 4.0), 0.0, 0.0); } else { if (x < 17.595) { return KeyData(vec4(16.575, -2.04, 0.94, 0.94), vec2(10.0, 4.0), 0.0, 0.0); } else { return KeyData(vec4(19.89, -2.04, 2.215, 0.94), vec2(11.0, 4.0), 0.0, 0.0); } } } } }\nKeyData rowKey4(float x) { if (x < 6.375) { if (x < 0.255) { if (x < -3.825) { return KeyData(vec4(-5.61, -4.08, 1.705, 0.94), vec2(0.0, 3.0), 0.0, 0.0); } else { if (x < -1.785) { return KeyData(vec4(-2.805, -4.08, 0.94, 0.94), vec2(1.0, 3.0), 0.0, 0.0); } else { return KeyData(vec4(-0.765, -4.08, 0.94, 0.94), vec2(2.0, 3.0), 0.0, 0.0); } } } else { if (x < 2.295) { return KeyData(vec4(1.275, -4.08, 0.94, 0.94), vec2(3.0, 3.0), 0.0, 0.0); } else { if (x < 4.335) { return KeyData(vec4(3.315, -4.08, 0.94, 0.94), vec2(4.0, 3.0), 0.0, 0.0); } else { return KeyData(vec4(5.355, -4.08, 0.94, 0.94), vec2(5.0, 3.0), 0.0, 0.0); } } } } else { if (x < 12.495) { if (x < 8.415) { return KeyData(vec4(7.395, -4.08, 0.94, 0.94), vec2(6.0, 3.0), 0.0, 0.0); } else { if (x < 10.455) { return KeyData(vec4(9.435, -4.08, 0.94, 0.94), vec2(7.0, 3.0), 0.0, 0.0); } else { return KeyData(vec4(11.475, -4.08, 0.94, 0.94), vec2(8.0, 3.0), 0.0, 0.0); } } } else { if (x < 16.575) { if (x < 14.535) { return KeyData(vec4(13.515, -4.08, 0.94, 0.94), vec2(9.0, 3.0), 0.0, 0.0); } else { return KeyData(vec4(15.555, -4.08, 0.94, 0.94), vec2(10.0, 3.0), 0.0, 0.0); } } else { if (x < 18.615) { return KeyData(vec4(17.595, -4.08, 0.94, 0.94), vec2(11.0, 3.0), 0.0, 0.0); } else { return KeyData(vec4(20.4, -4.08, 1.705, 0.94), vec2(12.0, 3.0), 0.0, 0.0); } } } } }\nKeyData rowKey5(float x) { if (x < 7.905) { if (x < -0.255) { if (x < -4.335) { return KeyData(vec4(-5.865, -6.12, 1.45, 0.94), vec2(0.0, 2.0), 0.0, 0.0); } else { if (x < -2.295) { return KeyData(vec4(-3.315, -6.12, 0.94, 0.94), vec2(1.0, 2.0), 0.0, 0.0); } else { return KeyData(vec4(-1.275, -6.12, 0.94, 0.94), vec2(2.0, 2.0), 0.0, 0.0); } } } else { if (x < 3.825) { if (x < 1.785) { return KeyData(vec4(0.765, -6.12, 0.94, 0.94), vec2(3.0, 2.0), 0.0, 0.0); } else { return KeyData(vec4(2.805, -6.12, 0.94, 0.94), vec2(4.0, 2.0), 0.0, 0.0); } } else { if (x < 5.865) { return KeyData(vec4(4.845, -6.12, 0.94, 0.94), vec2(5.0, 2.0), 0.0, 0.0); } else { return KeyData(vec4(6.885, -6.12, 0.94, 0.94), vec2(6.0, 2.0), 0.0, 0.0); } } } } else { if (x < 14.025) { if (x < 9.945) { return KeyData(vec4(8.925, -6.12, 0.94, 0.94), vec2(7.0, 2.0), 0.0, 0.0); } else { if (x < 11.985) { return KeyData(vec4(10.965, -6.12, 0.94, 0.94), vec2(8.0, 2.0), 0.0, 0.0); } else { return KeyData(vec4(13.005, -6.12, 0.94, 0.94), vec2(9.0, 2.0), 0.0, 0.0); } } } else { if (x < 18.105) { if (x < 16.065) { return KeyData(vec4(15.045, -6.12, 0.94, 0.94), vec2(10.0, 2.0), 0.0, 0.0); } else { return KeyData(vec4(17.085, -6.12, 0.94, 0.94), vec2(11.0, 2.0), 0.0, 0.0); } } else { if (x < 20.145) { return KeyData(vec4(19.125, -6.12, 0.94, 0.94), vec2(12.0, 2.0), 0.0, 0.0); } else { return KeyData(vec4(21.165, -6.12, 0.94, 0.94), vec2(13.0, 2.0), 0.0, 0.0); } } } } }\nKeyData rowKey6(float x) { if (x < 6.885) { if (x < -1.275) { if (x < -5.355) { return KeyData(vec4(-6.375, -8.16, 0.94, 0.94), vec2(0.0, 1.0), 0.0, 0.0); } else { if (x < -3.315) { return KeyData(vec4(-4.335, -8.16, 0.94, 0.94), vec2(1.0, 1.0), 0.0, 0.0); } else { return KeyData(vec4(-2.295, -8.16, 0.94, 0.94), vec2(2.0, 1.0), 0.0, 0.0); } } } else { if (x < 2.805) { if (x < 0.765) { return KeyData(vec4(-0.255, -8.16, 0.94, 0.94), vec2(3.0, 1.0), 0.0, 0.0); } else { return KeyData(vec4(1.785, -8.16, 0.94, 0.94), vec2(4.0, 1.0), 0.0, 0.0); } } else { if (x < 4.845) { return KeyData(vec4(3.825, -8.16, 0.94, 0.94), vec2(5.0, 1.0), 0.0, 0.0); } else { return KeyData(vec4(5.865, -8.16, 0.94, 0.94), vec2(6.0, 1.0), 0.0, 0.0); } } } } else { if (x < 13.005) { if (x < 8.925) { return KeyData(vec4(7.905, -8.16, 0.94, 0.94), vec2(7.0, 1.0), 0.0, 0.0); } else { if (x < 10.965) { return KeyData(vec4(9.945, -8.16, 0.94, 0.94), vec2(8.0, 1.0), 0.0, 0.0); } else { return KeyData(vec4(11.985, -8.16, 0.94, 0.94), vec2(9.0, 1.0), 0.0, 0.0); } } } else { if (x < 17.085) { if (x < 15.045) { return KeyData(vec4(14.025, -8.16, 0.94, 0.94), vec2(10.0, 1.0), 0.0, 0.0); } else { return KeyData(vec4(16.065, -8.16, 0.94, 0.94), vec2(11.0, 1.0), 0.0, 0.0); } } else { if (x < 19.125) { return KeyData(vec4(18.105, -8.16, 0.94, 0.94), vec2(12.0, 1.0), 0.0, 0.0); } else { return KeyData(vec4(20.655, -8.16, 1.45, 0.94), vec2(13.0, 1.0), 0.0, 0.0); } } } } }\nKeyData rowKey7(float x) { if (x < 7.905) { if (x < -0.255) { if (x < -4.335) { return KeyData(vec4(-5.865, -10.2, 1.45, 0.94), vec2(0.0, 0.0), 0.0, 0.0); } else { if (x < -2.295) { return KeyData(vec4(-3.315, -10.2, 0.94, 0.94), vec2(1.0, 0.0), 0.0, 0.0); } else { return KeyData(vec4(-1.275, -10.2, 0.94, 0.94), vec2(2.0, 0.0), 0.0, 0.0); } } } else { if (x < 3.825) { if (x < 1.785) { return KeyData(vec4(0.765, -10.2, 0.94, 0.94), vec2(3.0, 0.0), 0.0, 0.0); } else { return KeyData(vec4(2.805, -10.2, 0.94, 0.94), vec2(4.0, 0.0), 0.0, 0.0); } } else { if (x < 5.865) { return KeyData(vec4(4.845, -10.2, 0.94, 0.94), vec2(5.0, 0.0), 0.0, 0.0); } else { return KeyData(vec4(6.885, -10.2, 0.94, 0.94), vec2(6.0, 0.0), 0.0, 0.0); } } } } else { if (x < 14.025) { if (x < 9.945) { return KeyData(vec4(8.925, -10.2, 0.94, 0.94), vec2(7.0, 0.0), 0.0, 0.0); } else { if (x < 11.985) { return KeyData(vec4(10.965, -10.2, 0.94, 0.94), vec2(8.0, 0.0), 0.0, 0.0); } else { return KeyData(vec4(13.005, -10.2, 0.94, 0.94), vec2(9.0, 0.0), 0.0, 0.0); } } } else { if (x < 18.105) { if (x < 16.065) { return KeyData(vec4(15.045, -10.2, 0.94, 0.94), vec2(10.0, 0.0), 0.0, 0.0); } else { return KeyData(vec4(17.085, -10.2, 0.94, 0.94), vec2(11.0, 0.0), 0.0, 0.0); } } else { if (x < 20.145) { return KeyData(vec4(19.125, -10.2, 0.94, 0.94), vec2(12.0, 0.0), 0.0, 0.0); } else { return KeyData(vec4(21.165, -10.2, 0.94, 0.94), vec2(13.0, 0.0), 0.0, 1.0); } } } } }\n\nfloat keyDistance(vec3 p, KeyData key) {\n  vec2 q = vec2(rectangle(p.xz - key.bounds.xy, key.bounds.zw, 0.18) + 0.045,\n    abs(p.y + keyDepression(key.identity) - 0.09) - 0.15 + 0.045);\n  return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - 0.045;\n}\nKeyHit closestKey(vec3 p) {\n    KeyHit hit = KeyHit(100000.0, rowKey0(p.x));\n    if (max(abs(p.z - 0.51) - 0.43, max(16.145 - p.x, p.x - 22.105)) < hit.distance) {\n      KeyData key = rowKey0(p.x);\n      float distance = keyDistance(p, key);\n      if (distance < hit.distance) { hit = KeyHit(distance, key); }\n    }\nif (max(abs(p.z - 0.0) - 0.94, max(-7.315 - p.x, p.x - 15.985)) < hit.distance) {\n      KeyData key = rowKey1(p.x);\n      float distance = keyDistance(p, key);\n      if (distance < hit.distance) { hit = KeyHit(distance, key); }\n    }\nif (max(abs(p.z - -0.51) - 0.43, max(18.185 - p.x, p.x - 20.065)) < hit.distance) {\n      KeyData key = rowKey2(p.x);\n      float distance = keyDistance(p, key);\n      if (distance < hit.distance) { hit = KeyHit(distance, key); }\n    }\nif (max(abs(p.z - -2.04) - 0.94, max(-7.315 - p.x, p.x - 22.105)) < hit.distance) {\n      KeyData key = rowKey3(p.x);\n      float distance = keyDistance(p, key);\n      if (distance < hit.distance) { hit = KeyHit(distance, key); }\n    }\nif (max(abs(p.z - -4.08) - 0.94, max(-7.315 - p.x, p.x - 22.105)) < hit.distance) {\n      KeyData key = rowKey4(p.x);\n      float distance = keyDistance(p, key);\n      if (distance < hit.distance) { hit = KeyHit(distance, key); }\n    }\nif (max(abs(p.z - -6.12) - 0.94, max(-7.315 - p.x, p.x - 22.105)) < hit.distance) {\n      KeyData key = rowKey5(p.x);\n      float distance = keyDistance(p, key);\n      if (distance < hit.distance) { hit = KeyHit(distance, key); }\n    }\nif (max(abs(p.z - -8.16) - 0.94, max(-7.315 - p.x, p.x - 22.105)) < hit.distance) {\n      KeyData key = rowKey6(p.x);\n      float distance = keyDistance(p, key);\n      if (distance < hit.distance) { hit = KeyHit(distance, key); }\n    }\nif (max(abs(p.z - -10.2) - 0.94, max(-7.315 - p.x, p.x - 22.105)) < hit.distance) {\n      KeyData key = rowKey7(p.x);\n      float distance = keyDistance(p, key);\n      if (distance < hit.distance) { hit = KeyHit(distance, key); }\n    }\n    return hit;\n  }\n  float scene(vec3 p) { return closestKey(p).distance; }\nfloat sampleLegend(vec2 point) {\n  vec4 bounds = vec4(-7.315, -11.14, 22.105, 0.94);\n  vec2 uv = (point - bounds.xy) / (bounds.zw - bounds.xy);\n  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { return 0.0; }\n  vec2 size = vec2(textureSize(uLegends, 0));\n  vec2 texel = uv * size - vec2(0.5);\n  vec2 base = floor(texel);\n  vec2 weight = fract(texel);\n  ivec2 a = ivec2(clamp(base, vec2(0.0), size - vec2(1.0)));\n  ivec2 b = ivec2(clamp(base + vec2(1.0, 0.0), vec2(0.0), size - vec2(1.0)));\n  ivec2 c = ivec2(clamp(base + vec2(0.0, 1.0), vec2(0.0), size - vec2(1.0)));\n  ivec2 d = ivec2(clamp(base + vec2(1.0), vec2(0.0), size - vec2(1.0)));\n  return mix(mix(texelFetch(uLegends, a, 0).r, texelFetch(uLegends, b, 0).r, weight.x),\n    mix(texelFetch(uLegends, c, 0).r, texelFetch(uLegends, d, 0).r, weight.x), weight.y);\n}\nvec3 normalAt(vec3 p) {\n  vec2 e = vec2(0.0007, 0.0);\n  return normalize(vec3(scene(p + e.xyy) - scene(p - e.xyy),\n    scene(p + e.yxy) - scene(p - e.yxy), scene(p + e.yyx) - scene(p - e.yyx)));\n}\nvec3 keyLightPosition() {\n  float angle = radians(uLightAngle);\n  float elevation = radians(uLightElevation);\n  return vec3(cos(angle) * cos(elevation), sin(elevation), sin(angle) * cos(elevation)) * 6.42261629;\n}\nvec3 environmentPosition(vec3 p) {\n  float angle = radians(uEnvironmentRotation);\n  float c = cos(angle);\n  float s = sin(angle);\n  return vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z);\n}\nfloat visibility(vec3 p, vec3 n) {\n  vec3 direction = normalize(keyLightPosition() - p);\n  vec3 origin = p + n * 0.003;\n  float t = 0.008;\n  float shadow = 1.0;\n  for (int i = 0; i < 24; i++) {\n    vec3 q = origin + direction * t;\n    if (q.y > 0.25) { break; }\n    float d = scene(q);\n    shadow = min(shadow, (5.0 / uLightSize) * max(d, 0.0) / t);\n    if (d < 0.0002) { break; }\n    t += clamp(d, 0.004, 0.12);\n  }\n  return smoothstep(0.0, 1.0, shadow);\n}\nfloat occlusion(vec3 p, vec3 n) {\n  float sum = 0.0;\n  float weight = 1.0;\n  for (int i = 1; i < 5; i++) {\n    float reach = float(i) * 0.035;\n    sum += max(reach - scene(p + n * reach), 0.0) * weight;\n    weight *= 0.6;\n  }\n  return clamp(1.0 - sum * 6.0, 0.25, 1.0);\n}\nfloat softbox(vec3 p, vec3 ray, vec3 center, vec2 size, float roughness) {\n  vec3 az = normalize(-center);\n  vec3 ax = normalize(cross(vec3(0.0, 1.0, 0.0), az));\n  vec3 ay = cross(az, ax);\n  float divisor = dot(ray, az);\n  if (divisor > -0.0001) { return 0.0; }\n  float travel = dot(center - p, az) / divisor;\n  if (travel <= 0.0) { return 0.0; }\n  vec3 q = p + ray * travel - center;\n  vec2 uv = vec2(dot(q, ax), dot(q, ay));\n  float blur = 0.008 + roughness * roughness * travel * 0.6;\n  vec2 integral = (atan((size - uv) / blur) + atan((size + uv) / blur)) / PI;\n  return max(integral.x * integral.y, 0.0);\n}\nvec3 plastic(vec3 p, vec3 n, vec3 v, vec3 base, float roughness, float shadow, float ao) {\n  vec3 light = normalize(keyLightPosition() - p);\n  vec3 diffuse = vec3(0.38 * uEnvironmentIntensity)\n    + uLightColor.rgb * (0.62 * uLightIntensity * max(dot(n, light), 0.0) * shadow);\n  float nv = max(dot(n, v), 0.0);\n  float fresnel = 0.035 + 0.965 * pow(1.0 - nv, 5.0);\n  vec3 reflection = reflect(-v, n);\n  float key = softbox(p, reflection, keyLightPosition(), vec2(2.0, 2.8) * uLightSize, roughness);\n  float fill = softbox(p, reflection, environmentPosition(vec3(2.0, 4.0, -3.0)), vec2(2.0, 2.5), roughness);\n  vec3 specular = vec3(1.0, 1.025, 1.04) *\n    (uLightColor.rgb * (key * 1.4 * uLightIntensity)\n      + vec3((fill * 0.18 + 0.012) * uEnvironmentIntensity)) * fresnel;\n  return base * diffuse * ao + specular * mix(ao, 1.0, 0.3);\n}\n// Shallow engraved inlay; the SDF gradient supplies the cut wall's normal.\n// The 0.0035 depth is intentionally much smaller than the molded cap bevel.\nvec4 engraving(vec2 p, float top) {\n  float scale = 1.20 * uLogoScale;\n  vec3 field = sampleSvgField(p / scale + vec2(0.5));\n  float width = 0.008;\n  float t = clamp(-field.x * scale / width, 0.0, 1.0);\n  float inset = t * t * (3.0 - 2.0 * t);\n  float slope = 0.0035 * 6.0 * t * (1.0 - t) / width;\n  return vec4(top - 0.0035 * inset, normalize(vec3(-field.y * slope, 1.0, -field.z * slope)));\n}\nvec3 shade(vec3 position, vec3 ro, float aa) {\n  vec3 p = position;\n  KeyData key = closestKey(p).key;\n  vec2 cell = key.identity;\n  vec2 local = p.xz - key.bounds.xy;\n  vec3 geometric = normalAt(p);\n  float topFace = smoothstep(0.98, 0.9999, geometric.y);\n  float central = key.logo;\n  if (geometric.y > 0.9999) {\n    vec3 ray = normalize(p - ro);\n    float top = 0.24 - keyDepression(cell);\n    // Refine the planar hit exactly: raymarch tolerance must not change the\n    // grain phase while a cap moves. The logo then solves its shallow recess.\n    p += ray * ((top - p.y) / min(ray.y, -0.1));\n    geometric = vec3(0.0, 1.0, 0.0);\n    if (central > 0.5) {\n      for (int i = 0; i < 4; i++) {\n        vec4 surface = engraving(p.xz - key.bounds.xy, top);\n        p += ray * ((surface.x - p.y) / min(ray.y, -0.1));\n      }\n      geometric = engraving(p.xz - key.bounds.xy, top).yzw;\n    }\n  }\n  // Molded micro-grain: two continuous bands, filtered at the actual render\n  // footprint. The grain perturbs lighting, rather than overlaying white noise.\n  // Undo the key's rigid translation before sampling its molded material.\n  // World XZ keeps each key's original seed; rest Y anchors tops and sidewalls.\n  float restY = p.y + keyDepression(cell);\n  vec2 grainUV = p.xz + vec2(restY * 0.7, restY * 0.4);\n  vec3 coarse = noiseGradient(grainUV * 115.0);\n  vec3 fine = noiseGradient(grainUV * 260.0);\n  float grainFootprint = aa / sin(1.06);\n  float filterA = exp(-grainFootprint * grainFootprint * 13225.0 * 0.35);\n  float filterB = exp(-grainFootprint * grainFootprint * 67600.0 * 0.35);\n  vec2 bump = coarse.yz * (0.085 * filterA) + fine.yz * (0.032 * filterB);\n  vec3 n = normalize(geometric + vec3(bump.x, 0.0, bump.y));\n  vec3 v = normalize(ro - p);\n  float shadow = visibility(p, geometric);\n  float ao = occlusion(p, geometric);\n  float grain = (coarse.x - 0.5) * 0.055 * filterA + (fine.x - 0.5) * 0.025 * filterB;\n  vec3 body = uKeyColor.rgb * (1.0 + grain);\n  vec3 color = plastic(p, n, v, body, uRoughness, shadow, ao);\n  if (key.sensor > 0.5) {\n    float radius = length(local);\n    float disk = (1.0 - smoothstep(0.64 - aa, 0.64 + aa, radius)) * topFace;\n    float ring = 1.0 - smoothstep(0.006, 0.006 + aa, abs(radius - 0.64));\n    vec3 sensor = plastic(p, geometric, v, uKeyColor.rgb * 0.90, 0.24, shadow, ao);\n    color = mix(color, sensor, disk) * (1.0 - ring * topFace * 0.28);\n  }\n  if (central < 0.5) {\n    float coverage = sampleLegend(p.xz) * topFace;\n    vec3 legend = plastic(p, geometric, v, uLegendColor.rgb, 0.26, shadow, ao);\n    color = mix(color, legend, coverage);\n  }\n  if (central > 0.5) {\n    float field = sampleSvgField((p.xz - key.bounds.xy) / (1.20 * uLogoScale) + vec2(0.5)).x;\n    float logo = (1.0 - smoothstep(-aa / 1.20, aa / 1.20, field)) * topFace;\n    vec3 gloss = plastic(p, geometric, v, uLogoColor.rgb, 0.14, shadow, ao);\n    float nv = max(dot(geometric, v), 0.0);\n    float clearcoat = softbox(p, reflect(-v, geometric), environmentPosition(vec3(0.8, 3.8, -2.0)), vec2(0.28, 1.5), 0.14)\n      * (0.04 + 0.96 * pow(1.0 - nv, 5.0)) * 3.0 * uEnvironmentIntensity;\n    gloss = mix(gloss, vec3(1.0), clamp(clearcoat, 0.0, 0.22));\n    color = mix(color, gloss, logo);\n\n  }\n  return color;\n}\nvec3 render(vec2 uv) {\n  float aspect = uResolution.x / max(uResolution.y, 1.0);\n  vec3 rd = -vec3(sin(-0.32) * cos(1.06), sin(1.06), cos(-0.32) * cos(1.06));\n  vec3 right = normalize(cross(rd, vec3(0.0, 1.0, 0.0)));\n  vec3 up = cross(right, rd);\n  vec2 screen = vec2((uv.x - 0.5 - uOffsetX) * aspect, 0.5 + uOffsetY - uv.y) * 2.8 / uScale;\n  vec3 ro = vec3(0.0, 0.10, 0.0) - rd * 5.0 + right * (screen.x + uCameraX) + up * (screen.y + uCameraY);\n  float aa = 2.8 / (max(uRenderResolution.y, 1.0) * uScale);\n  float travel = (0.241 - ro.y) / rd.y;\n  float limit = (0.02 - ro.y) / rd.y;\n  vec3 ground = ro + rd * limit;\n  float shadow = visibility(ground, vec3(0.0, 1.0, 0.0));\n  float contact = occlusion(ground, vec3(0.0, 1.0, 0.0));\n  vec3 color = uBackgroundColor.rgb * (vec3(0.55 * uEnvironmentIntensity) + uLightColor.rgb * (0.45 * uLightIntensity * shadow)) * contact;\n  for (int i = 0; i < 96; i++) {\n    if (travel > limit) { break; }\n    vec3 p = ro + rd * travel;\n    float distance = scene(p);\n    if (distance < 0.00018) {\n      color = shade(p, ro, aa);\n      break;\n    }\n    travel += max(distance * 0.85, 0.0001);\n  }\n  return color * uExposure;\n}\n\nvoid main() { finalColor = vec4(render(vUV), 1.0); }";

	const SDF_SIZE = 512;
	const SDF_RASTER_SUPERSAMPLE = 2;
	const SDF_PADDING_RATIO = 0.05;
	const SDF_WITH_GRADIENT = true;

	function normalizeValues(candidate: Partial<ShaderValues>): ShaderValues {
		return {
			svgSource:
				typeof candidate.svgSource === "string" && candidate.svgSource.trim()
					? candidate.svgSource.trim()
					: DEFAULT_VALUES.svgSource,
			fontUrl: normalizeTextFont(candidate.fontUrl ?? DEFAULT_VALUES.fontUrl),
			scale: clampNumber(candidate.scale ?? DEFAULT_VALUES.scale, 0.1, 1.8, 0.01),
			offsetX: clampNumber(candidate.offsetX ?? DEFAULT_VALUES.offsetX, -0.3, 0.3, 0.01),
			offsetY: clampNumber(candidate.offsetY ?? DEFAULT_VALUES.offsetY, -0.5, 0.5, 0.01),
			panX: clampNumber(candidate.panX ?? DEFAULT_VALUES.panX, -14, 26, 0.01),
			panY: clampNumber(candidate.panY ?? DEFAULT_VALUES.panY, -8, 20, 0.01),
			logoScale: clampNumber(candidate.logoScale ?? DEFAULT_VALUES.logoScale, 0.3, 1.15, 0.01),
			legendScale: clampNumber(candidate.legendScale ?? DEFAULT_VALUES.legendScale, 0.5, 1.6, 0.01),
			letterSpacing: clampNumber(
				candidate.letterSpacing ?? DEFAULT_VALUES.letterSpacing,
				-0.1,
				0.5,
				0.005
			),
			backgroundColor: normalizeColor(
				candidate.backgroundColor ?? DEFAULT_VALUES.backgroundColor,
				"#202A2D"
			),
			keyColor: normalizeColor(candidate.keyColor ?? DEFAULT_VALUES.keyColor, "#273438"),
			logoColor: normalizeColor(candidate.logoColor ?? DEFAULT_VALUES.logoColor, "#ACB7AE"),
			legendColor: normalizeColor(candidate.legendColor ?? DEFAULT_VALUES.legendColor, "#ACB7AE"),
			roughness: clampNumber(candidate.roughness ?? DEFAULT_VALUES.roughness, 0.3, 0.85, 0.01),
			lightAngle: clampNumber(candidate.lightAngle ?? DEFAULT_VALUES.lightAngle, -180, 180, 1),
			lightElevation: clampNumber(
				candidate.lightElevation ?? DEFAULT_VALUES.lightElevation,
				10,
				85,
				1
			),
			lightIntensity: clampNumber(
				candidate.lightIntensity ?? DEFAULT_VALUES.lightIntensity,
				0,
				3,
				0.01
			),
			lightSize: clampNumber(candidate.lightSize ?? DEFAULT_VALUES.lightSize, 0.25, 3, 0.01),
			lightColor: normalizeColor(candidate.lightColor ?? DEFAULT_VALUES.lightColor, "#FFFFFF"),
			environmentRotation: clampNumber(
				candidate.environmentRotation ?? DEFAULT_VALUES.environmentRotation,
				-180,
				180,
				1
			),
			environmentIntensity: clampNumber(
				candidate.environmentIntensity ?? DEFAULT_VALUES.environmentIntensity,
				0,
				3,
				0.01
			),
			exposure: clampNumber(candidate.exposure ?? DEFAULT_VALUES.exposure, 0, 2, 0.01)
		};
	}

	function createUniformResources() {
		return {
			uTime: { value: 0, type: "f32" },
			uResolution: { value: [1, 1], type: "vec2<f32>" },
			uScale: { value: 1.25, type: "f32" },
			uOffsetX: { value: 0.08, type: "f32" },
			uOffsetY: { value: 0, type: "f32" },
			uCameraX: { value: 0, type: "f32" },
			uCameraY: { value: 0, type: "f32" },
			uLogoScale: { value: 0.95, type: "f32" },
			uFontSize: { value: 1, type: "f32" },
			uLetterSpacing: { value: 0, type: "f32" },
			uBackgroundColor: { value: toLinearRgba("#202A2D"), type: "vec4<f32>" },
			uKeyColor: { value: toLinearRgba("#273438"), type: "vec4<f32>" },
			uLogoColor: { value: toLinearRgba("#ACB7AE"), type: "vec4<f32>" },
			uLegendColor: { value: toLinearRgba("#ACB7AE"), type: "vec4<f32>" },
			uRoughness: { value: 0.55, type: "f32" },
			uLightAngle: { value: -150.255119, type: "f32" },
			uLightElevation: { value: 51.123345, type: "f32" },
			uLightIntensity: { value: 1, type: "f32" },
			uLightSize: { value: 1, type: "f32" },
			uLightColor: { value: toLinearRgba("#FFFFFF"), type: "vec4<f32>" },
			uEnvironmentRotation: { value: 0, type: "f32" },
			uEnvironmentIntensity: { value: 1, type: "f32" },
			uExposure: { value: 1, type: "f32" },
			uPressedKey: { value: [999, 999], type: "vec2<f32>" },
			uPress: { value: 0, type: "f32" },
			uRenderResolution: { value: [1, 1], type: "vec2<f32>" },
			uPixelRatio: { value: 1, type: "f32" }
		};
	}

	function applyValues(uniforms: Record<string, unknown>, values: ShaderValues): void {
		uniforms["uScale"] = values.scale;
		uniforms["uOffsetX"] = values.offsetX;
		uniforms["uOffsetY"] = values.offsetY;
		uniforms["uCameraX"] = values.panX;
		uniforms["uCameraY"] = values.panY;
		uniforms["uLogoScale"] = values.logoScale;
		uniforms["uFontSize"] = values.legendScale;
		uniforms["uLetterSpacing"] = values.letterSpacing;
		uniforms["uBackgroundColor"] = toLinearRgba(values.backgroundColor);
		uniforms["uKeyColor"] = toLinearRgba(values.keyColor);
		uniforms["uLogoColor"] = toLinearRgba(values.logoColor);
		uniforms["uLegendColor"] = toLinearRgba(values.legendColor);
		uniforms["uRoughness"] = values.roughness;
		uniforms["uLightAngle"] = values.lightAngle;
		uniforms["uLightElevation"] = values.lightElevation;
		uniforms["uLightIntensity"] = values.lightIntensity;
		uniforms["uLightSize"] = values.lightSize;
		uniforms["uLightColor"] = toLinearRgba(values.lightColor);
		uniforms["uEnvironmentRotation"] = values.environmentRotation;
		uniforms["uEnvironmentIntensity"] = values.environmentIntensity;
		uniforms["uExposure"] = values.exposure;
	}

	function loadSvg(source: string, signal?: AbortSignal): Promise<HTMLImageElement> {
		return new Promise((resolve, reject) => {
			const normalized = source.trim();
			if (!normalized) {
				reject(new Error("Provide inline SVG markup or an SVG URL."));
				return;
			}
			const inline = normalized.startsWith("<") && normalized.includes("<svg");
			const url = inline
				? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(normalized)
				: normalized;
			const image = new Image();
			if (!url.startsWith("data:")) image.crossOrigin = "anonymous";
			image.decoding = "async";
			const cleanup = () => {
				image.onload = null;
				image.onerror = null;
				signal?.removeEventListener("abort", abort);
			};
			const abort = () => {
				cleanup();
				image.src = "";
				reject(new DOMException("SVG preparation was cancelled.", "AbortError"));
			};
			if (signal?.aborted) {
				abort();
				return;
			}
			signal?.addEventListener("abort", abort, { once: true });
			image.onload = () => {
				cleanup();
				resolve(image);
			};
			image.onerror = () => {
				cleanup();
				reject(new Error("Unable to load the SVG source. Check the markup or URL and try again."));
			};
			image.src = url;
		});
	}

	function rasterizeSvgAlpha(image: HTMLImageElement, size: number) {
		const canvas = document.createElement("canvas");
		canvas.width = size;
		canvas.height = size;
		const context = canvas.getContext("2d", { willReadFrequently: true });
		if (!context) throw new Error("A 2D canvas is required to prepare the SVG mask.");

		const naturalWidth = image.naturalWidth || image.width || 1;
		const naturalHeight = image.naturalHeight || image.height || 1;
		const drawableSize = size * (1 - SDF_PADDING_RATIO * 2);
		const scale = Math.min(drawableSize / naturalWidth, drawableSize / naturalHeight);
		const drawWidth = naturalWidth * scale;
		const drawHeight = naturalHeight * scale;
		const x = (size - drawWidth) * 0.5;
		const y = (size - drawHeight) * 0.5;

		context.clearRect(0, 0, size, size);
		context.drawImage(image, x, y, drawWidth, drawHeight);
		const pixels = context.getImageData(0, 0, size, size).data;
		const coverage = new Float32Array(size * size);
		for (let pixel = 3, index = 0; pixel < pixels.length; pixel += 4, index++) {
			coverage[index] = pixels[pixel]! / 255;
		}
		canvas.width = 0;
		canvas.height = 0;
		return { coverage, size };
	}

	async function buildSdfField(
		coverage: Float32Array,
		sourceSize: number,
		targetSize: number,
		withGradient: boolean,
		yieldToMain = false,
		signal?: AbortSignal
	): Promise<Float32Array | Uint16Array> {
		type Segment = { ax: number; ay: number; bx: number; by: number };
		type Node = {
			x0: number;
			y0: number;
			x1: number;
			y1: number;
			start: number;
			end: number;
			left: number;
			right: number;
		};
		const segments: Segment[] = [];
		const ratio = targetSize / sourceSize;
		const alpha = (x: number, y: number) =>
			x < 0 || y < 0 || x >= sourceSize || y >= sourceSize ? 0 : coverage[y * sourceSize + x]!;
		const pause = async () => {
			if (yieldToMain) await new Promise<void>((resolve) => setTimeout(resolve, 0));
			if (signal?.aborted) throw new DOMException("SVG preparation was cancelled.", "AbortError");
		};
		const crossings = new Float64Array(8);
		const edges = new Int32Array(4);
		for (let y = -1; y < sourceSize; y++) {
			if ((y & 63) === 0) await pause();
			for (let x = -1; x < sourceSize; x++) {
				const a = alpha(x, y),
					b = alpha(x + 1, y),
					c = alpha(x + 1, y + 1),
					d = alpha(x, y + 1);
				let count = 0;
				if (a > 0.5 !== b > 0.5) {
					crossings[0] = x + 0.5 + (0.5 - a) / (b - a);
					crossings[1] = y + 0.5;
					edges[count++] = 0;
				}
				if (b > 0.5 !== c > 0.5) {
					crossings[2] = x + 1.5;
					crossings[3] = y + 0.5 + (0.5 - b) / (c - b);
					edges[count++] = 1;
				}
				if (d > 0.5 !== c > 0.5) {
					crossings[4] = x + 0.5 + (0.5 - d) / (c - d);
					crossings[5] = y + 1.5;
					edges[count++] = 2;
				}
				if (a > 0.5 !== d > 0.5) {
					crossings[6] = x + 0.5;
					crossings[7] = y + 0.5 + (0.5 - a) / (d - a);
					edges[count++] = 3;
				}
				if (!count) continue;
				const add = (first: number, second: number) => {
					const ax = crossings[first * 2]! * ratio,
						ay = crossings[first * 2 + 1]! * ratio;
					const bx = crossings[second * 2]! * ratio,
						by = crossings[second * 2 + 1]! * ratio;
					if (ax !== bx || ay !== by) segments.push({ ax, ay, bx, by });
				};
				if (count === 2) add(edges[0]!, edges[1]!);
				else if ((a - 0.5) * (c - 0.5) - (b - 0.5) * (d - 0.5) >= 0) {
					add(0, 1);
					add(2, 3);
				} else {
					add(0, 3);
					add(1, 2);
				}
			}
		}
		const distances = new Float32Array(targetSize * targetSize);
		if (!segments.length) {
			throw new Error(
				"The SVG has no filled silhouette. Use visible paths with opaque fills or strokes."
			);
		}
		// Remove redundant raster segments within 0.05 final texels. This bounds
		// geometric error while making exact nearest-contour queries much cheaper.
		const connections = new Map<string, number[]>();
		const key = (x: number, y: number) => x + "," + y;
		for (let i = 0; i < segments.length; i++) {
			const s = segments[i]!;
			for (const point of [key(s.ax, s.ay), key(s.bx, s.by)]) {
				const connected = connections.get(point);
				if (connected) connected.push(i);
				else connections.set(point, [i]);
			}
		}
		const visited = new Uint8Array(segments.length),
			simplified: Segment[] = [];
		for (let seed = 0; seed < segments.length; seed++) {
			if (visited[seed]) continue;
			const first = segments[seed]!;
			const points = [first.ax, first.ay, first.bx, first.by];
			visited[seed] = 1;
			let x = first.bx,
				y = first.by;
			while (true) {
				const connected = connections.get(key(x, y))!;
				if (connected.length !== 2) break;
				const next = connected.find((index) => !visited[index]);
				if (next === undefined) break;
				visited[next] = 1;
				const s = segments[next]!;
				if (x === s.ax && y === s.ay) {
					x = s.bx;
					y = s.by;
				} else {
					x = s.ax;
					y = s.ay;
				}
				points.push(x, y);
			}
			const count = points.length / 2,
				keep = new Uint8Array(count),
				pending = [0, count - 1];
			keep[0] = 1;
			keep[count - 1] = 1;
			while (pending.length) {
				const end = pending.pop()!,
					start = pending.pop()!;
				const ax = points[start * 2]!,
					ay = points[start * 2 + 1]!;
				const dx = points[end * 2]! - ax,
					dy = points[end * 2 + 1]! - ay,
					length = dx * dx + dy * dy;
				let maximum = 0.05 * 0.05,
					selected = -1;
				for (let i = start + 1; i < end; i++) {
					const px = points[i * 2]! - ax,
						py = points[i * 2 + 1]! - ay;
					const t = length ? Math.max(0, Math.min(1, (px * dx + py * dy) / length)) : 0;
					const distance = (px - t * dx) ** 2 + (py - t * dy) ** 2;
					if (distance > maximum) {
						maximum = distance;
						selected = i;
					}
				}
				if (selected >= 0) {
					keep[selected] = 1;
					pending.push(start, selected, selected, end);
				}
			}
			// Tiny closed contours must not collapse to a point or doubled segment.
			if (
				points[0] === points[points.length - 2] &&
				points[1] === points[points.length - 1] &&
				keep.reduce((sum, value) => sum + value, 0) < 4
			)
				keep.fill(1);
			let previous = 0;
			for (let i = 1; i < count; i++)
				if (keep[i]) {
					simplified.push({
						ax: points[previous * 2]!,
						ay: points[previous * 2 + 1]!,
						bx: points[i * 2]!,
						by: points[i * 2 + 1]!
					});
					previous = i;
				}
		}
		segments.length = 0;
		for (const segment of simplified) segments.push(segment);
		connections.clear();
		const nodes: Node[] = [];
		function build(start: number, end: number): number {
			const node: Node = {
				x0: Infinity,
				y0: Infinity,
				x1: -Infinity,
				y1: -Infinity,
				start,
				end,
				left: -1,
				right: -1
			};
			const index = nodes.push(node) - 1;
			for (let i = start; i < end; i++) {
				const s = segments[i]!;
				node.x0 = Math.min(node.x0, s.ax, s.bx);
				node.y0 = Math.min(node.y0, s.ay, s.by);
				node.x1 = Math.max(node.x1, s.ax, s.bx);
				node.y1 = Math.max(node.y1, s.ay, s.by);
			}
			if (end - start > 8) {
				const horizontal = node.x1 - node.x0 >= node.y1 - node.y0;
				const sorted = segments
					.slice(start, end)
					.sort((a, b) => (horizontal ? a.ax + a.bx - b.ax - b.bx : a.ay + a.by - b.ay - b.by));
				for (let i = 0; i < sorted.length; i++) segments[start + i] = sorted[i]!;
				const middle = (start + end) >>> 1;
				node.left = build(start, middle);
				node.right = build(middle, end);
			}
			return index;
		}
		build(0, segments.length);
		const stack = new Int32Array(64);
		function boxDistance(node: Node, x: number, y: number) {
			const dx = Math.max(node.x0 - x, 0, x - node.x1),
				dy = Math.max(node.y0 - y, 0, y - node.y1);
			return dx * dx + dy * dy;
		}
		function segmentDistance(s: Segment, x: number, y: number) {
			const dx = s.bx - s.ax,
				dy = s.by - s.ay;
			const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (y - s.ay) * dy) / (dx * dx + dy * dy)));
			const px = x - s.ax - t * dx,
				py = y - s.ay - t * dy;
			return px * px + py * py;
		}
		let nearest = 0;
		for (let y = 0; y < targetSize; y++) {
			if ((y & 15) === 0) await pause();
			const sy = (y + 0.5) / ratio - 0.5,
				iy = Math.floor(sy),
				fy = sy - iy;
			for (let x = 0; x < targetSize; x++) {
				const px = x + 0.5,
					py = y + 0.5;
				let best = segmentDistance(segments[nearest]!, px, py);
				let depth = 1;
				stack[0] = 0;
				while (depth) {
					const node = nodes[stack[--depth]!]!;
					if (boxDistance(node, px, py) > best) continue;
					if (node.left < 0) {
						for (let i = node.start; i < node.end; i++) {
							const candidate = segmentDistance(segments[i]!, px, py);
							if (candidate < best) {
								best = candidate;
								nearest = i;
							}
						}
					} else {
						const left = boxDistance(nodes[node.left]!, px, py),
							right = boxDistance(nodes[node.right]!, px, py);
						if (left < right) {
							if (right <= best) stack[depth++] = node.right;
							if (left <= best) stack[depth++] = node.left;
						} else {
							if (left <= best) stack[depth++] = node.left;
							if (right <= best) stack[depth++] = node.right;
						}
					}
				}
				const sx = px / ratio - 0.5,
					ix = Math.floor(sx),
					fx = sx - ix;
				const coverageAtPoint =
					(alpha(ix, iy) * (1 - fx) + alpha(ix + 1, iy) * fx) * (1 - fy) +
					(alpha(ix, iy + 1) * (1 - fx) + alpha(ix + 1, iy + 1) * fx) * fy;
				distances[y * targetSize + x] =
					(Math.sqrt(best) / targetSize) * (coverageAtPoint > 0.5 ? -1 : 1);
			}
		}
		if (!withGradient) return distances;
		const packed = new Uint16Array(distances.length * 4);
		const bits = new Uint32Array(1),
			value = new Float32Array(bits.buffer);
		function half(number: number) {
			value[0] = number;
			const word = bits[0]!,
				sign = (word >>> 16) & 0x8000,
				exponent = ((word >>> 23) & 255) - 112;
			let mantissa = word & 0x7fffff;
			if (exponent <= 0) {
				if (exponent < -10) return sign;
				mantissa = (mantissa | 0x800000) >>> (1 - exponent);
				return sign | ((mantissa + 0xfff + ((mantissa >>> 13) & 1)) >>> 13);
			}
			return sign | ((exponent << 10) + ((mantissa + 0xfff + ((mantissa >>> 13) & 1)) >>> 13));
		}
		// Filter only the shading frame. The distance channel retains the contour.
		// Precompute both derivative scales so tangent filtering never repeats them.
		const gradients = new Float32Array(distances.length * 4);
		const outer = Math.max(2, Math.round(targetSize * 0.005));
		const inner = Math.max(1, Math.round(outer * 0.5));
		const at = (x: number, y: number) =>
			distances[
				Math.max(0, Math.min(targetSize - 1, y)) * targetSize +
					Math.max(0, Math.min(targetSize - 1, x))
			]!;
		let gx = 0,
			gy = 0;
		function sobel(x: number, y: number, radius: number) {
			const bl = at(x - radius, y - radius),
				l = at(x - radius, y),
				tl = at(x - radius, y + radius);
			const b = at(x, y - radius),
				t = at(x, y + radius);
			const br = at(x + radius, y - radius),
				r = at(x + radius, y),
				tr = at(x + radius, y + radius);
			gx = ((tr + 2 * r + br - tl - 2 * l - bl) * targetSize) / (8 * radius);
			gy = ((tl + 2 * t + tr - bl - 2 * b - br) * targetSize) / (8 * radius);
		}
		for (let y = 0; y < targetSize; y++) {
			if ((y & 31) === 0) await pause();
			for (let x = 0; x < targetSize; x++) {
				const index = y * targetSize + x,
					offset = index * 4;
				if (distances[index]! > 0.04) continue;
				sobel(x, y, inner);
				const ix = gx,
					iy = gy;
				sobel(x, y, outer);
				gradients[offset] = ix * 0.35 + gx * 0.65;
				gradients[offset + 1] = iy * 0.35 + gy * 0.65;
				gradients[offset + 2] = ((at(x + outer, y) - at(x - outer, y)) * targetSize) / (2 * outer);
				gradients[offset + 3] = ((at(x, y + outer) - at(x, y - outer)) * targetSize) / (2 * outer);
			}
		}
		function central(x: number, y: number) {
			const px = Math.max(0, Math.min(targetSize - 1, x)),
				py = Math.max(0, Math.min(targetSize - 1, y));
			const ix = Math.floor(px),
				iy = Math.floor(py),
				fx = px - ix,
				fy = py - iy;
			const a = (iy * targetSize + ix) * 4 + 2;
			const b = (iy * targetSize + Math.min(targetSize - 1, ix + 1)) * 4 + 2;
			const c = (Math.min(targetSize - 1, iy + 1) * targetSize + ix) * 4 + 2;
			const d =
				(Math.min(targetSize - 1, iy + 1) * targetSize + Math.min(targetSize - 1, ix + 1)) * 4 + 2;
			gx =
				(gradients[a]! * (1 - fx) + gradients[b]! * fx) * (1 - fy) +
				(gradients[c]! * (1 - fx) + gradients[d]! * fx) * fy;
			gy =
				(gradients[a + 1]! * (1 - fx) + gradients[b + 1]! * fx) * (1 - fy) +
				(gradients[c + 1]! * (1 - fx) + gradients[d + 1]! * fx) * fy;
		}
		function smooth(low: number, high: number, value: number) {
			const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
			return t * t * (3 - 2 * t);
		}
		const offsets = [-15.5, -11.5, -7.5, -3.5, 3.5, 7.5, 11.5, 15.5];
		for (let y = 0; y < targetSize; y++) {
			if ((y & 15) === 0) await pause();
			for (let x = 0; x < targetSize; x++) {
				const index = y * targetSize + x,
					offset = index * 4;
				const featureX = gradients[offset]!,
					featureY = gradients[offset + 1]!,
					magnitude = Math.sqrt(featureX * featureX + featureY * featureY);
				let normalX = featureX,
					normalY = featureY;
				if (magnitude > 0.0001) {
					const rx = featureX / magnitude,
						ry = featureY / magnitude;
					let sumX = featureX,
						sumY = featureY,
						sum = 1;
					for (const step of offsets) {
						central(x - ry * step, y + rx * step);
						const length = Math.sqrt(gx * gx + gy * gy);
						if (length < 0.0001) continue;
						const weight =
							smooth(0.94, 0.985, (gx * rx + gy * ry) / length) *
							smooth(0.2, 0.55, length) *
							(1 - Math.abs(step) / 22);
						sumX += gx * weight;
						sumY += gy * weight;
						sum += weight;
					}
					const blend = smooth(0.55, 0.9, magnitude);
					normalX += (sumX / sum - normalX) * blend;
					normalY += (sumY / sum - normalY) * blend;
				}
				packed[offset] = half(distances[index]!);
				packed[offset + 1] = half(normalX);
				packed[offset + 2] = half(normalY);
				packed[offset + 3] = 0x3c00;
			}
		}
		return packed;
	}

	const SDF_WORKER_SOURCE =
		'async function buildSdfField(E,p,c,z,nn=!1,tn){const x=[],N=c/p,k=(n,e)=>n<0||e<0||n>=p||e>=p?0:E[e*p+n],T=async()=>{if(nn&&await new Promise(n=>setTimeout(n,0)),tn?.aborted)throw new DOMException("SVG preparation was cancelled.","AbortError")},d=new Float64Array(8),D=new Int32Array(4);for(let n=-1;n<p;n++){(n&63)===0&&await T();for(let e=-1;e<p;e++){const t=k(e,n),o=k(e+1,n),s=k(e+1,n+1),a=k(e,n+1);let r=0;if(t>.5!=o>.5&&(d[0]=e+.5+(.5-t)/(o-t),d[1]=n+.5,D[r++]=0),o>.5!=s>.5&&(d[2]=e+1.5,d[3]=n+.5+(.5-o)/(s-o),D[r++]=1),a>.5!=s>.5&&(d[4]=e+.5+(.5-a)/(s-a),d[5]=n+1.5,D[r++]=2),t>.5!=a>.5&&(d[6]=e+.5,d[7]=n+.5+(.5-t)/(a-t),D[r++]=3),!r)continue;const f=(l,i)=>{const m=d[l*2]*N,h=d[l*2+1]*N,g=d[i*2]*N,b=d[i*2+1]*N;(m!==g||h!==b)&&x.push({ax:m,ay:h,bx:g,by:b})};r===2?f(D[0],D[1]):(t-.5)*(s-.5)-(o-.5)*(a-.5)>=0?(f(0,1),f(2,3)):(f(0,3),f(1,2))}}const U=new Float32Array(c*c);if(!x.length)throw new Error("The SVG has no filled silhouette. Use visible paths with opaque fills or strokes.");const V=new Map,j=(n,e)=>n+","+e;for(let n=0;n<x.length;n++){const e=x[n];for(const t of[j(e.ax,e.ay),j(e.bx,e.by)]){const o=V.get(t);o?o.push(n):V.set(t,[n])}}const q=new Uint8Array(x.length),K=[];for(let n=0;n<x.length;n++){if(q[n])continue;const e=x[n],t=[e.ax,e.ay,e.bx,e.by];q[n]=1;let o=e.bx,s=e.by;for(;;){const i=V.get(j(o,s));if(i.length!==2)break;const m=i.find(g=>!q[g]);if(m===void 0)break;q[m]=1;const h=x[m];o===h.ax&&s===h.ay?(o=h.bx,s=h.by):(o=h.ax,s=h.ay),t.push(o,s)}const a=t.length/2,r=new Uint8Array(a),f=[0,a-1];for(r[0]=1,r[a-1]=1;f.length;){const i=f.pop(),m=f.pop(),h=t[m*2],g=t[m*2+1],b=t[i*2]-h,u=t[i*2+1]-g,M=b*b+u*u;let X=.05*.05,A=-1;for(let G=m+1;G<i;G++){const Z=t[G*2]-h,_=t[G*2+1]-g,$=M?Math.max(0,Math.min(1,(Z*b+_*u)/M)):0,S=(Z-$*b)**2+(_-$*u)**2;S>X&&(X=S,A=G)}A>=0&&(r[A]=1,f.push(m,A,A,i))}t[0]===t[t.length-2]&&t[1]===t[t.length-1]&&r.reduce((i,m)=>i+m,0)<4&&r.fill(1);let l=0;for(let i=1;i<a;i++)r[i]&&(K.push({ax:t[l*2],ay:t[l*2+1],bx:t[i*2],by:t[i*2+1]}),l=i)}x.length=0;for(const n of K)x.push(n);V.clear();const O=[];function B(n,e){const t={x0:1/0,y0:1/0,x1:-1/0,y1:-1/0,start:n,end:e,left:-1,right:-1},o=O.push(t)-1;for(let s=n;s<e;s++){const a=x[s];t.x0=Math.min(t.x0,a.ax,a.bx),t.y0=Math.min(t.y0,a.ay,a.by),t.x1=Math.max(t.x1,a.ax,a.bx),t.y1=Math.max(t.y1,a.ay,a.by)}if(e-n>8){const s=t.x1-t.x0>=t.y1-t.y0,a=x.slice(n,e).sort((f,l)=>s?f.ax+f.bx-l.ax-l.bx:f.ay+f.by-l.ay-l.by);for(let f=0;f<a.length;f++)x[n+f]=a[f];const r=n+e>>>1;t.left=B(n,r),t.right=B(r,e)}return o}B(0,x.length);const P=new Int32Array(64);function C(n,e,t){const o=Math.max(n.x0-e,0,e-n.x1),s=Math.max(n.y0-t,0,t-n.y1);return o*o+s*s}function L(n,e,t){const o=n.bx-n.ax,s=n.by-n.ay,a=Math.max(0,Math.min(1,((e-n.ax)*o+(t-n.ay)*s)/(o*o+s*s))),r=e-n.ax-a*o,f=t-n.ay-a*s;return r*r+f*f}let Q=0;for(let n=0;n<c;n++){(n&15)===0&&await T();const e=(n+.5)/N-.5,t=Math.floor(e),o=e-t;for(let s=0;s<c;s++){const a=s+.5,r=n+.5;let f=L(x[Q],a,r),l=1;for(P[0]=0;l;){const b=O[P[--l]];if(!(C(b,a,r)>f))if(b.left<0)for(let u=b.start;u<b.end;u++){const M=L(x[u],a,r);M<f&&(f=M,Q=u)}else{const u=C(O[b.left],a,r),M=C(O[b.right],a,r);u<M?(M<=f&&(P[l++]=b.right),u<=f&&(P[l++]=b.left)):(u<=f&&(P[l++]=b.left),M<=f&&(P[l++]=b.right))}}const i=a/N-.5,m=Math.floor(i),h=i-m,g=(k(m,t)*(1-h)+k(m+1,t)*h)*(1-o)+(k(m,t+1)*(1-h)+k(m+1,t+1)*h)*o;U[n*c+s]=Math.sqrt(f)/c*(g>.5?-1:1)}}if(!z)return U;const Y=new Uint16Array(U.length*4),R=new Uint32Array(1),en=new Float32Array(R.buffer);function H(n){en[0]=n;const e=R[0],t=e>>>16&32768,o=(e>>>23&255)-112;let s=e&8388607;return o<=0?o<-10?t:(s=(s|8388608)>>>1-o,t|s+4095+(s>>>13&1)>>>13):t|(o<<10)+(s+4095+(s>>>13&1)>>>13)}const y=new Float32Array(U.length*4),v=Math.max(2,Math.round(c*.005)),on=Math.max(1,Math.round(v*.5)),w=(n,e)=>U[Math.max(0,Math.min(c-1,e))*c+Math.max(0,Math.min(c-1,n))];let F=0,I=0;function W(n,e,t){const o=w(n-t,e-t),s=w(n-t,e),a=w(n-t,e+t),r=w(n,e-t),f=w(n,e+t),l=w(n+t,e-t),i=w(n+t,e),m=w(n+t,e+t);F=(m+2*i+l-a-2*s-o)*c/(8*t),I=(a+2*f+m-o-2*r-l)*c/(8*t)}for(let n=0;n<c;n++){(n&31)===0&&await T();for(let e=0;e<c;e++){const t=n*c+e,o=t*4;if(U[t]>.04)continue;W(e,n,on);const s=F,a=I;W(e,n,v),y[o]=s*.35+F*.65,y[o+1]=a*.35+I*.65,y[o+2]=(w(e+v,n)-w(e-v,n))*c/(2*v),y[o+3]=(w(e,n+v)-w(e,n-v))*c/(2*v)}}function sn(n,e){const t=Math.max(0,Math.min(c-1,n)),o=Math.max(0,Math.min(c-1,e)),s=Math.floor(t),a=Math.floor(o),r=t-s,f=o-a,l=(a*c+s)*4+2,i=(a*c+Math.min(c-1,s+1))*4+2,m=(Math.min(c-1,a+1)*c+s)*4+2,h=(Math.min(c-1,a+1)*c+Math.min(c-1,s+1))*4+2;F=(y[l]*(1-r)+y[i]*r)*(1-f)+(y[m]*(1-r)+y[h]*r)*f,I=(y[l+1]*(1-r)+y[i+1]*r)*(1-f)+(y[m+1]*(1-r)+y[h+1]*r)*f}function J(n,e,t){const o=Math.max(0,Math.min(1,(t-n)/(e-n)));return o*o*(3-2*o)}const an=[-15.5,-11.5,-7.5,-3.5,3.5,7.5,11.5,15.5];for(let n=0;n<c;n++){(n&15)===0&&await T();for(let e=0;e<c;e++){const t=n*c+e,o=t*4,s=y[o],a=y[o+1],r=Math.sqrt(s*s+a*a);let f=s,l=a;if(r>1e-4){const i=s/r,m=a/r;let h=s,g=a,b=1;for(const M of an){sn(e-m*M,n+i*M);const X=Math.sqrt(F*F+I*I);if(X<1e-4)continue;const A=J(.94,.985,(F*i+I*m)/X)*J(.2,.55,X)*(1-Math.abs(M)/22);h+=F*A,g+=I*A,b+=A}const u=J(.55,.9,r);f+=(h/b-f)*u,l+=(g/b-l)*u}Y[o]=H(U[t]),Y[o+1]=H(f),Y[o+2]=H(l),Y[o+3]=15360}}return Y}self.onmessage=async({data:E})=>{try{const p=await buildSdfField(E.coverage,E.size,E.targetSize,E.gradient);self.postMessage({data:p},[p.buffer])}catch(p){self.postMessage({error:p instanceof Error?p.message:String(p)})}};\n';

	function prepareSdfField(
		coverage: Float32Array,
		size: number,
		signal?: AbortSignal
	): Promise<Float32Array | Uint16Array> {
		if (signal?.aborted)
			return Promise.reject(new DOMException("SVG preparation was cancelled.", "AbortError"));
		let worker: Worker;
		let url: string;
		try {
			url = URL.createObjectURL(new Blob([SDF_WORKER_SOURCE], { type: "text/javascript" }));
			try {
				worker = new Worker(url);
			} finally {
				URL.revokeObjectURL(url);
			}
		} catch {
			return buildSdfField(coverage, size, SDF_SIZE, SDF_WITH_GRADIENT, true, signal);
		}
		return new Promise((resolve, reject) => {
			const cleanup = () => {
				worker.terminate();
				signal?.removeEventListener("abort", abort);
			};
			const abort = () => {
				cleanup();
				reject(new DOMException("SVG preparation was cancelled.", "AbortError"));
			};
			signal?.addEventListener("abort", abort, { once: true });
			worker.onmessage = ({ data }) => {
				cleanup();
				if (data.error) reject(new Error(data.error));
				else resolve(data.data as Float32Array | Uint16Array);
			};
			worker.onerror = () => {
				cleanup();
				void buildSdfField(coverage, size, SDF_SIZE, SDF_WITH_GRADIENT, true, signal).then(
					resolve,
					reject
				);
			};
			// Keep coverage available for the CSP fallback; it is released after preparation.
			worker.postMessage({ coverage, size, targetSize: SDF_SIZE, gradient: SDF_WITH_GRADIENT });
		});
	}

	async function buildSvgSdf(source: string, signal?: AbortSignal): Promise<SvgSdf> {
		const image = await loadSvg(source, signal);
		// Bound transient canvas memory even for the largest descriptor settings.
		const rasterSize = Math.min(SDF_SIZE * SDF_RASTER_SUPERSAMPLE, 4096);
		const raster = rasterizeSvgAlpha(image, rasterSize);
		const data = await prepareSdfField(raster.coverage, raster.size, signal);
		return { data, width: SDF_SIZE, height: SDF_SIZE };
	}

	async function mountSceneController(
		target: HTMLElement,
		options: SceneMountOptions = {}
	): Promise<ShaderController> {
		let destroyed = options.signal?.aborted ?? false;
		let cleanedUp = false;
		let paused = options.paused ?? false;
		let maxDpr = clampNumber(options.maxDpr ?? 2, 1, 3, 0.1);
		let resolutionScale = clampNumber(options.resolutionScale ?? 1, 0.25, 1, 0.05);
		let hidden = document.hidden;
		let intersecting = true;
		let interactive = options.interactive ?? true;
		let sourceToken = 0;
		let sourceAbort = new AbortController();
		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
		let values = normalizeValues(options.values ?? {});
		const mountCleanup: { destroy: () => void } = { destroy: () => undefined };
		const rendererResolution = () =>
			Math.min(window.devicePixelRatio || 1, maxDpr) * resolutionScale;
		const abortMount = () => {
			destroyed = true;
			sourceAbort.abort();
			mountCleanup.destroy();
		};
		options.signal?.addEventListener("abort", abortMount, { once: true });
		if (destroyed) {
			options.signal?.removeEventListener("abort", abortMount);
			throw new Error("Shader mount was cancelled.");
		}

		let initialSdf: SvgSdf;
		try {
			initialSdf = await buildSvgSdf(values.svgSource, sourceAbort.signal);
			if (destroyed) throw new Error("Shader mount was cancelled.");
		} catch (error) {
			options.signal?.removeEventListener("abort", abortMount);
			if (destroyed) throw error;
			const reason = errorMessage(error);
			options.onStatus?.({ state: "error", reason });
			throw new Error(reason, { cause: error });
		}

		const createScene = async (preference: ShaderBackend) => {
			const app = new Application();
			const cleanup: Array<() => void> = [() => app.destroy(true, { children: true })];
			try {
				await app.init({
					preference,
					preferWebGLVersion: 2,
					powerPreference: "high-performance",
					autoStart: false,
					autoDensity: true,
					antialias: true,
					backgroundAlpha: 0,
					width: 1,
					height: 1,
					resolution: 1
				});

				cleanup.push(installLinearOutput(app, false));
				const backend =
					app.renderer.type === RendererType.WEBGPU
						? ("webgpu" as const)
						: app.renderer.type === RendererType.WEBGL
							? ("webgl" as const)
							: undefined;
				if (!backend || (preference === "webgl" && backend !== "webgl")) {
					throw new Error("PixiJS initialized an unexpected renderer: " + app.renderer.type + ".");
				}
				if (destroyed) throw new Error("Shader mount was cancelled.");

				if ("gl" in app.renderer) app.renderer.gl.pixelStorei(app.renderer.gl.UNPACK_ALIGNMENT, 1);

				let legendsTexture: Texture | undefined;
				let legendsFont: TextFontLease | undefined;
				let legendRequest: AbortController | undefined;
				let legendKey = "";
				let bindLegends = () => {};
				let legendDisposed = false;
				const abortLegends = () => legendRequest?.abort();
				options.signal?.addEventListener("abort", abortLegends);
				cleanup.push(() => {
					legendDisposed = true;
					abortLegends();
					options.signal?.removeEventListener("abort", abortLegends);
					legendsTexture?.destroy(true);
					legendsFont?.release();
				});
				const prepareLegends = async () => {
					const font = normalizeTextFont(values.fontUrl);
					const legendScale = values.legendScale;
					const letterSpacing = values.letterSpacing;
					const key = JSON.stringify([font, legendScale, letterSpacing]);
					if (key === legendKey && !legendRequest) return;
					legendRequest?.abort();
					const request = new AbortController();
					legendRequest = request;
					let lease: TextFontLease | undefined;
					let texture: Texture | undefined;
					try {
						lease = await acquireTextFont(font, request.signal, target.ownerDocument);
						if (request.signal.aborted || destroyed || legendDisposed) throw textAbortError();
						texture = rasterizeKeyboardLegends(
							lease.family,
							legendScale,
							letterSpacing,
							rendererTextureLimits(app.renderer),
							target.ownerDocument
						);
						if (request.signal.aborted || destroyed || legendDisposed) throw textAbortError();
						const oldTexture = legendsTexture,
							oldFont = legendsFont;
						legendsTexture = texture;
						legendsFont = lease;
						texture = undefined;
						lease = undefined;
						legendKey = key;
						bindLegends();
						oldTexture?.destroy(true);
						oldFont?.release();
					} finally {
						texture?.destroy(true);
						lease?.release();
						if (legendRequest === request) legendRequest = undefined;
					}
				};
				await prepareLegends();
				if (destroyed || !legendsTexture) throw textAbortError();
				const sdfSource = new BufferImageSource({
					resource: initialSdf.data,
					width: initialSdf.width,
					height: initialSdf.height,
					format: "rgba16float",
					alphaMode: "no-premultiply-alpha",
					scaleMode: "nearest",
					addressMode: "clamp-to-edge",
					autoGenerateMipmaps: false
				});
				const sdfTexture = new Texture({ source: sdfSource });
				cleanup.push(() => sdfTexture.destroy(true));
				const geometry = new Geometry({
					attributes: {
						aPosition: [0, 0, 1, 0, 1, 1, 0, 1],
						aUV: [0, 0, 1, 0, 1, 1, 0, 1]
					},
					indexBuffer: [0, 1, 2, 0, 2, 3]
				});
				cleanup.push(() => geometry.destroy(true));
				const shader = Shader.from({
					gl: { vertex: WEBGL_VERTEX, fragment: WEBGL_FRAGMENT },
					gpu: {
						vertex: { source: WEBGPU_SOURCE, entryPoint: "mainVertex" },
						fragment: { source: WEBGPU_SOURCE, entryPoint: "mainFragment" },
						gpuLayout: [
							[
								{
									binding: 0,
									visibility: ShaderStage.VERTEX | ShaderStage.FRAGMENT,
									buffer: { type: "uniform" }
								}
							],
							[
								{
									binding: 0,
									visibility: ShaderStage.VERTEX | ShaderStage.FRAGMENT,
									buffer: { type: "uniform" }
								}
							],
							[
								{
									binding: 0,
									visibility: ShaderStage.VERTEX | ShaderStage.FRAGMENT,
									buffer: { type: "uniform" }
								},
								{
									binding: 1,
									visibility: ShaderStage.VERTEX | ShaderStage.FRAGMENT,
									texture: {
										sampleType: "unfilterable-float",
										viewDimension: "2d",
										multisampled: false
									}
								},
								{
									binding: 2,
									visibility: ShaderStage.FRAGMENT,
									texture: { sampleType: "float", viewDimension: "2d", multisampled: false }
								}
							]
						]
					},
					resources: {
						keycapLogoUniforms: createUniformResources(),
						uSdf: sdfTexture.source,
						uLegends: legendsTexture.source
					}
				});
				bindLegends = () => {
					if (legendsTexture) shader.resources["uLegends"] = legendsTexture.source;
				};
				cleanup.push(() => shader.destroy());
				const mesh = new Mesh({ geometry, shader });
				mesh.blendMode = "normal";
				const uniformGroup = shader.resources["keycapLogoUniforms"] as {
					uniforms: Record<string, unknown>;
				};
				applyValues(uniformGroup.uniforms, values);
				const displayMesh = mesh;
				const renderSource = () => undefined;
				const renderFrame = () => {
					renderSource();
					app.render();
				};
				app.stage.addChild(displayMesh);
				cleanup.push(() => app.stage.removeChild(displayMesh));
				app.canvas.setAttribute("aria-hidden", "true");
				app.canvas.style.position = "absolute";
				app.canvas.style.inset = "0";
				app.canvas.style.display = "block";
				app.canvas.style.width = "100%";
				app.canvas.style.height = "100%";
				target.append(app.canvas);

				let invalidate = () => renderFrame();
				let syncKeyControls = () => {};
				const resize = () => {
					const size = resizeRenderer(app, target, rendererResolution(), RENDER_PIXEL_BUDGET);
					if (!size?.changed) return;
					const { width, height } = size;
					mesh.width = width;
					mesh.height = height;
					syncRenderMetrics(uniformGroup.uniforms, width, height, app.renderer.resolution);

					syncKeyControls();
					invalidate();
				};
				const resizeObserver = new ResizeObserver(resize);
				resizeObserver.observe(target);
				cleanup.push(() => resizeObserver.disconnect());
				cleanup.push(observePixelRatio(resize));
				resize();

				const keyGeometry = {
					fontInput: "fontUrl",
					legendScaleParameter: "legendScale",
					letterSpacingParameter: "letterSpacing",
					scaleParameter: "scale",
					offsetXParameter: "offsetX",
					offsetYParameter: "offsetY",
					panXParameter: "panX",
					panYParameter: "panY",
					pitch: 2.04,
					rowStagger: 0.25,
					staggerPeriod: 3,
					plateHeight: 0.02,
					halfSize: 0.94,
					cornerRadius: 0.18,
					bevel: 0.045,
					top: 0.24,
					bottom: -0.06,
					travel: 0.1,
					yaw: -0.32,
					elevation: 1.06,
					targetY: 0.1,
					viewSpan: 2.8
				};
				const explicitKeys:
					| Array<{
							id: string;
							label: string;
							row: number;
							column: number;
							center: [number, number];
							size: [number, number];
							logo?: boolean;
					  }>
					| undefined = KEYBOARD_LAYOUT.keys;
				let pressedColumn = 999;
				let pressedRow = 999;
				let keyPress = 0;
				let keyTarget = 0;
				let heldPointer: number | undefined;
				let heldKeyboard = false;
				const keyControls = document.createElement("div");
				keyControls.setAttribute("role", "group");
				keyControls.setAttribute("aria-label", "Interactive keys");
				keyControls.style.cssText = "position:absolute;inset:0;pointer-events:none;";
				target.append(keyControls);
				cleanup.push(() => keyControls.remove());
				const writeKeyUniforms = () => {
					uniformGroup.uniforms["uPressedKey"] = [pressedColumn, pressedRow];
					uniformGroup.uniforms["uPress"] = keyPress;
				};
				const releaseKey = () => {
					heldPointer = undefined;
					heldKeyboard = false;
					keyTarget = 0;
					if (reducedMotion.matches || paused || !interactive) keyPress = 0;
					writeKeyUniforms();
					invalidate();
				};
				const pressKey = (column: number, row: number, source: ShaderKeyPress["source"]) => {
					if (!interactive || paused || destroyed) return;
					if (column !== pressedColumn || row !== pressedRow) keyPress = 0;
					pressedColumn = column;
					pressedRow = row;
					keyTarget = 1;
					if (reducedMotion.matches) keyPress = 1;
					writeKeyUniforms();
					invalidate();
					// Keep this in the native activation task: consumers may unlock audio here.
					options.onKeyPress?.({
						keyId:
							explicitKeys?.find((key) => key.column === column && key.row === row)?.id ??
							column + ":" + row,
						column,
						row,
						source
					});
				};
				const keyAxes = () => {
					const sy = Math.sin(keyGeometry.yaw),
						cy = Math.cos(keyGeometry.yaw);
					const sp = Math.sin(keyGeometry.elevation),
						cp = Math.cos(keyGeometry.elevation);
					return {
						direction: [-sy * cp, -sp, -cy * cp],
						right: [cy, 0, -sy],
						up: [-sy * sp, cp, -cy * sp]
					};
				};
				const keyRowShift = (row: number) =>
					(row - Math.floor(row / keyGeometry.staggerPeriod) * keyGeometry.staggerPeriod) *
					keyGeometry.rowStagger *
					keyGeometry.pitch;
				const keyDistance = (x: number, y: number, z: number) => {
					if (explicitKeys) {
						let hit = { distance: Number.POSITIVE_INFINITY, column: 0, row: 0 };
						for (const key of explicitKeys) {
							const radius = Math.min(keyGeometry.cornerRadius, key.size[0] / 2, key.size[1] / 2);
							const qx = Math.abs(x - key.center[0]) - key.size[0] / 2 + radius;
							const qz = Math.abs(z - key.center[1]) - key.size[1] / 2 + radius;
							const outline =
								Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) +
								Math.min(Math.max(qx, qz), 0) -
								radius;
							const depression =
								key.column === pressedColumn && key.row === pressedRow
									? keyPress * keyGeometry.travel
									: 0;
							const q0 = outline + keyGeometry.bevel;
							const q1 =
								Math.abs(y + depression - (keyGeometry.top + keyGeometry.bottom) * 0.5) -
								(keyGeometry.top - keyGeometry.bottom) * 0.5 +
								keyGeometry.bevel;
							const distance =
								Math.hypot(Math.max(q0, 0), Math.max(q1, 0)) +
								Math.min(Math.max(q0, q1), 0) -
								keyGeometry.bevel;
							if (distance < hit.distance) hit = { distance, column: key.column, row: key.row };
						}
						return hit;
					}
					const nearestRow = Math.floor(z / keyGeometry.pitch + 0.5);
					let hit = { distance: Number.POSITIVE_INFINITY, column: 0, row: 0 };
					// A staggered row can place a neighbor closer than the nearest row's cap.
					for (let row = nearestRow - 1; row <= nearestRow + 1; row++) {
						const shift = keyRowShift(row);
						const column = Math.floor((x - shift) / keyGeometry.pitch + 0.5);
						const qx =
							Math.abs(x - column * keyGeometry.pitch - shift) -
							keyGeometry.halfSize +
							keyGeometry.cornerRadius;
						const qz =
							Math.abs(z - row * keyGeometry.pitch) -
							keyGeometry.halfSize +
							keyGeometry.cornerRadius;
						const outline =
							Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) +
							Math.min(Math.max(qx, qz), 0) -
							keyGeometry.cornerRadius;
						const depression =
							column === pressedColumn && row === pressedRow ? keyPress * keyGeometry.travel : 0;
						const q0 = outline + keyGeometry.bevel;
						const q1 =
							Math.abs(y + depression - (keyGeometry.top + keyGeometry.bottom) * 0.5) -
							(keyGeometry.top - keyGeometry.bottom) * 0.5 +
							keyGeometry.bevel;
						const distance =
							Math.hypot(Math.max(q0, 0), Math.max(q1, 0)) +
							Math.min(Math.max(q0, q1), 0) -
							keyGeometry.bevel;
						if (distance < hit.distance) hit = { distance, column, row };
					}
					return hit;
				};
				const pickKey = (event: PointerEvent): { column: number; row: number } | undefined => {
					const rect = app.canvas.getBoundingClientRect();
					if (!rect.width || !rect.height) return;
					const u = (event.clientX - rect.left) / rect.width;
					const v = (event.clientY - rect.top) / rect.height;
					if (u < 0 || u > 1 || v < 0 || v > 1) return;
					const { direction: d, right: r, up } = keyAxes();
					const span = keyGeometry.viewSpan / values.scale;
					const sx = (((u - 0.5 - values.offsetX) * rect.width) / rect.height) * span + values.panX;
					const sy = (0.5 + values.offsetY - v) * span + values.panY;
					const origin = [
						r[0]! * sx + up[0]! * sy - d[0]! * 5,
						keyGeometry.targetY + up[1]! * sy - d[1]! * 5,
						r[2]! * sx + up[2]! * sy - d[2]! * 5
					];
					let t = Math.max(0, (keyGeometry.top - origin[1]!) / d[1]!);
					const end = (0.02 - origin[1]!) / d[1]!;
					for (let index = 0; index < 112 && t <= end; index++) {
						const hit = keyDistance(
							origin[0]! + d[0]! * t,
							origin[1]! + d[1]! * t,
							origin[2]! + d[2]! * t
						);
						if (hit.distance < 0.0003) return hit;
						t += Math.max(hit.distance * 0.8, 0.0001);
					}
					return undefined;
				};
				const pointerDown = (event: PointerEvent) => {
					if (
						event.button !== 0 ||
						!event.isPrimary ||
						!interactive ||
						paused ||
						heldPointer !== undefined
					)
						return;
					const hit = pickKey(event);
					if (!hit) return;
					heldPointer = event.pointerId;
					try {
						app.canvas.setPointerCapture(event.pointerId);
					} catch {
						/* Synthetic events need no capture. */
					}
					pressKey(hit.column, hit.row, "pointer");
				};
				const pointerUp = (event: PointerEvent) => {
					if (event.pointerId !== heldPointer) return;
					if (app.canvas.hasPointerCapture(event.pointerId))
						app.canvas.releasePointerCapture(event.pointerId);
					releaseKey();
				};
				app.canvas.addEventListener("pointerdown", pointerDown);
				window.addEventListener("pointerup", pointerUp);
				window.addEventListener("pointercancel", pointerUp);
				app.canvas.addEventListener("lostpointercapture", pointerUp);
				window.addEventListener("blur", releaseKey);
				cleanup.push(() => {
					app.canvas.removeEventListener("pointerdown", pointerDown);
					window.removeEventListener("pointerup", pointerUp);
					window.removeEventListener("pointercancel", pointerUp);
					app.canvas.removeEventListener("lostpointercapture", pointerUp);
					window.removeEventListener("blur", releaseKey);
				});
				let keyControlSignature = "";
				syncKeyControls = () => {
					const width = target.clientWidth,
						height = target.clientHeight;
					const signature = [
						width,
						height,
						values.scale,
						values.offsetX,
						values.offsetY,
						values.panX,
						values.panY
					].join(":");
					if (signature !== keyControlSignature) {
						keyControlSignature = signature;
						const previousFocus = (document.activeElement as HTMLElement | null)?.dataset?.[
							"shaderKey"
						];
						keyControls.replaceChildren();
						if (width && height) {
							const { right: r, up } = keyAxes();
							const span = keyGeometry.viewSpan / values.scale;
							const radius = Math.ceil(
								(span * Math.max(1, width / height) * (1 + Math.abs(values.offsetX)) + 2) /
									keyGeometry.pitch
							);
							const candidates: Array<{
								column: number;
								row: number;
								x: number;
								y: number;
								id: string;
								label: string;
							}> = [];
							const placeKey = (key: {
								column: number;
								row: number;
								center: [number, number];
								id: string;
								label: string;
							}) => {
								const [x, z] = key.center;
								const u =
									0.5 +
									values.offsetX +
									(x * r[0]! + z * r[2]! - values.panX) / span / (width / height);
								const v =
									0.5 +
									values.offsetY -
									(x * up[0]! +
										(keyGeometry.top - keyGeometry.targetY) * up[1]! +
										z * up[2]! -
										values.panY) /
										span;
								if (u > 0.015 && u < 0.985 && v > 0.015 && v < 0.985)
									candidates.push({
										column: key.column,
										row: key.row,
										x: u * width,
										y: v * height,
										id: key.id,
										label: key.label
									});
							};
							if (explicitKeys) {
								for (const key of explicitKeys) placeKey(key);
							} else
								for (let row = -radius; row <= radius; row++)
									for (let column = -radius; column <= radius; column++) {
										placeKey({
											column,
											row,
											center: [
												column * keyGeometry.pitch + keyRowShift(row),
												row * keyGeometry.pitch
											],
											id: column + ":" + row,
											label:
												column === 0 && row === 0
													? "Logo key"
													: "Key column " + column + ", row " + row
										});
									}
							candidates.sort((a, b) => (Math.abs(a.y - b.y) > 20 ? a.y - b.y : a.x - b.x));
							for (const key of candidates) {
								const button = document.createElement("button");
								button.type = "button";
								button.dataset["shaderKey"] = key.id;
								button.setAttribute("aria-label", key.label);
								button.style.cssText =
									"position:absolute;width:44px;height:44px;transform:translate(-50%,-50%);padding:0;border:0;border-radius:6px;background:transparent;pointer-events:none;opacity:0;outline:2px solid Highlight;outline-offset:3px;box-shadow:0 0 0 4px Canvas;";
								button.style.left = key.x + "px";
								button.style.top = key.y + "px";
								button.addEventListener("focus", () => {
									button.style.opacity = "1";
								});
								button.addEventListener("blur", () => {
									button.style.opacity = "0";
									if (heldKeyboard) releaseKey();
								});
								button.addEventListener("keydown", (event) => {
									if (event.key !== "Enter" && event.key !== " ") return;
									event.preventDefault();
									if (event.repeat || heldKeyboard || !interactive || paused) return;
									heldKeyboard = true;
									pressKey(key.column, key.row, "keyboard");
								});
								button.addEventListener("keyup", (event) => {
									if (event.key !== "Enter" && event.key !== " ") return;
									event.preventDefault();
									if (heldKeyboard) releaseKey();
								});
								button.addEventListener("click", (event) => {
									if (event.detail !== 0 || heldKeyboard) return;
									pressKey(key.column, key.row, "assistive");
									releaseKey();
								});
								keyControls.append(button);
							}
						}
						if (previousFocus)
							Array.from(keyControls.querySelectorAll("button"))
								.find((button) => button.dataset["shaderKey"] === previousFocus)
								?.focus();
					}
					for (const button of keyControls.querySelectorAll("button"))
						button.disabled = !interactive || paused;
				};
				syncKeyControls();
				const settleKeys = () => {
					keyPress = keyTarget;
					writeKeyUniforms();
					invalidate();
				};
				const resetKeys = () => {
					releaseKey();
					keyPress = 0;
					writeKeyUniforms();
				};
				const syncKeys = () => {
					if (!interactive || paused) resetKeys();
					syncKeyControls();
				};
				const updateKeys = (elapsed: number) => {
					keyPress = dampValue(keyPress, keyTarget, keyTarget ? 38 : 22, elapsed);
					writeKeyUniforms();
				};
				const loop = createRenderLoop(app, {
					visible: () =>
						!destroyed &&
						!hidden &&
						intersecting &&
						target.clientWidth > 0 &&
						target.clientHeight > 0,
					animated: () => !paused && !reducedMotion.matches,
					active: () => keyPress !== keyTarget,
					update: (elapsed) => {
						uniformGroup.uniforms["uTime"] = (uniformGroup.uniforms["uTime"] as number) + elapsed;

						updateKeys(elapsed);
					},
					render: renderFrame
				});
				invalidate = loop.invalidate;
				cleanup.push(() => loop.destroy());

				return {
					app,
					loop,
					uniforms: uniformGroup.uniforms,

					sdfSource,
					resize,
					render: renderFrame,
					prepareLegends,
					syncKeys,
					resetKeys,
					settleKeys,
					syncKeyControls,
					backend,
					destroy: () => runCleanup(cleanup)
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
				options.onRendererLost
			);
		} catch (error) {
			options.signal?.removeEventListener("abort", abortMount);
			throw error;
		}

		const updateSource = async (source: string) => {
			const token = ++sourceToken;
			sourceAbort.abort();
			sourceAbort = new AbortController();
			try {
				const sdf = await buildSvgSdf(source, sourceAbort.signal);
				if (destroyed || token !== sourceToken) return;
				(scene.sdfSource.resource as Float32Array | Uint16Array).set(sdf.data);
				scene.sdfSource.emit("update", scene.sdfSource);
				scene.loop.invalidate();
			} catch (error) {
				if (destroyed || token !== sourceToken) return;
				options.onStatus?.({ state: "error", reason: errorMessage(error) });
			}
		};

		const syncPlayback = () => {
			if (destroyed) return;
			scene.loop.sync();
		};
		const handleVisibility = () => {
			hidden = document.hidden;
			if (hidden) scene.resetKeys();
			syncPlayback();
		};
		const handleReducedMotion = () => {
			if (reducedMotion.matches) scene.settleKeys();

			syncPlayback();
			scene.loop.invalidate();
		};
		const intersectionObserver = new IntersectionObserver(
			([entry]) => {
				intersecting = entry?.isIntersecting ?? false;
				syncPlayback();
			},
			{ rootMargin: "100px" }
		);
		intersectionObserver.observe(target);
		document.addEventListener("visibilitychange", handleVisibility);
		reducedMotion.addEventListener("change", handleReducedMotion);
		syncPlayback();

		const destroy = () => {
			if (cleanedUp) return;
			cleanedUp = true;
			destroyed = true;
			sourceToken += 1;
			sourceAbort.abort();
			intersectionObserver.disconnect();
			document.removeEventListener("visibilitychange", handleVisibility);
			reducedMotion.removeEventListener("change", handleReducedMotion);
			options.signal?.removeEventListener("abort", abortMount);
			scene.destroy();
		};
		const controller: ShaderController = {
			update(nextValues) {
				if (destroyed) return;
				const previousSource = values.svgSource;
				const previousFont = JSON.stringify([
					values.fontUrl,
					values.legendScale,
					values.letterSpacing
				]);

				values = normalizeValues({ ...values, ...nextValues });
				applyValues(scene.uniforms, values);

				if (values.svgSource !== previousSource) void updateSource(values.svgSource);
				if (
					JSON.stringify([values.fontUrl, values.legendScale, values.letterSpacing]) !==
					previousFont
				)
					void scene
						.prepareLegends()
						.then(() => {
							if (!destroyed) scene.loop.invalidate();
						})
						.catch((error: unknown) => {
							if (!destroyed && !(error instanceof Error && error.name === "AbortError"))
								options.onStatus?.({ state: "error", reason: errorMessage(error) });
						});

				scene.syncKeyControls();
				scene.loop.invalidate();
			},
			setPaused(nextPaused) {
				if (destroyed) return;
				paused = nextPaused;
				scene.syncKeys();
				syncPlayback();
			},
			setInteractive(nextInteractive) {
				if (destroyed) return;
				interactive = nextInteractive;
				scene.syncKeys();
				scene.loop.invalidate();
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
				values = normalizeValues({
					...DEFAULT_VALUES,
					svgSource: values.svgSource,
					fontUrl: values.fontUrl
				});
				applyValues(scene.uniforms, values);

				scene.uniforms["uTime"] = 0;

				scene.resetKeys();
				scene.syncKeyControls();
				scene.loop.invalidate();
			},
			resize() {
				if (!destroyed) scene.resize();
			},
			destroy
		};
		mountCleanup.destroy = destroy;
		if (destroyed) {
			destroy();
			throw new Error("Shader mount was cancelled.");
		}
		return controller;
	}

	type Props = Omit<HTMLAttributes<HTMLDivElement>, "color"> & {
		/** SVG engraved into both Command keys. Supply inline SVG, a URL or a data URL. */
		svgSource: string;
		/** Font URL or font source object for the keyboard legends, prepared through Godsend's shared text pipeline. */
		fontUrl: string | ShaderFontSource;
		/** Key size relative to the canvas height. @default 1.25 */
		scale?: number;
		/** Position of the logo key as a fraction of the canvas width. @default 0.08 */
		offsetX?: number;
		/** Vertical position of the keyboard within the canvas. Combine with Scene scale to inspect the whole layout. @default 0 */
		offsetY?: number;
		/** Move the camera across the full keyboard in scene units, independently of zoom. Both Command keys and the arrow cluster remain reachable. @default 0 */
		panX?: number;
		/** Move the camera up or down the full keyboard in scene units, independently of zoom. @default 0 */
		panY?: number;
		/** Size of the polished engraving on the center key. @default 0.95 */
		logoScale?: number;
		/** Scale the key letters, modifier labels and function symbols while preserving their individual anchors. Independent of logo and camera scale. @default 1 */
		legendScale?: number;
		/** Extra space between characters, measured in em. Preserves each key legend's anchor and leaves function symbols unchanged. @default 0 */
		letterSpacing?: number;
		/** Recessed plate between keys. Bind to --background. @default "#202A2D" */
		backgroundColor?: string;
		/** Matte molded keycaps. Bind to --card or --muted. @default "#273438" */
		keyColor?: string;
		/** Polished inset logo symbols on both Command keys. Bind to --primary. @default "#ACB7AE" */
		logoColor?: string;
		/** Letters, modifier labels and function symbols on the other keys. Bind to --primary-foreground. @default "#ACB7AE" */
		legendColor?: string;
		/** Softness of the molded plastic reflections; the engraving retains its polished finish. @default 0.55 */
		roughness?: number;
		/** Horizontal angle of the main softbox in degrees. Rotates its highlights and cast shadows together. @default -150.255119 */
		lightAngle?: number;
		/** Height angle of the main softbox in degrees. Lower angles emphasize grain and cast longer shadows. @default 51.123345 */
		lightElevation?: number;
		/** Brightness of the main softbox, including diffuse light and its reflection. Zero switches it off. @default 1 */
		lightIntensity?: number;
		/** Size of the main softbox. Larger values broaden reflections and soften cast shadows. @default 1 */
		lightSize?: number;
		/** Tint of the main softbox, independent of the key material colors. @default "#FFFFFF" */
		lightColor?: string;
		/** Rotation of the studio fill and the glossy inlay reflection around the keyboard, in degrees. @default 0 */
		environmentRotation?: number;
		/** Strength of ambient fill and studio reflections, including the glossy inlay. Zero removes environment lighting. @default 1 */
		environmentIntensity?: number;
		/** Linear brightness multiplier applied after lighting the scene. @default 1 */
		exposure?: number;
		/** Stops rendering while preserving the current frame. @default false */
		paused?: boolean;
		/** Press a key with a pointer or keyboard. onKeyPress runs synchronously for actions or audio. @default true */
		interactive?: boolean;
		/** Maximum device-pixel ratio used by the renderer. @default 2 */
		maxDpr?: number;
		/** GPU resolution multiplier that does not affect layout. @default 1 */
		resolutionScale?: number;
		/** Called synchronously on key activation; safe for starting user-initiated audio. */
		onKeyPress?: (event: ShaderKeyPress) => void;
		onReady?: (backend: ShaderBackend) => void;
		onRendererChange?: (backend: ShaderBackend, reason: string) => void;
		onError?: (error: Error) => void;
	};

	let {
		class: className,
		svgSource,
		fontUrl,
		scale = 1.25,
		offsetX = 0.08,
		offsetY = 0,
		panX = 0,
		panY = 0,
		logoScale = 0.95,
		legendScale = 1,
		letterSpacing = 0,
		backgroundColor = "#202A2D",
		keyColor = "#273438",
		logoColor = "#ACB7AE",
		legendColor = "#ACB7AE",
		roughness = 0.55,
		lightAngle = -150.255119,
		lightElevation = 51.123345,
		lightIntensity = 1,
		lightSize = 1,
		lightColor = "#FFFFFF",
		environmentRotation = 0,
		environmentIntensity = 1,
		exposure = 1,
		paused = false,
		interactive = true,
		maxDpr = 2,
		resolutionScale = 1,
		onKeyPress,
		onReady,
		onRendererChange,
		onError,
		...rest
	}: Props = $props();

	let root: HTMLDivElement;
	let controller: ShaderController | undefined;

	function currentValues(): ShaderValues {
		return {
			svgSource: svgSource,
			fontUrl: fontUrl,
			scale: scale,
			offsetX: offsetX,
			offsetY: offsetY,
			panX: panX,
			panY: panY,
			logoScale: logoScale,
			legendScale: legendScale,
			letterSpacing: letterSpacing,
			backgroundColor: backgroundColor,
			keyColor: keyColor,
			logoColor: logoColor,
			legendColor: legendColor,
			roughness: roughness,
			lightAngle: lightAngle,
			lightElevation: lightElevation,
			lightIntensity: lightIntensity,
			lightSize: lightSize,
			lightColor: lightColor,
			environmentRotation: environmentRotation,
			environmentIntensity: environmentIntensity,
			exposure: exposure
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
		const nextInteractive = interactive;
		controller?.setInteractive(nextInteractive);
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
			interactive,
			maxDpr,
			resolutionScale,
			signal: abortController.signal,
			onKeyPress: (event) => onKeyPress?.(event),
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
			}
		})
			.then((instance) => {
				if (cancelled) instance.destroy();
				else {
					controller = instance;
					controller.update(currentValues());
					controller.setPaused(paused);
					controller.setInteractive(interactive);
					controller.setQuality(maxDpr, resolutionScale);
				}
			})
			.catch((error: unknown) => {
				if (!cancelled && !errorReported)
					onError?.(error instanceof Error ? error : new Error(String(error)));
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
