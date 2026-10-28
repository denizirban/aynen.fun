(function(){
"use strict";
const $=id=>document.getElementById(id);
const DURATIONS={suppress:20000,release:12000};
const FUN=[
 "AYI TESPİT EDİLDİ. KONU KAPANMADI.",
 "BEYİN: 'HANGİ AYI?'",
 "DÜŞÜNME DEMİŞTİK. TEŞEKKÜRLER.",
 "DÜŞÜNCEYİ SİLMEK İÇİN DÜŞÜNCE GEREKİYOR.",
 "AYI BUNDAN HABERSİZ.",
 "ZİL ÇALDI. AYI GELDİ.",
 "YİNE O MU?",
 "AYI İÇERİDEN ARIYOR."
];
const state={
 mode:"idle",duration:20000,started:0,pauses:new Set(),pausedAt:0,
 suppress:0,release:0,firstSuppress:null,firstRelease:null,lastTap:-Infinity,
 turn:0,visits:0,finalized:false
};
function active(){return state.mode==="suppress"||state.mode==="release"}
function now(){return performance.now()}
function effectiveTime(){return state.pauses.size?state.pausedAt:now()}
function elapsed(){return active()?Math.min(state.duration,Math.max(0,effectiveTime()-state.started)):0}
function remaining(){return active()?Math.max(0,state.duration-elapsed()):state.mode==="idle"?20000:0}
function pause(reason){
 if(!state.pauses.size && active())state.pausedAt=now();
 state.pauses.add(reason);
}
function resume(reason){
 if(!state.pauses.has(reason))return;
 state.pauses.delete(reason);
 if(!state.pauses.size && active() && state.pausedAt){
  state.started+=now()-state.pausedAt;state.pausedAt=0;
 }
}
function showButton(id,on){$(id).hidden=!on}
function updateTimes(){
 $("time").innerHTML=(remaining()/1000).toFixed(1)+' <small>sn</small>';
 const count=state.mode==="release"||state.mode==="final"?state.release:state.suppress;
 $("thoughts").textContent=String(count);
 const first=state.mode==="release"||state.mode==="final"?state.firstRelease:state.firstSuppress;
 $("first").textContent=first==null?"—":first.toFixed(1)+"s";
 $("screen-bears").textContent=String(count);
}
function clearParticles(){ $("particles").replaceChildren(); }
function setStage(mode){
 const scene=$("stage-play");
 scene.classList.toggle("playing",active());
 scene.classList.toggle("prep",mode==="middle");
 $("prompt").hidden=!active();
 $("bear-art").hidden=active();
 $("thought").classList.toggle("thought",true);
}
function setMode(mode){
 state.mode=mode;state.lastTap=-Infinity;state.pauses.clear();state.pausedAt=0;
 state.finalized=mode==="final";
 const sup=mode==="suppress",rel=mode==="release",idle=mode==="idle",mid=mode==="middle",end=mode==="final";
 if(active()){
  state.duration=DURATIONS[mode];state.started=now();
  if(document.visibilityState==="hidden")pause("hidden");
  if(!$("info").hidden)pause("info");
 }
 setStage(mode);
 $("scorebox").classList.toggle("show",mid||end);
 showButton("start",idle);showButton("thought",sup||rel);showButton("next",mid);showButton("again",end);
 $("keyhint").hidden=!(sup||rel);
 $("reset-note").hidden=sup||rel;
 $("phase").textContent=idle?"HAZIR / 00":sup?"TUR 01 / 02":rel?"TUR 02 / 02":mid?"ARA RAPOR":"SONUÇ";
 $("part").textContent=idle?"KURAL 01 / 02":sup?"TUR 01 / BASTIRMA":rel?"TUR 02 / SERBEST":mid?"İLK TUR TAMAMLANDI":"PSİKOLOJİ / RAPOR";
 $("stage-id").textContent=idle?"WHITE BEAR.exe / READY":sup?"WHITE BEAR.exe / SUPPRESS":rel?"WHITE BEAR.exe / RELEASE":mid?"WHITE BEAR.exe / INTERMISSION":"WHITE BEAR.exe / RESULTS";
 $("stage-state").textContent=active()?"DÜŞÜNCE GÖZLEMİ":end?"COMPLETE":mid?"TUR TAMAMLANDI":"SİSTEM AKTİF";
 if(idle){
  $("mission").textContent="Bir ayı düşünme.";
  $("desc").textContent="20 saniye boyunca beyaz bir ayıyı düşünmemeye çalış. Aklına geldiğinde dürüstçe butona bas.";
  $("rule-no").textContent="01";
  $("rule-title").textContent="Aklına gelirse bildir.";
  $("rule-copy").textContent="Her düşünce geldiğinde tek bir dokunuş. Sayılacak olan sadece bildirdiklerin.";
  $("say").textContent="DÜŞÜNMEYE BAŞLAMADAN ÖNCE: BAŞLA.";
 }else if(sup){
  $("mission").textContent="O ayıyı düşünme.";
  $("desc").textContent="Düşünceyi engellemeye çalış. Aklına geldikçe butona bas. Zile basmak kadar basit.";
  $("rule-no").textContent="01";
  $("rule-title").textContent="Beyaz ayı aklına geldi mi?";
  $("rule-copy").textContent="Evetse bas. Hayırsa hiçbir şey yapma.";
  $("prompt-label").textContent="PLEASE DON'T THINK";
  $("prompt-title").textContent="Bomboş.";
  $("prompt-detail").textContent="HER ŞEY YOLUNDA. GÜYA.";
  $("thought").textContent="AKLIMA GELDİ. +1";
  $("say").textContent="BİLGİSAYAR DÜŞÜNCELERİNİ OKUYAMIYOR. ŞİMDİLİK.";
 }else if(mid){
  $("mission").textContent=state.suppress===0?"Ayı hiç uğramamış gibi.":"Ayı "+state.suppress+" kez uğradı.";
  $("desc").textContent="Birinci tur bitti. Şimdi ayıyı düşünmek serbest. Farkı karşılaştırmak ister misin?";
  $("rule-no").textContent="02";
  $("rule-title").textContent="Artık düşünmek serbest.";
  $("rule-copy").textContent="İkinci tur 12 saniye. Yine her ayı düşüncesini işaretle.";
  $("summary-first").textContent=state.suppress+" düşünce";
  $("summary-second").textContent="bekliyor";
  $("say").textContent="AYIYI SERBEST BIRAKMA PROSEDÜRÜ HAZIR.";
 }else if(rel){
  $("mission").textContent="Şimdi düşünebilirsin.";
  $("desc").textContent="Beyaz ayıyı düşünmek serbest. Yine aklına her gelişinde butona bas.";
  $("rule-no").textContent="02";
  $("rule-title").textContent="Artık yasak yok.";
  $("rule-copy").textContent="Her ayı düşüncesini işaretle, ne kadar sık gelirse gelsin.";
  $("prompt-label").textContent="THINK FREELY";
  $("prompt-title").textContent="Serbest.";
  $("prompt-detail").textContent="AYI KİMİN UMURUNDA.";
  $("thought").textContent="YİNE AYI. +1";
  $("say").textContent="ARTIK AYI DÜŞÜNMEK YASAL.";
 }else if(end){
  const d=state.release-state.suppress;
  $("mission").textContent=d>0?"Ayı geri geldi.":d===0?"Ayı hesabı eşitlendi.":"Ayı bu tur daha az uğradı.";
  $("desc").textContent=d>0?"Serbest turda daha fazla ayı düşüncesi bildirdin. Geri tepme etkisini andırıyor; ama bu iki kısa tur neden-sonuç kanıtı değil.":d===0?"İki turda eşit sayıda ayı bildirdin. Düşünce bastırma herkeste aynı sonucu üretmez.":"Serbest turda daha az ayı bildirdin. Düşünce bastırmanın geri tepme etkisi herkeste ortaya çıkmak zorunda değil.";
  $("rule-no").textContent="✓";
  $("rule-title").textContent="Rapor hazır. Ayı güvende.";
  $("rule-copy").textContent="Kişilik testi değil. Beyin okuyucu hiç değil. Sadece senin bildirimlerin.";
  $("summary-first").textContent=state.suppress+" düşünce";
  $("summary-second").textContent=state.release+" düşünce";
  $("say").textContent="TEBRİKLER. ARTIK BEYAZ BİR AYI BİLİYORSUN.";
 }
 updateTimes();
 if(active())$("thought").focus({preventScroll:true});
}
function start(){
 state.suppress=0;state.release=0;state.firstSuppress=null;state.firstRelease=null;state.turn++;
 clearParticles();
 setMode("suppress");
}
function beginRelease(){
 state.release=0;state.firstRelease=null;clearParticles();
 setMode("release");
}
function finishSuppression(){setMode("middle")}
function finishRelease(){setMode("final")}
function scatter(){
 const layer=$("particles"),width=layer.clientWidth||600,height=layer.clientHeight||350;
 for(let i=0;i<7;i++){
  const el=document.createElement("span");el.className="pixel";
  el.style.left=(15+Math.random()*70)+"%";el.style.top=(38+Math.random()*45)+"%";
  el.style.animationDelay=(Math.random()*.12)+"s";
  el.style.width=(5+Math.random()*9)+"px";el.style.height=el.style.width;
  layer.appendChild(el);setTimeout(()=>el.remove(),2000);
 }
 if(navigator.vibrate)try{navigator.vibrate(13)}catch(e){}
}
function register(){
 if(!active()||state.pauses.size)return;
 const t=elapsed();
 if(t>=state.duration){if(state.mode==="suppress")finishSuppression();else finishRelease();return}
 if(t-state.lastTap<110)return;
 state.lastTap=t;
 if(state.mode==="suppress"){
  state.suppress++;
  if(state.firstSuppress==null)state.firstSuppress=t/1000;
 }else{
  state.release++;
  if(state.firstRelease==null)state.firstRelease=t/1000;
 }
 scatter();
 $("say").textContent=FUN[Math.floor(Math.random()*FUN.length)];
 updateTimes();
}
function share(){
 const text=state.mode==="idle"
  ?"O Ayıyı Düşünme. 20 saniye boyunca dene. Bakalım beynin kimin tarafında."
  :state.mode==="suppress"
  ?"Beyaz ayıyı düşünmemeye çalışıyorum. Şu ana kadar "+state.suppress+" kez aklıma geldi."
  :state.mode==="middle"
  ?"20 saniye beyaz ayıyı düşünmemeye çalıştım. "+state.suppress+" kez aklıma geldi."
  :"O Ayıyı Düşünme. — 20 saniyelik yasaklı tur: "+state.suppress+" ayı. 12 saniyelik serbest tur: "+state.release+" ayı. Beynimle aramız iyi.";
 const payload={title:"O Ayıyı Düşünme. — aynen.fun",text,url:"https://aynen.fun/o-ayiyi-dusunme.html"};
 if(navigator.share){navigator.share(payload).catch(()=>{});return}
 const complete=payload.text+" "+payload.url;
 if(navigator.clipboard&&navigator.clipboard.writeText){
  navigator.clipboard.writeText(complete).then(()=>{const b=$("share");b.textContent="KOPYALANDI ✓";setTimeout(()=>b.textContent="↗ PAYLAŞ",1800)}).catch(()=>window.prompt("Paylaş:",complete));
 }else window.prompt("Paylaş:",complete);
}
$("start").addEventListener("click",start);
$("thought").addEventListener("click",register);
$("next").addEventListener("click",beginRelease);
$("again").addEventListener("click",start);
$("share").addEventListener("click",share);
const dialog=$("info");
function openInfo(){
 dialog.hidden=false;pause("info");$("info-close").focus();
}
function closeInfo(){
 if(dialog.hidden)return;
 dialog.hidden=true;resume("info");$("about").focus();
}
$("about").addEventListener("click",openInfo);
$("info-close").addEventListener("click",closeInfo);
dialog.addEventListener("click",e=>{if(e.target===dialog)closeInfo()});
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"&&!dialog.hidden){closeInfo();return}
 if(e.code==="Space" && active() && dialog.hidden && !e.repeat){
  if(e.target instanceof HTMLElement && ["BUTTON","INPUT","TEXTAREA","A"].includes(e.target.tagName))return;
  e.preventDefault();register();
 }
});
document.addEventListener("visibilitychange",()=>{
 if(document.visibilityState==="hidden")pause("hidden");
 else resume("hidden");
});
function tick(){
 if(active()){
  updateTimes();
  if(!state.pauses.size&&remaining()<=0){
   if(state.mode==="suppress")finishSuppression();else finishRelease();
  }
 }
 requestAnimationFrame(tick);
}
setMode("idle");
requestAnimationFrame(tick);
})();