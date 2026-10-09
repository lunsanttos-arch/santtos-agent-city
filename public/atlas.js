// Original atlas generated for SanTTos; source rectangles retain transparent padding.
const atlas = typeof Image === 'undefined' ? null : new Image();
const staffAtlas=typeof Image==='undefined'?null:new Image();
const groundAtlas=typeof Image==='undefined'?null:new Image();
if(staffAtlas)staffAtlas.src='/assets/staff-atlas.png';
if(groundAtlas)groundAtlas.src='/assets/ground-atlas.png';
if (atlas) atlas.src = '/assets/city-atlas.png';
export function drawAtlasAgent(ctx, x, y, appearance, dir, walk, scale) {
  if(Number.isInteger(appearance.spriteIndex)&&staffAtlas?.complete&&staffAtlas.naturalWidth){
    // Cell zero is reserved exclusively for the human player's identity.
    const index=appearance.player?0:appearance.spriteIndex===0?15:Math.max(1,Math.min(15,appearance.spriteIndex));
    const cw=staffAtlas.naturalWidth/4,ch=staffAtlas.naturalHeight/4;
    const bob=walk?Math.sin(walk*Math.PI)*1.2*scale:0;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y+24*scale+bob));
    if(dir==='right')ctx.scale(-1,1);
    ctx.drawImage(staffAtlas,(index%4)*cw,Math.floor(index/4)*ch,cw,ch,-24*scale,-52*scale,48*scale,52*scale);
    ctx.restore();return true;
  }
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

// Diamond textures are clipped to logical footprints, preventing gaps and overlap.
export function drawAtlasGround(ctx,type,points,texturePoints=points){
 if(!groundAtlas?.complete||!groundAtlas.naturalWidth||!['grass','path'].includes(type))return false;
 const cw=groundAtlas.naturalWidth/2,ch=groundAtlas.naturalHeight/2;
 const col=type==='path'?1:0,row=type==='road'?1:0;
 const minX=Math.min(...texturePoints.map(p=>p.x)),maxX=Math.max(...texturePoints.map(p=>p.x));
 const minY=Math.min(...texturePoints.map(p=>p.y)),maxY=Math.max(...texturePoints.map(p=>p.y));
 ctx.save();ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath();ctx.clip();
 ctx.imageSmoothingEnabled=false;
 // The generated diamonds occupy x=1..99%, y=30..89% of each source cell.
 ctx.drawImage(groundAtlas,col*cw+cw*.01,row*ch+ch*.30,cw*.98,ch*.59,minX-1,minY-1,maxX-minX+2,maxY-minY+2);
 ctx.restore();return true;
}
export function drawAtlasFountain(ctx,center,width){
 if(!groundAtlas?.complete||!groundAtlas.naturalWidth)return false;
 const cw=groundAtlas.naturalWidth/2,ch=groundAtlas.naturalHeight/2,height=width*.87;
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.drawImage(groundAtlas,cw,ch,cw,ch,center.x-width/2,center.y-height+width*.25,width,height);
 ctx.restore();return true;
}
