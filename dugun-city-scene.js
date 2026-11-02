import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";
import {AREAS,rad,distance} from "./dugun-istanbul-map.js?v=20261102-v5";
import {makeCar} from "./dugun-3d-vehicles.js?v=20261102-v5";

// The road graph and building outlines come from the real OSM vector tiles.
// This is a standalone ground-level Three.js scene, NOT a tilted map layer.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hash=(a,b=0)=>{let n=Math.sin(a*12.9898+b*78.233)*43758.545;return n-Math.floor(n)};
const roadWidth=type=>/^(primary|trunk)/.test(type)?15:/^(secondary)/.test(type)?12:/^(tertiary)/.test(type)?10:/^(service|living_street)/.test(type)?5.7:7.6;
const buildingColors=["#d8c5ac","#eccfb2","#f2d6bd","#b2c5b9","#c5bfd0","#d9d9ca","#ebbaa7","#b1c3c6","#ead8c4","#c9d2b5"];
const shopColors=["#b83e52","#3f8182","#ba754e","#4f8475","#e2b15a"];
const toXY=(o,p)=>{const x=(p[0]-o[0])*111320*Math.cos((p[1]+o[1])*.5*rad),y=(p[1]-o[1])*111320;return [x,y]};
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
function emitQuad(positions,indices,p,q,width,z){
 const dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy);
 if(len<.1)return;
 const nx=-dy/len*width*.5,ny=dx/len*width*.5,i=positions.length/3;
 positions.push(p[0]-nx,p[1]-ny,z,q[0]-nx,q[1]-ny,z,q[0]+nx,q[1]+ny,z,p[0]+nx,p[1]+ny,z);
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
 const m=new THREE.Mesh(geo,mat);m.receiveShadow=true;container.add(m);
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
  dummy.position.set(item[0],item[1],1.45*s);dummy.scale.set(s,s,s);dummy.rotation.set(0,0,hash(i+12)*6.28);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
  dummy.position.set(item[0],item[1],3.40*s);dummy.scale.set(1.30*s,1.32*s,1.19*s);dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);
  dummy.position.set(item[0]+.52*s,item[1]-.44*s,4.14*s);dummy.scale.set(.72*s,.8*s,.73*s);dummy.updateMatrix();crowns2.setMatrixAt(i,dummy.matrix);
 }
 group.add(trunks,crowns,crowns2);
}
function addStreetProps(group,origin,roads,mobile){
 const places=[],lamps=[],people=[];
 for(let i=0;i<roads.length;i++){
  const r=roads[i],a=toXY(origin,r.a),b=toXY(origin,r.b);
  const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),w=roadWidth(r.typ);
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
  dummy.position.set(p[0],p[1],2.80);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();pole.setMatrixAt(i,dummy.matrix);
  dummy.position.set(p[0],p[1],5.55);dummy.updateMatrix();head.setMatrixAt(i,dummy.matrix);
 });
 group.add(pole,head);
 const torso=new THREE.InstancedMesh(new THREE.CylinderGeometry(.25,.26,.92,6),new THREE.MeshStandardMaterial({color:0x5d7d87}),people.length);
 const headPeople=new THREE.InstancedMesh(new THREE.SphereGeometry(.19,7,5),new THREE.MeshStandardMaterial({color:0xc89572}),people.length);
 people.forEach((p,i)=>{
  dummy.position.set(p[0],p[1],1.08);dummy.scale.set(1,1,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();torso.setMatrixAt(i,dummy.matrix);
  dummy.position.z=1.72;dummy.updateMatrix();headPeople.setMatrixAt(i,dummy.matrix);
  torso.setColorAt(i,color(["#d7645c","#eac86e","#597a9f","#678c6a"][i%4]));
 });
 group.add(torso,headPeople);
}
function createRoads(group,origin,roads,mobile){
 const sidewalk=empty(),asphalt=empty(),curbs=empty(),markings=empty(),sideLine=empty();
 const max=mobile?450:800;
 const near=roads.filter(r=>{
  const c=[(r.a[0]+r.b[0])*.5,(r.a[1]+r.b[1])*.5];
  return distance(c,origin)<(mobile?385:525);
 }).slice(0,max);
 for(let i=0;i<near.length;i++){
  const r=near[i],a=toXY(origin,r.a),b=toXY(origin,r.b);
  const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
  if(len<1)continue;
  const ux=dx/len,uy=dy/len,nx=-uy,ny=ux,width=roadWidth(r.typ);
  emitQuad(sidewalk.positions,sidewalk.indices,a,b,width+4.6,.085);
  emitQuad(asphalt.positions,asphalt.indices,a,b,width,.115);
  // Light kerbs and pavement edges.
  for(const k of [-1,1]){
   emitQuad(curbs.positions,curbs.indices,
     [a[0]+nx*k*(width/2+.07),a[1]+ny*k*(width/2+.07)],
     [b[0]+nx*k*(width/2+.07),b[1]+ny*k*(width/2+.07)],.18,.145);
  }
  if(width>=9){
   for(let d=5;d<len-1;d+=14){
    const v=Math.min(5.8,len-d),p=[a[0]+ux*d,a[1]+uy*d],q=[a[0]+ux*(d+v),a[1]+uy*(d+v)];
    emitQuad(markings.positions,markings.indices,p,q,.14,.16);
   }
  }
  if(width>=11){
   for(const k of [-1,1]){
    emitQuad(sideLine.positions,sideLine.indices,
    [a[0]+nx*k*(width*.5-.42),a[1]+ny*k*(width*.5-.42)],
    [b[0]+nx*k*(width*.5-.42),b[1]+ny*k*(width*.5-.42)],.095,.159);
   }
  }
  if(i%9===0&&len>16){
   // Pedestrian crossings at real intersections, not randomly floating scenery.
   for(let z=-3;z<=3;z++){
    const off=z*1.0,at=Math.min(len-2,3.8);
    const p=[a[0]+ux*at+nx*off,a[1]+uy*at+ny*off];
    const q=[p[0]+ux*2.65,p[1]+uy*2.65];
    emitQuad(markings.positions,markings.indices,p,q,.50,.163);
   }
  }
 }
 batchStrips(sidewalk,pavementMat,group);batchStrips(asphalt,roadMat,group);
 batchStrips(curbs,curbMat,group);batchStrips(markings,lineMat,group);batchStrips(sideLine,lineMat,group);
 addStreetProps(group,origin,near,mobile);
 return near;
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
 const windows=empty(),litWindows=empty(),awnings=empty();
 const mats=buildingColors.map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.88,flatShading:true}));
 for(let i=0;i<buildings.length;i++){
  const b=buildings[i],ring=b.ring?.slice(0,-1)??[];
  if(ring.length<3)continue;
  const pts=ring.map(p=>toXY(origin,p));
  const maxDist=Math.max(...pts.map(p=>Math.hypot(p[0],p[1])));
  if(maxDist>750)continue;
  const x=(b.minX+b.maxX)*.5,lat=(b.minY+b.maxY)*.5,hseed=hash(x*1e5,lat*1e5);
  const height=b.height&&Number.isFinite(b.height)?clamp(b.height,5,100):Math.round(3.5+(hseed*.78+.11)*8)*3.15;
  const shape=new THREE.Shape();shape.moveTo(...pts[0]);for(let j=1;j<pts.length;j++)shape.lineTo(...pts[j]);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:1,steps:1});
  const m=new THREE.Mesh(geo,mats[Math.floor(hseed*mats.length)]);m.castShadow=!mobile&&Math.hypot(pts[0][0],pts[0][1])<110;m.receiveShadow=true;group.add(m);
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
 return buildings.length;
}
function makeGround(group){
 const m=new THREE.Mesh(new THREE.PlaneGeometry(2500,2500),
  new THREE.MeshStandardMaterial({color:0x91b47c,roughness:1}));
 m.position.z=-.10;m.receiveShadow=true;group.add(m);
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
  const nx=-dy/len,ny=dx/len,side=i%2===0?1:-1,dist=roadWidth(r.typ)*.5;
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
  label.position.set(x,y,3.55);label.scale.set(4.0,.96,1);
  group.add(label);
  const awning=new THREE.Mesh(new THREE.BoxGeometry(4.1,1.25,.12),
   new THREE.MeshStandardMaterial({color:palette[id%palette.length],roughness:.85}));
  awning.position.set(x,y,2.88);group.add(awning);
 }
 for(const [x,y,rotation] of benchPositions){
  const bench=new THREE.Group();bench.position.set(x,y,.43);bench.rotation.z=rotation;
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
   dummy.position.set(x,y,.40);dummy.scale.set(1,1,1);dummy.updateMatrix();
   mesh.setMatrixAt(i,dummy.matrix);
  });group.add(mesh);
 }
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
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,this.mobile?1.18:1.5));
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  this.renderer.toneMappingExposure=1.38;
  if(!this.mobile){
   this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  }
  this.scene=new THREE.Scene();this.scene.background=color("#8ccbee");this.scene.fog=new THREE.Fog("#a7c9bb",245,790);
  this.sky=addSkyAtmosphere(this.scene);this.lightingMode=0;
  this.camera=new THREE.PerspectiveCamera(64,1,.12,1300);this.camera.up.set(0,0,1);
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
 setOrigin(point){this.origin=[...point];this.inited=false;this.safeFollow=null;this.rebuild(true);this.lastCarPos=null;this.positionTrail=[];this.previousTrailPoint=null;}

 setCar(name){this.actorGroup.remove(this.player);this.player=makeCar(name);this.actorGroup.add(this.player);if(!this.mobile)this.player.traverse(obj=>{if(obj.isMesh)obj.castShadow=true})}
 rebuild(force=false){
  const t=performance.now();
  if(!force&&t-this.lastBuilt<6500)return;
  const city=this.city,ro=city.roads,bu=city.buildings;
  if(!force&&this.builtAt&&distance(this.builtAt,this.focus||this.origin)<83&&this.builtRoads===ro&&this.builtBuildings===bu)return;
  this.lastBuilt=t;this.builtAt=[...(this.focus||this.origin)];this.builtRoads=ro;this.builtBuildings=bu;
  // Shift the render origin as the player explores new districts, avoiding precision loss.
  if(this.focus&&distance(this.origin,this.focus)>220){
   this.origin=[...this.focus];this.inited=false;
   for(const skid of this.skids){this.actorGroup.remove(skid);skid.geometry.dispose();skid.material.dispose()}
   this.skids=[];
  }

  this.scene.remove(this.worldGroup);
  disposeCityGroup(this.worldGroup);
  this.worldGroup=new THREE.Group();this.scene.add(this.worldGroup);
  makeGround(this.worldGroup);
  if(ro?.length){const visibleRoads=createRoads(this.worldGroup,this.origin,ro,this.mobile);addNeighborhoodDetails(this.worldGroup,this.origin,visibleRoads,this.mobile)}
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
    const p=toXY(this.origin,r.a);sign.position.set(p[0]+6,p[1]+8,0);this.worldGroup.add(sign);
   }
  }
 }
 position(mesh,p,z=.16){
  if(!p){mesh.visible=false;return}
  mesh.visible=true;const [x,y]=toXY(this.origin,p);mesh.position.set(x,y,z);
 }
 update(state,dt,now){
  if(!state?.car)return;
  this.focus=state.car.pos;
  if(this.city.roads?.length>0&&(!this.builtRoads?.length||distance(this.builtAt,state.car.pos)>130))this.rebuild();
  const car=state.car;
  this.position(this.player,car.pos,.18);this.player.rotation.z=-car.heading;
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

  this.player.rotation.y=-car.steering*.065-(car.slip||0)*.045;
  this.player.rotation.z=-car.heading+(car.slip||0)*.055;
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
  if(state.rival?.pos){this.position(this.rival,state.rival.pos,.18);this.rival.rotation.z=-state.rival.heading}
  else this.rival.visible=false;
  this.npcs.forEach((m,i)=>{
   const npc=state.traffic?.[i];this.position(m,npc?.pos,.18);
   if(npc?.pos)m.rotation.z=-(npc.visualHeading??npc.heading);
  });
  const path=state.route||[],sampled=[];
  if(path.length>1){
   let carried=0,next=9;
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
  const eye=new THREE.Vector3(cx-fwdX*safeFollow+fwdY*lateral,cy-fwdY*safeFollow-fwdX*lateral,height+(safeFollow<horizontal?1.3:0));
  const lookDistance=hood?22:wide?20:15.5;
  const target=new THREE.Vector3(cx+fwdX*lookDistance,cy+fwdY*lookDistance,hood?1.78:1.65);
  if(hood)this.player.visible=false;else this.player.visible=true;
  if(!this.inited){this.camPos.copy(eye);this.camLook.copy(target);this.inited=true}
  // Responsive camera and speed-dependent FOV make forward movement perceptible.
  const baseFov=window.innerWidth<700?74:63;
  const desiredFov=baseFov+Math.min(10,speed*.38);
  if(Math.abs(this.camera.fov-desiredFov)>.12){
   this.camera.fov+=(desiredFov-this.camera.fov)*(1-Math.exp(-dt*3.8));
   this.camera.updateProjectionMatrix();
  }
  const softness=1-Math.exp(-dt*9.5),lookSoft=1-Math.exp(-dt*7.8);
  this.camPos.lerp(eye,softness);this.camLook.lerp(target,lookSoft);
  if(!hood&&this.city.insideBuilding){
   const p=[this.origin[0]+this.camPos.x/(111320*Math.cos(this.origin[1]*rad)),this.origin[1]+this.camPos.y/111320];
   if(this.city.insideBuilding(p))this.camPos.copy(eye);
  }
  this.camera.position.copy(this.camPos);this.camera.lookAt(this.camLook);
  this.sky.position.copy(this.camera.position);
  // Guest signs billboard to player only after camera aim settles.
  if(this.guest.visible)this.guest.userData.label.quaternion.copy(this.camera.quaternion);
  if(this.dropoffGate.visible)this.dropoffGate.userData.label.quaternion.copy(this.camera.quaternion);
  this.renderer.render(this.scene,this.camera);
 }
}