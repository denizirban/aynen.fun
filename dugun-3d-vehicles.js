import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";
import {AREAS,rad,turn,travel} from "./dugun-istanbul-map.js";
const mat=(color,metal=.1,rough=.54)=>new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough});
function cube(w,l,h,m,x=0,y=0,z=0){
 const o=new THREE.Mesh(new THREE.BoxGeometry(w,l,h),m);o.position.set(x,y,z);return o;
}
function makeCar(carName="sahin",color=null,rival=false){
 const group=new THREE.Group(),doblo=carName==="doblo",toros=carName==="toros";
 const w=doblo?1.94:1.78,l=doblo?4.60:toros?4.46:4.28;
 const paint=new THREE.MeshPhysicalMaterial({color:color??(rival?0x9f466a:doblo?0xdfb460:toros?0x89a48a:0xefebe3),metalness:.32,roughness:.27,clearcoat:1,clearcoatRoughness:.15});
 const windowMaterial=new THREE.MeshPhysicalMaterial({color:0x7eb0c0,metalness:.24,roughness:.12,transparent:true,opacity:.88,side:THREE.DoubleSide});
 const black=mat(0x172229,0,.87),chrome=mat(0xc7ccd0,.84,.20),glassLine=mat(0x354a53),red=mat(0xf63d4f),white=mat(0xfaf1dd),pink=mat(0xe68c9a);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(2.65,28),new THREE.MeshBasicMaterial({color:0x0a1718,transparent:true,opacity:.18,depthWrite:false}));shadow.scale.set(.95,1,1);shadow.position.z=.065;group.add(shadow);
 // Real dimensional body (x=vehicle width, y=length, z=up); smooth front/rear taper.
 group.add(cube(w,l,.53,paint,0,0,.79));
 group.add(cube(w*.9,l*.28,.15,paint,0,l*.33,1.115));
 const roofLength=doblo?2.68:2.13;
 group.add(cube(w*.81,roofLength,doblo?.85:.67,paint,0,-.24,doblo?1.65:1.53));
 group.add(cube(w*.76,.055,doblo?.48:.38,windowMaterial,0,doblo?.91:.66,doblo?1.67:1.64));
 group.add(cube(w*.76,.05,doblo?.48:.37,windowMaterial,0,doblo?-1.64:-1.32,doblo?1.66:1.63));
 for(const x of [-w*.416,w*.416])group.add(cube(.055,roofLength*.72,.34,windowMaterial,x,-.25,1.65));
 for(const x of [-w*.5,w*.5]){
  for(const y of [-l*.34,l*.32]){
   const wheelGroup=new THREE.Group();wheelGroup.position.set(x,y,.49);group.add(wheelGroup);
   const tire=new THREE.Mesh(new THREE.CylinderGeometry(.38,.38,.23,20),black);tire.rotation.z=Math.PI/2;wheelGroup.add(tire);
   const rim=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.25,16),chrome);rim.rotation.z=Math.PI/2;wheelGroup.add(rim);
   group.userData.wheels??=[];group.userData.wheels.push({wheel:tire,steerGroup:wheelGroup,front:y>0});
  }
 }
 group.add(cube(w*.87,.13,.19,chrome,0,-l*.51,.64));
 group.add(cube(w*.70,.08,.15,black,0,l*.51,.82));
 const rearLights=[];
 for(const x of [-w*.35,w*.35]){
  group.add(cube(.29,.11,.18,white,x,l*.52,1.01));
  const tail=cube(.31,.1,.18,red,x,-l*.52,.99);group.add(tail);rearLights.push(tail);
 }
 group.add(cube(.67,.045,.14,white,0,-l*.53,.83));
 // Original wedding details: ribbons, floral bouquet and bridal accessories.
 for(const s of [-1,1]){
  const ribbon=cube(.055,l*.64,.025,white,s*.34,0,1.09);group.add(ribbon);
  const flower=new THREE.Mesh(new THREE.IcosahedronGeometry(.18,1),s<0?pink:white);flower.position.set(s*.30,-l*.43,1.12);group.add(flower);
  const bow=cube(.28,.055,.05,pink,s*.30,-l*.44,1.15);group.add(bow);
 }
 for(let i=0;i<7;i++){
  const bloom=new THREE.Mesh(new THREE.DodecahedronGeometry(.10,0),i%2?white:pink);
  bloom.position.set((i-3)*.18,l*.49,1.24+Math.sin(i*2)*.045);group.add(bloom);
 }
 group.userData.rearLights=rearLights;group.userData.roof=roofLength;group.userData.len=l;
 return group;
}
function beacon(color){
 const mat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.65,transparent:true,opacity:.85,roughness:.25});
 const g=new THREE.Group(),ring=new THREE.Mesh(new THREE.TorusGeometry(3.8,.23,8,42),mat);
 ring.position.z=.12;g.add(ring);
 const jewel=new THREE.Mesh(new THREE.OctahedronGeometry(1.23,0),mat);jewel.position.z=5;g.add(jewel);
 const stem=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,3,8),mat);stem.rotation.x=Math.PI/2;stem.position.z=2.5;g.add(stem);
 g.userData.jewel=jewel;g.userData.ring=ring;return g;
}
export class Vehicle3D{
 constructor(world){
  this.world=world;this.scene=null;this.car=null;this.rivalCar=null;this.npcModels=[];
  this.origin=AREAS[world.area].center;this.mercator=null;this.smoke=[];this.smokeClock=0;this.smokeIndex=0;
  world.map.addLayer({id:"wedding-3d-cars",type:"custom",renderingMode:"3d",
   onAdd:(map,context)=>this.onAdd(map,context),
   render:(context,matrix)=>this.render(context,matrix)
  });
 }
 setOrigin(point){
  this.origin=point.slice();
  this.mercator=maplibregl.MercatorCoordinate.fromLngLat(point,0);
  this.scale=this.mercator.meterInMercatorCoordinateUnits();
 }
 onAdd(map,glctx){
  const renderer=new THREE.WebGLRenderer({canvas:map.getCanvas(),context:glctx,antialias:true,alpha:true});
  renderer.autoClear=false;renderer.outputColorSpace=THREE.SRGBColorSpace;
  this.renderer=renderer;this.scene=new THREE.Scene();this.camera=new THREE.Camera();
  this.scene.add(new THREE.AmbientLight(0xf1f2ec,2.05));
  const sun=new THREE.DirectionalLight(0xffefd8,2.35);sun.position.set(-100,60,200);this.scene.add(sun);
  const fill=new THREE.DirectionalLight(0xb9dcff,.9);fill.position.set(80,-100,90);this.scene.add(fill);
  this.setOrigin(this.origin);
  this.car=makeCar("sahin");this.rivalCar=makeCar("sahin",null,true);
  this.pickup=beacon(0xffdb65);this.dropoff=beacon(0x94efb2);
  this.scene.add(this.car,this.rivalCar,this.pickup,this.dropoff);
  for(let i=0;i<(window.innerWidth<700?5:10);i++){
   const m=makeCar(i%3===0?"doblo":"sahin",[0xc4c7c0,0xc09985,0xbac8b0,0x85aebc][i%4]);
   this.npcModels.push(m);this.scene.add(m);
  }
  
  this.rivalCar.visible=this.pickup.visible=this.dropoff.visible=false;
  for(let i=0;i<24;i++){
   const m=new THREE.Mesh(new THREE.IcosahedronGeometry(.15,0),new THREE.MeshBasicMaterial({color:0xd2d1ca,transparent:true,opacity:0,depthWrite:false}));
   this.scene.add(m);m.visible=false;this.smoke.push({mesh:m,age:3,pos:null,offset:0});
  }
 }
 setCar(name){
  if(!this.scene)return;
  this.scene.remove(this.car);this.car=makeCar(name);this.scene.add(this.car);
 }
 setPos(mesh,p,z=.08){
  if(!p||!mesh){if(mesh)mesh.visible=false;return}
  mesh.visible=true;
  const lat=(this.origin[1]+p[1])*.5*rad;
  mesh.position.set((p[0]-this.origin[0])*111320*Math.cos(lat),(p[1]-this.origin[1])*111320,z);
 }
 update(s,dt,now){
  if(!this.scene)return;
  this.setPos(this.car,s.car.pos,.06);this.car.rotation.z=-s.car.heading;
  this.car.rotation.y=-s.car.steer*.04;
  for(const w of this.car.userData.wheels||[]){
   w.wheel.rotation.x+=(s.car.speed*dt)/.38;w.steerGroup.rotation.z=w.front?s.car.steer*.32:0;
  }
  for(const tail of this.car.userData.rearLights||[]){
   tail.material.emissiveIntensity=s.controls?.brake?1.2:0;
  }
  
  this.smokeClock+=dt*(Math.abs(s.car.speed)>12?16:Math.abs(s.car.speed)>2?6:1);
  if(this.smokeClock>=1&&s.car.pos){
   this.smokeClock%=1;
   const p=this.smoke[this.smokeIndex++%this.smoke.length];
   p.age=0;p.offset=(Math.random()-.5)*.35;
   p.pos=travel(s.car.pos,s.car.heading+Math.PI,2.1);
   p.mesh.material.color.setHex(s.car.offroad?0xc0b199:0xcdd2d2);
  }
  for(const p of this.smoke){
   p.age+=dt;p.mesh.visible=p.age<1.3&&!!p.pos;
   if(p.mesh.visible){
    this.setPos(p.mesh,p.pos,.48+p.age*.80);
    p.mesh.position.x+=Math.sin(now*.002+p.offset)*p.age*.20;
    p.mesh.scale.setScalar(.8+p.age*2.7);
    p.mesh.material.opacity=Math.max(0,(1-p.age/1.3)*.20);
   }
  }
  if(s.rival?.pos){this.setPos(this.rivalCar,s.rival.pos,.07);this.rivalCar.rotation.z=-s.rival.heading}
  else this.rivalCar.visible=false;
  if(s.mission){
   this.setPos(this.pickup,s.mission.phase==="pickup"?s.mission.pickup:null,.13);
   this.setPos(this.dropoff,s.mission.phase==="dropoff"?s.mission.dropoff:null,.13);
   for(const pin of [this.pickup,this.dropoff]){
    pin.userData.jewel.position.z=5.1+Math.sin(now*.0035)*.5;
    pin.userData.ring.rotation.z=now*.0004;
    pin.userData.ring.scale.setScalar(1+Math.sin(now*.003)*.09);
   }
  }else{this.pickup.visible=this.dropoff.visible=false}
  for(let i=0;i<this.npcModels.length;i++){
   const o=this.npcModels[i],v=s.traffic?.[i];
   this.setPos(o,v?.pos||null,.07);
   if(v?.pos)o.rotation.z=-v.heading;
  }
 }
 render(context,matrix){
  if(!this.scene||!this.mercator||!this.renderer)return;
  const m=matrix?.length===16?matrix:(matrix?.defaultProjectionData?.mainMatrix||context?.defaultProjectionData?.mainMatrix);
  if(!m)return;
  const tr=new THREE.Matrix4().makeTranslation(this.mercator.x,this.mercator.y,this.mercator.z);
  const scale=new THREE.Matrix4().makeScale(this.scale,-this.scale,this.scale);
  this.camera.projectionMatrix=new THREE.Matrix4().fromArray(m).multiply(tr).multiply(scale);
  this.renderer.resetState();this.renderer.render(this.scene,this.camera);
  this.world.map.triggerRepaint();
 }
}
