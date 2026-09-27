export function getContributionFocusIndex(
  current: number,
  first: number,
  last: number,
  key: string,
  wholeGrid = false,
): number | null {
  const row = current % 7;
  let next: number;

  switch (key) {
    case "ArrowLeft":
      next = current - 7;
      break;
    case "ArrowRight":
      next = current + 7;
      break;
    case "ArrowUp":
      next = row > 0 ? current - 1 : current;
      break;
    case "ArrowDown":
      next = row < 6 ? current + 1 : current;
      break;
    case "Home":
      next = wholeGrid ? first : first + ((row - (first % 7) + 7) % 7);
      break;
    case "End":
      next = wholeGrid ? last : last - (((last % 7) - row + 7) % 7);
      break;
    default:
      return null;
  }

  return next >= first && next <= last ? next : current;
}
