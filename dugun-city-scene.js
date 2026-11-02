import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";
import {AREAS,rad,distance} from "./dugun-istanbul-map.js?v=20261102-v13";
import {makeCar} from "./dugun-3d-vehicles.js?v=20261102-v13";

// The road graph and building outlines come from the real OSM vector tiles.
// This is a standalone ground-level Three.js scene, NOT a tilted map layer.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=(a,b=0)=>{let n=Math.sin(a*12.9898+b*78.233)*43758.545;return n-Math.floor(n)};
const roadWidth=road=>{
 const type=typeof road==="string"?road:road?.typ||"";
 const defaultWidth=/^motorway$/.test(type)?29:/^motorway_link/.test(type)?9.8:/^(primary|trunk)/.test(type)?15:/^secondary/.test(type)?12:/^tertiary/.test(type)?10:/^(service|living_street)/.test(type)?5.7:7.8;
 const lanes=typeof road==="object"?road.lanes:null,width=typeof road==="object"?road.width:null;
 if(Number.isFinite(width)&&width>3)return clamp(width,5,34);
 if(Number.isFinite(lanes)&&lanes>=2)return clamp(lanes*3.05+2.2,7.7,34);
 return defaultWidth;
};
const buildingColors=["#d8c5ac","#eccfb2","#f2d6bd","#b2c5b9","#c5bfd0","#d9d9ca","#ebbaa7","#b1c3c6","#ead8c4","#c9d2b5"];
const shopColors=["#b83e52","#3f8182","#ba754e","#4f8475","#e2b15a"];
const toXY=(o,p)=>{const x=(p[0]-o[0])*111320*Math.cos((p[1]+o[1])*.5*rad),y=(p[1]-o[1])*111320;return [x,y]};
let terrainAt=(x,y)=>0;
function terrainModel(area,origin){
 // Stylized grades, not measured elevation.
 if(area==="istanbul"||area==="ortakoy"){
  const coastX=(29.02745-origin[0])*111320*Math.cos(origin[1]*rad);
  const offset=toXY(AREAS[area].center,origin);
  return (x,y)=>Math.max(0,(coastX-x)*.028)+.35*Math.max(0,Math.sin((y+offset[1])/155));
 }
 const offset=toXY(AREAS[area]?.center||origin,origin);
 if(area==="besiktas"||area==="karakoy"||area==="balat")
  return (x,y)=>Math.max(0,2.4+1.6*Math.sin((x+offset[0])/150)+1.1*Math.cos((y+offset[1])/190));
 return (x,y)=>Math.max(0,1.1+.9*Math.sin((x+offset[0])/220)+1.25*Math.cos((y+offset[1])/170));
}
const color=(hex)=>new THREE.Color(hex);
const windowMat=new THREE.MeshStandardMaterial({color:0x759aab,emissive:0x14262c,emissiveIntensity:.28,roughness:.28,metalness:.25,side:THREE.DoubleSide});
const lightMat=new THREE.MeshStandardMaterial({color:0xe5c899,emissive:0xc88c4b,emissiveIntensity:.30,side:THREE.DoubleSide});

function noiseTexture(kind){
 const canvas=document.createElement("canvas"),size=256;canvas.width=canvas.height=size;
 const c=canvas.getContext("2d"),image=c.createImageData(size,size);
 const asphalt=kind==="asphalt";
 let seed=asphalt?918222:14929;
 function next(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const off=(y*size+x)*4;
  const grain=(next()-.5)*(asphalt?43:24),base=asphalt?103:178;
  const fine=asphalt&&(x%3===0&&y%3===1)?-7:0;
  const variation=(Math.sin(x*.25)+Math.cos(y*.25))*(asphalt?2.5:1.5);
  const lum=Math.max(15,Math.min(240,base+grain+fine+variation));
  image.data[off]=lum;image.data[off+1]=lum+(asphalt?2:0);
  image.data[off+2]=lum+(asphalt?4:-8);image.data[off+3]=255;
 }
 c.putImageData(image,0,0);
 if(!asphalt){
  c.strokeStyle="rgba(91,82,68,.18)";c.lineWidth=2;
  for(let i=0;i<size;i+=42){c.beginPath();c.moveTo(i,0);c.lineTo(i,size);c.stroke();c.beginPath();c.moveTo(0,i);c.lineTo(size,i);c.stroke()}
 }
 const texture=new THREE.CanvasTexture(canvas);
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
 texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 return texture;
}

