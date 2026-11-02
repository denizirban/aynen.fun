import {IstanbulMap,AREAS,rad,distance,angle,travel,turn} from "./dugun-istanbul-map.js";
import {CityScene3D} from "./dugun-city-scene.js";
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const SPEC={
 sahin:{accel:11.5,brake:18,top:27,grip:1.0},
 toros:{accel:9.6,brake:16.6,top:23,grip:1.1},
 doblo:{accel:10.1,brake:18.2,top:24,grip:.91}
};
const NAMES=["Nikâh şahidi","Gelin kuzeni","Saz ekibi","Fotoğrafçı","Yengeler","Damat arkadaşları","Mahalle teyzesi","Davulcu","Takı çantası","Pastacı","Gelinlik terzisi","Çiçekçi"];
const PLACES=["Düğün salonu","Nikâh dairesi","Kuaför","Takı masası","Salon girişi","Fotoğraf çekimi"];
const keys={gas:false,brake:false,left:false,right:false,handbrake:false};
let area="kadikoy",kind="sahin",city=null,render3D=null,ready=false,pending=false,playing=false,paused=true,muted=false,free=false;
let timer=180,earnings=0,deliveries=0,stolen=0,convoy=1,mission=null,car=null,rival=null,traffic=[],route=[],toastEnd=0,resetRide=0,roadRefresh=0,routeRefresh=0,camRefresh=0,hitCooldown=0;
let last=performance.now(),frame=0;
const soundCtx={value:null};
function sound(freq=520,duration=.15){
 if(muted)return;
 try{
  const context=soundCtx.value||(soundCtx.value=new (window.AudioContext||window.webkitAudioContext)());
  if(context.state==="suspended")context.resume();
  const osc=context.createOscillator(),gain=context.createGain();
  osc.type="sawtooth";osc.frequency.setValueAtTime(freq,context.currentTime);
  gain.gain.setValueAtTime(.026,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+duration);
  osc.connect(gain);gain.connect(context.destination);osc.start();osc.stop(context.currentTime+duration);
 }catch(e){}
}
function toast(message,sec=1.8){
 $("toast").textContent=message;$("toast").classList.add("show");toastEnd=performance.now()+sec*1000;
}
function choices(group,type,change){
 document.querySelectorAll("#"+group+" .option").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll("#"+group+" .option").forEach(el=>el.classList.remove("selected"));
  btn.classList.add("selected");change(btn.dataset[type]);
 }));
}
choices("districts","district",v=>{area=v;if(ready&&!playing)city.jumpToArea(v)});
choices("cars","car",v=>{kind=v});
const inputKeys={ArrowUp:"gas",KeyW:"gas",ArrowDown:"brake",KeyS:"brake",ArrowLeft:"left",KeyA:"left",ArrowRight:"right",KeyD:"right",ShiftLeft:"handbrake",ShiftRight:"handbrake"};
window.addEventListener("keydown",e=>{
 if(inputKeys[e.code]){keys[inputKeys[e.code]]=true;e.preventDefault()}
 if(e.code==="Space"){e.preventDefault();if(!e.repeat)horn()}
 if(e.code==="KeyP"&&!e.repeat){e.preventDefault();togglePause()}
});
window.addEventListener("keyup",e=>{if(inputKeys[e.code]){keys[inputKeys[e.code]]=false;e.preventDefault()}});
function clearKeys(){for(const k of Object.keys(keys))keys[k]=false;document.querySelectorAll(".ctr").forEach(b=>b.classList.remove("pressed"))}
window.addEventListener("blur",()=>{clearKeys();if(playing&&!paused)togglePause()});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&playing&&!paused)togglePause()});
for(const button of document.querySelectorAll("[data-hold]")){
 const k=button.dataset.hold;
 button.addEventListener("pointerdown",e=>{e.preventDefault();keys[k]=true;button.classList.add("pressed");try{button.setPointerCapture(e.pointerId)}catch(x){}});
 const stop=()=>{keys[k]=false;button.classList.remove("pressed")};
 for(const event of ["pointerup","pointercancel","lostpointercapture"])button.addEventListener(event,stop);
}
$("horn").addEventListener("pointerdown",e=>{e.preventDefault();horn()});
$("pause").addEventListener("click",togglePause);
$("sound").addEventListener("click",()=>{muted=!muted;$("sound").textContent=muted?"SES KAPALI":"SES AÇIK";if(!muted)sound()});
$("start").addEventListener("click",()=>startGame(false));
$("freeroam").addEventListener("click",()=>startGame(true));
window.addEventListener("resize",()=>city?.map?.resize());
function togglePause(){
 if(!playing)return;
 paused=!paused;
 $("pause").textContent=paused?"DEVAM ET":"DURAKLAT";
 if(paused)toast("DURAKLATILDI",1.2);
 last=performance.now();clearKeys();
}
function horn(){
 if(!playing||paused)return;
 sound(310,.18);setTimeout(()=>sound(430,.10),115);
 const nearby=traffic.find(v=>v.pos&&distance(v.pos,car.pos)<13);
 if(nearby){convoy++;earnings+=50;toast("KONVOYA ARAÇ KATILDI · +₺50",1.5)}
}
function hud(on){$("hud").classList.toggle("on",on);$("controls").style.visibility=on?"visible":"hidden"}
function finish(cause){
 playing=false;paused=true;clearKeys();hud(false);
 $("panel").innerHTML='<div class="eyebrow">DÜĞÜN KONVOYU · İSTANBUL 3D</div><h1>'+cause+'</h1><p>İstanbul sokaklarındaki turun tamamlandı.</p><div id="end-summary">₺'+earnings.toLocaleString("tr-TR")+'<br>'+deliveries+' TESLİMAT · '+stolen+' YOLCU KAPMA · '+convoy+' KONVOY</div><button id="again">YENİDEN SÜR</button><p>Gerçek sokak haritası OpenStreetMap üzerinden yüklenir. Üç boyutlu bina yüksekliği, mevcut harita verisine göre gösterilir.</p>';
 $("again").style.cssText="width:100%;padding:16px;border-radius:14px;background:#c7ec72;border:0;font-weight:800;margin-top:16px";
 $("again").addEventListener("click",()=>startGame(free));
 $("overlay").hidden=false;
}
function startGame(unlimited){
 if(!ready){pending=unlimited?"free":"timed";$("loadstate").textContent="Gerçek harita ve yol ağı yükleniyor…";return}
 pending=false;free=unlimited;
 playing=true;paused=false;timer=180;earnings=0;deliveries=0;stolen=0;convoy=1;mission=null;
 car={pos:[...AREAS[area].center],speed:0,heading:0,steering:0,health:100,offroad:false};
 city.refresh(car.pos,true);
 const near=city.nearest(car.pos);
 if(near){car.pos=near.p;car.heading=angle(near.road.a,near.road.b)}
 rival={pos:null,heading:0,speed:10.5,route:[],index:1,cooldown:0};
 traffic=[];
 for(let i=0;i<(window.innerWidth<700?5:10);i++)traffic.push({pos:null,road:null,heading:0,t:0,speed:6+Math.random()*6,cooldown:0});
 if(!render3D){render3D=new CityScene3D(city)}
 render3D.setOrigin(AREAS[area].center);render3D.setCar(kind);
 city.map.jumpTo({center:car.pos,zoom:18.08,pitch:69,bearing:car.heading/rad});
 $("overlay").hidden=true;hud(true);$("pause").textContent="DURAKLAT";
 resetRide=0;last=performance.now();
 spawnMission();seedTraffic();toast(AREAS[area].name.toLocaleUpperCase("tr-TR")+" · ŞEHİR SENİN",2);
}
function seedTraffic(){
 if(!city.roads.length)return;
 for(const v of traffic){
  const seg=city.roads[Math.floor(Math.random()*city.roads.length)];
  v.road=seg;v.t=Math.random();v.pos=[seg.a[0]+(seg.b[0]-seg.a[0])*v.t,seg.a[1]+(seg.b[1]-seg.a[1])*v.t];
  v.heading=angle(seg.a,seg.b);
 }
}
function spawnMission(){
 if(mission||!city.roads.length)return;
 const pickup=city.sample(car.pos,60,180);
 const dropoff=pickup&&city.sample(pickup,175,430);
 if(!pickup||!dropoff){$("mission-name").textContent="Yakındaki sokaklar yükleniyor…";return}
 mission={
  passenger:NAMES[Math.floor(Math.random()*NAMES.length)],
  venue:PLACES[Math.floor(Math.random()*PLACES.length)],pickup,dropoff,
  phase:"pickup",owner:null,clock:0
 };
 rival.pos=city.sample(car.pos,90,170)||[...car.pos];
 rival.speed=9+Math.random()*2;rival.cooldown=1.1;
 refreshRivalRoute();refreshRoute();updateMissionText();
}
function refreshRoute(){
 if(!mission||!city)return;
 const target=mission.phase==="pickup"?mission.pickup:mission.dropoff;
 route=city.route(car.pos,target);city.setRoute(route);
}
function refreshRivalRoute(){
 if(!mission||!rival?.pos)return;
 const destination=mission.phase==="pickup"?mission.pickup:mission.dropoff;
 rival.route=city.route(rival.pos,destination);rival.index=1;
}
function nextMission(){
 mission=null;route=[];city.setRoute([]);resetRide=.7;
}
function deliver(who){
 if(!mission)return;
 if(who==="player"){
  const tip=Math.floor(320+distance(mission.pickup,mission.dropoff)*2.4+Math.max(0,mission.clock)*20);
  earnings+=tip;deliveries++;timer+=20;
  toast("TESLİMAT TAMAM · ₺"+tip.toLocaleString("tr-TR")+" · +20 SN",2.1);
  sound(600,.13);setTimeout(()=>sound(800,.16),125);
 }else{timer=Math.max(0,timer-8);toast("RAKİP ÖNCE YETİŞTİ · -8 SN",2)}
 nextMission();
}
function drive(dt){
 const spec=SPEC[kind],direction=Number(keys.right)-Number(keys.left),steerTarget=direction*(.57/(1+Math.abs(car.speed)/12));
 car.steering+=(steerTarget-car.steering)*Math.min(1,dt*5.6);
 if(keys.gas)car.speed+=spec.accel*dt*(1-.20*Math.max(0,car.speed)/spec.top);
 if(keys.brake)car.speed-=spec.brake*dt*(car.speed>0?1:.45);
 if(!keys.gas&&!keys.brake){
  const friction=1.5+.012*car.speed*car.speed;
  car.speed-=Math.sign(car.speed)*Math.min(Math.abs(car.speed),friction*dt);
 }
 const near=city.nearest(car.pos);
 car.offroad=!!near&&near.dist>(near.road.typ==="primary"?10:7);
 if(car.offroad)car.speed*=Math.max(.7,1-dt*(near.dist>16?1.4:.6));
 car.speed=clamp(car.speed,-6,spec.top*(car.offroad?.62:1));
 let yaw=car.speed/3.6*Math.tan(car.steering)*spec.grip;
 if(keys.handbrake)yaw*=1.6;
 car.heading=(car.heading+yaw*dt+Math.PI*2)%(2*Math.PI);
 const previous=car.pos;
 car.pos=travel(car.pos,car.heading,car.speed*dt);
 if(keys.handbrake&&Math.abs(car.speed)>8&&Math.abs(car.steering)>.18&&frame%6===0)city.skid(previous,car.pos);
 if(city.insideBuilding?.(car.pos)){
  car.pos=previous;
  if(Math.abs(car.speed)>3&&hitCooldown<=0){
   hitCooldown=.9;car.health=Math.max(0,car.health-5);
   sound(190,.19);toast("BİNAYA ÇARPTIN · HASAR",1.1);
  }
  car.speed*=-.22;
 }
 if(near&&near.dist>18&&Math.abs(car.speed)>4)car.health=Math.max(0,car.health-dt*1.1);
 if(car.health<=0){finish("ARABA YOLDA KALDI");return}
 if(mission){
  const target=mission.phase==="pickup"?mission.pickup:mission.dropoff;
  const d=distance(car.pos,target);
  if(mission.phase==="pickup"&&mission.owner===null&&d<10&&Math.abs(car.speed)<6.8){
   mission.phase="dropoff";mission.owner="player";mission.clock=Math.max(47,36+distance(mission.pickup,mission.dropoff)/8);
   toast(mission.passenger.toLocaleUpperCase("tr-TR")+" BİNDİ",1.5);
   sound(540,.17);refreshRivalRoute();refreshRoute();updateMissionText();
  }else if(mission.phase==="dropoff"&&mission.owner==="player"&&d<10&&Math.abs(car.speed)<6.8)deliver("player");
  if(mission&&mission.phase==="dropoff"){
   mission.clock-=dt;
   if(mission.clock<=0){toast("MİSAFİRİN SÜRESİ DOLDU",1.3);nextMission()}
  }
 }
}
function advanceTraffic(dt){
 if(!city.roads.length)return;
 for(const npc of traffic){
  if(!npc.road)continue;
  npc.t+=npc.speed*dt/Math.max(1,npc.road.len);
  if(npc.t>=1){
   const id=npc.road.b[0].toFixed(5)+":"+npc.road.b[1].toFixed(5);
   const possible=city.edges.get(id)||[],choice=possible[Math.floor(Math.random()*possible.length)];
   if(choice&&city.nodes.get(choice.node)){
    npc.road={a:npc.road.b,b:city.nodes.get(choice.node),len:choice.d};
   }else npc.road=city.roads[Math.floor(Math.random()*city.roads.length)];
   npc.t=0;
  }
  const seg=npc.road;
  npc.pos=[seg.a[0]+(seg.b[0]-seg.a[0])*npc.t,seg.a[1]+(seg.b[1]-seg.a[1])*npc.t];
  npc.heading=angle(seg.a,seg.b);
  npc.cooldown=Math.max(0,npc.cooldown-dt);
  if(npc.cooldown===0&&Math.abs(car.speed)>5&&distance(npc.pos,car.pos)<3.5){
   npc.cooldown=2.3;car.speed*=-.25;car.health=Math.max(0,car.health-5);sound(180,.16);toast("TRAFİĞE DİKKAT · HASAR",1.2);
  }
  if(distance(npc.pos,car.pos)>490){
   const near=city.roads.filter(v=>Math.min(distance(car.pos,v.a),distance(car.pos,v.b))<250);
   if(near.length){npc.road=near[Math.floor(Math.random()*near.length)];npc.t=0}
  }
 }
}
function advanceRival(dt){
 if(!rival.pos||!mission)return;
 rival.cooldown=Math.max(0,rival.cooldown-dt);
 if(!rival.route?.length)refreshRivalRoute();
 const p=rival.route[rival.index];
 if(p){
  const remaining=distance(rival.pos,p),h=angle(rival.pos,p);
  rival.heading+=clamp(turn(h,rival.heading),-dt*2,dt*2);
  rival.pos=travel(rival.pos,rival.heading,Math.min(remaining,rival.speed*dt));
  if(remaining<3)rival.index++;
 }else if(rival.cooldown<=0){refreshRivalRoute();rival.cooldown=.8}
 const target=mission.phase==="pickup"?mission.pickup:mission.dropoff;
 if(distance(rival.pos,target)<8){
  if(mission.phase==="pickup"&&mission.owner===null){
   mission.phase="dropoff";mission.owner="rival";mission.clock=70;
   toast("RAKİP MİSAFİRİ ALDI! TAKİP ET",2.1);sound(280,.2);
   refreshRivalRoute();refreshRoute();updateMissionText();
  }else if(mission.phase==="dropoff"&&mission.owner==="rival"){deliver("rival");return;}
 }
 if(distance(car.pos,rival.pos)<3.6&&hitCooldown<=0){
  hitCooldown=2.6;rival.cooldown=1;car.health=Math.max(0,car.health-7);car.speed*=-.30;
  if(mission.owner==="rival"){
   mission.owner="player";stolen++;earnings+=200;
   toast("ÇARPTIN · MİSAFİRİ KAPTIN · ₺200",2);sound(700,.23);
  }else if(mission.owner==="player"){
   mission.owner="rival";toast("RAKİP ÇARPTI · MİSAFİRİ ALDI",2);
  }else toast("ARAÇLAR ÇARPIŞTI",1.2);
  refreshRivalRoute();refreshRoute();updateMissionText();
 }
}
function updateMissionText(){
 if(!mission)return;
 $("mission-state").textContent=mission.phase==="pickup"?"MİSAFİRİ AL":mission.owner==="rival"?"MİSAFİR RAKİPTE":"HEDEFE YETİŞTİR";
 $("mission-name").textContent=mission.phase==="pickup"?mission.passenger:mission.venue;
 $("mission-info").textContent=mission.phase==="pickup"?"Sarı işarete yanaş. Yavaşlayınca misafir biner.":"Yeşil teslimat noktasına git; doğru sokaktan dön.";
}
function updateHUD(){
 const secs=Math.ceil(Math.max(0,timer));
 $("time").textContent=free?"∞":String(Math.floor(secs/60)).padStart(2,"0")+":"+String(secs%60).padStart(2,"0");
 $("time").classList.toggle("urgent",timer<30&&!free);
 $("money").textContent="₺"+earnings.toLocaleString("tr-TR");
 $("speed").textContent=Math.round(Math.abs(car.speed)*3.6);
 $("car-health").textContent="ARAÇ %"+Math.round(car.health)+ (car.offroad?" · YOL DIŞI":"");
 $("convoy").textContent=convoy;$("trips").textContent=deliveries;
 if(!mission){
  $("mission-state").textContent="YENİ GÖREV";
  $("mission-name").textContent=city.roads.length?"Sıradaki misafir geliyor":"Gerçek sokaklar yükleniyor...";
  $("mission-distance").textContent="—";$("mission-timer").textContent="";
  return;
 }
 const goal=mission.phase==="pickup"?mission.pickup:mission.dropoff,d=distance(car.pos,goal);
 $("mission-distance").textContent=d<1000?Math.round(d)+" METRE":(d/1000).toFixed(1)+" KM";
 $("mission-timer").textContent=mission.phase==="dropoff"?"YOLCU: "+Math.ceil(Math.max(0,mission.clock))+" SN": "YAVAŞLAYINCA BİNER";
 const aim=turn(angle(car.pos,goal),car.heading);
 $("turn-arrow").textContent=Math.abs(aim)<.32?"↑":Math.abs(aim)>2.55?"↶":aim>0?"↗":"↖";
 $("turn-hint").textContent=Math.abs(aim)<.32?"DÜZ DEVAM":Math.abs(aim)>2.55?"GERİ DÖN":aim>0?"SAĞA YÖNEL":"SOLA YÖNEL";
}
const ctx=$("minimap").getContext("2d");
function drawMini(){
 const canvas=$("minimap"),w=canvas.width,h=canvas.height;
 ctx.clearRect(0,0,w,h);ctx.fillStyle="#223c44";ctx.fillRect(0,0,w,h);
 const toPx=p=>[(p[0]-car.pos[0])*111320*Math.cos(car.pos[1]*rad)/1.25,(car.pos[1]-p[1])*111320/1.25];
 ctx.save();ctx.translate(w/2,h/2);
 for(const r of city.roads){
  const a=toPx(r.a),b=toPx(r.b);
  if(Math.abs(a[0])>240&&Math.abs(b[0])>240)continue;
  if(Math.abs(a[1])>220&&Math.abs(b[1])>220)continue;
  ctx.strokeStyle=r.typ==="primary"?"#a7babb":"#65888b";ctx.lineWidth=r.typ==="primary"?5:2.6;
  ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
 }
 if(route?.length>1){
  ctx.strokeStyle="#ffdf80";ctx.lineWidth=4;ctx.beginPath();
  route.forEach((p,i)=>{const q=toPx(p);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.stroke();
 }
 if(mission){
  const m=toPx(mission.phase==="pickup"?mission.pickup:mission.dropoff);
  ctx.fillStyle=mission.phase==="pickup"?"#ffcf65":"#9de6b7";ctx.beginPath();ctx.arc(m[0],m[1],7,0,2*Math.PI);ctx.fill();
 }
 if(rival.pos){
  const p=toPx(rival.pos);ctx.fillStyle="#f4a5b1";ctx.beginPath();ctx.arc(p[0],p[1],5,0,2*Math.PI);ctx.fill();
 }
 ctx.rotate(car.heading);ctx.fillStyle="#eaf6e2";ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(8,9);ctx.lineTo(-8,9);ctx.fill();ctx.restore();
 ctx.fillStyle="#ecf5e9";ctx.font="bold 16px sans-serif";ctx.fillText(AREAS[area].name,14,22);
}
function frameLoop(now){
 const dt=clamp((now-last)/1000,0,.045);last=now;
 if(ready&&playing&&!paused){
  drive(dt);
  if(playing){
   hitCooldown=Math.max(0,hitCooldown-dt);
   advanceTraffic(dt);advanceRival(dt);
   if(!free){timer-=dt;if(timer<=0){timer=0;finish("DÜĞÜN BİTTİ")}}
   if(playing){
    resetRide=Math.max(0,resetRide-dt);
    if(!mission&&resetRide<=0)spawnMission();
    roadRefresh+=dt;routeRefresh+=dt;camRefresh+=dt;
    if(roadRefresh>4){roadRefresh=0;city.refresh(car.pos);if(!mission)spawnMission()}
    if(routeRefresh>2){routeRefresh=0;refreshRoute()}
    if(camRefresh>.028){city.chase(car.pos,car.heading,camRefresh,hitCooldown>0?1.1:0,car.speed);camRefresh=0}
    render3D?.update({car,rival,mission,traffic,controls:keys},dt,now);
    if(frame++%3===0){updateHUD();drawMini()}
   }
  }
 }
 if(ready&&!playing&&render3D&&car)render3D.update({car,rival,mission,traffic,controls:keys},dt,now);
 if(now>toastEnd)$("toast").classList.remove("show");
 requestAnimationFrame(frameLoop);
}
function readyMap(){
 ready=true;
 render3D=new CityScene3D(city);
 $("loadstate").textContent="3D şehir motoru hazır. İstanbul sokakları yükleniyor…";
 if(area!==city.area)city.jumpToArea(area);
 if(pending)startGame(pending==="free");
}
function errorMap(message){$("loadstate").textContent="Harita hatası: "+message}
city=new IstanbulMap(area,readyMap,errorMap);
requestAnimationFrame(frameLoop);
