/* İçeridekiler / WebGL organism stage. Three.js is optional: the Canvas game remains playable. */
import * as THREE from 'https://esm.sh/three@0.169.0';
const ready=()=>new Promise(resolve=>{let n=0;const poll=()=>{if(window.immuneBridge)return resolve(window.immuneBridge);if(++n<90)setTimeout(poll,60)};poll()});
const api=await ready();
if(api){
 const canvas=document.getElementById('webgl-stage'),base=document.getElementById('world');
 try{
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.35;
  renderer.setClearColor(0x05050c,1);
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x05050c);
  scene.fog=new THREE.FogExp2(0x070612,.00038);
  const camera=new THREE.OrthographicCamera(-450,450,262.5,-262.5,1,1600);
  camera.position.set(0,0,800);camera.lookAt(0,0,0);
  scene.add(new THREE.HemisphereLight(0xe8eaff,0x372033,2.0));
  const light=(color,intensity,x,y,z)=>{const l=new THREE.PointLight(color,intensity,1150,2);l.position.set(x,y,z);scene.add(l)};
  light(0xffa45e,12000,-290,180,280);
  light(0x60dbea,9500,270,-130,220);
  light(0xba81ff,7500,260,180,60);
  const cells=new Map(), microbes=new Map(), tissues=new Map();
  const colors={
   macro:[0xffca6a,0xf39755],neutro:[0xffb2bb,0xee6784],dend:[0x9affdf,0x52c9b8],
   nk:[0xd8b4ff,0x9d76ef],tcell:[0x91c9ff,0x6b8df0],bcell:[0xe6ffaf,0x9de578],
   treg:[0xffc8ee,0xd683c0],fibro:[0xffdbab,0xcd9879]
  };
  const sphere=new THREE.SphereGeometry(1,22,16);
  const tiny=new THREE.SphereGeometry(1,10,8);
  const createJelly=(type,id)=>{
   const palette=colors[type]||colors.macro;
   const group=new THREE.Group();
   const material=new THREE.MeshPhysicalMaterial({color:palette[0],roughness:.26,metalness:0,transmission:.28,thickness:1.7,clearcoat:.68,clearcoatRoughness:.17,emissive:palette[1],emissiveIntensity:.22,transparent:true,opacity:.91,depthWrite:true});
   const body=new THREE.Mesh(sphere,material);body.scale.set(1,1.12,.7);group.add(body);
   const glow=new THREE.Mesh(sphere,new THREE.MeshBasicMaterial({color:palette[1],transparent:true,opacity:.09,depthWrite:false}));glow.scale.set(1.27,1.35,.86);group.add(glow);
   const nucleus=new THREE.Mesh(tiny,new THREE.MeshStandardMaterial({color:palette[1],emissive:palette[1],emissiveIntensity:.2,transparent:true,opacity:.58,roughness:.32}));nucleus.scale.set(.34,.37,.24);nucleus.position.set(.10,-.20,.43);group.add(nucleus);
   const eyeMat=new THREE.MeshBasicMaterial({color:0x2e252e});
   for(const px of [-.20,.20]){const eye=new THREE.Mesh(tiny,eyeMat);eye.scale.set(.056,.075,.045);eye.position.set(px,.11,.66);group.add(eye)}
   // Cells have differentiated pseudopods, but the silhouettes remain soft and readable.
   if(type==='dend'||type==='nk'||type==='macro'){
    for(let i=0;i<(type==='dend'?5:type==='nk'?2:3);i++){
     const a=(i+.1)*Math.PI*2/(type==='nk'?2:5);
     const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.48,3,5),material);
     arm.position.set(Math.cos(a)*.78,Math.sin(a)*.79,.01);
     arm.rotation.z=-a+Math.PI/2;group.add(arm);
    }
   } else if(type==='neutro'||type==='bcell'){
    for(const dx of [-.42,.42]){const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.085,.28,3,5),material);leg.position.set(dx,-.98,0);group.add(leg)}
   }
   group.userData={type,seed:id*1.93,body,glow,nucleus,material};
   scene.add(group);return group;
  };
  const microMat={
   bacteria:new THREE.MeshStandardMaterial({color:0xffa77b,emissive:0xa5493d,emissiveIntensity:.54,roughness:.35}),
   virus:new THREE.MeshStandardMaterial({color:0xbca6ff,emissive:0x7760ef,emissiveIntensity:.65,roughness:.35}),
   allergen:new THREE.MeshStandardMaterial({color:0xf6b2df,emissive:0xd86bac,emissiveIntensity:.45,roughness:.35})
  };
  const cmat=new THREE.MeshPhysicalMaterial({color:0x8bdacf,roughness:.4,transmission:.45,transparent:true,opacity:.14,depthWrite:false,emissive:0x3d9e8d,emissiveIntensity:.12});
  const infectedMat=cmat.clone();infectedMat.color.setHex(0xf0a4bc);infectedMat.emissive.setHex(0xff638f);infectedMat.opacity=.32;
  const bg=[];
  const dustMat=new THREE.PointsMaterial({size:1.65,color:0x987dca,transparent:true,opacity:.32,depthWrite:false});
  const dustPos=new Float32Array(540*3);
  for(let i=0;i<540;i++){dustPos[i*3]=(Math.random()-.5)*1250;dustPos[i*3+1]=(Math.random()-.5)*920;dustPos[i*3+2]=-70-Math.random()*380}
  const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));scene.add(new THREE.Points(dustGeo,dustMat));
  const zones=[
   {x:108,y:266,c:0x55c8ed,r:86},{x:450,y:268,c:0xea789b,r:175},
   {x:710,y:106,c:0xa278f6,r:94},{x:766,y:416,c:0x6de3a8,r:95}
  ];
  for(const z of zones){
   const mat=new THREE.MeshBasicMaterial({color:z.c,transparent:true,opacity:.045,depthWrite:false,side:THREE.DoubleSide});
   const field=new THREE.Mesh(new THREE.CircleGeometry(z.r,40),mat);field.position.set(z.x-450,262.5-z.y,-80);scene.add(field);bg.push(field);
   const edge=new THREE.Mesh(new THREE.RingGeometry(z.r*.8,z.r*.806,48),new THREE.MeshBasicMaterial({color:z.c,transparent:true,opacity:.23,side:THREE.DoubleSide,depthWrite:false}));
   edge.position.copy(field.position);scene.add(edge);
  }
  const hostGeo=new THREE.SphereGeometry(1,14,10);
  let lastW=0,lastH=0;
  function resize(){
   const rect=canvas.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height);
   if(w===lastW&&h===lastH)return;
   lastW=w;lastH=h;
   const pixelRatio=Math.min(window.devicePixelRatio||1,w<700?1.35:1.65);
   renderer.setPixelRatio(pixelRatio);renderer.setSize(w,h,false);
  }
  function updateMesh(map,items,creator,scaleFor,transform,now){
   const seen=new Set();
   for(const item of items){
    if(item.id==null)continue;
    seen.add(item.id);
    let mesh=map.get(item.id);
    if(!mesh){mesh=creator(item);map.set(item.id,mesh)}
    transform(mesh,item,now);
   }
   for(const [id,mesh] of map)if(!seen.has(id)){
    scene.remove(mesh);map.delete(id);
   }
  }
  function anim(now){
   if(!document.body.contains(canvas))return;
   requestAnimationFrame(anim);
   if(document.hidden)return;
   resize();
   const d=api.read(),state=d.state;
   if(!d.agents||!state)return;
   const cam=d.camera;
   // World-to-screen camera units: match the original 2D scene on any aspect ratio.
   const aspect=lastW/Math.max(1,lastH);
   const visibleH=525/cam.zoom,visibleW=visibleH*aspect;
   camera.left=-visibleW/2;camera.right=visibleW/2;camera.top=visibleH/2;camera.bottom=-visibleH/2;
   camera.position.set(cam.x-450,262.5-cam.y,760);
   camera.updateProjectionMatrix();
   const scale=1;
   updateMesh(cells,d.agents,a=>createJelly(a.type,a.id),scale,(mesh,a,time)=>{
    const r=(d.types[a.type]?.r||16)*1.02;
    const phase=time*.0018+mesh.userData.seed;
    const pulse=1+Math.sin(phase*1.27)*.045;
    mesh.position.set(a.x-450,262.5-a.y+Math.sin(phase)*2.7,19+Math.sin(phase*.5)*2);
    mesh.scale.set(r*pulse,r*(1+Math.sin(phase*.65)*.035),r);
    mesh.rotation.z=Math.sin(phase*.62)*.07;
    mesh.userData.material.emissiveIntensity=a.hit>0?.67:.22;
   },now);
   updateMesh(microbes,d.particles,a=>{
     const mat=microMat[a.type]||microMat.bacteria;
     const mesh=new THREE.Mesh(a.type==='bacteria'?new THREE.CapsuleGeometry(.85,1.05,4,7):new THREE.IcosahedronGeometry(1,1),mat);
     scene.add(mesh);return mesh;
   },scale,(mesh,a,time)=>{
     mesh.position.set(a.x-450,262.5-a.y,27);const s=a.type==='virus'?7.7:a.type==='allergen'?5:6.4;
     mesh.scale.set(s,s,s);mesh.rotation.z=time*.001+(a.id%13);
   },now);
   updateMesh(tissues,d.hosts,a=>{
     const mesh=new THREE.Mesh(hostGeo,cmat.clone());scene.add(mesh);return mesh;
   },scale,(mesh,h,time)=>{
     mesh.position.set(h.x-450,262.5-h.y,-22);
     const v=1+Math.sin(time*.0008+h.id)*.035;const k=lastW<700?.65:1;mesh.scale.set(40*v*k,29*v*k,9*k);
     const m=mesh.material;if(h.infect>0){m.color.setHex(0xf0a4bc);m.emissive.setHex(0xff638f);m.opacity=.37;}
     else if(h.dead){m.opacity=.08;}else{m.color.setHex(0x8bdacf);m.emissive.setHex(0x3d9e8d);m.opacity=lastW<700?.105:.15;}
   },now);
   for(const b of bg)b.material.opacity=state.phase==='active'?.060:.035;
   try{renderer.render(scene,camera)}catch(error){
    console.warn('[İçeridekiler] WebGL rendering failed, Canvas fallback restored.',error);
    api.useWebGL(false);canvas.remove();renderer.dispose();return;
   }
  }
  api.useWebGL(true);
  document.getElementById('render-mode')?.replaceChildren(document.createTextNode('WEBGL 3D'));
  window.addEventListener('pagehide',()=>{api.useWebGL(false);renderer.dispose()},{once:true});
  requestAnimationFrame(anim);
 }catch(err){console.warn('[İçeridekiler] WebGL unavailable; using Canvas fallback',err);canvas.remove();}
}
