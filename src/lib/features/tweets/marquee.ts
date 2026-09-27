type Direction = "left" | "right";

const duration = 42_000;
const edgeInset = 20;

export function getMarqueePhase(offset: number, cycleWidth: number, direction: Direction): number {
  const progress = ((((-offset - cycleWidth) % cycleWidth) + cycleWidth) % cycleWidth) / cycleWidth;
  return direction === "left" ? progress : (1 - progress) % 1;
}

export function createTestimonialMarquee(
  row: HTMLElement,
  { itemCount, cycleLength, direction }: { itemCount: number; cycleLength: number; direction: Direction },
) {
  const track = row.querySelector<HTMLElement>("[data-marquee-track]")!;
  const cards = Array.from(row.querySelectorAll<HTMLElement>("[data-marquee-item]"));
  const links = cards.map((card) => card.querySelector<HTMLAnchorElement>("a[href]")!);
  const motion = window.matchMedia("(prefers-reduced-motion: no-preference)");
  let animation: Animation | undefined;
  let cycleWidth = 0;
  let paused = false;
  let backwards = false;
  let cursor: number | null = null;

  function visibleCards() {
    const viewport = row.getBoundingClientRect();
    return cards.filter((card) => {
      const rect = card.getBoundingClientRect();
      return rect.right > viewport.left + edgeInset && rect.left < viewport.right - edgeInset;
    });
  }

  function expose(entry: HTMLElement) {
    const visible = new Set(visibleCards());
    const seen = new Set([entry.dataset.testimonialIndex]);
    for (const [index, card] of cards.entries()) {
      links[index].tabIndex = card === entry ? 0 : -1;
      const readable = card === entry || (visible.has(card) && !seen.has(card.dataset.testimonialIndex));
      if (readable) seen.add(card.dataset.testimonialIndex);
      // Never hide an ancestor of the focused link during a copy-to-copy handoff.
      if (readable || card.contains(document.activeElement)) card.removeAttribute("aria-hidden");
      else card.setAttribute("aria-hidden", "true");
    }
  }

  function updateEntry(reverse = false) {
    if (!motion.matches || paused || row.contains(document.activeElement)) return;
    const visible = visibleCards();
    const entry = reverse ? visible.at(-1) : visible[0];
    if (entry) expose(entry);
  }

  function reveal(card: HTMLElement) {
    if (!animation || !cycleWidth) return card;
    const viewport = row.getBoundingClientRect();
    const rect = card.getBoundingClientRect();
    const shift =
      rect.left < viewport.left + edgeInset
        ? viewport.left + edgeInset - rect.left
        : rect.right > viewport.right - edgeInset
          ? viewport.right - edgeInset - rect.right
          : 0;
    const offset = new DOMMatrixReadOnly(getComputedStyle(track).transform).m41 + shift;
    // Always stay in the middle cycle. The matching copy keeps both viewport edges filled.
    animation.currentTime = getMarqueePhase(offset, cycleWidth, direction) * duration;
    const expectedLeft = rect.left + shift;
    return cards
      .filter((candidate) => candidate.dataset.testimonialIndex === card.dataset.testimonialIndex)
      .reduce((closest, candidate) =>
        Math.abs(candidate.getBoundingClientRect().left - expectedLeft) <
        Math.abs(closest.getBoundingClientRect().left - expectedLeft)
          ? candidate
          : closest,
      );
  }

  function focusCard(card: HTMLElement) {
    const target = reveal(card);
    target.removeAttribute("aria-hidden");
    const link = links[cards.indexOf(target)];
    link.tabIndex = 0;
    if (document.activeElement !== link) link.focus({ preventScroll: true });
    expose(target);
    const bounds = row.getBoundingClientRect();
    if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
      // Scroll the stationary row, never the translated track or one of its copies.
      row.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    }
  }

  function handleFocusIn(event: FocusEvent) {
    if (!(event.target instanceof HTMLElement)) return;
    const card = event.target.closest<HTMLElement>("[data-marquee-item]");
    if (!card) return;
    animation?.pause();
    cursor ??= backwards ? itemCount - 1 : 0;
    focusCard(card);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey || cursor === null) return;
    if (!(event.target instanceof HTMLElement)) return;
    const card = event.target.closest<HTMLElement>("[data-marquee-item]");
    if (!card) return;
    const step = event.shiftKey ? -1 : 1;
    const next = cursor + step;
    // Native Tab moves to the next row (or out of the section) after one unique cycle.
    if (next < 0 || next >= itemCount) return;
    const target = cards[cards.indexOf(card) + step];
    if (!target) return;
    event.preventDefault();
    cursor = next;
    focusCard(target);
  }

  function handlePageKeydown(event: KeyboardEvent) {
    if (event.key !== "Tab" || event.defaultPrevented || paused) return;
    backwards = event.shiftKey;
    // Resolve the entry immediately before the browser performs its Tab action.
    updateEntry(backwards);
  }

  function resize() {
    const phase = ((Number(animation?.currentTime ?? 0) % duration) + duration) % duration;
    animation?.cancel();
    animation = undefined;
    if (!motion.matches || row.clientWidth === 0) return;
    cycleWidth = cards[cycleLength].offsetLeft - cards[0].offsetLeft;
    if (!cycleWidth) return;
    animation = track.animate(
      [{ transform: `translate3d(${-cycleWidth}px, 0, 0)` }, { transform: `translate3d(${-2 * cycleWidth}px, 0, 0)` }],
      { duration, iterations: Infinity, easing: "linear", direction: direction === "left" ? "normal" : "reverse" },
    );
    animation.currentTime = phase;
    if (paused || row.contains(document.activeElement)) animation.pause();
    const focused = cards.find((card) => card.contains(document.activeElement));
    if (focused) focusCard(focused);
    else updateEntry();
  }

  const visibility = new IntersectionObserver(() => updateEntry(), {
    root: row,
    rootMargin: `0px -${edgeInset}px`,
    threshold: [0, 1],
  });
  for (const card of cards) visibility.observe(card);
  const size = new ResizeObserver(resize);
  size.observe(row);
  size.observe(cards[0]);
  row.addEventListener("focusin", handleFocusIn);
  row.addEventListener("keydown", handleKeydown);
  window.addEventListener("keydown", handlePageKeydown);
  motion.addEventListener("change", resize);
  resize();

  return {
    setPaused(value: boolean) {
      paused = value;
      if (paused) animation?.pause();
      else {
        cursor = null;
        animation?.play();
        updateEntry();
      }
    },
    destroy() {
      animation?.cancel();
      visibility.disconnect();
      size.disconnect();
      row.removeEventListener("focusin", handleFocusIn);
      row.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("keydown", handlePageKeydown);
      motion.removeEventListener("change", resize);
    },
  };
}
