
export const AREAS={
 kadikoy:{name:"Kadıköy · Moda",center:[29.0295,40.9885]},
 besiktas:{name:"Beşiktaş · Abbasağa",center:[29.0071,41.0453]},
 karakoy:{name:"Karaköy · Galata",center:[28.9791,41.0255]}
};
export const rad=Math.PI/180;
export const distance=(a,b)=>Math.hypot((a[0]-b[0])*111320*Math.cos((a[1]+b[1])*.5*rad),(a[1]-b[1])*111320);
export const angle=(a,b)=>Math.atan2((b[0]-a[0])*Math.cos(a[1]*rad),b[1]-a[1]);
export const travel=(p,bearing,meters)=>[p[0]+Math.sin(bearing)*meters/(111320*Math.cos(p[1]*rad)),p[1]+Math.cos(bearing)*meters/111320];
export const turn=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function nearestOnSegment(p,a,b){
 const lat=p[1]*rad,kx=111320*Math.cos(lat),ky=111320;
 const vx=(b[0]-a[0])*kx,vy=(b[1]-a[1])*ky,px=(p[0]-a[0])*kx,py=(p[1]-a[1])*ky;
 const t=clamp((vx*px+vy*py)/Math.max(1,vx*vx+vy*vy),0,1);
 return {dist:Math.hypot(px-t*vx,py-t*vy),p:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]};
}
function key(p){return p[0].toFixed(5)+":"+p[1].toFixed(5)}
export class IstanbulMap{
 constructor(area,onReady,onError){
  this.area=area;this.roads=[];this.buildings=[];this.nodes=new Map();this.edges=new Map();this.samples=[];this.lastRefresh=0;this.vector=null;this.loaded=false;
  if(!window.maplibregl){onError("Harita kitaplığı yüklenemedi.");return}
  this.map=new maplibregl.Map({
   container:"map",style:"https://tiles.openfreemap.org/styles/liberty",
   center:AREAS[area].center,zoom:17.3,pitch:67,bearing:0,minZoom:12,maxZoom:19.5,maxPitch:80,
   antialias:true,attributionControl:true,renderWorldCopies:false,
   dragPan:false,scrollZoom:false,dragRotate:false,doubleClickZoom:false,keyboard:false,touchZoomRotate:false
  });
  this.map.on("load",()=>{
   try{
    const style=this.map.getStyle();
    this.vector=Object.entries(style.sources).find(([,s])=>s.type==="vector")?.[0];
    if(!this.vector)throw Error("OpenStreetMap vektör verisi bulunamadı.");
    const firstLabel=style.layers.find(l=>l.type==="symbol"&&l.layout?.["text-field"])?.id;
    this.map.addLayer({
     id:"wedding-3d-buildings",type:"fill-extrusion",source:this.vector,"source-layer":"building",
     minzoom:14,paint:{
      "fill-extrusion-color":"#c9c7bb",
      "fill-extrusion-height":["max",9,["to-number",["get","render_height"],["get","height"],14]],
      "fill-extrusion-base":["to-number",["get","render_min_height"],["get","min_height"],0],
      "fill-extrusion-opacity":.94
     }
    },firstLabel);
    this.map.addSource("wedding-nav",{type:"geojson",data:{type:"Feature",properties:{},geometry:{type:"LineString",coordinates:[]}}});
    this.map.addLayer({id:"wedding-nav-line",type:"line",source:"wedding-nav",
     layout:{"line-cap":"round","line-join":"round"},
     paint:{"line-color":"#ffe16f","line-width":7,"line-opacity":.9}});
    this.loaded=true;this.refresh(AREAS[area].center,true);onReady?.();
   }catch(e){onError(e.message);console.error(e)}
  });
  this.map.on("error",e=>{if(!this.loaded)onError("Harita verisine erişilemiyor.");console.warn(e.error||e)});
  this.map.on("sourcedata",()=>{if(this.loaded&&this.roads.length<15)this.refresh(AREAS[area].center,false)});
 }
 jumpToArea(area){
  this.area=area;
  if(!this.loaded)return;
  this.map.jumpTo({center:AREAS[area].center,bearing:0,pitch:67,zoom:17.3});
  this.roads=[];this.buildings=[];this.lastRefresh=0;
  setTimeout(()=>this.refresh(AREAS[area].center,true),700);
 }
 refresh(player,force=false){
  if(!this.loaded||!this.map?.isStyleLoaded())return;
  if(!force&&performance.now()-this.lastRefresh<3500)return;
  this.lastRefresh=performance.now();
  let features;
  try{features=this.map.querySourceFeatures(this.vector,{sourceLayer:"transportation"})}catch(e){return}
  if(!features?.length)return;
  const roads=[],uniq=new Set(),skip=/^(path|footway|steps|pedestrian|cycleway|track|motorway|motorway_link|construction)$/;
  for(const f of features){
   const typ=f.properties?.class||f.properties?.subclass||"";
   if(skip.test(typ))continue;
   const geom=f.geometry;
   const paths=geom?.type==="LineString"?[geom.coordinates]:geom?.type==="MultiLineString"?geom.coordinates:[];
   for(const path of paths)for(let j=1;j<path.length;j++){
    const a=path[j-1],b=path[j],len=distance(a,b);
    if(len<1.4||len>200||Math.min(distance(player,a),distance(player,b))>780)continue;
    const id=key(a)+"_"+key(b);
    if(uniq.has(id))continue;uniq.add(id);
    roads.push({a,b,len,typ});
    if(roads.length>5200)break;
   }
   if(roads.length>5200)break;
  }
  if(roads.length<10)return;
  
  this.roads=roads;this.nodes=new Map();this.edges=new Map();this.samples=[];
  try{
   const buildings=this.map.querySourceFeatures(this.vector,{sourceLayer:"building"})||[];
   const collection=[],used=new Set();
   for(const f of buildings){
    const polygons=f.geometry?.type==="Polygon"?[f.geometry.coordinates]:f.geometry?.type==="MultiPolygon"?f.geometry.coordinates:[];
    for(const poly of polygons){
     const ring=poly[0];if(!ring?.length)continue;
     const lng=ring[0][0],lat=ring[0][1];
     if(distance(player,[lng,lat])>950)continue;
     const id=f.properties?.id||f.properties?.osm_id||lng.toFixed(6)+":"+lat.toFixed(6);
     if(used.has(id))continue;used.add(id);
     const xs=ring.map(p=>p[0]),ys=ring.map(p=>p[1]);
     collection.push({ring,minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)});
     if(collection.length>2600)break;
    }
    if(collection.length>2600)break;
   }
   this.buildings=collection;
  }catch(e){this.buildings=[]}