const roadMat=new THREE.MeshStandardMaterial({color:0xb7bdc0,map:noiseTexture("asphalt"),roughness:1,metalness:0});
const pavementMat=new THREE.MeshStandardMaterial({color:0xe2d5c2,map:noiseTexture("pavement"),roughness:.97});
const curbMat=new THREE.MeshStandardMaterial({color:0xf2e2c5,roughness:.88});
const lineMat=new THREE.MeshBasicMaterial({color:0xf4e6c3,side:THREE.DoubleSide});
const yellowMat=new THREE.MeshBasicMaterial({color:0xffcc6c,side:THREE.DoubleSide});
const trunkMat=new THREE.MeshStandardMaterial({color:0x776347,roughness:1});
const leavesMat=new THREE.MeshStandardMaterial({color:0x397f49,roughness:1,flatShading:true});
const leavesLightMat=new THREE.MeshStandardMaterial({color:0x5a9954,roughness:1,flatShading:true});
function meshBox(w,d,h,mat,x,y,z){
 const m=new THREE.Mesh(new THREE.BoxGeometry(w,d,h),mat);m.position.set(x,y,z);return m;
}
function emitQuad(positions,indices,p,q,width,z,onBridge=false){
 const dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy);
 if(len<.1)return;
 const nx=-dy/len*width*.5,ny=dx/len*width*.5,i=positions.length/3;
 positions.push(p[0]-nx,p[1]-ny,z+terrainAt(p[0]-nx,p[1]-ny)+bridgeLiftAt(p[0]-nx,p[1]-ny,onBridge),
 q[0]-nx,q[1]-ny,z+terrainAt(q[0]-nx,q[1]-ny)+bridgeLiftAt(q[0]-nx,q[1]-ny,onBridge),
 q[0]+nx,q[1]+ny,z+terrainAt(q[0]+nx,q[1]+ny)+bridgeLiftAt(q[0]+nx,q[1]+ny,onBridge),
 p[0]+nx,p[1]+ny,z+terrainAt(p[0]+nx,p[1]+ny)+bridgeLiftAt(p[0]+nx,p[1]+ny,onBridge));
 indices.push(i,i+1,i+2,i,i+2,i+3);
}
function batchStrips(list,mat,container){
 if(!list.positions.length)return;
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(list.positions,3));
 geo.setIndex(list.indices);
 const coords=[];
 for(let i=0;i<list.positions.length;i+=3){coords.push(list.positions[i]/7,list.positions[i+1]/7)}
 geo.setAttribute("uv",new THREE.Float32BufferAttribute(coords,2));
 geo.computeVertexNormals();
 const m=new THREE.Mesh(geo,mat);m.receiveShadow=true;m.renderOrder=mat===roadMat?2:mat===pavementMat?1:3;container.add(m);
}
const empty=()=>({positions:[],indices:[]});
function faceWindow(list,a,b,x,y,z,w=.92,h=1.10){
 const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
 if(!length)return;
 const ux=dx/length,uy=dy/length,nx=uy,ny=-ux;
 const midx=x+nx*.075,midy=y+ny*.075,r=w/2,i=list.positions.length/3;
 list.positions.push(midx-ux*r,midy-uy*r,z,midx+ux*r,midy+uy*r,z,midx+ux*r,midy+uy*r,z+h,midx-ux*r,midy-uy*r,z+h);
 list.indices.push(i,i+1,i+2,i,i+2,i+3);
}
function addTrees(group,places,limit,seed=1){
 if(!places.length)return;
 const count=Math.min(limit,places.length);
 const trunkGeo=new THREE.CylinderGeometry(.13,.21,2.7,5),leafGeo=new THREE.IcosahedronGeometry(1.4,1);
 const trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,count);
 const crowns=new THREE.InstancedMesh(leafGeo,leavesMat,count);
 const crowns2=new THREE.InstancedMesh(leafGeo,leavesLightMat,count);
 const dummy=new THREE.Object3D();
 for(let i=0;i<count;i++){
  const item=places[i],s=.76+hash(i+11,seed)*.75;
  dummy.position.set(item[0],item[1],1.45*s+terrainAt(item[0],item[1]));dummy.scale.set(s,s,s);dummy.rotation.set(0,0,hash(i+12)*6.28);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
  dummy.position.set(item[0],item[1],3.40*s+terrainAt(item[0],item[1]));dummy.scale.set(1.30*s,1.32*s,1.19*s);dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);
  dummy.position.set(item[0]+.52*s,item[1]-.44*s,4.14*s+terrainAt(item[0],item[1]));dummy.scale.set(.72*s,.8*s,.73*s);dummy.updateMatrix();crowns2.setMatrixAt(i,dummy.matrix);
 }
 group.add(trunks,crowns,crowns2);
}
function addStreetProps(group,origin,roads,mobile){
 const places=[],lamps=[],people=[];
 for(let i=0;i<roads.length;i++){
  const r=roads[i],a=toXY(origin,r.a),b=toXY(origin,r.b);
  const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),w=roadWidth(r);
  if(len<6)continue;
  for(let j=0;j<Math.floor(len/24);j++){
   const t=(j+.4)/(Math.floor(len/24)),px=a[0]+dx*t,py=a[1]+dy*t;
   const side=(i+j)%2?1:-1,normal=[-dy/len*side,dx/len*side];
   const p=[px+normal[0]*(w*.5+4.0),py+normal[1]*(w*.5+4.0)];
   const chance=hash(i*37+j,2);
   if(chance>.43&&places.length<(mobile?100:210))places.push(p);
   else if(chance<.17&&lamps.length<45)lamps.push(p);
   if(chance>.80&&people.length<(mobile?27:55))people.push([p[0]+normal[0]*1.1,p[1]+normal[1]*1.1,i+j]);
  }
 }
 addTrees(group,places,mobile?90:170);
 // Streetlights and warm lamps use instancing rather than individual real-time lights.
 const shaftGeo=new THREE.CylinderGeometry(.065,.10,5.5,6),headGeo=new THREE.BoxGeometry(.48,.42,.20);
 const poleMat=new THREE.MeshStandardMaterial({color:0x4e5759,metalness:.45,roughness:.6});
 const glowMat=new THREE.MeshBasicMaterial({color:0xffe5ab});
 const pole=new THREE.InstancedMesh(shaftGeo,poleMat,lamps.length),head=new THREE.InstancedMesh(headGeo,glowMat,lamps.length);
 const dummy=new THREE.Object3D();
 lamps.forEach((p,i)=>{
  dummy.position.set(p[0],p[1],2.80+terrainAt(...p));dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();pole.setMatrixAt(i,dummy.matrix);
  dummy.position.set(p[0],p[1],5.55+terrainAt(...p));dummy.updateMatrix();head.setMatrixAt(i,dummy.matrix);
 });
 group.add(pole,head);
 const torso=new THREE.InstancedMesh(new THREE.CylinderGeometry(.25,.26,.92,6),new THREE.MeshStandardMaterial({color:0x5d7d87}),people.length);
 const headPeople=new THREE.InstancedMesh(new THREE.SphereGeometry(.19,7,5),new THREE.MeshStandardMaterial({color:0xc89572}),people.length);
 people.forEach((p,i)=>{
  dummy.position.set(p[0],p[1],1.08+terrainAt(...p));dummy.scale.set(1,1,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();torso.setMatrixAt(i,dummy.matrix);
  dummy.position.z=1.72+terrainAt(p[0],p[1]);dummy.updateMatrix();headPeople.setMatrixAt(i,dummy.matrix);
  torso.setColorAt(i,color(["#d7645c","#eac86e","#597a9f","#678c6a"][i%4]));
 });
 group.add(torso,headPeople);
}
function roadJunctions(roads,origin,limit){
 const nodes=new Map();
 const cell=(p)=>{const xy=toXY(origin,p);return Math.round(xy[0]/1.7)+":"+Math.round(xy[1]/1.7)};
 for(const r of roads){
  for(const p of [r.a,r.b]){
   const k=cell(p);
   let n=nodes.get(k);
   if(!n){n={p:toXY(origin,p),degree:0,width:0,types:new Set(),used:0};nodes.set(k,n)}
   n.degree++;
   n.width=Math.max(n.width,roadWidth(r));
   n.types.add(r.typ);
  }
 }
 return [...nodes.values()].filter(n=>n.degree>=3&&n.types.size>=1)
 .sort((a,b)=>Math.hypot(a.p[0],a.p[1])-Math.hypot(b.p[0],b.p[1]))
 .slice(0,limit);
}
function addIntersectionDisk(out,x,y,r,z){
 const seg=14,i=out.positions.length/3,h=terrainAt(x,y)+z;
 out.positions.push(x,y,h);
 for(let k=0;k<=seg;k++){
  const t=k/seg*Math.PI*2,xx=x+Math.cos(t)*r,yy=y+Math.sin(t)*r;
  out.positions.push(xx,yy,z+terrainAt(xx,yy));
 }
 for(let k=1;k<=seg;k++)out.indices.push(i,i+k,i+k+1);
}
function createRoads(group,origin,roads,mobile){
 const sidewalk=empty(),asphalt=empty(),intersection=empty(),curbs=empty(),
  markings=empty(),sideLine=empty(),stopBars=empty();
 const max=mobile?560:1550;
 const near=roads.filter(r=>{
  const center=[(r.a[0]+r.b[0])*.5,(r.a[1]+r.b[1])*.5];
  return Math.min(distance(center,origin),distance(r.a,origin),distance(r.b,origin))<(mobile?425:590);
 }).sort((a,b)=>Math.min(distance(a.a,origin),distance(a.b,origin))-Math.min(distance(b.a,origin),distance(b.b,origin))).slice(0,max);
 // Draw actual filled connected road intersections instead of disconnected ribbons.
 const junctions=roadJunctions(near.filter(r=>!r.bridge),origin,mobile?90:180);
 const squares=new Map(),index=(p)=>{const xy=toXY(origin,p);return Math.round(xy[0]/1.7)+":"+Math.round(xy[1]/1.7)};
 for(const j of junctions){
  squares.set(Math.round(j.p[0]/1.7)+":"+Math.round(j.p[1]/1.7),j);
  addIntersectionDisk(intersection,j.p[0],j.p[1],Math.max(3,j.width*.52),.146);
 }
 for(let i=0;i<near.length;i++){
  const r=near[i],a=toXY(origin,r.a),b=toXY(origin,r.b);
  const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
  if(len<1.0)continue;
  const ux=dx/len,uy=dy/len,nx=-uy,ny=ux,width=roadWidth(r),onBridge=!!r.bridge&&/^(motorway|motorway_link|trunk|primary)/.test(r.typ);
  if(!/^(motorway|motorway_link|trunk)/.test(r.typ))emitQuad(sidewalk.positions,sidewalk.indices,a,b,width+4.7,.105);
  emitQuad(asphalt.positions,asphalt.indices,a,b,width,.147,onBridge);
  for(const sign of [-1,1]){
   emitQuad(curbs.positions,curbs.indices,
     [a[0]+nx*sign*(width*.5+.10),a[1]+ny*sign*(width*.5+.10)],
     [b[0]+nx*sign*(width*.5+.10),b[1]+ny*sign*(width*.5+.10)],.24,.179,onBridge);
  }
  // Asphalt edge shoulder line for medium roads and larger.
  if(width>=9.5){
   for(const side of [-1,1])emitQuad(sideLine.positions,sideLine.indices,
    [a[0]+nx*side*(width*.5-.56),a[1]+ny*side*(width*.5-.56)],
    [b[0]+nx*side*(width*.5-.56),b[1]+ny*side*(width*.5-.56)],.10,.211,onBridge);
  }
  // White broken lane lines in the Turkish driving direction, never in short alleys.
  if(width>=9.4&&len>11){
   for(let d=5;d<len-2;d+=12){
    const l=Math.min(5.4,len-d-1),p=[a[0]+ux*d,a[1]+uy*d],q=[p[0]+ux*l,p[1]+uy*l];
    emitQuad(markings.positions,markings.indices,p,q,.13,.211,onBridge);
   }
  }
  // Zebra crossings and stop bars are placed only at mapped 3+ way junctions.
  if(len>11&&!/^(motorway|motorway_link|trunk)/.test(r.typ)){
   for(const endpoint of [0,1]){
    const node=squares.get(index(endpoint===0?r.a:r.b));
    if(!node)continue;
    const inward=endpoint===0?1:-1;
    const sx=(endpoint===0?a[0]:b[0])+ux*inward*4.2;
    const sy=(endpoint===0?a[1]:b[1])+uy*inward*4.2;
    const count=Math.max(4,Math.min(10,Math.floor((width-1.6)/.95)));
    for(let k=0;k<count;k++){
     const lateral=(k-(count-1)/2)*.98;
     const p=[sx+nx*lateral-ux*.95,sy+ny*lateral-uy*.95];
     const q=[sx+nx*lateral+ux*.95,sy+ny*lateral+uy*.95];
     emitQuad(markings.positions,markings.indices,p,q,.53,.224);
    }
    const p=[sx+ux*inward*3+nx*(width*.46),sy+uy*inward*3+ny*(width*.46)];
    const q=[sx+ux*inward*3-nx*(width*.46),sy+uy*inward*3-ny*(width*.46)];
    emitQuad(stopBars.positions,stopBars.indices,p,q,.26,.223);
   }
  }
 }
 batchStrips(sidewalk,pavementMat,group);batchStrips(asphalt,roadMat,group);
 batchStrips(intersection,roadMat,group);batchStrips(curbs,curbMat,group);
 batchStrips(markings,lineMat,group);batchStrips(stopBars,lineMat,group);batchStrips(sideLine,lineMat,group);
 const localStreets=near.filter(r=>!/^(motorway|motorway_link|trunk)/.test(r.typ));
 addStreetProps(group,origin,localStreets,mobile);
 return localStreets;
}

function renderRealParks(group,origin,parks,mobile){
 const materials={
  park:new THREE.MeshStandardMaterial({color:0x679d6b,roughness:1,side:THREE.DoubleSide}),
  wood:new THREE.MeshStandardMaterial({color:0x4e865a,roughness:1,side:THREE.DoubleSide}),
  grass:new THREE.MeshStandardMaterial({color:0x87ad72,roughness:1,side:THREE.DoubleSide})
 };
 let count=0;
 for(const park of (parks||[])){
  const ring=park.ring;if(!ring||ring.length<3)continue;
  const xy=ring.map(p=>toXY(origin,p)),shape=new THREE.Shape();
  shape.moveTo(...xy[0]);for(let i=1;i<xy.length;i++)shape.lineTo(...xy[i]);shape.closePath();
  const geo=new THREE.ShapeGeometry(shape),pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++)pos.setZ(i,terrainAt(pos.getX(i),pos.getY(i))-.075);
  geo.computeVertexNormals();
  const material=/wood|forest/.test(park.cls)?materials.wood:/grass/.test(park.cls)?materials.grass:materials.park;
  const mesh=new THREE.Mesh(geo,material);mesh.receiveShadow=true;mesh.renderOrder=0;group.add(mesh);
  if(++count>=(mobile?32:60))break;
 }
 return count;
}
function renderParkedStreetCars(group,origin,roads,mobile,player){
 const capped=mobile?5:12;
 const palette=["#c4d1ca","#b78b82","#e2c9a1","#96aabd","#6f7f8b","#d1c4bb","#e7b85c"];
 const positions=[];
 for(let i=0;i<roads.length&&positions.length<capped;i++){
  const r=roads[i];
  const len=distance(r.a,r.b),dist=distance([(r.a[0]+r.b[0])*.5,(r.a[1]+r.b[1])*.5],player);
  if(len<34||dist>275||dist<25||i%7!==0||/trunk|motorway/.test(r.typ))continue;
  const point=[r.a[0]+(r.b[0]-r.a[0])*.42,r.a[1]+(r.b[1]-r.a[1])*.42];
  const heading=Math.atan2((r.b[0]-r.a[0])*Math.cos(point[1]*rad),r.b[1]-r.a[1]);
  const side=i%2?-1:1;
  const width=roadWidth(r)*.5;
  const p=[point[0]+Math.sin(heading+side*Math.PI/2)*(width-1.3)/(111320*Math.cos(point[1]*rad)),
    point[1]+Math.cos(heading+side*Math.PI/2)*(width-1.3)/111320];
  positions.push({pos:p,heading:heading+(side<0?Math.PI:0),style:i});
 }
 for(const parked of positions){
  const model=makeCar(parked.style%5===0?"doblo":"sahin",palette[parked.style%palette.length]);
  const xy=toXY(origin,parked.pos);
  model.position.set(xy[0],xy[1],terrainAt(...xy)+.15);
  model.rotation.z=-parked.heading;
  model.traverse(obj=>{if(obj.isMesh)obj.castShadow=false});
  group.add(model);
 }
}

