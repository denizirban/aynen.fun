(function(){
"use strict";
const $=id=>document.getElementById(id);
const canvas=$("waves"),ctx=canvas.getContext("2d",{alpha:false}),viz=$("viz");
const TAU=Math.PI*2, THRESHOLD=98, HOLD_MS=820;
const levels=[
 {label:"FAZ",title:"Bir dalgayı sustur.",tag:"DENEY 01 / KARŞIT FAZ",
  copy:"Yalnızca fazı değiştir. İki eş dalga aynı yerde birbirini yok edebilir.",
  hint:"Birinin tepesi diğerinin çukuruna denk gelmeli.",a:1,b:1,fa:2.65,fb:2.65,phi:48,x:.68,dir:1,controls:[]},
 {label:"GENLİK",title:"Güçlerini eşitle.",tag:"DENEY 02 / GENLİK",
  copy:"Biri daha güçlü. Faz tek başına yetmez; genlikleri de eşitle.",
  hint:"A'nın genliği 0,72. B'nin genliğini ve fazını birlikte ayarla.",a:.72,b:1.26,fa:2.7,fb:2.7,phi:28,x:.68,dir:1,controls:["amp"]},
 {label:"FREKANS",title:"Bir ritmi yakala.",tag:"DENEY 03 / FREKANS",
  copy:"Dalgalar aynı hızda salınmıyor. İkisi hep ters fazda kalabilir mi?",
  hint:"Frekansları eşitlemeden sürekli sönümleme mümkün değil.",a:1,b:1,fa:3.35,fb:2.12,phi:140,x:.68,dir:1,controls:["freq"]},
 {label:"NOKTA",title:"Tam burada sessizlik.",tag:"DENEY 04 / YEREL SÖNÜMLEME",
  copy:"Dalgalar ters yönde ilerliyor. Sensörü sürükle; yalnızca o noktayı sustur.",
  hint:"Bu kez bütün alan değil, yalnızca mikrofonun bulunduğu nokta önemli.",a:1,b:1,fa:2.2,fb:2.2,phi:43,x:.68,dir:-1,controls:["sensor"]}
];
const qs=new URLSearchParams(location.search);
let saved={};
try{const value=JSON.parse(localStorage.getItem("aynen_wave_completed")||"{}");if(value&&typeof value==="object")saved=value}catch(e){}
let state={level:0,completed:saved,phase:48,amp:1,freq:2.65,sensor:.68,
 score:0,rms:1,globalScore:0,qualifiedAt:0,shown:false,drag:false,now:0,paused:false,
 audio:null,audioOn:false, W:750,H:380,dpr:1,origin:performance.now(),hinted:false};
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
function wrap360(n){return ((n%360)+360)%360}
function info(){return levels[state.level]}
function direction(){return info().dir}
function params(){
 const l=info();return {a:l.a,b:state.amp,fa:l.fa,fb:state.freq,phi:state.phase*Math.PI/180,dir:l.dir,x:state.sensor};
}
function wavePair(x,t,p){
 const a=p.a*Math.sin(TAU*(p.fa*x-p.fa*.38*t));
 const b=p.b*Math.sin(TAU*(p.dir*p.fb*x-p.fb*.38*t)+p.phi);
 return [a,b];
}
function measure(localOnly){
 const p=params();
 let total=0,reference=0,n=0;
 const NT=49,NX=localOnly?1:61;
 for(let ti=0;ti<NT;ti++){
  const t=ti*4.1/(NT-1);
  for(let xi=0;xi<NX;xi++){
   const x=localOnly?p.x:(xi+.5)/NX;
   const [a,b]=wavePair(x,t,p);
   total+=(a+b)*(a+b);reference+=a*a;n++;
  }
 }
 const rms=Math.sqrt(total/n),original=Math.sqrt(reference/n);
 return {fraction:original>1e-9?rms/original:1,
  percent:original>1e-9?clamp(100*(1-rms/original),0,100):0};
}
function recalc(){
 const local=direction()===-1;
 const met=measure(local);
 state.score=met.percent;state.rms=met.fraction;
 state.globalScore=local?measure(false).percent:met.percent;
 $("score").innerHTML=met.percent.toFixed(1)+'<span>%</span>';
 $("score-fill").style.width=met.percent.toFixed(2)+"%";
 $("score-track").setAttribute("aria-valuenow",met.percent.toFixed(1));
 $("rms").textContent=met.fraction.toFixed(3)+"×";
 $("sensor-value").textContent=local?(Math.round(state.sensor*100)+"% / ALAN "+state.globalScore.toFixed(0)+"%"):"TÜM ALAN";
 $("score-label").textContent=local?"GENLİK AZALMASI / SENSÖR":"GENLİK AZALMASI / TÜM ALAN";
 $("scope-measure-label").textContent="KALAN RMS / A DALGASI";
 $("scope-secondary-label").textContent=local?"SENSÖR / ALAN AZALMASI":"ÖLÇÜM ALANI";
 $("quest").innerHTML=met.percent>=THRESHOLD?"SİNYAL NEREDEYSE YOK. <strong>Ayara kısa süre dokunma.</strong>":"HEDEF: <strong>En az %98 sönümleme</strong> · ayarı sabit tut.";
 if(met.percent<THRESHOLD)state.qualifiedAt=0;
 updateAudio();
}
function updateControls(){
 const l=info();
 $("scope-level").textContent=String(state.level+1).padStart(2,"0");
 $("level-count").textContent=String(state.level+1).padStart(2,"0")+" / 04";
 $("mission-tag").textContent=l.tag;$("mission-title").textContent=l.title;$("mission-copy").textContent=l.copy;
 $("phase").value=String(state.phase);$("phase-val").textContent=Math.round(state.phase)+"°";
 $("amp").value=String(state.amp);$("amp-val").textContent=state.amp.toFixed(2);
 $("freq").value=String(state.freq);$("freq-val").textContent=state.freq.toFixed(2)+" birim";
 $("sensor").value=String(Math.round(state.sensor*100));$("sensor-val").textContent=Math.round(state.sensor*100)+"%";
 $("amp-box").hidden=!l.controls.includes("amp");
 $("freq-box").hidden=!l.controls.includes("freq");
 $("sensor-box").hidden=!l.controls.includes("sensor");
 viz.classList.toggle("movable",l.dir===-1);
 document.querySelectorAll("[data-level]").forEach((b,i)=>{
  b.classList.toggle("active",i===state.level);b.classList.toggle("done",!!state.completed[i]);
  b.setAttribute("aria-pressed",String(i===state.level));
 });
 $("hint").textContent="KÜÇÜK BİR İPUCU ↗";
 $("hint").setAttribute("aria-label","Bölüm için küçük bir ipucu");
 $("quest").textContent="";
}
function goToLevel(n,preserveQuery){
 if(n<0||n>=levels.length)return;
 state.level=n;
 const l=levels[n];
 state.phase=l.phi;state.amp=l.b;state.freq=l.fb;state.sensor=l.x;
 state.hinted=false;state.shown=false;state.qualifiedAt=0;state.origin=performance.now();
 $("success").classList.remove("on");updateControls();recalc();
 if(!preserveQuery){
  const u=new URL(location.href);u.searchParams.set("level",String(n+1));
  history.replaceState(null,"",u.pathname+u.search);
 }
}
function onChange(){
 state.shown=false;state.qualifiedAt=0;
 $("success").classList.remove("on");
 recalc();
}
$("phase").addEventListener("input",e=>{state.phase=Number(e.target.value);$("phase-val").textContent=Math.round(state.phase)+"°";onChange()});
$("amp").addEventListener("input",e=>{state.amp=Number(e.target.value);$("amp-val").textContent=state.amp.toFixed(2);onChange()});
$("freq").addEventListener("input",e=>{state.freq=Number(e.target.value);$("freq-val").textContent=state.freq.toFixed(2)+" birim";onChange()});
$("sensor").addEventListener("input",e=>{state.sensor=Number(e.target.value)/100;$("sensor-val").textContent=Math.round(state.sensor*100)+"%";onChange()});
document.querySelectorAll("[data-level]").forEach(b=>b.addEventListener("click",()=>goToLevel(Number(b.dataset.level))));
$("reset").addEventListener("click",()=>goToLevel(state.level,true));
$("hint").addEventListener("click",()=>{$("quest").textContent=info().hint;state.hinted=true;$("hint").textContent="İPUCU GÖSTERİLDİ ✓"});
function win(){
 if(state.shown)return;
 state.shown=true;state.completed[state.level]=true;
 try{localStorage.setItem("aynen_wave_completed",JSON.stringify(state.completed))}catch(e){}
 updateControls();recalc();
 $("success-title").textContent=["İptal edildi. Rahatladın mı?","Aynı şiddette. Tam tersine.","Aynı frekans. Sıfır gürültü.","Burada sessiz. Yan tarafta değil."][state.level];
 $("success-copy").textContent=[
  "İki aynı dalgayı 180° ayırdın. Toplam dalga neredeyse sıfır.",
  "Fazı tersledin, genliği eşitledin. Bir sorun daha iptal oldu.",
  "Aynı faz ilişkisi, aynı frekans. Artık birbirlerini sürekli söndürebiliyorlar.",
  "Mikrofonda girişim sıfır. Ama başka noktalarda dalga hâlâ var."
 ][state.level];
 $("success-next").textContent=state.level===3?"BAŞA DÖN ↻":"SONRAKİ DENEY →";
 $("success").classList.add("on");
}
$("success-next").addEventListener("click",()=>goToLevel((state.level+1)%levels.length));
function share(){
 const l=info(),url=new URL(location.href);url.searchParams.set("level",String(state.level+1));
 url.searchParams.set("phase",state.phase.toFixed(0));
 if(l.controls.includes("amp"))url.searchParams.set("amp",state.amp.toFixed(2));
 if(l.controls.includes("freq"))url.searchParams.set("freq",state.freq.toFixed(2));
 if(l.controls.includes("sensor"))url.searchParams.set("sensor",Math.round(state.sensor*100).toString());
 const payload={title:"Cancel Everything. — aynen.fun",
  text:"İki dalgayı "+state.score.toFixed(1)+"% susturdum. "+l.label+" / Aynen.fun. Her şeyi iptal etmek mümkün değil. Şimdilik.",
  url:url.toString()};
 if(navigator.share){navigator.share(payload).catch(()=>{});return}
 if(navigator.clipboard&&navigator.clipboard.writeText){
  navigator.clipboard.writeText(payload.text+"\n"+payload.url).then(()=>{
   const b=$("share");b.textContent="KOPYALANDI ✓";
   setTimeout(()=>b.textContent="↗ PAYLAŞ",1700);
  }).catch(()=>window.prompt("Paylaş:",payload.text+" "+payload.url));
 }else window.prompt("Paylaş:",payload.text+" "+payload.url);
}
$("share").addEventListener("click",share);
const overlay=$("info-overlay");
function infoOpen(){overlay.hidden=false;$("info-close").focus()}
function infoClose(){overlay.hidden=true;$("info").focus()}
$("info").addEventListener("click",infoOpen);
$("info-close").addEventListener("click",infoClose);
overlay.addEventListener("click",e=>{if(e.target===overlay)infoClose()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!overlay.hidden)infoClose()});
function pointFromEvent(e){
 const r=canvas.getBoundingClientRect();
 return clamp((e.clientX-r.left)/Math.max(r.width,1),.15,.85);
}
function pointerMove(e){
 if(!state.drag||direction()!==-1)return;
 state.sensor=Math.round(pointFromEvent(e)*100)/100;
 $("sensor").value=String(Math.round(state.sensor*100));
 $("sensor-val").textContent=Math.round(state.sensor*100)+"%";
 onChange();e.preventDefault();
}
canvas.addEventListener("pointerdown",e=>{
 if(direction()!==-1||e.button>0)return;
 state.drag=true;canvas.setPointerCapture(e.pointerId);pointerMove(e);
});
canvas.addEventListener("pointermove",pointerMove);
function pointerEnd(e){
 if(!state.drag)return;state.drag=false;
 try{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)}catch(err){}
}
canvas.addEventListener("pointerup",pointerEnd);
canvas.addEventListener("pointercancel",pointerEnd);
canvas.addEventListener("lostpointercapture",pointerEnd);
function resize(){
 const rect=viz.getBoundingClientRect();
 if(rect.width<20||rect.height<20)return;
 const dpr=Math.min(window.devicePixelRatio||1,2);
 const width=Math.max(1,Math.round(rect.width*dpr)),height=Math.max(1,Math.round(rect.height*dpr));
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
 state.W=rect.width;state.H=rect.height;state.dpr=dpr;
}
window.addEventListener("resize",resize);
if(typeof ResizeObserver!=="undefined")new ResizeObserver(resize).observe(viz);
const reduceMotion=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function trace(xStart,xEnd,y,scaleValue,wave,now,p,color,alpha,lineWidth){
 const width=xEnd-xStart,steps=Math.max(170,Math.min(670,Math.round(width*.85)));
 ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.lineWidth=lineWidth;ctx.lineCap="round";ctx.lineJoin="round";
 ctx.beginPath();
 for(let i=0;i<=steps;i++){
  const x=i/steps;
  const pair=wavePair(x,now,p);
  const v=wave===0?pair[0]:wave===1?pair[1]:pair[0]+pair[1];
  const sx=xStart+x*width,sy=y-v*scaleValue;
  if(i===0)ctx.moveTo(sx,sy);else ctx.lineTo(sx,sy);
 }
 ctx.stroke();ctx.globalAlpha=1;
}
function renderFrame(now){
 if(!state.W||!state.H)return;
 const w=state.W,h=state.H,dpr=state.dpr;
 ctx.setTransform(dpr,0,0,dpr,0,0);
 ctx.fillStyle="#0b1420";ctx.fillRect(0,0,w,h);
 const faint=ctx.createRadialGradient(w*.3,h*.45,10,w*.4,h*.4,w*.85);
 faint.addColorStop(0,"#25413c70");faint.addColorStop(.68,"#15272e50");faint.addColorStop(1,"#080f1b00");
 ctx.fillStyle=faint;ctx.fillRect(0,0,w,h);
 const left=Math.max(16,w*.045),right=w-left,width=right-left;
 const start=Math.max(31,h*.13),bottom=h-14,usable=bottom-start;
 const rows=[start+usable*.17,start+usable*.49,start+usable*.82];
 ctx.lineWidth=1;
 for(let i=0;i<=14;i++){
  const x=left+width*i/14;
  ctx.strokeStyle=i%2===0?"#b8d3dd17":"#b8d3dd0b";
  ctx.beginPath();ctx.moveTo(x,start-10);ctx.lineTo(x,bottom+3);ctx.stroke();
 }
 for(let j=0;j<3;j++){
  const yy=rows[j];
  ctx.strokeStyle="#ffffff24";ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(right,yy);ctx.stroke();ctx.setLineDash([]);
  if(j<2){const sep=(rows[j]+rows[j+1])/2;ctx.strokeStyle="#ffffff12";ctx.beginPath();ctx.moveTo(left,sep);ctx.lineTo(right,sep);ctx.stroke()}
 }
 ctx.fillStyle="#94a8ab";ctx.textAlign="left";ctx.font="500 "+(w<470?8:10)+"px 'DM Mono',monospace";
 const labels=["A / SOURCE","B / ANTI-SOURCE",direction()===-1?"A + B / MICROPHONE":"A + B / RESULT"];
 labels.forEach((t,i)=>ctx.fillText(t,left+3,rows[i]-Math.min(35,usable*.135)));
 const p=params();
 const time=reduceMotion?0:(now-state.origin)/1000*.65;
 const perRow=Math.min(usable*.143,Math.max(13,h*.11));
 trace(left,right,rows[0],perRow,0,time,p,"#6fe9dc",.12,6);
 trace(left,right,rows[0],perRow,0,time,p,"#7befe5",.95,2.35);
 trace(left,right,rows[1],perRow,1,time,p,"#ff8da7",.13,6);
 trace(left,right,rows[1],perRow,1,time,p,"#ffa0b5",.95,2.35);
 const resultScale=perRow*.56;
 trace(left,right,rows[2],resultScale,2,time,p,"#d8ffc7",.13,7);
 trace(left,right,rows[2],resultScale,2,time,p,"#dfffce",1,2.5);
 if(direction()===-1){
  const sx=left+state.sensor*width;
  ctx.strokeStyle="#e8e4a2a8";ctx.setLineDash([5,5]);ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(sx,Math.max(20,start-3));ctx.lineTo(sx,bottom);ctx.stroke();ctx.setLineDash([]);
  ctx.beginPath();ctx.arc(sx,rows[2],7,0,TAU);ctx.fillStyle="#fff5b3";ctx.fill();ctx.strokeStyle="#131b20";ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle="#fff3bd";ctx.textAlign=sx>w*.65?"right":"left";ctx.font="500 9px 'DM Mono',monospace";
  ctx.fillText("MIC "+Math.round(state.sensor*100)+"%  /  DRAG",sx+(sx>w*.65?-10:10),start+6);
  ctx.fillStyle="#e5f6ef88";ctx.textAlign="right";ctx.fillText("NULL ≠ EVERYWHERE",right,bottom-8);
 }
 if(state.score>=THRESHOLD){
  ctx.fillStyle="#91ffb522";ctx.fillRect(left,rows[2]-perRow*.12,width,perRow*.24);
 }
}
function animate(t){
 state.now=t;
 renderFrame(t);
 if(!state.shown && overlay.hidden && state.score>=THRESHOLD){
  if(!state.qualifiedAt)state.qualifiedAt=t;
  if(t-state.qualifiedAt>=HOLD_MS)win();
 }
 requestAnimationFrame(animate);
}
let soundSupported=!!(window.AudioContext||window.webkitAudioContext);
if(!soundSupported){$("sound").disabled=true;$("sound").textContent="SES DESTEKLENMİYOR"}
async function soundOff(){
 const a=state.audio;state.audio=null;state.audioOn=false;
 $("sound").classList.remove("active");$("sound").setAttribute("aria-pressed","false");$("sound").textContent="◉ SESİ AÇ";
 if(a){
  try{a.master.gain.setTargetAtTime(0,a.ctx.currentTime,.02);a.a.stop(a.ctx.currentTime+.15);a.b.stop(a.ctx.currentTime+.15)}catch(e){}
  setTimeout(()=>a.ctx.close().catch(()=>{}),250);
 }
}
function updateAudio(){
 const a=state.audio;
 if(!a||!state.audioOn)return;
 const p=params(),when=a.ctx.currentTime,fa=170+p.fa*55,fb=170+p.fb*55;
 const phaseRel=wrap360(state.phase+360*(p.dir*p.fb-p.fa)*p.x);
 const delay=phaseRel<.0001?0:(1-phaseRel/360)/fb;
 try{
  a.a.frequency.setTargetAtTime(fa,when,.025);
  a.b.frequency.setTargetAtTime(fb,when,.025);
  a.ga.gain.setTargetAtTime(p.a*.062,when,.025);
  a.gb.gain.setTargetAtTime(p.b*.062,when,.025);
  a.delay.delayTime.setTargetAtTime(delay,when,.025);
 }catch(e){}
}
async function soundOn(){
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 try{
  const ac=new AC();
  if(ac.state==="suspended")await ac.resume();
  const a=ac.createOscillator(),b=ac.createOscillator(),ga=ac.createGain(),gb=ac.createGain(),delay=ac.createDelay(.1),master=ac.createGain();
  a.type="sine";b.type="sine";master.gain.value=.48;
  ga.gain.value=0;gb.gain.value=0;
  a.connect(ga).connect(master);
  b.connect(delay).connect(gb).connect(master);
  master.connect(ac.destination);
  const when=ac.currentTime+.03;
  a.start(when);b.start(when);
  state.audio={ctx:ac,a,b,ga,gb,delay,master};
  state.audioOn=true;
  updateAudio();
  $("sound").textContent="◉ SESİ KAPAT";$("sound").classList.add("active");$("sound").setAttribute("aria-pressed","true");
 }catch(e){$("sound").textContent="SES KULLANILAMIYOR";$("sound").disabled=true}
}
$("sound").addEventListener("click",()=>{if(state.audioOn)soundOff();else soundOn()});
document.addEventListener("visibilitychange",()=>{
 if(!state.audio)return;
 if(document.visibilityState==="hidden")state.audio.ctx.suspend().catch(()=>{});
 else if(state.audioOn)state.audio.ctx.resume().catch(()=>{});
});
const wanted=Number(qs.get("level"));
goToLevel(Number.isInteger(wanted)&&wanted>=1&&wanted<=4?wanted-1:0,true);
if(qs.has("phase")){const v=Number(qs.get("phase"));if(Number.isFinite(v))state.phase=clamp(Math.round(v),0,360)}
if(qs.has("amp")&&info().controls.includes("amp")){const v=Number(qs.get("amp"));if(Number.isFinite(v))state.amp=clamp(v,0,1.6)}
if(qs.has("freq")&&info().controls.includes("freq")){const v=Number(qs.get("freq"));if(Number.isFinite(v))state.freq=clamp(v,1,5)}
if(qs.has("sensor")&&info().controls.includes("sensor")){const v=Number(qs.get("sensor"));if(Number.isFinite(v))state.sensor=clamp(Math.round(v)/100,.15,.85)}
updateControls();recalc();resize();
requestAnimationFrame(animate);
})();