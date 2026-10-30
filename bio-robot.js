/* BIO ROBOT / aynen.fun — playable abstract biohybrid-inspired physics game.
   Mechanic cells and values are fictional, not a validated biological model. */
(()=>{
'use strict';
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d',{alpha:false});
const PI=Math.PI,TWO=PI*2,MAX=24,KEY='aynen_biorobot_neon_v2',BEST='aynen_biorobot_best_v2';
const COLORS={
 core:{a:'#8e9fe3',b:'#5066b4',c:'#e3eaff',label:'Destek',info:'Gövdeye hacim verir. Ağırlığı artırır.'},
 muscle:{a:'#ec947e',b:'#b95f58',c:'#ffe5d8',label:'Kas',info:'Hareket üretir. Konumu yönü etkiler.'},
 sensor:{a:'#91d9d4',b:'#428e9c',c:'#e8fffa',label:'Duyu',info:'Hedefi ve engelleri algılayıp yönü düzeltir.'},
 energy:{a:'#e9bc70',b:'#bd874a',c:'#fff1c4',label:'Enerji',info:'Robotun daha uzun süre hareket etmesini sağlar.'}
};

const MISSIONS=[
 {name:'İLK HAREKET',description:'Robotunu canlandır. Karşıdaki parlak çekirdeğe ulaş.',short:'Hedefe doğru ilerle.',limit:24,target:[.82,.62],start:[.18,.62],blocks:[],check:[]},
 {name:'ENGELDEN KAÇ',description:'Yolu kapatan kristallere takılmadan çekirdeğe ulaş.',short:'Kristallerin arasından geç.',limit:29,target:[.83,.60],start:[.17,.60],blocks:[[.49,.60,.074],[.67,.40,.055]],check:[]},
 {name:'IŞIĞI BUL',description:'Işık yukarıda. Duyu hücrelerin yönü değiştirebilir.',short:'Işığı bul ve ona ulaş.',limit:30,target:[.80,.34],start:[.17,.68],blocks:[[.45,.62,.071],[.63,.48,.060]],check:[]},
 {name:'YAŞAYAN KÖPRÜ',description:'Önce iki ışıklı duraktan geç, sonra ana çekirdeğe ulaş.',short:'İki durağı ve son hedefi bul.',limit:37,target:[.83,.38],start:[.18,.70],blocks:[[.46,.47,.067],[.65,.66,.063]],check:[[.38,.71],[.64,.40]]}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),hypot=Math.hypot;
const rand=(seed)=>{let x=Math.sin(seed*127.1+seed*seed*.017)*43758.5453;return x-Math.floor(x)};
let cells=starter(),undoStack=[],savedCells=null,version=1,completed=[],best=[],level=0,selected='muscle',mirror=false;
const FIRST_KEY='aynen_bio_intro_completed_v4';
let tutorialSeen=false,hasPlayed=false,nextTipDismissed=false;
try{tutorialSeen=localStorage.getItem(FIRST_KEY)==='1'}catch(e){}
let coachStep=0,hasPlaced=false,hasSelected=false;
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
 const st=getStats(),en=model?Math.round(100*model.energy/model.energyMax):100;
 $('statEnergy').textContent=en+'%';$('statBalance').textContent=st.balance+'%';$('statThrust').textContent=st.thrust+'%';
 $('barEnergy').style.width=en+'%';$('barBalance').style.width=st.balance+'%';$('barThrust').style.width=st.thrust+'%';
 $('selectedName').textContent=selected==='erase'?'Sil':COLORS[selected].label;
 $('selectedDesc').textContent=selected==='erase'?'Bir hücreyi kaldır.':COLORS[selected].info;
 document.querySelectorAll('[data-cell]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.cell===selected)));
 $('eraseBtn').setAttribute('aria-pressed',String(selected==='erase'));
 $('mirrorBtn').setAttribute('aria-pressed',String(mirror));
 const src=document.querySelector('[data-cell="'+(selected==='erase'?'core':selected)+'"] svg');
 if(src)$('selectedArt').innerHTML=src.outerHTML;
 const m=MISSIONS[level];
 $('missionId').textContent='GÖREV '+String(level+1).padStart(2,'0')+' / 04';
 $('missionName').textContent=prettyMission(level);
 $('missionHint').textContent=m.short;
 $('missionPercent').textContent=(model?Math.round(model.progress*100):0)+'%';
 $('missionProgress').style.width=(model?Math.round(model.progress*100):0)+'%';
 $('missionStatus').textContent=mode==='build'?'TASARIM MODU':mode==='running'?(paused?'DURAKLADI':'ROBOT HAREKET EDİYOR'):'DENEY TAMAMLANDI';
 $('clock').textContent=model?timeFormat(model.time):'00:00';
 $('intro').classList.toggle('hidden',tutorialSeen||mode!=='build');
 $('nextTip').classList.toggle('show',mode==='build'&&hasPlayed&&!nextTipDismissed);
  $('stageCaption').innerHTML='<i></i>'+(
    mode==='build'?(!tutorialSeen?'Önce hazır robotu çalıştır ve hareketini izle':selected==='erase'?'Silmek istediğin hücreye dokun':!hasSelected&&!hasPlaced?'Aşağıdan hücre seç → Ortadaki + noktasına dokun':'Parlayan + noktalarına hücre ekle') :
    mode==='running'?(paused?'Deney duraklatıldı':'Robotun hareketini izle — sonuç birazdan görünecek'):
    'Tekrar dene veya robotunu geliştir');
 $('runLabel').textContent=mode==='build'?'Test et':mode==='running'?(paused?'Devam et':'Duraklat'):'Robotu düzenle';
 $('runSubtitle').textContent=mode==='build'?'Robotunu çalıştır':mode==='running'?(paused?'Harekete devam':'Simülasyonu durdur'):'Bir şey değiştir';
 $('runGlyph').innerHTML='<use href="#'+(mode==='running'&&!paused?'i-pause':'i-play')+'"/>';
 $('runBtn').disabled=mode==='build'&&!st.q.muscle;
 coachStep=mode==='running'||mode==='result'?3:hasPlaced?2:hasSelected?1:0;
 const ct=[
 ['1 / 3 · KEŞFET','Robotun hazır','Aşağıdan bir hücre seçip ortadaki + noktalarına ekleyebilirsin. İstersen hemen Test et.'],
 ['2 / 3 · HÜCRE EKLE','Robotuna hücre ekle','Ortadaki + işaretli boş yuvalardan birine dokun. Seçtiğin hücre oraya bağlanacak.'],
 ['3 / 3 · TEST ET','Şimdi hareketi izle','Test et düğmesine bas. Robot, hücrelerin konumuna göre kendi yolunu bulmaya çalışacak.'],
 ['DENEY BAŞLADI','Robotun hareket ediyor','Enerji ve ilerleme göstergeleri sağ üstte. Sonuçta robotunu geliştirebilirsin.']
 ][coachStep];
 $('coachCounter').textContent=ct[0];$('coachTitle').textContent=ct[1];$('coachText').textContent=ct[2];
 document.querySelectorAll('.coach-step').forEach((e,i)=>e.classList.toggle('done',i<coachStep));
 document.querySelectorAll('.coach-step').forEach((e,i)=>e.classList.toggle('active',i===Math.min(coachStep,2)));
 if(drawerType==='analysis')renderDrawer();
}
function prettyMission(n){return['İlk hareket','Engelden kaç','Işığı bul','Yaşayan köprü'][n]||'Görev'}

function timeFormat(v){const n=Math.floor(v);return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
function selectCell(type){if(mode==='running'){notice('DENEYİ DURAKLATIP DÜZENLE');return}if(mode==='result')enterBuild();selected=type;hasSelected=true;update();sound('tap')}
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
 if(did){hasPlaced=true;nextTipDismissed=true;update();sound('tap')}
}
function makePreset(){
 if(mode==='running')return;
 history();hasPlaced=true;nextTipDismissed=true;let n=counts().muscle;
 if(n<=1)cells=starter();
 else if(counts().sensor<2)cells=[{x:0,y:0,type:'core'},{x:-1,y:-1,type:'muscle'},{x:-1,y:1,type:'muscle'},{x:-2,y:0,type:'energy'},{x:1,y:-1,type:'sensor'},{x:1,y:1,type:'sensor'},{x:0,y:-1,type:'core'}];
 else cells=[{x:0,y:0,type:'core'},{x:-1,y:-1,type:'muscle'},{x:-1,y:1,type:'muscle'},{x:1,y:0,type:'sensor'},{x:0,y:1,type:'energy'}];
 enterBuild();update();notice('YENİ BİYO-TASARIM YÜKLENDİ');
}
function enterBuild(){
 mode='build';paused=false;$('pauseActions').hidden=true;model=null;results=null;
 $('resultScrim').classList.remove('open');
 if(hasPlayed&&!hasPlaced)nextTipDismissed=false;
 update();
}
function setLevel(n){if(n<0||n>=MISSIONS.length)return;level=n;closeDrawer();enterBuild();update();notice('Görev '+(n+1)+': '+prettyMission(n))}
function stepButton(){if(mode==='result'){enterBuild();return}if(mode==='build'){run();return}paused=!paused;last=performance.now();$('pauseActions').hidden=!paused;update();sound('tap')}
function startModel(){
 const s=getStats(),mission=MISSIONS[level];
 if(!s.q.muscle){notice('Önce bir kas hücresi eklemelisin.');sound('error');return}
 model={x:mission.start[0],y:mission.start[1],vx:0,vy:0,angle:0,omega:0,time:0,energy:s.capacity,energyMax:s.capacity,s,trail:[],progress:0,checkIndex:0,collisions:0,lastHit:-5,active:true,goodTime:0};
 mode='running';hasPlayed=true;tutorialSeen=true;
 try{localStorage.setItem(FIRST_KEY,'1')}catch(e){}
 paused=false;$('pauseActions').hidden=true;$('resultScrim').classList.remove('open');closeDrawer();update();sound('save');
}
function run(){startModel()}
function currentTarget(){
 const m=MISSIONS[level];return model&&model.checkIndex<m.check.length?m.check[model.checkIndex]:m.target;
}
function pixelD(ax,ay,bx,by){return Math.hypot((ax-bx)*W,(ay-by)*H)}
function finish(success,reason){
 if(!model)return;
 mode='result';paused=false;$('pauseActions').hidden=true;const s=model;
 let progress=success?1:s.progress;
 results={success,reason,progress,energy:Math.max(0,Math.round(s.energy/s.energyMax*100)),time:s.time,collisions:s.collisions};
 if(success){if(!completed.includes(level))completed.push(level);let curr=best[level];if(!curr||s.time<curr.time)best[level]={time:s.time,energy:results.energy};try{localStorage.setItem(BEST,JSON.stringify({completed,best}))}catch(e){}sound('win')}else sound('error');
 $('resultKicker').textContent=success?'DENEY BAŞARILI / GÖREV '+(level+1):'DENEY SONA ERDİ / GÖREV '+(level+1);
 $('resultTitle').textContent=success?'HEDEF BULUNDU.':reason==='energy'?'ENERJİ BİTTİ.':reason==='timeout'?'SÜRE DOLDU.':'DENEY DURDU.';
 let msg='';
 if(success)msg='Hazır robot hedefe ulaştı. Şimdi bir hücreyi değiştirip tekrar dene. Daha hızlı veya daha az enerjiyle gidebilir mi?';
 else if(reason==='energy')msg='Gövden yolculuğu bitirmeden enerjisini tüketti. Bir enerji hücresi eklemeyi veya yükü azaltmayı dene.';
 else if(s.s.balance<60)msg='Kasların dengesiz dağılımı robotu döndürdü. Bir kas hücresinin konumunu değiştir.';
 else if(level>0&&s.s.q.sensor===0)msg='Duyu hücresi olmadan yönünü düzeltmek zor. Ön tarafa bir duyu hücresi ekle.';
 else msg='Robot henüz hedefe ulaşamadı. Hücre konumlarını ve enerji rezervini değiştir.';
 $('resultText').textContent=msg;
 $('resultTitle').textContent=success?'İŞE YARADI!':$('resultTitle').textContent;
 $('nextMissionBtn').hidden=!success||level>=MISSIONS.length-1;
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
 const dx=(target[0]-segmentStart[0])*W,dy=(target[1]-segmentStart[1])*H;
 const curX=(a.x-segmentStart[0])*W,curY=(a.y-segmentStart[1])*H;
 const along=clamp((curX*dx+curY*dy)/Math.max(dx*dx+dy*dy,1),0,1);
 a.progress=clamp((a.checkIndex+along)/checkpointTotal,0,.995);
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
 unit=W<800?clamp(W*.095,26,40):clamp(Math.min(W*.055,H*.091),37,72);
 baseX=W*(W<800?.52:.50);baseY=H*(W<800?.52:.58);
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

/* Premium editorial micro-lab: translucent ceramic and bioglass modules */
function drawBackground(time){
 ctx.fillStyle='#e8eff0';ctx.fillRect(0,0,W,H);
 const g=ctx.createRadialGradient(baseX,baseY-unit*.8,Math.max(1,unit*.5),baseX,baseY,Math.max(W,H)*.7);
 g.addColorStop(0,'#f9fbf9');g.addColorStop(.35,'#edf4f4');g.addColorStop(.70,'#e3edf0');g.addColorStop(1,'#dce6eb');
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 const startY=Math.max(70,H*.21),endY=H*.83;
 ctx.save();ctx.strokeStyle='#b5c9cd39';ctx.lineWidth=.8;
 for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,startY);ctx.lineTo(x,endY);ctx.stroke()}
 for(let y=startY;y<endY;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 ctx.restore();
 if(ambient){
  stars.forEach((v,i)=>{const xx=v.x*W,yy=v.y*H;if(yy<80||yy>H*.89)return;
  circle(xx+Math.sin(time*.0003+v.t)*1.3,yy+Math.cos(time*.0002+v.t)*1.3,v.r*.68,'rgba(94,140,167,.11)')});
 }
 // Large, subtle laboratory architecture: precise, quiet concentric rings.
 ctx.save();ctx.strokeStyle='#b0c6cc30';ctx.lineWidth=1;
 for(let j=0;j<3;j++){ctx.beginPath();ctx.ellipse(baseX,baseY+unit*.6,unit*(3.6+j*.95),unit*(1.5+j*.40),0,0,TWO);ctx.stroke()}
 ctx.restore();
}
function crystalColors(type){return COLORS[type]||COLORS.core}
function drawBlock(px,py,size,height,type,time,index,alpha=1){
 const C=crystalColors(type);
 const h=height,w=size*1.28,d=size*.52,top=py-h;
 ctx.save();ctx.globalAlpha=alpha;
 const shimmer=Math.sin(time*.0013+index*1.07);
 ctx.shadowColor='#405b7240';ctx.shadowBlur=12;ctx.shadowOffsetY=6;
 const grad=ctx.createLinearGradient(px-w,top,px+w,py);
 grad.addColorStop(0,C.c);grad.addColorStop(.36,C.a);grad.addColorStop(1,C.b);
 poly([[px-w*.5,top],[px,top-d*.53],[px+w*.5,top],[px,top+d*.53]],C.c+'ea','#ffffffc6',1.5);
 poly([[px-w*.5,top],[px,top+d*.53],[px,py+d*.53],[px-w*.5,py]],grad,C.b+'a4',1);
 poly([[px,top+d*.53],[px+w*.5,top],[px+w*.5,py],[px,py+d*.53]],C.b+'e0',C.b,1);
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 // Glazed surfaces and cellular membrane striations.
 poly([[px-w*.43,top+5],[px-w*.11,top+d*.40],[px-w*.11,py-d*.17],[px-w*.43,py-d*.43]],'#ffffff42');
 line(px,top+d*.53,px,py+d*.53,'#ffffffc0',1.35);
 line(px-w*.45,py-3,px,py+d*.53-3,'#ffffff50',1);
 ctx.globalAlpha=alpha*.72;
 if(type==='muscle'){
   const pulse=.5+.5*Math.sin(time*.003+index);
   for(let i=0;i<3;i++)line(px-w*.33,top+h*(.27+i*.18),px-w*.08,top+d*.36+h*(.27+i*.18),C.c,1.2+pulse*.3);
 }else if(type==='sensor'){
   circle(px-w*.20,top+h*.50,Math.max(3,size*.095),C.c,C.b,1);
   circle(px-w*.20,top+h*.50,Math.max(1.6,size*.032),C.b);
 }else if(type==='energy'){
   circle(px-w*.17,top+h*.48,size*.12,'#fff4b6',C.b+'99',1);
   line(px-w*.21,top+h*.35,px-w*.10,top+h*.48,C.b,1.5);
   line(px-w*.10,top+h*.48,px-w*.21,top+h*.6,C.b,1.5);
 }else{
   circle(px-w*.16,top+h*.52,size*.095,C.c+'aa');
 }
 ctx.globalAlpha=alpha;
 ctx.strokeStyle='#ffffffbd';ctx.lineWidth=1.25;
 ctx.beginPath();ctx.moveTo(px-w*.47,top+3);ctx.lineTo(px-w*.47,py-2);ctx.stroke();
 ctx.restore();
}
function drawLabRings(time,x,y,r){
 ctx.save();
 const shadow=ctx.createRadialGradient(x,y,r*.1,x,y,r*1.7);
 shadow.addColorStop(0,'#43678124');shadow.addColorStop(.55,'#6081980a');shadow.addColorStop(1,'#60819800');
 ctx.fillStyle=shadow;ctx.beginPath();ctx.ellipse(x,y,r*1.85,r*.7,0,0,TWO);ctx.fill();
 for(let i=0;i<3;i++){
  ctx.beginPath();ctx.ellipse(x,y,r*(.72+i*.23),r*(.22+i*.07),0,0,TWO);
  ctx.strokeStyle=i===0?'#789ba858':'#b0c7cd63';ctx.lineWidth=i===0?2:1;ctx.stroke();
 }
 // Quiet animated light marks.
 const a=time*.00018;for(let j=0;j<4;j++){let an=a+j*PI*.5;
  circle(x+Math.cos(an)*r*.97,y+Math.sin(an)*r*.31,2,'#5a88bc88')}
 ctx.restore();
}
function baseOf(x,y){return {x:baseX+(x-y)*unit*.9,y:baseY+(x+y)*unit*.40}}
function drawMissionPreview(time){
 const mission=MISSIONS[level];
 const sx=baseX+unit*2.18,sy=baseY-unit*1.5;
 const ex=Math.min(W-60,baseX+unit*4.12),ey=baseY-unit*2.12;
 // The destination remains visible before the experiment starts.
 const r=Math.max(14,Math.min(23,unit*.38));
 ctx.save();
 ctx.setLineDash([3,8]);ctx.strokeStyle='#738cb880';ctx.lineWidth=1.7;
 ctx.beginPath();ctx.moveTo(baseX+unit*.64,baseY-unit*.68);
 ctx.bezierCurveTo(sx,baseY-unit*2.2,ex-unit*.62,ey+unit*.85,ex,ey);
 ctx.stroke();ctx.setLineDash([]);
 const g=ctx.createRadialGradient(ex,ey,1,ex,ey,r*3);
 g.addColorStop(0,'#98bff366');g.addColorStop(1,'#98bff300');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(ex,ey,r*3,0,TWO);ctx.fill();
 circle(ex,ey,r,'#f8fcffd9','#5378ba',2);
 circle(ex,ey,r*.56,'#6f96d6','#e8f1ff',1.5);
 circle(ex,ey,4,'#f8fbff');
 ctx.fillStyle='#53728d';ctx.font='700 11px "DM Sans",sans-serif';ctx.textAlign='center';
 ctx.fillText('HEDEF',ex,ey-r-14);
 if(W>800){ctx.font='600 11px "DM Sans",sans-serif';ctx.fillStyle='#698393';ctx.fillText('SENİN ROBOTUN',baseX,baseY+unit*2.58)}
 ctx.restore();
}
function drawBuild(time){
 const x=baseX,y=baseY+unit*1.20;
 drawLabRings(time,x,y,unit*3);
 // Compact floating plinth, constructed from translucent layers.
 const hw=unit*3.25,hh=unit*.93;
 ctx.save();
 ctx.shadowBlur=35;ctx.shadowColor='#718da82a';ctx.shadowOffsetY=13;
 poly([[x-hw,y],[x,y-hh],[x+hw,y],[x,y+hh]],'#ffffffaf','#d2dfe0',1.4);
 ctx.restore();
 poly([[x-hw,y],[x,y+hh],[x,y+hh+unit*.30],[x-hw,y+unit*.30]],'#d6e0e6b0','#bed2da',1);
 poly([[x,y+hh],[x+hw,y],[x+hw,y+unit*.30],[x,y+hh+unit*.30]],'#bacbd9ae','#bed2da',1);
 // Position targets have explicit (+) icons. They are the interactive affordance.
 for(let gx=-4;gx<=4;gx++)for(let gy=-3;gy<=3;gy++){
  if(!canPlace(gx,gy))continue;
  const p=baseOf(gx,gy),hovering=hover&&hover.x===gx&&hover.y===gy,rr=Math.max(11,unit*.28);
  ctx.save();ctx.shadowBlur=hovering?12:0;ctx.shadowColor='#5064bd72';
  circle(p.x,p.y-2,rr,hovering?'#4e66b8':'#ffffffce',hovering?'#3958bc':'#9eb8c5',hovering?2:1.4);
  ctx.shadowBlur=0;
  line(p.x-rr*.32,p.y-2,p.x+rr*.32,p.y-2,hovering?'#fff':'#587e9e',2);
  line(p.x,p.y-rr*.32-2,p.x,p.y+rr*.32-2,hovering?'#fff':'#587e9e',2);
  ctx.restore();
 }
 // First-play affordance: one clear target and a readable label.
 if(!hasPlaced){
  const target=canPlace(2,0)?{x:2,y:0}:Array.from({length:81},(_,i)=>({x:(i%9)-4,y:Math.floor(i/9)-4})).find(q=>canPlace(q.x,q.y));
  if(target){
   const p=baseOf(target.x,target.y);
   ctx.save();
   const offset=unit*.54;
   ctx.strokeStyle='#436dace0';ctx.lineWidth=1.5;
   ctx.beginPath();ctx.moveTo(p.x+7,p.y-offset*.40);ctx.lineTo(p.x+offset*.85,p.y-offset*1.35);ctx.stroke();
   ctx.textAlign='left';ctx.font='600 11px "DM Sans",sans-serif';ctx.fillStyle='#355da0';
   ctx.fillText('BURAYA EKLE +',p.x+offset*.93,p.y-offset*1.39);
   ctx.restore();
  }
 }
 for(let i=0;i<cells.length;i++){
  const c=cells[i],a=baseOf(c.x,c.y);
  for(const o of cells)if(Math.abs(o.x-c.x)+Math.abs(o.y-c.y)===1){
   const b=baseOf(o.x,o.y);
   line(a.x,a.y-unit*.24,b.x,b.y-unit*.24,'#b5c9d7a6',unit*.20);
   line(a.x,a.y-unit*.24,b.x,b.y-unit*.24,'#e6f3f4a9',unit*.075);
  }
 }
 const ordered=cells.slice().sort((a,b)=>(a.x+a.y)-(b.x+b.y));
 ordered.forEach((c,i)=>{
  const p=baseOf(c.x,c.y),h=unit*(c.type==='muscle'?1.28:c.type==='sensor'?1.20:c.type==='energy'?1.08:1.22);
  drawBlock(p.x,p.y,unit*.83,h,c.type,time,i);
 });
 drawMissionPreview(time);
}
function drawTarget(x,y,r,time,label,passed=false){
 const c=passed?'#82b5ac':'#526fc3';
 ctx.save();
 const halo=ctx.createRadialGradient(x,y,2,x,y,r*2.1);
 halo.addColorStop(0,c+'55');halo.addColorStop(1,c+'00');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,r*2.1,0,TWO);ctx.fill();
 circle(x,y,r,'#ffffffdb',c,2);circle(x,y,r*.53,passed?'#95c6bb':'#6b89d1');
 circle(x,y,3,'#fff');
 ctx.strokeStyle=c+'8a';ctx.setLineDash([4,5]);ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,r*1.42,0,TWO);ctx.stroke();ctx.setLineDash([]);
 if(label){ctx.fillStyle='#526f83';ctx.textAlign='center';ctx.font='600 12px "DM Sans",sans-serif';ctx.fillText(label,x,y-r-18)}
 ctx.restore();
}
function drawObstacle(x,y,r,time,index){
 ctx.save();ctx.shadowColor='#bb7b7377';ctx.shadowBlur=16;circle(x,y,r,'#eeb1a2','#cd8c7c',2);ctx.shadowBlur=0;
 const shine=ctx.createRadialGradient(x-r*.42,y-r*.43,3,x,y,r);
 shine.addColorStop(0,'#ffe6d3');shine.addColorStop(1,'#d58d7b');circle(x,y,r*.87,shine);
 circle(x-r*.2,y-r*.2,r*.23,'#ffffff48');
 ctx.font='600 10px "DM Sans",sans-serif';ctx.textAlign='center';ctx.fillStyle='#8a4f4e';ctx.fillText('ENGEL',x,y+r+16);
 ctx.restore();
}
function drawMiniRobot(x,y,angle,time){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);
 const u=Math.max(22,Math.min(W,H)*(W<800?.055:.048));
 const ground=ctx.createRadialGradient(2,u*.7,3,2,u*.7,u*4);
 ground.addColorStop(0,'#456c9e41');ground.addColorStop(1,'#456c9e00');
 ctx.fillStyle=ground;ctx.beginPath();ctx.ellipse(2,u*.7,u*3.9,u*1.6,0,0,TWO);ctx.fill();
 ctx.strokeStyle='#6d9eb77a';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(0,u*.5,u*3.15,u*1.30,0,0,TWO);ctx.stroke();
 const mx=cells.reduce((v,c)=>v+c.x,0)/cells.length,my=cells.reduce((v,c)=>v+c.y,0)/cells.length;
 const ordered=cells.slice().sort((a,b)=>(a.x+a.y)-(b.x+b.y));
 for(let i=0;i<ordered.length;i++){
  const c=ordered[i];drawBlock((c.x-mx)*u*.82,(c.y-my)*u*.57+u*.36,u*.81,u*1.30,c.type,time,i);
 }
 ctx.strokeStyle='#628fc38c';ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(0,u*.3,u*2.55,u*.88,0,0,TWO);ctx.stroke();
 ctx.restore();
}
function drawArena(time){
 const m=MISSIONS[level],s=model;
 ctx.save();
 ctx.strokeStyle='#9bb4c32a';ctx.lineWidth=1;
 for(let k=0;k<9;k++){
  let y=H*(.21+k*.072);
  ctx.beginPath();ctx.moveTo(W*.05,y);ctx.lineTo(W*.94,y);ctx.stroke();
 }
 // Receding translucent glass arena with depth and water reflections.
 const cy=H*.59,arc=Math.min(W,H)*.36;
 ctx.save();
 const surface=ctx.createRadialGradient(W*.5,cy,arc*.07,W*.5,cy,arc*2.4);
 surface.addColorStop(0,'#a6d6e332');surface.addColorStop(.65,'#a4cbd118');surface.addColorStop(1,'#c9e7ec00');
 ctx.fillStyle=surface;ctx.beginPath();ctx.ellipse(W*.5,cy,W*.47,H*.23,0,0,TWO);ctx.fill();
 ctx.strokeStyle='#8cafbb70';ctx.lineWidth=1.3;ctx.beginPath();ctx.ellipse(W*.5,cy,W*.47,H*.23,0,0,TWO);ctx.stroke();
 ctx.strokeStyle='#ffffffbb';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(W*.5,cy+7,W*.43,H*.19,0,0,TWO);ctx.stroke();
 for(let q=0;q<6;q++){const lx=W*(.17+q*.135);ctx.beginPath();ctx.moveTo(lx,H*.46);ctx.lineTo(lx+Math.sin(time*.0004+q)*6,H*.78);ctx.strokeStyle='#9ebac33c';ctx.stroke()}
 ctx.restore();
  // Readable destination and route.
 const startX=m.start[0]*W,startY=m.start[1]*H;
 circle(startX,startY,Math.min(W,H)*.025,'#e1edee','#9db8c3',1);
 ctx.font='600 11px "DM Sans",sans-serif';ctx.fillStyle='#73909e';ctx.textAlign='center';ctx.fillText('BAŞLANGIÇ',startX,startY-25);
 const target=currentTarget();
 ctx.beginPath();ctx.setLineDash([5,9]);ctx.moveTo(s.x*W,s.y*H);ctx.lineTo(target[0]*W,target[1]*H);ctx.strokeStyle='#557ccf55';ctx.lineWidth=1.4;ctx.stroke();ctx.setLineDash([]);
 drawTarget(m.target[0]*W,m.target[1]*H,Math.max(16,Math.min(W,H)*.028),time,'HEDEF');
 m.check.forEach((p,i)=>drawTarget(p[0]*W,p[1]*H,Math.max(12,Math.min(W,H)*.023),time,'DURAK '+(i+1),s.checkIndex>i));
 m.blocks.forEach((p,i)=>drawObstacle(p[0]*W,p[1]*H,p[2]*Math.min(W,H),time,i));
 if(s.trail.length>1){ctx.beginPath();ctx.moveTo(s.trail[0][0]*W,s.trail[0][1]*H);s.trail.forEach(p=>ctx.lineTo(p[0]*W,p[1]*H));ctx.strokeStyle='#5a9eb2aa';ctx.lineWidth=2.5;ctx.stroke()}
 drawMiniRobot(s.x*W,s.y*H,s.angle,time);
 ctx.restore();
}