function addBuildings(group,origin,raw,mobile){
 const buildings=raw.filter(b=>{
  const c=[(b.minX+b.maxX)*.5,(b.minY+b.maxY)*.5];
  return distance(c,origin)<(mobile?330:475);
 }).sort((a,b)=>{
  const da=Math.hypot(...toXY(origin,[(a.minX+a.maxX)*.5,(a.minY+a.maxY)*.5]));
  const db=Math.hypot(...toXY(origin,[(b.minX+b.maxX)*.5,(b.minY+b.maxY)*.5]));
  return da-db;
 }).slice(0,mobile?240:490);
 const windows=empty(),litWindows=empty(),awnings=empty(),roofTiles=[empty(),empty(),empty()];
 const mats=buildingColors.map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.88,flatShading:true}));
 for(let i=0;i<buildings.length;i++){
  const b=buildings[i],ring=b.ring?.slice(0,-1)??[];
  if(ring.length<3)continue;
  const pts=ring.map(p=>toXY(origin,p));
  const maxDist=Math.max(...pts.map(p=>Math.hypot(p[0],p[1])));
  if(maxDist>750)continue;
  const x=(b.minX+b.maxX)*.5,lat=(b.minY+b.maxY)*.5,hseed=hash(x*1e5,lat*1e5);
  const height=b.height&&Number.isFinite(b.height)?clamp(b.height,5,48):Math.round(3.5+(hseed*.78+.11)*8)*3.15;
  const shape=new THREE.Shape();shape.moveTo(...pts[0]);for(let j=1;j<pts.length;j++)shape.lineTo(...pts[j]);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:1,steps:1});
  const m=new THREE.Mesh(geo,mats[Math.floor(hseed*mats.length)]);m.position.z=terrainAt(pts[0][0],pts[0][1]);m.castShadow=!mobile&&Math.hypot(pts[0][0],pts[0][1])<110;m.receiveShadow=true;group.add(m);
  // Distinctive terracotta and zinc roofs; merged into three draw calls rather
  // than hundreds of individual rooftop meshes.
  const roof=roofTiles[Math.min(2,Math.floor(hseed*3))];
  const baseZ=terrainAt(pts[0][0],pts[0][1])+height+.075;
  const middle=pts.reduce((acc,p)=>[acc[0]+p[0],acc[1]+p[1]],[0,0]).map(n=>n/pts.length);
  const roofRidge=height<23&&pts.length<=8?Math.min(2.2,height*.09):.08;
  const idx=roof.positions.length/3;
  roof.positions.push(middle[0],middle[1],baseZ+roofRidge);
  for(const p of pts)roof.positions.push(p[0],p[1],baseZ);
  for(let k=1;k<=pts.length;k++)roof.indices.push(idx,idx+k,idx+(k%pts.length)+1);

  const maxFloors=Math.min(mobile?4:8,Math.floor((height-1.5)/3.1));
  for(let edge=0;edge<pts.length;edge++){
   const a=pts[edge],v=pts[(edge+1)%pts.length],dx=v[0]-a[0],dy=v[1]-a[1],len=Math.hypot(dx,dy);
   if(len<3.8)continue;
   const count=Math.min(7,Math.floor(len/3.1));
   for(let floor=0;floor<maxFloors;floor++){
    for(let col=0;col<count;col++){
     const t=(col+.5)/count;
     faceWindow((hash(i*4+edge*17+floor,col)>.91)?litWindows:windows,a,v,a[0]+dx*t,a[1]+dy*t,2.0+floor*3.1,.82,1.15);
    }
   }
   // Colorful shop awnings near street level.
   if(hseed>.73&&len>6&&Math.hypot(a[0],a[1])<(mobile?160:260)){
    const mid=[(a[0]+v[0])*.5,(a[1]+v[1])*.5],normal=[dy/len,-dx/len],half=Math.min(3.8,len*.35);
    emitQuad(awnings.positions,awnings.indices,
      [mid[0]-dx/len*half+normal[0]*1.1,mid[1]-dy/len*half+normal[1]*1.1],
      [mid[0]+dx/len*half+normal[0]*1.1,mid[1]+dy/len*half+normal[1]*1.1],2.3,3.3);
   }
  }
 }
 batchStrips(windows,windowMat,group);batchStrips(litWindows,lightMat,group);
 batchStrips(awnings,new THREE.MeshStandardMaterial({color:0xb44957,side:THREE.DoubleSide,roughness:.8}),group);
 const roofs=["#ae654d","#83766a","#7e8c91"];
 for(let i=0;i<3;i++)batchStrips(roofTiles[i],
  new THREE.MeshStandardMaterial({color:roofs[i],side:THREE.DoubleSide,roughness:.94}),group);

 return buildings.length;
}
function makeGround(group){
 // City blocks are warm urban stone, not a flat golf course.
 const groundTexture=noiseTexture("pavement");
 groundTexture.repeat.set(220,220);
 const geometry=new THREE.PlaneGeometry(2400,2400,48,48);
 const pos=geometry.attributes.position;
 for(let i=0;i<pos.count;i++)pos.setZ(i,terrainAt(pos.getX(i),pos.getY(i)));
 geometry.computeVertexNormals();
 const m=new THREE.Mesh(geometry,
  new THREE.MeshStandardMaterial({color:0xb8b8a2,map:groundTexture,roughness:1}));
 m.position.z=-.22;m.receiveShadow=true;group.add(m);
}
function addWater(group,origin,waters,mobile){
 const material=new THREE.MeshPhysicalMaterial({color:0x247aa5,roughness:.25,metalness:.10,transparent:true,opacity:.96,side:THREE.DoubleSide,depthWrite:true});
 const lineMaterial=new THREE.MeshBasicMaterial({color:0x9fd5dd,transparent:true,opacity:.50});
 let count=0;
 for(const item of (waters||[])){
  for(const rings of [item.rings]){
   if(!rings?.[0]||rings[0].length<3)continue;
   const outer=rings[0].map(p=>toXY(origin,p));
   if(outer.length>1200)continue;
   const shape=new THREE.Shape();shape.moveTo(...outer[0]);
   for(let i=1;i<outer.length;i++)shape.lineTo(...outer[i]);shape.closePath();
   for(let j=1;j<rings.length;j++){
    const hole=new THREE.Path(),pts=rings[j].map(p=>toXY(origin,p));
    if(pts.length<3)continue;
    hole.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)hole.lineTo(...pts[i]);hole.closePath();shape.holes.push(hole);
   }
   const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),material);
   mesh.position.z=.26;mesh.renderOrder=1;group.add(mesh);
   if(++count>38)return count;
  }
 }
 return count;
}


// Recognizable Bosphorus waterway when vector tile water polygons have not loaded.
// A deliberately simplified geographic ribbon; it never replaces real OSM road positions.
function renderBosphorusWaterway(group,origin,mobile){
 const west=[
  [29.0290,41.0570],[29.0283,41.0530],[29.0273,41.0490],
  [29.0277,41.0460],[29.0285,41.0420],[29.0287,41.0370],[29.0282,41.0335]
 ];
 const east=[
  [29.0395,41.0335],[29.0395,41.0380],[29.0404,41.0420],
  [29.0434,41.0470],[29.0445,41.0520],[29.0424,41.0570]
 ];
 const path=[...west,...east],nearest=Math.min(...path.map(p=>distance(p,origin)));
 if(nearest>1100)return 0;
 const meshShape=new THREE.Shape();
 const xy=path.map(p=>toXY(origin,p));
 meshShape.moveTo(...xy[0]);for(let i=1;i<xy.length;i++)meshShape.lineTo(...xy[i]);meshShape.closePath();
 const mesh=new THREE.Mesh(new THREE.ShapeGeometry(meshShape),
  new THREE.MeshStandardMaterial({color:0x3484a5,metalness:.10,roughness:.39,
   side:THREE.DoubleSide,transparent:true,opacity:.98}));
 mesh.position.z=.042;mesh.receiveShadow=false;mesh.renderOrder=1;
 group.add(mesh);
 // Floating light on the Bosphorus: small glints, drawn as a single instanced mesh.
 const waterGlint=new THREE.MeshBasicMaterial({color:0xaddde2,transparent:true,opacity:.36,depthWrite:false});
 const count=mobile?45:95,geometry=new THREE.PlaneGeometry(2.5,.10);
 const foam=new THREE.InstancedMesh(geometry,waterGlint,count),dummy=new THREE.Object3D();
 for(let j=0;j<count;j++){
  const t=(j+.5)/count;
  const along=west[1][1]-(west[1][1]-west[west.length-2][1])*t;
  const xWest=29.0281,xEast=29.0408;
  const lon=xWest+(xEast-xWest)*(.20+.6*hash(j+11,6.2));
  const y=along+((hash(j,18.4)-.5)*.0010);
  const [xCoord,yCoord]=toXY(origin,[lon,y]);
  dummy.position.set(xCoord,yCoord,.065);dummy.rotation.z=(hash(j,10)-.5)*.5;
  dummy.scale.set(.55+hash(j,14)*2,1,1);dummy.updateMatrix();foam.setMatrixAt(j,dummy.matrix);
 }
 foam.instanceMatrix.needsUpdate=true;foam.frustumCulled=false;group.add(foam);
 return 1;
}

