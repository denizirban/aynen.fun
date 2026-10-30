/* BIO ROBOT / aynen.fun — playable abstract biohybrid-inspired physics game.
   Mechanic cells and values are fictional, not a validated biological model. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d',{alpha:false});
const PI=Math.PI,TWO=PI*2,MAX=24,KEY='aynen_biorobot_neon_v2',BEST='aynen_biorobot_best_v2';
const COLORS={core:{a:'#baff77',b:'#67bd56',c:'#d8ffad',label:'YAPI HÜCRESİ',info:'Gövdenin iskeleti. Daha çok kütle, daha fazla direnç.'},muscle:{a:'#ff51ac',b:'#a82173',c:'#ffc1df',label:'KAS HÜCRESİ',info:'İtki üretir. Konumuna göre yön ve dönüş değişir.'},sensor:{a:'#9ff7e5',b:'#379f9d',c:'#dcfff6',label:'DUYU HÜCRESİ',info:'Hedefi ve engelleri algılar, yön düzeltir.'},energy:{a:'#eafc86',b:'#b1aa51',c:'#fff9b8',label:'ENERJİ HÜCRESİ',info:'Hareket için daha fazla enerji rezervi sağlar.'}};
const MISSIONS=[
 {name:'İLK HAREKET',description:'Robotunu canlandır. Karşıdaki parlak çekirdeğe ulaş.',short:'Hedefe doğru ilerle.',limit:24,target:[.82,.62],start:[.18,.62],blocks:[],check:[]},
 {name:'ENGELDEN KAÇ',description:'Yolu kapatan kristallere takılmadan çekirdeğe ulaş.',short:'Kristallerin arasından geç.',limit:29,target:[.83,.60],start:[.17,.60],blocks:[[.49,.60,.074],[.67,.40,.055]],check:[]},
 {name:'IŞIĞI BUL',description:'Işık yukarıda. Duyu hücrelerin yönü değiştirebilir.',short:'Işığı bul ve ona ulaş.',limit:30,target:[.80,.34],start:[.17,.68],blocks:[[.45,.62,.071],[.63,.48,.060]],check:[]},
 {name:'YAŞAYAN KÖPRÜ',description:'Önce iki ışıklı duraktan geç, sonra ana çekirdeğe ulaş.',short:'İki durağı ve son hedefi bul.',limit:37,target:[.83,.38],start:[.18,.70],blocks:[[.46,.47,.067],[.65,.66,.063]],check:[[.38,.71],[.64,.40]]}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),hypot=Math.hypot;
const rand=(seed)=>{let x=Math.sin(seed*127.1+seed*seed*.017)*43758.5453;return x-Math.floor(x)};
let cells=starter(),undoStack=[],savedCells=null,version=1,completed=[],best=[],level=0,selected='muscle',mirror=false;
let mode='build',paused=false,model=null,results=null,drawerType='',audio=false,ambient=true,precision=true;
let W=1200,H=720,dpr=1,unit=52,baseX=600,baseY=405,hover=null,pointerId=-1,painted='',last=0,t=0,toastTimer=null;
let stars=Array.from({length:180},(_,i)=>({x:rand(i+31),y:rand(i*2+147),r:.4+rand(i*3+77)*1.1,t:rand(i*5+199)*TWO}));
const cellKey=(c)=>c.x+','+c.y,find=(x,y)=>cells.find(c=>c.x===x&&c.y===y),copy=(a)=>a.map(c=>({x:c.x,y:c.y,type:c.type}));
function starter(){return[{x:0,y:0,type:'core'},{x:-1,y:-1,type:'muscle'},{x:-1,y:1,type:'muscle'},{x:0,y:1,type:'energy'},{x:1,y:0,type:'sensor'}]}
function counts(){const o={core:0,muscle:0,sensor:0,energy:0};cells.forEach(c=>o[c.type]++);return o}
function cohesive(a){
 if(!a.some(c=>c.x===0&&c.y===0))return false;
 const q=[a.find(c=>c.x===0&&c.y===0)],seen=new Set(['0,0']);
 for(let n=0;n<q.length;n++)a.forEach(c=>{if(!seen.has(cellKey(c))&&Math.max(Math.abs(q[n].x-c.x),Math.abs(q[n].y-c.y))===1){seen.add(cellKey(c));q.push(c)}});
 return seen.size===a.length;
}
function validArray(a){
 return Array.isArray(a)&&a.length>0&&a.length<=MAX&&a.every(c=>c&&Number.isInteger(c.x)&&Number.isInteger(c.y)&&Math.abs(c.x)<=4&&Math.abs(c.y)<=3&&COLORS[c.type])&&new Set(a.map(cellKey)).size===a.length&&a.some(c=>c.x===0&&c.y===0&&c.type==='core')&&cohesive(a);
}
function load(){
 try{const d=JSON.parse(localStorage.getItem(KEY)||'null');if(d&&validArray(d.cells)){cells=copy(d.cells);savedCells=copy(d.cells);version=clamp(Number(d.version)||1,1,999)}const b=JSON.parse(localStorage.getItem(BEST)||'null');if(b&&Array.isArray(b.completed)){completed=b.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<=3);best=Array.isArray(b.best)?b.best:[]}}catch(e){}
}
function save(){try{savedCells=copy(cells);localStorage.setItem(KEY,JSON.stringify({cells:savedCells,version}));notice('TASARIM KAYDEDİLDİ — V'+version);sound('save')}catch(e){notice('KAYIT İZNİ YOK')}}
function loadSaved(){if(!savedCells){notice('HENÜZ KAYIT YOK');return}history();cells=copy(savedCells);enterBuild();update();notice('SON KAYIT YÜKLENDİ')}
function history(){undoStack.push(copy(cells));if(undoStack.length>40)undoStack.shift()}
function undo(){if(mode!=='build')enterBuild();if(undoStack.length){cells=undoStack.pop();update();sound('tap')}else notice('GERİ ALINACAK DEĞİŞİKLİK YOK')}
function notice(txt){const n=$('toast');n.textContent=txt;n.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.remove('show'),2100)}
function sound(type){
 if(!audio)return;
 try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;if(!sound.ctx)sound.ctx=new AC();const ac=sound.ctx;if(ac.state==='suspended')ac.resume();const o=ac.createOscillator(),g=ac.createGain(),when=ac.currentTime;o.type='sine';o.frequency.setValueAtTime(type==='win'?520:type==='error'?140:270,when);o.frequency.exponentialRampToValueAtTime(type==='win'?780:type==='error'?110:390,when+.12);g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(.045,when+.018);g.gain.exponentialRampToValueAtTime(.0001,when+.19);o.connect(g).connect(ac.destination);o.start(when);o.stop(when+.2)}catch(e){}
}
function getStats(){
 const n=cells.length,q=counts(),mx=cells.reduce((s,c)=>s+c.x,0)/n,my=cells.reduce((s,c)=>s+c.y,0)/n;
 let torque=cells.filter(c=>c.type==='muscle').reduce((s,c)=>s+(c.y-my),0);
 let inertia=cells.reduce((s,c)=>s+Math.pow(c.x-mx,2)+Math.pow(c.y-my,2),1)/n;
 const balance=Math.round(clamp(100-Math.abs(torque)*21-Math.max(0,inertia-4)*5,8,100));
 const thrust=Math.round(clamp(q.muscle*28/(1+n*.043),0,100));
 const capacity=88+q.energy*46,consumption=1.65+q.muscle*.99+q.sensor*.23+n*.22;
 return {n,q,mx,my,torque,inertia,balance,thrust,capacity,consumption};
}
function update(){
 const s=getStats();let en=model?Math.round(100*model.energy/model.energyMax):100;
 $('statEnergy').textContent=en+' / 100';$('statBalance').textContent=s.balance+' / 100';$('statThrust').textContent=s.thrust+' / 100';
 $('barEnergy').style.width=en+'%';$('barBalance').style.width=s.balance+'%';$('barThrust').style.width=s.thrust+'%';
 $('cellCounter').textContent=String(cells.length).padStart(2,'0')+' / '+MAX;
 $('selectedName').textContent=selected==='erase'?'SİLME ARACI':COLORS[selected].label;
 $('selectedDesc').textContent=selected==='erase'?'Bir hücreye dokunarak çıkar.':' '+COLORS[selected].info;
 document.querySelectorAll('[data-cell]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.cell===selected)));
 $('eraseBtn').setAttribute('aria-pressed',String(selected==='erase'));
 $('mirrorBtn').setAttribute('aria-pressed',String(mirror));
 const art=$('selectedArt'),source=document.querySelector('[data-cell="'+(selected==='erase'?'core':selected)+'"] svg');
 if(source)art.innerHTML=source.outerHTML;
 const m=MISSIONS[level];$('missionId').textContent='GÖREV '+String(level+1).padStart(2,'0');$('missionName').textContent=m.name;$('missionHint').textContent=m.description;
 $('missionPercent').textContent=(model?Math.round(model.progress*100):0)+'%';
 $('missionProgress').style.width=(model?Math.round(model.progress*100):0)+'%';
 $('missionStatus').textContent=mode==='build'?'HAZIR / TASARIM':mode==='running'?(paused?'DURAKLATILDI':'CANLI SİMÜLASYON'):'DENEY SONUCU';
 $('clock').textContent=model?timeFormat(model.time):'00:00';
 $('modeLabel').textContent=mode==='build'?'BUILD MODE / TAP TO PLACE':mode==='running'?(paused?'PAUSED / RESUME':'TEST MODE / LIVE'):'RESULT / EDIT TO IMPROVE';
 $('stageCaption').textContent=mode==='build'?'BİR HÜCRE SEÇ • YEŞİL YUVALARA DOKUN • CANLANDIR':mode==='running'?(paused?'DENEY DURAKLATILDI':'İTİŞ · DÖNÜŞ · SÜRTÜNME · ENERJİ'):'SONUÇLAR HAZIR';
 $('runLabel').textContent=mode==='build'?'CANLANDIR':mode==='running'?(paused?'DEVAM ET':'DURAKLAT'):'YENİDEN DENE';
 $('runSubtitle').textContent=mode==='build'?'SİMÜLASYONU BAŞLAT':mode==='running'?(paused?'SİMÜLASYONA DÖN':'SİMÜLASYONU DURDUR'):'AYNI GÖVDE';
 $('runGlyph').innerHTML='<use href="#'+(mode==='running'&&!paused?'i-pause':'i-play')+'"/>';
 $('runBtn').disabled=mode==='build'&&!s.q.muscle;
 if(drawerType==='analysis')renderDrawer();
}
function timeFormat(v){const n=Math.floor(v);return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
function selectCell(type){if(mode==='running'){notice('DENEYİ DURAKLATIP DÜZENLE');return}if(mode==='result')enterBuild();selected=type;update();sound('tap')}
function canPlace(x,y){return Math.abs(x)<=4&&Math.abs(y)<=3&&!find(x,y)&&cells.some(c=>Math.max(Math.abs(c.x-x),Math.abs(c.y-y))===1)}
function mutate(x,y,quiet=false){
 if(mode!=='build'||!Number.isInteger(x)||!Number.isInteger(y)||Math.abs(x)>4||Math.abs(y)>3)return false;
 const old=find(x,y);
 if(selected==='erase'){
  if(!old||x===0&&y===0){if(!quiet)notice('MERKEZ SİLİNEMEZ');return false}
  const next=cells.filter(c=>c!==old);if(!cohesive(next)){if(!quiet)notice('GÖVDEYİ KOPARAMAZSIN');return false}
  history();cells=next;return true;
 }
 if(old){if(x===0&&y===0||old.type===selected)return false;history();old.type=selected;return true}
 if(!canPlace(x,y)){if(!quiet)notice('BİTİŞİK BİR YUVA SEÇ');return false}
 if(cells.length>=MAX){if(!quiet)notice('24 HÜCRE SINIRINA ULAŞTIN');return false}
 history();cells.push({x,y,type:selected});return true;
}
function edit(x,y){
 let did=mutate(x,y,false);
 if(mirror&&y!==0) did=mutate(x,-y,true)||did;
 if(did){update();sound('tap')}
}
function makePreset(){
 if(mode==='running')return;
 history();let n=counts().muscle;
 if(n<=1)cells=starter();
 else if(counts().sensor<2)cells=[{x:0,y:0,type:'core'},{x:-1,y:-1,type:'muscle'},{x:-1,y:1,type:'muscle'},{x:-2,y:0,type:'energy'},{x:1,y:-1,type:'sensor'},{x:1,y:1,type:'sensor'},{x:0,y:-1,type:'core'}];
 else cells=[{x:0,y:0,type:'core'},{x:-1,y:-1,type:'muscle'},{x:-1,y:1,type:'muscle'},{x:1,y:0,type:'sensor'},{x:0,y:1,type:'energy'}];
 enterBuild();update();notice('YENİ BİYO-TASARIM YÜKLENDİ');
}
function enterBuild(){mode='build';paused=false;model=null;results=null;$('resultScrim').classList.remove('open');update()}
function setLevel(n){if(n<0||n>=MISSIONS.length)return;level=n;closeDrawer();enterBuild();update();notice('GÖREV '+String(n+1).padStart(2,'0')+' / '+MISSIONS[n].name)}
function stepButton(){if(mode==='build'||mode==='result'){run();return}paused=!paused;update();sound('tap')}
function startModel(){
 const s=getStats(),mission=MISSIONS[level];
 if(!s.q.muscle){notice('ÖNCE KAS HÜCRESİ EKLE');sound('error');return}
 model={x:mission.start[0],y:mission.start[1],vx:0,vy:0,angle:0,omega:0,time:0,energy:s.capacity,energyMax:s.capacity,s,trail:[],progress:0,checkIndex:0,collisions:0,lastHit:-5,active:true,goodTime:0};
 mode='running';paused=false;$('resultScrim').classList.remove('open');closeDrawer();update();sound('save');
}
function run(){startModel()}
function currentTarget(){
 const m=MISSIONS[level];return model&&model.checkIndex<m.check.length?m.check[model.checkIndex]:m.target;
}
function pixelD(ax,ay,bx,by){return Math.hypot((ax-bx)*W,(ay-by)*H)}
function finish(success,reason){
 if(!model)return;
 mode='result';paused=false;const s=model;
 let progress=success?1:s.progress;
 results={success,reason,progress,energy:Math.max(0,Math.round(s.energy/s.energyMax*100)),time:s.time,collisions:s.collisions};
 if(success){if(!completed.includes(level))completed.push(level);let curr=best[level];if(!curr||s.time<curr.time)best[level]={time:s.time,energy:results.energy};try{localStorage.setItem(BEST,JSON.stringify({completed,best}))}catch(e){}sound('win')}else sound('error');
 $('resultKicker').textContent=success?'DENEY BAŞARILI / GÖREV '+(level+1):'DENEY SONA ERDİ / GÖREV '+(level+1);
 $('resultTitle').textContent=success?'HEDEF BULUNDU.':reason==='energy'?'ENERJİ BİTTİ.':reason==='timeout'?'SÜRE DOLDU.':'DENEY DURDU.';
 let msg='';
 if(success)msg='Tasarımın çekirdeğe ulaştı. Daha az hücre veya daha az enerjiyle aynı yolu deneyebilirsin.';
 else if(reason==='energy')msg='Gövden yolculuğu bitirmeden enerjisini tüketti. Bir enerji hücresi eklemeyi veya yükü azaltmayı dene.';
 else if(s.s.balance<60)msg='Kasların dengesiz dağılımı robotu döndürdü. Bir kas hücresinin konumunu değiştir.';
 else if(level>0&&s.s.q.sensor===0)msg='Duyu hücresi olmadan yönünü düzeltmek zor. Ön tarafa bir duyu hücresi ekle.';
 else msg='Robot henüz hedefe ulaşamadı. Hücre konumlarını ve enerji rezervini değiştir.';
 $('resultText').textContent=msg;
 $('resultProgress').textContent=Math.round(progress*100)+'%';$('resultEnergy').textContent=results.energy+'%';$('resultTime').textContent=s.time.toFixed(1)+'s';
 $('resultScrim').classList.add('open');update();
}
function simulate(dt){
 const a=model,m=MISSIONS[level],s=a.s,target=currentTarget(),N=s.q.muscle,steer=s.q.sensor;
 a.time+=dt;
 const thrust=.23*N/(1+s.n*.09),dirX=Math.cos(a.angle),dirY=Math.sin(a.angle);
 const wanted=Math.atan2((target[1]-a.y)*H,(target[0]-a.x)*W);
 const angleError=wrap(wanted-a.angle);
 let turning=-s.torque*.66/(1+s.inertia*.16);
 if(steer) turning+=clamp(angleError*2.5,-2.9,2.9)*Math.min(1.7,steer*.7);
 for(const b of m.blocks){
  const d=pixelD(a.x,a.y,b[0],b[1]),R=b[2]*Math.min(W,H);
  if(steer&&d<R+Math.min(W,H)*.26){
   const angle=Math.atan2((b[1]-a.y)*H,(b[0]-a.x)*W);
   const rel=wrap(angle-a.angle);
   if(Math.abs(rel)<1.2){
    const sign=Math.sin(rel)>=0?-1:1;
    turning+=sign*Math.min(3,(R+Math.min(W,H)*.26-d)/Math.min(W,H)*7)*Math.min(1.5,steer*.72);
   }
  }
 }
 a.omega+=clamp(turning,-5,5)*dt;
 a.omega*=Math.exp(-2.6*dt);a.omega=clamp(a.omega,-2.4,2.4);a.angle=wrap(a.angle+a.omega*dt);
 const accel=thrust/(1+.3*s.inertia);
 a.vx+=(Math.cos(a.angle)*accel+.006*Math.sin(a.time*.6))*dt;
 a.vy+=(Math.sin(a.angle)*accel*W/H+.004*Math.sin(a.time*.9+a.x*5))*dt;
 a.vx*=Math.exp(-2.25*dt);a.vy*=Math.exp(-2.25*dt);
 const speed=Math.hypot(a.vx,a.vy*H/W),cap=.16;
 if(speed>cap){a.vx*=cap/speed;a.vy*=cap/speed}
 a.x+=a.vx*dt;a.y+=a.vy*dt;
 const rad=Math.min(W,H)*.039;
 for(const b of m.blocks){
  let dx=(a.x-b[0])*W,dy=(a.y-b[1])*H,d=Math.hypot(dx,dy)||1,lim=rad+b[2]*Math.min(W,H);
  if(d<lim){const nx=dx/d,ny=dy/d,push=lim-d+1;a.x+=push*nx/W;a.y+=push*ny/H;const vn=a.vx*W*nx+a.vy*H*ny;if(vn<0){a.vx-=vn*nx*1.45/W;a.vy-=vn*ny*1.45/H}a.angle+=.06*nx;if(a.time-a.lastHit>.4){a.lastHit=a.time;a.collisions++;a.energy=Math.max(0,a.energy-6)}}
 }
 if(a.x<.038){a.x=.038;a.vx=Math.abs(a.vx)*.3}if(a.x>.96){a.x=.96;a.vx=-Math.abs(a.vx)*.4}
 if(a.y<.13){a.y=.13;a.vy=Math.abs(a.vy)*.3}if(a.y>.88){a.y=.88;a.vy=-Math.abs(a.vy)*.3}
 a.energy=Math.max(0,a.energy-s.consumption*dt*(1+.12*N));
 if(!a.trail.length||pixelD(a.x,a.y,a.trail[a.trail.length-1][0],a.trail[a.trail.length-1][1])>4){a.trail.push([a.x,a.y]);if(a.trail.length>520)a.trail.shift()}
 const checkpointTotal=m.check.length+1,segmentStart=a.checkIndex?m.check[a.checkIndex-1]:m.start;
 const travel=pixelD(a.x,a.y,segmentStart[0],segmentStart[1]),segLength=pixelD(target[0],target[1],segmentStart[0],segmentStart[1]);
 a.progress=clamp((a.checkIndex+clamp(travel/Math.max(segLength,1),0,1))/checkpointTotal,0,.995);
 if(pixelD(a.x,a.y,target[0],target[1])<Math.min(W,H)*.083){
  if(a.checkIndex<m.check.length){a.checkIndex++;notice('IŞIK NOKTASI '+a.checkIndex+' / '+m.check.length);sound('save');a.progress=a.checkIndex/checkpointTotal}
  else{a.progress=1;finish(true,'success');return}
 }
 if(a.energy<=0)finish(false,'energy');else if(a.time>=m.limit)finish(false,'timeout');
}
function wrap(a){while(a>PI)a-=TWO;while(a< -PI)a+=TWO;return a}
function resize(){
 W=window.innerWidth;H=window.innerHeight;dpr=Math.min(window.devicePixelRatio||1,1.7);
 canvas.width=Math.max(2,Math.floor(W*dpr));canvas.height=Math.max(2,Math.floor(H*dpr));canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
 unit=clamp(Math.min(W*.055,H*.095),18,65);
 baseX=W*(W<760?.52:.48);baseY=H*(W<760?.54:.54);
}
function poly(points,color,stroke,lw=1){
 ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();
 ctx.fillStyle=color;ctx.fill();
 if(stroke){ctx.lineWidth=lw;ctx.strokeStyle=stroke;ctx.stroke()}
}
function circle(x,y,r,color,stroke=null,lw=1){ctx.beginPath();ctx.arc(x,y,r,0,TWO);ctx.fillStyle=color;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}}
function line(x,y,X,Y,color,lw=1){ctx.strokeStyle=color;ctx.lineWidth=lw;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(X,Y);ctx.stroke()}
function glow(x,y,r,color){
 const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2)
}
function drawBackground(time){
 ctx.fillStyle='#040706';ctx.fillRect(0,0,W,H);
 const g=ctx.createRadialGradient(W*.52,H*.46,0,W*.52,H*.52,Math.max(W,H)*.78);
 g.addColorStop(0,'#15281b');g.addColorStop(.38,'#07120d');g.addColorStop(1,'#020403');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 glow(W*.50,H*.55,Math.min(W*.56,710),'#83fe3a15');
 if(ambient){
  stars.forEach((p,i)=>{const x=p.x*W,y=p.y*H;if(x>W*.23&&x<W*.78&&y>H*.10&&y<H*.87||i%3===0)circle(x+Math.sin(time*.00019+p.t)*4,y+Math.cos(time*.00022+p.t)*4,p.r,'rgba(174,252,160,'+(.07+.1*(1+Math.sin(time*.0015+p.t))/2)+')')});
  ctx.strokeStyle='#9bdd8b0c';ctx.lineWidth=.6;for(let i=0;i<22;i++){let x=(i+1)*W/23;line(x,0,x,H,'#70a47508',.5)}
  for(let i=0;i<10;i++)line(0,i*H/9,W,i*H/9,'#74b27c08',.5);
 }
 // Architectural sci-fi silhouettes in the background
 const blocks=[[.20,.78,31,100],[.26,.71,17,60],[.80,.73,26,125],[.90,.63,17,140],[.34,.32,16,70],[.73,.32,16,84]];
 if(ambient)blocks.forEach((b,i)=>drawBlock(b[0]*W,b[1]*H,b[2]*Math.min(W,H)/720,b[3]*Math.min(W,H)/720,i%2?'sensor':'muscle',time,i,.19));
}
function crystalColors(type){return COLORS[type]||COLORS.core}
function drawBlock(px,py,size,height,type,time,index,alpha=1){
 const C=crystalColors(type),wid=size*1.25,dep=size*.56,top=py-height;
 ctx.save();ctx.globalAlpha=alpha;
 let shimmer=Math.sin(time*.0015+index*.74);
 if(alpha>.4){ctx.shadowColor=C.a;ctx.shadowBlur=7+shimmer*2}
 const N=[px,top-dep/2],E=[px+wid/2,top],S=[px,top+dep/2],L=[px-wid/2,top];
 const n=[N[0],N[1]+height],e=[E[0],E[1]+height],s=[S[0],S[1]+height],l=[L[0],L[1]+height];
 poly([N,E,e,n],C.b+'78',C.a+'85');
 poly([L,S,s,l],C.a+'9c',C.c+'c8');
 poly([S,E,e,s],C.b+'dc',C.c+'cc');
 poly([N,E,S,L],C.a+'c4',C.c,1.45);
 ctx.shadowBlur=0;
 line(N[0],N[1],n[0],n[1],C.c+'98',.7);
 line(px,top+dep/2,px,py+dep/2,C.c+'b5',1);
 ctx.strokeStyle=C.c+'70';
 if(type==='core'){ // pixel-cut architecture
  poly([[px-wid*.29,top+height*.17],[px-wid*.13,top+height*.13],[px-wid*.13,top+height*.33],[px-wid*.29,top+height*.36]],'#f74da9b1');
  poly([[px+wid*.13,top+height*.39],[px+wid*.31,top+height*.43],[px+wid*.31,top+height*.55],[px+wid*.13,top+height*.51]],'#f74da9a0');
 }else if(type==='muscle'){
  for(let i=0;i<3;i++)line(px-wid*.26,top+height*(.28+i*.19),px-wid*.07,top+height*(.31+i*.19),'#ffe1f1b0',1);
 }else if(type==='energy'){
  glow(px,top+height*.5,size*.85,'#efff6875');
  line(px-wid*.2,top+height*.23,px+wid*.02,top+height*.44,C.c,2);
  line(px+wid*.02,top+height*.44,px-wid*.14,top+height*.69,C.c,2);
 }else if(type==='sensor'){
  poly([[px,top-height*.03],[px+wid*.2,top+height*.1],[px,top+height*.23],[px-wid*.2,top+height*.1]],'#e7fffab8',C.c,1);
 }
 // subtle internal facets
 line(px-wid*.35,top+height*.12,px-wid*.35,top+height*.82,C.c+'50',1);
 ctx.restore();
}
function baseOf(x,y){return{x:baseX+(x-y)*unit*.9,y:baseY+(x+y)*unit*.40}}
function drawLabRings(time,cx,cy,r){
 ctx.save();const S=r;
 for(let i=0;i<4;i++){
  ctx.beginPath();ctx.ellipse(cx,cy,S*(.7+i*.34),S*(.16+i*.085),-.04,0,TWO);
  ctx.strokeStyle=i===0?'#b6ff7180':'#b3eab333';ctx.lineWidth=i===0?1.5:1;ctx.stroke();
 }
 glow(cx,cy,S*1.14,'#b3ff3640');
 circle(cx,cy,3,'#c9ff9b');
 for(let i=0;i<16;i++){
  const a=i*TWO/16+time*.00018,x=cx+Math.cos(a)*S*1.4,y=cy+Math.sin(a)*S*.35;
  circle(x,y,1.5,i%2?'#b2ff7565':'#fa5ba96e');
 }
 ctx.restore();
}
function drawBuild(time){
 const C=baseX,Y=baseY+unit*1.9;
 drawLabRings(time,C,Y,unit*3.15);
 // matrix of permitted placement slots, in isometric perspective
 for(let x=-4;x<=4;x++)for(let y=-3;y<=3;y++){
  if(!canPlace(x,y))continue;
  const p=baseOf(x,y);const sz=unit*.26;
  const flashing=hover&&hover.x===x&&hover.y===y;
  poly([[p.x,p.y-sz*.65],[p.x+sz,p.y],[p.x,p.y+sz*.65],[p.x-sz,p.y]],flashing?'#baff4c3c':'#b0ef8312',flashing?'#c5ff7b':'#9dec856a',1);
  line(p.x-3,p.y,p.x+3,p.y,flashing?'#eaffba':'#addf8b90');
  line(p.x,p.y-3,p.x,p.y+3,flashing?'#eaffba':'#addf8b90');
 }
 // faint ground wires linking adjacent modules
 for(const c of cells){const a=baseOf(c.x,c.y);
  for(const o of cells)if(Math.abs(o.x-c.x)+Math.abs(o.y-c.y)===1){const b=baseOf(o.x,o.y);line(a.x,a.y,b.x,b.y,'#adf69440',3)}}
 const ordered=cells.slice().sort((a,b)=>(a.x+a.y)-(b.x+b.y));
 ordered.forEach((c,i)=>{
  const p=baseOf(c.x,c.y),ht=unit*(c.type==='muscle'?1.8:c.type==='sensor'?1.35:c.type==='energy'?1.12:1.7);
  drawBlock(p.x,p.y,unit*.91,ht,c.type,time,i,1);
 });
 // floating labels, not blocking game area
 if(W>760){
  ctx.textAlign='center';ctx.font='10px DM Mono,monospace';ctx.fillStyle='#a5caab99';
  ctx.fillText('LIVING STRUCTURE / '+String(cells.length).padStart(2,'0')+' UNITS',C,Y+unit*2.05);
 }
}
function drawTarget(cx,cy,r,time,label,passed=false){
 const v=passed?'#97b5a8':'#f65bb7';glow(cx,cy,r*4,passed?'#78ffd624':'#ff309e1f');
 ctx.save();ctx.translate(cx,cy);ctx.rotate(PI/4+Math.sin(time*.001)*.08);poly([[0,-r],[r,0],[0,r],[-r,0]],'#ff4cb340',v,1.5);poly([[0,-r*.55],[r*.55,0],[0,r*.55],[-r*.55,0]],v+'aa','#ffd7eb',.8);ctx.restore();
 ctx.beginPath();ctx.ellipse(cx,cy+23,r*1.35,r*.4,0,0,TWO);ctx.strokeStyle='#ed6fac77';ctx.stroke();
 if(label){ctx.font='10px DM Mono,monospace';ctx.fillStyle='#eebddd';ctx.textAlign='center';ctx.fillText(label,cx,cy-r-19)}
}
function drawObstacle(x,y,r,time,index){
 glow(x,y,r*2,'#d653ae18');
 drawBlock(x,y+r*.32,r*1.15,r*1.8,index%2?'sensor':'core',time,index,.68);
 circle(x,y,r,'#08170d40','#d5ffa75e');
 ctx.setLineDash([3,7]);ctx.beginPath();ctx.arc(x,y,r+6,0,TWO);ctx.strokeStyle='#c2efb55a';ctx.stroke();ctx.setLineDash([]);
}
function drawMiniRobot(x,y,angle,time){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);
 const s=Math.min(W,H)*.0188;
 ctx.beginPath();ctx.ellipse(0,s*1.2,s*4.7,s*2.1,0,0,TWO);ctx.fillStyle='#a1fa7b13';ctx.fill();
 const mx=cells.reduce((p,c)=>p+c.x,0)/cells.length,my=cells.reduce((p,c)=>p+c.y,0)/cells.length;
 const ordered=cells.slice().sort((a,b)=>(a.x+a.y)-(b.x+b.y));
 for(let i=0;i<ordered.length;i++){
  const c=ordered[i],px=(c.x-mx)*s*1.2,py=(c.y-my)*s*.75;
  drawBlock(px,py,s*.91,s*(c.type==='muscle'?1.8:1.5),c.type,time,i,1);
 }
 // moving small wave front
 ctx.strokeStyle='#adff8a78';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,0,s*3.5,s*1.2,0,0,TWO);ctx.stroke();ctx.restore();
}
function drawArena(time){
 const m=MISSIONS[level],s=model;
 // animated dotted longitudinal motion graph
 ctx.save();for(let i=0;i<12;i++){
  let y=H*(.20+i*.062);
  ctx.beginPath();for(let x=0;x<=W;x+=22){let dy=Math.sin(x*.015+time*.0002+i*.81)*5;if(x===0)ctx.moveTo(x,y+dy);else ctx.lineTo(x,y+dy)}
  ctx.strokeStyle='#83d7870d';ctx.lineWidth=1;ctx.stroke();
 }
 // start beam
 glow(m.start[0]*W,m.start[1]*H,Math.min(W,H)*.16,'#baff721f');
 circle(m.start[0]*W,m.start[1]*H,3,'#baff8b');
 const target=currentTarget();
 drawTarget(m.target[0]*W,m.target[1]*H,Math.min(W,H)*.032,time,'HEDEF',false);
 m.check.forEach((p,i)=>drawTarget(p[0]*W,p[1]*H,Math.min(W,H)*.025,time,'DURAK '+(i+1),s.checkIndex>i));
 m.blocks.forEach((p,i)=>drawObstacle(p[0]*W,p[1]*H,p[2]*Math.min(W,H),time,i));
 if(s.trail.length>1){ctx.beginPath();ctx.moveTo(s.trail[0][0]*W,s.trail[0][1]*H);s.trail.forEach(p=>ctx.lineTo(p[0]*W,p[1]*H));ctx.strokeStyle='#b3ff807f';ctx.lineWidth=1.7;ctx.stroke()}
 // target vector connection for sensing
 if(s.s.q.sensor){ctx.setLineDash([2,7]);line(s.x*W,s.y*H,target[0]*W,target[1]*H,'#a8ff7472');ctx.setLineDash([])}
 drawMiniRobot(s.x*W,s.y*H,s.angle,time);
 ctx.restore();
}
function render(time){
 if(!last)last=time;let dt=Math.min((time-last)/1000,.033);last=time;t=time;
 if(mode==='running'&&!paused&&model)simulate(dt);
 drawBackground(time);
 if(mode==='build')drawBuild(time);else if(model)drawArena(time);
 // Abstract orbital overlays
 if(ambient){ctx.save();ctx.lineWidth=.8;ctx.strokeStyle='#a4e89812';ctx.beginPath();ctx.ellipse(W*.52,H*.58,Math.min(W*.4,360),Math.min(H*.28,180),-.08,0,TWO);ctx.stroke();ctx.restore()}
 if((Math.floor(time/120)!==Math.floor((time-dt*1000)/120))&&mode==='running')updateLive();
 requestAnimationFrame(render);
}
function updateLive(){if(!model)return;let en=Math.round(model.energy/model.energyMax*100);$('statEnergy').textContent=en+' / 100';$('barEnergy').style.width=en+'%';$('clock').textContent=timeFormat(model.time);$('missionPercent').textContent=Math.round(model.progress*100)+'%';$('missionProgress').style.width=(model.progress*100)+'%'}
function pick(x,y){
 // inspect top-center of each cell first, then available slots
 let choices=[];
 for(let gx=-4;gx<=4;gx++)for(let gy=-3;gy<=3;gy++){
  if(!canPlace(gx,gy)&&!find(gx,gy))continue;
  const p=baseOf(gx,gy),occupied=find(gx,gy),height=occupied?unit*.92:0;
  const d=Math.hypot((p.x-x)*1.05,(p.y-height*.52-y)*.94);
  choices.push({gx,gy,d,occupied:!!occupied});
 }
 choices.sort((a,b)=>a.d-b.d);
 let nearest=choices[0];return nearest&&nearest.d<unit*.62?{x:nearest.gx,y:nearest.gy}:null;
}
function point(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}}
function paint(e){const q=point(e),p=pick(q.x,q.y);if(!p)return;const k=p.x+','+p.y;if(k===painted)return;painted=k;edit(p.x,p.y)}
canvas.addEventListener('pointerdown',e=>{if(mode!=='build'||e.button!==0)return;pointerId=e.pointerId;canvas.setPointerCapture(e.pointerId);painted='';paint(e)});
canvas.addEventListener('pointermove',e=>{if(mode!=='build')return;const q=point(e);hover=pick(q.x,q.y);if(pointerId===e.pointerId&&e.buttons)paint(e)});
canvas.addEventListener('pointerup',e=>{if(pointerId===e.pointerId){pointerId=-1;painted=''}});
canvas.addEventListener('pointercancel',()=>{pointerId=-1;painted=''});
canvas.addEventListener('pointerleave',()=>{hover=null});
canvas.addEventListener('contextmenu',e=>{e.preventDefault();if(mode!=='build')return;const q=point(e),p=pick(q.x,q.y);if(p){let prev=selected;selected='erase';edit(p.x,p.y);selected=prev;update()}});
function panelHTML(type){
 const s=getStats(),c=s.q;
 if(type==='missions'){
  return '<p>Hücreleri farklı ortamlarda test et. Her görev, farklı bir tasarımı ödüllendirir.</p>'+MISSIONS.map((m,i)=>'<button class="mission-choice '+(level===i?'active':'')+'" data-level="'+i+'"><div><b>'+String(i+1).padStart(2,'0')+' / '+m.name+'</b><small>'+m.short+'</small></div><span class="mono '+(completed.includes(i)?'acid':'')+'">'+(completed.includes(i)?'✓':i===level?'●':'↗')+'</span></button>').join('')+'<p class="mono tiny">BİR GÖREVİ TAMAMLADIĞINDA SONUÇ TARAYICINDA SAKLANIR.</p>';
 }
 if(type==='biology'){
  return '<p>Bir hücreye basarak seç. Robot gövdesine dokunarak ekle, aynı yere yeniden dokunarak türünü değiştir.</p>'+
  Object.keys(COLORS).map(k=>'<button class="mission-choice" data-choose="'+k+'"><span><b style="color:'+COLORS[k].a+'">'+COLORS[k].label+'</b><small>'+COLORS[k].info+'</small></span><span style="font-size:21px;color:'+COLORS[k].a+'">◆</span></button>').join('')+
  '<div class="action-row"><button class="mini-btn" data-action="preset">ÖRNEK TASARIM</button><button class="mini-btn" data-action="reset">BAŞTAN KUR</button></div>';
 }
 if(type==='analysis'){
  return '<p>Bu göstergeler gerçek biyolojik ölçüm değil; oynanabilir hareket modelinin hesaplarıdır.</p>'+
  [['Hücre sayısı',s.n+' / 24'],['Kas / sensör / enerji',c.muscle+' / '+c.sensor+' / '+c.energy],['Denge',s.balance+'%'],['İtici güç',s.thrust+'%'],['Dönüş momenti',s.torque.toFixed(2)],['Enerji kapasitesi',Math.round(s.capacity)],['Saniyelik tüketim',s.consumption.toFixed(1)],['En iyi süre',best[level]?best[level].time.toFixed(1)+' s':'—']].map(p=>'<div class="datalist"><span>'+p[0]+'</span><b>'+p[1]+'</b></div>').join('')+
  '<div class="action-row"><button class="mini-btn strong" data-action="save">SÜRÜMÜ KAYDET</button><button class="mini-btn" data-action="restore">SON KAYDI YÜKLE</button></div>';
 }
 if(type==='settings'){
  return '<p>Görselliği ve oynanışı buradan ayarlayabilirsin.</p>'+
  '<label class="toggle">Kısa etkileşim sesleri<input type="checkbox" id="audioToggle" '+(audio?'checked':'')+'></label>'+
  '<label class="toggle">Ortam parçacıkları<input type="checkbox" id="ambientToggle" '+(ambient?'checked':'')+'></label>'+
  '<label class="toggle">Hassas hareket<input type="checkbox" id="precisionToggle" '+(precision?'checked':'')+'></label>'+
  '<div class="action-row"><button class="mini-btn" data-action="save">TASARIMI KAYDET</button><button class="mini-btn" data-action="restore">KAYDI YÜKLE</button><button class="mini-btn" data-action="fullscreen">TAM EKRAN</button></div>';
 }
 return '<p><strong>1.</strong> Alt menüden hücre seç; ortadaki yeşil yuvalara dokunarak robotuna ekle. Yeşil ana hücre sabittir.</p>'+
 '<p><strong>2.</strong> Kas hücreleri ileri itki sağlar. Yerlerini dengeli tutmazsan robot döner.</p>'+
 '<p><strong>3.</strong> Duyu hücresi ışığa ve yakındaki engellere yönelmeyi kolaylaştırır. Enerji hücresi hareket süresini uzatır.</p>'+
 '<p><strong>4.</strong> Canlandır tuşuna bas. Başarısız olursa düzenle ve yeniden dene. Klavye: 1–4 hücre, X sil, R çalıştır, Z geri al.</p>'+
 '<p><strong>Bilimsel not:</strong> Xenobot ve biyohibrit robot araştırmalarından esinlenen bu oyun, soyut bir fizik modelidir. Gerçek hücre davranışını veya biyolojik deney sonucunu tahmin etmez.</p>'+
 '<div class="action-row"><button class="mini-btn strong" data-action="close">OYUNA DÖN</button><a class="mini-btn" href="https://wyss.harvard.edu/technology/xenobots/" target="_blank" rel="noopener noreferrer">ARAŞTIRMA ↗</a></div>';
}
function renderDrawer(){
 if(!drawerType)return;const titles={missions:'GÖREVLER',biology:'HÜCRE LABORATUVARI',analysis:'CANLI ANALİZ',settings:'AYARLAR',help:'NASIL OYNANIR'};
 $('drawer').innerHTML='<header class="drawer-head"><div><div class="mono tiny acid">BIO ROBOT / LAB 001</div><h2>'+titles[drawerType]+'</h2></div><button class="xbtn" data-action="close" aria-label="Menüyü kapat">×</button></header>'+panelHTML(drawerType);
 $('drawer').classList.add('open');
}
function openDrawer(type){
 if(drawerType===type){closeDrawer();return}
 drawerType=type;document.querySelectorAll('[data-panel]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.panel===type)));renderDrawer();
}
function closeDrawer(){
 drawerType='';$('drawer').classList.remove('open');document.querySelectorAll('[data-panel]').forEach(el=>el.setAttribute('aria-pressed','false'));
}
function reset(){
 if(mode==='running'){notice('ÖNCE DENEYİ DURDUR');return}
 history();cells=[{x:0,y:0,type:'core'}];enterBuild();update();notice('GÖVDE TEMİZLENDİ');
}
function fullscreen(){try{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen?.().catch(()=>notice('TAM EKRAN KULLANILAMIYOR'))}catch(e){notice('TAM EKRAN KULLANILAMIYOR')}}
function share(){
 const txt='BIO ROBOT / aynen.fun — '+MISSIONS[level].name+' '+(results?Math.round(results.progress*100)+'% ilerleme, '+results.energy+'% enerji. ':'')+'Benim robotumu geçebilir misin?';
 const u=location.origin+'/bio-robot.html?level='+(level+1);
 if(navigator.share){navigator.share({title:'BIO ROBOT',text:txt,url:u}).catch(()=>{})}
 else if(navigator.clipboard)navigator.clipboard.writeText(txt+' '+u).then(()=>notice('PAYLAŞIM BAĞLANTISI KOPYALANDI')).catch(()=>notice('KOPYALAMA ENGELLENDİ'));
 else notice('BAĞLANTI: '+u);
}
$('drawer').addEventListener('click',e=>{
 const act=e.target.closest('[data-action]'),lv=e.target.closest('[data-level]'),choose=e.target.closest('[data-choose]');
 if(lv)setLevel(Number(lv.dataset.level));
 else if(choose){selectCell(choose.dataset.choose);closeDrawer()}
 else if(act){
  switch(act.dataset.action){
   case 'close':closeDrawer();break;
   case 'preset':makePreset();closeDrawer();break;
   case 'reset':reset();closeDrawer();break;
   case 'save':save();break;
   case 'restore':loadSaved();break;
   case 'fullscreen':fullscreen();break;
  }
 }
});
$('drawer').addEventListener('change',e=>{if(e.target.id==='audioToggle')audio=e.target.checked;else if(e.target.id==='ambientToggle')ambient=e.target.checked;else if(e.target.id==='precisionToggle')precision=e.target.checked});
document.querySelectorAll('[data-panel]').forEach(el=>el.addEventListener('click',()=>openDrawer(el.dataset.panel)));
document.querySelectorAll('[data-cell]').forEach(el=>el.addEventListener('click',()=>selectCell(el.dataset.cell)));
$('eraseBtn').addEventListener('click',()=>selectCell(selected==='erase'?'muscle':'erase'));
$('undoBtn').addEventListener('click',undo);
$('mirrorBtn').addEventListener('click',()=>{mirror=!mirror;update();notice(mirror?'SİMETRİ AÇIK':'SİMETRİ KAPALI')});
$('runBtn').addEventListener('click',stepButton);
$('fullscreenBtn').addEventListener('click',fullscreen);
$('closeResult').addEventListener('click',()=>{$('resultScrim').classList.remove('open')});
$('retryBtn').addEventListener('click',()=>run());
$('editBtn').addEventListener('click',enterBuild);
$('shareBtn').addEventListener('click',share);
$('resultScrim').addEventListener('click',e=>{if(e.target===$('resultScrim'))$('resultScrim').classList.remove('open')});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){$('resultScrim').classList.remove('open');closeDrawer();return}
 if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
 if(e.key>='1'&&e.key<='4'){selectCell(['core','muscle','sensor','energy'][Number(e.key)-1]);return}
 if(e.key.toLowerCase()==='x'){selectCell('erase');return}
 if(e.key.toLowerCase()==='r'){stepButton();return}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo()}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='running'){paused=true;update()}last=performance.now()});
load();try{const q=new URLSearchParams(location.search),lv=Number(q.get('level'));if(lv>=1&&lv<=4)level=lv-1}catch(e){}
resize();window.addEventListener('resize',resize,{passive:true});update();
if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)ambient=false;
requestAnimationFrame(render);
})();