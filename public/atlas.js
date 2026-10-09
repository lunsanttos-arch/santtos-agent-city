// Original atlas generated for SanTTos; source rectangles retain transparent padding.
const atlas = typeof Image === 'undefined' ? null : new Image();
if (atlas) atlas.src = '/assets/city-atlas.png';
export function drawAtlasAgent(ctx, x, y, appearance, dir, walk, scale) {
  if (!atlas?.complete || !atlas.naturalWidth) return false;
  const row = Math.abs(Number(appearance.hair || 0) + Number(appearance.skinTone || 0)) % 6;
  const frame = Math.abs(Math.floor(walk)) % 3;
  const column = (dir === 'up' ? 6 : dir === 'left' || dir === 'right' ? 3 : 0) + frame;
  const left = [80,230,380,530,680,830,1010,1160,1310][column];
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y + 24 * scale));
  if (dir === 'right') ctx.scale(-1, 1);
  ctx.drawImage(atlas, left, row * 106, 140, 106, -22 * scale, -48 * scale, 44 * scale, 48 * scale);
  ctx.restore();
  return true;
}
export function drawAtlasBuilding(ctx, o, center, width) {
  if (!atlas?.complete || !atlas.naturalWidth) return false;
  const index = o.kind === 'house' ? Math.abs(o.x + o.y) % 3
    : o.kind === 'office' ? 4 + Math.abs(o.x) % 2
    : o.service === 'university' ? 6 : o.service === 'talents' ? 3 : 7;
  const col = index % 4, row = Math.floor(index / 4);
  const source = {x:80 + col * 350, y:row ? 814 : 630, w:330, h:row ? 210 : 198};
  const height = width * source.h / source.w;
  ctx.save();ctx.imageSmoothingEnabled = false;
  ctx.drawImage(atlas, source.x, source.y, source.w, source.h,
    Math.round(center.x - width / 2), Math.round(center.y - height + 10), Math.round(width), Math.round(height));
  ctx.restore();return true;
}
