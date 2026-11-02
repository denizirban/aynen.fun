
export const AREAS={
 istanbul:{name:"İstanbul · Boğaz",center:[29.0270,41.0476]}
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

// A vector tile can contain two visible crossing streets without a shared vertex.
// Snap *actual geometric crossings* into the driving graph; keep bridges separated.
function resolveJunctions(segments,center){
 const scaleX=111320*Math.cos(center[1]*rad),scaleY=111320,cellSize=65;
 const XY=p=>[(p[0]-center[0])*scaleX,(p[1]-center[1])*scaleY];
 const points=segments.map(r=>[XY(r.a),XY(r.b)]);
 const grid=new Map(),cuts=segments.map(()=>[0,1]);
 for(let i=0;i<segments.length;i++){
  const [a,b]=points[i];
  if(Math.min(Math.hypot(...a),Math.hypot(...b))>680)continue;
  const left=Math.floor((Math.min(a[0],b[0])-1)/cellSize),right=Math.floor((Math.max(a[0],b[0])+1)/cellSize);
  const bottom=Math.floor((Math.min(a[1],b[1])-1)/cellSize),top=Math.floor((Math.max(a[1],b[1])+1)/cellSize);
  for(let x=left;x<=right;x++)for(let y=bottom;y<=top;y++){
   const k=x+":"+y;
   if(!grid.has(k))grid.set(k,[]);
   grid.get(k).push(i);
  }
 }
 const checked=new Set();let pairCount=0,crossCount=0;
 for(const group of grid.values()){
  for(let i=0;i<group.length;i++){
   const id=group[i],[a,b]=points[id],ab=[b[0]-a[0],b[1]-a[1]];
   for(let j=i+1;j<group.length;j++){
    const other=group[j];if(id===other)continue;
    const p=id<other?id+","+other:other+","+id;
    if(checked.has(p))continue;checked.add(p);
    if(++pairCount>270000)break;
    if(segments[id].bridge!==segments[other].bridge)continue;
    if(segments[id].tunnel!==segments[other].tunnel)continue;
    const [c,e]=points[other],ce=[e[0]-c[0],e[1]-c[1]],delta=[c[0]-a[0],c[1]-a[1]];
    const den=ab[0]*ce[1]-ab[1]*ce[0];
    if(Math.abs(den)<.005)continue;
    const ta=(delta[0]*ce[1]-delta[1]*ce[0])/den;
    const tb=(delta[0]*ab[1]-delta[1]*ab[0])/den;
    if(ta<-.002||ta>1.002||tb<-.002||tb>1.002)continue;
    // An end-point that is already a graph vertex does not require a split.
    if(ta>.004&&ta<.996)cuts[id].push(ta);
    if(tb>.004&&tb<.996)cuts[other].push(tb);
    crossCount++;
   }
   if(pairCount>270000)break;
  }
  if(pairCount>270000)break;
 }
 const output=[];
 for(let i=0;i<segments.length;i++){
  const r=segments[i],values=cuts[i].sort((a,b)=>a-b);
  for(let j=1;j<values.length;j++){
   const a=values[j-1],b=values[j];
   if(b-a<.01)continue;
   const p=[r.a[0]+(r.b[0]-r.a[0])*a,r.a[1]+(r.b[1]-r.a[1])*a];
   const q=[r.a[0]+(r.b[0]-r.a[0])*b,r.a[1]+(r.b[1]-r.a[1])*b];
   const len=distance(p,q);if(len<.55)continue;
   output.push({...r,a:p,b:q,len});
   if(output.length>=10500)return output;
  }
 }
 return output;
}


const GRID_METRES=64;
const gxy=p=>[p[0]*111320*Math.cos(41.0476*rad),p[1]*111320];
function makeGrid(items,bounds){
 const grid=new Map();
 for(let i=0;i<items.length;i++){
  const [x0,y0,x1,y1]=bounds(items[i]);
  const left=Math.floor(x0/GRID_METRES),right=Math.floor(x1/GRID_METRES);
  const bottom=Math.floor(y0/GRID_METRES),top=Math.floor(y1/GRID_METRES);
  if((right-left+1)*(top-bottom+1)>400)continue;
  for(let x=left;x<=right;x++)for(let y=bottom;y<=top;y++){
   const key=x+":"+y;if(!grid.has(key))grid.set(key,[]);
   grid.get(key).push(i);
  }
 }
 return grid;
}
function roadBounds(r){
 const a=gxy(r.a),b=gxy(r.b);
 return [Math.min(a[0],b[0])-14,Math.min(a[1],b[1])-14,Math.max(a[0],b[0])+14,Math.max(a[1],b[1])+14];
}
function buildingBounds(b){
 const a=gxy([b.minX,b.minY]),z=gxy([b.maxX,b.maxY]);
 return [a[0],a[1],z[0],z[1]];
}
function nearby(grid,point,radius){
 if(!grid?.size)return null;
 const [x,y]=gxy(point),indices=new Set();
 const x0=Math.floor((x-radius)/GRID_METRES),x1=Math.floor((x+radius)/GRID_METRES);
 const y0=Math.floor((y-radius)/GRID_METRES),y1=Math.floor((y+radius)/GRID_METRES);
 for(let i=x0;i<=x1;i++)for(let j=y0;j<=y1;j++)
  for(const k of grid.get(i+":"+j)||[])indices.add(k);
 return indices;
}
export class IstanbulMap{
 constructor(area,onReady,onError){
  this.area=area;this.roads=[];this.buildings=[];this.water=[];this.parks=[];this.nodes=new Map();this.edges=new Map();this.samples=[];this.lastRefresh=0;this.lastSeekRefresh=0;this.seekingLocalStreets=false;this.skids=[];this.vector=null;this.loaded=false;
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
  // When the player is waiting for a safe street, request newly loaded tiles
  // even if the old viewport already had many motorway features.
  const refreshWaitingStreets=()=>{
   if(!this.loaded||!this.seekingLocalStreets)return;
   const now=performance.now();
   if(now-this.lastSeekRefresh<700)return;
   this.lastSeekRefresh=now;
   const center=this.map.getCenter?.();
   this.refresh(center?[center.lng,center.lat]:AREAS[this.area].center,true);
  };
  this.map.on("sourcedata",()=>{
   if(!this.loaded)return;
   if(this.seekingLocalStreets)refreshWaitingStreets();
   else if(this.roads.length<15)this.refresh(AREAS[this.area].center,false);
  });
  this.map.on("moveend",refreshWaitingStreets);
  this.map.on("idle",refreshWaitingStreets);
 }
 jumpToArea(area){
  this.area=area;
  if(!this.loaded)return;
  this.map.jumpTo({center:AREAS[area].center,bearing:0,pitch:67,zoom:17.3});
  this.roads=[];this.buildings=[];this.water=[];this.parks=[];this.lastRefresh=0;
  setTimeout(()=>this.refresh(AREAS[area].center,true),700);
 }
 refresh(player,force=false){
  if(!this.loaded||!this.map?.isStyleLoaded())return;
  const now=performance.now();
  if(!force&&now-this.lastRefresh<3500)return;
  // Avoid regenerating thousands of static OSM meshes every few seconds.
  if(!force&&this.roads.length>=65&&this.lastGeometryPos&&distance(player,this.lastGeometryPos)<95&&now-(this.lastDataAt||0)<15500)return;
  this.lastRefresh=now;
  let features;
  try{features=this.map.querySourceFeatures(this.vector,{sourceLayer:"transportation"})}catch(e){return}
  if(!features?.length)return;
  const roads=[],uniq=new Set(),skip=/^(path|footway|steps|pedestrian|cycleway|track|construction)$/;
  for(const f of features){
   const typ=f.properties?.class||f.properties?.subclass||"";
   if(skip.test(typ))continue;
   const geom=f.geometry;
   const paths=geom?.type==="LineString"?[geom.coordinates]:geom?.type==="MultiLineString"?geom.coordinates:[];
   for(const path of paths)for(let j=1;j<path.length;j++){
    const from=path[j-1],to=path[j],length=distance(from,to);
    if(length<1.4||nearestOnSegment(player,from,to).dist>810)continue;
    // Real OSM avenues and embankments sometimes have 200m+ segments.
    // Keep them as drivable 80m sections instead of discarding them completely.
    const pieces=Math.max(1,Math.min(100,Math.ceil(length/80)));
    for(let k=0;k<pieces;k++){
     const t0=k/pieces,t1=(k+1)/pieces;
     const a=[from[0]+(to[0]-from[0])*t0,from[1]+(to[1]-from[1])*t0];
     const b=[from[0]+(to[0]-from[0])*t1,from[1]+(to[1]-from[1])*t1];
     if(nearestOnSegment(player,a,b).dist>810)continue;
     const len=distance(a,b),id=key(a)+"_"+key(b);
     if(uniq.has(id))continue;uniq.add(id);
     roads.push({a,b,len,typ,
       name:f.properties?.name||"",lanes:Number(f.properties?.lanes)||null,
       width:Number(f.properties?.width)||null,
       oneway:f.properties?.oneway===1||f.properties?.oneway==="yes",
       surface:f.properties?.surface||null,
       bridge:f.properties?.brunnel==="bridge"||f.properties?.bridge===1
      });
     if(roads.length>5200)break;
    }
    if(roads.length>5200)break;
   }
   if(roads.length>5200)break;
  }
  if(roads.length<2)return;
  this.lastGeometryPos=[...player];this.lastDataAt=now;
  // Tiles return transportation features in arbitrary order. Keep the local road corridor first:
  // previously the visible renderer took the first 800, leaving the car on a giant blank green plane.
  roads.sort((x,y)=>Math.min(distance(player,x.a),distance(player,x.b))-Math.min(distance(player,y.a),distance(player,y.b)));
  
  const connectedRoads=resolveJunctions(roads,player);
  connectedRoads.sort((x,y)=>Math.min(distance(player,x.a),distance(player,x.b))-Math.min(distance(player,y.a),distance(player,y.b)));
  this.roads=connectedRoads;this.roadGrid=makeGrid(connectedRoads,roadBounds);this.nodes=new Map();this.edges=new Map();this.samples=[];
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
   this.buildingGrid=makeGrid(collection,buildingBounds);
  }catch(e){this.buildings=[]}


  try{
   const parkFeatures=[
    ...(this.map.querySourceFeatures(this.vector,{sourceLayer:"landuse"})||[]),
    ...(this.map.querySourceFeatures(this.vector,{sourceLayer:"landcover"})||[])
   ];
   const green=[],seen=new Set();
   for(const f of parkFeatures){
    const cls=String(f.properties?.class||f.properties?.subclass||"").toLowerCase();
    if(!/park|grass|wood|forest|cemetery|garden|recreation/.test(cls))continue;
    const shape=f.geometry?.type==="Polygon"?[f.geometry.coordinates]:f.geometry?.type==="MultiPolygon"?f.geometry.coordinates:[];
    for(const poly of shape){
     const ring=poly?.[0];if(!ring||ring.length<3||ring.length>1100)continue;
     const keyId=ring[0][0].toFixed(5)+":"+ring[0][1].toFixed(5)+":"+cls;
     if(seen.has(keyId))continue;seen.add(keyId);
     const minX=Math.min(...ring.map(q=>q[0])),maxX=Math.max(...ring.map(q=>q[0]));
     const minY=Math.min(...ring.map(q=>q[1])),maxY=Math.max(...ring.map(q=>q[1]));
     const near=[Math.max(minX,Math.min(player[0],maxX)),Math.max(minY,Math.min(player[1],maxY))];
     if(distance(player,near)>570)continue;
     green.push({ring,cls,bounds:{minX,maxX,minY,maxY}});
     if(green.length>=75)break;
    }
    if(green.length>=75)break;
   }
   this.parks=green;
  }catch(e){this.parks=[]}
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
  for(const r of connectedRoads){
   const a=key(r.a),b=key(r.b);
   this.nodes.set(a,r.a);this.nodes.set(b,r.b);
   if(!this.edges.has(a))this.edges.set(a,[]);
   if(!this.edges.has(b))this.edges.set(b,[]);
   this.edges.get(a).push({node:b,d:r.len});
   this.edges.get(b).push({node:a,d:r.len});
   if(!/^(motorway|motorway_link|trunk)/.test(r.typ))
    this.samples.push([(r.a[0]+r.b[0])/2,(r.a[1]+r.b[1])/2]);
  }
 }

 insideBuilding(point){
  const candidates=nearby(this.buildingGrid,point,2);
  for(const i of candidates||this.buildings.keys()){
   const b=this.buildings[i];
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
  const candidates=nearby(this.roadGrid,point,90);
  let best=null;
  const scan=iter=>{for(const i of iter){
   const road=this.roads[i],z=nearestOnSegment(point,road.a,road.b);
   if(!best||z.dist<best.dist)best={...z,road};
  }};
  scan(candidates||this.roads.keys());
  if(!best&&this.roadGrid?.size)scan(nearby(this.roadGrid,point,340)||[]);
  if(!best)scan(this.roads.keys());
  return best;
 }
 nearest(point){
  const candidates=nearby(this.roadGrid,point,90);
  let best=null;
  for(const i of candidates||this.roads.keys()){
   const road=this.roads[i],z=nearestOnSegment(point,road.a,road.b);
   if(z.dist>100)continue;
   if(!best||z.dist<best.dist)best={...z,road};
  }
  return best;
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
  if(!this.loaded||!this.map)return;
  // Hidden MapLibre feeds OSM tiles; rotating it every .16s stalls actual driving.
  const now=performance.now(),last=this.lastTileMoveAt||0;
  const center=this.map.getCenter(),target=travel(position,bearing,30);
  const moved=distance([center.lng,center.lat],target);
  if(now-last<1650||moved<65)return;
  this.lastTileMoveAt=now;
  this.map.jumpTo({center:target,zoom:17.65,pitch:62,bearing:0});
 }
}
