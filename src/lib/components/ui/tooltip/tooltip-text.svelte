<script lang="ts">
  let { text, states = [] }: { text: string; states?: readonly string[] } = $props();

  const labels = $derived([...new Set([...states, text])]);
  const activeIndex = $derived(labels.indexOf(text));

  function animateWidth(node: HTMLElement, _text: string) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const readWidth = () => parseFloat(getComputedStyle(node).width);
    let previousWidth = readWidth();
    let animation: Animation | undefined;
    let activeLabel: HTMLElement | null = null;

    function finish() {
      animation?.cancel();
      animation = undefined;
      activeLabel?.style.removeProperty("width");
      activeLabel = null;
      previousWidth = readWidth();
    }

    // Track font and viewport changes without treating animation frames as new targets.
    const observer = new ResizeObserver(() => {
      if (!animation) previousWidth = readWidth();
    });
    observer.observe(node);
    reducedMotion.addEventListener("change", finish);

    return {
      update() {
        const from = animation ? readWidth() : previousWidth;
        finish();
        const to = readWidth();
        if (reducedMotion.matches || Math.abs(from - to) < 0.5) return;

        // Keep the incoming text at its final measure while the shell changes width.
        activeLabel = node.querySelector<HTMLElement>('[data-active="true"]');
        if (activeLabel) activeLabel.style.width = `${to}px`;
        animation = node.animate([{ width: `${from}px` }, { width: `${to}px` }], {
          duration: 150,
          easing: "ease-out",
        });
        animation.onfinish = finish;
      },
      destroy() {
        observer.disconnect();
        reducedMotion.removeEventListener("change", finish);
        finish();
      },
    };
  }
</script>

<span data-slot="tooltip-text" class="tooltip-text relative grid min-w-0" use:animateWidth={text}>
  {#each labels as label, index (label)}
    <span
      class="tooltip-text-state col-start-1 row-start-1"
      data-active={label === text}
      data-before={index < activeIndex}
      aria-hidden={label !== text}
    >
      {label}
    </span>
  {/each}
</span>

<style>
  .tooltip-text {
    overflow: clip;
    overflow-clip-margin: 4px;
  }

  .tooltip-text-state {
    position: absolute;
    width: max-content;
    opacity: 0;
    translate: 0 4px;
    filter: blur(2px);
    transition:
      opacity 150ms ease-out,
      translate 150ms ease-out,
      filter 150ms ease-out;
  }

  .tooltip-text-state:where([data-before="true"]) {
    translate: 0 -4px;
  }

  .tooltip-text-state:where([data-active="true"]) {
    position: relative;
    width: auto;
    opacity: 1;
    translate: 0 0;
    filter: blur(0);
  }

  @media (prefers-reduced-motion: reduce) {
    .tooltip-text-state {
      translate: none;
      filter: none;
      transition: none;
    }
  }
</style>
