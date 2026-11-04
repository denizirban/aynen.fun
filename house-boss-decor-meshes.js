/* House Boss EDITIONS / original, deliberately shaped 3D objects. */
const texCache=new Map();
export function createDecorMesh(type,g,api){
 const {THREE,box,ball,cylinder,torus,capsule,addMesh}=api;
 const data=globalThis.HouseBossFurnitureTypes?.[type];
 if(!data||data.collection!=='EDITIONS')return false;
 const mat=(hex,rough=.79,metal=0)=>new THREE.MeshStandardMaterial({color:hex,roughness:rough,metalness:metal});
 const color=mat(data.color);color.userData.houseBossEdition=true;
 const ivory=mat('#f5ecdc'),dark=mat('#414547',.69,.08),pink=mat('#ed9caf'),
 gold=mat('#c9ac79',.36,.70),wood=mat('#ad8163',.65),glass=mat('#94ced0',.22,.36),
 cream=mat('#e9ddcd'),shadow=mat('#7d7b73'),leaf=mat('#638e71'),orange=mat('#e9a565');
 const ell=(x,y,z,rx,ry,rz,m=color)=>ball(g,rx,ry,rz,m,x,y,z);
 const tube=(a,b,r,m=color)=>capsule(g,a,b,r,m);
 const circ=(x,y,z,r,thickness,m=color)=>torus(g,r,thickness,m,x,y,z);
 function base(radius=.36,material=gold){cylinder(g,radius*.95,radius,.065,material,0,.05,0)}
 function onStand(height=1.2,m=dark){cylinder(g,.22,.28,.07,m,0,.06,0);tube([0,.08,0],[0,height,0],.034,m)}
 function flower(y,petals=7,scale=1,petal=color){
  ell(0,y,0,.12*scale,.12*scale,.10*scale,orange);
  for(let i=0;i<petals;i++){
   const a=i*2*Math.PI/petals;
   const p=ell(Math.cos(a)*.24*scale,y+Math.sin(a)*.23*scale,0,.13*scale,.28*scale,.06*scale,petal);
   p.rotation.z=-a;
  }
 }
 function artPanel(x,w,h,number){
  box(g,w+.10,h+.10,.07,wood,x,1.20,-.06);
  box(g,w,h,.012,ivory,x,1.20,-.015);
  const palettes=['#e9a474','#7ea6b0','#e3c479','#c29ab1','#92ae94'];
  const a=mat(palettes[number%palettes.length]),b=mat(palettes[(number+2)%palettes.length]);
  ell(x-w*.17,1.17+h*.12,0,w*.24,h*.25,.015,a);
  const stripe=box(g,w*.36,h*.11,.019,b,x+w*.16,1.05,0);stripe.rotation.z=.45;
 }

 function rugPattern(kind){
  if(texCache.has(kind))return texCache.get(kind);
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=272;
  const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
  const fill=v=>{ctx.fillStyle=v;ctx.fillRect(0,0,W,H)};
  const ellipse=(x,y,rx,ry,shade,stroke=null)=>{
   ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);
   if(shade){ctx.fillStyle=shade;ctx.fill()}
   if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}
  };
  if(kind==='checker'||kind==='lilac'){
   fill(kind==='lilac'?'#eee4f0':'#f6e4dc');
   for(let x=0;x<8;x++)for(let y=0;y<6;y++)if((x+y)%2===0){
    ctx.fillStyle=kind==='lilac'?'#b7a4da':'#df98aa';
    ctx.fillRect(x*48,y*(H/6),48,H/6)
   }
  }else if(kind==='grid'){
   fill('#f1e7da');ctx.strokeStyle='#d4ada9';ctx.lineWidth=4;
   for(let x=20;x<W;x+=49){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+9,H);ctx.stroke()}
   for(let y=19;y<H;y+=49){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y+6);ctx.stroke()}
  }else if(kind==='jute'){
   fill('#d3b893');
   for(let y=0;y<H;y+=4){ctx.fillStyle=(y%12===0?'#bd9a75':'#e3cbab');ctx.fillRect(0,y,W,1)}
   for(let x=0;x<W;x+=18){ctx.strokeStyle='#aa8764';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
   for(let y=0;y<H;y+=70){ctx.strokeStyle='#f9e4c5';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
  }else if(kind==='loops'){
   fill('#f6e8dc');
   for(let i=0;i<7;i++){
    ctx.beginPath();ctx.lineWidth=17;ctx.strokeStyle=i%2?'#d88d84':'#f0b9a6';
    for(let x=-30;x<W+25;x+=4){
     const y=30+i*36+Math.sin((x/45)+i*1.1)*16;
     if(x===-30)ctx.moveTo(x,y);else ctx.lineTo(x,y)
    }
    ctx.stroke()
   }
  }else if(kind==='daisy'){
   fill('#ebafbc');
   for(let y=32;y<H;y+=68)for(let x=35;x<W;x+=80){
    for(let n=0;n<6;n++){const a=n*Math.PI/3;ellipse(x+Math.cos(a)*13,y+Math.sin(a)*13,10,7,'#fff1e5')}
    ellipse(x,y,7,7,'#e7bc62')
   }
  }else if(kind==='sunburst'){
   fill('#f6e6d0');
   const x=W*.47,y=H*.50;
   for(let i=0;i<30;i++){
    const a=i*2*Math.PI/30;
    ctx.beginPath();ctx.moveTo(x,y);
    ctx.lineTo(x+Math.cos(a-.045)*W,y+Math.sin(a-.045)*W);
    ctx.lineTo(x+Math.cos(a+.045)*W,y+Math.sin(a+.045)*W);
    ctx.closePath();ctx.fillStyle=i%2?'#e5ac65':'#efc38c';ctx.fill()
   }
   ellipse(x,y,55,55,'#f5d9a6')
  }else{
   fill('#e9e5d1');
   for(let j=0;j<7;j++){
    ctx.beginPath();ctx.lineWidth=10+3*j;
    ctx.strokeStyle=['#7b9c79','#c7b692','#d49b84','#89ad9a'][j%4];
    for(let x=-25;x<W+20;x+=3){
     const y=j*42+15+Math.sin(x*.024+j*.52)*24;
     if(x===-25)ctx.moveTo(x,y);else ctx.lineTo(x,y)
    }
    ctx.stroke()
   }
  }
  // Subtle material grain makes a patterned rug feel woven, not printed.
  for(let i=0;i<700;i++){
   let x=(i*73.17)%W,y=(i*109.31)%H;
   ctx.fillStyle=i%2?'#ffffff1e':'#382b2710';ctx.fillRect(x,y,2,2)
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texCache.set(kind,texture);return texture
 }

 if(type==='ceramicvase'||type==='spherevase'){
  const m=type==='spherevase'?glass:color;
  ell(0,.24,0,.16,.20,.15,m);cylinder(g,.082,.09,.18,m,0,.47,0);circ(0,.57,0,.073,.018,m);
  if(type==='spherevase'){ell(-.10,.16,.03,.12,.12,.12,m);ell(.10,.26,-.02,.10,.15,.12,m)}
  for(let i=0;i<3;i++){const x=(i-1)*.065;tube([x,.54,0],[x*2,.91+(i%2)*.13,.03],.009,leaf);ell(x*2,.93+(i%2)*.13,.03,.055,.067,.026,i===1?pink:orange)}
 }else if(type==='lemonbowl'){
  ell(0,.15,0,.19,.07,.18,color);circ(0,.18,0,.18,.02,color);
  for(const [x,z] of [[-.08,0],[.05,-.07],[.07,.06]])ell(x,.24,z,.075,.052,.044,mat('#f5d467'))
 }else if(type==='knotpillow'){
  ell(0,.12,0,.19,.12,.19,color);
  for(let i=0;i<3;i++){const r=circ(0,.16+i*.055,0,.16,.06,color);r.rotation.x=Math.PI*(i/3+.2);r.rotation.y=i*.78}
 }else if(type==='petalstool'||type==='spoolstool'){
  if(type==='spoolstool'){
   cylinder(g,.24,.23,.38,color,0,.32,0);
   cylinder(g,.38,.30,.12,color,0,.53,0);
   cylinder(g,.32,.38,.13,color,0,.10,0)
  }else{
   cylinder(g,.095,.18,.39,wood,0,.25,0);
   for(let i=0;i<6;i++){let a=i*Math.PI/3;ell(Math.cos(a)*.21,.57,Math.sin(a)*.21,.21,.09,.19,color)}
   ell(0,.58,0,.17,.10,.17,orange)
  }
 }else if(type==='terracottatotem'){
  base(.26,ivory);
  cylinder(g,.12,.19,.30,color,0,.27,0);
  ell(0,.54,0,.20,.16,.20,color);
  const ring=circ(0,.76,0,.23,.067,color);ring.rotation.x=.35;
  ell(0,.93,0,.11,.23,.11,color)
 }else if(type==='bouclepouf'||type==='checkerottoman'||type==='cloudstool'){
  ell(0,.24,0,data.w*.47,.23,data.d*.47,color);
  ell(0,.43,0,data.w*.45,.15,data.d*.42,color);
  if(type==='cloudstool')for(let i=0;i<8;i++){const a=i*Math.PI/4;ell(Math.cos(a)*.31,.37,Math.sin(a)*.28,.20,.17,.23,color)}
  if(type==='checkerottoman')for(let x=0;x<4;x++)for(let z=0;z<4;z++)if((x+z)%2===0){
   box(g,.21,.009,.19,ivory,(x-1.5)*.22,.564,(z-1.5)*.19)
  }
 }else if(type==='cactusplanter'){
  cylinder(g,.25,.20,.36,color,0,.20,0);
  cylinder(g,.25,.25,.055,ivory,0,.40,0);
  const green=mat('#6c9981');
  ell(0,.82,0,.16,.42,.16,green);
  ell(-.18,.64,0,.083,.20,.10,green);tube([-.18,.64,0],[-.18,.84,0],.06,green);
  ell(.16,.69,0,.08,.18,.08,green);tube([.16,.67,0],[.16,.89,0],.05,green);
  ell(0,1.25,0,.075,.065,.08,pink)
 }else if(type==='mushroomlamp'){
  base(.25,color);
  cylinder(g,.13,.21,.56,cream,0,.43,0);
  ell(0,.88,0,.40,.22,.38,color);
  ell(0,.84,0,.31,.08,.30,mat('#fff3dc',.37))
 }else if(data.category==='rugs'){
  const pattern=data.pattern||(type==='candychecker'?'checker':'wave');
  const m=new THREE.MeshStandardMaterial({map:rugPattern(pattern),roughness:.98,side:THREE.DoubleSide});
  m.userData.houseBossEdition=true;
  const carpet=addMesh(g,new THREE.PlaneGeometry(data.w,data.d),m,0,.038,0,false,true);
  carpet.rotation.x=-Math.PI/2;carpet.castShadow=false;
  box(g,data.w,.018,data.d,mat(data.color),0,.018,0).castShadow=false;
  if(pattern==='jute')for(let i=-11;i<=11;i++){
   const x=i*data.w/23;
   for(const z of [-data.d*.53,data.d*.53])
    tube([x,.036,z],[x,.035,z+(z>0?.13:-.13)],.008,mat('#dfccac'))
  }
 }else if(type==='galleryprint'||type==='galleryframe'){
  const panels=type==='galleryframe'?3:1;
  for(let i=0;i<panels;i++){const x=panels===3?(i-1)*.45:0;artPanel(x,panels===3?.37:.72,1.20,i+2)}
  tube([-.35,.04,.16],[-.29,1.85,-.19],.032,dark);
  tube([.35,.04,.16],[.29,1.85,-.19],.032,dark);
  tube([0,.04,-.25],[0,1.5,-.18],.026,dark);
  box(g,.76,.055,.19,wood,0,.55,-.06)
 }else if(type==='bobbinlamp'){
  base(.23,color);
  for(let i=0;i<5;i++)ell(0,.25+i*.23,0,.18+(i%2)*.055,.17,.18+(i%2)*.055,color);
  cylinder(g,.28,.43,.32,ivory,0,1.46,0);
  cylinder(g,.18,.18,.025,mat('#ffe7bc',.38),0,1.27,0)
 }else if(type==='squigglemirror'){
  for(let j=0;j<14;j++){let t=j*2*Math.PI/14;ell(Math.sin(t)*.34,.98+Math.cos(t)*.80,0,.12,.16,.12,color)}
  ell(0,.98,-.03,.33,.77,.025,mat('#b7c7d5',.13,.82));
  tube([-.31,.07,-.1],[-.26,1.20,-.10],.035,dark);
  tube([.31,.07,-.1],[.26,1.20,-.10],.035,dark)
 }else if(type==='pebblecoffee'||type==='travertinetable'||type==='chrometable'){
  const m=type==='chrometable'?mat('#c7ccd4',.21,.86):color;
  if(type==='travertinetable'){
   for(const x of [-.30,.30])cylinder(g,.21,.26,.56,m,x,.32,0);
   ell(0,.69,0,.59,.085,.42,m);
  }else if(type==='chrometable'){
   for(const x of [-.29,.27])ell(x,.36,0,.25,.35,.26,m);
   ell(0,.72,0,.63,.095,.43,m);
  }else{
   for(const x of [-.30,.30])cylinder(g,.10,.10,.45,wood,x,.28,0);
   ell(0,.55,0,.62,.085,.40,m);
   ell(.19,.58,-.03,.39,.07,.36,m)
  }
 }else if(type==='scallopshelf'||type==='wavebookcase'){
  const tall=type==='wavebookcase',h=tall?2.30:1.65,w=data.w;
  box(g,w,h,.44,color,0,h/2,0);
  box(g,w-.16,h-.16,.39,ivory,0,h/2,.04);
  for(let i=0;i<(tall?5:4);i++){
   const y=.28+i*.43;
   box(g,w-.03,.07,.47,color,0,y,0);
   for(let j=0;j<3;j++){
    let x=-w*.35+j*w*.35;
    ell(x,y+.15,.06,.12,.15,.12,[cream,orange,leaf][(i+j)%3])
   }
  }
  for(const x of [-w*.48,w*.48])for(let i=0;i<5;i++)ell(x,.28+i*(h-.42)/4,0,.07,.12,.12,color)
 }else if(type==='roombloom'||type==='giantflower'){
  base(.21,dark);
  tube([0,.08,0],[0,type==='giantflower'?1.45:1.12,0],.065,leaf);
  const y=type==='giantflower'?1.65:1.30;
  flower(y,type==='giantflower'?9:7,type==='giantflower'?1.45:1.06,color);
  for(let i=0;i<2;i++){const lf=ell((i?-.23:.20),.62+i*.16,0,.26,.10,.10,leaf);lf.rotation.z=i?-.5:.6}
 }else if(type==='ribbonchair'||type==='collectiblechair'||type==='tulipchair'||type==='haloarmchair'){
  const rx=data.w*.48,rz=data.d*.43;
  cylinder(g,.22,.31,.29,dark,0,.19,0);
  ell(0,.60,.04,rx,.20,rz,color);
  if(type==='ribbonchair'){
   const ring=circ(0,.98,-.25,.46,.155,color);ring.rotation.x=.25;ring.scale.x=1.13;
   ell(0,.84,-.27,.45,.33,.13,color)
  }else if(type==='tulipchair'){
   for(let i=-2;i<=2;i++){
    const a=i*.46;
    const petal=ell(Math.sin(a)*.35,1.02+Math.cos(a)*.09,-.35,.22,.42,.15,color);petal.rotation.z=-a*.5
   }
  }else if(type==='haloarmchair'){
   const ring=circ(0,1.12,-.31,.54,.20,color);ring.rotation.x=.12;
   ell(0,1.11,-.37,.46,.47,.18,color);
   for(const x of [-.43,.43])ell(x,.70,.04,.19,.26,.36,color)
  }else{
   const ring=circ(0,1.0,-.22,.46,.18,color);ring.rotation.x=.34;ring.scale.x=1.22;
   for(const x of [-.45,.45])tube([x,.41,.16],[x,1.0,-.26],.15,color);
   ell(0,.94,-.33,.45,.30,.16,color)
  }
  ell(0,.74,.18,rx*.82,.10,rz*.67,ivory)
 }else if(type==='sunsetlamp'){
  base(.25,dark);tube([0,.08,0],[0,1.38,0],.035,gold);
  const glow=mat('#efad61',.42);
  const disk=ell(0,1.48,0,.38,.38,.08,glow);
  circ(0,1.48,0,.37,.024,gold).rotation.x=Math.PI/2;
 }else if(type==='glassgarden'){
  cylinder(g,.29,.33,.06,wood,0,.08,0);
  const m=mat('#a2c5b4',.22,.14);m.transparent=true;m.opacity=.42;m.depthWrite=false;
  ell(0,.49,0,.33,.46,.29,m);
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;
   const stalk=ell(Math.cos(a)*.16,.30,Math.sin(a)*.13,.08,.22,.06,leaf);stalk.rotation.z=a
  }
  ell(0,.38,0,.10,.24,.09,mat('#7baf7d'))
 }else if(type==='croissantsofa'||type==='limitedsofa'){
  const n=type==='limitedsofa'?6:5,w=data.w;
  for(let i=0;i<n;i++){
   const x=-w*.38+i*(w*.76/(n-1)),curve=Math.abs((i-(n-1)/2)/((n-1)/2));
   ell(x,.44,.08+curve*.13,w/n*.72,.35,.54,color);
   ell(x,.89,-.40+curve*.11,w/n*.72,.49,.28,color)
  }
  for(const x of [-w*.46,w*.46])ell(x,.62,.06,.20,.44,.53,color);
  for(let i=0;i<n;i++){let x=-w*.38+i*(w*.76/(n-1));ell(x,.73,.25,.17,.08,.28,ivory)}
  for(const x of [-w*.38,w*.38])box(g,.15,.10,.14,wood,x,.07,0)
 }else if(type==='galleryplinth'){
  box(g,.56,1.10,.56,ivory,0,.56,0);
  box(g,.62,.08,.62,cream,0,1.14,0);
  const ring=circ(0,1.53,0,.26,.095,color);ring.rotation.y=.66;
  ell(-.15,1.45,.02,.20,.09,.16,color);
 }else if(type==='orbitlamp'){
  base(.28,dark);tube([0,.06,0],[0,1.25,0],.03,gold);
  ell(0,1.45,0,.22,.22,.22,mat('#fff1d6',.23));
  for(let i=0;i<3;i++){const ring=circ(0,1.45,0,.41,.023,gold);ring.rotation.x=.25+i*.6;ring.rotation.y=i*.9}
 }else if(type==='mirrorball'){
  cylinder(g,.24,.31,.75,dark,0,.42,0);
  ell(0,1.05,0,.34,.34,.34,mat('#d9dee1',.18,.92));
  const silver=mat('#f3f6f8',.18,.95);
  for(let a=0;a<8;a++)for(let j=0;j<4;j++){
    const th=a*Math.PI/4,phi=.35+j*.79;
    const x=Math.sin(phi)*Math.cos(th)*.342,y=1.05+Math.cos(phi)*.342,z=Math.sin(phi)*Math.sin(th)*.342;
    const face=box(g,.105,.10,.018,silver,x,y,z);
    face.rotation.y=-th;face.rotation.x=phi-Math.PI/2
  }
 }else if(type==='formscreens'){
  for(let i=-1;i<=1;i++){
   const x=i*.53;
   box(g,.50,1.45,.13,color,x,.78,0);
   const arch=ell(x,1.53,0,.25,.26,.07,color);
   ell(x,1.39,.08,.145,.32,.008,ivory)
  }
  for(let x of [-.68,.68])box(g,.06,.17,.40,dark,x,.08,0)
 }else{
  return false
 }
 // Light grounding and carefully bounded shadows preserve pick/placement interactions.
 g.userData.decorCategory=data.category;
 return true
}
