/* Evin Patronu — real-time kitchen scene. Three.js r161, no 3D asset downloads.
   Preserves gameplay in evin-patronu.html; gracefully falls back to SVG. */
(async function () {
  var host = document.getElementById('kitchen3d');
  if (!host) return;
  var THREE;
  try {
    THREE = await import('https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js');
    if (!window.WebGLRenderingContext) throw new Error('WebGL unavailable');
  } catch (e) {
    host.dataset.status = 'fallback';
    console.warn('Evin Patronu 3D unavailable; using original scene.', e);
    return;
  }
  var scene = new THREE.Scene();
  scene.background = new THREE.Color('#dfe5d7');
  var mobile = matchMedia('(pointer: coarse)').matches;
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({antialias: !mobile,alpha:false,powerPreference: mobile ? 'low-power':'high-performance'});
  } catch (e) {
    host.dataset.status = 'fallback';
    console.warn('WebGL renderer unavailable',e);
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1,mobile?1.35:1.8));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.38;
  renderer.domElement.setAttribute('aria-label','Etkileşimli üç boyutlu mutfak. Nesne seçmek için dokun; sahneyi sürükleyerek hareket ettir.');
  renderer.domElement.style.touchAction='none';
  host.appendChild(renderer.domElement);
  var camera = new THREE.OrthographicCamera(-11,11,7,-7,.1,100);
  var defaultTarget = new THREE.Vector3(0,1.8,-.25);
  var cameraTarget = defaultTarget.clone();
  var lookAt = defaultTarget.clone();
  var orbitDir = new THREE.Vector3(18,20,23).normalize();
  var zoom=1, targetZoom=1;
  var pickables=[], actors={}, markers={}, selection=null, hovered=null;
  var pointer = new THREE.Vector2();
  var raycaster = new THREE.Raycaster();
    var mats={};
  function mat(name,color,roughness,metalness){return mats[name] || (mats[name]=new THREE.MeshStandardMaterial({color:color,roughness:roughness===undefined?.82:roughness,metalness:metalness||0}))}
  var ivory=mat('ivory','#ede9db'),green=mat('green','#bdc6a0'),black=mat('black','#252626'),brick=mat('brick','#b87552'),stainless=mat('metal','#b6bec0',.24,.65);
  var wood=mat('wood','#a96f49',.55),woodDark=mat('wooddark','#6c4a31',.73),cream=mat('cream','#f9f6ed');
  function addMesh(parent,geo,material,x,y,z,cast=true,receive=true){
    var o=new THREE.Mesh(geo,material);o.position.set(x,y,z);o.castShadow=cast;o.receiveShadow=receive;parent.add(o);return o
  }
  function box(parent,w,h,d,material,x,y,z){return addMesh(parent,new THREE.BoxGeometry(w,h,d),material,x,y,z)}
  function ball(parent,rx,ry,rz,material,x,y,z){
    var o=addMesh(parent,new THREE.SphereGeometry(1,18,12),material,x,y,z);o.scale.set(rx,ry,rz);return o
  }
  function cylinder(parent,r1,r2,h,material,x,y,z,radial=16){
    return addMesh(parent,new THREE.CylinderGeometry(r1,r2,h,radial),material,x,y,z)
  }
  function torus(parent,r,t,material,x,y,z){
    var o=addMesh(parent,new THREE.TorusGeometry(r,t,8,32),material,x,y,z);o.rotation.x=Math.PI/2;return o
  }
  function capsule(parent,from,to,r,material){
    var A=new THREE.Vector3(...from),Z=new THREE.Vector3(...to),d=Z.clone().sub(A);
    var o=cylinder(parent,r,r,d.length(),material,...A.clone().add(Z).multiplyScalar(.5).toArray());
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o
  }
  function makeTexture(width,height,draw){
    var c=document.createElement('canvas');c.width=width;c.height=height;
    var ctx=c.getContext('2d');draw(ctx,width,height);
    var tx=new THREE.CanvasTexture(c);tx.colorSpace=THREE.SRGBColorSpace;tx.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return tx;
  }
  // Floor is a real plane with highly repeatable grout lines, not an image backdrop.
  var tile=makeTexture(1024,704,function(ctx,W,H){
    ctx.fillStyle='#f3f0e5';ctx.fillRect(0,0,W,H);
    var tw=W/20,th=H/14;
    for(var y=0;y<14;y++)for(var x=0;x<20;x++){
      var a=(x+y)%2===0;
      ctx.fillStyle=a?'#1e2525':'#f5f0e5';
      ctx.fillRect(x*tw+.8,y*th+.8,tw-1.6,th-1.6);
      if(!a){ctx.fillStyle='rgba(168,153,132,.11)';ctx.fillRect(x*tw+3,y*th+3,tw-6,2);}
    }
    ctx.strokeStyle='rgba(38,32,30,.2)';ctx.lineWidth=1;
    for(var xx=0;xx<=20;xx++){ctx.beginPath();ctx.moveTo(xx*tw,0);ctx.lineTo(xx*tw,H);ctx.stroke()}
    for(var yy=0;yy<=14;yy++){ctx.beginPath();ctx.moveTo(0,yy*th);ctx.lineTo(W,yy*th);ctx.stroke()}
  });
  var floorMat=new THREE.MeshStandardMaterial({map:tile,roughness:.86});
  var floor=addMesh(scene,new THREE.PlaneGeometry(18,11),floorMat,0,-.015,0,false,true);
  floor.rotation.x=-Math.PI/2;
  var base=box(scene,18,.21,11,mat('base','#d7d3c7'),0,-.13,0);base.castShadow=false;
  // Back and side walls, with thick painted window reveals.
  var plaster=mat('plaster','#f8f7ef',.95);
  box(scene,18,7,.18,plaster,0,3.48,-5.58);
  box(scene,.2,7,11,plaster,-8.98,3.48,0);
  var sill=mat('sill','#e9e8de',.65);
  function windowGarden(){
    var grass=makeTexture(760,380,function(ctx,W,H){
      var sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#b4d2ad');sky.addColorStop(.48,'#d9e0b0');sky.addColorStop(.51,'#778d59');sky.addColorStop(1,'#9aab72');
      ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
      for(var i=0;i<9500;i++){var x=(i*73.1)%W,y=H*.45+((i*17.3)%(H*.55));var t=i%4;ctx.fillStyle=['#7c9860','#99b06b','#617c50','#c0c68e'][t];ctx.fillRect(x,y,1+(i%3),3+(i%6));}
    });
    var gardenMat=new THREE.MeshBasicMaterial({map:grass});
    var pane=addMesh(scene,new THREE.PlaneGeometry(6.4,3.85),gardenMat,-4.7,3.9,-5.47,false,false);
    // window mullions, sash & deep sill
    var wFrame=mat('frame','#fdfcf6',.45);
    box(scene,6.75,.19,.35,wFrame,-4.7,5.9,-5.22);
    box(scene,6.75,.24,.53,wFrame,-4.7,1.88,-5.19);
    for(var x of [-8.1,-4.7,-1.3])box(scene,.18,4.06,.32,wFrame,x,3.89,-5.2);
    box(scene,6.45,.14,.31,wFrame,-4.7,3.86,-5.19);
    box(scene,7,.15,.8,sill,-4.7,1.78,-4.93);
    // small potted plants on sill
    plant(-6.6,1.96,-4.83,.65);plant(-2.3,1.96,-4.85,.52);
  }
  function plant(x,y,z,scale,parent){
    var g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(scale);(parent||scene).add(g);
    cylinder(g,.24,.16,.44,mat('terracotta','#b76c4e'),0,.22,0);
    cylinder(g,.21,.21,.04,mat('earth','#53452f'),0,.47,0);
    for(var i=0;i<7;i++){
      var a=i*Math.PI*2/7,tip=[Math.cos(a)*(.18+i%2*.12),.85+i%3*.11,Math.sin(a)*(.18+i%2*.1)];
      capsule(g,[0,.47,0],tip,.027,mat('stem','#5a7743'));
      var leaf=ball(g,.12,.05,.22,mat('leaf'+i,i%2?'#799e65':'#507c49'),tip[0],tip[1],tip[2]);
      leaf.rotation.y=-a;
    }return g
  }
  windowGarden();
  // Graphic art on side wall; canvas texture behaves as framed print.
  function artCanvas(){
    var tx=makeTexture(480,680,function(ctx,W,H){
      ctx.fillStyle='#eeeae0';ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#141917';ctx.fillRect(36,24,W-72,H-48);
      ctx.fillStyle='#ebece5';
      ctx.beginPath();ctx.moveTo(100,90);ctx.lineTo(390,120);ctx.lineTo(358,225);ctx.lineTo(96,248);ctx.fill();
      ctx.fillStyle='#111916';
      ctx.beginPath();ctx.arc(172,160,46,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(308,167,47,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#e3e5dd';
      ctx.beginPath();ctx.moveTo(98,274);ctx.lineTo(195,330);ctx.lineTo(158,526);ctx.lineTo(75,513);ctx.fill();
      ctx.beginPath();ctx.moveTo(389,270);ctx.lineTo(299,322);ctx.lineTo(336,525);ctx.lineTo(415,510);ctx.fill();
      ctx.strokeStyle='#d3ddd3';ctx.lineWidth=24;ctx.beginPath();ctx.moveTo(114,344);ctx.lineTo(368,491);ctx.moveTo(372,341);ctx.lineTo(110,491);ctx.stroke();
      ctx.fillStyle='#edece3';ctx.fillRect(37,580,406,31);
    });
    var frame=box(scene,.13,4.5,3.4,black,-8.79,4.15,-1.43);
    var picture=addMesh(scene,new THREE.PlaneGeometry(3.05,4.1),new THREE.MeshBasicMaterial({map:tx}),-8.68,4.15,-1.43,false,false);
    picture.rotation.y=Math.PI/2; // side-facing plane
    frame.rotation.y=0;
  }
  artCanvas();
  // Strong but soft daylight; a warm fill mimics sun reflected from table.
  var hemi=new THREE.HemisphereLight('#f9fcfa','#a59b84',2.0);scene.add(hemi);
  var sun=new THREE.DirectionalLight('#fff7e4',3.4);
  sun.position.set(-5.1,12,7);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);
  sun.shadow.camera.left=-16;sun.shadow.camera.right=16;sun.shadow.camera.top=16;sun.shadow.camera.bottom=-16;
  sun.shadow.camera.near=.1;sun.shadow.camera.far=42;sun.shadow.bias=-.0005;sun.shadow.normalBias=.016;
  sun.shadow.radius=3.5;scene.add(sun);
  var fill=new THREE.DirectionalLight('#deeff3',.82);fill.position.set(8,5,-3);scene.add(fill);
  // Real wooden table and cabinetry. Grain texture wraps the full surface.
  var woodMap=makeTexture(1024,350,function(ctx,W,H){
    ctx.fillStyle='#b67e51';ctx.fillRect(0,0,W,H);
    for(var i=0;i<220;i++){
      var y=(i*17.1)%H;
      ctx.strokeStyle=i%4===0?'rgba(59,36,23,.24)':'rgba(247,208,153,.16)';
      ctx.lineWidth=.5+(i%3)*.35;ctx.beginPath();ctx.moveTo(0,y);
      ctx.bezierCurveTo(W*.35,y+Math.sin(i)*4,W*.7,y-Math.cos(i)*5,W,y+2);
      ctx.stroke();
    }
    ctx.strokeStyle='rgba(68,43,27,.34)';ctx.lineWidth=3;
    for(var x=1;x<6;x++){ctx.beginPath();ctx.moveTo(x*W/6,0);ctx.lineTo(x*W/6,H);ctx.stroke()}
  });
  var tableWood=new THREE.MeshStandardMaterial({map:woodMap,roughness:.47,metalness:.02});
  function interactive(group,station,label){
    group.userData.station=station;group.userData.label=label;
    group.traverse(function(obj){if(obj.isMesh){obj.userData.owner=group;pickables.push(obj)}});
    return group;
  }
  var stationPositions={
    stove:new THREE.Vector3(6.9,1.1,-3.45),sink:new THREE.Vector3(7,1.12,-1),
    table:new THREE.Vector3(.25,1.35,-.5),desk:new THREE.Vector3(2.4,1.4,-1.45),
    kid:new THREE.Vector3(-1.7,1.05,2.6),floor:new THREE.Vector3(-4.5,.08,3.5),
    laundry:new THREE.Vector3(6.8,.8,2.35),pet:new THREE.Vector3(-5.8,.15,3.7)
  };
  function furnitureTable(){
    var g=new THREE.Group();scene.add(g);g.position.set(.15,0,-.1);
    box(g,9.55,.16,3.15,woodDark,0,1.27,0);
    box(g,9.35,.1,3.1,tableWood,0,1.39,0);
    for(var x of [-4.18,4.18])for(var z of [-1.15,1.15])box(g,.19,1.23,.19,woodDark,x,.61,z);
    box(g,8.7,.22,.14,woodDark,0,1.0,1.31);
    box(g,8.7,.22,.14,woodDark,0,1.0,-1.31);
    interactive(g,'table','Masa · ödev ve yemek');
    return g;
  }
  furnitureTable();
  function chair(x,z,rot,col){
    var g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);
    var material=mat('chair'+col,col,.75);
    box(g,.88,.13,.8,material,0,.85,0);
    for(var dx of [-.35,.35])for(var dz of [-.26,.26])box(g,.075,.8,.08,woodDark,dx,.4,dz);
    box(g,.86,.9,.13,material,0,1.32,-.37);
    return g;
  }
  chair(-4.7,2.6,.05,'#d0be92');
  chair(-.7,2.45,.15,'#a3937e');
  chair(3.2,2.4,-.25,'#7b7665');
  chair(-4.5,-2.5,Math.PI,'#8d6855');
  chair(2,-2.65,Math.PI,'#9a4c53');
  function cabinetGroup(){
    var g=new THREE.Group();scene.add(g);g.position.set(6.72,0,-1.65);
    // two grounded kitchen runs: right wall counters
    for(var z of [-2.25,.1,2.23]){
      box(g,1.7,1.4,2.12,mat('cabinet','#eeeee6'),0,.73,z);
      box(g,1.9,.15,2.3,tableWood,0,1.49,z);
      box(g,.07,1.18,1.82,mat('door','#d6d7cf'),-.86,.76,z);
      capsule(g,[-.91,.7,z-.33],[-.91,.7,z+.35],.035,stainless);
    }
    var sink=new THREE.Group();sink.position.set(6.65,0,-.9);scene.add(sink);
    box(sink,1.18,.06,.95,stainless,0,1.61,0);
    var basin=box(sink,.92,.08,.67,mat('basin','#727f83',.23,.45),0,1.65,0);
    cylinder(sink,.12,.12,.04,stainless,0,1.7,0);
    capsule(sink,[.38,1.61,-.27],[.38,2.07,-.27],.036,stainless);
    capsule(sink,[.38,2.07,-.27],[.03,2.07,-.25],.038,stainless);
    capsule(sink,[.03,2.07,-.25],[.03,1.86,-.2],.036,stainless);
    interactive(sink,'sink','Lavabo · bulaşık');
    var stove=new THREE.Group();stove.position.set(6.65,0,-3.55);scene.add(stove);
    box(stove,1.32,.09,1.35,black,0,1.63,0);
    for(var xx of [-.37,.35])for(var zz of [-.36,.35]){
      var ring=torus(stove,.16,.032,mat('burner','#686969',.4,.25),xx,1.685,zz);
    }
    var pot=new THREE.Group();pot.position.set(-.32,1.76,-.18);stove.add(pot);
    cylinder(pot,.36,.32,.33,mat('pot','#808d7b',.28,.18),0,0,0);
    cylinder(pot,.38,.38,.035,stainless,0,.18,0);
    ball(pot,.09,.06,.09,black,0,.23,0);
    capsule(pot,[-.38,0,0],[-.57,.02,0],.04,stainless);
    interactive(stove,'stove','Ocak · yemek');
    interactive(g,'laundry','Mutfak dolapları');
  }
  cabinetGroup();
  // Side shelf and small art on back wall
  function shelf(y,z){
    box(scene,.75,.06,2.8,wood, -8.55,y,z);
    for(var k=0;k<4;k++){
      var pz=z-1.12+k*.68;
      cylinder(scene,.19,.18,.26,mat('plate'+k,['#b0c1ac','#d9cebc','#c4c3ae','#adb3a1'][k]),-8.43,y+.18,pz);
      cylinder(scene,.16,.16,.03,cream,-8.43,y+.35,pz);
    }
  }
  shelf(3.5,2.4);
  // Countertop objects
  function plate(x,y,z,r,food){
    var p=new THREE.Group();scene.add(p);
    cylinder(p,r,r,.055,ivory,x,y,z);
    cylinder(p,r*.76,r*.76,.015,mat('food'+food,food),x,y+.035,z);
    return p
  }
  plate(-2.4,1.48,-.2,.32,'#cb8741');
  plate(.4,1.48,.4,.27,'#d7a347');
  plate(3.7,1.48,.5,.3,'#c26e4c');
  function mug(x,z,color){
    var g=new THREE.Group();scene.add(g);
    cylinder(g,.17,.16,.28,mat('mug'+color,color,.35),x,1.63,z);
    torus(g,.095,.028,mat('handle','#eee6d4'),x+.20,1.65,z);
    return g
  }
  mug(-3,-.7,'#e3dec5');mug(1.3,.67,'#698c6e');
  // Laptop
  var desk=new THREE.Group();scene.add(desk);desk.position.set(2.2,0,-1.1);
  box(desk,1.35,.045,.91,mat('laptop','#899299',.35,.3),0,1.53,0);
  var screen=box(desk,1.35,.84,.045,mat('laptopback','#606b70',.39,.18),0,2.02,-.48);screen.rotation.x=-.18;
  box(desk,1.13,.63,.015,mat('display','#d1d9d9',.23),0,2.02,-.444);
  interactive(desk,'desk','Laptop ve şarj');
  // cable physically visible beside laptop
  var cable=new THREE.Group();scene.add(cable);
  cable.position.set(3.36,1.52,-.53);
  var cordPoints=[[0,0,0],[.12,.04,.16],[.4,.02,.3],[.68,.03,.16],[.77,.02,-.12]];
  for(var c=0;c<cordPoints.length-1;c++)capsule(cable,cordPoints[c],cordPoints[c+1],.022,black);
  box(cable,.31,.12,.19,cream,.8,.065,-.17);
  interactive(cable,'desk','Şarj aleti');
  // Homework pad and writing props
  var homework=new THREE.Group();scene.add(homework);
  box(homework,.72,.018,.55,mat('paper','#f8f4e7',.9),-.8,1.5,.3);
  capsule(homework,[-.49,1.53,.27],[-.16,1.53,.08],.02,mat('pencil','#7b8baf'));
  interactive(homework,'kid','Ödev defteri');
  // Kitchen work upgrades are physically shown as you buy them.
  var upgrades={};
  function addUpgrade(name,fn){var g=new THREE.Group();scene.add(g);fn(g);g.visible=false;upgrades[name]=g}
  addUpgrade('herbs',function(g){plant(5.9,1.66,-.5,.8,g)});
  addUpgrade('board',function(g){box(g,1.3,1.25,.08,mat('board','#b2a985'),4.9,4.0,-5.4);box(g,.7,.47,.12,ivory,4.87,4.02,-5.32)});
  addUpgrade('dishwasher',function(g){box(g,.10,1.1,1.55,stainless,5.74,.77,.95);box(g,.10,.04,1.12,black,5.65,1.16,.95)});
  addUpgrade('robot',function(g){var o=cylinder(g,.38,.38,.15,mat('robot','#e8e7df',.4),5.3,.1,3.2);torus(g,.28,.03,mat('roborring','#829c91'),5.3,.2,3.2)});
  addUpgrade('pot',function(g){cylinder(g,.3,.28,.32,mat('newpot','#d6a97e'),6.35,1.84,-3.4)});
  addUpgrade('coffee',function(g){box(g,.5,.65,.4,mat('coffee','#ddd2bf'),7.0,1.9,2.3);cylinder(g,.18,.18,.2,black,7.0,2.32,2.3)});
  addUpgrade('light',function(g){ball(g,.24,.38,.24,mat('shade','#f0e5c7'),1.5,5.4,0)});
  // plants, printer and dog detail
  box(scene,.88,.28,.74,black,-2.1,.5,-3.65);
  box(scene,.9,.75,.83,woodDark,-2.1,.38,-3.65);
  // Dog on soft rug
  var dogRoot=new THREE.Group();scene.add(dogRoot);dogRoot.position.set(-5.25,0,3.55);
  ball(dogRoot,.83,.29,.33,mat('dog','#342c27',.85),0,.37,0);
  ball(dogRoot,.27,.25,.24,mat('dogface','#40302d'),-.82,.41,0);
  ball(dogRoot,.09,.08,.09,black,-1.05,.34,.09);
  for(var dx of [-.53,.48])for(var dz of [-.22,.2])cylinder(dogRoot,.075,.072,.3,mat('dogleg','#49382e'),dx,.18,dz);
  var tail=capsule(dogRoot,[.68,.45,0],[1.18,.73,.08],.09,mat('dogtail','#342a25'));
  var bowl=cylinder(scene,.34,.28,.15,mat('petbowl','#b86274',.45),-6.4,.11,4.2);
  interactive(dogRoot,'pet','Köpeğin');
  var dogRug=addMesh(scene,new THREE.CircleGeometry(2.5,48),mat('rug','#8c9d68',1),-5.5,.006,3.15,false,true);dogRug.rotation.x=-Math.PI/2;dogRug.scale.set(1.55,.83,1);
  // Person meshes with curved forms, clothing, hair and expressive subtle motions.
  function makePerson(key,look,small){
    var root=new THREE.Group();scene.add(root);
    var skin=mat('skin'+key,look.skin),hair=mat('hair'+key,look.hair),shirt=mat('shirt'+key,look.shirt,.82),pants=mat('pants'+key,look.pants,.9);
    var scale=small?.77:1;
    root.scale.setScalar(scale);
    var body=new THREE.Group();root.add(body);
    ball(body,.29,.43,.20,shirt,0,1.21,0);
    capsule(body,[-.14,.97,0],[-.15,.48,.01],.125,pants);
    capsule(body,[.14,.97,0],[.16,.48,.01],.125,pants);
    ball(body,.155,.075,.24,mat('shoe'+key,'#53493e'),-.15,.45,.09);
    ball(body,.155,.075,.24,mat('shoe2'+key,'#53493e'),.15,.45,.09);
    capsule(body,[-.3,1.44,0],[-.43,1.04,.06],.10,skin);
    capsule(body,[.3,1.44,0],[.42,1.04,.07],.10,skin);
    cylinder(body,.09,.09,.14,skin,0,1.66,0);
    ball(body,.25,.30,.24,skin,0,1.97,0);
    var hairstyle=ball(body,.265,.16,.25,hair,0,2.22,-.02);
    var sideHair=[
      ball(body,.115,.34,.18,hair,-.21,1.96,-.055),
      ball(body,.115,.34,.18,hair,.21,1.96,-.055)
    ];
    sideHair.forEach(function(o){o.visible=!!look.hairLong});
    // Eyes visible from open front of the miniature.
    for(var ex of [-.085,.085])ball(body,.022,.025,.02,black,ex,2.02,.236);
    capsule(body,[-.075,1.88,.238],[.072,1.88,.238],.012,mat('mouth','#8a5c4e'));
    root.userData.person=key;
    root.traverse(function(o){if(o.isMesh){o.userData.owner=root;pickables.push(o)}});
    actors[key]={root,body,sideHair,initial:look.pos.slice(),position:new THREE.Vector3(...look.pos)};
    root.position.set(...look.pos);
    return root
  }
  makePerson('self',{pos:[3.4,0,1.8],skin:'#b97f61',hair:'#48332b',shirt:'#f2eee3',pants:'#665b50',hairLong:false},false);
  makePerson('partner',{pos:[2.2,0,-2.45],skin:'#cb9375',hair:'#533b2c',shirt:'#b76b53',pants:'#6c695b',hairLong:true},false);
  makePerson('kid',{pos:[-1.1,0,2.35],skin:'#9d624c',hair:'#322927',shirt:'#d48150',pants:'#9c9b72',hairLong:true},true);
  makePerson('elder',{pos:[-4.9,0,1.8],skin:'#714a37',hair:'#b6b3a3',shirt:'#908286',pants:'#6d7762',hairLong:false},.92);
  // Selection rings remain unobtrusive until a task is selected.
  var selectionRing=new THREE.Group();scene.add(selectionRing);selectionRing.visible=false;
  torus(selectionRing,.52,.045,mat('select','#d4ea8f',.55,.1),0,.04,0);
  var attention=addMesh(selectionRing,new THREE.CircleGeometry(.42,32),new THREE.MeshBasicMaterial({color:'#e2f69c',transparent:true,opacity:.14,depthWrite:false}),0,.025,0,false,false);
  attention.rotation.x=-Math.PI/2;
    function snapshot(){return window.EvinKitchenBridge && window.EvinKitchenBridge.getState ? window.EvinKitchenBridge.getState() : {}}
  function setTarget(key){
    var pos=stationPositions[key];
    if(!pos)return;
    selection=key;
    selectionRing.visible=true;selectionRing.position.set(pos.x,0,pos.z);
  }
  function focus(key){
    setTarget(key);
    var p=stationPositions[key]||defaultTarget;
    cameraTarget.set(p.x*.72,1.5,p.z*.72);
    targetZoom=1.35;
  }
  function resetCamera(){cameraTarget.copy(defaultTarget);targetZoom=1;selection=null;selectionRing.visible=false}
  function adjustZoom(v){targetZoom=Math.max(.77,Math.min(2.2,targetZoom+v))}
  // The same camera is used on mobile and desktop; keep a cinematic orthographic perspective.
  function resize(){
    var w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
    renderer.setSize(w,h,false);
    var a=w/h;
    var viewHeight=a<.8?17:a<1.15?15:13.5;
    camera.left=-viewHeight*a/2;camera.right=viewHeight*a/2;
    camera.top=viewHeight/2;camera.bottom=-viewHeight/2;
    camera.updateProjectionMatrix();
  }
  var ro=new ResizeObserver(resize);ro.observe(host);resize();
  var pressed=null,moved=false,lastX=0,lastY=0;
  function normalized(e){
    var r=renderer.domElement.getBoundingClientRect();
    pointer.x=((e.clientX-r.left)/r.width)*2-1;
    pointer.y=-((e.clientY-r.top)/r.height)*2+1;
  }
  function getHit(e){
    normalized(e);raycaster.setFromCamera(pointer,camera);
    var intersections=raycaster.intersectObjects(pickables,false);
    for(var it of intersections){var o=it.object.userData.owner;if(o&&(o.userData.station||o.userData.person))return o}
    return null
  }
  function activate(e){
    var target=getHit(e);
    if(!target)return;
    if(target.userData.person){
      var p=target.userData.person;
      if(window.EvinKitchenBridge&&window.EvinKitchenBridge.selectPerson)window.EvinKitchenBridge.selectPerson(p)
    }else if(target.userData.station){
      var spot=target.userData.station;
      if(window.EvinKitchenBridge&&window.EvinKitchenBridge.selectStation)window.EvinKitchenBridge.selectStation(spot)
    }
  }
  renderer.domElement.addEventListener('pointerdown',function(e){pressed={x:e.clientX,y:e.clientY,t:performance.now()};lastX=e.clientX;lastY=e.clientY;moved=false;renderer.domElement.setPointerCapture(e.pointerId)});
  renderer.domElement.addEventListener('pointermove',function(e){
    if(pressed){
      var dx=e.clientX-lastX,dy=e.clientY-lastY;
      if(Math.abs(e.clientX-pressed.x)+Math.abs(e.clientY-pressed.y)>9)moved=true;
      if(moved){cameraTarget.x-=dx*.021/targetZoom;cameraTarget.z-=dy*.028/targetZoom;cameraTarget.x=Math.max(-4.5,Math.min(4.5,cameraTarget.x));cameraTarget.z=Math.max(-3.1,Math.min(3.1,cameraTarget.z));}
      lastX=e.clientX;lastY=e.clientY;
    }else{
      var o=getHit(e);renderer.domElement.style.cursor=o?'pointer':'grab';
      if(o&&o!==hovered){hovered=o;host.title=o.userData.label||o.userData.person||''}
      if(!o){hovered=null;host.title=''}
    }
  });
  renderer.domElement.addEventListener('pointerup',function(e){if(!pressed)return;if(!moved&&performance.now()-pressed.t<600)activate(e);pressed=null;renderer.domElement.style.cursor='grab'});
  renderer.domElement.addEventListener('pointercancel',function(){pressed=null});
  renderer.domElement.addEventListener('wheel',function(e){e.preventDefault();adjustZoom(e.deltaY<0?.12:-.12)},{passive:false});
  var touches=new Map(),prevPinch=0;
  renderer.domElement.addEventListener('touchstart',function(e){for(var t of e.changedTouches)touches.set(t.identifier,{x:t.clientX,y:t.clientY});if(touches.size<2)prevPinch=0},{passive:true});
  renderer.domElement.addEventListener('touchmove',function(e){for(var t of e.changedTouches)touches.set(t.identifier,{x:t.clientX,y:t.clientY});if(touches.size===2){var p=[...touches.values()];var dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(prevPinch>0)adjustZoom((dist-prevPinch)*.002);prevPinch=dist}},{passive:true});
  renderer.domElement.addEventListener('touchend',function(e){for(var t of e.changedTouches)touches.delete(t.identifier);if(touches.size<2)prevPinch=0},{passive:true});
  // Render sync is read-only: game logic and save files remain the authoritative source.
  var lastStateTime=0,clock=new THREE.Clock(),oldSnapshot=null,previousAvatar='';
  function updateActors(state,dt,elapsed){
    var targets={
      self:state.currentSpot?stationPositions[state.currentSpot]:new THREE.Vector3(3.4,0,1.8),
      partner:state.partnerSpot?stationPositions[state.partnerSpot]:new THREE.Vector3(2.2,0,-2.45),
      kid:state.kidSpot?stationPositions[state.kidSpot]:new THREE.Vector3(-1.1,0,2.35)
    };
    for(var k in actors){
      var data=actors[k],root=data.root;
      var tar=targets[k]||new THREE.Vector3(...data.initial);
      var goal=new THREE.Vector3(tar.x,0,tar.z);
      root.position.lerp(goal,Math.min(1,dt*2.25));
      var moving=root.position.distanceToSquared(goal)>.07;
      var bob=moving?Math.sin(elapsed*11)*.036:Math.sin(elapsed*1.5+k.length)*.012;
      data.body.position.y=bob;
      if(moving)root.rotation.y=Math.atan2(goal.x-root.position.x,goal.z-root.position.z);
      else root.rotation.y+=(-.15-root.rotation.y)*Math.min(1,dt*.8);
    }
  }
  function refresh(state){
    for(var id in upgrades)upgrades[id].visible=(state.owned||[]).includes(id);
    ['self','partner'].forEach(function(key){
      var model=actors[key],kind=key==='self'?state.avatarSelf:state.avatarPartner;
      if(model&&model.sideHair)model.sideHair.forEach(function(o){o.visible=kind==='f'});
    });
    var lamp=state.time>=21*60;
    sun.intensity=lamp?1.65:state.time>=19*60?2.45:3.4;
    fill.intensity=lamp?1.2:.82;
  }
  var living=true;
  function animate(){
    if(!living)return;
    requestAnimationFrame(animate);
    if(document.hidden){clock.getDelta();return}
    var dt=Math.min(clock.getDelta(),.07),elapsed=clock.elapsedTime;
    zoom+=(targetZoom-zoom)*Math.min(1,dt*4.5);
    lookAt.lerp(cameraTarget,Math.min(1,dt*3.2));
    camera.zoom=zoom;
    camera.updateProjectionMatrix();
    camera.position.copy(lookAt).addScaledVector(orbitDir,24);
    camera.lookAt(lookAt);
    if(elapsed-lastStateTime>.18){
      oldSnapshot=snapshot();lastStateTime=elapsed;refresh(oldSnapshot);
    }
    updateActors(oldSnapshot||{},dt,elapsed);
    if(selectionRing.visible){selectionRing.children[0].rotation.z=elapsed*.12;attention.material.opacity=.10+.07*Math.sin(elapsed*3)}
    if(host.classList.contains('is-ready'))renderer.render(scene,camera);
  }
  window.Evin3D={
    focus:focus,reset:resetCamera,zoom:adjustZoom,select:setTarget,isReady:true,
    setEnabled:function(on){
      this.isReady=Boolean(on);
      host.classList.toggle('is-ready',Boolean(on));
      document.getElementById('game').classList.toggle('scene-3d-ready',Boolean(on));
      var button=document.getElementById('visualMode');
      if(button){button.hidden=false;button.textContent=on?'3D':'2D';button.setAttribute('aria-label',on?'3D sahnesi açık, 2D görünümüne geç':'2D sahnesi açık, 3D görünümüne geç');}
      try{localStorage.setItem('evin-patronu:scene-mode',on?'3d':'2d')}catch(e){}
    },
    destroy:function(){living=false;ro.disconnect();renderer.dispose();host.replaceChildren()}
  };
  host.dataset.status='ready';
  var enable3D=true;
  try{enable3D=localStorage.getItem('evin-patronu:scene-mode')!=='2d'}catch(e){}
  window.Evin3D.setEnabled(enable3D);
  animate();
})().catch(function(err){console.error('Evin Patronu 3D scene failed',err);var host=document.getElementById('kitchen3d');if(host){host.classList.remove('is-ready');host.dataset.status='fallback';}});
