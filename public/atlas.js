// Original atlas generated for SanTTos; source rectangles retain transparent padding.
const atlas = typeof Image === 'undefined' ? null : new Image();
const staffAtlas=typeof Image==='undefined'?null:new Image();
const groundAtlas=typeof Image==='undefined'?null:new Image();
if(staffAtlas)staffAtlas.src='/assets/staff-atlas.png';
if(groundAtlas)groundAtlas.src='/assets/ground-atlas.png';
if (atlas) atlas.src = '/assets/building-atlas.png';
// Source bounds measured from the transparent atlases; generated art is not assumed
// to stay inside equal cells. These rectangles prevent neighboring sprites bleeding.
const STAFF_FRAMES=[
 [78,59,187,289],[374,75,185,273],[688,51,183,298],[983,75,188,273],
 [74,373,213,283],[370,381,204,275],[686,369,183,287],[988,374,178,282],
 [60,671,201,280],[384,671,176,280],[680,671,191,280],[975,679,203,272],
 [77,963,182,272],[372,962,219,273],[667,966,225,269],[988,964,182,271]
];
const BUILDING_FRAMES=[
 [28,101,391,323],[467,110,404,317],[898,94,366,349],[1333,114,387,333],
 [43,467,355,378],[470,467,341,378],[840,467,458,378],[1320,501,442,347]
];
function buildingIndex(o){return o.kind==='house'?Math.abs(o.x+o.y)%3:o.kind==='office'?4+Math.abs(o.x)%2:o.service==='university'?6:o.service==='talents'?3:7;}
export function atlasBuildingHeight(o,width){const frame=BUILDING_FRAMES[buildingIndex(o)];return width*frame[3]/frame[2];}
export function drawAtlasAgent(ctx, x, y, appearance, dir, walk, scale) {
  if(Number.isInteger(appearance.spriteIndex)&&staffAtlas?.complete&&staffAtlas.naturalWidth){
    // Cell zero is reserved exclusively for the human player's identity.
    const index=appearance.player?0:appearance.spriteIndex===0?15:Math.max(1,Math.min(15,appearance.spriteIndex));
    const [sx,sy,sw,sh]=STAFF_FRAMES[index];
    const bob=walk?Math.sin(walk*Math.PI)*1.2*scale:0;
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y+24*scale+bob));
    if(dir==='right')ctx.scale(-1,1);
    ctx.drawImage(staffAtlas,sx,sy,sw,sh,-16*scale,-40*scale,32*scale,40*scale);
    ctx.restore();return true;
  }
  return false;
}

export function drawAtlasBuilding(ctx, o, center, width) {
  if (!atlas?.complete || !atlas.naturalWidth) return false;
  const [x,y,w,h]=BUILDING_FRAMES[buildingIndex(o)];
  const source={x,y,w,h},height=atlasBuildingHeight(o,width);
  ctx.save();ctx.imageSmoothingEnabled = false;
  ctx.drawImage(atlas, source.x, source.y, source.w, source.h,
    Math.round(center.x - width / 2), Math.round(center.y - height + 10), Math.round(width), Math.round(height));
  ctx.restore();return true;
}

// Diamond textures are clipped to logical footprints, preventing gaps and overlap.
export function drawAtlasGround(ctx,type,points,texturePoints=points){
 if(!groundAtlas?.complete||!groundAtlas.naturalWidth||!['grass','path'].includes(type))return false;
 const source=type==='grass'?[175,310,260,180]:[642,212,596,379];
 const minX=Math.min(...texturePoints.map(p=>p.x)),maxX=Math.max(...texturePoints.map(p=>p.x));
 const minY=Math.min(...texturePoints.map(p=>p.y)),maxY=Math.max(...texturePoints.map(p=>p.y));
 ctx.save();ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(const p of points.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath();ctx.clip();
 ctx.imageSmoothingEnabled=false;
 // Grass uses the seamless interior of its texture, avoiding dark patch borders.
 ctx.drawImage(groundAtlas,...source,minX-1,minY-1,maxX-minX+2,maxY-minY+2);
 ctx.restore();return true;
}
export function drawAtlasFountain(ctx,center,width){
 if(!groundAtlas?.complete||!groundAtlas.naturalWidth)return false;
 const height=width*417/613;
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.drawImage(groundAtlas,635,751,613,417,center.x-width/2,center.y-height+width*.25,width,height);
 ctx.restore();return true;
}
