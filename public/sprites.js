import {drawAtlasAgent} from './atlas.js';
// Original pixel characters; procedural fallback while the atlas loads.
export const HAIR=['#492d38','#70422e','#d1a04a','#a45d55','#d7d3c8'];
export const SKIN=['#f3bf97','#d89974','#ae745d','#8f5c49'];
const CLOTHES=['#cd506b','#418da5','#9669b2','#65a47a','#e8a456','#5d69b5','#d57f8a'];
export function skinFor(seed){const n=Math.abs(Number(seed)||0);return {hair:n%HAIR.length,skinTone:(n>>>3)%SKIN.length,hat:(n>>>2)%4,eyes:(n>>>5)%3,outfit:CLOTHES[(n>>>6)%CLOTHES.length]};}
export function drawPixelAgent(ctx,cx,cy,appearance={},dir='down',walk=0,scale=1){
 if(drawAtlasAgent(ctx,cx,cy,appearance,dir,walk,scale))return;
 const x=Math.round(cx),y=Math.round(cy),u=Math.max(.7,scale);const fill=(dx,dy,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x+dx*u),Math.round(y+dy*u),Math.ceil(w*u),Math.ceil(h*u));};
 const color=appearance.outfit||'#8c68b2',hair=HAIR[appearance.hair%HAIR.length||0],skin=SKIN[appearance.skinTone%SKIN.length||0];
 const step=Math.floor(walk)%2;fill(-10,23,20,3,'#283c4677');
 // Boots + exaggerated adventure-trainer walking silhouette.
 fill(-6+(step?1:0),16,5,7,'#33405b');fill(1-(step?1:0),16,5,7,'#33405b');
 fill(-7+(step?0:-2),21,7,3,'#453750');fill(1+(step?2:0),21,7,3,'#453750');
 fill(-7,7,14,11,'#384866');fill(-6,7,12,9,color);fill(-3,12,6,3,'#f6d38c');
 fill(-11,7,4,9,skin);fill(7,7,4,9,skin);
 fill(-8,-5,16,14,skin);fill(-9,-10,18,8,hair);fill(-10,-7,3,9,hair);fill(7,-7,3,9,hair);
 if(dir==='down'){fill(-5,1,2,3,'#363244');fill(3,1,2,3,'#363244');fill(-2,6,4,1,'#bb796f');}
 if(dir==='left'){fill(-6,2,2,3,'#323446');fill(-7,0,2,2,skin)}
 if(dir==='right'){fill(4,2,2,3,'#323446');fill(7,0,2,2,skin)}
 if(dir==='up'){fill(-7,-4,14,11,hair);fill(-3,3,6,3,'#786574')}
 // Hats / hair accessories; combinations are deterministic per saved agent.
 if(appearance.hat===1){fill(-10,-12,20,5,'#e9eecc');fill(-12,-8,24,3,'#374b73');fill(-2,-11,8,2,'#a75c73');}
 if(appearance.hat===2){fill(-8,-13,16,5,color);fill(-11,-9,21,3,'#f4e6b4');}
 if(appearance.hat===3){fill(-5,-13,10,4,'#f8d6a6');fill(-3,-9,6,3,'#d19c58');}
 fill(-2,7,4,3,'#fff3d7');
}