function render(time){
 if(!last)last=time;let dt=Math.min((time-last)/1000,.033);last=time;t=time;
 if(mode==='running'&&!paused&&model){if(precision){simulate(dt*.5);if(mode==='running')simulate(dt*.5)}else simulate(dt)}
 drawBackground(time);
 if(mode==='build')drawBuild(time);else if(model)drawArena(time);
 // Abstract orbital overlays
 // Canvas contains the complete stage; overlays are HTML for crisp responsive typography.
 if((Math.floor(time/120)!==Math.floor((time-dt*1000)/120))&&mode==='running')updateLive();
 requestAnimationFrame(render);
}
function updateLive(){if(!model)return;let en=Math.round(model.energy/model.energyMax*100);$('statEnergy').textContent=en+'%';$('barEnergy').style.width=en+'%';$('clock').textContent=timeFormat(model.time);$('missionPercent').textContent=Math.round(model.progress*100)+'%';$('missionProgress').style.width=(model.progress*100)+'%'}
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
 let nearest=choices[0];return nearest&&nearest.d<unit*.84?{x:nearest.gx,y:nearest.gy}:null;
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
 return '<p><strong>Başlamak çok kolay:</strong> Önce hazır robotu çalıştırıp ne olduğunu izle. Sonra bir hücre değiştirip yeniden dene.</p>'+
 '<p><strong>1.</strong> Alttan bir hücre seç. Robotun çevresinde parlayan + yuvalarına dokunarak ekle. Merkezdeki destek hücresi sabittir.</p>'+
 '<p><strong>2.</strong> Kas hücreleri ileri itki sağlar. Yerlerini dengeli tutmazsan robot döner.</p>'+
 '<p><strong>3.</strong> Duyu hücresi ışığa ve yakındaki engellere yönelmeyi kolaylaştırır. Enerji hücresi hareket süresini uzatır.</p>'+
 '<p><strong>4.</strong> Canlandır tuşuna bas. Başarısız olursa düzenle ve yeniden dene. Klavye: 1–4 hücre, X sil, R çalıştır, Z geri al.</p>'+
 '<p><strong>Bilimsel not:</strong> Xenobot ve biyohibrit robot araştırmalarından esinlenen bu oyun, soyut bir fizik modelidir. Gerçek hücre davranışını veya biyolojik deney sonucunu tahmin etmez.</p>'+
 '<div class="action-row"><button class="mini-btn strong" data-action="close">OYUNA DÖN</button><a class="mini-btn" href="https://wyss.harvard.edu/technology/xenobots/" target="_blank" rel="noopener noreferrer">ARAŞTIRMA ↗</a></div>';
}
function renderDrawer(){
 if(!drawerType)return;const titles={missions:'Görev seç',biology:'Hücreler',analysis:'Robot analizi',settings:'Ayarlar',help:'Nasıl oynanır?'};
 $('drawer').innerHTML='<header class="drawer-head"><div><div class="mono small muted">BIO ROBOT / LAB 001</div><h2>'+titles[drawerType]+'</h2></div><button class="xbtn" data-action="close" aria-label="Menüyü kapat">×</button></header>'+panelHTML(drawerType);
 $('drawer').classList.add('open');$('drawerBack').classList.add('open');
}
function openDrawer(type){
 if(drawerType===type){closeDrawer();return}
 drawerType=type;document.querySelectorAll('[data-panel]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.panel===type)));renderDrawer();
}
function closeDrawer(){
 drawerType='';$('drawer').classList.remove('open');$('drawerBack').classList.remove('open');document.querySelectorAll('[data-panel]').forEach(el=>el.setAttribute('aria-pressed','false'));
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
$('drawerBack').addEventListener('click',closeDrawer);
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
$('introRun').addEventListener('click',()=>{
 startModel();
});
$('introEdit').addEventListener('click',()=>{
 tutorialSeen=true;
 try{localStorage.setItem(FIRST_KEY,'1')}catch(e){}
 nextTipDismissed=false;
 hasPlayed=true;
 update();
});
$('tipClose').addEventListener('click',()=>{
 nextTipDismissed=true;
 update();
});
$('runBtn').addEventListener('click',stepButton);
$('resumeBtn').addEventListener('click',()=>{if(mode==='running'&&paused)stepButton()});
$('pauseEditBtn').addEventListener('click',enterBuild);
$('fullscreenBtn').addEventListener('click',fullscreen);
$('closeResult').addEventListener('click',()=>{$('resultScrim').classList.remove('open')});
$('retryBtn').addEventListener('click',()=>run());
$('editBtn').addEventListener('click',enterBuild);
$('shareBtn').addEventListener('click',share);
$('nextMissionBtn').addEventListener('click',()=>{if(level<MISSIONS.length-1){setLevel(level+1);nextTipDismissed=false;update()}});
$('resultScrim').addEventListener('click',e=>{if(e.target===$('resultScrim'))$('resultScrim').classList.remove('open')});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){$('resultScrim').classList.remove('open');closeDrawer();return}
 if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
 if(e.key>='1'&&e.key<='4'){selectCell(['core','muscle','sensor','energy'][Number(e.key)-1]);return}
 if(e.key.toLowerCase()==='x'){selectCell('erase');return}
 if(e.key.toLowerCase()==='r'){stepButton();return}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo()}
});
document.addEventListener('visibilitychange',()=>{last=performance.now()});
window.addEventListener('pageshow',()=>{last=performance.now()});
load();try{const q=new URLSearchParams(location.search),lv=Number(q.get('level'));if(lv>=1&&lv<=4)level=lv-1}catch(e){}
resize();window.addEventListener('resize',resize,{passive:true});update();
if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)ambient=false;
requestAnimationFrame(render);
})();