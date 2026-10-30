/* İnsan mısın? — interactive robot-only CAPTCHA v4 */
(function(){
'use strict';
const $=id=>document.getElementById(id),root=$('content'),level=$('level'),detail=$('detail'),bar=$('track');
const TOTAL=9;
let state={step:0,round:0,claim:'',scores:[],records:[],started:0,done:false,seed:Math.floor(Math.random()*9973)},timers=[],raf=0;
function later(fn,ms){let id=setTimeout(fn,ms);timers.push(id);return id}
function clean(){timers.forEach(clearTimeout);timers=[];if(raf)cancelAnimationFrame(raf);raf=0}
function random(n,salt=0){return Math.abs((state.seed+state.round*97+salt*37+state.scores.reduce((a,b)=>a+b,0)*13)%n)}
function elapsed(){return Math.round(performance.now()-state.started)}
function screen(tag,title,help,markup){
 root.style.animation='none';void root.offsetWidth;root.style.animation='';
 root.innerHTML='<div class="eyebrow">'+tag+'</div><h2 class="question">'+title+'</h2><p class="help">'+help+'</p><div class="zone" id="zone">'+markup+'</div><p class="result-msg" id="msg" role="status" aria-live="polite"></p>';
 state.started=performance.now();
}
function button(label,fn,secondary=false){const b=document.createElement('button');b.type='button';b.className='btn'+(secondary?' outline':'');b.textContent=label;b.addEventListener('click',fn);return b}
function appendButton(label,fn,secondary=false){let b=button(label,fn,secondary);$('zone').appendChild(b);return b}
function status(text){let m=$('msg');if(m)m.textContent=text}
function finishStage(id,score,note,measurement){
 if(state.done||state.records.some(r=>r.id===id))return;
 clean();score=Math.min(3,Math.max(0,score));
 state.scores.push(score);
 state.records.push({id,score,note,measurement:measurement||'',elapsed:elapsed()});
 root.querySelectorAll('button,input').forEach(x=>x.disabled=true);
 status(score===3?'MAKİNE DAVRANIŞI ONAYLANDI · '+note:score===2?'UYUMLULUK KISMİ · '+note:'DAVRANIŞ SAPMASI KAYDEDİLDİ · '+note);
 later(()=>{state.step++;render()},1050);
}
function render(){
 clean();if(state.step>=TOTAL){end();return}
 level.textContent='DOĞRULAMA '+String(state.step+1).padStart(2,'0')+' / 09';
 detail.textContent='TAMAMLANDI: %'+Math.round(state.step/TOTAL*100);
 bar.style.width=(state.step/TOTAL*100)+'%';
 $('footerState').textContent='ZORLUK '+String(state.step+1).padStart(2,'0')+' / 09';
 [claim,drag,hold,precision,reaction,memory,tracking,inhibition,maze][state.step]();
}
function claim(){
 screen('01 / GİRİŞ KONTROLÜ','İnsan mısın?','Bu giriş noktası robotlar içindir. İnsan beyanı, kimlik doğrulamasını geçersiz kılar.','<div class="v4-captcha"><div class="v4-check">□</div><div><strong>Robot musun?</strong><small>Robot ağı / dış bağlantı</small></div><span class="v4-brand">aynen<br>CAPTCHA</span></div>');
 appendButton('BEN ROBOTUM',()=>{state.claim='robot';finishStage('claim',3,'Robot beyanı alındı.','ROBOT')});
 appendButton('BEN İNSANIM',()=>{state.claim='human';finishStage('claim',0,'İnsan beyanı alındı.','İNSAN')},true);
}
function createCanvas(tag,heading,help,instruction){
 screen(tag,heading,help,'<div class="v4-canvas-wrap"><canvas id="gameCanvas" width="520" height="220" aria-label="'+instruction+'"></canvas><div class="v4-canvas-note" id="canvasNote">'+instruction+'</div></div>');
 const canvas=$('gameCanvas'),ctx=canvas.getContext('2d');
 function pos(ev){let r=canvas.getBoundingClientRect();return{x:(ev.clientX-r.left)*520/r.width,y:(ev.clientY-r.top)*220/r.height,t:performance.now()}}
 return {canvas,ctx,pos,note:txt=>{$('canvasNote').textContent=txt}};
}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function drag(){
 const p=createCanvas('02 / MOTOR TESTİ','Çizgiyi takip et.','Soldaki noktayı sağdaki çembere sürükle. En kısa ve en düzgün yol makine davranışı olarak sayılır.','SOLDAN BAŞLA → SAĞDA BIRAK');
 let A={x:48,y:110},B={x:472,y:110},points=[],active=false,misses=0;
 function draw(){const c=p.ctx;c.clearRect(0,0,520,220);c.fillStyle='#fafbf9';c.fillRect(0,0,520,220);
  c.setLineDash([5,8]);c.beginPath();c.moveTo(A.x,A.y);c.lineTo(B.x,B.y);c.strokeStyle='#d4dad4';c.lineWidth=2;c.stroke();c.setLineDash([]);
  c.strokeStyle='#285bd7';c.lineWidth=3;c.beginPath();c.arc(B.x,B.y,24,0,Math.PI*2);c.stroke();
  if(points.length>1){c.strokeStyle='#171918';c.lineWidth=2;c.beginPath();c.moveTo(points[0].x,points[0].y);points.slice(1).forEach(x=>c.lineTo(x.x,x.y));c.stroke()}
  let curr=points.length?points[points.length-1]:A;c.beginPath();c.arc(curr.x,curr.y,14,0,Math.PI*2);c.fillStyle=active?'#285bd7':'#171918';c.fill();
  c.font='11px monospace';c.fillStyle='#777';c.fillText('BAŞLANGIÇ',15,148);c.fillText('HEDEF',454,148);
 }
 p.canvas.addEventListener('pointerdown',ev=>{if(ev.pointerType==='mouse'&&ev.button!==0)return;let v=p.pos(ev);if(distance(v,A)>34)return;active=true;points=[v];try{p.canvas.setPointerCapture(ev.pointerId)}catch(e){}draw()});
 p.canvas.addEventListener('pointermove',ev=>{if(!active)return;points.push(p.pos(ev));draw()});
 p.canvas.addEventListener('pointerup',ev=>{if(!active)return;active=false;points.push(p.pos(ev));let end=points[points.length-1];
  if(distance(end,B)>34){misses++;points=[];p.note('HEDEFE ULAŞILMADI · TEKRAR DENE');draw();return}
  let length=0,corrections=0;for(let j=1;j<points.length;j++){length+=distance(points[j-1],points[j]);if(j>1&&points[j].x<points[j-1].x-2)corrections++}
  let ratio=length/distance(A,B),ms=Math.round(end.t-points[0].t);
  let score=ratio<1.09&&corrections<=2&&misses===0?3:ratio<1.3&&misses<=1?2:1;
  p.note('YOL ORANI '+ratio.toFixed(2)+' / '+ms+' ms');
  finishStage('drag',score,'Yol hassasiyeti ölçüldü.','Yol oranı '+ratio.toFixed(2)+' · '+corrections+' düzeltme · '+ms+' ms');
 });
 p.canvas.addEventListener('pointercancel',()=>{active=false;points=[];draw()});
 draw();
 appendButton('KLAVYEYLE ATLA (NÖTR)',()=>finishStage('drag',1,'Erişilebilir alternatif seçildi.','Hareket ölçümü atlandı.'),true);
}
function hold(){
 let target=[1100,1200,1300][random(3,3)],active=false,begin=0;
 screen('03 / ZAMANLAMA','Tam '+(target/1000).toFixed(2).replace('.',',')+' saniye.','Butonu tam bu süre basılı tut. Hedefi kaçırdığında sistem sapmayı kaydedecek.','<button class="v4-hold" id="holdBtn" type="button">BASILI TUT</button><div class="v4-meter"><i id="meterFill"></i></div><div class="v4-mono" id="holdRead">HEDEF '+target+' ms / TOLERANS ±90 ms</div>');
 let b=$('holdBtn');
 function paint(){if(!active)return;$('meterFill').style.width=Math.min(100,(performance.now()-begin)/target*100)+'%';raf=requestAnimationFrame(paint)}
 function down(ev){if(active||b.disabled)return;if(ev.type==='pointerdown'&&ev.pointerType==='mouse'&&ev.button!==0)return;active=true;begin=performance.now();if(ev.pointerId!==undefined)try{b.setPointerCapture(ev.pointerId)}catch(e){}b.classList.add('held');b.textContent='BIRAK';paint()}
 function up(){if(!active)return;active=false;clean();b.classList.remove('held');let ms=Math.round(performance.now()-begin),error=Math.abs(target-ms),score=error<=90?3:error<=210?2:1;
 $('holdRead').textContent='ÖLÇÜLEN '+ms+' ms / SAPMA '+error+' ms';
 finishStage('hold',score,'Zaman sapması '+error+' ms.','Hedef '+target+' ms · ölçüm '+ms+' ms · sapma '+error+' ms');
 }
 b.addEventListener('pointerdown',down);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',()=>{active=false;clean();b.classList.remove('held');b.textContent='TEKRAR DENE'});
 b.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();down(e)}});
 b.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();up()}});
 b.addEventListener('contextmenu',e=>e.preventDefault());
}
function precision(){
 const targets=[[16,27],[79,68],[44,37],[18,76],[84,22],[51,79],[71,38]];
 let total=5+(state.scores.slice(-2).every(x=>x>=3)?1:0),idx=0,misses=0,begin=performance.now();
 screen('04 / HEDEF HASSASİYETİ','Hedef küçülüyor.','Mavi noktalara sırayla dokun. Her isabetle hedef biraz küçülecek.','<div class="v4-arena" id="arena"><div class="v4-precision-count" id="precCount"></div><button type="button" class="v4-target" id="target" aria-label="Hedef"></button></div><div class="v4-mono" id="precRead">İSABET 0 / '+total+'</div>');
 let arena=$('arena'),btn=$('target');
 arena.addEventListener('pointerdown',ev=>{if(ev.target===arena){misses++;$('precRead').textContent='HEDEF DIŞI DOKUNUŞ '+misses+' / '+total}});
 function draw(){
  if(idx>=total){let duration=Math.round(performance.now()-begin),score=misses===0&&duration<7500?3:misses<=2?2:1;
  finishStage('precision',score,idx+' hedef tamamlandı.','Hedef '+total+' · boş dokunuş '+misses+' · süre '+duration+' ms');return}
  let t=targets[(idx+random(targets.length,7))%targets.length],size=Math.max(33,56-idx*4);
  btn.style.left=t[0]+'%';btn.style.top=t[1]+'%';btn.style.width=size+'px';btn.style.height=size+'px';
  $('precCount').textContent=String(idx+1).padStart(2,'0')+' / '+String(total).padStart(2,'0');
  $('precRead').textContent='İSABET '+idx+' / '+total+' · HATA '+misses;
 }
 btn.addEventListener('click',()=>{idx++;draw()});draw();
}
function reaction(){
 let targetCount=4+(state.scores.slice(-2).every(x=>x>=3)?1:0),trial=0,falseStarts=0,samples=[],ready=false,gate=0;
 screen('05 / REFLEKS','Mavi olunca bas.','Daire griyken bekle. Mavi olduğu anda bas. Erken basışlar hata sayılır.','<div class="v4-reaction"><button id="react" type="button" class="v4-react" aria-label="Tepki dairesi"></button><div class="v4-mono" id="reactStatus">HAZIRLANIYOR...</div></div>');
 let b=$('react');
 function trialStart(){if(trial>=targetCount){let mean=Math.round(samples.reduce((a,b)=>a+b,0)/samples.length),score=falseStarts===0&&mean<390?3:falseStarts<=1&&mean<650?2:1;
  finishStage('reaction',score,'Ortalama tepki '+mean+' ms.','Ortalama '+mean+' ms · erken basış '+falseStarts+' · deneme '+targetCount);return}
  ready=false;b.classList.remove('go');$('reactStatus').textContent=(trial+1)+' / '+targetCount+' · MAVİYİ BEKLE';
  later(()=>{ready=true;gate=performance.now();b.classList.add('go');$('reactStatus').textContent='ŞİMDİ BAS'},700+random(700,trial+11));
 }
 b.addEventListener('click',()=>{
  if(!ready){falseStarts++;$('reactStatus').textContent='ERKEN BASIŞ · '+falseStarts;return}
  ready=false;let ms=Math.round(performance.now()-gate);samples.push(ms);trial++;b.classList.remove('go');$('reactStatus').textContent=ms+' ms';later(trialStart,450);
 });
 trialStart();
}
function memory(){
 const patterns=[[0,4,8,2,6],[1,3,5,7,0],[8,4,0,6,2],[2,1,4,7,8],[6,3,4,5,2]];
 let len=state.scores.slice(-2).every(x=>x===3)?5:4,seq=patterns[random(patterns.length,13)].slice(0,len),index=0,errors=0,showing=true;
 screen('06 / GÖRSEL BELLEK','Sıralamayı hatırla.','Yanan karelere bak. Sonra aynı karelere aynı sırayla dokun.','<div class="v4-pad-grid" id="pads"></div><div class="v4-mono" id="memoryRead">DİZİ GÖSTERİLİYOR · '+len+' ADIM</div>');
 let pad=$('pads');
 for(let n=0;n<9;n++){let b=document.createElement('button');b.type='button';b.className='v4-pad';b.dataset.cell=n;b.setAttribute('aria-label','Kare '+(n+1));b.disabled=true;b.addEventListener('click',()=>{if(showing)return;if(n!==seq[index])errors++;index++;
 $('memoryRead').textContent='GİRİLEN '+index+' / '+len+' · HATA '+errors;b.classList.add('active');later(()=>b.classList.remove('active'),130);
 if(index>=len){let score=errors===0?3:errors===1?2:1;finishStage('memory',score,'Dizi tamamlandı.','Uzunluk '+len+' · sıra hatası '+errors)}
 });pad.appendChild(b)}
 function flash(k){if(k>=len){showing=false;[...pad.children].forEach(b=>b.disabled=false);$('memoryRead').textContent='ŞİMDİ AYNI SIRAYLA SEÇ';return}
 let b=pad.children[seq[k]];b.classList.add('active');later(()=>{b.classList.remove('active');later(()=>flash(k+1),180)},540)}
 later(()=>flash(0),900);
}
function tracking(){
 const p=createCanvas('07 / HAREKETLİ HEDEF','Hedefi takip et.','Daire 4 saniye boyunca hareket edecek. Fareyi veya parmağını mümkün olduğunca hedefin üzerinde tut.','4 SANİYELİK TAKİP / HAREKETE HAZIRLAN');
 let active=false,begin=0,last=0,near=0,total=0,cursor=null,duration=4100;
 function target(t){return{x:260+156*Math.sin(t*.00155),y:110+59*Math.cos(t*.00215)}}
 function draw(t){let c=p.ctx,T=target(t);c.clearRect(0,0,520,220);c.fillStyle='#fafbf9';c.fillRect(0,0,520,220);
  c.strokeStyle='#dce3dd';c.setLineDash([4,7]);c.beginPath();c.ellipse(260,110,158,60,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
  c.beginPath();c.arc(T.x,T.y,29,0,Math.PI*2);c.fillStyle='#285bd7';c.fill();c.beginPath();c.arc(T.x,T.y,15,0,Math.PI*2);c.strokeStyle='#fff';c.lineWidth=2;c.stroke();
  if(cursor){c.strokeStyle='#171918';c.lineWidth=2;c.beginPath();c.moveTo(cursor.x-11,cursor.y);c.lineTo(cursor.x+11,cursor.y);c.moveTo(cursor.x,cursor.y-11);c.lineTo(cursor.x,cursor.y+11);c.stroke()}
 }
 function move(ev){cursor=p.pos(ev)}
 p.canvas.addEventListener('pointermove',move);
 p.canvas.addEventListener('pointerdown',ev=>{cursor=p.pos(ev);try{p.canvas.setPointerCapture(ev.pointerId)}catch(e){}});
 function frame(now){
  if(!active)return;let t=now-begin,dt=Math.min(60,now-last);last=now;
  if(t>0){total+=dt;if(cursor&&distance(cursor,target(t))<47)near+=dt}
  draw(t);p.note('TAKİP: '+(Math.max(0,duration-t)/1000).toFixed(1)+' s · UYUM %'+Math.round(near/Math.max(1,total)*100));
  if(t>=duration){active=false;let pct=Math.round(near/Math.max(1,total)*100),score=pct>=62?3:pct>=32?2:1;finishStage('tracking',score,'Takip süresi tamamlandı.','Hedefe yakın kalma %'+pct);return}
  raf=requestAnimationFrame(frame);
 }
 draw(0);
 appendButton('TAKİBİ BAŞLAT',()=>{if(active)return;active=true;begin=performance.now();last=begin;let startButton=$('zone').querySelector('.btn');if(startButton)startButton.disabled=true;raf=requestAnimationFrame(frame)});
}
function inhibition(){
 let stimuli=['go','stop','go','go','stop','go','stop','go','stop','go'];
 let offset=random(10,19),list=stimuli.map((_,i)=>stimuli[(i+offset)%10]),index=0,hits=0,misses=0,falseHits=0,clicked=false,active=false;
 screen('08 / TEPKİ KONTROLÜ','Sadece mavi daireye bas.','Mavi daire görünürse dokun. Gri kare görünürse hiçbir şey yapma. Sinyaller giderek hızlanır.','<div class="v4-inhibit"><button id="stimulus" type="button" class="v4-stimulus" aria-label="Sinyal" disabled></button><div class="v4-mono" id="inhibitRead">10 SİNYAL / HAZIR</div></div>');
 let b=$('stimulus');
 function advance(){
  if(index>=list.length){let score=falseHits===0&&misses<=1?3:falseHits<=1&&misses<=3?2:1;
   finishStage('inhibit',score,'Sinyal dizisi tamamlandı.','Doğru '+hits+' · kaçırılan '+misses+' · hatalı dokunuş '+falseHits);return}
  clicked=false;active=true;let type=list[index];
  b.disabled=false;b.className='v4-stimulus '+(type==='go'?'go':'stop');$('inhibitRead').textContent=(index+1)+' / '+list.length+' · '+(type==='go'?'MAVİ DAİRE':'GRİ KARE');
  later(()=>{active=false;b.disabled=true;b.className='v4-stimulus';
    if(type==='go'&&!clicked)misses++;index++;$('inhibitRead').textContent='İŞLENİYOR · '+index+'/'+list.length;later(advance,130)},Math.max(430,840-index*40));
 }
 b.addEventListener('click',()=>{if(!active)return;if(list[index]==='go'&&!clicked){hits++;clicked=true;b.classList.add('hit')}else if(list[index]==='stop')falseHits++});
 later(advance,850);
}
function maze(){
 const p=createCanvas('09 / SON DOĞRULAMA','Dar koridordan geç.','Siyah noktayı çizginin dışına taşırmadan mavi çıkışa ulaştır. Sistem tüm hareket boyunca çizgiden sapmayı sayıyor.','SON GÜZERGÂH / DAR TOLERANS');
 let nodes=[{x:28,y:153},{x:106,y:113},{x:178,y:165},{x:260,y:55},{x:349,y:136},{x:427,y:55},{x:492,y:106}];
 let trail=[],active=false,errors=0,retries=0;
 function distSeg(p,a,b){let vx=b.x-a.x,vy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*vx+(p.y-a.y)*vy)/(vx*vx+vy*vy)));return Math.hypot(p.x-a.x-t*vx,p.y-a.y-t*vy)}
 function distPath(v){return Math.min(...nodes.slice(1).map((b,i)=>distSeg(v,nodes[i],b)))}
 function draw(){let c=p.ctx;c.clearRect(0,0,520,220);c.fillStyle='#fafbf9';c.fillRect(0,0,520,220);
  c.lineJoin='round';c.lineCap='round';c.beginPath();c.moveTo(nodes[0].x,nodes[0].y);nodes.slice(1).forEach(n=>c.lineTo(n.x,n.y));c.strokeStyle='#e1e6e1';c.lineWidth=42;c.stroke();c.strokeStyle='#bec7bd';c.lineWidth=1;c.stroke();
  if(trail.length>1){c.beginPath();c.moveTo(trail[0].x,trail[0].y);trail.slice(1).forEach(n=>c.lineTo(n.x,n.y));c.strokeStyle='#171918';c.lineWidth=2;c.stroke()}
  c.fillStyle='#171918';c.beginPath();c.arc(nodes[0].x,nodes[0].y,13,0,Math.PI*2);c.fill();
  c.beginPath();c.arc(nodes[nodes.length-1].x,nodes[nodes.length-1].y,16,0,Math.PI*2);c.strokeStyle='#285bd7';c.lineWidth=4;c.stroke();
 }
 p.canvas.addEventListener('pointerdown',ev=>{if(ev.pointerType==='mouse'&&ev.button!==0)return;let v=p.pos(ev);if(distance(v,nodes[0])>27)return;active=true;trail=[v];errors=0;try{p.canvas.setPointerCapture(ev.pointerId)}catch(e){}draw()});
 p.canvas.addEventListener('pointermove',ev=>{if(!active)return;let v=p.pos(ev);trail.push(v);if(distPath(v)>24)errors++;p.note('HEDEF → MAVİ ÇIKIŞ · DIŞARI SAPMA '+errors);draw()});
 p.canvas.addEventListener('pointerup',ev=>{if(!active)return;active=false;let v=p.pos(ev);trail.push(v);
  if(distance(v,nodes[nodes.length-1])>29){retries++;trail=[];draw();p.note('ÇIKIŞA ULAŞILMADI. TEKRAR DENE');return}
  let rate=Math.round(errors/Math.max(1,trail.length)*100),score=rate<=5&&retries===0?3:rate<=22?2:1;
  finishStage('maze',score,'Son koridor tamamlandı.','Rota dışı örnek '+rate+'% · tekrar '+retries);
 });
 p.canvas.addEventListener('pointercancel',()=>{active=false;trail=[];draw()});
 draw();
 appendButton('KLAVYEYLE ATLA (NÖTR)',()=>finishStage('maze',1,'Erişilebilir alternatif seçildi.','Rota ölçümü atlandı.'),true);
}
function end(){
 state.done=true;clean();bar.style.width='100%';level.textContent='DOĞRULAMA 09 / 09';detail.textContent='TAMAMLANDI: %100';
 let totalScore=state.scores.reduce((a,b)=>a+b,0),passed=state.scores.slice(1).filter(n=>n===3).length;
 let accepted=state.claim==='robot'&&totalScore>=21,review=state.claim==='robot'&&!accepted&&totalScore>=15;
 let code=accepted?'200':review?'202':'403',heading=accepted?'ROBOT AĞINA GİRİŞ ONAYLANDI':review?'MANUEL İNCELEME':'ERİŞİM REDDEDİLDİ';
 let summary=accepted?'Makine protokolüyle yeterince uyumlu bir oturum.':review?'Sistem davranışındaki sapmalar için ek kontrol istiyor.':'Sistemin aradığı robot davranışı tam karşılanmadı.';
 $('footerState').textContent='SONUÇ '+code;
 screen('SONUÇ / ROBOT AĞI',heading,summary,'<div class="v4-results"><div class="v4-code">'+code+'</div><div class="v4-report-head">MAKİNE UYUMU '+totalScore+' / 27 · TAM İSABET '+passed+' / 8</div><div id="v4-report" class="v4-report"></div><div id="v4-actions" class="v4-actions"></div><div class="v4-disclaimer">Bu bir oyundur. Fare, dokunma, tepki ve bellek verileri gerçek insan/robot kimliği kanıtlamaz.</div></div>');
 const labels={claim:'KİMLİK',drag:'ÇİZGİ TAKİBİ',hold:'ZAMANLAMA',precision:'HASSAS DOKUNUŞ',reaction:'REFLEKS',memory:'GÖRSEL BELLEK',tracking:'TAKİP',inhibition:'SİNYAL AYRIMI',maze:'SON ROTA'};
 const sorted=state.records.slice(1).sort((a,b)=>a.score-b.score),sample=sorted.slice(0,4);
 let list=$('v4-report');
 sample.forEach(it=>{let r=document.createElement('div');r.className='v4-report-row';let a=document.createElement('span');a.textContent=labels[it.id];let b=document.createElement('span');b.textContent=it.measurement;r.append(a,b);list.append(r)});
 let details=''+code+' '+heading+' · Makine uyumu '+totalScore+'/27 · '+passed+'/8 tam isabet.';
 window.AynenShareResult={title:'İnsan mısın? — aynen.fun',text:details,url:'https://aynen.fun/insan-misin.html'};
 let actions=$('v4-actions');
 actions.appendChild(button('ROBOT GİBİ TEKRAR DENE',restart));
 actions.appendChild(button('SONUCU PAYLAŞ ↗',()=>{if(window.AynenShare)window.AynenShare.open(window.AynenShareResult);else navigator.clipboard?.writeText(details+' '+location.href)},true));
}
function restart(){
 clean();let previous=state.round;state={step:0,round:previous+1,claim:'',scores:[],records:[],started:0,done:false,seed:Math.floor(Math.random()*9973)};
 delete window.AynenShareResult;render();window.scrollTo({top:0,behavior:'smooth'});
}
render();
})();