// Approximate scenic bridge geometry. The actual street positions continue to
// come from OSM; this model is not a photogrammetric reconstruction.
const BOSPHORUS_WEST=[29.0294,41.0470];
const BOSPHORUS_EAST=[29.0416,41.0428];
let bridgeWorldOrigin=null,bridgeCache=null;
function bridgeSection(){
 if(!bridgeWorldOrigin)return null;
 if(bridgeCache)return bridgeCache;
 const a=toXY(bridgeWorldOrigin,BOSPHORUS_WEST),b=toXY(bridgeWorldOrigin,BOSPHORUS_EAST);
 const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
 return bridgeCache={a,b,dx,dy,len,ux:dx/len,uy:dy/len};
}
function bridgeLiftAt(x,y,onBridge=false){
 if(!onBridge)return 0;
 const b=bridgeSection();if(!b)return 0;
 const px=x-b.a[0],py=y-b.a[1];
 const along=(px*b.ux+py*b.uy)/b.len;
 const cross=Math.abs(px*b.uy-py*b.ux);
 if(cross>38||along<-.32||along>1.32)return 0;
 const approach=along<0?Math.max(0,(along+.32)/.32):
               along>1?Math.max(0,(1.32-along)/.32):1;
 // Smooth lateral envelope, no sudden elevation cliff at the bridge edge.
 const t=Math.max(0,Math.min(1,(38-cross)/14));
 const laneFactor=t*t*(3-2*t);
 return 39.45*approach*laneFactor;
}
function makeBosphorusBridge(group,origin,player){
 const section=bridgeSection();if(!section)return 0;
 const {a,b,ux,uy,len}=section;
 const midpoint=[(a[0]+b[0])/2,(a[1]+b[1])/2];
 const near=Math.min(Math.hypot(...a),Math.hypot(...b),Math.hypot(...midpoint));
 if(near>1250)return 0;
 const steel=new THREE.MeshStandardMaterial({color:0xb7bfc5,metalness:.65,roughness:.46});
 const asphalt=new THREE.MeshStandardMaterial({color:0x414e57,roughness:.93});
 const guard=new THREE.MeshStandardMaterial({color:0xd2d7d6,metalness:.56,roughness:.44});
 const stripe=new THREE.MeshBasicMaterial({color:0xfff5d7});
 const cable=new THREE.MeshStandardMaterial({color:0xc0cbd0,metalness:.72,roughness:.35});
 const theta=-Math.atan2(ux,uy);
 const addBox=(w,d,h,x,y,z,mat)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,d,h),mat);
  mesh.position.set(x,y,z);mesh.rotation.z=theta;
  mesh.receiveShadow=true;group.add(mesh);return mesh;
 };
 // Six-lane-looking original deck, centered on the 15 July bridge axis.
 addBox(32,len,1.9,midpoint[0],midpoint[1],38.5,steel);
 addBox(29.8,len,.13,midpoint[0],midpoint[1],39.5,asphalt);
 const sideX=-uy,sideY=ux;
 for(const side of [-1,1]){
  addBox(.35,len,1.2,midpoint[0]+sideX*side*16,midpoint[1]+sideY*side*16,40.2,guard);
 }
 const markN=5*Math.max(0,Math.ceil((len-22)/18));
 const marks=new THREE.InstancedMesh(new THREE.BoxGeometry(.12,7,.025),stripe,markN);
 const markDummy=new THREE.Object3D();let markIndex=0;
 for(let lane=-2;lane<=2;lane++){
  for(let j=10;j<len-12;j+=18){
   const lateral=lane*4.8;
   const x=a[0]+ux*j+sideX*lateral,y=a[1]+uy*j+sideY*lateral;
   markDummy.position.set(x,y,39.59);markDummy.rotation.z=theta;markDummy.updateMatrix();
   marks.setMatrixAt(markIndex++,markDummy.matrix);
  }
 }
 marks.count=markIndex;marks.instanceMatrix.needsUpdate=true;group.add(marks);
 // Two bridge towers. Location and scale are approximate; cables visually
 // connect to a hanging suspension profile over the full central span.
 const towerHeight=124,towerWidth=32;
 for(const p of [a,b]){
  for(const side of [-1,1]){
   const x=p[0]+sideX*(towerWidth/2),y=p[1]+sideY*(towerWidth/2);
   addBox(2.4,3.0,towerHeight,x,y,39+towerHeight/2,steel);
  }
  addBox(towerWidth+3,3.5,2.4,p[0],p[1],148,steel);
  addBox(towerWidth+3,3.5,1.8,p[0],p[1],118,steel);
 }
 const verticals=new THREE.InstancedMesh(new THREE.CylinderGeometry(.11,.11,1,5),cable,2*(Math.floor(len/27)-1));
 const dummy=new THREE.Object3D();let rodIndex=0;
 for(const side of [-1,1]){
  const lateral=side*16.6;
  const points=[];
  for(let i=0;i<=56;i++){
   const t=i/56;
   const sag=44*(4*t*(1-t));
   points.push(new THREE.Vector3(a[0]+ux*len*t+sideX*lateral,
     a[1]+uy*len*t+sideY*lateral,165-sag));
  }
  const curve=new THREE.CatmullRomCurve3(points);
  const c=new THREE.Mesh(new THREE.TubeGeometry(curve,92,.22,5,false),cable);
  c.frustumCulled=false;group.add(c);
  for(let j=1;j<len/27;j++){
   const t=j*27/len,z=165-44*(4*t*(1-t)),h=z-40.4;
   const x=a[0]+ux*len*t+sideX*lateral,y=a[1]+uy*len*t+sideY*lateral;
   dummy.position.set(x,y,40.4+h/2);dummy.scale.set(1,h,1);dummy.updateMatrix();
   if(rodIndex<verticals.count)verticals.setMatrixAt(rodIndex++,dummy.matrix);
  }
 }
 verticals.count=rodIndex;
 verticals.instanceMatrix.needsUpdate=true;
 group.add(verticals);
 const name=createWorldLabel("15 TEMMUZ ŞEHİTLER KÖPRÜSÜ","#25526b","#faf8df");
 name.scale.set(24,2,1);name.position.set(a[0],a[1],169);
 group.add(name);
 return 1;
}


// Beylerbeyi shore: purpose-made, stylized Ottoman waterfront palace.
// This is an architectural illustration aligned to the real neighborhood,
// not measured facade geometry.
function addBeylerbeyiWaterfront(group,origin){
 const location=[29.0400,41.0426],p=toXY(origin,location);
 if(Math.hypot(...p)>570)return;
 const stone=new THREE.MeshStandardMaterial({color:0xe1d3bd,roughness:.88});
 const cream=new THREE.MeshStandardMaterial({color:0xf3e7d4,roughness:.86});
 const roof=new THREE.MeshStandardMaterial({color:0x687f83,roughness:.74});
 const trim=new THREE.MeshStandardMaterial({color:0xc0aa91,roughness:.8});
 const glass=new THREE.MeshStandardMaterial({color:0x64858f,roughness:.24,metalness:.16});
 const garden=new THREE.MeshStandardMaterial({color:0x648b5d,roughness:1});
 const scene=new THREE.Group();
 scene.position.set(p[0],p[1],terrainAt(...p)+.35);
 scene.rotation.z=-.28;
 scene.add(meshBox(37,17,6.6,cream,0,0,3.4));
 scene.add(meshBox(41,20,1.2,stone,0,0,.40));
 scene.add(meshBox(37.8,18.5,1.1,trim,0,0,6.9));
 scene.add(meshBox(39,19,5.3,stone,0,0,10.1));
 scene.add(meshBox(41,20,1.3,trim,0,0,13.2));
 scene.add(meshBox(42,21,1.15,roof,0,0,14.2));
 for(const face of [-1,1])for(let i=-6;i<=6;i++){
  scene.add(meshBox(.9,.9,9,cream,i*2.65,face*10.1,8.4));
  if(i%2===0)scene.add(meshBox(1.4,.25,3.4,glass,i*2.65,face*10.4,10.6));
 }
 for(const x of [-22,-19,19,22]){
  const cypress=new THREE.Mesh(new THREE.ConeGeometry(1.6,12,9),garden);
  cypress.position.set(x,6,6);scene.add(cypress);
 }
 const label=createWorldLabel("BEYLERBEYİ SAHİLİ","#345c67","#fff9dd");
 label.position.set(0,0,18);label.scale.set(14,2.0,1);scene.add(label);
 group.add(scene);
}
function addBosphorusPromenade(group,origin){
 const shore=[[29.0258,41.0483],[29.0266,41.04775],[29.02715,41.04725],[29.0278,41.0468]];
 const nearest=Math.min(...shore.map(p=>distance(p,origin)));
 if(nearest>570)return;
 const railing=new THREE.MeshStandardMaterial({color:0x536671,metalness:.52,roughness:.55});
 const wood=new THREE.MeshStandardMaterial({color:0x85694b,roughness:.89});
 for(let i=0;i<shore.length-1;i++){
  const aa=toXY(origin,shore[i]),bb=toXY(origin,shore[i+1]);
  const dx=bb[0]-aa[0],dy=bb[1]-aa[1],len=Math.hypot(dx,dy),n=Math.ceil(len/9);
  const angle=-Math.atan2(dx,dy);
  const rail=new THREE.Mesh(new THREE.BoxGeometry(.12,len, .12),railing);
  rail.position.set((aa[0]+bb[0])/2,(aa[1]+bb[1])/2,terrainAt(...aa)+1.10);
  rail.rotation.z=angle;group.add(rail);
  for(let j=0;j<=n;j++){
   const t=j/n,x=aa[0]+dx*t,y=aa[1]+dy*t;
   const pole=meshBox(.12,.13,1.15,railing,x,y,terrainAt(x,y)+.575);
   group.add(pole);
  }
  if(i%2===0){
   const bench=new THREE.Group();
   bench.position.set(aa[0]-3,aa[1],terrainAt(...aa)+.5);bench.rotation.z=angle;
   bench.add(meshBox(2.1,.62,.18,wood,0,0,0));
   bench.add(meshBox(2.1,.12,.75,wood,0,-.24,.42));group.add(bench);
  }
 }
}

