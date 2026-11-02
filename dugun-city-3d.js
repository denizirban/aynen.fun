import {IstanbulMap,AREAS,rad,distance,angle,travel,turn} from "./dugun-istanbul-map.js?v=20261102-v11";
import {CityScene3D} from "./dugun-city-scene.js?v=20261102-v11";
import {StableNavigation} from "./dugun-navigation.js?v=20261102-v10";
import {stepVehicle,roadHalfWidth} from "./dugun-driving-dynamics.js?v=20261102-v10";
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const SPEC={
 sahin:{accel:11.5,brake:18,top:27,grip:1.0},
 toros:{accel:9.6,brake:16.6,top:23,grip:1.1},
 doblo:{accel:10.1,brake:18.2,top:24,grip:.91}
};
const NAMES=["Nikâh şahidi","Gelin kuzeni","Saz ekibi","Fotoğrafçı","Yengeler","Damat arkadaşları","Mahalle teyzesi","Davulcu","Takı çantası","Pastacı","Gelinlik terzisi","Çiçekçi"];
const PLACES=["Düğün salonu","Nikâh dairesi","Kuaför","Takı masası","Salon girişi","Fotoğraf çekimi"];
const CHALLENGES=[
 {id:"normal",tag:"DÜĞÜN SERVİSİ",info:"Hedefe yetiştir, bahşişini al."},
 {id:"express",tag:"ACİL SERVİS",info:"Sürenin en az %40'ı kalırken teslim et.",bonus:500},
 {id:"careful",tag:"HASSAS YÜK",info:"Yolcuyu çarpışmadan ulaştır.",bonus:450},
 {id:"horn",tag:"KONVOY GÖREVİ",info:"Yolculukta 2 kez korna çal.",bonus:280}
];
const keys={gas:false,brake:false,left:false,right:false,handbrake:false,padSteer:0,padGas:false,padBrake:false,padHandbrake:false};
let area="istanbul",kind="sahin",city=null,render3D=null,ready=false,pending=false,playing=false,paused=true,muted=false,free=false;
const navigation=new StableNavigation();let lastNavState=null;
let timer=180,earnings=0,deliveries=0,stolen=0,convoy=1,mission=null,car=null,rival=null,traffic=[],route=[],toastEnd=0,resetRide=0,roadRefresh=0,routeRefresh=0,camRefresh=0,hitCooldown=0;
let last=performance.now(),frame=0,hornCooldown=0,nearMissCooldown=0,deliveryStreak=0,personalBest=0,rescueCooldown=0;
let driveMode="easy",brakeHold=0,stillTime=0,assistedPickupTimer=0,tripElapsed=0,initialRoadWait=false;
const engine={osc:null,filter:null,gain:null};
function initEngine(){
 if(engine.osc||muted)return;
 try{
  const AudioClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioClass)return;
  const context=soundCtx.value||(soundCtx.value=new AudioClass());
  const osc=context.createOscillator(),filter=context.createBiquadFilter(),gain=context.createGain();
  osc.type="sawtooth";osc.frequency.value=62;
  filter.type="lowpass";filter.frequency.value=180;gain.gain.value=0;
  osc.connect(filter);filter.connect(gain);gain.connect(context.destination);osc.start();
  engine.osc=osc;engine.filter=filter;engine.gain=gain;
 }catch(e){console.warn("Motor sesi:",e)}
}
function syncEngine(){
 if(!engine.osc)return;
 try{
  const ctx=soundCtx.value,t=ctx.currentTime,active=playing&&!paused&&!muted&&!!car;
  const speed=active?Math.abs(car.speed):0;
  engine.osc.frequency.setTargetAtTime(active?65+speed*4.7+(keys.gas?42:0):62,t,.075);
  engine.filter.frequency.setTargetAtTime(active?155+speed*14+(keys.gas?120:0):120,t,.10);
  engine.gain.gain.setTargetAtTime(active?(0.0038+speed*.00022+(keys.gas?.0028:0)):0,t,.11);
 }catch(e){}
}
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
 document.querySelectorAll("#"+group+" button").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll("#"+group+" button").forEach(el=>el.classList.remove("selected"));
  btn.classList.add("selected");change(btn.dataset[type]);
 }));
}
choices("cars","car",v=>{kind=v});
choices("drive-options","drivemode",v=>{driveMode=v;syncDriveUI()});
function syncDriveUI(){
 document.body.dataset.driveMode=driveMode;
 $("drive-mode").textContent=driveMode==="easy"?"KOLAY SÜRÜŞ":"MANUEL";
 $("turbo-control").textContent=driveMode==="easy"?"HIZLAN":"GAZ";
 document.querySelectorAll("#drive-options [data-drivemode]").forEach(b=>b.classList.toggle("selected",b.dataset.drivemode===driveMode));
}

