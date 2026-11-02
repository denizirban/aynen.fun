
export const AREAS={
 kadikoy:{name:"Kadıköy · Moda",center:[29.0295,40.9885]},
 besiktas:{name:"Beşiktaş · Abbasağa",center:[29.0071,41.0453]},
 karakoy:{name:"Karaköy · Galata",center:[28.9791,41.0255]},
 balat:{name:"Balat · Haliç",center:[28.9497,41.0306]},
 ortakoy:{name:"Ortaköy · Boğaz",center:[29.0270,41.0476]},
 uskudar:{name:"Üsküdar · Çarşı",center:[29.0158,41.0258]}
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
  this.area=area;this.roads=[];this.buildings=[];this.water=[];this.nodes=new Map();this.edges=new Map();this.samples=[];this.lastRefresh=0;this.skids=[];this.vector=null;this.loaded=false;
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
    // Avoid rendering a second hidden 3D city: MapLibre provides source data only.
    // The full-screen Three.js scene renders all architecture and road geometry.
    this.map.addSource("wedding-nav",{type:"geojson",data:{type:"Feature",properties:{},geometry:{type:"LineString",coordinates:[]}}});
    this.map.addSource("wedding-skids",{type:"geojson",data:{type:"FeatureCollection",features:[]}});
    // Keep geometry sources for the map logic, but draw route and skids only in Three.js.
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
  this.roads=[];this.buildings=[];this.water=[];this.lastRefresh=0;
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
  if(roads.length<6)return;
  // Tiles return transportation features in arbitrary order. Keep the local road corridor first:
  // previously the visible renderer took the first 800, leaving the car on a giant blank green plane.
  roads.sort((x,y)=>Math.min(distance(player,x.a),distance(player,x.b))-Math.min(distance(player,y.a),distance(player,y.b)));
  
  this.roads=roads;this.nodes=new Map();this.edges=new Map();this.samples=[];
  if(this.onRoadsReady)queueMicrotask(()=>this.onRoadsReady?.());
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
     const prop=f.properties||{};
     const measuredHeight=Number(prop.render_height??prop.height);
     const floors=Number(prop.levels??prop.building_levels);
     const height=Number.isFinite(measuredHeight)&&measuredHeight>2?measuredHeight:
      Number.isFinite(floors)&&floors>0?floors*3.15:null;
     collection.push({ring,minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys),height});
     if(collection.length>2600)break;
    }
    if(collection.length>2600)break;
   }
   this.buildings=collection;
  }catch(e){this.buildings=[]}

  try{
   const waterFeatures=this.map.querySourceFeatures(this.vector,{sourceLayer:"water"})||[];
   const seen=new Set(),water=[];
   for(const f of waterFeatures){
    const kind=f.properties?.class||"water";
    if(kind==="swimming_pool")continue;
    const geo=f.geometry;
    const parts=geo?.type==="Polygon"?[geo.coordinates]:geo?.type==="MultiPolygon"?geo.coordinates:[];
    for(const rings of parts){
     const outside=rings?.[0];if(!outside||outside.length<3)continue;
     const uniqueId=(f.id??f.properties?.id??"")+"_"+outside[0][0].toFixed(6)+"_"+outside[0][1].toFixed(6);
     if(seen.has(uniqueId))continue;seen.add(uniqueId);
     const xs=outside.map(q=>q[0]),ys=outside.map(q=>q[1]);
     const bounds={minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
     const nearest=[Math.max(bounds.minX,Math.min(player[0],bounds.maxX)),Math.max(bounds.minY,Math.min(player[1],bounds.maxY))];
     if(distance(player,nearest)>650)continue;
     water.push({rings:rings.slice(0,4),kind,bounds});
     if(water.length>=55)break;
    }
    if(water.length>=55)break;
   }
   if(water.length)this.water=water;
  }catch(e){console.warn("Water tiles not ready",e)}
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
 nearestAny(point){
  let result=null;
  for(const road of this.roads){
   const z=nearestOnSegment(point,road.a,road.b);
   if(!result||z.dist<result.dist)result={...z,road};
  }
  return result;
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
  const nearStart=this.nearest(from)||this.nearestAny(from);
  const nearEnd=this.nearest(to)||this.nearestAny(to);
  if(!nearStart||!nearEnd)return [from,to];
  const idA=key(nearStart.road.a),idB=key(nearStart.road.b);
  const idC=key(nearEnd.road.a),idD=key(nearEnd.road.b);
  const simplify=arr=>arr.filter((p,i)=>!i||distance(p,arr[i-1])>.25);
  // The player and target are on the SAME street segment: no intersection detour.
  if((idA===idC&&idB===idD)||(idA===idD&&idB===idC))
   return simplify([from,nearStart.p,[(nearStart.p[0]+nearEnd.p[0])*.5,(nearStart.p[1]+nearEnd.p[1])*.5],nearEnd.p,to]);
  // Cost of starting from each end of the real street segment, not from an
  // arbitrary nearest graph node that may be behind the vehicle.
  const starts=[[idA,distance(nearStart.p,nearStart.road.a)],[idB,distance(nearStart.p,nearStart.road.b)]];
  const ends=new Map([[idC,distance(nearEnd.road.a,nearEnd.p)],[idD,distance(nearEnd.road.b,nearEnd.p)]]);
  const d=new Map(),prev=new Map(),roots=new Set();
  const queue=[];
  const push=(item)=>{
   let i=queue.length;queue.push(item);
   while(i>0){const parent=(i-1)>>1;if(queue[parent][1]<=item[1])break;queue[i]=queue[parent];i=parent}
   queue[i]=item;
  };
  const pop=()=>{
   const first=queue[0],last=queue.pop();
   if(queue.length){
    let i=0;while(true){
     const a=2*i+1,b=a+1;if(a>=queue.length)break;
     const child=b<queue.length&&queue[b][1]<queue[a][1]?b:a;
     if(queue[child][1]>=last[1])break;
     queue[i]=queue[child];i=child;
    }queue[i]=last;
   }return first;
  };
  for(const [id,cost] of starts)if(this.nodes.has(id)){
   if(cost<(d.get(id)??Infinity)){d.set(id,cost);roots.add(id);push([id,cost])}
  }
  let bestId=null,bestCost=Infinity,iterations=0;
  while(queue.length&&iterations++<22000){
   const [id,cost]=pop();
   if(cost>(d.get(id)??Infinity))continue;
   if(cost>bestCost)break;
   if(ends.has(id)&&cost+ends.get(id)<bestCost){bestId=id;bestCost=cost+ends.get(id)}
   for(const edge of this.edges.get(id)||[]){
    const next=cost+edge.d;
    if(next<(d.get(edge.node)??Infinity)&&next<bestCost){
     d.set(edge.node,next);prev.set(edge.node,id);push([edge.node,next]);
    }
   }
  }
  if(!bestId)return [from,to]; // no fabricated street route
  const ids=[],visited=new Set();let current=bestId;
  while(current&&!visited.has(current)){
   ids.push(current);visited.add(current);current=prev.get(current);
  }
  ids.reverse();
  return simplify([from,nearStart.p,...ids.map(id=>this.nodes.get(id)),nearEnd.p,to]);
 }
 setRoute(points){
  this.map?.getSource("wedding-nav")?.setData({type:"Feature",properties:{},geometry:{type:"LineString",coordinates:points||[]}});
 }

 skid(from,to){
  this.skids.push({type:"Feature",properties:{},geometry:{type:"LineString",coordinates:[from,to]}});
  if(this.skids.length>75)this.skids.shift();
  this.map?.getSource("wedding-skids")?.setData({type:"FeatureCollection",features:this.skids});
 }
 chase(position,bearing,dt,shake=0,speed=0){
  if(!this.loaded)return;
  const target=travel(position,bearing,17),map=this.map,c=map.getCenter(),current=[c.lng,c.lat];
  const delta=distance(current,target),theta=angle(current,target);
  const loc=travel(current,theta,delta*Math.min(1,dt*5));
  const old=map.getBearing(),degrees=bearing/rad;
  const next=old+turn(degrees*rad,old*rad)/rad*Math.min(1,dt*4);
  map.jumpTo({center:loc,bearing:next+shake,pitch:69,zoom:18.08-Math.min(.30,Math.abs(speed)*.012)});
 }
}
