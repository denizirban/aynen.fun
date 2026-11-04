/* House Boss — always-on 3D household scene.
   The existing save/simulation is authoritative; no 2D mode.
   Optional WebGL failure is displayed rather than silently switching rendering modes. */
(async function () {
  var host = document.getElementById('kitchen3d');
  if (!host) return;
  function show3DUnavailable(reason){
    host.dataset.status='unavailable';
    host.classList.remove('is-ready');
    host.replaceChildren();
    var section=document.createElement('section');
    section.className='hb-3d-error';section.setAttribute('role','alert');
    var title=document.createElement('h2');title.textContent='3D World Unavailable';
    var message=document.createElement('p');
    message.textContent='House Boss uses a 3D world. Enable hardware acceleration/WebGL in your browser, then try again.';
    var retry=document.createElement('button');retry.type='button';retry.textContent='RELOAD 3D WORLD';
    retry.onclick=function(){location.reload()};
    section.append(title,message,retry);host.appendChild(section);
    console.error('House Boss 3D error:',reason)
  }
  var THREE;
  try {
    THREE = await import('https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js');
    if (!window.WebGLRenderingContext) throw new Error('WebGL unavailable');
  } catch (e) {
    show3DUnavailable(e);
    return;
  }
  var scene = new THREE.Scene();
  scene.background = new THREE.Color('#dfe5d7');
  var mobile = matchMedia('(pointer: coarse)').matches;
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({antialias: !mobile,alpha:false,powerPreference: mobile ? 'low-power':'high-performance'});
  } catch (e) {
    show3DUnavailable(e);
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1,mobile?1.35:1.8));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.38;
  renderer.domElement.setAttribute('aria-label','Interactive 3D kitchen. Tap to select an object, drag to move around the scene.');
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
  /* HOME_INTERIOR_STYLING_V4 — soft hexagonal floor inspired by lived-in domestic spaces. */
  var tile=makeTexture(1024,704,function(ctx,W,H){
    ctx.fillStyle='#b9c0b8';ctx.fillRect(0,0,W,H);
    var R=24,stepX=1.5*R,stepY=Math.sqrt(3)*R;
    for(var col=-1;col<=Math.ceil(W/stepX)+1;col++){
      for(var row=-2;row<=Math.ceil(H/stepY)+2;row++){
        var cx=col*stepX,cy=(row+(col%2)*.5)*stepY;
        ctx.beginPath();
        for(var n=0;n<6;n++){
          var a=n*Math.PI/3,x=cx+R*Math.cos(a),y=cy+R*Math.sin(a);
          if(!n)ctx.moveTo(x,y);else ctx.lineTo(x,y)
        }
        ctx.closePath();
        ctx.fillStyle=['#d1d5cf','#d4d5cf','#c9ceca','#d9d8d2','#cdd0cb'][(col*3+row*7+10000)%5];
        ctx.fill();ctx.lineWidth=2.3;ctx.strokeStyle='#adb4ad';ctx.stroke();
        if((row+col)%7===0){
          ctx.strokeStyle='rgba(255,255,255,.21)';ctx.lineWidth=.9;
          ctx.beginPath();ctx.moveTo(cx-R*.4,cy-R*.19);ctx.lineTo(cx+R*.36,cy-R*.19);ctx.stroke()
        }
      }
    }
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
  function interactiveRoomObject(group,action,label){
    group.userData.roomAction=action;group.userData.label=label;
    group.traverse(function(obj){if(obj.isMesh){obj.userData.owner=group;pickables.push(obj)}});
    return group
  }
  var stationPositions={
    stove:new THREE.Vector3(6.9,1.1,-3.45),sink:new THREE.Vector3(7,1.12,-1),
    table:new THREE.Vector3(.25,1.35,-.5),desk:new THREE.Vector3(2.4,1.4,-1.45),
    kid:new THREE.Vector3(-1.7,1.05,2.6),floor:new THREE.Vector3(-4.5,.08,3.5),
    laundry:new THREE.Vector3(6.8,.8,2.35),pet:new THREE.Vector3(-5.8,.15,3.7)
  };
  function furnitureTable(){
    var g=new THREE.Group();scene.add(g);g.position.set(.15,0,-.1);
    // Dining table: truly household-sized, leaving walkable aisles and proper
    // separation from the kitchen counter and seated characters.
    box(g,6.68,.16,2.60,woodDark,0,1.27,0);
    box(g,6.50,.10,2.48,tableWood,0,1.39,0);
    for(var x of [-2.85,2.85])for(var z of [-.91,.91])box(g,.19,1.23,.19,woodDark,x,.61,z);
    box(g,5.95,.16,.12,woodDark,0,1.0,1.06);
    box(g,5.95,.16,.12,woodDark,0,1.0,-1.06);
    interactive(g,'table','Table · homework and meals');
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
  // Clear the sofa and paths: chairs sit outside the actual table footprint.
  chair(-2.45,2.06,.05,'#d0be92');
  chair(.35,2.06,.15,'#a3937e');
  chair(2.60,2.06,-.12,'#7b7665');
  chair(-2.15,-2.05,Math.PI,'#8d6855');
  chair(1.85,-2.05,Math.PI,'#9a4c53');
  function cabinetGroup(){
    var g=new THREE.Group();scene.add(g);g.position.set(6.72,0,-1.65);
    // two grounded kitchen runs: right wall counters
    for(var z of [-2.25,.1,2.23]){
      box(g,1.7,1.4,2.12,mat('cabinet','#a5b8a4'),0,.73,z);
      box(g,1.9,.15,2.3,tableWood,0,1.49,z);
      box(g,.07,1.18,1.82,mat('door','#a0b39c'),-.86,.76,z);
      capsule(g,[-.91,.7,z-.33],[-.91,.7,z+.35],.035,stainless);
    }
    var sink=new THREE.Group();sink.position.set(6.65,0,-.9);scene.add(sink);
    box(sink,1.18,.06,.95,stainless,0,1.61,0);
    var basin=box(sink,.92,.08,.67,mat('basin','#727f83',.23,.45),0,1.65,0);
    cylinder(sink,.12,.12,.04,stainless,0,1.7,0);
    capsule(sink,[.38,1.61,-.27],[.38,2.07,-.27],.036,stainless);
    capsule(sink,[.38,2.07,-.27],[.03,2.07,-.25],.038,stainless);
    capsule(sink,[.03,2.07,-.25],[.03,1.86,-.2],.036,stainless);
    interactive(sink,'sink','Sink · dishes');
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
    interactive(g,'laundry','Kitchen cupboards');
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
  plate(2.42,1.48,.5,.3,'#c26e4c');
  function mug(x,z,color){
    var g=new THREE.Group();scene.add(g);
    cylinder(g,.17,.16,.28,mat('mug'+color,color,.35),x,1.63,z);
    torus(g,.095,.028,mat('handle','#eee6d4'),x+.20,1.65,z);
    return g
  }
  mug(-3,-.7,'#e3dec5');mug(1.3,.67,'#698c6e');
  // Laptop
  var desk=new THREE.Group();scene.add(desk);desk.position.set(2.2,0,-.76);
  box(desk,1.35,.045,.91,mat('laptop','#899299',.35,.3),0,1.53,0);
  var screen=box(desk,1.35,.84,.045,mat('laptopback','#606b70',.39,.18),0,2.02,-.48);screen.rotation.x=-.18;
  box(desk,1.13,.63,.015,mat('display','#d1d9d9',.23),0,2.02,-.444);
  interactive(desk,'desk','Laptop and charger');
  // cable physically visible beside laptop
  var cable=new THREE.Group();scene.add(cable);
  cable.position.set(2.62,1.52,-.43);
  var cordPoints=[[0,0,0],[.12,.04,.16],[.4,.02,.3],[.68,.03,.16],[.77,.02,-.12]];
  for(var c=0;c<cordPoints.length-1;c++)capsule(cable,cordPoints[c],cordPoints[c+1],.022,black);
  box(cable,.31,.12,.19,cream,.8,.065,-.17);
  interactive(cable,'desk','Charger');
  // Homework pad and writing props
  var homework=new THREE.Group();scene.add(homework);
  box(homework,.72,.018,.55,mat('paper','#f8f4e7',.9),-.8,1.5,.3);
  capsule(homework,[-.49,1.53,.27],[-.16,1.53,.08],.02,mat('pencil','#7b8baf'));
  interactive(homework,'kid','Homework notebook');
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

  /* LIFE_SCENE_EXTENSIONS_V2 — furniture only appears after purchase */
  addUpgrade('office',function(g){
    // Add shelving and a desk lamp to the kitchen's existing laptop nook.
    box(g,1.85,.11,.36,woodDark,2.2,3.15,-5.15);
    for(var i=0;i<6;i++){
      box(g,.14,.38+(i%3)*.07,.23,mat('offbook'+i,i%2?'#aa8867':'#849a8b'),1.48+i*.23,3.42,-5.06);
    }
    cylinder(g,.17,.18,.06,stainless,2.74,1.6,-1.38);
    capsule(g,[2.74,1.62,-1.38],[2.82,2.27,-1.37],.04,stainless);
    ball(g,.25,.14,.22,mat('officeLamp','#e9d5ab'),2.83,2.31,-1.37);
  });
  addUpgrade('sleep',function(g){
    // Bedroom now exists east of the kitchen. Remove the fake door on the
    // rear wall and bridge the real gap between adjacent room floors.
    var passage=mat('roomPassage','#b8a689');
    box(g,1.50,.18,2.45,passage,9.38,-.075,-.75);
    for(var z of [-1.9,.38])
      box(g,1.5,.035,.06,mat('roomThreshold','#d7cbb5'),9.38,.025,z);
  });
  addUpgrade('living',function(g){
    // The room extension adds its own lighting and side table.
    // The sofa itself is controlled by Home Design, independently of the upgrade.
    cylinder(g,.11,.14,1.85,black,-4.95,1.0,-.95);
    ball(g,.31,.20,.31,mat('floorLamp','#f0dba9'),-4.95,1.93,-.95);
    box(g,.58,.1,.53,woodDark,-4.75,.58,.15);
    cylinder(g,.11,.11,.54,woodDark,-4.75,.29,.15);
    // Walkable corridor linking kitchen to the separately built living room.
    box(g,1.45,.18,6.2,mat('livingPassage','#b7aa96'),9.36,-.075,4.95);
  });

  /* HOME_DESIGN_3D_V10 — real 3D furniture variants and materials, not UI-only color changes. */
  var sofaVariants={},designLastKey='',designTextureCache={};
  function makeSofa(id,color){
    var g=new THREE.Group(),rounded=['rust','boucle','cloud','atelier','mint','peach','berry'].includes(id);
    g.position.set(-6.20,0,.10);scene.add(g);
    var fabric=new THREE.MeshStandardMaterial({color:color,roughness:id==='leather'?.57:.90,metalness:0,flatShading:false});
    var seams=mat('sofaSeams','#9d8d77'),cushion=mat('sofaCushion'+id,id==='starter'?'#e5d7c0':id==='navy'?'#8ea4b9':id==='rust'?'#e8b69d':id==='boucle'?'#d9c6a9':'#cddac8');
    var width=['boucle','cloud','atelier'].includes(id)?2.40:id==='navy'?2.32:2.14,height=['boucle','cloud','atelier'].includes(id)?.50:.43;
    box(g,width,height,1.05,fabric,0,.43,0);
    box(g,width,.89,.27,fabric,0,.89,-.40);
    for(var sx of [-1,1]){
      if(rounded){
       ball(g,.25,.38,.56,fabric,sx*(width/2-.04),.68,.03);
       ball(g,.33,.23,.33,fabric,sx*.46,.81,.24);
      }else box(g,.21,.59,.97,fabric,sx*(width/2-.075),.66,.03);
    }
    for(var sx of [-.5,.5]){
      box(g,.87,.19,.68,rounded?fabric:cushion,sx,.72,.19);
      box(g,.73,.39,.18,fabric,sx,1.09,-.24);
    }
    box(g,.22,.15,.22,seams,-width*.34,.11,-.28);
    box(g,.22,.15,.22,seams,width*.34,.11,-.28);
    if(id==='rust'||id==='navy'){
      box(g,.38,.32,.16,cushion,.42,1.0,-.16).rotation.z=.15;
      box(g,.38,.32,.16,cushion,-.43,1.0,-.16).rotation.z=-.18;
    }
    if(['boucle','cloud','atelier'].includes(id)){
       for(var z of [-.05,.34])for(var x of [-.62,0,.62])ball(g,.30,.11,.27,fabric,x,.88,z);
       for(var x of [-.65,0,.65])ball(g,.27,.24,.18,cushion,x,1.03,-.27);
     }
     if(id==='leather'){for(var x of [-.44,.44])for(var y of [.93,1.12])ball(g,.025,.025,.015,seams,x,y,-.248);
       for(var x of [-.8,.8])box(g,.09,.20,.66,mat('sofaWalnut','#795236'),x,.14,.05);}
     if(id==='atelier'){for(var x of [-.92,.92])ball(g,.23,.40,.49,fabric,x,.68,.03);
       for(var x of [-.75,.75])box(g,.20,.10,.40,mat('sofaBronze','#b59a71'),x,.08,0);}
    g.visible=id==='starter';sofaVariants[id]=g;
  }
  [
   ['starter','#bdb49c'],['sage','#8ca796'],['rust','#be7c67'],
   ['navy','#667f9b'],['boucle','#f1e9d9'],
   ['mint','#a2cbb4'],['creamstripe','#e9d2a7'],['peach','#eca998'],
   ['sky','#a8c5db'],['berry','#b988ad'],
    ['leather','#86674f'],['cloud','#e3ddd2'],['atelier','#b4a696']
  ].forEach(function(p){makeSofa(p[0],p[1])});
  function designTexture(kind,variant){
   var key=kind+':'+variant;if(designTextureCache[key])return designTextureCache[key];
   var map;
   if(kind==='flooring'&&variant==='hex')return tile;
   if(kind==='wallpaper'){
     var palette={
      ivory:['#f6f1e6','#f3eee4'],sage:['#a9c0a7','#d1dcc7'],botanical:['#b7c7b1','#608964'],clay:['#ddbbab','#c88f7c'],blue:['#c5d6df','#9dbccb'],
      warmivory:['#f0ebe0','#cdbdac'],tinyfloral:['#f9eae4','#d494aa'],pastelgingham:['#f0ded4','#d6b6ab'],
      sagepinstripe:['#e2e6d8','#90ab93'],rosepetals:['#f6e6e5','#be8299'],terracottagrid:['#ebd3c3','#b98771'],
      lilacarches:['#eee7f4','#bfa7d4'],sunnydaisy:['#f9efdc','#daa75d'],bluewave:['#e8f0ed','#8cb7c4'],
      abstractpop:['#f6e9df','#d79686']
     };
     var colors=palette[variant]||palette.ivory;
     map=makeTexture(512,512,function(ctx,W,H){
       ctx.fillStyle=colors[0];ctx.fillRect(0,0,W,H);
       if(variant==='sage'){ctx.fillStyle=colors[1];for(var x=0;x<W;x+=34)ctx.fillRect(x,0,5,H)}
       else if(variant==='botanical'){
         ctx.strokeStyle=colors[1];ctx.lineWidth=5;
         for(var y=-20;y<H;y+=92)for(var x=-30;x<W;x+=110){
           ctx.beginPath();ctx.moveTo(x+40,y+75);ctx.quadraticCurveTo(x+65,y+50,x+70,y+7);ctx.stroke();
           ctx.fillStyle=colors[1];
           for(var i=0;i<4;i++){ctx.save();ctx.translate(x+54+(i%2?24:0),y+20+i*14);ctx.rotate((i%2?-.65:.65));ctx.beginPath();ctx.ellipse(0,0,17,7,0,0,Math.PI*2);ctx.fill();ctx.restore()}
         }
       }else if(variant==='clay'){for(var i=0;i<550;i++){var x=(i*79.13)%W,y=(i*39.71)%H;ctx.fillStyle=i%2?'#efdfce22':'#97674e12';ctx.fillRect(x,y,20+i%21,2+i%6)}}
       else if(variant==='blue'){ctx.strokeStyle='#ffffff55';for(var y=0;y<H;y+=48){ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}}
       else if(variant==='warmivory'){
        ctx.strokeStyle=colors[1];ctx.lineWidth=4;
        for(var x=20;x<W;x+=128){
         ctx.strokeRect(x,22,105,H-44);ctx.strokeRect(x+7,29,91,H-58)
        }
       }else if(variant==='tinyfloral'||variant==='rosepetals'||variant==='sunnydaisy'){
        const petals=variant==='sunnydaisy'?6:variant==='rosepetals'?7:5;
        const petalsColor=variant==='sunnydaisy'?'#fafaf1':colors[1],center=variant==='sunnydaisy'?'#dbab52':'#e4c095';
        for(let y=35;y<H;y+=73)for(let x=33;x<W;x+=75){
         let xx=x+(Math.floor(y/73)%2)*24,yy=y;
         for(let j=0;j<petals;j++){
          const a=j*2*Math.PI/petals;
          ctx.beginPath();ctx.ellipse(xx+Math.cos(a)*9,yy+Math.sin(a)*9,8,5,a,0,Math.PI*2);
          ctx.fillStyle=petalsColor;ctx.fill()
         }
         ctx.beginPath();ctx.arc(xx,yy,5,0,Math.PI*2);ctx.fillStyle=center;ctx.fill();
         if(variant==='tinyfloral'){
          ctx.strokeStyle='#91ae87';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(xx+1,yy+8);ctx.lineTo(xx+4,yy+23);ctx.stroke()
         }
        }
       }else if(variant==='pastelgingham'){
        ctx.fillStyle='#e9c7bd77';for(let x=0;x<W;x+=56)ctx.fillRect(x,0,25,H);
        ctx.fillStyle='#fff6ed80';for(let y=0;y<H;y+=56)ctx.fillRect(0,y,W,25);
        ctx.strokeStyle='#dbb5a9';ctx.lineWidth=2;
        for(let x=0;x<W;x+=56){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
       }else if(variant==='sagepinstripe'){
        ctx.strokeStyle=colors[1];ctx.lineWidth=3;
        for(let x=14;x<W;x+=37){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
        ctx.strokeStyle='#f6f6ef';ctx.lineWidth=2;
        for(let x=18;x<W;x+=37){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
       }else if(variant==='terracottagrid'){
        ctx.strokeStyle=colors[1];ctx.lineWidth=5;
        for(let x=0;x<W;x+=66){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
        for(let y=0;y<H;y+=66){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
        ctx.fillStyle='#f8e7d9';
        for(let x=0;x<W;x+=66)for(let y=0;y<H;y+=66)ctx.fillRect(x-3,y-3,6,6)
       }else if(variant==='lilacarches'){
        ctx.lineWidth=10;ctx.strokeStyle=colors[1];
        for(let y=20;y<H;y+=115)for(let x=25;x<W;x+=105){
         ctx.beginPath();ctx.arc(x+42,y+40,35,Math.PI,Math.PI*2);ctx.stroke();
         ctx.beginPath();ctx.moveTo(x+7,y+40);ctx.lineTo(x+7,y+100);ctx.moveTo(x+77,y+40);ctx.lineTo(x+77,y+100);ctx.stroke()
        }
       }else if(variant==='bluewave'){
        for(let n=0;n<13;n++){
         ctx.strokeStyle=n%3===0?'#719dac':'#bbd4d5';ctx.lineWidth=n%3===0?6:3;
         ctx.beginPath();
         for(let x=0;x<=W;x+=5){const y=n*41+Math.sin(x*.028+n*.7)*13;
          if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}
         ctx.stroke()
        }
       }else if(variant==='abstractpop'){
        const hues=['#d79586','#a4c4ad','#dec395','#aa9bc8'];
        for(let n=0;n<19;n++){
         let x=(n*137)%W,y=(n*91)%H,r=24+n%4*9;
         ctx.beginPath();ctx.fillStyle=hues[n%hues.length];
         ctx.ellipse(x,y,r,r*.7,n*.4,0,Math.PI*2);ctx.fill()
        }
       }

       else{ctx.fillStyle='#fff8';for(var y=0;y<H;y+=73)ctx.fillRect(0,y,W,2)}
     });
   }else if(kind==='flooring'){
     map=makeTexture(1024,700,function(ctx,W,H){
       if(variant==='oak'){
         ctx.fillStyle='#b79570';ctx.fillRect(0,0,W,H);
         for(var y=0;y<H;y+=66){ctx.fillStyle=y%132?'#ae8b68':'#bea17d';ctx.fillRect(0,y,W,64);ctx.strokeStyle='#8d715653';ctx.lineWidth=2;ctx.strokeRect(0,y,W,65)}
         ctx.strokeStyle='#8c725b80';
         for(var x=0;x<W;x+=180){for(var y=0;y<H;y+=132){ctx.beginPath();ctx.moveTo(x+(y%264?95:0),y);ctx.lineTo(x+(y%264?95:0),y+65);ctx.stroke()}}
         for(var i=0;i<350;i++){var x=(i*83.17)%W,y=(i*53.41)%H;ctx.strokeStyle='#fff6e619';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+95,y);ctx.stroke()}
       }else if(variant==='terrazzo'){
         ctx.fillStyle='#dbd5c8';ctx.fillRect(0,0,W,H);
         for(var i=0;i<2200;i++){var x=(i*37.31)%W,y=(i*119.13)%H;
           ctx.fillStyle=['#bd9e8d','#a9bcb4','#e9e1d1','#bfc5c8','#c9b4a2'][i%5];
           ctx.beginPath();ctx.ellipse(x,y,2+i%8,2+i%5,i*.29,0,7);ctx.fill()}
       }else{
         var size=87;
         for(var y=0;y<H;y+=size)for(var x=0;x<W;x+=size){
           ctx.fillStyle=((Math.floor(x/size)+Math.floor(y/size))%2)?'#9fb6a2':'#e3e0ce';
           ctx.fillRect(x+2,y+2,size-4,size-4)
         }
       }
     });
   }else if(kind==='rug'||kind==='curtains'){
     var palette=kind==='rug'?{linen:'#c9be9c',rose:'#b98786',forest:'#6c946f',blue:'#8db6c1'}:
       {terracotta:'#bb7954',ivory:'#eee7d9',sage:'#94ab92',navy:'#718b9b'};
     var color=palette[variant]||Object.values(palette)[0];
     map=makeTexture(512,512,function(ctx,W,H){
       ctx.fillStyle=color;ctx.fillRect(0,0,W,H);
       ctx.strokeStyle='#ffffff43';ctx.lineWidth=2;
       for(var x=0;x<W;x+=19){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
       for(var y=0;y<H;y+=28){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
       if(variant==='rose'||variant==='forest'){
         ctx.strokeStyle='#fff6';ctx.lineWidth=4;
         for(var x=40;x<W;x+=115)for(var y=30;y<H;y+=116){
           ctx.beginPath();ctx.arc(x,y,12,0,Math.PI*2);ctx.stroke();
           ctx.beginPath();ctx.moveTo(x-22,y+17);ctx.lineTo(x+20,y-18);ctx.stroke()
         }
       }
     })
   }
   designTextureCache[key]=map;return map
  }
  function applyHomeDesign(next){
    var chosen=Object.assign({sofa:'starter',wallpaper:'ivory',flooring:'hex',cabinets:'sage',rug:'linen',curtains:'terracotta'},next||{});
    var key=JSON.stringify(chosen);if(key===designLastKey)return;
    designLastKey=key;
    Object.entries(sofaVariants).forEach(function(entry){entry[1].visible=entry[0]===chosen.sofa});
    // All sofas use the same selected upholstery, including the newly built
    // living room; a fabric purchase must never change only the kitchen sofa.
    var sofaColors={starter:'#bdb49c',sage:'#8ca796',rust:'#be7c67',navy:'#667f9b',boucle:'#f1e9d9',mint:'#a2cbb4',creamstripe:'#e9d2a7',peach:'#eca998',sky:'#a8c5db',berry:'#b988ad',leather:'#86674f',cloud:'#e3ddd2',atelier:'#b4a696'};
    mat('livingRoomSofa').color.set(sofaColors[chosen.sofa]||sofaColors.starter);
    mat('livingCushion').color.set(chosen.sofa==='navy'?'#a9bed0':chosen.sofa==='rust'?'#e7b4a2':['boucle','cloud','atelier'].includes(chosen.sofa)?'#e5d9c7':chosen.sofa==='leather'?'#a9886b':'#c5d4bf');
    var wall=designTexture('wallpaper',chosen.wallpaper);
    plaster.map=wall;plaster.color.set('#ffffff');plaster.needsUpdate=true;
    floorMat.map=designTexture('flooring',chosen.flooring);floorMat.color.set('#ffffff');floorMat.needsUpdate=true;
    var cabinetColors={sage:'#a5b8a4',cream:'#e2d4b8',forest:'#526c5c',blue:'#8daebc',clay:'#c28d7b'};
    var color=cabinetColors[chosen.cabinets]||cabinetColors.sage;
    mat('cabinet').color.set(color);mat('door').color.set(color);
    var trim=new THREE.Color(color).multiplyScalar(1.055);
    mat('cabinetPanel').color.copy(trim);
    linen.map=designTexture('rug',chosen.rug);linen.color.set('#ffffff');linen.needsUpdate=true;
    var rugColors={linen:'#c9be9c',rose:'#bd9391',forest:'#659278',blue:'#91aeb7'};
    mat('rug').color.set(rugColors[chosen.rug]||rugColors.linen);
    mat('livingCarpet').color.set(rugColors[chosen.rug]||rugColors.linen);
    mat('bedRug').color.set(rugColors[chosen.rug]||rugColors.linen);
    if(homeCurtainMaterial){homeCurtainMaterial.map=designTexture('curtains',chosen.curtains);homeCurtainMaterial.needsUpdate=true}
  }

  addUpgrade('garden',function(g){
    // Garden growth is visible through the existing window.
    // The narrow transition covers the former visible gap to the patio.
    box(g,3.2,.13,1.20,mat('gardenThreshold','#aeaa8c'),-1.65,-.07,5.80);
    for(var n=0;n<4;n++)plant(-7.7+n*1.65,1.92,-4.67,.64+(n%2)*.12,g);
    for(var k=0;k<3;k++){
      var xx=-7.0+k*2.2;
      box(g,.8,.12,.26,wood,xx,1.85,-4.85);
      ball(g,.13,.20,.13,mat('gardenBloom'+k,k%2?'#ddaa82':'#eed5a7'),xx,2.23,-4.78);
    }
  });
  addUpgrade('floor2',function(g){
    // Architectural mezzanine with an actual upper landing. The previous stair
    // crossed the dining area, hit the sofa, and terminated without a floor.
    var loftWood=mat('loftWood','#aa896a'),loftRail=mat('loftRail','#88958a');
    box(g,3.45,.20,2.84,loftWood,-6.66,3.10,-3.30);
    box(g,3.45,.11,.11,loftRail,-6.66,3.25,-1.87);
    for(var rx of [-8.28,-7.25,-6.20,-5.14])
      capsule(g,[rx,3.25,-1.86],[rx,4.05,-1.86],.031,loftRail);
    capsule(g,[-8.33,4.05,-1.86],[-5.10,4.05,-1.86],.045,loftRail);
    for(var n=0;n<9;n++){
      var h=.28+n*.345,z=.62-n*.52;
      box(g,.89,.17,.48,loftWood,-8.14,h,z)
    }
    capsule(g,[-7.56,.35,.82],[-7.56,3.25,-3.85],.042,loftRail);
    cylinder(g,.16,.16,.56,loftWood,-6.6,3.48,-3.3);
    ball(g,.27,.26,.27,mat('loftLamp','#e9dcb7'),-6.6,3.83,-3.3);
  });


  /* HOUSE_BOSS_EXPANDED_ROOMS_V12 — real unlockable 3D rooms, not only painted doors. */
  var roomSpaces={};
  function addRoomWorld(id,x,z,fn){
    var g=new THREE.Group();g.position.set(x,0,z);scene.add(g);g.visible=false;
    roomSpaces[id]=g;fn(g);return g
  }
  addRoomWorld('sleep',14.05,-.75,function(g){
    box(g,8.55,.17,9.0,mat('bedFloorBase','#c4baab'),0,-.12,0);
    var floor=addMesh(g,new THREE.PlaneGeometry(8.54,9),floorMat,0,.006,0,false,true);floor.rotation.x=-Math.PI/2;
    box(g,8.55,5.5,.16,plaster,0,2.75,-4.54);
    // Dollhouse cutaway side wall: the player can actually see into the bedroom.
    box(g,.16,1.08,9,plaster,4.30,.54,0);
    var bedInteract=new THREE.Group();g.add(bedInteract);
    box(bedInteract,2.70,.54,3.1,mat('bedframe','#9a765c'),-.65,.42,-1.15);
    box(bedInteract,2.55,.32,2.88,mat('mattress','#ede3d2'),-.65,.84,-1.15);
    box(bedInteract,2.65,1.23,.32,mat('headboard','#768e83'),-.65,1.28,-2.75);
    box(bedInteract,2.40,.19,1.60,mat('duvet','#b3c8b2'),-.65,1.09,-.55);
    for(var x of [-1.27,-.03]){
      var pillow=ball(bedInteract,.45,.13,.40,mat('bedPillows','#faf9f2'),x,1.13,-1.95);
      pillow.rotation.z=(x<-.7?-.04:.04)
    }
    interactiveRoomObject(bedInteract,'sleep','Bed · Sleep');
    for(var xx of [-2.65,1.32]){
      box(g,.80,.73,.80,wood,xx,.38,-2.03);
      box(g,.72,.11,.75,mat('nightstandTop','#d3b995'),xx,.78,-2.03);
      cylinder(g,.17,.17,.42,mat('bedLamp','#c0a78f'),xx,1.07,-2.03);
      ball(g,.23,.20,.23,mat('bedLight','#f1e4bd'),xx,1.43,-2.03)
    }
    box(g,1.53,2.20,.80,mat('wardrobe','#b4a18a'),2.55,1.12,-3.35);
    for(var xx of [2.1,2.97])capsule(g,[xx,1.0,-2.92],[xx,1.41,-2.92],.037,mat('wardrobeKnob','#a7adb0'));
    var rug=addMesh(g,new THREE.CircleGeometry(1.6,42),mat('bedRug','#d6bdaa'),-.75,.025,1.35,false,true);
    rug.rotation.x=-Math.PI/2;rug.scale.set(1.1,1.36,1);
    box(g,1.9,1.6,.09,mat('bedArtFrame','#a88369'),-2.5,3.2,-4.35);
    box(g,1.76,1.48,.035,mat('bedArt','#c0cdb8'),-2.5,3.2,-4.27);
    plant(3.12,.07,3.4,1.1,g)
  });
  addRoomWorld('living',14.05,8.35,function(g){
    box(g,8.55,.17,8.6,mat('livingFloorBase','#ccc1aa'),0,-.12,0);
    var floor=addMesh(g,new THREE.PlaneGeometry(8.54,8.6),floorMat,0,.006,0,false,true);floor.rotation.x=-Math.PI/2;
    // Warm living room with dedicated seating, TV wall, sideboard, plants and tables.
    // A real doorway joins the new rooms; it is not a sealed decorative backdrop.
    box(g,3.25,5.4,.16,plaster,-2.65,2.7,-4.35);
    box(g,3.25,5.4,.16,plaster,2.65,2.7,-4.35);
    box(g,2.10,1.12,.16,plaster,0,4.85,-4.35);
    box(g,.16,1.12,8.6,plaster,4.30,.56,0);
    var sofa=mat('livingRoomSofa','#96aa95');
    box(g,3.0,.55,1.26,sofa,-1.0,.50,1.55);
    box(g,3.0,1.20,.26,sofa,-1.0,1.05,1.01);
    for(var xx of [-2.35,.35])box(g,.26,.66,1.25,sofa,xx,.73,1.54);
    for(var xx of [-1.77,-.67])box(g,.93,.18,.88,mat('livingCushion','#c5d4bf'),xx,.90,1.66);
    var carpet=addMesh(g,new THREE.PlaneGeometry(4.15,4.55),mat('livingCarpet','#d0c0a6'),-.55,.022,.35,false,true);
    carpet.rotation.x=-Math.PI/2;
    box(g,1.8,.14,.88,wood,-.6,.66,-.43);
    for(var xx of [-1.32,.12])for(var zz of [-.76,-.12])box(g,.10,.61,.10,woodDark,xx,.31,zz);
    box(g,2.65,.75,.65,mat('mediaConsole','#c6b18a'),1.27,.43,-3.34);
    var tvInteract=new THREE.Group();g.add(tvInteract);
    box(tvInteract,3.25,2.15,.13,black,1.30,2.67,-4.19);
    box(tvInteract,2.94,1.79,.05,mat('television','#344d55',.34,.24),1.30,2.67,-4.10);
    interactiveRoomObject(tvInteract,'tv','Television · Watch');
    box(g,1.05,.68,.25,mat('shelf','#bba17e'),-3.20,1.58,-4.16);
    for(var n=0;n<4;n++)box(g,.16,.5,.22,mat('roomBook'+n,['#d0aa73','#7b9a92','#d2c29e','#b27b6a'][n]),-3.52+n*.21,1.97,-4.02);
    plant(3.17,0,2.9,1.2,g)
  });
  addRoomWorld('garden',0,12.2,function(g){
    box(g,18,.14,11.8,mat('patioEarth','#7d9d76'),0,-.12,0);
    var grass=new THREE.MeshStandardMaterial({color:'#8aa477',roughness:1});
    var green=addMesh(g,new THREE.PlaneGeometry(17.9,11.75),grass,0,.015,0,false,true);green.rotation.x=-Math.PI/2;
    box(g,6.2,.13,3.4,mat('decking','#b79975'),-2,.04,-1.0);
    for(var i=0;i<8;i++)box(g,.05,.02,3.2,mat('deckLines','#92775b'),-4.85+i*.8,.12,-1.0);
    for(var i=0;i<6;i++)plant(-7+i*2.65,0,4.0,.8+(i%3)*.2,g);
    box(g,2.4,.18,1.0,wood,2.6,.75,-1.85);
    for(var x of [1.7,3.5])cylinder(g,.15,.15,.74,wood,x,.38,-1.85);
    cylinder(g,.7,.65,.27,mat('gardenPot','#c7a382'),6.1,.16,-1.25);
    plant(6.1,.35,-1.25,2.2,g)
  });
  function focusRoom(room){
    var destinations={home:[0,1.8,-.25],kitchen:[0,1.8,-.25],
      sleep:[14.05,1.65,-.75],living:[14.05,1.75,8.35],garden:[0,1.5,12.2]};
    var point=destinations[room]||destinations.home;
    var required=({sleep:'sleep',living:'living',garden:'garden'})[room];
    if(required&&!roomSpaces[required]?.visible){
      // Reflect a just-purchased room immediately, before the next 3D refresh tick.
      var ownedNow=window.EvinKitchenBridge?.getState?.()?.owned||[];
      if(!ownedNow.includes(required))return false;
      roomSpaces[required].visible=true
    }
    cameraTarget.set(point[0],point[1],point[2]);targetZoom=room==='home'||room==='kitchen'?1:1.03;
    selection=null;selectionRing.visible=false;return true
  }

  // plants, printer and dog detail
  box(scene,.88,.28,.74,black,-2.1,.5,-3.65);
  box(scene,.9,.75,.83,woodDark,-2.1,.38,-3.65);
  // Dog on soft rug
  var dogRoot=new THREE.Group();scene.add(dogRoot);dogRoot.position.set(-5.25,0,3.55);
  ball(dogRoot,.83,.29,.33,mat('dog','#342c27',.85),0,.37,0);
  ball(dogRoot,.27,.25,.24,mat('dogface','#40302d'),-.82,.41,0);
  ball(dogRoot,.09,.08,.09,black,-1.05,.34,.09);
  for(var dx of [-.53,.48])for(var dz of [-.22,.2])cylinder(dogRoot,.075,.072,.3,mat('dogleg','#49382e'),dx,.18,dz);
  var tailRoot=new THREE.Group();tailRoot.position.set(.68,.45,0);dogRoot.add(tailRoot);
  var tail=capsule(tailRoot,[0,0,0],[.5,.28,.08],.09,mat('dogtail','#342a25'));
  var bowl=cylinder(scene,.34,.28,.15,mat('petbowl','#b86274',.45),-6.4,.11,4.2);
  interactive(dogRoot,'pet','Dog');
  var dogRug=addMesh(scene,new THREE.CircleGeometry(2.5,48),mat('rug','#8c9d68',1),-5.5,.006,3.15,false,true);dogRug.rotation.x=-Math.PI/2;dogRug.scale.set(1.55,.83,1);

  // Art-directed detail pass: floor rug fibers, cabinet fronts, seams, curtains,
  // and small household objects. All geometry is local: no external model requests.
  function makeLinenTexture(){
    return makeTexture(512,512,function(ctx,W,H){
      ctx.fillStyle='#c9be9c';ctx.fillRect(0,0,W,H);
      for(var i=0;i<3000;i++){
        var x=(i*71.73)%W,y=(i*41.29)%H;
        ctx.strokeStyle=i%3?'rgba(255,246,208,.17)':'rgba(96,85,63,.10)';
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2,y+5);ctx.stroke();
      }
    });
  }
  var linen=new THREE.MeshStandardMaterial({map:makeLinenTexture(),roughness:1});
  function rug(x,z,w,h){
    var group=new THREE.Group();scene.add(group);group.position.set(x,.012,z);
    var shape=addMesh(group,new THREE.PlaneGeometry(w,h),linen,0,0,0,false,true);
    shape.rotation.x=-Math.PI/2;
    var border=mat('rugBorder','#cfcbb0',1);
    for(var dx of [-w*.48,w*.48])box(group,.025,.012,h*.92,border,dx,.014,0);
    for(var dz of [-h*.46,h*.46])box(group,w*.96,.012,.025,border,0,.014,dz);
    return group
  }
  rug(-5.5,3.1,3.2,2.1);
  var homeCurtainMaterial=null;
  function littleCurtain(){
    var fabric=mat('fabric','#b97951',.98);
    var print=makeTexture(256,512,function(ctx,W,H){
      ctx.fillStyle='#bc7548';ctx.fillRect(0,0,W,H);
      for(var i=0;i<370;i++){
        var x=(i*67.1)%W,y=(i*47.3)%H;
        ctx.strokeStyle=i%3===0?'rgba(255,236,188,.55)':'rgba(255,212,162,.32)';
        ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+6,y+7,x+3,y+13);ctx.stroke();
      }
    });
    var cloth=new THREE.MeshStandardMaterial({map:print,side:THREE.DoubleSide,roughness:.99});homeCurtainMaterial=cloth;
    // Pleated café curtain on right side of window. Its folds catch the sunlight.
    for(var i=0;i<13;i++){
      var x=-1.30+i*.10,fold=Math.cos(i*Math.PI)*.10;
      var panel=addMesh(scene,new THREE.PlaneGeometry(.145,3.3),cloth,x,4.3,-5.08+fold,false,false);
      panel.rotation.y=fold*.8;
    }
    capsule(scene,[-1.55,5.98,-4.97],[.04,5.98,-4.97],.038,stainless);
  }
  littleCurtain();
  function cabinetDetail(){
    // Recessed panels and steel handles give real depth to the cabinetry.
    var panel=mat('cabinetPanel','#b3c7af',.62);
    for(var z of [-3.9,-1.65,.7,2.75]){
      box(scene,.065,.89,1.42,panel,5.82,.80,z);
      box(scene,.09,.04,.67,wood,5.75,1.30,z);
      capsule(scene,[5.73,.90,z-.29],[5.73,.90,z+.30],.032,stainless);
    }
    // Fine backsplash with subtle grout lines.
    var grout=mat('grout','#c6c5b5');
    for(var x=0;x<4;x++)capsule(scene,[5.75,1.62+x*.22,-5.44],[8.75,1.62+x*.22,-5.44],.008,grout);
    for(var x=0;x<13;x++)capsule(scene,[5.8+x*.235,1.62,-5.44],[5.8+x*.235,2.5,-5.44],.008,grout);
  }
  cabinetDetail();
  // A little character in the kitchen: sage tile, picture frame and fruit.
  (function(){
    var tiles=makeTexture(512,512,function(ctx,W,H){
      ctx.fillStyle='#e6e9e1';ctx.fillRect(0,0,W,H);
      var p=42;
      for(var y=0;y<H/p+1;y++)for(var x=0;x<W/p+1;x++){
        var hue=['#bbcfb9','#b5cbb5','#c2d3be','#b3c9b0'][(x+y*3)%4];
        ctx.fillStyle=hue;ctx.fillRect(x*p+3,y*p+3,p-6,p-6);
        ctx.fillStyle='rgba(245,255,241,.23)';ctx.fillRect(x*p+5,y*p+5,p-10,4);
      }
    });
    var backsplash=new THREE.MeshStandardMaterial({map:tiles,roughness:.45,metalness:.02});
    addMesh(scene,new THREE.PlaneGeometry(5.1,2.6),backsplash,5.25,3.34,-5.47,false,false);
    var print=makeTexture(320,400,function(ctx,W,H){
      ctx.fillStyle='#f5e9d2';ctx.fillRect(0,0,W,H);
      ctx.fillStyle='#e2d0aa';ctx.fillRect(17,17,W-34,H-34);
      ctx.fillStyle='#d68660';ctx.beginPath();ctx.arc(130,200,67,0,7);ctx.fill();
      ctx.fillStyle='#efbc65';ctx.beginPath();ctx.arc(193,140,54,0,7);ctx.fill();
      ctx.strokeStyle='#5c8b60';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(152,148);ctx.lineTo(196,73);ctx.stroke();
      ctx.fillStyle='#628c60';ctx.beginPath();ctx.ellipse(204,93,37,16,-.5,0,7);ctx.fill();
      ctx.fillStyle='#6d8c57';ctx.beginPath();ctx.ellipse(159,98,30,12,.75,0,7);ctx.fill();
      ctx.fillStyle='#f2d6a5';ctx.font='bold 19px sans-serif';ctx.fillText('GOOD THINGS',45,345);
    });
    box(scene,2.2,2.35,.10,mat('wallArtFrame','#8b7054'),1.7,4.16,-5.37);
    var art=addMesh(scene,new THREE.PlaneGeometry(2.03,2.18),new THREE.MeshBasicMaterial({map:print}),1.7,4.16,-5.30,false,false);
    // Domestic countertop props: three pieces of fruit and a small jar.
    var bowlBase=mat('newBowl','#dfd1b8',.38);
    cylinder(scene,.43,.31,.19,bowlBase,4.65,1.70,-3.5);
    ball(scene,.16,.15,.15,mat('newApple','#c77a58'),4.43,1.84,-3.53);
    ball(scene,.15,.17,.15,mat('newPear','#c4b16f'),4.65,1.85,-3.42);
    ball(scene,.18,.14,.17,mat('newOrange','#dfa75f'),4.91,1.83,-3.51);
  })();

  function countertopStillLife(){
    // Board and a few deliberately imperfect domestic props.
    var g=new THREE.Group();scene.add(g);
    box(g,.80,.055,.53,mat('board2','#bb976b'),5.84,1.66,-3.28);
    ball(g,.19,.15,.17,mat('lemon','#dfb75b'),5.58,1.82,-3.35);
    ball(g,.16,.13,.15,mat('tomato','#c9704d'),5.95,1.81,-3.18);
    for(var i=0;i<4;i++){
      var yy=1.62+i*.065;
      cylinder(g,.19,.19,.025,mat('plates','#e5dfcd'),7.12,yy,2.72);
    }
    cylinder(g,.23,.2,.55,mat('utensil','#7e926d'),7.06,1.89,.20);
    for(var j=0;j<5;j++){
      var a=j*Math.PI*2/5;
      capsule(g,[7.06,2.12,.2],[7.06+Math.cos(a)*.18,2.48,.2+Math.sin(a)*.18],.023,stainless);
    }
  }
  countertopStillLife();


  // Small affordances: a simmering pot and working appliances respond to task state.
  var steamParticles=[];
  var steamMaterial=new THREE.MeshBasicMaterial({color:'#f6f3e8',transparent:true,opacity:.24,depthWrite:false});
  for(var steamIndex=0;steamIndex<6;steamIndex++){
    var steamMesh=addMesh(scene,new THREE.SphereGeometry(.09,10,8),steamMaterial,6.28,2.02,-3.72,false,false);
    steamMesh.scale.set(.75,1.5,.75);
    steamMesh.visible=false;
    steamParticles.push(steamMesh);
  }
  var workstationGlow=new THREE.PointLight('#d8a66c',0,3);
  workstationGlow.position.set(6.4,1.9,-3.55);
  scene.add(workstationGlow);
  function syncWorkingDetails(state,elapsed){
    var cooking=state.currentSpot==='stove'||state.partnerSpot==='stove';
    workstationGlow.intensity=cooking?.9:0;
    steamParticles.forEach(function(p,i){
      p.visible=cooking;
      if(cooking){
        var t=(elapsed*.33+i/steamParticles.length)%1;
        p.position.set(6.28+Math.sin(i*3.9+t*6)*.11,1.94+t*.85,-3.73+Math.cos(i*1.7)*.09);
        p.scale.set(.5+t*.95,.5+t*1.2,.5+t*.95);
      }
    });
  }

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
    var leftArm=new THREE.Group();leftArm.position.set(-.3,1.44,0);body.add(leftArm);
    capsule(leftArm,[0,0,0],[-.13,-.4,.06],.10,skin);
    var rightArm=new THREE.Group();rightArm.position.set(.3,1.44,0);body.add(rightArm);
    capsule(rightArm,[0,0,0],[.12,-.4,.07],.10,skin);
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
    actors[key]={root,body,leftArm,rightArm,sideHair,initial:look.pos.slice(),position:new THREE.Vector3(...look.pos)};
    root.position.set(...look.pos);
    return root
  }
  makePerson('self',{pos:[4.30,0,2.95],skin:'#b97f61',hair:'#48332b',shirt:'#f2eee3',pants:'#665b50',hairLong:false},false);
  makePerson('partner',{pos:[4.45,0,-2.80],skin:'#cb9375',hair:'#533b2c',shirt:'#b76b53',pants:'#6c695b',hairLong:true},false);
  makePerson('kid',{pos:[-1.45,0,3.07],skin:'#9d624c',hair:'#322927',shirt:'#d48150',pants:'#9c9b72',hairLong:true},true);
  makePerson('elder',{pos:[-4.9,0,1.8],skin:'#714a37',hair:'#b6b3a3',shirt:'#908286',pants:'#6d7762',hairLong:false},.92);

  /* Original collectible design library — rendered as real Three.js geometry. */
  var createDecorMesh=window.HouseBossCreateDecorMesh||null;
  if(!createDecorMesh){
   try{
    var editions=await import('./house-boss-decor-meshes.js?v=3');
    createDecorMesh=editions.createDecorMesh;
   }catch(error){console.error('Designer object models could not be loaded',error)}
  }
  /* HOUSE_BOSS_FREE_FURNITURE_3D_V11 — native movable 3D furniture with ghost placement. */
  var furnitureObjects=new Map(),furnitureStamp='',pendingFurniture=null,ghostFurniture=null;
  var buildGrid=new THREE.GridHelper(17,34,'#669565','#b3cbb0');
  buildGrid.position.set(-.9,.032,0);
  buildGrid.material.transparent=true;buildGrid.material.opacity=.23;
  buildGrid.visible=false;scene.add(buildGrid);
  function furnitureMesh(type,uid,isGhost,showOriginalPreview){
    var g=new THREE.Group();scene.add(g);
    var natural=mat('buildNatural','#b48a62',.83),pale=mat('buildPale','#eee7d8',.9);
    var dark=mat('buildDark','#45504a'),sage=mat('buildSage','#738e7d'),copper=mat('buildCopper','#b07e60');
    if(type==='plant'){
      cylinder(g,.27,.19,.38,copper,0,.22,0);
      cylinder(g,.24,.23,.045,mat('buildEarth','#574b3a'),0,.44,0);
      for(var i=0;i<9;i++){
        var t=i*Math.PI*2/9,rad=.25+i%3*.085,y=1.0+i%4*.17;
        capsule(g,[0,.43,0],[Math.cos(t)*rad,y,Math.sin(t)*rad],.024,dark);
        var leaf=ball(g,.14,.07,.28,mat('buildLeaves'+i,i%2?'#4c7f54':'#79a66e'),Math.cos(t)*rad,y,Math.sin(t)*rad);
        leaf.rotation.y=t;
      }
    }else if(type==='bookshelf'){
      box(g,1.20,2.32,.56,natural,0,1.16,0);
      box(g,1.07,2.15,.48,mat('buildShelfBack','#e6d2ae'),0,1.20,.055);
      for(var h of [.38,1.0,1.63,2.15])box(g,1.16,.10,.59,natural,0,h,0);
      for(var row=0;row<3;row++)for(var col=0;col<6;col++){
        var hues=['#778b77','#a87563','#d1b57b','#587c86','#8e8f83','#bd9472'];
        box(g,.13,.28+((row+col)%3)*.07,.33,mat('buildBook'+row+'_'+col,hues[(col+row)%6]),-.44+col*.175,.56+row*.63,.02)
      }
    }else if(type==='floorlamp'){
      cylinder(g,.28,.32,.07,dark,0,.06,0);
      capsule(g,[0,.08,0],[0,1.98,0],.045,dark);
      capsule(g,[0,1.96,0],[.20,2.17,0],.04,dark);
      var shade=addMesh(g,new THREE.ConeGeometry(.40,.62,20),mat('buildLampShade','#f0d5a0'),.20,1.94,0);
      cylinder(g,.17,.17,.025,pale,.20,1.64,0);
    }else if(type==='armchair'){
      var fab=mat('buildChair','#b0816c',.96);
      box(g,1.12,.38,1.01,fab,0,.41,0);
      box(g,1.12,.88,.20,fab,0,.82,-.43);
      for(var sx of [-.49,.49])ball(g,.16,.34,.49,fab,sx,.65,0);
      box(g,.80,.16,.72,mat('buildChairCushion','#c2a090'),0,.71,.11);
      for(var xx of [-.42,.42])for(var zz of [-.35,.35])box(g,.095,.15,.095,natural,xx,.08,zz);
    }else if(type==='ottoman'){
      var cushion=mat('buildOttoman','#8ca8a1',.92);
      box(g,.82,.42,.73,cushion,0,.35,0);
      ball(g,.43,.17,.39,cushion,0,.57,0);
      for(var xx of [-.31,.31])for(var zz of [-.26,.26])box(g,.085,.14,.085,natural,xx,.095,zz);
    }else if(type==='petbed'){
      var fabric=mat('buildDogBed','#a88c79',.95);
      var cushion=mat('buildDogCushion','#d4bca1',.96);
      ball(g,.56,.11,.45,cushion,0,.16,0);
      var edge=torus(g,.53,.16,fabric,0,.18,0);edge.scale.z=.84;
      ball(g,.27,.07,.20,mat('buildPetPillow','#eee3d4'),-.15,.26,.08);
    }else if(type==='easel'){
      for(var xx of [-.32,.32])capsule(g,[xx*.55,0,.28],[xx,2.25,-.26],.045,natural);
      capsule(g,[0,0,-.38],[0,1.78,-.12],.045,natural);
      box(g,1.07,1.28,.085,pale,0,1.49,-.15);
      box(g,.88,1.07,.02,mat('buildArtPaper','#ece2d2'),0,1.49,-.083);
      ball(g,.23,.35,.02,mat('buildPaintOrange','#bd9065'),-.18,1.52,-.065);
      ball(g,.21,.27,.02,mat('buildPaintGreen','#60877a'),.14,1.25,-.06);
      box(g,1.10,.06,.20,natural,0,.79,.01)
    }else if(type==='yogamat'){
      box(g,1.56,.06,.73,sage,0,.045,0);
      for(var xx of [-.68,.68])box(g,.03,.068,.72,mat('buildMatTrim','#d5e0ca'),xx,.08,0);
      for(var i=-2;i<=2;i++)box(g,.07,.008,.46,mat('buildMatDetail','#afc8b9'),i*.24,.083,0)
    }else if(type==='sidetable'){
      cylinder(g,.39,.39,.095,natural,0,.71,0);
      cylinder(g,.08,.10,.62,dark,0,.37,0);
      cylinder(g,.25,.25,.06,dark,0,.06,0);
      cylinder(g,.10,.08,.25,mat('buildCup','#bfcfc0'),.13,.91,0)
    }else if(type==='stereo'){
      box(g,1.07,.78,.62,mat('buildConsole','#788b88'),0,.51,0);
      box(g,.94,.57,.055,dark,0,.54,.34);
      for(var xx of [-.30,.30]){
        var speaker=torus(g,.17,.023,pale,xx,.51,.375);speaker.rotation.x=0
      }
      cylinder(g,.06,.06,.04,mat('buildKnob','#d7be92'),0,.83,.36);
      for(var xx of [-.41,.41])box(g,.09,.20,.08,dark,xx,.10,0);
    }else if(['loungechair','loveseat','recliner','chaise','statementsofa','daybed'].includes(type)){
       var meta=window.HouseBossFurnitureTypes?.[type]||{w:1.2,d:1.1,color:'#b5a596'};
       var w=meta.w-.08,d=meta.d-.10,one=['loungechair','recliner'].includes(type);
       var premium=['chaise','statementsofa','recliner','daybed'].includes(type);
       var fabric=new THREE.MeshStandardMaterial({color:meta.color,roughness:type==='recliner'?.58:.88,metalness:0});
       var trim=mat('furnPiping','#dfd7c7'),frame=mat('furnFrame','#9c7d61');
       for(var xx of [-w*.37,w*.37])for(var zz of [-d*.29,d*.29])box(g,.085,.23,.085,frame,xx,.13,zz);
       box(g,w,.27,d,fabric,0,.48,0);
       box(g,w,.73,.22,fabric,0,.90,-d*.42).rotation.x=type==='chaise'?-.25:-.09;
       for(var xx of [-w*.47,w*.47])ball(g,.17,.30,d*.46,fabric,xx,.66,0);
       var count=one?1:type==='statementsofa'?3:2;
       for(var i=0;i<count;i++){
         var x=-w*.5+w*(i+.5)/count;
         ball(g,w/(count*2)-.035,.13,d*.36,fabric,x,.70,.10);
         box(g,w/count-.07,.30,.18,fabric,x,1.00,-d*.31).rotation.x=-.08;
         if(premium){ball(g,.027,.027,.015,trim,x,.70,d*.40);box(g,w/count-.09,.02,.025,trim,x,.58,d*.42);}
       }
       if(type==='recliner')box(g,w*.78,.16,.43,fabric,0,.28,d*.59).rotation.x=-.22;
       if(type==='statementsofa'){box(g,.74,.30,d*.70,fabric,-w*.29,.45,d*.40);ball(g,.32,.14,.38,fabric,-w*.29,.70,d*.42);}
     }else if(type==='walnutdesk'){
       var wood=mat('walnutDesk','#8e6449'),gold=mat('deskBrass','#bca176'),darktop=mat('deskMat','#453f3b');
       box(g,1.50,.12,.76,wood,0,.85,0);
       for(var x of [-.64,.64])for(var z of [-.26,.26])box(g,.085,.78,.085,wood,x,.42,z);
       box(g,.50,.29,.69,wood,.45,.65,0);
       for(var y of [.59,.72])box(g,.38,.018,.018,gold,.46,y,.36);
       box(g,.48,.027,.33,darktop,-.30,.95,-.06);
       capsule(g,[-.63,.94,-.26],[-.63,1.39,-.26],.03,gold);
       ball(g,.24,.035,.18,mat('deskLight','#e6d4b1'),-.63,1.39,-.26);
     }else if(type==='pendant'){
       var gold=mat('sculptBrass','#bba071'),shade=mat('sculptLinen','#e9ddc7');
       cylinder(g,.27,.31,.065,gold,0,.04,0);
       capsule(g,[0,.06,0],[0,1.68,0],.03,gold);
       capsule(g,[0,1.67,0],[.21,2.12,0],.03,gold);
       addMesh(g,new THREE.CylinderGeometry(.31,.46,.39,24),shade,.21,2.06,0);
       cylinder(g,.22,.22,.035,mat('sculptBulb','#fff4cf'),.21,1.84,0);
     }else if(type==='hifi'){
       var wood=mat('hifiWood','#7c6151'),metal=mat('hifiMetal','#555c55'),gold=mat('hifiGold','#d1b895');
       box(g,1.16,.76,.62,wood,0,.49,0);box(g,1.08,.60,.03,metal,0,.55,.33);
       for(var x of [-.34,.34])torus(g,.21,.032,gold,x,.53,.36);
       cylinder(g,.16,.16,.028,gold,0,.98,-.12);
       for(var x of [-.47,.47])box(g,.09,.18,.10,wood,x,.10,0);
     }else if(type==='grandbookcase'){
       var wood=mat('galleryOak','#9b7757'),back=mat('galleryCream','#e2d6c5');
       box(g,1.44,2.58,.54,wood,0,1.3,0);box(g,1.27,2.36,.45,back,0,1.32,.03);
       for(var i=0;i<5;i++){var y=.30+i*.48;box(g,1.36,.085,.57,wood,0,y,0);
         for(var j=0;j<5;j++)box(g,.14,.24+((j+i)%3)*.045,.30,mat('galleryBook'+i+'_'+j,['#84968d','#a88b70','#c8b29b','#778a93','#786f68'][j]),-.50+j*.24,y+.17,.11);}
       for(var x of [-.68,.68])capsule(g,[x,.16,.13],[x,2.46,.13],.07,wood);
      }else if(createDecorMesh&&createDecorMesh(type,g,{THREE:THREE,box:box,ball:ball,cylinder:cylinder,torus:torus,capsule:capsule,addMesh:addMesh})){
      // Designer editions produced distinctive geometry above.
    }else{
      scene.remove(g);return null
    }
    g.userData.furnitureId=uid;
    if(isGhost){
      g.traverse(function(o){if(!o.isMesh)return;
        o.castShadow=false;o.receiveShadow=false;
        o.material=o.material.clone();if(!showOriginalPreview)o.material.color.set('#75c995');
        o.material.transparent=true;o.material.opacity=showOriginalPreview?.92:.53;o.material.depthWrite=false
      });
    }else{
      g.traverse(function(o){if(o.isMesh){o.userData.owner=g;pickables.push(o)}});
    }
    return g
  }
  function removeFurnitureGroup(group,disposeMaterials){
    if(!group)return;
    group.traverse(function(obj){if(!obj.isMesh)return;
      var index=pickables.indexOf(obj);if(index>=0)pickables.splice(index,1);
      if(obj.geometry)obj.geometry.dispose();
      if((disposeMaterials||group.userData.decorCategory)&&obj.material)obj.material.dispose()
    });
    scene.remove(group)
  }
  function syncFurniture(records){
    records=Array.isArray(records)?records:[];
    var desired=new Set();
    for(var o of records){
      if(!o||typeof o.uid!=='string'||typeof o.type!=='string')continue;
      desired.add(o.uid);
      var entry=furnitureObjects.get(o.uid);
      if(!entry||entry.type!==o.type){
        if(entry)removeFurnitureGroup(entry.group,false);
        var group=furnitureMesh(o.type,o.uid,false);if(!group)continue;
        entry={type:o.type,group:group};furnitureObjects.set(o.uid,entry)
      }
      if(entry.tint!==o.tint&&entry.group.userData.decorCategory){
        var newTone=o.tint||window.HouseBossFurnitureTypes?.[o.type]?.color;
        if(newTone)entry.group.traverse(function(mesh){
         if(mesh.isMesh&&mesh.material?.userData?.houseBossEdition)mesh.material.color.set(newTone)
        });
        entry.tint=o.tint
       }
       entry.group.position.set(o.x,window.HouseBossBuildBridge?.height?.(o)||0,o.z);
      entry.group.rotation.y=(o.rot||0)*Math.PI/2;
      entry.group.visible=!(pendingFurniture&&pendingFurniture.uid===o.uid)
    }
    for(var [uid,entry] of furnitureObjects){
      if(!desired.has(uid)){removeFurnitureGroup(entry.group,false);furnitureObjects.delete(uid)}
    }
  }
  function notifyPlacement(){
    window.HouseBossFurnitureUI?.updateStatus?.()
  }
  function updateFurnitureGhost(patch){
    if(!pendingFurniture||!ghostFurniture)return false;
    if(patch.x!==undefined)pendingFurniture.x=Math.round(Number(patch.x)*2)/2;
    if(patch.z!==undefined)pendingFurniture.z=Math.round(Number(patch.z)*2)/2;
    if(patch.rot!==undefined)pendingFurniture.rot=((Math.round(patch.rot)%4)+4)%4;
    const result=window.HouseBossBuildBridge?.validate?.(pendingFurniture)||{ok:false,reason:'Waiting for build grid'};
    pendingFurniture.valid=!!result.ok;pendingFurniture.reason=result.reason||'';
    ghostFurniture.position.set(pendingFurniture.x,(window.HouseBossBuildBridge?.height?.(pendingFurniture)||0)+.055,pendingFurniture.z);
    ghostFurniture.rotation.y=pendingFurniture.rot*Math.PI/2;
    ghostFurniture.traverse(function(obj){
      if(obj.isMesh&&pendingFurniture.mode!=='preview')obj.material.color.set(pendingFurniture.valid?'#71c58b':'#e77267')
    });
    notifyPlacement();return pendingFurniture.valid
  }
  function beginFurniturePlacement(item){
    if(!item||!window.HouseBossBuildBridge?.validate||!window.HouseBossFurnitureTypes?.[item.type])return false;
    cancelFurniturePlacement();
    pendingFurniture={type:item.type,uid:item.uid||null,mode:item.mode||'buy',x:item.x,z:item.z,rot:item.rot||0};
    ghostFurniture=furnitureMesh(item.type,'preview',true,pendingFurniture.mode==='preview');
    if(!ghostFurniture){pendingFurniture=null;return false}
    buildGrid.visible=true;
    var moved=furnitureObjects.get(pendingFurniture.uid);if(moved)moved.group.visible=false;
    updateFurnitureGhost({});renderer.domElement.style.cursor='crosshair';return true
  }
  function cancelFurniturePlacement(){
    if(ghostFurniture){removeFurnitureGroup(ghostFurniture,true);ghostFurniture=null}
    pendingFurniture=null;buildGrid.visible=false;
    furnitureObjects.forEach(function(entry){entry.group.visible=true});
    renderer.domElement.style.cursor='grab'
  }
  function getFurniturePlacement(){return pendingFurniture?Object.assign({},pendingFurniture):null}
  function moveFurnitureBy(dx,dz){
    if(!pendingFurniture)return false;
    return updateFurnitureGhost({x:pendingFurniture.x+dx,z:pendingFurniture.z+dz})
  }
  function rotateFurniture(){
    if(!pendingFurniture)return false;
    return updateFurnitureGhost({rot:(pendingFurniture.rot+1)%4})
  }
  function beginFurnitureFromTap(e){
    if(!pendingFurniture)return false;
    normalized(e);raycaster.setFromCamera(pointer,camera);
    if(!raycaster.ray.intersectPlane(walkingGround,walkingIntersection))return false;
    return updateFurnitureGhost({x:walkingIntersection.x,z:walkingIntersection.z})
  }
  function focusFurniture(x,z){
    cameraTarget.set(Math.max(-5.75,Math.min(3.8,x*.73)),1.13,Math.max(-3.15,Math.min(3.2,z*.73)));
    targetZoom=1.35
  }

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
    selectionRing.visible=true;selectionRing.position.set(pos.x,pos.y+.13,pos.z);
  }
  function focus(key){
    setTarget(key);
    var p=stationPositions[key]||defaultTarget;
    cameraTarget.set(p.x*.72,1.5,p.z*.72);
    targetZoom=1.35;
  }
  function focusDesign(category){
    const targets={
      sofa:[-6,1.1,.1],wallpaper:[0,3.4,-5.1],flooring:[0,.4,.9],
      cabinets:[5.9,1.5,-1.7],rug:[-5.4,.4,3.0],curtains:[-1.5,3.8,-5.0]
    };
    const p=targets[category];if(!p)return;
    cameraTarget.set(p[0]*.70,Math.max(1.1,p[1]*.68),p[2]*.72);
    targetZoom=category==='wallpaper'||category==='flooring'?1.15:1.42;
    selection=null;selectionRing.visible=false;
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
    function visibleInWorld(obj){
      while(obj){if(!obj.visible)return false;obj=obj.parent}
      return true
    }
    for(var it of intersections){
      var o=it.object.userData.owner;
      if(o&&visibleInWorld(it.object)&&visibleInWorld(o)&&(o.userData.station||o.userData.person||o.userData.furnitureId||o.userData.roomAction))return o
    }
    return null
  }
    var walkingGround=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  var walkingIntersection=new THREE.Vector3();
  function walkIn3D(e){
    normalized(e);raycaster.setFromCamera(pointer,camera);
    if(!raycaster.ray.intersectPlane(walkingGround,walkingIntersection))return;
    if(walkingIntersection.x<-6.15||walkingIntersection.x>6.15||walkingIntersection.z<-4.7||walkingIntersection.z>5.3)return;
    window.EvinKitchenBridge?.walkTo?.(walkingIntersection.x,walkingIntersection.z)
  }

  function activate(e){
    var inDesigner=document.getElementById('notebook')?.classList.contains('design-mode');
    var furnitureView=inDesigner&&window.HouseBossHomeDesign?.isFurnitureView?.();
    if(furnitureView&&pendingFurniture){beginFurnitureFromTap(e);return}
    var target=getHit(e);
    if(furnitureView){
      if(target?.userData?.furnitureId)window.HouseBossFurnitureUI?.selectFrom3D?.(target.userData.furnitureId);
      return
    }
    if(inDesigner)return;
    if(!target){walkIn3D(e);return}
    if(target.userData.furnitureId){
      window.HouseBossBuildBridge?.interact?.(target.userData.furnitureId);return
    }
    if(target.userData.roomAction){
      var selected=window.HouseBossSimBridge?.getState?.()?.selected||'self';
      window.HouseBossSimBridge?.action?.(target.userData.roomAction,selected);
      return
    }
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
      if(moved&&pendingFurniture){beginFurnitureFromTap(e)}
      else if(moved){cameraTarget.x-=dx*.021/targetZoom;cameraTarget.z-=dy*.028/targetZoom;cameraTarget.x=Math.max(-4.5,Math.min(4.5,cameraTarget.x));cameraTarget.z=Math.max(-3.1,Math.min(3.1,cameraTarget.z));}
      lastX=e.clientX;lastY=e.clientY;
    }else{
      var o=getHit(e);renderer.domElement.style.cursor=o?'pointer':'grab';
      if(o&&o!==hovered){hovered=o;host.title=o.userData.label||o.userData.person||''}
      if(!o){hovered=null;host.title=''}
    }
  });
  renderer.domElement.addEventListener('pointerup',function(e){if(!pressed)return;if(pendingFurniture)beginFurnitureFromTap(e);else if(!moved&&performance.now()-pressed.t<600)activate(e);pressed=null;renderer.domElement.style.cursor=pendingFurniture?'crosshair':'grab'});
  renderer.domElement.addEventListener('pointercancel',function(){pressed=null});
  renderer.domElement.addEventListener('wheel',function(e){e.preventDefault();adjustZoom(e.deltaY<0?.12:-.12)},{passive:false});
  var touches=new Map(),prevPinch=0;
  renderer.domElement.addEventListener('touchstart',function(e){for(var t of e.changedTouches)touches.set(t.identifier,{x:t.clientX,y:t.clientY});if(touches.size<2)prevPinch=0},{passive:true});
  renderer.domElement.addEventListener('touchmove',function(e){for(var t of e.changedTouches)touches.set(t.identifier,{x:t.clientX,y:t.clientY});if(touches.size===2){var p=[...touches.values()];var dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(prevPinch>0)adjustZoom((dist-prevPinch)*.002);prevPinch=dist}},{passive:true});
  renderer.domElement.addEventListener('touchend',function(e){for(var t of e.changedTouches)touches.delete(t.identifier);if(touches.size<2)prevPinch=0},{passive:true});
  // SIM_SELECTED_MARKER_V4: original floating selection halo, not an imported game asset.
  var simMarker=new THREE.Group();scene.add(simMarker);
  var simMarkerMat=new THREE.MeshStandardMaterial({color:'#9ed493',emissive:'#315f3e',emissiveIntensity:.32,roughness:.42,metalness:.07});
  var simLeaf=new THREE.Mesh(new THREE.SphereGeometry(.20,10,8),simMarkerMat);
  simLeaf.scale.set(.69,1.55,.56);simLeaf.rotation.z=-.16;simMarker.add(simLeaf);
  var simRing=new THREE.Mesh(new THREE.TorusGeometry(.34,.029,7,24),
     new THREE.MeshBasicMaterial({color:'#f5ffe7',transparent:true,opacity:.65}));
  simRing.rotation.x=Math.PI/2;simRing.position.y=-.33;simMarker.add(simRing);
  simMarker.visible=false;
  function updateSimMarker(state,t){
    var sel=state.simSelected||'self';
    var person=sel==='pet'?dogRoot:actors[sel]&&actors[sel].root;
    if(!person||!person.visible||state.selfAway&&sel==='self'||state.partnerAway&&sel==='partner'||state.kidAway&&sel==='kid'){simMarker.visible=false;return}
    simMarker.visible=true;
    simMarker.position.set(person.position.x,person.position.y+(sel==='pet'?1.6:3.2)+Math.sin(t*1.9)*.075,person.position.z);
    simLeaf.rotation.y=t*.7;
    var tone=state.simMoodTone||'happy';
    simMarkerMat.color.set(tone==='bad'?'#d48c7c':tone==='tense'?'#d9b376':tone==='inspired'?'#9aabdf':'#9ed493');
  }

  // Render sync is read-only: game logic and save files remain the authoritative source.
  var lastStateTime=0,clock=new THREE.Clock(),oldSnapshot=null,previousAvatar='';
  /* HOUSE_BOSS_WALK_ANIM_V8 — walk around kitchen counters, no 2D movement.
     Animations are procedural and synchronized with the saved activity timeline. */
  var workerPositions={
    stove:[5.04,0,-3.6],sink:[5.04,0,-.9],table:[.35,0,2.95],
    desk:[3.1,0,-2.4],kid:[-1.2,0,2.55],floor:[-4.1,0,3.1],
    laundry:[5.2,0,2.2],pet:[-4.8,0,3.8]
  };
  function isBlocked(a,b){
    // Raised central kitchen island is not walkable; allow space on all four sides.
    for(var i=1;i<=24;i++){
      var t=i/25,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
      if(x>-3.58&&x<3.84&&z>-1.55&&z<1.55)return true
    }
    return false
  }
  function routeTo(from,to){
    // Continuous path through the cutaway room corridor east of the kitchen.
    if(to.x>9&&from.x<9){
      return [new THREE.Vector3(5.28,0,3.75),new THREE.Vector3(9.45,0,3.75),
        new THREE.Vector3(14.05,0,3.75),new THREE.Vector3(to.x,0,3.75),to.clone()]
    }
    if(from.x>9&&to.x<9){
      var door=new THREE.Vector3(5.28,0,3.75);
      return [new THREE.Vector3(14.05,0,3.75),new THREE.Vector3(9.45,0,3.75),door].concat(routeTo(door,to))
    }
    if(from.x>9&&to.x>9&&(from.z-4.02)*(to.z-4.02)<0){
      return [new THREE.Vector3(14.05,0,from.z),new THREE.Vector3(14.05,0,4.02),
         new THREE.Vector3(14.05,0,to.z),to.clone()]
    }
    if(!isBlocked(from,to))return [to.clone()];
    var sideX=[-5.05,5.30],sideZ=[-2.35,2.35],choices=[];
    for(var x of sideX)choices.push([
      new THREE.Vector3(x,0,from.z),new THREE.Vector3(x,0,to.z),to.clone()
    ]);
    for(var z of sideZ)choices.push([
      new THREE.Vector3(from.x,0,z),new THREE.Vector3(to.x,0,z),to.clone()
    ]);
    var valid=choices.filter(function(points){
      var prev=from;
      for(var p of points){if(isBlocked(prev,p))return false;prev=p}
      return true
    });
    if(!valid.length)return [to.clone()];
    valid.sort(function(a,b){
      function len(steps){var d=0,p=from;for(var next of steps){d+=p.distanceTo(next);p=next}return d}
      return len(a)-len(b)
    });
    return valid[0]
  }
  var thoughtCache={};
  function thoughtIcon(id){
    if(!id)return '';
    if(id.startsWith('bond_')||id==='talk')return '♡';
    var map={cook:'◈',snack:'◈',shower:'◉',toilet:'◌',sleep:'☾',nap:'☾',
      tv:'▷',read:'▤',study:'✎',paint:'✿',exercise:'↗',dance:'♫',
      clean:'✦',laundry:'▧',computer:'⌘',homework:'✎',
      playdog:'♡',feedpet:'◈',dogfood:'◈',dognap:'☾',dogplay:'♧',groom:'✧'};
    return map[id]||'✦'
  }
  function thoughtTexture(icon){
    if(thoughtCache[icon])return thoughtCache[icon];
    var canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
    var ctx=canvas.getContext('2d');
    ctx.fillStyle='rgba(36,62,42,.23)';ctx.beginPath();ctx.arc(66,68,51,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fffef3';ctx.beginPath();ctx.arc(64,58,49,0,Math.PI*2);ctx.fill();
    ctx.lineWidth=5;ctx.strokeStyle='#9bbd8e';ctx.stroke();
    ctx.fillStyle='#3d7049';ctx.font='700 66px sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(icon,64,60);
    var tx=new THREE.CanvasTexture(canvas);tx.colorSpace=THREE.SRGBColorSpace;
    thoughtCache[icon]=tx;return tx
  }
  function createThought(root,small){
    var sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:thoughtTexture('✦'),transparent:true,depthWrite:false,opacity:.9}));
    sprite.position.set(.17,small?2.95:3.05,0);
    sprite.scale.set(.71,.71,1);sprite.visible=false;root.add(sprite);
    return sprite
  }
  Object.keys(actors).forEach(function(id){actors[id].thought=createThought(actors[id].root,id==='kid')});
  var petThought=createThought(dogRoot,true);
  petThought.position.set(-.72,1.28,0);
  var petDestination=dogRoot.position.clone(),petNav=[],petLastAction='';
  function setThought(sprite,id){
    var icon=thoughtIcon(id);if(!sprite)return;
    sprite.visible=!!icon;
    if(icon&&sprite.userData.icon!==icon){
      sprite.material.map=thoughtTexture(icon);sprite.material.needsUpdate=true;sprite.userData.icon=icon
    }
  }
  function targetAt(spot,who){
    var p=workerPositions[spot];if(!p)return null;
    var side=who==='partner'?.58:who==='kid'?-.55:0;
    return new THREE.Vector3(p[0]+side,0,p[2]+(who==='partner'?.12:0))
  }
  function furnitureUsePosition(item){
    if(!item)return null;
    // Approach from a walkable edge, rather than standing inside the furniture mesh.
    var x=item.x,z=item.z;
    if(z< -2.7)z+=1.05;
    else if(z>2.7)z-=1.05;
    else if(x< -5.0)x+=1.05;
    return new THREE.Vector3(x,0,z)
  }
  function updateActors(state,dt,elapsed){
    var act=state.simActions||{},social=state.simSocialTargets||{},walk=state.simWalkTargets||{},
      furnishTargets=state.simFurnitureTargets||{},furnitureList=state.furniture||[];
    var tasks={self:state.currentSpot,partner:state.partnerSpot,kid:state.kidSpot};
    var inConversation={};
    for(var who of ['self','partner','kid']){
      var other=social[who];
      if(other&&!tasks[other]&&!inConversation[other])inConversation[other]=who
    }
    var destinations={
      self:new THREE.Vector3(4.30,0,2.95),
      partner:new THREE.Vector3(4.45,0,-2.80),
      kid:new THREE.Vector3(-1.45,0,3.07)
    };
    var waypoints={self:0,partner:0,kid:0},count=0;
    for(var key of ['self','partner','kid']){
      if(tasks[key])destinations[key]=targetAt(tasks[key],key)||destinations[key];
      else if(inConversation[key])destinations[key]=targetAt('table',key)||destinations[key];
      else if(walk[key]&&Number.isFinite(walk[key].x)&&Number.isFinite(walk[key].z))
        destinations[key]=new THREE.Vector3(walk[key].x,0,walk[key].z);
      // Purchased rooms are actual destinations for the household.
      if(act[key]==='sleep'&&(state.owned||[]).includes('sleep'))
        destinations[key]=new THREE.Vector3(13.2+(key==='partner'?.7:key==='kid'?-.65:0),0,-.45);
      if(['tv','dance'].includes(act[key])&&(state.owned||[]).includes('living'))
        destinations[key]=act[key]==='tv'
         ?new THREE.Vector3(13.1+(key==='partner'?.65:key==='kid'?-.6:0),0,9.70)
         :new THREE.Vector3(13.1+(key==='partner'?.65:key==='kid'?-.6:0),0,7.15);
      if(furnishTargets[key]){
        var activeObject=furnitureList.find(function(o){return o.uid===furnishTargets[key]});
        if(activeObject)destinations[key]=furnitureUsePosition(activeObject)||destinations[key]
      }
    }
    for(var key of ['self','partner','kid']){
      var data=actors[key],root=data.root,dest=destinations[key],activity=act[key]||'';
      root.visible=!(key==='self'&&state.selfAway||key==='partner'&&state.partnerAway||key==='kid'&&state.kidAway);
      if(!root.visible){data.thought.visible=false;continue}
      if(!data.lastDest||data.lastDest.distanceToSquared(dest)>.10){
        data.lastDest=dest.clone();data.nav=routeTo(root.position,dest)
      }
      if(!data.nav)data.nav=[];
      while(data.nav.length&&root.position.distanceToSquared(data.nav[0])<.045)data.nav.shift();
      var goal=data.nav[0]||dest;
      var dx=goal.x-root.position.x,dz=goal.z-root.position.z;
      var distance=Math.hypot(dx,dz),moving=distance>.08,step=(state.paused?0:dt)*2.65;
      if(moving&&step>0){
        var amount=Math.min(distance,step);
        root.position.x+=dx/distance*amount;root.position.z+=dz/distance*amount;
        var facing=Math.atan2(dx,dz);
        var delta=Math.atan2(Math.sin(facing-root.rotation.y),Math.cos(facing-root.rotation.y));
        root.rotation.y+=delta*Math.min(1,dt*8)
      }
      var active=!!(activity||tasks[key]||inConversation[key]);
      var sleeping=/sleep|nap/.test(activity),talking=/bond_|talk/.test(activity)||!!inConversation[key];
      var rhythmic=Math.sin(elapsed*(moving?9:active?4.4:1.5)+key.length);
      data.body.position.y=moving?rhythmic*.045:Math.sin(elapsed*1.5+key.length)*.012;
      var arm=active?(talking?Math.sin(elapsed*5)*.28:Math.sin(elapsed*7)*.36):.032;
      var pose=sleeping?-.08:active?-.43:0;
      data.leftArm.rotation.x+=(pose+(moving?rhythmic*.45:arm)-data.leftArm.rotation.x)*Math.min(1,dt*8);
      data.rightArm.rotation.x+=(pose-(moving?rhythmic*.45:arm)-data.rightArm.rotation.x)*Math.min(1,dt*8);
      var tilt=sleeping?.31:activity==='exercise'?.18:0;
      data.body.rotation.z+=(tilt-data.body.rotation.z)*Math.min(1,dt*5);
      // Bed use is a visible activity: lie across the mattress only after arrival.
      var inRealBed=activity==='sleep'&&(state.owned||[]).includes('sleep')&&!moving;
      var lieAngle=inRealBed?-Math.PI/2:0;
      root.rotation.x+=(lieAngle-root.rotation.x)*Math.min(1,dt*4.5);
      root.position.y+=((inRealBed?.98:0)-root.position.y)*Math.min(1,dt*4.5);
      if(!moving&&!active)root.rotation.y+=(-.15-root.rotation.y)*Math.min(1,dt*.55);
      setThought(data.thought,activity);
      if(data.thought.visible)data.thought.position.y=(key==='kid'?2.9:3.06)+Math.sin(elapsed*2.2+key.length)*.07;
    }
    // The dog has its own movement and activity indicator.
    var dogTarget=new THREE.Vector3(-5.25,0,3.55);
    if(walk.pet&&Number.isFinite(walk.pet.x)&&Number.isFinite(walk.pet.z))
      dogTarget.set(walk.pet.x,0,walk.pet.z);
    if(state.simPetActivity==='dogplay')dogTarget.set(-3.85,0,3.25);
    if(furnishTargets.pet){
      var petObject=furnitureList.find(function(o){return o.uid===furnishTargets.pet});
      if(petObject){var p=furnitureUsePosition(petObject);if(p)dogTarget.copy(p)}
    }
    if(!petDestination||petDestination.distanceToSquared(dogTarget)>.1){
      petDestination=dogTarget.clone();petNav=routeTo(dogRoot.position,dogTarget)
    }
    while(petNav.length&&dogRoot.position.distanceToSquared(petNav[0])<.06)petNav.shift();
    var nextPet=petNav[0]||dogTarget;
    var px=nextPet.x-dogRoot.position.x,pz=nextPet.z-dogRoot.position.z,pdist=Math.hypot(px,pz);
    if(pdist>.07&&!state.paused){
      var petStep=Math.min(pdist,dt*2.0);
      dogRoot.position.x+=px/pdist*petStep;dogRoot.position.z+=pz/pdist*petStep;
      dogRoot.rotation.y=Math.atan2(px,pz);
    }
    petThought.visible=!!state.simPetActivity;
    if(petThought.visible){
      setThought(petThought,state.simPetActivity);
      petThought.position.y=1.28+Math.sin(elapsed*2.1)*.06
    }
    tailRoot.rotation.y=Math.sin(elapsed*(state.simPetActivity?9:5))* (state.simPetActivity?.61:.35);
  }
  function refresh(state){
    for(var id in upgrades)upgrades[id].visible=(state.owned||[]).includes(id);
    for(var name in roomSpaces)roomSpaces[name].visible=(state.owned||[]).includes(name);
    syncFurniture(state.furniture);
    applyHomeDesign(state.homeDesign);
    ['self','partner'].forEach(function(key){
      var model=actors[key],kind=key==='self'?state.avatarSelf:state.avatarPartner;
      if(model&&model.sideHair)model.sideHair.forEach(function(o){o.visible=kind==='f'});
    });
    var hour=((state.time||0)%1440)/60;
    var night=hour<6||hour>=21,evening=hour>=18.5&&hour<21;
    sun.intensity=night?.92:evening?2.05:3.4;
    fill.intensity=night?1.26:evening?1.05:.82;
    hemi.intensity=night?1.05:evening?1.55:2.0;
    scene.background.set(night?'#788397':evening?'#e0d2ba':'#dfe5d7');
  }
  var living=true;
  function animate(){
    if(!living)return;
    requestAnimationFrame(animate);
    if(document.hidden||!host.classList.contains('is-ready')||document.getElementById('game')?.classList.contains('town-active')){clock.getDelta();return}
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
    updateSimMarker(oldSnapshot||{},elapsed);
    syncWorkingDetails(oldSnapshot||{},elapsed);
    if(selectionRing.visible){selectionRing.children[0].rotation.z=elapsed*.12;attention.material.opacity=.10+.07*Math.sin(elapsed*3)}
    if(host.classList.contains('is-ready'))renderer.render(scene,camera);
  }
  window.Evin3D={
    focus:focus,focusRoom:focusRoom,focusDesign:focusDesign,reset:resetCamera,zoom:adjustZoom,select:setTarget,applyDesign:applyHomeDesign,
    beginFurniturePlacement:beginFurniturePlacement,cancelFurniturePlacement:cancelFurniturePlacement,
    getFurniturePlacement:getFurniturePlacement,nudgeFurniture:moveFurnitureBy,rotateFurniture:rotateFurniture,
    focusFurniture:focusFurniture,syncFurnitureNow:function(){syncFurniture(snapshot().furniture)},isReady:true,
    destroy:function(){living=false;ro.disconnect();renderer.dispose();host.replaceChildren()}
  };
  host.dataset.status='ready';
  host.classList.add('is-ready');
  document.getElementById('game')?.classList.add('scene-3d-ready');
  try{localStorage.removeItem('evin-patronu:scene-mode')}catch(e){}
  animate();
})().catch(function(err){
  console.error('House Boss 3D world failed',err);
  var host=document.getElementById('kitchen3d');if(!host)return;
  host.classList.remove('is-ready');host.dataset.status='unavailable';
  host.replaceChildren();
  var panel=document.createElement('section');panel.className='hb-3d-error';panel.setAttribute('role','alert');
  var h=document.createElement('h2');h.textContent='3D World Unavailable';
  var p=document.createElement('p');p.textContent='Please enable WebGL / hardware acceleration and reload the game.';
  var retry=document.createElement('button');retry.textContent='RELOAD 3D WORLD';retry.onclick=function(){location.reload()};
  panel.append(h,p,retry);host.appendChild(panel);
});
