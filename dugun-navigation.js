import {distance,angle,turn,rad} from "./dugun-istanbul-map.js?v=20261102-v10";
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const metresPerLon=lat=>111320*Math.cos(lat*rad);
function projection(p,a,b){
 const sx=metresPerLon(p[1]),sy=111320;
 const dx=(b[0]-a[0])*sx,dy=(b[1]-a[1])*sy;
 const px=(p[0]-a[0])*sx,py=(p[1]-a[1])*sy;
 const t=clamp((dx*px+dy*py)/Math.max(0.0001,dx*dx+dy*dy),0,1);
 return {point:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],meters:Math.hypot(px-t*dx,py-t*dy),t};
}
export class StableNavigation{
 constructor(){this.clear()}
 clear(){
  this.points=[];this.cum=[];this.length=0;this.progress=0;
  this.turns=[];this.offroute=0;this.lastTurn=-1;this.lastUpdate=null;
  this.ready=false;this.invalid=false;
 }
 setRoute(points){
  this.clear();
  if(!Array.isArray(points)||points.length<2)return;
  this.points=points.filter((p,i)=>i===0||distance(points[i-1],p)>.35);
  if(this.points.length<2)return;
  this.cum=[0];
  for(let i=1;i<this.points.length;i++)this.cum.push(this.cum.at(-1)+distance(this.points[i-1],this.points[i]));
  this.length=this.cum.at(-1);
  // A simple two-point fallback is *not* street guidance. Never tell players to
  // drive straight through a block when the road graph is disconnected.
  this.ready=this.points.length>=3;
  this.invalid=!this.ready&&this.length>38;
  if(!this.ready)return;
  for(let i=1;i<this.points.length-1;i++){
   const before=this.cum[i]-this.cum[i-1],after=this.cum[i+1]-this.cum[i];
   if(before<3.5||after<3.5)continue;
   const delta=turn(angle(this.points[i],this.points[i+1]),angle(this.points[i-1],this.points[i]));
   if(Math.abs(delta)<.58||Math.abs(delta)>2.95)continue;
   const last=this.turns.at(-1);
   if(last&&this.cum[i]-last.s<17){if(Math.abs(delta)>Math.abs(last.delta)){last.delta=delta;last.s=this.cum[i]}continue}
   this.turns.push({s:this.cum[i],delta});
  }
 }
 nearest(position){
  let best=null;
  for(let i=0;i<this.points.length-1;i++){
   if(this.cum[i+1]<this.progress-13)continue;
   const p=projection(position,this.points[i],this.points[i+1]);
   const s=this.cum[i]+p.t*(this.cum[i+1]-this.cum[i]);
   // On overlapping roads prefer the *current* part of the trip.
   const score=p.meters+Math.max(0,s-this.progress-30)*.13+Math.max(0,this.progress-s)*.30;
   if(!best||score<best.score)best={s,dist:p.meters,score,p:p.point,i};
  }
  return best;
 }
 update(position,dt){
  if(this.points.length<2)return {progress:0,offroad:true,crossTrack:Infinity};
  const m=this.nearest(position);
  if(!m)return {progress:this.progress,offroad:true,crossTrack:Infinity};
  // Once a junction has been crossed, don't rewind instructions to another branch.
  if(m.dist<18)this.progress=clamp(Math.max(this.progress,m.s),0,this.length);
  this.offroute=clamp(this.offroute+(m.dist>23?dt:-dt*2.5),0,12);
  return {progress:this.progress,offroad:this.offroute>3.3,crossTrack:m.dist};
 }
 at(distanceAhead){
  if(!this.points.length)return null;
  const s=clamp(this.progress+distanceAhead,0,this.length);
  let i=0;while(i<this.cum.length-2&&this.cum[i+1]<s)i++;
  const span=Math.max(.001,this.cum[i+1]-this.cum[i]),t=(s-this.cum[i])/span;
  const a=this.points[i],b=this.points[i+1];
  return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
 }
 instruction(position,target,label="HEDEF"){
  const distToGoal=target?distance(position,target):this.length-this.progress;
  if(distToGoal<20)return {kind:"arrive",arrow:"●",text:"HEDEF BURADA",detail:"YAVAŞLA · NOKTAYA YAKLAŞ",meters:Math.round(distToGoal)};
  if(!this.ready)return {kind:"search",arrow:"↑",text:"HEDEFİ HARİTADAN İZLE",detail:"YOL AĞI YÜKLENİYOR",meters:Math.round(distToGoal)};
  const next=this.turns.find(t=>t.s>this.progress+2);
  if(!next)return {kind:"straight",arrow:"↑",text:"DÜZ DEVAM ET",detail:label,meters:Math.max(0,Math.round(this.length-this.progress))};
  const d=next.s-this.progress;
  const side=next.delta>0?"SAĞA":"SOLA";
  if(d<24)return {kind:side==="SAĞA"?"right":"left",arrow:next.delta>0?"↱":"↰",text:side+" DÖN",detail:"SIRADAKİ KAVŞAK",meters:Math.max(0,Math.round(d))};
  return {kind:"straight",arrow:"↑",text:"DÜZ DEVAM ET",detail:Math.round(d/10)*10+" M SONRA "+side,meters:Math.round(d)};
 }
}