  for(const r of roads){
   const a=key(r.a),b=key(r.b);
   this.nodes.set(a,r.a);this.nodes.set(b,r.b);
   if(!this.edges.has(a))this.edges.set(a,[]);
   if(!this.edges.has(b))this.edges.set(b,[]);
   this.edges.get(a).push({node:b,d:r.len});
   this.edges.get(b).push({node:a,d:r.len});
   this.samples.push([(r.a[0]+r.b[0])/2,(r.a[1]+r.b[1])/2]);
  }
 }

 insideBuilding(point){
  for(const b of this.buildings){
   if(point[0]<b.minX||point[0]>b.maxX||point[1]<b.minY||point[1]>b.maxY)continue;
   let inside=false;
   for(let i=0,j=b.ring.length-1;i<b.ring.length;j=i++){
    const a=b.ring[i],c=b.ring[j];
    if(((a[1]>point[1])!==(c[1]>point[1]))&&(point[0]<(c[0]-a[0])*(point[1]-a[1])/(c[1]-a[1])+a[0]))inside=!inside;
   }
   if(inside)return true;
  }
  return false;
 }
 nearest(point){
  let result=null;
  for(const r of this.roads){
   if(Math.min(distance(point,r.a),distance(point,r.b))>110)continue;
   const z=nearestOnSegment(point,r.a,r.b);
   if(!result||z.dist<result.dist)result={...z,road:r};
  }
  return result;
 }
 sample(point,min=60,max=240){
  const candidates=this.samples.filter(p=>{const d=distance(p,point);return d>=min&&d<=max});
  return candidates.length?[...candidates[Math.floor(Math.random()*candidates.length)]]:null;
 }
 closestNode(p){
  let k=null,d=Infinity;
  for(const [id,v]of this.nodes){const z=distance(p,v);if(z<d){d=z;k=id}}
  return k;
 }
 route(from,to){
  if(this.nodes.size<2)return [from,to];
  const start=this.closestNode(from),end=this.closestNode(to);
  if(!start||!end)return [from,to];
  const queue=[[start,0]],d=new Map([[start,0]]),prev=new Map();let rounds=0;
  // Binary heap not necessary for short neighborhood routes; keep frontier bounded.
  while(queue.length&&rounds++<7500){
   queue.sort((a,b)=>b[1]-a[1]);const [id,dd]=queue.pop();
   if(dd>(d.get(id)??Infinity))continue;
   if(id===end)break;
   for(const v of this.edges.get(id)||[]){
    const next=dd+v.d;
    if(next<(d.get(v.node)??Infinity)){d.set(v.node,next);prev.set(v.node,id);queue.push([v.node,next])}
   }
  }
  if(!d.has(end))return [from,to];
  const path=[to];let p=end;const seen=new Set();
  while(p&&p!==start&&!seen.has(p)){seen.add(p);path.push(this.nodes.get(p));p=prev.get(p)}
  if(p!==start)return [from,to];
  path.push(this.nodes.get(start),from);return path.reverse();
 }
 setRoute(points){
  this.map?.getSource("wedding-nav")?.setData({type:"Feature",properties:{},geometry:{type:"LineString",coordinates:points||[]}});
 }
 chase(position,bearing,dt,shake=0){
  if(!this.loaded)return;
  const target=travel(position,bearing,17),map=this.map,c=map.getCenter(),current=[c.lng,c.lat];
  const delta=distance(current,target),theta=angle(current,target);
  const loc=travel(current,theta,delta*Math.min(1,dt*5));
  const old=map.getBearing(),degrees=bearing/rad;
  const next=old+turn(degrees*rad,old*rad)/rad*Math.min(1,dt*4);
  map.jumpTo({center:loc,bearing:next+shake,pitch:69,zoom:18.08});
 }
}
