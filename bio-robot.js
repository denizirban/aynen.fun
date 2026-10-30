/* BIO ROBOT / aynen.fun — deterministic toy hydrodynamics, not a biological prediction model */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const canvas=$('field'), ctx=canvas.getContext('2d',{alpha:false});
const MAX=24, LIMIT=24, STORAGE='aynen-bio-robot-v1';
const cellInfo={
 core:{color:'#a5cdb6',outline:'#5b967a',nucleus:'#6eae92',label:'Destek'},
 muscle:{color:'#ecabb2',outline:'#cb7f8f',nucleus:'#d28691',label:'Kas'},
 sensor:{color:'#a1d1de',outline:'#689eac',nucleus:'#69adbb',label:'Duyu'},
 energy:{color:'#ecd19a',outline:'#c4a365',nucleus:'#cba962',label:'Enerji'}
};
const MISSIONS=[
 {name:'Hareket et',desc:'Hedef çizgisine ulaş. Düz gidebilmek sandığından zor.',hint:'Kas hücresini merkezin üstüne ve altına dengeli yerleştirerek dönüşü azaltabilirsin.'},
 {name:'Engelden kaç',desc:'Jel havuzundaki iki engele çarpmadan bitişe git.',hint:'Duyu hücresi ön taraftaysa engellere yaklaşırken rotayı daha iyi düzeltebilir.'},
 {name:'Işığı bul',desc:'Işık yukarıda. Robotun hedefe yönelmesi gerekiyor.',hint:'Işık kaynağına yönelmek için duyu hücresini öne, itki hücrelerini dengeli yerleştir.'}
];
let cells=defaultCells(),selected='muscle',mirror=false,level=0,version=1,saved=null,history=[],mode='build',sim=null,report=null;
let w=700,h=438,dpr=1,unit=39,last=0,frameTime=0,painted='',lastToast=0,toastTimer=null;
const dots=Array.from({length:42},(_,i)=>({x:((i*83.71)%97)/100,y:((i*39.47)%91)/100,r:.8+(i%4)*.48,phase:i*.73}));
function defaultCells(){return [{x:0,y:0,type:'core'},{x:-1,y:0,type:'muscle'},{x:0,y:1,type:'energy'},{x:1,y:0,type:'sensor'}]}
function key(x,y){return x+','+y}
function get(x,y){return cells.find(c=>c.x===x&&c.y===y)}
function clone(){return cells.map(c=>({x:c.x,y:c.y,type:c.type}))}
function count(type){return cells.filter(c=>c.type===type).length}
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function norm(a){while(a>Math.PI)a-=Math.PI*2;while(a< -Math.PI)a+=Math.PI*2;return a}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function accessible(el,val){el.setAttribute('aria-pressed',String(!!val))}
function toast(s){const el=$('toast');el.textContent=s;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2300)}
function readSaved(){try{const s=JSON.parse(localStorage.getItem(STORAGE)||'null');if(s&&Array.isArray(s.cells)&&s.cells.length&&s.cells.length<=MAX&&s.cells.some(c=>c.x===0&&c.y===0)){const items=s.cells.filter(c=>Number.isInteger(c.x)&&Number.isInteger(c.y)&&Math.abs(c.x)<=5&&Math.abs(c.y)<=4&&cellInfo[c.type]);if(items.length===s.cells.length&&new Set(items.map(c=>key(c.x,c.y))).size===items.length&&connected(items)){saved=items.map(c=>({...c}));cells=cloneSaved(saved);version=clamp(Number(s.version)||1,1,999);}}}catch(e){}}
function cloneSaved(s){return s.map(c=>({x:c.x,y:c.y,type:c.type}))}
function connected(arr){const todo=[arr.find(c=>c.x===0&&c.y===0)].filter(Boolean);const seen=new Set(todo.map(c=>key(c.x,c.y)));while(todo.length){const a=todo.pop();arr.forEach(c=>{let k=key(c.x,c.y);if(!seen.has(k)&&Math.abs(c.x-a.x)<=1&&Math.abs(c.y-a.y)<=1){seen.add(k);todo.push(c)}})}return seen.size===arr.length}
function save(){try{saved=clone();localStorage.setItem(STORAGE,JSON.stringify({cells:saved,version:version}));$('savedLabel').textContent='SÜRÜM '+version+' KAYDEDİLDİ';toast('Robot v'+version+' kaydedildi.');version=Math.min(999,version+1)}catch(e){toast('Tarayıcıda kayıt yapılamadı.')}}
function restore(){if(!saved){toast('Henüz kaydedilmiş tasarım yok.');return}history.push(clone());cells=cloneSaved(saved);stopToBuild();refresh();toast('Son kayıt geri yüklendi.')}
function undo(){if(mode!=='build'){stopToBuild();return}if(!history.length){toast('Geri alınacak değişiklik yok.');return}cells=history.pop();refresh()}
function available(x,y){if(x===0&&y===0)return false;if(Math.abs(x)>5||Math.abs(y)>4)return false;return cells.some(c=>Math.abs(c.x-x)<=1&&Math.abs(c.y-y)<=1)}
function modify(x,y,quiet){
 if(mode!=='build')return false;
 if(!Number.isInteger(x)||!Number.isInteger(y)||Math.abs(x)>5||Math.abs(y)>4)return false;
 const current=get(x,y);
 if(selected==='erase'){
  if(!current||x===0&&y===0)return false;
  const next=cells.filter(c=>c!==current);
  if(!connected(next)){if(!quiet)toast('Gövdeyi koparamazsın. Önce uçtaki hücreyi sil.');return false}
  history.push(clone());cells=next;return true;
 }
 if(current||cells.length>=MAX||!available(x,y)){if(cells.length>=MAX&&!quiet)toast('En fazla 24 hücre kullanabilirsin.');return false}
 history.push(clone());cells.push({x,y,type:selected});return true;
}
function edit(x,y){
 let changed=modify(x,y,false);
 if(mirror&&y!==0&&selected!=='erase'&&cells.length<MAX)changed=modify(x,-y,true)||changed;
 if(mirror&&y!==0&&selected==='erase')changed=modify(x,-y,true)||changed;
 if(changed)refresh();
}
function setSelected(v){
 if(mode!=='build')stopToBuild();
 selected=v;
 document.querySelectorAll('[data-cell]').forEach(btn=>accessible(btn,btn.dataset.cell===v));
 $('field').style.cursor=v==='erase'?'cell':'crosshair';
 $('worldSubtitle').textContent=v==='erase'?'HÜCREYİ SİLMEK İÇİN DOKUN':'DOKUNARAK YERLEŞTİR • SÜRÜKLEYEREK ÇİZ';
}
function setLevel(n){if(!Number.isInteger(n)||n<0||n>2)return;level=n;stopToBuild();document.querySelectorAll('.mission').forEach(b=>b.classList.toggle('active',Number(b.dataset.level)===n));refresh()}
function preset(){
 history.push(clone());
 if(count('muscle')<=1){cells=[{x:0,y:0,type:'core'},{x:-1,y:-1,type:'muscle'},{x:-1,y:1,type:'muscle'},{x:1,y:0,type:'sensor'},{x:0,y:1,type:'energy'},{x:0,y:-1,type:'core'}];toast('Dengeli tasarım yüklendi.')}
 else if(count('sensor')===0){cells=[{x:0,y:0,type:'core'},{x:-1,y:-1,type:'muscle'},{x:-1,y:1,type:'muscle'},{x:1,y:0,type:'sensor'},{x:0,y:1,type:'energy'},{x:0,y:-1,type:'core'}];toast('Dengeli tasarım yüklendi.')}
 else{cells=[{x:0,y:0,type:'core'},{x:-1,y:-1,type:'muscle'},{x:-2,y:-1,type:'muscle'},{x:-1,y:1,type:'muscle'},{x:1,y:-1,type:'sensor'},{x:1,y:0,type:'sensor'},{x:0,y:1,type:'energy'}];toast('Asimetrik tasarım yüklendi.')}
 stopToBuild();refresh()
}
function stats(){
 const n=cells.length,m=count('muscle'),s=count('sensor'),e=count('energy');
 const cy=cells.reduce((a,c)=>a+c.y,0)/n;
 const moment=cells.filter(c=>c.type==='muscle').reduce((a,c)=>a+(c.y-cy),0);
 const balance=clamp(Math.round(100-Math.abs(moment)*23- Math.max(0,n-13)*1.2),7,100);
 const thrust=m?Math.round((m*1.4/(.7+n*.15))*10)/10:0;
 const capacity=80+e*46;
 const consumption=2.7+n*.24+m*1.15+s*.18;
 return {n,m,s,e,cy,moment,balance,thrust,capacity,consumption}
}
function refresh(){
 const z=stats();
 $('robotName').textContent='Robot v'+version;
 $('missionDesc').textContent=MISSIONS[level].desc;
 $('countValue').textContent=z.n+' / '+MAX;$('countBar').style.width=(z.n/MAX*100)+'%';
 $('thrustValue').textContent=z.thrust.toFixed(1);$('thrustBar').style.width=Math.min(100,z.thrust*20)+'%';
 $('balanceValue').textContent=z.balance+'%';$('balanceBar').style.width=z.balance+'%';
 const energyPct=sim&&mode==='running'?Math.round(sim.energy/sim.capacity*100):100;
 $('energyValue').textContent=energyPct+'%';$('energyBar').style.width=energyPct+'%';
 $('composition').textContent=z.m+' kas · '+z.s+' duyu · '+z.e+' enerji · '+count('core')+' destek';
 let txt=MISSIONS[level].hint;
 if(!z.m)txt='Kas hücresi olmadan robot hareket edemez.';
 else if(!z.e)txt='Enerji hücresi olmadan da çalışır; fakat daha erken durur.';
 else if(z.balance<50)txt='Kas hücreleri dengesiz dağıldığı için robot kendi etrafında dönebilir.';
 else if(level>0&&!z.s)txt='Bu görevde duyu hücresi hareketi ciddi şekilde kolaylaştırır.';
 $('tipText').textContent=txt;
 $('runBtn').disabled=z.m===0&&mode==='build';
 if(mode==='build'){$('worldTitle').textContent='HÜCRE DÜZENİ';$('worldState').textContent='READY TO BUILD';$('phase').textContent='● TASARIM';$('worldSubtitle').textContent='DOKUNARAK YERLEŞTİR • SÜRÜKLEYEREK ÇİZ';$('runBtn').innerHTML='CANLANDIR <span>↗</span>'}
}
function resize(){
 const r=canvas.getBoundingClientRect();
 w=Math.max(300,r.width);h=Math.max(270,r.height);
 dpr=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
 unit=clamp(Math.min((w-40)/12,(h-95)/10),18,39);
 if(mode==='running'&&sim)sim.geometry=geometry();
}
function worldCell(x,y){return{x:w*.5+x*unit,y:h*.52+y*unit}}
function toGrid(event){const r=canvas.getBoundingClientRect(),p={x:event.clientX-r.left,y:event.clientY-r.top};let x=Math.round((p.x-w*.5)/unit),y=Math.round((p.y-h*.52)/unit);const q=worldCell(x,y);if(Math.hypot(p.x-q.x,p.y-q.y)>unit*.63)return null;return {x,y}}
function tryPaint(e){const p=toGrid(e);if(!p)return;const k=key(p.x,p.y);if(k===painted)return;painted=k;edit(p.x,p.y)}
canvas.addEventListener('pointerdown',e=>{if(mode!=='build')return;if(e.button!==0&&e.pointerType==='mouse')return;canvas.setPointerCapture(e.pointerId);painted='';tryPaint(e)});
canvas.addEventListener('pointermove',e=>{if(mode==='build'&&e.buttons&&canvas.hasPointerCapture(e.pointerId))tryPaint(e)});
canvas.addEventListener('pointerup',()=>painted='');
canvas.addEventListener('pointercancel',()=>painted='');
canvas.addEventListener('contextmenu',e=>{e.preventDefault();if(mode==='build'){const p=toGrid(e);if(p){const sel=selected;selected='erase';edit(p.x,p.y);selected=sel}}});
canvas.addEventListener('keydown',e=>{if(mode!=='build')return;if(e.key==='Enter'||e.key===' '){e.preventDefault();const p={x:1,y:0};edit(p.x,p.y)}});
function disk(x,y,r,a,b,alpha){ctx.beginPath();ctx.fillStyle=a;ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();if(b){ctx.strokeStyle=b;ctx.lineWidth=1.2;ctx.stroke()}}
function bg(t){
 ctx.fillStyle='#f2f6f1';ctx.fillRect(0,0,w,h);
 const g=ctx.createRadialGradient(w*.47,h*.48,30,w*.47,h*.48,w*.73);g.addColorStop(0,'#fcfefb');g.addColorStop(1,'#ebf2ec');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 dots.forEach(d=>{let x=d.x*w+Math.sin(t*.00018+d.phase)*5,y=d.y*h+Math.cos(t*.0002+d.phase)*6;disk(x,y,d.r,'rgba(112,151,139,.16)')});
}
function cell(x,y,r,type,t,idx,active){
 const info=cellInfo[type],wave=1+Math.sin(t*.0025+idx*2.3)*.045;
 r*=wave;
 ctx.save();ctx.shadowBlur=active?18:10;ctx.shadowColor=info.color+'78';
 const gradient=ctx.createRadialGradient(x-r*.34,y-r*.4,r*.05,x,y,r*1.16);
 gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.26,info.color);gradient.addColorStop(.79,info.color);gradient.addColorStop(1,info.outline);
 disk(x,y,r,gradient,info.outline);
 ctx.shadowBlur=0;
 ctx.lineWidth=.8;ctx.strokeStyle='#ffffff99';
 ctx.beginPath();ctx.ellipse(x-r*.2,y-r*.18,r*.63,r*.39,-.7,Math.PI*.18,Math.PI*1.53);ctx.stroke();
 disk(x+Math.sin(idx*2)*r*.13,y+Math.cos(idx*2)*r*.12,r*.27,info.nucleus,info.outline);
 disk(x+Math.sin(idx*2)*r*.1-r*.07,y+Math.cos(idx*2)*r*.12-r*.07,r*.09,'#ffffff77');
 if(type==='muscle'){ctx.strokeStyle='#a65e73aa';ctx.lineWidth=1.7;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(x-r*.62,y+i*r*.24);ctx.lineTo(x+r*.55,y+i*r*.24);ctx.stroke()}}
 if(type==='sensor'){ctx.strokeStyle='#539ca688';ctx.lineWidth=1;for(let i=0;i<5;i++){let ang=(i*72-30)*Math.PI/180;ctx.beginPath();ctx.moveTo(x+Math.cos(ang)*r*.6,y+Math.sin(ang)*r*.6);ctx.lineTo(x+Math.cos(ang)*r*.88,y+Math.sin(ang)*r*.88);ctx.stroke()}}
 if(type==='energy'){for(let i=0;i<4;i++){disk(x+Math.cos(i*1.57)*r*.58,y+Math.sin(i*1.57)*r*.58,r*.068,'#fff3c5')}}
 ctx.restore();
}
function drawBuild(t){
 const cs=unit;
 ctx.save();ctx.strokeStyle='rgba(78,114,95,.09)';ctx.lineWidth=1;
 for(let x=-5;x<=5;x++)for(let y=-4;y<=4;y++){const p=worldCell(x,y);disk(p.x,p.y,1.25,'#a7c2b1');if(!get(x,y)&&available(x,y)){ctx.beginPath();ctx.arc(p.x,p.y,cs*.38,0,Math.PI*2);ctx.strokeStyle='#a7bcab55';ctx.stroke()}}
 ctx.strokeStyle='#8bac9860';ctx.setLineDash([4,7]);ctx.beginPath();ctx.moveTo(w*.5-6*cs,h*.52);ctx.lineTo(w*.5+6*cs,h*.52);ctx.stroke();ctx.setLineDash([]);
 ctx.fillStyle='#93a69b';ctx.font='10px DM Mono,monospace';ctx.fillText('FRONT →',Math.min(w-87,w*.5+4*cs),h*.52-11);
 cells.forEach((c,i)=>{for(const d of [[1,0],[0,1]]){const k=get(c.x+d[0],c.y+d[1]);if(k){const a=worldCell(c.x,c.y),b=worldCell(k.x,k.y);ctx.lineWidth=cs*.43;ctx.strokeStyle='#aac6b4b9';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}}});
 cells.forEach((c,i)=>{const p=worldCell(c.x,c.y);cell(p.x,p.y,cs*.42,c.type,t,i,false)});
 ctx.restore();
}
function geometry(){
 const radius=clamp(14+Math.sqrt(cells.length)*2.5,19,38);
 const obstacles=level===0?[]:level===1?[{x:w*.46,y:h*.51,r:Math.min(38,h*.105)},{x:w*.69,y:h*.67,r:Math.min(30,h*.08)}]:[{x:w*.43,y:h*.46,r:Math.min(33,h*.085)},{x:w*.66,y:h*.59,r:Math.min(36,h*.095)}];
 return {radius,obstacles,target:{x:w*.84,y:level===2?h*.27:h*.52,r:Math.min(26,h*.074)},start:{x:w*.14,y:level===2?h*.75:h*.52}};
}
function start(){
 if(mode==='running'){finish(false,'stopped');return}
 const z=stats();
 if(!z.m){toast('Hareket için en az bir kas hücresi ekle.');return}
 $('result').classList.remove('show');report=null;
 const geo=geometry();
 sim={x:geo.start.x,y:geo.start.y,angle:0,vx:0,vy:0,omega:0,t:0,energy:z.capacity,capacity:z.capacity,stats:z,geometry:geo,hit:0,trail:[],progress:0,reason:null};
 mode='running';$('phase').textContent='● CANLI DENEY';$('worldTitle').textContent='MİKRO HAVUZ';$('worldSubtitle').textContent='HAREKET GERÇEK ZAMANLI HESAPLANIYOR';$('worldState').textContent='SIMULATION / LIVE';$('runBtn').innerHTML='DURDUR ■';$('runBtn').disabled=false;document.querySelectorAll('[data-cell]').forEach(b=>b.disabled=true);
}
function stopToBuild(){
 mode='build';sim=null;report=null;$('result').classList.remove('show');
 document.querySelectorAll('[data-cell]').forEach(b=>b.disabled=false);
 refresh();
}
function collide(c,r,o){
 let dx=c.x-o.x,dy=c.y-o.y,d=Math.hypot(dx,dy)||.0001;
 if(d<r+o.r){let nx=dx/d,ny=dy/d,depth=r+o.r-d;c.x+=nx*depth;c.y+=ny*depth;return {nx,ny}}return null
}
function step(dt){
 const s=sim,z=s.stats,g=s.geometry,target=g.target,motors=cells.filter(c=>c.type==='muscle'),sensors=cells.filter(c=>c.type==='sensor');
 const mass=.76+z.n*.13;
 let fx=0,fy=0,torque=0;
 const dir={x:Math.cos(s.angle),y:Math.sin(s.angle)};
 const cx=cells.reduce((a,c)=>a+c.x,0)/z.n;
 const cy=cells.reduce((a,c)=>a+c.y,0)/z.n;
 motors.forEach(c=>{
  const power=122/mass;
  fx+=dir.x*power;fy+=dir.y*power;
  torque+=-(c.y-cy)*.93; // motor off-axis force -> turning moment
 });
 if(sensors.length){
  let desired=Math.atan2(target.y-s.y,target.x-s.x);
  const senseBonus=sensors.reduce((a,c)=>a+(c.x>=cx?1:.65),0);
  let avoid=0,nearest=Infinity;
  for(const o of g.obstacles){
   const d=dist(s,o),a=norm(Math.atan2(o.y-s.y,o.x-s.x)-s.angle);
   if(d<155&&Math.abs(a)<1.32&&d<nearest){nearest=d;
    const relativeY=Math.sin(-s.angle)*(o.x-s.x)+Math.cos(-s.angle)*(o.y-s.y);
    const turn=relativeY>=0?-1:1;
    avoid=turn*(1-d/170)*2.15;
   }
  }
  const error=norm(desired-s.angle);
  torque+=clamp(error*1.9,-1.45,1.45)*Math.min(2.1,senseBonus)*.95+avoid*Math.min(1.9,senseBonus);
 }
 s.omega+=clamp(torque,-3.4,3.4)*dt;
 s.omega*=Math.exp(-2.5*dt);s.omega=clamp(s.omega,-2.35,2.35);
 s.angle=norm(s.angle+s.omega*dt);
 // Fluid resistance, cell-derived force and weak laminar current.
 fx+=Math.sin(s.t*.43+level)*2.1;fy+=Math.sin(s.t*.63+s.x*.012)*5.5;
 s.vx=(s.vx+fx*dt)*Math.exp(-1.85*dt);
 s.vy=(s.vy+fy*dt)*Math.exp(-1.85*dt);
 const speed=Math.hypot(s.vx,s.vy);
 if(speed>156){s.vx*=156/speed;s.vy*=156/speed}
 s.x+=s.vx*dt;s.y+=s.vy*dt;s.t+=dt;
 const r=g.radius;
 for(const o of g.obstacles){
  const hit=collide(s,r,o);
  if(hit){const toward=s.vx*hit.nx+s.vy*hit.ny;if(toward<0){s.vx-=toward*1.6*hit.nx;s.vy-=toward*1.6*hit.ny}if(s.t-s.hit>.32){s.energy=Math.max(0,s.energy-8);s.hit=s.t}}
 }
 if(s.x<r+8){s.x=r+8;s.vx=Math.abs(s.vx)*.25}
 if(s.y<r+9){s.y=r+9;s.vy=Math.abs(s.vy)*.35}
 if(s.y>h-r-9){s.y=h-r-9;s.vy=-Math.abs(s.vy)*.35}
 if(s.x>w-r-8){s.x=w-r-8;s.vx=-Math.abs(s.vx)*.25}
 s.energy=Math.max(0,s.energy-z.consumption*dt*(1+.08*z.m));
 s.progress=clamp((s.x-g.start.x)/(g.target.x-g.start.x),0,1);
 if(!s.trail.length||Math.hypot(s.x-s.trail[s.trail.length-1].x,s.y-s.trail[s.trail.length-1].y)>3){s.trail.push({x:s.x,y:s.y});if(s.trail.length>390)s.trail.shift()}
 if(dist(s,target)<r+target.r){finish(true,'success');return}
 if(s.energy<=0||s.t>=LIMIT)finish(false,s.energy<=0?'energy':'time');
}
function finish(ok,reason){
 if(!sim)return;const s=sim;
 const reached=ok?100:Math.round(s.progress*100);
 report={success:ok,progress:reached,energy:Math.round(s.energy/s.capacity*100),time:s.t.toFixed(1),hits:s.hit?1:0};
 mode='finished';$('phase').textContent=ok?'● HEDEFE ULAŞTI':'● DENEY BİTTİ';
 $('worldState').textContent=ok?'MISSION COMPLETE':'SIMULATION / ENDED';
 $('resultKicker').textContent='DENEY '+(ok?'TAMAMLANDI':'SONLANDI');
 $('resultTitle').textContent=ok?'Hareket etti.':'Tekrar dene.';
 let desc='';
 if(ok)desc='Bu gövde hedefe ulaştı. Aynı işi daha az hücreyle veya daha az enerjiyle yapabilir misin?';
 else if(reason==='energy')desc='Enerjisi bitti. Enerji hücresi ekle, gövdeyi hafiflet veya kaslarının yerini değiştir.';
 else if(reason==='time')desc='Süre doldu. Robotunun yönü ve itki dağılımını değiştir.';
 else desc='Deneyi durdurdun. Tasarımı değiştirip yeniden deneyebilirsin.';
 if(!ok&&Math.abs(s.stats.moment)>1.2)desc='Robot dönmeye çok zaman harcadı. Kasları gövdenin iki yanına daha dengeli dağıt.';
 if(!ok&&level>0&&s.stats.s===0)desc='Hedefe yönelmek zor. Öne bir duyu hücresi yerleştirerek tekrar dene.';
 $('resultDescription').textContent=desc;
 $('metricDist').textContent=reached+'%';$('metricEnergy').textContent=report.energy+'%';$('metricTime').textContent=report.time+'s';
 $('result').classList.add('show');$('runBtn').innerHTML='DÜZENLE ↗';$('runBtn').disabled=false;
 $('energyValue').textContent=report.energy+'%';$('energyBar').style.width=report.energy+'%';
 try{const k='aynen-bio-best-'+level;const best=JSON.parse(localStorage.getItem(k)||'null');if(!best||report.success&&!best.success||report.success===best.success&&report.progress>best.progress)localStorage.setItem(k,JSON.stringify(report))}catch(e){}
}
function drawRun(t){
 const s=sim;if(!s)return;const g=s.geometry,goal=g.target;
 ctx.save();
 // Moving fluid streamlines
 ctx.strokeStyle='#90bcb022';ctx.lineWidth=1;
 for(let j=0;j<7;j++){const y=h*(.16+j*.115);ctx.beginPath();for(let x=-10;x<=w+10;x+=12){let yy=y+Math.sin(x*.017+t*.0003+j)*9;if(x===-10)ctx.moveTo(x,yy);else ctx.lineTo(x,yy)}ctx.stroke()}
 // target halo
 const halo=ctx.createRadialGradient(goal.x,goal.y,4,goal.x,goal.y,75);halo.addColorStop(0,level===2?'#e7d59c88':'#a0caba77');halo.addColorStop(1,'#a0caba00');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(goal.x,goal.y,75,0,Math.PI*2);ctx.fill();
 disk(goal.x,goal.y,goal.r+11,'#ffffff00','#81b399');
 ctx.setLineDash([4,5]);ctx.beginPath();ctx.strokeStyle='#6f9b83aa';ctx.lineWidth=1;ctx.arc(goal.x,goal.y,goal.r+7,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
 disk(goal.x,goal.y,goal.r,level===2?'#f4e2a48a':'#b7dfbd93','#8cb8a1');
 disk(goal.x,goal.y,7,level===2?'#d9b65c':'#79b18c');
 ctx.font='10px DM Mono,monospace';ctx.fillStyle='#698873';ctx.textAlign='center';ctx.fillText(level===2?'IŞIK':'HEDEF',goal.x,goal.y-goal.r-21);
 for(const o of g.obstacles){disk(o.x,o.y,o.r+6,'#ffffff00','#9dbab0');const grd=ctx.createRadialGradient(o.x-o.r*.3,o.y-o.r*.3,2,o.x,o.y,o.r);grd.addColorStop(0,'#c8d6cf');grd.addColorStop(1,'#9cb9ac');disk(o.x,o.y,o.r,grd,'#81a597');disk(o.x-o.r*.24,o.y-o.r*.24,o.r*.28,'#d9e8dc88')}
 if(s.trail.length>1){ctx.beginPath();ctx.moveTo(s.trail[0].x,s.trail[0].y);s.trail.forEach(p=>ctx.lineTo(p.x,p.y));ctx.strokeStyle='#7da99866';ctx.lineWidth=1.5;ctx.stroke()}
 ctx.translate(s.x,s.y);ctx.rotate(s.angle);
 const scale=clamp(g.radius/30,.68,1.22)*.7;
 const rr=Math.max(10,Math.min(18,w/50));
 const centerX=cells.reduce((a,c)=>a+c.x,0)/cells.length,centerY=cells.reduce((a,c)=>a+c.y,0)/cells.length;
 ctx.strokeStyle='#80b89c99';ctx.lineWidth=rr*.7*scale;ctx.lineCap='round';
 for(let i=0;i<cells.length;i++){const c=cells[i];for(const other of cells){if((other.x===c.x+1&&other.y===c.y)||(other.x===c.x&&other.y===c.y+1)){ctx.beginPath();ctx.moveTo((c.x-centerX)*rr*1.45*scale,(c.y-centerY)*rr*1.45*scale);ctx.lineTo((other.x-centerX)*rr*1.45*scale,(other.y-centerY)*rr*1.45*scale);ctx.stroke()}}}
 cells.forEach((c,i)=>cell((c.x-centerX)*rr*1.45*scale,(c.y-centerY)*rr*1.45*scale,rr*.7*scale,c.type,t,i,true));
 ctx.restore();
 // Timer and live energy track
 ctx.fillStyle='#5b8272';ctx.font='11px DM Mono,monospace';ctx.textAlign='right';ctx.fillText(s.t.toFixed(1)+' s / '+LIMIT+' s',w-23,28);
 ctx.fillStyle='#dce8dd';ctx.fillRect(w-125,39,101,4);ctx.fillStyle='#76a88c';ctx.fillRect(w-125,39,101*s.energy/s.capacity,4);
}
function drawFinished(t){drawRun(t)}
function render(t){
 if(!last)last=t;const dt=Math.min(.033,(t-last)/1000);last=t;frameTime=t;
 if(mode==='running'&&sim)step(dt);
 bg(t);
 if(mode==='build')drawBuild(t);
 else if(sim)drawRun(t);
 if(mode==='running'&&sim&&Math.floor(t/150)!==Math.floor((t-dt*1000)/150))refreshLive();
 requestAnimationFrame(render);
}
function refreshLive(){
 if(!sim)return;const q=Math.round(sim.energy/sim.capacity*100);
 $('energyValue').textContent=q+'%';$('energyBar').style.width=q+'%';
 $('worldState').textContent=Math.round(sim.progress*100)+'% / HEDEFE';
}
function share(){
 let text='BIO ROBOT — '+MISSIONS[level].name+'. ';
 if(report)text+=report.progress+'% ilerleme, '+report.energy+'% enerji. ';
 text+='Benim robotumu geçebilir misin?';
 const url=location.origin+'/bio-robot.html?level='+(level+1);
 if(navigator.share)navigator.share({title:'BIO ROBOT / aynen.fun',text,url}).catch(()=>{});
 else if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text+' '+url).then(()=>toast('Bağlantı kopyalandı.')).catch(()=>toast('Paylaşım desteklenmiyor.'));
 else{const a=document.createElement('textarea');a.value=text+' '+url;document.body.append(a);a.select();try{document.execCommand('copy');toast('Bağlantı kopyalandı.')}catch(e){toast(url)}a.remove()}
}
document.querySelectorAll('[data-cell]').forEach(btn=>btn.addEventListener('click',()=>setSelected(btn.dataset.cell)));
document.querySelectorAll('[data-level]').forEach(btn=>btn.addEventListener('click',()=>setLevel(Number(btn.dataset.level))));
$('runBtn').addEventListener('click',()=>mode==='finished'?stopToBuild():start());
$('retryBtn').addEventListener('click',stopToBuild);
$('resultClose').addEventListener('click',()=>{$('result').classList.remove('show')});
$('shareBtn').addEventListener('click',share);
$('undoBtn').addEventListener('click',undo);
$('presetBtn').addEventListener('click',preset);
$('saveBtn').addEventListener('click',save);
$('restoreBtn').addEventListener('click',restore);
$('mirrorBtn').addEventListener('click',()=>{mirror=!mirror;accessible($('mirrorBtn'),mirror);$('mirrorBtn').textContent='◇ Simetri: '+(mirror?'Açık':'Kapalı');$('mirrorBtn').classList.toggle('selected',mirror);toast(mirror?'Simetrik yerleştirme açık.':'Simetrik yerleştirme kapalı.')});
const openHelp=()=>{$('helpOverlay').classList.add('show');$('helpClose').focus()};
const closeHelp=()=>{$('helpOverlay').classList.remove('show');$('helpBtn').focus()};
$('helpBtn').addEventListener('click',openHelp);$('helpClose').addEventListener('click',closeHelp);$('helpDone').addEventListener('click',closeHelp);
$('helpOverlay').addEventListener('click',e=>{if(e.target===$('helpOverlay'))closeHelp()});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('helpOverlay').classList.contains('show'))closeHelp();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo()}});
try{const qs=new URLSearchParams(location.search),n=Number(qs.get('level'));if(n>=1&&n<=3)level=n-1}catch(e){}
readSaved();resize();setSelected(selected);setLevel(level);refresh();requestAnimationFrame(render);
if('ResizeObserver'in window)new ResizeObserver(resize).observe(canvas);else window.addEventListener('resize',resize);
})();