const inputKeys={ArrowUp:"gas",KeyW:"gas",ArrowDown:"brake",KeyS:"brake",ArrowLeft:"left",KeyA:"left",ArrowRight:"right",KeyD:"right",ShiftLeft:"handbrake",ShiftRight:"handbrake"};
window.addEventListener("keydown",e=>{
 if(inputKeys[e.code]){keys[inputKeys[e.code]]=true;e.preventDefault()}
 if(e.code==="Space"){e.preventDefault();if(!e.repeat)horn()}
 if(e.code==="KeyP"&&!e.repeat){e.preventDefault();togglePause()}
 if(e.code==="KeyC"&&!e.repeat){e.preventDefault();cycleCamera()}
 if(e.code==="KeyR"&&!e.repeat){e.preventDefault();recoverCar()}
 if(e.code==="KeyL"&&!e.repeat){e.preventDefault();cycleLighting()}
 if(e.code==="KeyM"&&!e.repeat){e.preventDefault();toggleDriveMode()}
});
window.addEventListener("keyup",e=>{if(inputKeys[e.code]){keys[inputKeys[e.code]]=false;e.preventDefault()}});
function clearKeys(){for(const k of Object.keys(keys))keys[k]=k==="padSteer"?0:false;document.querySelectorAll(".ctr").forEach(b=>b.classList.remove("pressed"))}
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
$("sound").addEventListener("click",()=>{muted=!muted;$("sound").textContent=muted?"SES KAPALI":"SES AÇIK";if(!muted){initEngine();sound()}syncEngine()});
$("rescue").addEventListener("click",recoverCar);
$("camera").addEventListener("click",cycleCamera);
$("drive-mode").addEventListener("click",toggleDriveMode);
function toggleDriveMode(){
 driveMode=driveMode==="easy"?"manual":"easy";
 syncDriveUI();
 toast(driveMode==="easy"?"OTOMATİK GAZ AÇIK · SEN YÖNLENDİR":"MANUEL SÜRÜŞ · GAZ W / ↑",2.1);
 brakeHold=0;
}

$("lighting").addEventListener("click",cycleLighting);
function cycleLighting(){
 if(!render3D)return;
 const name=render3D.setLightingMode((render3D.lightingMode||0)+1);
 $("lighting").textContent=name;
 toast("İSTANBUL · "+name,1.2);
}

