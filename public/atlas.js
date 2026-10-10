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
function buildingIndex(o){const variant=[...String(o.id||o.name||o.kind)].reduce((n,c)=>n+c.charCodeAt(0),0);return o.kind==='house'?variant%3:o.kind==='office'?4+variant%2:o.service==='university'?6:o.service==='talents'?3:7;}
// Calibration of the existing artwork: front corner and both ground edges.
// Only the drawing projection changes; the PNGs, colors and details are preserved.
const BUILDING_BASES=[
 [250,315,252,245],[270,314,255,230],[235,343,279,273],[245,329,277,258],
 [211,376,310,303],[210,376,305,308],[337,376,292,298],[335,343,265,277]
];
export function buildingProjection(o,width){
 const index=buildingIndex(o),frame=BUILDING_FRAMES[index],[front,base,leftBase,rightBase]=BUILDING_BASES[index];
 const [, ,sw,sh]=frame,vertical=width/sw;
 const ow=o.w??(o.kind==='house'?4:6),oh=o.h??(o.kind==='house'?4:5);
 const leftWidth=ow*17,rightWidth=oh*17,frontY=(ow+oh)*4.25;
 const leftY=frontY-ow*8.5,rightY=frontY-oh*8.5;
 const left={sx:leftWidth/front,shear:(frontY-leftY-vertical*(base-leftBase))/front,tx:-(leftWidth+rightWidth)/2,ty:leftY-vertical*leftBase,start:0,end:front};
 const right={sx:rightWidth/(sw-front),shear:(rightY-frontY-vertical*(rightBase-base))/(sw-front),tx:-(leftWidth+rightWidth)/2+leftWidth-rightWidth/(sw-front)*front,ty:0,start:front,end:sw};
 right.ty=frontY-vertical*base-right.shear*front;
 const top=Math.min(left.ty,left.ty+left.shear*front,right.ty+right.shear*front,right.ty+right.shear*sw);
 return {frame,vertical,left,right,height:-top,frontX:left.tx+left.sx*front,frontY,sourceHeight:sh};
}
export function atlasBuildingHeight(o,width){return buildingProjection(o,width).height;}
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

export function drawAtlasBuilding(ctx,o,center,width){
 if(!atlas?.complete||!atlas.naturalWidth)return false;
 const {frame,vertical,left,right}=buildingProjection(o,width),[x,y,w,h]=frame;
 for(const face of [left,right]){
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.transform(face.sx,face.shear,0,vertical,center.x+face.tx,center.y+face.ty);
  ctx.beginPath();ctx.rect(face.start,0,face.end-face.start,h);ctx.clip();
  ctx.drawImage(atlas,x,y,w,h,0,0,w,h);ctx.restore();
 }
 return true;
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