function addOrtakoyLandmark(group,origin,area){
 if(area!=="istanbul"&&area!=="ortakoy")return;
 // Grounded approximate site of Büyük Mecidiye/Ortaköy Mosque; stylized original model.
 const [x,y]=toXY(origin,[29.02694,41.04722]);
 if(Math.hypot(x,y)>550)return;
 const cream=new THREE.MeshStandardMaterial({color:0xf3e7d1,roughness:.85});
 const trim=new THREE.MeshStandardMaterial({color:0xc5a985,roughness:.88});
 const dome=new THREE.MeshStandardMaterial({color:0x8ca0a5,metalness:.20,roughness:.60});
 const g=new THREE.Group();g.position.set(x,y,.14+terrainAt(x,y));
 g.add(meshBox(16,15,10,cream,0,0,5));
 g.add(meshBox(17,16,.75,trim,0,0,10));
 const main=new THREE.Mesh(new THREE.SphereGeometry(6.0,20,12,0,Math.PI*2,0,Math.PI*.54),dome);
 main.rotation.x=Math.PI/2;main.position.z=10.7;g.add(main);
 for(const dx of [-9.8,9.8]){
  const minaret=new THREE.Mesh(new THREE.CylinderGeometry(.75,1.15,25,12),cream);
  minaret.rotation.x=Math.PI/2;minaret.position.set(dx,0,12.5);g.add(minaret);
  const balcony=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.35,.48,12),trim);
  balcony.rotation.x=Math.PI/2;balcony.position.set(dx,0,22.3);g.add(balcony);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(1.0,3.2,12),dome);
  tip.rotation.x=Math.PI/2;tip.position.set(dx,0,27.0);g.add(tip);
 }
 // Distinctive original Istanbul double-deck ferries; no borrowed game assets.
 const hull=new THREE.MeshStandardMaterial({color:0x365b6c,roughness:.55,metalness:.12});
 const cabin=new THREE.MeshStandardMaterial({color:0xf0e7d1,roughness:.71});
 const windows=new THREE.MeshStandardMaterial({color:0x31657a,roughness:.27,metalness:.18});
 const orange=new THREE.MeshStandardMaterial({color:0xf5a235,roughness:.64});
 const deck=new THREE.MeshStandardMaterial({color:0xd5d3c5,roughness:.77});
 for(const [index,where] of [[0,[29.0299,41.04845]],[1,[29.0304,41.04465]]]){
  const [bx,by]=toXY(origin,where),ferry=new THREE.Group();
  if(Math.hypot(bx,by)>650)continue;
  ferry.position.set(bx,by,.47);ferry.rotation.z=index?.15:-.34;
  ferry.add(meshBox(27,7.2,2.3,hull,0,0,1.0));
  ferry.add(meshBox(22,6.65,.40,deck,0,0,2.3));
  ferry.add(meshBox(20,6.1,3.2,cabin,-1.4,0,4.1));
  ferry.add(meshBox(16,5.7,2.9,cabin,-1.5,0,7.0));
  ferry.add(meshBox(14.3,5.9,.45,deck,-1.5,0,8.55));
  for(let w=-7;w<=7;w+=2.3){
   ferry.add(meshBox(1.25,.15,1.4,windows,w,3.12,4.6));
   ferry.add(meshBox(1.25,.15,1.4,windows,w,-3.12,4.6));
  }
  const funnel=new THREE.Mesh(new THREE.CylinderGeometry(.8,.98,3.2,10),orange);
  funnel.rotation.x=Math.PI/2;funnel.position.set(-5,0,10.0);ferry.add(funnel);
  ferry.add(meshBox(1.4,1.4,.45,windows,-5,0,11.7));
  group.add(ferry);
 }
 const sign=createWorldLabel("ORTAKÖY CAMİİ","#2a626e","#ffffff");
 sign.position.set(0,0,23);sign.scale.set(9,2.0,1);g.add(sign);
 group.add(g);
}

function makeSceneTexture(text,bg,fg){
 const canvas=document.createElement("canvas");canvas.width=512;canvas.height=170;
 const c=canvas.getContext("2d");c.fillStyle=bg;c.fillRect(0,0,512,170);
 c.fillStyle=fg;c.font="900 58px system-ui";c.textAlign="center";c.textBaseline="middle";c.fillText(text,256,85);
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;return tex;
}
function makeSign(text){
 const group=new THREE.Group();
 const postMat=new THREE.MeshStandardMaterial({color:0x66716d,metalness:.5,roughness:.52});
 group.add(meshBox(.17,.17,5.2,postMat,0,0,2.5));
 const face=new THREE.Mesh(new THREE.PlaneGeometry(6.3,2.0),new THREE.MeshBasicMaterial({map:makeSceneTexture(text,"#23665a","#ffffff"),side:THREE.DoubleSide}));
 face.position.set(0,.05,5.6);face.rotation.x=Math.PI/2;
 group.add(face);return group;
}

function makeGuestActor(){
 const g=new THREE.Group(),trouser=new THREE.MeshStandardMaterial({color:0x344963,roughness:1});
 const jacket=new THREE.MeshStandardMaterial({color:0xd5b1bd,roughness:.88});
 const skin=new THREE.MeshStandardMaterial({color:0xdfac85,roughness:1});
 const shoe=new THREE.MeshStandardMaterial({color:0x2e3842,roughness:1});
 const hat=new THREE.MeshStandardMaterial({color:0x5c4352,roughness:1});
 for(const x of [-.20,.20]){
  g.add(meshBox(.29,.36,.83,trouser,x,0,.52));
  g.add(meshBox(.34,.50,.17,shoe,x,.12,.15));
 }
 g.add(meshBox(.91,.47,.99,jacket,0,0,1.43));
 const head=new THREE.Mesh(new THREE.SphereGeometry(.29,12,9),skin);head.position.z=2.14;g.add(head);
 const hair=new THREE.Mesh(new THREE.SphereGeometry(.32,10,7),hat);hair.position.z=2.36;hair.scale.set(1,1,.35);g.add(hair);
 const left=new THREE.Group();left.position.set(-.59,0,1.88);
 left.add(meshBox(.27,.27,.76,jacket,0,0,-.35));g.add(left);
 const right=new THREE.Group();right.position.set(.59,0,1.92);
 right.add(meshBox(.25,.26,.72,jacket,0,0,.24));
 const hand=new THREE.Mesh(new THREE.SphereGeometry(.14,8,7),skin);hand.position.z=.64;right.add(hand);g.add(right);
 const suitcase=new THREE.Group();
 suitcase.add(meshBox(.57,.30,.43,new THREE.MeshStandardMaterial({color:0x9b7445}),-.87,.01,.43));
 suitcase.add(meshBox(.26,.06,.11,shoe,-.87,.0,.72));g.add(suitcase);
 g.userData.waveArm=right;
 const mat=new THREE.MeshBasicMaterial({color:0xffe2a5,transparent:true,opacity:.9,depthTest:false});
 const label=createWorldLabel("MİSAFİRİ AL","#805038","#ffe8b0");
 label.position.set(0,0,4.3);g.add(label);
 g.userData.label=label;
 return g;
}
function createWorldLabel(message,bg="#285849",fg="#fff7dd"){
 const canvas=document.createElement("canvas");
 canvas.width=512;canvas.height=128;
 const c=canvas.getContext("2d");
 c.fillStyle=bg;c.fillRect(0,0,512,128);
 c.strokeStyle="#fff2ce";c.lineWidth=7;c.strokeRect(5,5,502,118);
 c.fillStyle=fg;c.font="900 45px system-ui";c.textAlign="center";c.textBaseline="middle";
 c.fillText(message,256,69);
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true}));
 sprite.scale.set(5.2,1.30,1);
 return sprite;
}
function makeDropoffGate(){
 const g=new THREE.Group();
 const frame=new THREE.MeshStandardMaterial({color:0xfff0dd,metalness:.22,roughness:.47});
 const pink=new THREE.MeshStandardMaterial({color:0xea879d,roughness:.61});
 const gold=new THREE.MeshStandardMaterial({color:0xf5cb74,metalness:.2,roughness:.47});
 for(const side of [-1,1])g.add(meshBox(.20,.18,3.5,frame,side*2.5,0,1.75));
 const top=new THREE.Mesh(new THREE.TorusGeometry(2.50,.18,8,30,Math.PI),frame);
 top.position.set(0,0,3.5);top.rotation.x=Math.PI/2;g.add(top);
 for(let i=0;i<11;i++){
  const angle=(i/10)*Math.PI;
  const bud=new THREE.Mesh(new THREE.DodecahedronGeometry(.21,1),i%3===0?gold:pink);
  bud.position.set(Math.cos(angle)*2.5,0,3.5+Math.sin(angle)*2.5);g.add(bud);
 }
 const label=createWorldLabel("MİSAFİRİ BIRAK","#286d55","#e8ffce");
 label.position.set(0,0,6.7);g.add(label);
 g.userData.label=label;
 return g;
}


// Urban dressing is deterministic: the same street has the same shop every visit.
function addNeighborhoodDetails(group,origin,roads,mobile){
 const near=roads.filter(r=>distance([(r.a[0]+r.b[0])*.5,(r.a[1]+r.b[1])*.5],origin)<(mobile?240:325));
 const signs=["BÜFE","KURU TEMİZLEME","ÇİÇEKÇİ","OTO ELEKTRİK","BERBER","PASTANE","KIRTASİYE","TAKICI","GELİNLİKÇİ","ÇAY OCAĞI","LASTİKÇİ","TAMİRCİ"];
 const palette=["#7a3e45","#315b6f","#52784e","#866342","#6f4a65","#9a694b"];
 const signPositions=[],benchPositions=[],bollards=[];
 for(let i=0;i<near.length;i++){
  const r=near[i],a=toXY(origin,r.a),b=toXY(origin,r.b);
  const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
  if(len<13)continue;
  const nx=-dy/len,ny=dx/len,side=i%2===0?1:-1,dist=roadWidth(r)*.5;
  const x=(a[0]+b[0])*.5+side*nx*(dist+2.3),y=(a[1]+b[1])*.5+side*ny*(dist+2.3);
  const v=hash(Math.round(x*1.33),Math.round(y*2.77));
  if(v>.60&&signPositions.length<(mobile?8:18)){
   signPositions.push([x,y,Math.floor(hash(i+28,4)*signs.length),side]);
  }else if(v<.16&&benchPositions.length<(mobile?6:12)){
   benchPositions.push([x,y,Math.atan2(dy,dx)]);
  }
  if(i%12===0&&bollards.length<(mobile?28:55)){
   for(let j=0;j<3;j++)bollards.push([x+dx/len*j*.75,y+dy/len*j*.75]);
  }
 }
 const metal=new THREE.MeshStandardMaterial({color:0x3f5156,metalness:.37,roughness:.65});
 const wood=new THREE.MeshStandardMaterial({color:0x966d4f,roughness:.88});
 for(const [x,y,id,side] of signPositions){
  const label=createWorldLabel(signs[id],palette[id%palette.length],"#fff7de");
  label.position.set(x,y,3.55+terrainAt(x,y));label.scale.set(4.0,.96,1);
  group.add(label);
  const awning=new THREE.Mesh(new THREE.BoxGeometry(4.1,1.25,.12),
   new THREE.MeshStandardMaterial({color:palette[id%palette.length],roughness:.85}));
  awning.position.set(x,y,2.88+terrainAt(x,y));group.add(awning);
 }
 for(const [x,y,rotation] of benchPositions){
  const bench=new THREE.Group();bench.position.set(x,y,.43+terrainAt(x,y));bench.rotation.z=rotation;
  bench.add(meshBox(1.65,.58,.12,wood,0,0,.14));
  bench.add(meshBox(1.65,.11,.64,wood,0,-.26,.48));
  bench.add(meshBox(.08,.51,.51,metal,-.69,0,-.05));
  bench.add(meshBox(.08,.51,.51,metal,.69,0,-.05));
  group.add(bench);
 }
 if(bollards.length){
  const geom=new THREE.CylinderGeometry(.09,.11,.8,7);
  const mesh=new THREE.InstancedMesh(geom,metal,bollards.length),dummy=new THREE.Object3D();
  bollards.forEach(([x,y],i)=>{
   dummy.position.set(x,y,.40+terrainAt(x,y));dummy.scale.set(1,1,1);dummy.updateMatrix();
   mesh.setMatrixAt(i,dummy.matrix);
  });group.add(mesh);
 }
}

