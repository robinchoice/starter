// Geometry of the app dock under the Pleasance wordmark, after the macOS Dock:
// icons grow the closer the pointer gets, their neighbours make room, and the
// spot under the pointer stays under it. All values are viewport pixels.

export type DockSlot = { left: number; size: number };

type Options = {
  // Icon sizes at rest, left to right
  sizes: number[];
  gap: number;
  // Extra size right under the pointer, 0.75 grows an icon by three quarters
  grow: number;
  // How far the growth reaches, in icon widths
  reach: number;
  // Centre of the row at rest
  center: number;
  pointer: number | null;
  // The row stays between these
  min: number;
  max: number;
};

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

export function dockLayout(o: Options): DockSlot[] {
  const unit = Math.max(...o.sizes) + o.gap;
  const restWidth = sum(o.sizes) + o.gap * (o.sizes.length - 1);
  const restLeft = clamp(o.center - restWidth / 2, o.min, o.max - restWidth);
  const centers: number[] = [];
  let x = restLeft;
  for (const size of o.sizes) {
    centers.push(x + size / 2);
    x += size + o.gap;
  }
  const { pointer } = o;
  const sizes = o.sizes.map((size, i) => {
    if (pointer === null) return size;
    const distance = Math.abs(pointer - centers[i]!) / unit;
    const closeness = distance >= o.reach ? 0 : (Math.cos((distance / o.reach) * Math.PI) + 1) / 2;
    return size * (1 + o.grow * closeness);
  });
  const width = sum(sizes) + o.gap * (sizes.length - 1);
  // The point under the pointer keeps its share of the row, so the row grows
  // around it instead of sliding away
  const share = pointer === null ? 0.5 : clamp((pointer - restLeft) / restWidth, 0, 1);
  const anchor = pointer ?? restLeft + restWidth / 2;
  x = clamp(anchor - share * width, o.min, o.max - width);
  return sizes.map((size) => {
    const slot = { left: x, size };
    x += size + o.gap;
    return slot;
  });
}
