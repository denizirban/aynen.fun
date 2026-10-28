(function(){
"use strict";
const $=id=>document.getElementById(id);
if(!window.Matter){
 $("hud-tip").textContent="Fizik motoru yüklenemedi. İnternet bağlantını kontrol edip sayfayı yenile.";
 $("mission-copy").textContent="Matter.js indirilemediği için bu deney başlatılamıyor.";
 $("action").disabled=true;
 return;
}
const {Engine,Bodies,Body,Composite,Constraint,Query,Vector}=Matter;
const canvas=$("world"),ctx=canvas.getContext("2d");
const STAGE=$("stage");
const STEPS=1000/60;
const scenarios={
 room:{name:"Serbest Oda",label:"DENEY 01 / DÜNYAYI BOZ",title:"Odanın kurallarını değiştir.",
  copy:"Eşyaları tutup fırlat. Yerçekimini kapatınca kendi kendilerine yükselmediklerini keşfet. Sonra odayı sars.",
  action:"ODAYI SARS ↗",tip:"Nesneleri sürükle veya fırlat; ardından yerçekimini kapat.",
  fact:"Yerçekimini kapatmak, yukarı uçmak değildir.",explain:"Sıfır yerçekiminde duran nesne yerinde kalır. Bir nesneye hız kazandırırsan, sürtünme ve hava direnci yoksa hareketini sürdürür. Yerçekimini kapatmak mevcut hızı otomatik silmez.",
  formula:"NET KUVVET = 0  →  İVME = 0\nDuran durur; hareket eden sabit hızla gider."},
 slide:{name:"Kaydır",label:"DENEY 02 / SÜRTÜNME",title:"Tek itiş. Ne kadar gidecek?",
  copy:"Kutuyu tek itişle yeşil hedefe ulaştır. Sürtünmeyi kapattığında hareketin nasıl değiştiğini gör.",
  action:"KUTUYU İT →",tip:"Sürtünme AÇIK ve KAPALI durumlarını karşılaştır.",
  fact:"Hareketi durduran şey, bir kuvvettir.",explain:"Sabit bir hızla hareket etmek için sürekli itiş gerekmez. Kayarak giden kutunun yavaşlamasında yüzey sürtünmesi ve hava direnci etkilidir. Sürtünme sıfırken kutu yine çarpışmalarla yön değiştirebilir.",
  formula:"F_sürtünme ≈ μ × N\nModel: Coulomb sürtünmesi + hız sönümü."},
 vacuum:{name:"Düşür",label:"DENEY 03 / VAKUM",title:"Tüy mü, ağır top mu?",
  copy:"İki cismi aynı anda bırak. Sonra hava direncini kapatıp yarışı tekrarla. Hava yoksa düşme ivmesi kütleden bağımsızdır.",
  action:"İKİSİNİ BIRAK ↓",tip:"Önce havayla dene; sonra hava direncini KAPAT ve yeniden bırak.",
  fact:"Vakumda ağır olan daha hızlı düşmez.",explain:"Yalnızca yerçekimi etkisinde bütün cisimlerin ivmesi aynıdır. Gerçek tüy ve top havada farklı davranır çünkü şekilleri ve hızları hava direncini değiştirir. Bu oyunda hava direnci ayrıntılı akış çözümü yerine basit sönüm olarak modelleniyor.",
  formula:"a = g  (hava direnci yokken)\nAynı yükseklik → eşit düşüş süresi."},
 basket:{name:"Sepete At",label:"DENEY 04 / YÖRÜNGE",title:"Fiziği değiştir, sayı yap.",
  copy:"Açıyı ve gücü ayarlayıp topu sepete gönder. Yerçekimini kapatınca kavisli yörüngenin nasıl değiştiğini gör.",
  action:"TOPU FIRLAT ↗",tip:"Açıyı ve gücü ayarla. Topu elinle de fırlatabilirsin.",
  fact:"Basket atışı küçük bir yörünge deneyidir.",explain:"Hava direnci yoksa fırlatılan topun yatay hızı sabit kalır, düşey hızı yerçekimiyle değişir. Yerçekimini kapatırsan top düz bir doğrultuda ilerler; atışın şekli başlangıç hızına bağlıdır.",
  formula:"x(t) = vₓ × t\ny(t) = vᵧ × t + ½ g t²"}
};
let W=1000,H=570,dpr=1,scale=1;
let engine=null,entities=[],decor=[],staticBodies=[],drag=null,selected=null;
let floorY=H-45,clock=0,accumulator=0,prevFrame=0;
let state={scene:"room",rules:{gravity:true,friction:true,air:true},running:false,started:false,completed:{},pushes:0,shots:0,result:"HAZIR",statusText:"Nesneler hareket etmeye hazır.",stopReason:"",shakeCount:0,ballTime:null,paperTime:null};
let sceneData={};
let noticeText="";
let noticeTimeout=null;
try{const data=JSON.parse(localStorage.getItem("aynen_fiziksel_badges")||"{}");if(data&&typeof data==="object")state.completed=data}catch(e){}
const pathParams=new URLSearchParams(location.search);
const initScene=scenarios[pathParams.get("scene")]?pathParams.get("scene"):"room";
function persist(){try{localStorage.setItem("aynen_fiziksel_badges",JSON.stringify(state.completed))}catch(e){}}
function countBadges(){return Object.keys(state.completed).filter(k=>state.completed[k]).length}
function updateStats(){
 $("metric-objects").textContent=entities.length;
 $("metric-gravity").textContent=state.rules.gravity?"NORMAL / g":"SIFIR / 0g";
 $("live-gravity").textContent=state.rules.gravity?"1g":"0g";
 $("live-air").textContent=state.rules.air?"AIR ON":"AIR OFF";
 $("rule-summary").textContent=Object.values(state.rules).filter(Boolean).length+" / 3 AÇIK";
 $("metric-status").textContent=state.result;
 $("observation").textContent=state.statusText;
 $("badge-counter").textContent=countBadges()+" / 4 KEŞİF";
 ["gravity","friction","air"].forEach(name=>{
  const b=document.querySelector('[data-rule="'+name+'"]');if(!b)return;
  b.classList.toggle("on",state.rules[name]);b.classList.toggle("off",!state.rules[name]);
  b.setAttribute("aria-pressed",String(state.rules[name]));
 });
 $("action").textContent=state.scene==="vacuum"&&state.started?"YARIŞI YENİDEN BAŞLAT ↻":state.scene==="basket"&&state.shots?"YENİDEN FIRLAT ↗":scenarios[state.scene].action;
 $("scene-time").textContent=(clock/1000).toFixed(1).padStart(5,"0")+" s";
}
function hud(message){$("hud-tip").textContent=message}
function observation(text,status){state.statusText=text;if(status)state.result=status;updateStats()}
function showNotice(title,copy,won){
 const notice=$("notice");
 $("notice-title").textContent=title;$("notice-copy").textContent=copy;
 $("notice-label").textContent=won?"DENEY BAŞARILI":"GÖZLEM KAYDEDİLDİ";
 notice.classList.add("visible");
 noticeText=title+" — "+copy;
 if(noticeTimeout)clearTimeout(noticeTimeout);
 noticeTimeout=setTimeout(()=>hideNotice(),8500);
}
function hideNotice(){
 if(noticeTimeout){clearTimeout(noticeTimeout);noticeTimeout=null}
 $("notice").classList.remove("visible");
 noticeText="";
}
function achievement(id,title,desc){
 if(!state.completed[id]){state.completed[id]=true;persist()}
 state.result="KEŞFEDİLDİ";showNotice(title,desc,true);observation(title,"KEŞFEDİLDİ");
}
function staticRect(x,y,w,h,style,opts={}){
 const b=Bodies.rectangle(x,y,w,h,Object.assign({isStatic:true,friction:.84,frictionStatic:1,restitution:.12},opts));
 b.lab={style,draw:true,defaultF:.84,defaultStatic:1,defaultAir:0};
 Composite.add(engine.world,b);decor.push(b);staticBodies.push(b);return b;
}
function solidWall(x,y,w,h){
 const b=Bodies.rectangle(x,y,w,h,{isStatic:true,friction:.85,frictionStatic:1,restitution:.45});
 b.lab={draw:false,defaultF:.85,defaultStatic:1,defaultAir:0};
 Composite.add(engine.world,b);staticBodies.push(b);return b;
}
function dynBox(x,y,w,h,type,opts={}){
 const base=Object.assign({friction:.48,frictionStatic:1.2,frictionAir:.007,restitution:.16,density:.0015,chamfer:{radius:Math.min(w,h)*.07}},opts);
 const b=Bodies.rectangle(x,y,w,h,base);
 b.lab={draw:true,type,w,h,defaultF:base.friction,defaultStatic:base.frictionStatic,defaultAir:base.frictionAir};
 Composite.add(engine.world,b);entities.push(b);return b;
}
function dynCircle(x,y,r,type,opts={}){
 const base=Object.assign({friction:.35,frictionStatic:.7,frictionAir:.003,restitution:.68,density:.0014},opts);
 const b=Bodies.circle(x,y,r,base,24);
 b.lab={draw:true,type,r,defaultF:base.friction,defaultStatic:base.frictionStatic,defaultAir:base.frictionAir};
 Composite.add(engine.world,b);entities.push(b);return b;
}
function syncRules(){
 if(!engine)return;
 engine.gravity.y=state.rules.gravity?1.12:0;
 const all=entities.concat(staticBodies);
 for(const b of all){
  const l=b.lab||{};
  b.friction=state.rules.friction?(l.defaultF==null?.5:l.defaultF):0;
  b.frictionStatic=state.rules.friction?(l.defaultStatic==null?1:l.defaultStatic):0;
  if(!b.isStatic)b.frictionAir=state.rules.air?(l.defaultAir==null?.004:l.defaultAir):0;
 }
 updateStats();
}
function rebuild(preserveRules){
 if(drag){Composite.remove(engine.world,drag);drag=null}
 hideNotice();entities=[];decor=[];staticBodies=[];sceneData={};clock=0;accumulator=0;
 state.running=false;state.started=false;state.pushes=0;state.shots=0;state.ballTime=null;state.paperTime=null;state.shakeCount=0;
 state.result="HAZIR";state.statusText="Deney hazır.";
 if(!preserveRules)state.rules={gravity:true,friction:true,air:true};
 engine=Engine.create({enableSleeping:false,positionIterations:9,velocityIterations:9,constraintIterations:5});
 engine.gravity.x=0;engine.gravity.y=1.12;engine.gravity.scale=.001;
 floorY=H-44;
 solidWall(W/2,-35,W+80,70);
 solidWall(-31,H/2,62,H*2);
 solidWall(W+31,H/2,62,H*2);
 solidWall(W/2,H+17,W+80,122);
 staticRect(W/2,floorY+25,W+80,50,"floor");
 if(state.scene==="room")setupRoom();
 if(state.scene==="slide")setupSlide();
 if(state.scene==="vacuum")setupVacuum();
 if(state.scene==="basket")setupBasket();
 syncRules();
 $("stage-title").textContent=state.scene.toUpperCase()+"_00"+(["room","slide","vacuum","basket"].indexOf(state.scene)+1)+" · LIVE SIM";
 hud(scenarios[state.scene].tip);
 updateControls();
 updateStats();
}
function setupRoom(){
 const shelf=H*.43,table=H*.72;
 staticRect(W*.23,shelf,W*.31,16,"shelf");
 staticRect(W*.63,table,W*.30,18,"table");
 staticRect(W*.51,(table+floorY)/2,12,floorY-table-7,"leg");
 staticRect(W*.75,(table+floorY)/2,12,floorY-table-7,"leg");
 dynCircle(W*.14,shelf-34,24,"ball");
 dynBox(W*.27,shelf-29,48,41,"block",{friction:.62});
 dynBox(W*.62,table-35,40,52,"cup",{friction:.72,restitution:.07});
 dynBox(W*.70,table-21,61,26,"book",{friction:.8});
 dynCircle(W*.88,H*.20,29,"beach",{density:.0008,frictionAir:.016});
 dynBox(W*.43,H*.16,43,50,"block2");
 sceneData.platformY=table;
}
function setupSlide(){
 sceneData.finishX=W*.76;
 sceneData.crate=dynBox(W*.15,floorY-31,62,62,"crate",{friction:.72,frictionStatic:1.8,frictionAir:.0015,restitution:.02});
 Body.setVelocity(sceneData.crate,{x:0,y:0});
}
function setupVacuum(){
 const y=H*.18;
 sceneData.ball=dynCircle(W*.32,y,26,"bowling",{frictionAir:.002,restitution:.07});
 sceneData.paper=dynBox(W*.69,y+13,60,26,"feather",{frictionAir:.105,friction:.35,restitution:.01,density:.00035});
 Body.setStatic(sceneData.ball,true);
 Body.setStatic(sceneData.paper,true);
 state.statusText="Cisimler serbest bırakılmayı bekliyor.";
}
function setupBasket(){
 sceneData.startX=W*.165;sceneData.startY=floorY-29;
 const xl=W*.72,xr=W*.945,top=floorY-151,bottom=floorY-31;
 sceneData.xl=xl;sceneData.xr=xr;sceneData.top=top;sceneData.bottom=bottom;
 staticRect(xl,(top+bottom)/2,15,bottom-top+8,"basket-left",{restitution:.23});
 staticRect(xr,(top+bottom)/2,15,bottom-top+8,"basket-right",{restitution:.23});
 staticRect((xl+xr)/2,bottom, xr-xl+10,12,"basket-base",{restitution:.18});
 sceneData.ball=dynCircle(sceneData.startX,sceneData.startY,24,"basket-ball",{restitution:.68,frictionAir:.003});
 sceneData.trail=[];
}
function updateControls(){
 const s=scenarios[state.scene];
 $("mission-label").textContent=s.label;$("mission-title").textContent=s.title;
 $("mission-copy").textContent=s.copy;
 $("fact-title").textContent=s.fact;$("fact-copy").textContent=s.explain;
 $("formula").textContent=s.formula;
 $("level").textContent=("0"+(["room","slide","vacuum","basket"].indexOf(state.scene)+1)).slice(-2)+" / 04";
 $("help").textContent=state.scene==="vacuum"?"Farkı görmek için önce havayla, sonra hava direnci kapalıyken tekrar dene.":"Nesneleri sürükleyip fırlatabilirsin. Her anahtar fiziği anında değiştirir.";
 $("tuning").classList.toggle("show",state.scene==="basket");
 document.querySelectorAll("[data-scene]").forEach(b=>{const on=b.dataset.scene===state.scene;b.classList.toggle("active",on);b.setAttribute("aria-pressed",String(on))});
 updateStats();
}
function selectScene(key){
 if(!scenarios[key])return;
 state.scene=key;rebuild(false);
 const url=new URL(location.href);url.searchParams.set("scene",key);history.replaceState(null,"",url.pathname+url.search);
}
function setRule(rule){
 state.rules[rule]=!state.rules[rule];syncRules();hideNotice();
 const names={gravity:"Yerçekimi",friction:"Sürtünme",air:"Hava direnci"};
 const isOn=state.rules[rule];const text=names[rule]+(isOn?" açıldı.":" kapatıldı.");
 hud(text+" "+(rule==="gravity"&&!isOn?"Nesneler kendiliğinden yukarı çıkmaz.":rule==="friction"&&!isOn?"Yüzey sürtünmesi artık hareketi durdurmuyor.":rule==="air"&&!isOn?"Hız sönümü kalktı; gerçek bir vakumun sadeleştirilmiş modeli.":""));
 observation(text,isOn?"KURAL AÇIK":"KURAL KAPALI");
 if(state.scene==="room"&&!state.rules.gravity&&!state.rules.friction&&!state.rules.air){
  achievement("room","Bütün kuralları kapattın.","Yerçekimi, sürtünme ve hava direnci sıfırlandı. Nesneleri şimdi it: duvar veya başka cisimle çarpışana kadar hareketlerini korurlar.");
 }
 if(state.scene==="vacuum"&&state.started){
  hud("Yarış sırasında kural değişti. Adil karşılaştırma için SIFIRLA, sonra tekrar bırak.");
 }
}
function shake(){
 state.shakeCount++;
 for(const b of entities){
  const vx=(Math.random()-.5)*14;
  const vy=-7-Math.random()*9;
  Body.setVelocity(b,{x:b.velocity.x+vx,y:b.velocity.y+vy});
  Body.setAngularVelocity(b,(Math.random()-.5)*.2);
 }
 observation("Oda sarsıldı. "+state.shakeCount+". deneme.","HAREKETLİ");
 hud(state.rules.gravity?"Nesneler yukarı savruldu, sonra yerçekimiyle geri düşecek.":"Yerçekimi yok. Yeni hızlar başka bir kuvvet olmadıkça sürer.");
}
function pushCrate(){
 const b=sceneData.crate;if(!b)return;
 state.pushes++;Body.setVelocity(b,{x:13.5,y:Math.min(0,b.velocity.y)});
 state.running=true;observation(state.pushes+". itiş yapıldı.","KAYIYOR");
 hud(state.rules.friction?"Sürtünme açık. Kutu yavaşlamaya başladı.":"Sürtünme kapalı. Hava direnci ve çarpışmalar hâlâ etkili.");
}
function startVacuum(){
 if(state.started){rebuild(true)}
 if(!state.rules.gravity){
  hud("Yerçekimi kapalı: cisimler serbest bırakıldığında kendiliğinden düşmez.");
  observation("Önce yerçekimini açmalısın.","0g / BEKLİYOR");return;
 }
 state.started=true;state.running=true;clock=0;state.ballTime=null;state.paperTime=null;
 for(const b of [sceneData.ball,sceneData.paper]){
  Body.setStatic(b,false);
  Body.setAngle(b,0);
  Body.setVelocity(b,{x:0,y:0});
  Body.setAngularVelocity(b,0);
 }
 syncRules();
 hud("İkisi aynı anda bırakıldı. Zamanları ölçüyoruz.");
 observation("Serbest düşüş başladı.","ÖLÇÜLÜYOR");
}
function launch(){
 const b=sceneData.ball;if(!b)return;
 state.shots++;state.running=true;state.started=true;clock=0;
 state.result="UÇUŞTA";
 Body.setPosition(b,{x:sceneData.startX,y:sceneData.startY});Body.setAngle(b,0);
 Body.setVelocity(b,{x:0,y:0});Body.setAngularVelocity(b,0);
 const angle=Number($("angle").value)*Math.PI/180,power=Number($("power").value);
 Body.setVelocity(b,{x:Math.cos(angle)*power,y:-Math.sin(angle)*power});
 sceneData.trail=[];
 hud("Top fırlatıldı. Düşüş eğrisini izle; sonra açı veya fiziği değiştir.");
 observation(state.shots+". atış yapıldı.","UÇUŞTA");
}
function action(){
 if(state.scene==="room")shake();
 else if(state.scene==="slide")pushCrate();
 else if(state.scene==="vacuum")startVacuum();
 else launch();
}
function evaluate(){
 if(state.scene==="slide"){
  const b=sceneData.crate;
  if(b&&state.running&&b.position.x>sceneData.finishX){
   achievement("slide","Hedefe ulaştın.",state.pushes<=1?"Kutuyu tek itişle hedefe ulaştırdın. Sürtünmeyi kapatmak büyük fark yaratıyor.":"Kutuyu "+state.pushes+" itişte hedefe ulaştırdın. Bir sonraki denemede sürtünmeyi kapatıp tek itişi dene.");
   state.running=false;
  }
 }else if(state.scene==="vacuum"&&state.started&&state.running){
  const bottomBall=sceneData.ball.bounds.max.y,bottomPaper=sceneData.paper.bounds.max.y;
  if(state.ballTime==null&&bottomBall>=floorY-4)state.ballTime=clock;
  if(state.paperTime==null&&bottomPaper>=floorY-4)state.paperTime=clock;
  if(state.ballTime!=null&&state.paperTime!=null){
   state.running=false;
   const diff=Math.abs(state.ballTime-state.paperTime);
   const times="Top "+(state.ballTime/1000).toFixed(2)+" sn · Kâğıt "+(state.paperTime/1000).toFixed(2)+" sn · fark "+(diff/1000).toFixed(2)+" sn.";
   if(!state.rules.air&&diff<=100){
    achievement("vacuum","Vakumda beraber düştüler.",times+" Hava direnci yokken kütle farkı yerçekimi ivmesini değiştirmedi.");
   }else{
    showNotice("Düşüş yarışı tamamlandı.",times+" Hava direncini kapatıp tekrar dene.",false);
    hud("Bu modelde ince kâğıt havada daha fazla hız kaybeder.");
    observation("Fark "+(diff/1000).toFixed(2)+" sn.","YARIŞ BİTTİ");
   }
  }
 }else if(state.scene==="basket"&&state.started&&state.running){
  const b=sceneData.ball;
  if(sceneData.trail.length===0||Vector.magnitude(Vector.sub(b.position,sceneData.trail[sceneData.trail.length-1]))>6){
   sceneData.trail.push({x:b.position.x,y:b.position.y});if(sceneData.trail.length>120)sceneData.trail.shift();
  }
  if(b.position.x>sceneData.xl+27&&b.position.x<sceneData.xr-27&&b.position.y>sceneData.top+35&&b.position.y<sceneData.bottom+5){
   achievement("basket","Sayı! Fiziği büktün.",state.shots+" atışta basket. Aynı gücü kullanıp yerçekimini kapatarak farkı gör.");
   state.running=false;
  }
 }
}
function share(){
 const n=countBadges(),s=scenarios[state.scene];
 const url=new URL(location.href);url.searchParams.set("scene",state.scene);
 const message=noticeText||("Fiziksel.'de "+s.name+" deneyindeyim. "+n+"/4 fizik keşfi açtım.");
 const payload={title:"Fiziksel. — aynen.fun",text:message,url:url.href};
 if(navigator.share){navigator.share(payload).catch(()=>{});return}
 if(navigator.clipboard){navigator.clipboard.writeText(payload.text+" "+payload.url).then(()=>{
  $("share").textContent="KOPYALANDI ✓";setTimeout(()=>$("share").textContent="SONUCU PAYLAŞ ↗",2000);
 }).catch(()=>window.prompt("Paylaş:",payload.text+" "+payload.url));}
 else window.prompt("Paylaş:",payload.text+" "+payload.url);
}
function measure(){
 const rect=STAGE.getBoundingClientRect();
 if(rect.width<10||rect.height<10)return;
 const useMobile=rect.width<650;
 const nextW=useMobile?680:1000;
 const nextH=nextW*rect.height/rect.width;
 const resized=Math.abs(nextW-W)>1||Math.abs(nextH-H)>15;
 W=nextW;H=nextH;
 scale=rect.width/W;
 dpr=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);
 if(resized&&engine)rebuild(true);
}
function pointerPos(e){
 const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};
}
function pointerStart(e){
 if(e.button!=null&&e.button!==0)return;
 if(state.scene==="vacuum")return;
 const p=pointerPos(e),hits=Query.point(entities.filter(b=>!b.isStatic),p);
 if(!hits.length)return;
 const body=hits[hits.length-1];selected=body;
 const local=Vector.rotate(Vector.sub(p,body.position),-body.angle);
 drag=Constraint.create({pointA:{x:p.x,y:p.y},bodyB:body,pointB:local,length:0,stiffness:.19,damping:.15,angularStiffness:.45});
 Composite.add(engine.world,drag);
 canvas.classList.add("dragging");canvas.setPointerCapture(e.pointerId);e.preventDefault();
 if(state.scene==="basket")state.started=true;
 if(state.scene==="room")hud("Bırakınca cisim, kazandığı momentumla hareket edecek.");
}
function pointerMove(e){if(!drag)return;const p=pointerPos(e);drag.pointA.x=p.x;drag.pointA.y=p.y;e.preventDefault()}
function pointerEnd(e){if(drag){Composite.remove(engine.world,drag);drag=null}selected=null;canvas.classList.remove("dragging");try{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)}catch(err){}}
canvas.addEventListener("pointerdown",pointerStart);canvas.addEventListener("pointermove",pointerMove);
canvas.addEventListener("pointerup",pointerEnd);canvas.addEventListener("pointercancel",pointerEnd);canvas.addEventListener("lostpointercapture",pointerEnd);
function paintBackground(){
 const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,"#283e3e");bg.addColorStop(.55,"#1d3130");bg.addColorStop(1,"#142529");
 ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 const light=ctx.createRadialGradient(W*.25,H*.14,5,W*.27,H*.18,W*.85);
 light.addColorStop(0,"#a8d0c01c");light.addColorStop(1,"#ffffff00");ctx.fillStyle=light;ctx.fillRect(0,0,W,H);
 ctx.strokeStyle="#ffffff0a";ctx.lineWidth=1;
 for(let x=0;x<W;x+=46){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
 for(let y=0;y<H;y+=46){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
 // Architectural wall window
 const wx=W*.055,wy=H*.13,ww=W*.15,wh=H*.32;
 ctx.fillStyle="#071b24";roundRect(wx,wy,ww,wh,Math.min(ww*.45,52));ctx.fill();
 const glow=ctx.createLinearGradient(wx,wy,wx+ww,wy+wh);glow.addColorStop(0,"#73b2ac3d");glow.addColorStop(1,"#b2ead80e");ctx.fillStyle=glow;roundRect(wx+6,wy+6,ww-12,wh-12,Math.min(ww*.4,47));ctx.fill();
 ctx.strokeStyle="#a9dfd335";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(wx+ww*.5,wy+8);ctx.lineTo(wx+ww*.5,wy+wh-8);ctx.moveTo(wx+7,wy+wh*.54);ctx.lineTo(wx+ww-7,wy+wh*.54);ctx.stroke();
 // Wall-foot and floor
 ctx.fillStyle="#15252a";ctx.fillRect(0,floorY-3,W,H-floorY+3);
 ctx.fillStyle="#425653";ctx.fillRect(0,floorY-4,W,4);
 ctx.fillStyle="#152125";ctx.fillRect(0,floorY+10,W,H-floorY);
 ctx.strokeStyle="#b4dccb1e";ctx.lineWidth=1;
 for(let x=0;x<W;x+=72){ctx.beginPath();ctx.moveTo(x,floorY+11);ctx.lineTo(x+30,H);ctx.stroke()}
}
function roundRect(x,y,w,h,r){
 r=Math.max(0,Math.min(r,w/2,h/2));
 ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
function drawStatic(body){
 if(!body.lab||!body.lab.draw||body.lab.style==="floor")return;
 const {style}=body.lab,bounds=body.bounds;const w=bounds.max.x-bounds.min.x,h=bounds.max.y-bounds.min.y;
 const x=body.position.x,y=body.position.y;
 ctx.save();ctx.translate(x,y);
 if(style==="shelf"||style==="table"){
  const wood=ctx.createLinearGradient(0,-h/2,0,h/2);wood.addColorStop(0,"#edc5a8");wood.addColorStop(.28,"#b98170");wood.addColorStop(1,"#75584d");
  ctx.fillStyle=wood;roundRect(-w/2,-h/2,w,h,3);ctx.fill();
  ctx.fillStyle="#fff6dd35";ctx.fillRect(-w/2+5,-h/2+2,w-10,2);
  if(style==="shelf"){ctx.fillStyle="#3a544d";ctx.fillRect(-w*.42,h*.5,w*.08,h*.7);ctx.fillRect(w*.34,h*.5,w*.08,h*.7)}
 }else if(style==="leg"){
  ctx.fillStyle="#80615a";roundRect(-w/2,-h/2,w,h,3);ctx.fill();
  ctx.fillStyle="#ba8b75";ctx.fillRect(-w/2+2,-h/2+3,2,h-6);
 }else if(style.indexOf("basket")===0){
  const g=ctx.createLinearGradient(0,0,w,0);g.addColorStop(0,"#e8c09c");g.addColorStop(1,"#c7836c");
  ctx.fillStyle=g;roundRect(-w/2,-h/2,w,h,3);ctx.fill();ctx.strokeStyle="#ffffff55";ctx.lineWidth=2;ctx.stroke();
 }
 ctx.restore();
}
function shape(body){
 const l=body.lab||{},x=body.position.x,y=body.position.y,w=l.w||40,h=l.h||40,r=l.r||20,t=l.type||"block";
 ctx.save();ctx.translate(x,y);ctx.rotate(body.angle);
 if(["ball","beach","bowling","basket-ball"].includes(t)){
  let colors=t==="beach"?["#fff4d6","#84caaa","#296d7a"]:t==="bowling"?["#e0dff0","#878ca4","#373b57"]:t==="basket-ball"?["#ffd09a","#e78950","#985136"]:["#fcecc7","#f0b565","#a35a52"];
  const g=ctx.createRadialGradient(-r*.33,-r*.4,2,0,0,r*1.12);
  g.addColorStop(0,colors[0]);g.addColorStop(.45,colors[1]);g.addColorStop(1,colors[2]);
  ctx.shadowColor="#020b0d66";ctx.shadowBlur=13;ctx.shadowOffsetY=6;
  ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.shadowBlur=0;
  ctx.lineWidth=Math.max(1.6,r*.06);ctx.strokeStyle=t==="basket-ball"?"#7e4335":t==="beach"?"#fff5d9aa":"#7b536b88";
  ctx.beginPath();ctx.arc(0,0,r*.75,-.9,.7);ctx.moveTo(-r*.95,0);ctx.quadraticCurveTo(0,r*.26,r*.95,0);ctx.stroke();
  if(t==="beach"){ctx.fillStyle="#fbe7aa";ctx.beginPath();ctx.arc(-r*.3,-r*.33,r*.12,0,Math.PI*2);ctx.fill()}
 }else{
  let top="#e4f5c9",bottom="#709c81",outline="#2b5641";
  if(t==="cup"){top="#e3f9ec";bottom="#64b7ab";outline="#438f83"}
  else if(t==="book"){top="#ede3fa";bottom="#8876b0";outline="#5a4a7c"}
  else if(t==="crate"){top="#ffe4b4";bottom="#c8985e";outline="#9b653d"}
  else if(t==="feather"){top="#fff9ef";bottom="#f7e2b8";outline="#d3ba91"}
  else if(t==="block2"){top="#f5d2c7";bottom="#c77e79";outline="#975e60"}
  const g=ctx.createLinearGradient(-w*.45,-h*.5,w*.3,h*.6);g.addColorStop(0,top);g.addColorStop(1,bottom);
  ctx.shadowColor="#060e0e77";ctx.shadowBlur=11;ctx.shadowOffsetY=5;
  ctx.fillStyle=g;roundRect(-w/2,-h/2,w,h,Math.min(5,w*.09));ctx.fill();ctx.shadowBlur=0;
  ctx.lineWidth=1.5;ctx.strokeStyle=outline;ctx.stroke();
  ctx.strokeStyle="#ffffffaa";ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-w/2+5,-h/2+6);ctx.lineTo(w/2-6,-h/2+6);ctx.stroke();
  if(t==="cup"){
   ctx.beginPath();ctx.ellipse(w*.47,-h*.05,w*.23,h*.24,-.16,-Math.PI/2,Math.PI/2);ctx.lineWidth=5;ctx.strokeStyle="#9dd7ca";ctx.stroke();
   ctx.beginPath();ctx.ellipse(0,-h*.47,w*.42,4,0,0,Math.PI*2);ctx.fillStyle="#6aa99d";ctx.fill();
   ctx.fillStyle="#ffffff80";roundRect(-w*.3,-h*.33,w*.12,h*.47,3);ctx.fill();
  }else if(t==="book"){
   ctx.fillStyle="#fcf8e6";ctx.fillRect(-w*.46,h*.14,w*.9,h*.15);
   ctx.fillStyle="#584a77";ctx.fillRect(-w*.4,-h*.42,w*.14,h*.19);
  }else if(t==="feather"){
   ctx.beginPath();ctx.moveTo(-w*.4,h*.3);ctx.quadraticCurveTo(w*.1,-h*.4,w*.44,-h*.18);ctx.strokeStyle="#c5a279";ctx.lineWidth=2;ctx.stroke();
   for(let i=-2;i<3;i++){ctx.beginPath();ctx.moveTo(i*w*.12,h*.14);ctx.lineTo(i*w*.14+w*.12,-h*.28);ctx.strokeStyle="#d7bea0aa";ctx.lineWidth=1;ctx.stroke()}
  }else if(t==="crate"){
   ctx.strokeStyle="#a87749";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-w*.37,-h*.3);ctx.lineTo(w*.37,h*.3);ctx.moveTo(-w*.37,h*.3);ctx.lineTo(w*.37,-h*.3);ctx.stroke();
  }else {
   ctx.fillStyle="#ffffff63";ctx.fillRect(-w*.29,-h*.3,w*.09,h*.58);
  }
 }
 ctx.restore();
}
function paintOverlays(){
 ctx.save();
 if(state.scene==="slide"){
  const x=sceneData.finishX;
  ctx.fillStyle="#a5ffc720";ctx.fillRect(x,floorY-85,W-x-25,84);
  ctx.strokeStyle="#b9ffcfaa";ctx.setLineDash([7,7]);ctx.lineWidth=2;ctx.strokeRect(x,floorY-85,W-x-25,84);ctx.setLineDash([]);
  ctx.font="500 14px 'DM Mono',monospace";ctx.textAlign="center";ctx.fillStyle="#c6ffe4";ctx.fillText("HEDEF",x+(W-x-25)/2,floorY-100);
  ctx.strokeStyle="#ffffff5a";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(W*.15,floorY-120);ctx.lineTo(x,floorY-120);ctx.stroke();
 }else if(state.scene==="vacuum"){
  const y=H*.18;
  ctx.setLineDash([5,7]);ctx.strokeStyle="#ecfff13b";ctx.beginPath();ctx.moveTo(W*.5,H*.14);ctx.lineTo(W*.5,floorY);ctx.stroke();
  ctx.beginPath();ctx.moveTo(W*.13,y+26);ctx.lineTo(W*.89,y+26);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle="#d4efdf";ctx.textAlign="center";ctx.font="500 13px 'DM Mono',monospace";
  ctx.fillText("AĞIR TOP",W*.32,y-50);ctx.fillText("İNCE KÂĞIT",W*.69,y-50);
  if(state.started){
   ctx.fillStyle="#d6eee0b0";ctx.font="12px 'DM Mono',monospace";
   ctx.fillText(state.ballTime==null?"DÜŞÜYOR":(state.ballTime/1000).toFixed(2)+" s",W*.32,floorY-23);
   ctx.fillText(state.paperTime==null?"DÜŞÜYOR":(state.paperTime/1000).toFixed(2)+" s",W*.69,floorY-23);
  }
 }else if(state.scene==="basket"){
  const l=sceneData;
  ctx.strokeStyle="#ebffdc45";ctx.lineWidth=1;
  ctx.setLineDash([5,6]);ctx.beginPath();ctx.arc(l.startX,l.startY,40,Math.PI*1.08,Math.PI*1.9);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle="#e3ecd4";ctx.textAlign="center";ctx.font="500 13px 'DM Mono',monospace";
  ctx.fillText("SEPET", (l.xl+l.xr)/2,l.top-38);
  ctx.strokeStyle="#ffffff70";ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(l.xl+12,l.top+8);ctx.lineTo(l.xr-12,l.top+8);ctx.stroke();
  for(let x=l.xl+18;x<l.xr;x+=17){ctx.beginPath();ctx.moveTo(x,l.top+14);ctx.lineTo(x+17,l.bottom-10);ctx.strokeStyle="#e4eadb23";ctx.stroke()}
  if(l.trail&&l.trail.length>1){
   ctx.beginPath();for(let i=0;i<l.trail.length;i++){const p=l.trail[i];if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)}
   ctx.strokeStyle="#fcebb080";ctx.lineWidth=2;ctx.stroke();
  }
 }else if(state.scene==="room"){
  ctx.fillStyle="#dff5dfaf";ctx.font="11px 'DM Mono',monospace";ctx.textAlign="right";
  ctx.fillText("← TUT · SÜRÜKLE · FIRLAT",W-30,H*.105);
 }
 ctx.restore();
}
function render(){
 if(!ctx)return;
 ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
 paintBackground();
 paintOverlays();
 decor.forEach(drawStatic);
 // Glow shadows from objects on the floor
 for(const b of entities){
  const x=Math.min(W,Math.max(0,b.position.x)),dist=Math.max(0,floorY-b.bounds.max.y);
  ctx.save();ctx.globalAlpha=Math.max(.03,.24-dist/(H*1.9));ctx.fillStyle="#000";ctx.beginPath();
  ctx.ellipse(x,floorY-1,Math.min(58,(b.lab.w||b.lab.r*2||40)*.6+dist*.07),7+dist*.012,0,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 entities.forEach(shape);
 if(drag&&selected){
  ctx.strokeStyle="#edffca94";ctx.lineWidth=2;ctx.setLineDash([4,5]);ctx.beginPath();
  ctx.moveTo(drag.pointA.x,drag.pointA.y);ctx.lineTo(selected.position.x,selected.position.y);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle="#eafbd0";ctx.beginPath();ctx.arc(drag.pointA.x,drag.pointA.y,5,0,Math.PI*2);ctx.fill();
 }
}
function run(now){
 if(!prevFrame)prevFrame=now;
 const dt=Math.min(55,now-prevFrame);prevFrame=now;
 if(engine&&document.visibilityState!=="hidden"){
  accumulator+=dt;
  let loops=0;
  while(accumulator>=STEPS&&loops<4){
   Engine.update(engine,STEPS);
   clock+=STEPS;evaluate();
   accumulator-=STEPS;loops++;
  }
  render();
  $("scene-time").textContent=(clock/1000).toFixed(1).padStart(5,"0")+" s";
 }
 requestAnimationFrame(run);
}
const science=$("science-overlay"), scienceOpen=$("science-open"), scienceClose=$("science-close");
function openScience(){
 science.hidden=false;
 scienceClose.focus();
}
function closeScience(){
 if(science.hidden)return;
 science.hidden=true;
 scienceOpen.focus();
}
scienceOpen.addEventListener("click",openScience);
scienceClose.addEventListener("click",closeScience);
science.addEventListener("click",e=>{if(e.target===science)closeScience()});
$("notice-close").addEventListener("click",hideNotice);
document.querySelectorAll("[data-scene]").forEach(b=>b.addEventListener("click",()=>selectScene(b.dataset.scene)));
document.querySelectorAll("[data-rule]").forEach(b=>b.addEventListener("click",()=>setRule(b.dataset.rule)));
$("action").addEventListener("click",action);
$("reset").addEventListener("click",()=>{rebuild(true);hud("Sahne sıfırlandı. Seçtiğin fizik ayarları korundu.")});
$("angle").addEventListener("input",e=>$("angle-label").textContent=e.target.value+"°");
$("power").addEventListener("input",e=>$("power-label").textContent=e.target.value);
$("share").addEventListener("click",share);$("notice-share").addEventListener("click",share);
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"&&!science.hidden){e.preventDefault();closeScience();return}
 if(!science.hidden)return;
 if(e.target&&["INPUT","BUTTON","TEXTAREA","SELECT"].includes(e.target.tagName))return;
 if(e.code==="Space"){e.preventDefault();action()}
 if(["Digit1","Digit2","Digit3","Digit4"].includes(e.code))selectScene(["room","slide","vacuum","basket"][Number(e.code[5])-1]);
});
window.addEventListener("resize",measure);
if(typeof ResizeObserver!=="undefined")new ResizeObserver(()=>measure()).observe(STAGE);
requestAnimationFrame(()=>{
 measure();state.scene=initScene;rebuild(false);requestAnimationFrame(run);
});
})();