// Authentic street names are read from the OSM transportation layer.
function addIstanbulStreetSigns(group,origin,roads,mobile){
 const chosen=[],seen=new Set();
 for(const road of roads){
  const name=(road.name||"").trim();
  if(name.length<5||name.length>35||seen.has(name))continue;
  const mid=[(road.a[0]+road.b[0])*.5,(road.a[1]+road.b[1])*.5];
  if(distance(origin,mid)>(mobile?205:290))continue;
  seen.add(name);
  chosen.push({name,point:mid});
  if(chosen.length>=(mobile?5:12))break;
 }
 const material=new THREE.MeshStandardMaterial({color:0x465c5f,metalness:.53,roughness:.49});
 for(const {name,point} of chosen){
  const p=toXY(origin,point),z=terrainAt(...p);
  const post=meshBox(.12,.12,3.4,material,p[0]+4,p[1]+4,z+1.7);
  group.add(post);
  const sign=createWorldLabel(name.toLocaleUpperCase("tr-TR"),"#245c79","#ffffff");
  sign.position.set(p[0]+4,p[1]+4,z+3.7);sign.scale.set(4.5,.95,1);
  group.add(sign);
 }
}
function addIstanbulFlags(group,origin,mobile){
 const poles=[
  [29.02668,41.04771],[29.02691,41.04716],[29.02772,41.04663],
  [29.02585,41.04805],[29.04005,41.04272]
 ];
 const canvas=document.createElement("canvas");canvas.width=384;canvas.height=256;
 const ctx=canvas.getContext("2d");
 ctx.fillStyle="#cf2536";ctx.fillRect(0,0,384,256);
 ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(127,125,58,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#cf2536";ctx.beginPath();ctx.arc(151,113,47,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#fff";ctx.beginPath();
 const cx=220,cy=124;
 for(let k=0;k<10;k++){
  const theta=-Math.PI/2+k*Math.PI/5,r=k%2?16:39;
  const x=cx+Math.cos(theta)*r,y=cy+Math.sin(theta)*r;
  k?ctx.lineTo(x,y):ctx.moveTo(x,y);
 }
 ctx.closePath();ctx.fill();
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
 const flagMat=new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide,transparent:false});
 const poleMat=new THREE.MeshStandardMaterial({color:0xa9b7b4,metalness:.72,roughness:.37});
 let count=0;
 for(const point of poles){
  if(distance(point,origin)>(mobile?245:420))continue;
  const [x,y]=toXY(origin,point),z=terrainAt(x,y);
  const pole=meshBox(.13,.13,8,poleMat,x,y,z+4);
  const banner=new THREE.Mesh(new THREE.PlaneGeometry(4.6,3.1),flagMat);
  banner.position.set(x+2.2,y,z+6.6);banner.rotation.z=.07;
  group.add(pole,banner);count++;
 }
 return count;
}

function addSkyAtmosphere(scene){
 const shader=new THREE.ShaderMaterial({
  uniforms:{topColor:{value:new THREE.Color("#438bc9")},horizonColor:{value:new THREE.Color("#b7dfed")},warmColor:{value:new THREE.Color("#f5e6bd")}},
  vertexShader:"varying vec3 vPos; void main(){vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
  fragmentShader:"varying vec3 vPos; uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 warmColor; void main(){float h=normalize(vPos).z; float t=smoothstep(-0.11,0.73,h); vec3 c=mix(horizonColor,topColor,t); c=mix(warmColor,c,smoothstep(-0.22,0.18,h)); gl_FragColor=vec4(c,1.0);}",
  side:THREE.BackSide,depthWrite:false,depthTest:false,fog:false
 });
 const sky=new THREE.Mesh(new THREE.SphereGeometry(550,24,16),shader);
 sky.renderOrder=-900;scene.add(sky);return sky;
}


const SHARED_SCENE_MATERIALS=new Set([roadMat,pavementMat,curbMat,lineMat,yellowMat,trunkMat,leavesMat,leavesLightMat,windowMat,lightMat]);
function disposeCityGroup(group){
 const seenGeo=new Set(),seenMat=new Set();
 group.traverse(obj=>{
  const geo=obj.geometry;
  if(geo&&!seenGeo.has(geo)){seenGeo.add(geo);geo.dispose?.()}
  for(const material of (Array.isArray(obj.material)?obj.material:[obj.material])){
   if(!material||SHARED_SCENE_MATERIALS.has(material)||seenMat.has(material))continue;
   seenMat.add(material);
   if(material.map&&material.map!==roadMat.map&&material.map!==pavementMat.map)material.map.dispose?.();
   material.dispose?.();
  }
 });
}

