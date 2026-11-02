import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";
import {AREAS,rad,distance} from "./dugun-istanbul-map.js";
import {makeCar} from "./dugun-3d-vehicles.js";

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
const roadMat=new THREE.MeshStandardMaterial({color:0x41474a,roughness:1});
const pavementMat=new THREE.MeshStandardMaterial({color:0xc4b8a1,roughness:.97});
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
 geo.setIndex(list.indices);geo.computeVertexNormals();
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
 const mats=buildingColors.map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.87}));
 for(let i=0;i<buildings.length;i++){
  const b=buildings[i],ring=b.ring?.slice(0,-1)??[];
  if(ring.length<3)continue;
  const pts=ring.map(p=>toXY(origin,p));
  const maxDist=Math.max(...pts.map(p=>Math.hypot(p[0],p[1])));
  if(maxDist>750)continue;
  const x=(b.minX+b.maxX)*.5,lat=(b.minY+b.maxY)*.5,hseed=hash(x*1e5,lat*1e5);
  const height=Math.round(3.5+(hseed*.78+.11)*8)*3.15;
  const shape=new THREE.Shape();shape.moveTo(...pts[0]);for(let j=1;j<pts.length;j++)shape.lineTo(...pts[j]);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:1,steps:1});
  const m=new THREE.Mesh(geo,mats[Math.floor(hseed*mats.length)]);m.castShadow=false;m.receiveShadow=true;group.add(m);
  const maxFloors=Math.min(6,Math.floor((height-1.5)/3.1));
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
export class CityScene3D{
 constructor(city){
  this.city=city;this.origin=[...AREAS[city.area].center];this.mobile=window.innerWidth<700;this.canvas=document.getElementById("driving-canvas");
  this.renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:!this.mobile,alpha:false,powerPreference:"high-performance"});
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,this.mobile?1.3:1.65));
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
  this.renderer.toneMappingExposure=1.64;
  this.scene=new THREE.Scene();this.scene.background=color("#8ccbee");this.scene.fog=new THREE.Fog("#a7c9bb",245,790);
  this.camera=new THREE.PerspectiveCamera(64,1,.12,1300);this.camera.up.set(0,0,1);
  this.scene.add(new THREE.HemisphereLight(0xd5eeff,0x8a8e70,2.5));
  const sunlight=new THREE.DirectionalLight(0xffe1af,2.6);sunlight.position.set(-125,170,240);this.scene.add(sunlight);
  this.worldGroup=new THREE.Group();this.scene.add(this.worldGroup);
  this.actorGroup=new THREE.Group();this.scene.add(this.actorGroup);
  this.player=makeCar("sahin");this.rival=makeCar("sahin",null,true);
  this.actorGroup.add(this.player,this.rival);
  this.npcs=Array.from({length:this.mobile?5:10},(_,i)=>makeCar(i%3===0?"doblo":"sahin",["#dcad79","#91aeb8","#c3d6b1","#eee2d6","#d48c8d"][i%5]));
  this.npcs.forEach(x=>this.actorGroup.add(x));
  this.marker=new THREE.Group();this.actorGroup.add(this.marker);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(2.65,.17,10,28),
    new THREE.MeshBasicMaterial({color:0xffda61,transparent:true,opacity:.93}));
  ring.position.z=.3;this.marker.add(ring);this.ring=ring;
  const pin=new THREE.Mesh(new THREE.ConeGeometry(.9,1.75,12),new THREE.MeshBasicMaterial({color:0xffd550}));
  pin.rotation.x=Math.PI/2;pin.position.z=4.2;this.marker.add(pin);
  const circle=new THREE.Mesh(new THREE.SphereGeometry(.55,12,8),new THREE.MeshBasicMaterial({color:0xffffff}));
  circle.position.z=5.5;this.marker.add(circle);this.marker.visible=false;
  this.camPos=new THREE.Vector3();this.camLook=new THREE.Vector3();this.inited=false;
  this.lastBuilt=0;this.builtAt=null;this.builtRoads=null;this.builtBuildings=null;
  this.lastFPS=60;this.lastWarn=0;
  window.addEventListener("resize",()=>this.resize());
  this.resize();this.rebuild(true);
 }
 resize(){
  const w=window.innerWidth,h=window.innerHeight;
  this.camera.aspect=w/h;this.camera.fov=w<600?74:64;this.camera.updateProjectionMatrix();
  this.renderer.setSize(w,h,false);
 }
 setOrigin(point){this.origin=[...point];this.rebuild(true)}
 setCar(name){this.actorGroup.remove(this.player);this.player=makeCar(name);this.actorGroup.add(this.player)}
 rebuild(force=false){
  const t=performance.now();
  if(!force&&t-this.lastBuilt<6500)return;
  const city=this.city,ro=city.roads,bu=city.buildings;
  if(!force&&this.builtAt&&distance(this.builtAt,this.focus||this.origin)<83&&this.builtRoads===ro&&this.builtBuildings===bu)return;
  this.lastBuilt=t;this.builtAt=[...(this.focus||this.origin)];this.builtRoads=ro;this.builtBuildings=bu;
  this.scene.remove(this.worldGroup);
  this.worldGroup.traverse(obj=>{if(obj.geometry)obj.geometry.dispose()});
  this.worldGroup=new THREE.Group();this.scene.add(this.worldGroup);
  makeGround(this.worldGroup);
  if(ro?.length){createRoads(this.worldGroup,this.origin,ro,this.mobile)}
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
   const sign=makeSign(["KADIKÖY","BEŞİKTAŞ","KARAKÖY"][Object.keys(AREAS).indexOf(city.area)]||"İSTANBUL");
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
  this.player.rotation.y=-car.steering*.065;
  if(this.player.userData.wheels){
   for(const w of this.player.userData.wheels){
    w.wheel.rotation.x+=car.speed*dt/.38;w.steerGroup.rotation.z=w.front?car.steering*.42:0;
   }
  }
  if(state.rival?.pos){this.position(this.rival,state.rival.pos,.18);this.rival.rotation.z=-state.rival.heading}
  else this.rival.visible=false;
  this.npcs.forEach((m,i)=>{
   const npc=state.traffic?.[i];this.position(m,npc?.pos,.18);
   if(npc?.pos)m.rotation.z=-npc.heading;
  });
  if(state.mission){
   const m=state.mission,where=m.phase==="pickup"?m.pickup:m.dropoff;
   this.position(this.marker,where,.18);this.ring.rotation.z=now*.0003;
   this.marker.scale.setScalar(1+Math.sin(now*.003)*.07);
   const targetColor=m.phase==="pickup"?0xffd35c:0x99f5a7;
   this.marker.children.forEach(child=>{if(child.material?.color)child.material.color.setHex(targetColor)});
  }else this.marker.visible=false;
  // Proper physical 3D chase camera behind the car, not a zoomed overhead GIS camera.
  const [cx,cy]=toXY(this.origin,car.pos),fwdX=Math.sin(car.heading),fwdY=Math.cos(car.heading);
  const speed=Math.abs(car.speed),follow=clamp(10.8+speed*.13,10.8,15.1);
  const horizontal=window.innerWidth<700?9.8:follow;
  const height=window.innerWidth<700?5.1:5.8;
  const eye=new THREE.Vector3(cx-fwdX*horizontal,cy-fwdY*horizontal,height+speed*.025);
  const target=new THREE.Vector3(cx+fwdX*22,cy+fwdY*22,2.3);
  if(!this.inited){this.camPos.copy(eye);this.camLook.copy(target);this.inited=true}
  const softness=1-Math.exp(-dt*6.5),lookSoft=1-Math.exp(-dt*4.8);
  this.camPos.lerp(eye,softness);this.camLook.lerp(target,lookSoft);
  this.camera.position.copy(this.camPos);this.camera.lookAt(this.camLook);
  this.renderer.render(this.scene,this.camera);
 }
}