/* HOUSE BOSS / THE LIVING TOWN
   Procedural low-poly village. House scene and save format remain authoritative.
   Lightweight renderer with SVG fallback when WebGL is unavailable. */
(async function(){
 'use strict';
 const layer=document.getElementById('townLayer');
 const mount=document.getElementById('town3dStage');
 if(!layer||!mount)return;
 let T;
 try{T=await import('https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js')}
 catch(err){mount.dataset.status='fallback';return}
 let renderer;
 const mobile=matchMedia('(pointer:coarse)').matches;
 try{
  renderer=new T.WebGLRenderer({alpha:true,antialias:!mobile,powerPreference:mobile?'low-power':'high-performance'});
 }catch(err){mount.dataset.status='fallback';return}
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.25:1.7));
 renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.38;
 renderer.shadowMap.enabled=!mobile;
 renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.domElement.setAttribute('aria-label','Interactive 3D town, buildings and countryside');
 renderer.domElement.style.touchAction='pan-y';
 mount.appendChild(renderer.domElement);
 mount.dataset.status='ready';
 const scene=new T.Scene();
 scene.fog=new T.FogExp2('#cbd5c1',.012);
 const camera=new T.OrthographicCamera(-15,15,9,-9,.1,130);
 let targetZoom=1,zoom=1;
 const target=new T.Vector3(0,.6,-4.4);
 const mats=new Map();
 function mat(name,color,rough=.94,metalness=0){
   if(!mats.has(name))mats.set(name,new T.MeshStandardMaterial({color,roughness:rough,metalness,flatShading:true}));
   return mats.get(name)
 }
 function mesh(parent,geo,mt,x=0,y=0,z=0){
   const m=new T.Mesh(geo,mt);m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=!mobile;parent.add(m);return m;
 }
 function box(p,w,h,d,mt,x=0,y=0,z=0){return mesh(p,new T.BoxGeometry(w,h,d),mt,x,y,z)}
 function cone(p,r,h,mt,x=0,y=0,z=0,n=5){return mesh(p,new T.ConeGeometry(r,h,n),mt,x,y,z)}
 function sphere(p,r,mt,x=0,y=0,z=0,segments=7){return mesh(p,new T.IcosahedronGeometry(r,segments>9?1:0),mt,x,y,z)}
 const green=mat('grass','#7fa563'),darkGrass=mat('darkgrass','#689351'),grassLight=mat('freshgrass','#9fbd7b'),path=mat('path','#ccbfa6'),pathAlt=mat('pathalt','#e1d5bb'),wood=mat('wood','#8e6d50'),stone=mat('stone','#b3b5a1'),white=mat('white','#f7f4e9'),windowMat=mat('glass','#a9c6c9'),shadowMat=mat('shadow','#71886a');
 // Rolling countryside with a winding lane and distant village.
 mesh(scene,new T.PlaneGeometry(160,160),green,0,-.24,0).rotation.x=-Math.PI/2;
 for(let k=0;k<9;k++){
  const hill=mesh(scene,new T.SphereGeometry(1,18,8),k%2?grassLight:darkGrass,(k-4)*10,-2.3,-20-(k%4)*4);
  hill.scale.set(9+(k%3)*2,2.4+(k%2),4.6);
 }
 const lane=new T.Group();scene.add(lane);
 const laneNodes=[[-10,8],[-7,5],[-4,2],[-1,.3],[2,-1],[5,-3],[8,-5]];
 for(let i=0;i<laneNodes.length-1;i++){
  let a=laneNodes[i],b=laneNodes[i+1],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
  let m=box(lane,len,.018,2.2,path,(a[0]+b[0])/2,-.20,(a[1]+b[1])/2);
  m.rotation.y=-Math.atan2(dz,dx);m.castShadow=false;
  const edge=box(lane,len,.022,.09,pathAlt,(a[0]+b[0])/2,-.175,(a[1]+b[1])/2+1.05);
  edge.rotation.y=m.rotation.y;edge.castShadow=false;
 }
 // Buildings have consistent geometry; original house architecture is not modified.
 const pickTargets=[];
 const venues=[];
 const buildingColors=['#d3ad86','#e3c788','#c7b19c','#bba797','#c8a6a0','#cc986f','#d1c7b5','#a5b5ac','#ad986d'];
 function roofShape(parent,w,d,col,y){
  const roof=new T.Group();parent.add(roof);roof.position.y=y;
  // Gable roof with two sloped planes.
  for(const side of [-1,1]){
   let panel=box(roof,w*.565,.11,d+.18,mat('roof'+col,col),side*w*.245,.35,0);
   panel.rotation.z=side*.58;
  }
  return roof;
 }
 function house(x,z,w,h,d,facade,roofColor,opts={}){
  const root=new T.Group();root.position.set(x,0,z);scene.add(root);
  const wall=mat('housewall'+facade,facade),roof=mat('houseroof'+roofColor,roofColor);
  box(root,w,h,d,wall,0,h/2,0);
  roofShape(root,w,d,roofColor,h);
  if(opts.chimney)box(root,.34,.82,.37,roof,w*.22,h+.48,-d*.16);
  const front=d/2+.017;
  for(let floor=0;floor<(h>3.8?2:1);floor++){
   for(let side=-1;side<=1;side+=2){
    const ww=box(root,.48,.64,.045,windowMat,side*w*.27,1.55+floor*1.57,front);
    box(root,.58,.08,.08,white,side*w*.27,1.18+floor*1.57,front+.04);
    box(root,.06,.64,.08,white,side*w*.27,1.55+floor*1.57,front+.05);
   }
  }
  box(root,.66,1.22,.065,mat('door'+(opts.door||'#7e6552'),opts.door||'#7e6552'),0,.61,front);
  sphere(root,.056,mat('brass','#d8b279'),.24,.67,front+.08);
  // Doorstep.
  box(root,1.08,.095,.55,stone,0,-.07,front+.31).castShadow=false;
  return root
 }
 const definitions=[
  {id:'home',name:'Your Home',x:-7.4,z:1.6,w:2.55,h:2.55,d:2.7,color:'#d8b78d',roof:'#967c70',door:'#6c7a63'},
  {id:'park',name:'Riverside Park',x:-8.5,z:-5.6,w:2.3,h:2.65,d:2.3,color:'#d9c08b',roof:'#898579',door:'#88a18c'},
  {id:'cafe',name:'Little Bean Café',x:-3.9,z:-5.5,w:3.1,h:3.05,d:2.8,color:'#d6a088',roof:'#9b685f',door:'#ad7058'},
  {id:'market',name:'Corner Market',x:-.2,z:-6,w:3.4,h:2.8,d:3,color:'#d0c5a4',roof:'#8a765e',door:'#728c7e'},
  {id:'studio',name:'Creative Studio',x:4.2,z:-5.5,w:3.6,h:3.9,d:2.8,color:'#acb9aa',roof:'#818e88',door:'#766e65'},
  {id:'office',name:'Central Office',x:8.65,z:-5.2,w:3,h:4.7,d:2.8,color:'#b0a9b9',roof:'#7a777e',door:'#8b7d78'},
  {id:'library',name:'Community Library',x:2.4,z:2.9,w:2.8,h:2.5,d:2.5,color:'#e1c58d',roof:'#998a6a',door:'#a4734f'},
  {id:'gym',name:'Fitness Club',x:7.7,z:3.2,w:2.8,h:2.5,d:2.5,color:'#b5c6ba',roof:'#748a78',door:'#8a8b72'}
 ];
 for(const d of definitions){
  let b=house(d.x,d.z,d.w,d.h,d.d,d.color,d.roof,{door:d.door,chimney:d.id==='home'||d.id==='library'});
  b.userData.venue=d.id;
  b.traverse(obj=>{if(obj.isMesh){obj.userData.venue=d.id;pickTargets.push(obj)}});
  venues.push({id:d.id,root:b,where:new T.Vector3(d.x,0,d.z),name:d.name});
 }
 // Secondary homes span the horizon, like a tiny pastoral village.
 for(let k=0;k<21;k++){
  let x=-21+k*2.08,z=-17.7-(k%3)*1.6,w=1.45+(k%4)*.16,h=1.4+(k%3)*.42;
  let col=buildingColors[k%buildingColors.length];
  let b=house(x,z,w,h,1.55,col,['#8c786f','#a1907c','#75746d','#9b6c62'][k%4],{chimney:k%5===0});
  b.scale.setScalar(.94);
 }
 function tree(x,z,scale=1){
  const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(scale);scene.add(g);
  box(g,.21,.85,.21,wood,0,.43,0);
  if((Math.abs(Math.floor(x*10+z))%3)===0){
   sphere(g,.75,mat('bush','#6d9460'),0,1.38,0);
   sphere(g,.53,mat('bush2','#88ac73'),.39,1.58,.18);
  }else{
   cone(g,.82,1.55,mat('tree','#57794b'),0,1.35,0,6);
   cone(g,.61,1.2,mat('tree2','#688b55'),0,2.05,0,6);
  }
  return g
 }
 for(let k=0;k<50;k++){
  const x=-25+k*1.03+(k%3)*.21,z=(k%2===0?-10.8:10.8)+(k%5)*.68;
  if(k%3!==0)tree(x,z,.59+(k%5)*.1);
 }
 for(let k=0;k<18;k++)tree(-22+(k*9.31)%46,-10-(k*5.17)%8,.46+(k%5)*.14);
 // Sheep: individually animated with tiny grazing gestures.
 const animals=[];
 function animal(x,z,cow=false){
  const root=new T.Group();root.position.set(x,0,z);scene.add(root);
  let body=box(root,cow?1.32:.80,cow?.61:.44,cow?.55:.48,cow?white:mat('wool','#f2f0e2'),0,.56,0);
  if(!cow){
   for(const [bx,bz] of [[-.25,-.21],[.24,-.21],[-.25,.2],[.24,.2]])box(root,.09,.32,.09,mat('hoof','#40443d'),bx,.2,bz);
   sphere(root,.25,mat('sheephead','#ddd9cd'),.5,.64,0);
   box(root,.10,.12,.14,mat('face','#33362e'),.7,.57,0);
  }else{
   for(let n=0;n<4;n++)box(root,.12,.42,.12,mat('cowleg','#393e35'),(n%2?.44:-.44),.19,(n<2?-.18:.18));
   box(root,.40,.42,.42,white,.83,.57,0);
   box(root,.16,.16,.13,mat('cowmark','#363d38'),.91,.51,.09);
   box(root,.45,.25,.08,mat('cowpatch','#444b45'),-.30,.91,0);
  }
  animals.push({root,initX:x,initZ:z,seed:(x+z)*.8});
 }
 for(let k=0;k<12;k++)animal(-12+(k*7.13)%26,6.6+(k*3.77)%7,k%5===0);

 // TOWN_PEOPLE_V2: miniature residents travel between jobs and shared spaces.
 const people=[];
 function resident(color,x,z,hairColor){
   const g=new T.Group();g.position.set(x,0,z);scene.add(g);
   const shirt=mat('person'+color,color),skin=mat('personSkin','#c8a184');
   const hair=mat('personHair'+hairColor,hairColor),trousers=mat('pants','#6d766c');
   const body=box(g,.34,.52,.24,shirt,0,.83,0);
   sphere(g,.215,skin,0,1.27,0);
   let scalp=sphere(g,.218,hair,0,1.39,-.035);scalp.scale.set(1,.47,1.15);
   box(g,.13,.45,.17,trousers,-.1,.30,0);
   box(g,.13,.45,.17,trousers,.1,.30,0);
   const armL=box(g,.09,.46,.12,skin,-.23,.83,0);
   const armR=box(g,.09,.46,.12,skin,.23,.83,0);
   people.push({g,armL,armR,home:new T.Vector3(x,0,z),goal:new T.Vector3(x,0,z),scale:1});
   return people[people.length-1]
 }
 const player=resident('#b98b78',-7.1,2.8,'#4f3930');
 const partner=resident('#c3be90',-7.8,2.4,'#5d493e');
 const locals=[
  resident('#91a69d',-1.8,3.9,'#493a36'),
  resident('#c5a88e',2.9,4.6,'#655344'),
  resident('#9eaaa4',6.2,3.8,'#4b3935'),
  resident('#bda2a6',-3.0,-1.1,'#57483b')
 ];
 function targetPlace(job){
   const jobToVenue={walk:'park',cafe:'cafe',coffee:'cafe',groceries:'market',shop:'market',deliver:'market',studio:'studio',workshop:'studio',manager:'office',fitness:'gym',library:'library'};
   const id=jobToVenue[job]||job;
   const v=venues.find(x=>x.id===id);
   return v?new T.Vector3(v.where.x,0,v.where.z+2.4):new T.Vector3(-7.4,0,2.8)
 }
 function animateResidents(state,elapsed){
   const me=state.outing||state.selfShift;
   const their=state.partnerShift;
   player.goal.copy(me?targetPlace(me):player.home);
   partner.goal.copy(their?targetPlace(their):partner.home);
   locals.forEach((p,i)=>{
     p.goal.x=p.home.x+Math.cos(elapsed*.16+i*1.43)*.85;
     p.goal.z=p.home.z+Math.sin(elapsed*.16+i*1.43)*.65
   });
   people.forEach((p,i)=>{
     const dx=p.goal.x-p.g.position.x,dz=p.goal.z-p.g.position.z,dist=Math.hypot(dx,dz);
     const step=Math.min(dist,.035+(i%2)*.007);
     if(dist>.02){
       p.g.position.x+=dx/dist*step;p.g.position.z+=dz/dist*step;
       p.g.rotation.y=Math.atan2(dx,dz);
       p.armL.rotation.x=Math.sin(elapsed*7+i)*.4;
       p.armR.rotation.x=-Math.sin(elapsed*7+i)*.4;
     }else{
       p.armL.rotation.x=Math.sin(elapsed*.8+i)*.035;
       p.armR.rotation.x=-Math.sin(elapsed*.8+i)*.035;
     }
     p.g.position.y=Math.sin(elapsed*(dist>.02?8:1.5)+i)*.026;
   })
 }

 // Meadow grass in one draw call using instancing.
 const count=mobile?1100:2300;
 const grassGeo=new T.ConeGeometry(.021,.30,3),grassMat=mat('blade','#accb7b');
 const grassBatch=new T.InstancedMesh(grassGeo,grassMat,count);
 const tmp=new T.Object3D();
 for(let k=0;k<count;k++){
  let u=(k*.61803398875)%1,v=(k*.41421356237)%1;
  const x=-23+u*46,z=-2+v*20;
  tmp.position.set(x,-.035,z);tmp.scale.set(.6+(k%6)*.1,.6+(k%4)*.18,1);
  tmp.rotation.set(0,k*2.39,Math.sin(k)*.18);tmp.updateMatrix();grassBatch.setMatrixAt(k,tmp.matrix);
 }
 grassBatch.instanceMatrix.needsUpdate=true;grassBatch.castShadow=false;grassBatch.receiveShadow=false;scene.add(grassBatch);
 // Garden shrubs, footpath lamps, and soft atmospheric lighting.
 for(let k=0;k<10;k++){
  let x=-12+k*2.4,z=4.7+(k%2)*1.3;
  if(k%2)continue;
  sphere(scene,.48,mat('hedge','#658c5d'),x,.4,z);
  sphere(scene,.4,mat('hedge2','#7c9d69'),x+.35,.5,z+.08);
 }
 const hemi=new T.HemisphereLight('#fff8e7','#78916c',2.1);scene.add(hemi);
 const sun=new T.DirectionalLight('#ffe5b9',2.35);sun.position.set(-9,17,9);scene.add(sun);
 if(!mobile){
  sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=28;sun.shadow.camera.bottom=-28;sun.shadow.camera.far=65;
  sun.shadow.bias=-.00035;
 }
 const raycaster=new T.Raycaster(), pointer=new T.Vector2();
 let hovered=null,down=null,orbitAngle=0,orbitTarget=0;
 const hoverBubble=document.getElementById('townHover');
 function hit(e){
  const r=renderer.domElement.getBoundingClientRect();
  pointer.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);
  raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObjects(pickTargets,false)[0];
  return hit?hit.object.userData.venue:null;
 }
 renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY}});
 renderer.domElement.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>16){down=null;return}
  down=null;
  const venue=hit(e);
  if(venue)window.HouseBossTownBridge?.selectVenue?.(venue);
 });
 renderer.domElement.addEventListener('pointermove',e=>{
  if(layer.hidden||!layer.closest('.town-active'))return;
  if(down&&e.buttons){
    if(Math.abs(e.clientX-down.x)>7){
      orbitTarget=Math.max(-.43,Math.min(.43,orbitTarget+(e.clientX-(down.lastX||e.clientX))*.003));
      down.lastX=e.clientX;
      if(hoverBubble)hoverBubble.hidden=true;
      return;
    }
  }
  const venue=hit(e);hovered=venue;
  renderer.domElement.style.cursor=venue?'pointer':'default';
  if(hoverBubble){
   const data=venues.find(v=>v.id===venue);
   hoverBubble.textContent=data?data.name:'';
   hoverBubble.hidden=!data;
   if(data){let r=layer.getBoundingClientRect();hoverBubble.style.left=Math.min(r.width-180,Math.max(12,e.clientX-r.left+16))+'px';hoverBubble.style.top=Math.max(85,e.clientY-r.top-28)+'px'}
  }
 });
 renderer.domElement.addEventListener('pointerleave',()=>{if(hoverBubble)hoverBubble.hidden=true});
 renderer.domElement.addEventListener('wheel',e=>{
  if(layer.closest('.town-active')){e.preventDefault();targetZoom=Math.max(.73,Math.min(1.5,targetZoom+(e.deltaY<0?.08:-.08)))}
 },{passive:false});
 function resize(){
  let w=Math.max(1,mount.clientWidth),h=Math.max(1,mount.clientHeight);
  renderer.setSize(w,h,false);
  const ratio=w/h, span=Math.max(13.5,Math.min(24,w<660?16:18));
  camera.left=-span*ratio/2;camera.right=span*ratio/2;
  camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix()
 }
 const ro=new ResizeObserver(resize);ro.observe(mount);resize();
 let stopped=false,prev=0;
 function frame(ms){
  if(stopped)return;
  requestAnimationFrame(frame);
  if(!layer.closest('.town-active')||document.hidden)return;
  if(ms-prev<32)return;prev=ms;
  let state=window.HouseBossTownBridge?.getState?.()||{};
  const hour=(state.time||540)/60,night=hour>=20||hour<6;
  sun.intensity+=( (night?.52:hour>17?1.6:2.35)-sun.intensity)*.07;
  hemi.intensity+=( (night?1.05:2.1)-hemi.intensity)*.07;
  zoom+=(targetZoom-zoom)*.12;
  camera.zoom=zoom;orbitAngle+=(orbitTarget-orbitAngle)*.05;
  camera.position.set(Math.sin(.78+orbitAngle)*27,11.8,Math.cos(.78+orbitAngle)*27);
  camera.lookAt(target);camera.updateProjectionMatrix();
  const sec=ms/1000;
  animals.forEach((a,k)=>{
   a.root.position.x=a.initX+Math.sin(sec*.23+a.seed)*.18;
   a.root.rotation.y=Math.sin(sec*.24+a.seed)*.20;
   a.root.position.y=Math.sin(sec*.75+a.seed)*.022;
  });
  animateResidents(state,sec);
  mount.style.filter=night?'brightness(.78) saturate(.84)':hour>17?'sepia(.08)':'none';
  renderer.render(scene,camera);
 }
 requestAnimationFrame(frame);
 window.addEventListener('pagehide',()=>{
  stopped=true;ro.disconnect();renderer.dispose();
 },{once:true});
 window.HouseBossTown3D={ready:true,highlightPlace(id){
   const v=venues.find(x=>x.id===id);
   if(v)targetZoom=1.06;
  },reset(){targetZoom=1}};
})();