export class CityScene3D{
 constructor(city){
  this.city=city;this.origin=[...AREAS[city.area].center];this.mobile=window.innerWidth<700;this.canvas=document.getElementById("driving-canvas");
  this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:!this.mobile,alpha:false,powerPreference:"high-performance"});
  this.pixelRatioMax=Math.min(window.devicePixelRatio||1,this.mobile?1.18:1.5);
  this.dynamicPixelRatio=this.pixelRatioMax;
  this.framesObserved=0;this.timeObserved=0;this.lastQualityChange=0;
  this.renderer.setPixelRatio(this.dynamicPixelRatio);
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  this.renderer.toneMappingExposure=1.38;
  if(!this.mobile){
   this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  }
  this.scene=new THREE.Scene();this.scene.background=color("#8ccbee");this.scene.fog=new THREE.Fog("#a7c9bb",245,790);
  this.sky=addSkyAtmosphere(this.scene);this.lightingMode=0;
  this.camera=new THREE.PerspectiveCamera(64,1,.12,2200);this.camera.up.set(0,0,1);
  this.skyLight=new THREE.HemisphereLight(0xd5eeff,0x8a8e70,1.95);this.scene.add(this.skyLight);
  const sunlight=new THREE.DirectionalLight(0xffe1af,2.4);sunlight.position.set(-125,170,190);
  if(!this.mobile){
   sunlight.castShadow=true;
   sunlight.shadow.mapSize.set(1024,1024);
   sunlight.shadow.camera.left=-85;sunlight.shadow.camera.right=85;
   sunlight.shadow.camera.top=85;sunlight.shadow.camera.bottom=-85;
   sunlight.shadow.camera.near=.5;sunlight.shadow.camera.far=520;
   sunlight.shadow.bias=-.00025;
  }
  this.sunlight=sunlight;this.scene.add(sunlight);this.scene.add(sunlight.target);
  this.worldGroup=new THREE.Group();this.scene.add(this.worldGroup);
  this.actorGroup=new THREE.Group();this.scene.add(this.actorGroup);
  this.player=makeCar("sahin");this.rival=makeCar("sahin",null,true);
  this.actorGroup.add(this.player,this.rival);
  this.rivalBeacon=createWorldLabel("RAKİP KONVOY","#9e4358","#fff5e8");
  this.rivalBeacon.scale.set(7.0,1.6,1);
  this.rivalBeacon.visible=false;this.actorGroup.add(this.rivalBeacon);
  this.rivalPole=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,2.4,8),
   new THREE.MeshBasicMaterial({color:0xff6788,transparent:true,opacity:.77}));
  this.rivalPole.visible=false;this.actorGroup.add(this.rivalPole);
  if(!this.mobile)for(const v of [this.player,this.rival])v.traverse(obj=>{if(obj.isMesh)obj.castShadow=true});
  this.followers=Array.from({length:this.mobile?3:5},(_,i)=>makeCar(i%2===0?"toros":"sahin"));
  this.followers.forEach(f=>{f.visible=false;this.actorGroup.add(f)});
  this.positionTrail=[];this.previousTrailPoint=null;

  // Floating roadway arrows follow the actual navigation path.
  this.guides=[];
  const guideShape=new THREE.Shape();
  guideShape.moveTo(-1.0,-1.8);guideShape.lineTo(1.0,-1.8);guideShape.lineTo(1.0,.25);
  guideShape.lineTo(1.85,.25);guideShape.lineTo(0,2.45);guideShape.lineTo(-1.85,.25);guideShape.lineTo(-1.0,.25);guideShape.closePath();
  const guideGeo=new THREE.ShapeGeometry(guideShape);
  const guideMat=new THREE.MeshBasicMaterial({color:0xffd846,transparent:true,opacity:.92,side:THREE.DoubleSide,depthWrite:false});
  for(let i=0;i<17;i++){
   const arrow=new THREE.Mesh(guideGeo,guideMat);arrow.visible=false;arrow.renderOrder=4;
   this.actorGroup.add(arrow);this.guides.push(arrow);
  }
  // Exhaust & drifting dust are real moving particles, not effects drawn on a map.
  this.fx=[];
  const dustGeo=new THREE.IcosahedronGeometry(.22,0);
  for(let i=0;i<28;i++){
   const particle=new THREE.Mesh(dustGeo,new THREE.MeshBasicMaterial({color:0xc8d5d1,transparent:true,opacity:0,depthWrite:false}));
   particle.visible=false;this.actorGroup.add(particle);
   this.fx.push({mesh:particle,age:9,pos:null,velocity:[0,0,0]});
  }
  this.fxTimer=0;this.fxIndex=0;this.lastCarPos=null;this.skids=[];

  this.npcs=Array.from({length:this.mobile?5:10},(_,i)=>makeCar(i%3===0?"doblo":"sahin",["#dcad79","#91aeb8","#c3d6b1","#eee2d6","#d48c8d"][i%5]));
  this.npcs.forEach(x=>{this.actorGroup.add(x);if(!this.mobile)x.traverse(obj=>{if(obj.isMesh)obj.castShadow=true});});
  this.marker=new THREE.Group();this.actorGroup.add(this.marker);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.65,.17,10,28),
    new THREE.MeshBasicMaterial({color:0xffda61,transparent:true,opacity:.93}));
  ring.position.z=.3;this.marker.add(ring);this.ring=ring;
  const pin=new THREE.Mesh(new THREE.ConeGeometry(.9,1.75,12),new THREE.MeshBasicMaterial({color:0xffd550}));
  pin.rotation.x=Math.PI/2;pin.position.z=4.2;this.marker.add(pin);
  const circle=new THREE.Mesh(new THREE.SphereGeometry(.55,12,8),new THREE.MeshBasicMaterial({color:0xffffff}));
  circle.position.z=5.5;this.marker.add(circle);this.marker.visible=false;
  this.guest=makeGuestActor();this.dropoffGate=makeDropoffGate();
  this.actorGroup.add(this.guest,this.dropoffGate);this.guest.visible=false;this.dropoffGate.visible=false;
  this.camStyle=0;this.camPos=new THREE.Vector3();this.camLook=new THREE.Vector3();this.inited=false;
  this.bodyPitch=0;this.bodyRoll=0;this.lastDrivingSpeed=0;
  this.lastBuilt=0;this.builtAt=null;this.builtRoads=null;this.builtBuildings=null;
  this.lastFPS=60;this.lastWarn=0;this.routeCache=null;
  window.addEventListener("resize",()=>this.resize());
  this.resize();this.rebuild(true);
 }
 resize(){
  const w=window.innerWidth,h=window.innerHeight;
  this.camera.aspect=w/h;this.camera.fov=w<600?74:64;this.camera.updateProjectionMatrix();
  this.renderer.setSize(w,h,false);
 }

 setLightingMode(mode){
  this.lightingMode=((mode%3)+3)%3;
  const presets=[
   {name:"GÜNDÜZ",top:"#438bc9",horizon:"#b7dfed",warm:"#f5e6bd",sun:"#ffe1af",ground:"#a7c9bb",intensity:2.4,ambient:1.95,exposure:1.38,height:180},
   {name:"ALTIN SAAT",top:"#5f8ec3",horizon:"#f5b48b",warm:"#ffcf99",sun:"#ffb170",ground:"#d9aa88",intensity:2.0,ambient:1.48,exposure:1.30,height:65},
   {name:"AKŞAM",top:"#203e72",horizon:"#8e7f9e",warm:"#c99891",sun:"#ffb184",ground:"#6d798c",intensity:.88,ambient:1.18,exposure:1.54,height:26}
  ];
  const v=presets[this.lightingMode];
  this.sky.material.uniforms.topColor.value.set(v.top);
  this.sky.material.uniforms.horizonColor.value.set(v.horizon);
  this.sky.material.uniforms.warmColor.value.set(v.warm);
  this.sunlight.color.set(v.sun);this.sunlight.intensity=v.intensity;
  this.skyLight.intensity=v.ambient;this.scene.fog.color.set(v.ground);
  this.renderer.toneMappingExposure=v.exposure;this.sunHeight=v.height;
  return v.name;
 }
 setCameraStyle(style){
  this.camStyle=((style%3)+3)%3;
  return ["TAKİP","GENİŞ","KAPUT"][this.camStyle];
 }
 getGroundHeight(point){const xy=toXY(this.origin,point);return terrainAt(xy[0],xy[1])+bridgeLiftAt(xy[0],xy[1],this.lastPlayerOnBridge)}
 setOrigin(point){this.origin=[...point];this.inited=false;this.safeFollow=null;this.rebuild(true);this.lastCarPos=null;this.positionTrail=[];this.previousTrailPoint=null;}

 setCar(name){this.actorGroup.remove(this.player);this.player=makeCar(name);this.actorGroup.add(this.player);if(!this.mobile)this.player.traverse(obj=>{if(obj.isMesh)obj.castShadow=true})}
 rebuild(force=false){
  const t=performance.now();
  if(!force&&t-this.lastBuilt<11500&&this.builtRoadCount>12)return;
  const city=this.city,ro=city.roads,bu=city.buildings;
  const moved=this.builtAt?distance(this.builtAt,this.focus||this.origin):Infinity;
  // A fresh tile object is not necessarily a new city. Rebuilding the entire
  // Three.js street scene every 4 seconds produced an obvious frame hitch.
  if(!force&&this.builtAt&&moved<226&&this.builtRoadCount>65&&
     (ro?.length||0)>=this.builtRoadCount*.80&&
     (bu?.length||0)>=(this.builtBuildingCount||0)*.75)return;
  if(!force&&this.builtAt&&moved<60&&this.builtRoads===ro&&this.builtBuildings===bu)return;
  this.lastBuilt=t;this.builtAt=[...(this.focus||this.origin)];this.builtRoads=ro;this.builtBuildings=bu;
  this.builtRoadCount=ro?.length||0;this.builtBuildingCount=bu?.length||0;
  // Shift the render origin as the player explores new districts, avoiding precision loss.
  if(this.focus&&distance(this.origin,this.focus)>220){
   const previousOrigin=[...this.origin];
   this.origin=[...this.focus];
   // Rebase the camera's coordinates without jumping the world view.
   const shift=toXY(this.origin,previousOrigin);
   if(this.inited){
    this.camPos.x+=shift[0];this.camPos.y+=shift[1];
    this.camLook.x+=shift[0];this.camLook.y+=shift[1];
   }
   for(const skid of this.skids){this.actorGroup.remove(skid);skid.geometry.dispose();skid.material.dispose()}
   this.skids=[];
  }

  this.scene.remove(this.worldGroup);
  disposeCityGroup(this.worldGroup);
  this.worldGroup=new THREE.Group();this.scene.add(this.worldGroup);
  terrainAt=terrainModel(city.area,this.origin);
  bridgeWorldOrigin=this.origin;bridgeCache=null;
  makeGround(this.worldGroup);
  this.visibleParkCount=renderRealParks(this.worldGroup,this.origin,city.parks,this.mobile);
  this.visibleWater=addWater(this.worldGroup,this.origin,city.water,this.mobile);
  this.bosphorusVisible=renderBosphorusWaterway(this.worldGroup,this.origin,this.mobile);
  addOrtakoyLandmark(this.worldGroup,this.origin,city.area);
  addBeylerbeyiWaterfront(this.worldGroup,this.origin);
  addBosphorusPromenade(this.worldGroup,this.origin);
  this.flagsVisible=addIstanbulFlags(this.worldGroup,this.origin,this.mobile);
  this.bridgeVisible=makeBosphorusBridge(this.worldGroup,this.origin,this.focus||this.origin);
  if(ro?.length){const visibleRoads=createRoads(this.worldGroup,this.origin,ro,this.mobile);addNeighborhoodDetails(this.worldGroup,this.origin,visibleRoads,this.mobile);addIstanbulStreetSigns(this.worldGroup,this.origin,visibleRoads,this.mobile);renderParkedStreetCars(this.worldGroup,this.origin,visibleRoads,this.mobile,this.focus||this.origin)}
  else{
   // Visible drivable street while streaming real vector tiles.
   const temporary=[];
   for(let i=-7;i<=7;i++){
    const start=[this.origin[0]+i*.0007,this.origin[1]-.006],end=[this.origin[0]+i*.0007,this.origin[1]+.006];
    temporary.push({a:start,b:end,typ:"residential",len:900});
   }
   createRoads(this.worldGroup,this.origin,temporary,this.mobile);
  }
  if(bu?.length)addBuildings(this.worldGroup,this.origin,bu,this.mobile);
  if(ro?.length){
   const sign=makeSign((AREAS[city.area]?.name||"İSTANBUL").split(" · ")[0].toLocaleUpperCase("tr-TR"));
   const r=ro.find(x=>distance(x.a,this.origin)<60);
   if(r){
    const p=toXY(this.origin,r.a);sign.position.set(p[0]+6,p[1]+8,terrainAt(p[0]+6,p[1]+8));this.worldGroup.add(sign);
   }
  }
 }
 position(mesh,p,z=.16,onBridge=false){
  if(!p){mesh.visible=false;return}
  mesh.visible=true;const [x,y]=toXY(this.origin,p);mesh.position.set(x,y,z+terrainAt(x,y)+bridgeLiftAt(x,y,onBridge));
 }
 update(state,dt,now){
  if(!state?.car)return;
  // Render resolution follows performance, without jumping vehicle physics.
  // Only reassess after several seconds to prevent oscillating resolution.
  if(dt>.001&&dt<.10){this.framesObserved++;this.timeObserved+=dt}
  if(this.timeObserved>3.5&&now-this.lastQualityChange>3500){
   const fps=this.framesObserved/this.timeObserved;
   const target=fps<31?Math.max(this.mobile?.82:.95,this.dynamicPixelRatio-.13):
                fps>51?Math.min(this.pixelRatioMax,this.dynamicPixelRatio+.10):this.dynamicPixelRatio;
   if(Math.abs(target-this.dynamicPixelRatio)>.035){
    this.dynamicPixelRatio=target;this.renderer.setPixelRatio(target);
   }
   this.lastQualityChange=now;this.framesObserved=0;this.timeObserved=0;
  }
  this.focus=state.car.pos;
  if(this.city.roads?.length>0&&(!this.builtRoads?.length||distance(this.builtAt,state.car.pos)>232))this.rebuild();
  const car=state.car;
  this.lastPlayerOnBridge=!!car.currentRoadBridge;
  this.position(this.player,car.pos,.18,this.lastPlayerOnBridge);this.player.rotation.z=-car.heading;
  if(!this.previousTrailPoint||distance(this.previousTrailPoint,car.pos)>.75){
   this.positionTrail.push({pos:[...car.pos],heading:car.heading});
   this.previousTrailPoint=[...car.pos];
   if(this.positionTrail.length>650)this.positionTrail.shift();
  }
  const getBehind=(wanted)=>{
   let covered=0;
   for(let j=this.positionTrail.length-1;j>0;j--){
    const a=this.positionTrail[j],b=this.positionTrail[j-1];
    const step=distance(a.pos,b.pos);
    if(covered+step>=wanted){
     const u=(wanted-covered)/Math.max(step,.001);
     return {pos:[a.pos[0]+(b.pos[0]-a.pos[0])*u,a.pos[1]+(b.pos[1]-a.pos[1])*u],heading:b.heading};
    }
    covered+=step;
   }
   return null;
  };
  for(let j=0;j<this.followers.length;j++){
   const model=this.followers[j],behind=(j+1)*9.5;
   const point=j+1<(state.convoy||1)?getBehind(behind):null;
   if(point){this.position(model,point.pos,.17);model.rotation.z=-point.heading}
   else model.visible=false;
  }

  const acceleration=clamp((car.speed-this.lastDrivingSpeed)/Math.max(.008,dt),-19,19);
  this.lastDrivingSpeed=car.speed;
  const desiredPitch=clamp(-acceleration*.010+(car.grade||0)*.38,-.11,.11);
  const desiredRoll=clamp(-(car.yawRate||0)*Math.abs(car.speed)*.012-(car.slip||0)*.06,-.13,.13);
  this.bodyPitch+=(desiredPitch-this.bodyPitch)*(1-Math.exp(-dt*6.2));
  this.bodyRoll+=(desiredRoll-this.bodyRoll)*(1-Math.exp(-dt*5.3));
  this.player.rotation.x=this.bodyPitch;
  this.player.rotation.y=this.bodyRoll;
  this.player.rotation.z=-car.heading+(car.slip||0)*.045;
  this.player.position.z+=(car.suspension||0);
  // Handbrake tracks are part of the actual asphalt scene, not hidden GIS overlays.
  if(state.controls?.handbrake&&Math.abs(car.speed)>7&&this.lastCarPos){
   const d=distance(this.lastCarPos,car.pos);
   if(d>.13&&d<3.5){
    const prev=toXY(this.origin,this.lastCarPos),nowXY=toXY(this.origin,car.pos);
    const skidMaterial=new THREE.MeshBasicMaterial({color:0x151e25,transparent:true,opacity:.51,depthWrite:false,side:THREE.DoubleSide});
    for(const side of [-1,1]){
     const skid=new THREE.Mesh(new THREE.PlaneGeometry(.18,Math.max(.22,d)),skidMaterial);
     const lateral=side*.57;
     skid.position.set((prev[0]+nowXY[0])*.5+Math.cos(car.heading)*lateral,(prev[1]+nowXY[1])*.5-Math.sin(car.heading)*lateral,.175);
     skid.rotation.z=-car.heading;this.actorGroup.add(skid);this.skids.push(skid);
    }
    while(this.skids.length>90){const old=this.skids.shift();this.actorGroup.remove(old);old.geometry.dispose();}
   }
  }
  this.lastCarPos=car.pos.slice();

  if(this.player.userData.wheels){
   for(const w of this.player.userData.wheels){
    w.wheel.rotation.x+=car.speed*dt/.38;w.steerGroup.rotation.z=w.front?car.steering*.42:0;
   }
  }
  if(state.rival?.pos){
   const rivalRoad=this.city.nearest(state.rival.pos)?.road;
   this.position(this.rival,state.rival.pos,.18,!!rivalRoad?.bridge);this.rival.rotation.z=-state.rival.heading;
   this.position(this.rivalBeacon,state.rival.pos,5.2,!!rivalRoad?.bridge);this.rivalBeacon.quaternion.copy(this.camera.quaternion);
   this.position(this.rivalPole,state.rival.pos,3.4,!!rivalRoad?.bridge);
  }else{this.rival.visible=false;this.rivalBeacon.visible=false;this.rivalPole.visible=false;}
  this.npcs.forEach((m,i)=>{
   const npc=state.traffic?.[i];this.position(m,npc?.pos,.18,!!npc?.road?.bridge);
   if(npc?.pos)m.rotation.z=-(npc.visualHeading??npc.heading);
  });
  const path=state.navValid?(state.route||[]):[],sampled=[];
  if(path.length>1){
   let carried=0,next=Math.max(9,(state.navProgress||0)+11);
   for(let i=1;i<path.length&&sampled.length<this.guides.length;i++){
    const a=path[i-1],b=path[i],len=distance(a,b);if(len<.25)continue;
    while(carried+len>=next&&sampled.length<this.guides.length){
     const frac=(next-carried)/len;
     sampled.push({pos:[a[0]+(b[0]-a[0])*frac,a[1]+(b[1]-a[1])*frac],angle:Math.atan2((b[0]-a[0])*Math.cos(a[1]*rad),b[1]-a[1])});
     next+=13;
    }
    carried+=len;
   }
  }
  this.guides.forEach((a,i)=>{
   const d=sampled[i];if(!d){a.visible=false;return}
   this.position(a,d.pos,.24);
   a.rotation.z=-d.angle;
   a.material.opacity=.68+.16*Math.sin(now*.003-i*.7);
  });
  // Exhaust and low-speed tyre smoke with fading, independently rendered in 3D.
  this.fxTimer+=dt*(Math.abs(car.speed)>9?15:5);
  if(this.fxTimer>1){
   this.fxTimer%=1;
   const fx=this.fx[this.fxIndex++%this.fx.length],dx=-Math.sin(car.heading),dy=-Math.cos(car.heading);
   fx.pos=[car.pos[0],car.pos[1]];
   fx.velocity=[dx*(.6+Math.random()),dy*(.6+Math.random()),.7+Math.random()*.5];
   fx.age=0;fx.mesh.material.color.setHex(car.offroad?0xc3aa8d:0xd9dcd8);
  }
  for(const fx of this.fx){
   fx.age+=dt;fx.mesh.visible=fx.age<1.35&&!!fx.pos;
   if(!fx.mesh.visible)continue;
   const pp=[fx.pos[0]+fx.velocity[0]*fx.age/(111320*Math.cos(fx.pos[1]*rad)),fx.pos[1]+fx.velocity[1]*fx.age/111320];
   this.position(fx.mesh,pp,.34+fx.velocity[2]*fx.age);
   fx.mesh.scale.setScalar(.5+fx.age*3.2);
   fx.mesh.material.opacity=Math.max(0,(1-fx.age/1.35)*.30);
  }
  if(state.mission){
   const m=state.mission,where=m.phase==="pickup"?m.pickup:m.dropoff;
   this.position(this.marker,where,.18);this.ring.rotation.z=now*.0003;
   this.marker.scale.setScalar(1+Math.sin(now*.003)*.07);
   const targetColor=m.phase==="pickup"?0xffd35c:0x99f5a7;
   this.marker.children.forEach(child=>{if(child.material?.color)child.material.color.setHex(targetColor)});
  }
  if(state.mission){
   const target=state.mission.phase==="pickup"?state.mission.pickup:state.mission.dropoff;
   if(state.mission.phase==="pickup"){
    const road=this.city.nearest?.(target)?.road;
    let guestPos=target;
    if(road){
     const a=toXY(this.origin,road.a),b=toXY(this.origin,road.b),len=Math.hypot(b[0]-a[0],b[1]-a[1])||1;
     const width=roadWidth(road.typ)*.5+1.25;
     const x=-(b[1]-a[1])/len*width,y=(b[0]-a[0])/len*width;
     const latitude=target[1]*rad;
     guestPos=[target[0]+x/(111320*Math.cos(latitude)),target[1]+y/111320];
    }
    this.position(this.guest,guestPos,.14);this.dropoffGate.visible=false;
    this.guest.rotation.z=-Math.atan2(Math.sin(car.heading),Math.cos(car.heading));
    this.guest.userData.waveArm.rotation.y=Math.sin(now*.006)*.65;
    this.guest.userData.label.quaternion.copy(this.camera.quaternion);
   }else{
    this.guest.visible=false;this.position(this.dropoffGate,target,.14);
    this.dropoffGate.userData.label.quaternion.copy(this.camera.quaternion);
   }
  }else{this.guest.visible=false;this.dropoffGate.visible=false;this.marker.visible=false;}
  // Proper physical 3D chase camera behind the car, not a zoomed overhead GIS camera.
  const [cx,cy]=toXY(this.origin,car.pos),fwdX=Math.sin(car.heading),fwdY=Math.cos(car.heading);
  if(this.sunlight&&!this.mobile){
   this.sunlight.position.set(cx-120,cy+100,this.sunHeight||180);
   this.sunlight.target.position.set(cx,cy,0);
   this.sunlight.target.updateMatrixWorld();
  }
  for(const light of this.player.userData.rearLights||[]){
   if(light.material?.emissive)light.material.emissiveIntensity=state.controls?.brake?1.2:.18;
  }
  
  const speed=Math.abs(car.speed),wide=this.camStyle===1,hood=this.camStyle===2;
  const horizontal=hood?-1.7:(wide?clamp(11.7+speed*.09,11.7,14.3):clamp(7.7+speed*.065,7.7,9.6));
  const height=hood?1.65:(wide?5.15:3.68)+speed*.014;
  const lateral=(car.slip||0)*.38+(car.steering||0)*Math.min(1,speed/16)*.45;
  let safeFollow=horizontal;
  if(!hood&&this.city.insideBuilding&&now-(this.camSafetyTime||0)>95){
   this.camSafetyTime=now;
   // Cast a short line from the car to the eye. Pull camera forward before walls block the player.
   for(let t=.28;t<=1.001;t+=.12){
    const x=cx-fwdX*horizontal*t+fwdY*lateral;
    const y=cy-fwdY*horizontal*t-fwdX*lateral;
    const probe=[this.origin[0]+x/(111320*Math.cos(this.origin[1]*rad)),this.origin[1]+y/111320];
    if(this.city.insideBuilding(probe)){safeFollow=Math.max(3.8,horizontal*(t-.19));break}
   }
   this.safeFollow=safeFollow;
  }else if(!hood)safeFollow=this.safeFollow??horizontal;
  const ground=terrainAt(cx,cy)+bridgeLiftAt(cx,cy,this.lastPlayerOnBridge);
  const eye=new THREE.Vector3(cx-fwdX*safeFollow+fwdY*lateral,cy-fwdY*safeFollow-fwdX*lateral,ground+height+(safeFollow<horizontal?1.3:0));
  const lookDistance=hood?22:wide?20:15.5;
  const turnPreview=clamp((car.yawRate||0)*1.65,-.40,.40);
  const target=new THREE.Vector3(cx+fwdX*lookDistance+fwdY*turnPreview*7,
   cy+fwdY*lookDistance-fwdX*turnPreview*7,ground+(hood?1.78:1.65));
  if(hood)this.player.visible=false;else this.player.visible=true;
  if(!this.inited){this.camPos.copy(eye);this.camLook.copy(target);this.inited=true}
  // Responsive camera and speed-dependent FOV make forward movement perceptible.
  const baseFov=window.innerWidth<700?74:63;
  const desiredFov=baseFov+Math.min(10,speed*.38);
  if(Math.abs(this.camera.fov-desiredFov)>.12){
   this.camera.fov+=(desiredFov-this.camera.fov)*(1-Math.exp(-dt*3.8));
   this.camera.updateProjectionMatrix();
  }
  const softness=1-Math.exp(-dt*8.0),lookSoft=1-Math.exp(-dt*6.5);
  this.camPos.lerp(eye,softness);this.camLook.lerp(target,lookSoft);
  if(!hood&&this.city.insideBuilding){
   const p=[this.origin[0]+this.camPos.x/(111320*Math.cos(this.origin[1]*rad)),this.origin[1]+this.camPos.y/111320];
   if(this.city.insideBuilding(p))this.camPos.lerp(eye,Math.min(1,dt*13));
  }
  this.camera.position.copy(this.camPos);this.camera.lookAt(this.camLook);
  this.sky.position.copy(this.camera.position);
  // Guest signs billboard to player only after camera aim settles.
  if(this.rivalBeacon.visible)this.rivalBeacon.quaternion.copy(this.camera.quaternion);
  if(this.guest.visible)this.guest.userData.label.quaternion.copy(this.camera.quaternion);
  if(this.dropoffGate.visible)this.dropoffGate.userData.label.quaternion.copy(this.camera.quaternion);
  this.renderer.render(this.scene,this.camera);
 }
}