const SAFE_START_ANCHOR=[29.02495,41.04720];
function isLocalSpawnRoad(r){
 return !!r&&!r.bridge&&!/^(motorway|motorway_link|trunk|trunk_link|construction|path|footway|pedestrian)$/.test(r.typ||"");
}
function chooseSafeRoadPosition(reference,initial=false){
 if(!city?.roads?.length)return null;
 let best=null,fallback=null;
 const limit=initial?1050:720;
 for(const r of city.roads){
  if(!isLocalSpawnRoad(r))continue;
  const length=r.len||distance(r.a,r.b);
  if(length<6.5)continue;
  for(const t of [.24,.47,.72]){
   const pos=[r.a[0]+(r.b[0]-r.a[0])*t,r.a[1]+(r.b[1]-r.a[1])*t];
   const d=distance(reference,pos);
   if(d>limit)continue;
   const heading=angle(r.a,r.b);
   // Map data sometimes puts building polygons across the street centreline.
   // Penalise those positions, but never deadlock the entire start menu.
   let chosenHeading=heading,clearMeters=-1;
   for(const candidate of [heading,(heading+Math.PI)%(Math.PI*2)]){
    let clear=0;
    for(const step of [4,9,16,23]){
     if(city.insideBuilding?.(travel(pos,candidate,Math.min(step,length*.36))))break;
     clear=step;
    }
    if(clear>clearMeters){clearMeters=clear;chosenHeading=candidate}
   }
   const inBuilding=!!city.insideBuilding?.(pos);
   const onRoad=city.nearestAny?.(pos);
   const centreline=onRoad?onRoad.dist:0;
   const score=d+(/^(residential|tertiary|secondary)/.test(r.typ||"")?-22:10)
      +Math.max(0,35-length)*.48+Math.max(0,10-clearMeters)*5.5
      +(inBuilding?90:0)+(centreline>4?40:0);
   const candidate={pos,heading:chosenHeading,road:r,score,buildingOverlap:inBuilding};
   if(!fallback||candidate.score<fallback.score)fallback=candidate;
   if(!inBuilding&&clearMeters>=9&&(!best||score<best.score))best=candidate;
  }
 }
 return best||fallback;
}
function recoverCar(){
 if(!playing||paused||!car)return;
 if(rescueCooldown>0){toast("ÇEKİCİ "+Math.ceil(rescueCooldown)+" SANİYE SONRA",1.1);return}
 const safe=chooseSafeRoadPosition(car.pos);
 if(!safe){toast("YEREL SOKAK HENÜZ YÜKLENMEDİ",1.2);return}
 if(Math.abs(car.speed)>2.3){toast("ÖNCE ARABAYI DURDUR",1.2);return}
 const fee=Math.min(150,earnings);
 earnings-=fee;
 if(!free)timer=Math.max(10,timer-(fee<150?8:2));
 car.pos=[...safe.pos];car.heading=safe.heading;car.currentRoadBridge=false;
 car.steering=0;car.speed=0;car.yawRate=0;car.slip=0;car.velocityLateral=0;
 car.health=Math.min(100,car.health+28);
 rescueCooldown=28;
 if(render3D){render3D.inited=false;render3D.positionTrail=[];render3D.previousTrailPoint=null}
 city.refresh(car.pos,true);refreshRoute();
 toast("ÇEKİCİ GELDİ · ARAÇ YOLA DÖNDÜ · +%28",1.7);sound(420,.13);
}
function cycleCamera(){
 if(!render3D)return;
 const mode=render3D.setCameraStyle((render3D.camStyle||0)+1);
 $("camera").textContent="KAMERA: "+mode;
 toast("KAMERA · "+mode,1.15);
}
$("start").addEventListener("click",()=>startGame(false));
$("freeroam").addEventListener("click",()=>startGame(true));
window.addEventListener("resize",()=>city?.map?.resize());
function togglePause(){
 if(!playing)return;
 paused=!paused;
 $("pause").textContent=paused?"DEVAM ET":"DURAKLAT";
 if(paused)toast("DURAKLATILDI",1.2);
 last=performance.now();clearKeys();syncEngine();
}
function horn(){
 if(!playing||paused)return;
 sound(310,.18);setTimeout(()=>sound(430,.10),115);

 if(hornCooldown>0)return;
 hornCooldown=.75;
 if(mission?.phase==="dropoff"&&mission.owner==="player")mission.horns=(mission.horns||0)+1;
 const nearby=traffic.find(v=>v.pos&&!v.joined&&distance(v.pos,car.pos)<13);
 if(nearby){
  nearby.joined=true;nearby.pos=null;nearby.road=null;convoy=Math.min(6,convoy+1);earnings+=50;
  toast("BİR ARABA DAHA KONVOYDA · +₺50",1.5);
 }else if(mission?.phase==="pickup"&&distance(mission.pickup,car.pos)<20){
  toast("MİSAFİR BEKLİYOR · YAVAŞLA",1.1);
 }

}
function hud(on){$("hud").classList.toggle("on",on);$("controls").style.visibility=on?"visible":"hidden"}
function finish(cause){
 playing=false;paused=true;clearKeys();hud(false);syncEngine();
 $("panel").innerHTML='<div class="eyebrow">DÜĞÜN KONVOYU · İSTANBUL 3D</div><h1>'+cause+'</h1><p>İstanbul sokaklarındaki turun tamamlandı.</p><div id="end-summary">₺'+earnings.toLocaleString("tr-TR")+'<br>'+deliveries+' TESLİMAT · '+stolen+' YOLCU KAPMA · '+convoy+' KONVOY</div><button id="again">YENİDEN SÜR</button><p>Gerçek sokak haritası OpenStreetMap üzerinden yüklenir. Üç boyutlu bina yüksekliği, mevcut harita verisine göre gösterilir.</p>';
 $("again").style.cssText="width:100%;padding:16px;border-radius:14px;background:#c7ec72;border:0;font-weight:800;margin-top:16px";
 $("again").addEventListener("click",()=>startGame(free));
 $("overlay").hidden=false;
}
function startGame(unlimited){
 if(!ready||!city?.roads?.length){
  pending=unlimited?"free":"timed";
  $("loadstate").textContent="İstanbul sokakları yükleniyor… Harita bağlantısını kontrol et.";
  if(city){
   city.seekingLocalStreets=true;
   city?.map?.jumpTo?.({center:SAFE_START_ANCHOR,zoom:18.0,pitch:65});
   city.refresh(SAFE_START_ANCHOR,true);
  }
  return
 }
 const spawn=chooseSafeRoadPosition(SAFE_START_ANCHOR,true);
 if(!spawn){
  pending=unlimited?"free":"timed";
  $("loadstate").textContent="Ortaköy'deki sürülebilir sokaklar yükleniyor…";
  city.seekingLocalStreets=true;
  city.map?.jumpTo?.({center:SAFE_START_ANCHOR,zoom:18.0,pitch:65});
  city.refresh(SAFE_START_ANCHOR,true);
  return;
 }
 pending=false;city.seekingLocalStreets=false;free=unlimited;
 // Default easy mode is intentionally playable with just left/right steering.
 brakeHold=0;stillTime=0;assistedPickupTimer=0;tripElapsed=0;
 playing=true;paused=false;timer=180;earnings=0;deliveries=0;stolen=0;convoy=1;mission=null;
 navigation.clear();lastNavState=null;
 hornCooldown=0;nearMissCooldown=0;deliveryStreak=0;hitCooldown=0;rescueCooldown=0;
 try{personalBest=Number(localStorage.getItem("dugun-3d-best-v3"))||0}catch(e){personalBest=0}
 car={pos:[...spawn.pos],speed:0,heading:spawn.heading,steering:0,yawRate:0,slip:0,
  velocityLateral:0,suspension:0,suspensionVelocity:0,engineRPM:850,health:100,
  offroad:false,currentRoadBridge:false,currentRoadName:spawn.road.name||""};
 city.refresh(car.pos,true);
 const near=city.nearest(car.pos);
 if(near&&isLocalSpawnRoad(near.road)&&near.dist<5){
  car.pos=[...near.p];car.currentRoadName=near.road.name||"";
 }
 rival={pos:null,heading:0,speed:10.5,route:[],index:1,cooldown:0};
 traffic=[];
 for(let i=0;i<(window.innerWidth<700?8:17);i++)traffic.push({pos:null,road:null,heading:0,t:0,speed:6+Math.random()*6,cooldown:0,joined:false,respawnCD:0});
 if(!render3D){render3D=new CityScene3D(city)}
 render3D.setOrigin(car.pos);render3D.setCar(kind);
 if(render3D.setCameraStyle)render3D.setCameraStyle(0);
 $("camera").textContent="KAMERA: TAKİP";
 syncDriveUI();
 city.map.jumpTo({center:car.pos,zoom:18.08,pitch:69,bearing:car.heading/rad});
 $("overlay").hidden=true;hud(true);$("pause").textContent="DURAKLAT";
 resetRide=0;last=performance.now();
 spawnMission();seedTraffic();initEngine();syncEngine();
 toast(driveMode==="easy"?"İSTANBUL SENİN · SAĞ / SOLLA SÜR":"İSTANBUL SENİN · W GAZ, A / D DÖN",3);
}
function seedTraffic(){
 if(!city.roads.length)return;
 for(const v of traffic){
  v.joined=false;
  const seg=city.roads[Math.floor(Math.random()*city.roads.length)];
  v.road=seg;v.t=Math.random();v.pos=[seg.a[0]+(seg.b[0]-seg.a[0])*v.t,seg.a[1]+(seg.b[1]-seg.a[1])*v.t];
  v.heading=angle(seg.a,seg.b);v.visualHeading=v.heading;
 }
}
function spawnMission(){
 if(mission||!city.roads.length)return;
 let pickup=null,dropoff=null;
 // Prefer a street-connected passenger and destination; don't send people through impassable blocks.
 for(let i=0;i<9;i++){
  const point=city.sample(car.pos,60,180);
  if(!point)continue;
  if(city.route(car.pos,point).length>2){pickup=point;break}
  if(!pickup)pickup=point;
 }
 for(let i=0;i<9&&pickup;i++){
  const point=city.sample(pickup,175,430);
  if(!point)continue;
  if(city.route(pickup,point).length>2){dropoff=point;break}
  if(!dropoff)dropoff=point;
 }
 if(!pickup||!dropoff){$("mission-name").textContent="Yakındaki sokaklar yükleniyor…";return}
 mission={
  passenger:NAMES[Math.floor(Math.random()*NAMES.length)],
  venue:PLACES[Math.floor(Math.random()*PLACES.length)],pickup,dropoff,
  phase:"pickup",owner:null,clock:0,initialClock:0,crashes:0,horns:0,challenge:CHALLENGES[Math.floor(Math.random()*CHALLENGES.length)]
 };
 rival.pos=city.sample(car.pos,90,170)||[...car.pos];
 rival.speed=Math.min(15.5,9+Math.random()*2+deliveries*.42);rival.cooldown=1.1;
 refreshRivalRoute();refreshRoute();updateMissionText();
}
function refreshRoute(force=true){
 if(!mission||!city||!car)return;
 // Never replace the planned turn every two seconds while the vehicle is on the route.
 if(!force&&!lastNavState?.offroad&&!(mission.owner==="rival"&&rival?.pos&&route?.length&&distance(route.at(-1),rival.pos)>55))return;
 const target=mission.owner==="rival"&&rival?.pos?rival.pos:mission.phase==="pickup"?mission.pickup:mission.dropoff;
 const candidate=city.route(car.pos,target);
 if(!candidate||candidate.length<2)return;
 route=candidate;
 navigation.setRoute(route);
 lastNavState=navigation.update(car.pos,0);
 city.setRoute(route);
}
function refreshRivalRoute(){
 if(!mission||!rival?.pos)return;
 const destination=mission.phase==="pickup"?mission.pickup:mission.dropoff;
 rival.route=city.route(rival.pos,destination);rival.index=1;
}
function nextMission(){
 mission=null;route=[];navigation.clear();lastNavState=null;city.setRoute([]);resetRide=.7;
}
function deliver(who){
 if(!mission)return;
 if(who==="player"){
  deliveryStreak++;
  const multiplier=Math.min(2.2,1+Math.max(0,deliveryStreak-1)*.16+(convoy-1)*.045);
  const tip=Math.floor((320+distance(mission.pickup,mission.dropoff)*2.4+Math.max(0,mission.clock)*20)*multiplier);
  const challenge=mission.challenge||CHALLENGES[0];
  const bonusDone=challenge.id==="express"?mission.clock>=mission.initialClock*.40:
   challenge.id==="careful"?mission.crashes===0:
   challenge.id==="horn"?mission.horns>=2:false;
  const extra=bonusDone?(challenge.bonus||0):0;
  earnings+=tip+extra;deliveries++;timer+=20;
  if(earnings>personalBest){
   personalBest=earnings;
   try{localStorage.setItem("dugun-3d-best-v3",String(personalBest))}catch(e){}
  }
  toast("TESLİMAT · ₺"+(tip+extra).toLocaleString("tr-TR")+(extra?" · EK BONUS ₺"+extra:"")+" · +20 SN"+(deliveryStreak>1?" · "+deliveryStreak+" SERİ":""),2.1);
  sound(600,.13);setTimeout(()=>sound(800,.16),125);
 }else{timer=Math.max(0,timer-8);deliveryStreak=0;toast("RAKİP ÖNCE YETİŞTİ · -8 SN",2)}
 nextMission();
}
function drive(dt){
 const spec=SPEC[kind],auto=driveMode==="easy",previous=[...car.pos];
 tripElapsed+=dt;
 // Sub-step integration keeps steering and grip stable at 30 / 60 / 120 Hz.
 const substeps=Math.min(6,Math.max(1,Math.ceil(dt/.012)));
 const grade=render3D?.getGroundHeight?(render3D.getGroundHeight(travel(car.pos,car.heading,5))-render3D.getGroundHeight(travel(car.pos,car.heading+Math.PI,5)))/10:0;
 for(let i=0;i<substeps;i++){
  const near=city.nearest(car.pos)||city.nearestAny?.(car.pos);
  stepVehicle(car,keys,{mode:driveMode,spec,road:near,navigation,grade},dt/substeps);
 }
 const near=city.nearest(car.pos)||city.nearestAny?.(car.pos);
 car.currentRoadName=near?.road?.name||"";
 car.currentRoadClass=near?.road?.typ||"";
 car.currentRoadBridge=!!(near?.road?.bridge&&/^(motorway|motorway_link|trunk|primary)/.test(near.road.typ));
 if(keys.handbrake&&Math.abs(car.speed)>8&&Math.abs(car.steering)>.18&&frame%6===0)city.skid(previous,car.pos);
 if(city.insideBuilding?.(car.pos)){
  // Source building polygons sometimes overlap carriageways. Prefer the drivable road.
  const road=city.nearest(car.pos);
  const safeRoadWidth=road?roadHalfWidth(road.road)+.85:0;
  if(!road||road.dist>safeRoadWidth){
   const slideX=[car.pos[0],previous[1]],slideY=[previous[0],car.pos[1]];
   if(!city.insideBuilding(slideX))car.pos=slideX;
   else if(!city.insideBuilding(slideY))car.pos=slideY;
   else {car.pos=previous;car.speed=Math.max(0,car.speed*.75)}
   if(mission?.phase==="dropoff"&&hitCooldown<=0)mission.crashes++;
   if(hitCooldown<=0&&car.speed>3){hitCooldown=1.3;car.health=Math.max(0,car.health-(auto?1:3))}
   car.yawRate*=.45;
  }
 }
 if(near&&near.dist>20&&Math.abs(car.speed)>4)car.health=Math.max(0,car.health-dt*(auto?.26:1.1));
 if(car.health<=0){finish("ARABA YOLDA KALDI");return}
 if(Math.abs(car.speed)<1.1)stillTime+=dt;else stillTime=0;
 if(mission){
  const target=mission.phase==="pickup"?mission.pickup:mission.dropoff;
  const d=distance(car.pos,target);
  // Drive-through pickup/dropoff: gentle approach is enough; no awkward full stop.
  const threshold=auto?15:11,allowedSpeed=auto?13.5:8.5;
  if(mission.phase==="pickup"&&mission.owner===null&&d<threshold&&Math.abs(car.speed)<allowedSpeed){
   mission.phase="dropoff";mission.owner="player";
   const baseTime=Math.max(59,42+distance(mission.pickup,mission.dropoff)/7.5);
   mission.clock=mission.challenge.id==="express"?baseTime*.87:baseTime;
   mission.initialClock=mission.clock;mission.crashes=0;mission.horns=0;
   toast(mission.passenger.toLocaleUpperCase("tr-TR")+" BİNDİ · SALONA GİT",1.9);
   sound(540,.17);refreshRivalRoute();refreshRoute();updateMissionText();
  }else if(mission.phase==="dropoff"&&mission.owner==="player"&&d<threshold&&Math.abs(car.speed)<allowedSpeed)deliver("player");
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
   const end=npc.road.b;
   const id=end[0].toFixed(5)+":"+end[1].toFixed(5);
   const prevId=npc.road.a[0].toFixed(5)+":"+npc.road.a[1].toFixed(5);
   const possible=(city.edges.get(id)||[]).filter(e=>e.node!==prevId);
   const choices=possible.length?possible:(city.edges.get(id)||[]);
   const ranked=choices.map(edge=>{
    const to=city.nodes.get(edge.node);
    const turnAmount=to?Math.abs(turn(angle(end,to),npc.heading)):Math.PI;
    return {edge,turnAmount,weight:turnAmount+Math.random()*.48};
   }).sort((a,b)=>a.weight-b.weight);
   const chosen=ranked[0]?.edge;
   if(chosen&&city.nodes.get(chosen.node)){
    npc.road={a:end,b:city.nodes.get(chosen.node),len:chosen.d};
   }else{
    const next=city.roads.filter(v=>distance(v.a,car.pos)<230);
    npc.road=next[Math.floor(Math.random()*next.length)]||npc.road;
   }
   npc.t=0;
  }
  const seg=npc.road;
  
  const center=[seg.a[0]+(seg.b[0]-seg.a[0])*npc.t,seg.a[1]+(seg.b[1]-seg.a[1])*npc.t];
  npc.heading=angle(seg.a,seg.b);
  npc.visualHeading??=npc.heading;
  npc.visualHeading+=turn(npc.heading,npc.visualHeading)*Math.min(1,dt*3.5);
  npc.pos=travel(center,npc.heading+Math.PI/2,(/^(primary|secondary)/.test(seg.typ)?2.25:1.05));
  if(npc.joined)npc.speed=Math.min(13,npc.speed+.15*dt);

  npc.cooldown=Math.max(0,npc.cooldown-dt);npc.respawnCD=Math.max(0,(npc.respawnCD||0)-dt);
  if(npc.cooldown===0&&Math.abs(car.speed)>5&&distance(npc.pos,car.pos)<3.5){
   npc.cooldown=2.3;car.speed*=.45;car.health=Math.max(0,car.health-5);if(mission?.phase==="dropoff")mission.crashes++;sound(180,.16);toast("TRAFİĞE DİKKAT · HASAR",1.2);
  }
  if(npc.cooldown===0&&nearMissCooldown===0&&Math.abs(car.speed)>13&&distance(npc.pos,car.pos)>3.5&&distance(npc.pos,car.pos)<6.0){
   const bonus=Math.round(65+(convoy-1)*15);
   earnings+=bonus;nearMissCooldown=2.5;toast("RAMAK KALA · +₺"+bonus,1.1);
  }
  if(distance(npc.pos,car.pos)>460&&npc.respawnCD===0){
   npc.respawnCD=3.5;
   const available=city.roads.filter(v=>Math.min(distance(car.pos,v.a),distance(car.pos,v.b))<230);
   if(available.length){
    npc.road=available[Math.floor(Math.random()*available.length)];npc.t=.1;
    npc.heading=angle(npc.road.a,npc.road.b);npc.visualHeading=npc.heading;
   }
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
  hitCooldown=2.6;rival.cooldown=1;car.health=Math.max(0,car.health-7);if(mission?.phase==="dropoff")mission.crashes++;car.speed*=.50;
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
 $("mission-state").textContent=mission.owner==="rival"?"MİSAFİR RAKİPTE":mission.phase==="pickup"?"MİSAFİRİ AL":mission.challenge.tag;
 $("mission-name").textContent=mission.phase==="pickup"?mission.passenger:mission.venue;
 $("mission-info").textContent=mission.owner==="rival"?"KIRMIZI RAKİBİ TAKİP ET · ONA YAKLAŞIP MİSAFİRİ GERİ AL":mission.phase==="pickup"?"Sarı işarete yanaş. Yavaşlayınca misafir biner.":mission.challenge.info;
}
function updateRivalHUD(){
 const panel=$("rival-tracker");
 if(!rival?.pos||!car){panel.hidden=true;return}
 panel.hidden=false;
 const d=distance(car.pos,rival.pos);
 const bearing=turn(angle(car.pos,rival.pos),car.heading);
 const arrow=Math.abs(bearing)<.36?"↑":Math.abs(bearing)>2.65?"↓":bearing>0?"↗":"↖";
 $("rival-arrow").textContent=arrow;
 $("rival-distance").textContent=d>=1000?(d/1000).toFixed(1)+" KM":Math.round(d)+" M";
 const owner=mission?.owner;
 $("rival-status").textContent=owner==="rival"?"MİSAFİR ONDA · YAKALA":owner==="player"?"SENDEKİ MİSAFİRİ KOVALIYOR":"MİSAFİRE DOĞRU GİDİYOR";
 panel.classList.toggle("rival-danger",owner==="rival");
 const remaining=mission?(mission.phase==="pickup"?mission.pickup:mission.dropoff):null;
 $("rival-target").textContent=remaining?Math.round(distance(rival.pos,remaining))+" M HEDEFE":"YENİ YOLCUYU BEKLİYOR";
}
function updateHUD(){
 updateRivalHUD();
 const secs=Math.ceil(Math.max(0,timer));
 $("time").textContent=free?"∞":String(Math.floor(secs/60)).padStart(2,"0")+":"+String(secs%60).padStart(2,"0");
 $("time").classList.toggle("urgent",timer<30&&!free);
 $("money").textContent="₺"+earnings.toLocaleString("tr-TR");
 $("bestmoney").textContent="₺"+personalBest.toLocaleString("tr-TR");
 const speedKmh=Math.round(Math.abs(car.speed)*3.6);
 $("speed").textContent=speedKmh;
 $("speed-panel").style.setProperty("--speed-angle",Math.min(265,speedKmh*2.25)+"deg");
 $("speed-gear").textContent=car.speed<-.8?"R":keys.brake&&Math.abs(car.speed)<1?"N":"D";
 $("car-health").textContent="ARAÇ %"+Math.round(car.health)+(car.offroad?" · YOL DIŞI":"");
 $("street-name").textContent=(car.currentRoadName||AREAS[area].name).toLocaleUpperCase("tr-TR");
 $("drive-hint").textContent=driveMode==="easy"?(keys.brake?"FREN · TUTARSAN GERİ VİTES":car.offroad?"YOLA DÖN · OKLARLA YÖNLENDİR":Math.abs(car.steering)>.12?"DİREKSİYON SENDE":"GAZ OTOMATİK · SAĞ / SOL İLE SÜR"):(keys.gas?"GAZ VERİLİYOR":"GAZ İÇİN W / ↑ BAS");
 $("car-health").style.color=car.health<35?"#ff9c8f":car.health<65?"#ffdb8e":"#e3f2e6";
 $("rescue").disabled=Math.abs(car.speed)>2.3||rescueCooldown>0;
 $("convoy").textContent=convoy;$("trips").textContent=deliveries;
 if(!mission){
  $("mission-state").textContent="YENİ GÖREV";
  $("mission-name").textContent=city.roads.length?"Sıradaki misafir geliyor":"Gerçek sokaklar yükleniyor...";
  $("mission-distance").textContent="—";$("mission-timer").textContent="";
  return;
 }
 const goal=mission.owner==="rival"&&rival?.pos?rival.pos:mission.phase==="pickup"?mission.pickup:mission.dropoff,d=distance(car.pos,goal);
 $("mission-distance").textContent=d<1000?Math.round(d)+" METRE":(d/1000).toFixed(1)+" KM";
 $("mission-timer").textContent=mission.phase==="dropoff"?
  ("YOLCU: "+Math.ceil(Math.max(0,mission.clock))+" SN"+(mission.challenge.id==="horn"?" · KORNA "+Math.min(2,mission.horns)+"/2":mission.challenge.id==="careful"?" · HASAR "+mission.crashes:"")):
  "YAVAŞLAYINCA BİNER";

 const step=navigation.instruction(car.pos,goal,mission.owner==="rival"?"RAKİBİ TAKİP ET":"HEDEFE GİT");
 $("turn-arrow").textContent=step.arrow;
 $("turn-hint").textContent=step.text;
 $("turn-sub").textContent=mission.owner==="rival"&&step.kind==="arrive"?"KIRMIZI RAKİBE YAKLAŞ":step.detail;
 $("directions").dataset.direction=step.kind;

}
const ctx=$("minimap").getContext("2d");
function drawMini(){
 const canvas=$("minimap"),w=canvas.width,h=canvas.height;
 ctx.clearRect(0,0,w,h);ctx.fillStyle="#223c44";ctx.fillRect(0,0,w,h);
 const toPx=p=>[(p[0]-car.pos[0])*111320*Math.cos(car.pos[1]*rad)/1.25,(car.pos[1]-p[1])*111320/1.25];
 ctx.save();ctx.translate(w/2,h/2);ctx.rotate(-car.heading);
 for(const r of city.roads){
  const a=toPx(r.a),b=toPx(r.b);
  if(Math.abs(a[0])>240&&Math.abs(b[0])>240)continue;
  if(Math.abs(a[1])>220&&Math.abs(b[1])>220)continue;
  ctx.strokeStyle=r.typ==="primary"?"#a7babb":"#65888b";ctx.lineWidth=r.typ==="primary"?5:2.6;
  ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
 }
 if(navigation.ready&&route?.length>1){
  ctx.strokeStyle="#ffdf80";ctx.lineWidth=4;ctx.beginPath();
  route.forEach((p,i)=>{const q=toPx(p);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.stroke();
 }
 if(mission){
  const target=mission.owner==="rival"&&rival?.pos?rival.pos:mission.phase==="pickup"?mission.pickup:mission.dropoff;
  const m=toPx(target);
  ctx.fillStyle=mission.owner==="rival"?"#ff8294":mission.phase==="pickup"?"#ffcf65":"#9de6b7";ctx.beginPath();ctx.arc(m[0],m[1],7,0,2*Math.PI);ctx.fill();
 }
 if(rival.pos){
  const p=toPx(rival.pos);ctx.fillStyle="#ff7c85";ctx.strokeStyle="#ffffff";ctx.lineWidth=2;
  ctx.beginPath();ctx.arc(p[0],p[1],7,0,2*Math.PI);ctx.fill();ctx.stroke();
  ctx.fillStyle="#fef2e3";ctx.font="bold 11px sans-serif";ctx.fillText("R",p[0]-4,p[1]+4);
 }
 ctx.restore();ctx.save();ctx.translate(w/2,h/2);
 ctx.fillStyle="#eaf6e2";ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(8,9);ctx.lineTo(-8,9);ctx.closePath();ctx.fill();ctx.restore();
 ctx.fillStyle="#ecf5e9";ctx.font="bold 16px sans-serif";ctx.fillText(AREAS[area].name,14,22);
}
let padHornWasDown=false,padCameraWasDown=false;
function readGamepad(){
 const pads=typeof navigator!=="undefined"&&navigator.getGamepads?.();
 const pad=pads&&[...pads].find(p=>p?.connected);
 if(!pad){keys.padSteer=0;keys.padGas=false;keys.padBrake=false;keys.padHandbrake=false;return}
 const axis=pad.axes?.[0]||0;
 keys.padSteer=Math.abs(axis)>.12?Math.sign(axis)*Math.pow(Math.abs(axis),1.12):0;
 keys.padGas=!!(pad.buttons?.[7]?.pressed||pad.buttons?.[0]?.pressed);
 keys.padBrake=!!(pad.buttons?.[6]?.pressed||pad.buttons?.[1]?.pressed);
 keys.padHandbrake=!!pad.buttons?.[2]?.pressed;
 const hornDown=!!pad.buttons?.[3]?.pressed;
 if(hornDown&&!padHornWasDown)horn();
 padHornWasDown=hornDown;
 const cameraDown=!!pad.buttons?.[9]?.pressed;
 if(cameraDown&&!padCameraWasDown)cycleCamera();
 padCameraWasDown=cameraDown;
}
function frameLoop(now){
 const dt=clamp((now-last)/1000,0,.045);last=now;
 readGamepad();
 if(ready&&playing&&!paused){
  drive(dt);
  if(playing){
   hitCooldown=Math.max(0,hitCooldown-dt);hornCooldown=Math.max(0,hornCooldown-dt);nearMissCooldown=Math.max(0,nearMissCooldown-dt);rescueCooldown=Math.max(0,rescueCooldown-dt);
   advanceTraffic(dt);advanceRival(dt);
   if(!free){timer-=dt;if(timer<=0){timer=0;finish("DÜĞÜN BİTTİ")}}
   if(playing){
    resetRide=Math.max(0,resetRide-dt);
    if(!mission&&resetRide<=0)spawnMission();
    roadRefresh+=dt;routeRefresh+=dt;camRefresh+=dt;
    if(roadRefresh>4){roadRefresh=0;city.refresh(car.pos);if(!mission)spawnMission()}
    if(routeRefresh>3){routeRefresh=0;refreshRoute(false)}
    if(camRefresh>.16){city.chase(car.pos,car.heading,camRefresh,hitCooldown>0?1.1:0,car.speed);camRefresh=0}
    lastNavState=navigation.update(car.pos,dt);
    render3D?.update({car,rival,mission,traffic,controls:keys,route,navProgress:navigation.progress,navValid:navigation.ready,convoy},dt,now);if(frame%8===0)syncEngine();
    if(frame++%3===0){updateHUD();drawMini()}
   }
  }
 }
 if(ready&&!playing&&render3D&&car)render3D.update({car,rival,mission,traffic,controls:keys,route,navProgress:navigation.progress,navValid:navigation.ready,convoy},dt,now);
 if(ready&&!playing&&render3D&&!car)render3D.update({car:{pos:AREAS[area].center,speed:0,heading:0,steering:0},rival:null,mission:null,traffic:[],route:[],convoy:1},dt,now);
 if(now>toastEnd)$("toast").classList.remove("show");
 requestAnimationFrame(frameLoop);
}
function readyMap(){
 ready=true;
 render3D=new CityScene3D(city);
 $("loadstate").textContent="3D şehir hazır. Gerçek sokaklar yükleniyor…";
 city.onRoadsReady=()=>{
  const info=$("loadstate");if(info)info.textContent="Sokaklar hazır · Sürmeye başlayabilirsin.";
  if(pending&&city.roads.length){
   const mode=pending;
   pending=false;startGame(mode==="free");
  }
 };
 if(area!==city.area)city.jumpToArea(area);
 if(pending&&city.roads.length){const mode=pending;pending=false;startGame(mode==="free")}
}
function errorMap(message){$("loadstate").textContent="Harita hatası: "+message}
city=new IstanbulMap(area,readyMap,errorMap);
requestAnimationFrame(frameLoop);
