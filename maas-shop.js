(function salaryShop(){
'use strict';
const $=id=>document.getElementById(id);
const fmt=n=>Math.max(0,Math.round(n)).toLocaleString('tr-TR');
const fmtTime=n=>{const v=Math.max(0,n),m=Math.floor(v/60),s=Math.floor(v%60),d=Math.floor(v*10)%10;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+'.'+d};
const DAY_MS=2000,MAX_DAYS=30;
const products=[
{id:'coffee',name:'Bir kahve',price:260,icon:'dog'},
{id:'market',name:'Marketten iki şey',price:1250,icon:'bag'},
{id:'rent',name:'Kira',ratio:.49,icon:'house'},
{id:'aidat',name:'Aidat',ratio:.055,icon:'lift'},
{id:'phone',name:'Telefon faturası',price:1190,icon:'phone'},
{id:'taxi',name:'Taksi (kısa mesafe)',price:780,icon:'taxi'},
{id:'wedding',name:'Arkadaşın evleniyor',price:4100,icon:'ring'},
{id:'electric',name:'Elektrik faturası',price:2100,icon:'bulb'},
{id:'delivery',name:'Kargo bedava olsun',price:690,icon:'box'},
{id:'tea',name:'Bir çay daha',price:220,icon:'cup'},
{id:'groceries',name:'Yine market',price:2900,icon:'bag'},
{id:'gift',name:'Doğum günü grubu',price:1300,icon:'gift'},
{id:'stream',name:'Unuttuğun abonelik',price:649,icon:'tv'},
{id:'repair',name:'Bir şey bozuldu',price:5300,icon:'wrench'},
{id:'gas',name:'Doğalgaz',price:2800,icon:'flame'},
{id:'water',name:'Su faturası',price:930,icon:'drop'},
{id:'social',name:'Bir şeyler içelim',price:1990,icon:'cup'},
{id:'internet',name:'Çekmeyen internet',price:990,icon:'wifi'},
{id:'doctor',name:'Muayene farkı',price:2400,icon:'plus'},
{id:'surprise',name:'Tanımsız kesinti',price:7500,icon:'receipt'},
{id:'trip',name:'Üç gün tatil',price:18500,icon:'case'},
{id:'car',name:'Arabadan ses geliyor',price:14000,icon:'car'},
{id:'gold',name:'Düğüne altın lazım',price:9800,icon:'ring'},
{id:'laptop',name:'Yeni bilgisayar',price:48000,icon:'screen'}
];
const icons={
bag:'<path d="M18 28h44l-5 42H23zM29 28v-7a11 11 0 0 1 22 0v7"/>',
house:'<path d="M10 36 40 11 70 36M19 31v36h42V31M34 67V46h13v21"/>',
lift:'<rect x="17" y="10" width="46" height="60" rx="3"/><path d="M40 28v42M29 23l11-10 11 10M29 59l11 9 11-9"/>',
phone:'<rect x="25" y="9" width="30" height="62" rx="6"/><path d="M35 16h10M37 63h6"/>',
taxi:'<path d="M14 45 23 27h34l9 18 3 17H11zM27 27l-6 18h38l-6-18M25 62v6m30-6v6"/><circle cx="23" cy="62" r="5"/><circle cx="57" cy="62" r="5"/><path d="M32 27V19h16v8"/>',
ring:'<ellipse cx="40" cy="49" rx="22" ry="20"/><path d="M29 26 40 10 51 26 40 34zM29 26h22M40 10v24"/>',
bulb:'<path d="M40 8c-16 0-25 11-25 24 0 11 7 17 13 24h24c6-7 13-13 13-24 0-13-9-24-25-24ZM30 58h20M31 65h18M37 71h6"/>',
box:'<path d="m13 27 27-13 27 13v38L40 77 13 65zM13 27l27 13 27-13M40 40v37M26 20l27 13"/>',
cup:'<path d="M15 25h46v20c0 15-10 23-23 23s-23-8-23-23zM61 29h8c13 1 7 22-8 20M24 14v-7m15 7v-7m15 7v-7"/>',
gift:'<rect x="13" y="31" width="54" height="40" rx="3"/><rect x="9" y="24" width="62" height="12" rx="3"/><path d="M40 24v47M40 24c-27-2-29-17-15-18 10 0 15 13 15 18Zm0 0c26-2 29-17 15-18-10 0-15 13-15 18Z"/>',
tv:'<rect x="11" y="13" width="58" height="43" rx="5"/><path d="M40 56v11m-18 0h36M27 27h26m-22 9h18"/>',
wrench:'<path d="M59 13c-17-6-32 10-25 25L14 60a10 10 0 0 0 14 14l23-22c15 7 31-8 25-25L63 40 51 28z"/>',
flame:'<path d="M40 8c8 14-3 19 5 30 1-8 9-13 11-18 21 29 12 52-15 52C14 72 5 44 40 8ZM40 40c5 11-6 14-6 23 0 7 5 10 11 10 14 0 15-16-5-33Z"/>',
drop:'<path d="M40 8C31 26 17 39 17 52a23 23 0 0 0 46 0C63 39 49 26 40 8Z"/>',
wifi:'<path d="M9 31a46 46 0 0 1 62 0M20 43a30 30 0 0 1 40 0M30 54a15 15 0 0 1 20 0"/><circle cx="40" cy="67" r="3" fill="#565d68" stroke="none"/>',
plus:'<rect x="14" y="14" width="52" height="52" rx="8"/><path d="M40 25v30M25 40h30"/>',
receipt:'<path d="M20 9h40v62l-8-5-8 5-8-5-8 5-8-5zM28 25h24M28 36h20M28 48h24"/>',
case:'<rect x="13" y="26" width="54" height="46" rx="6"/><path d="M29 26v-8c0-9 22-9 22 0v8M24 26v46m32-46v46"/>',
car:'<path d="M12 41 22 22h36l10 19 2 23H10zM22 41h36M23 65v6m34-6v6"/><circle cx="24" cy="61" r="5"/><circle cx="56" cy="61" r="5"/>',
screen:'<rect x="8" y="15" width="64" height="44" rx="5"/><path d="M40 59v11m-17 0h34"/>'
};
function iconMarkup(name){
if(name==='dog')return '<img src="/dog-coffee.webp" alt="" loading="lazy" width="80" height="80">';
return `<svg viewBox="0 0 80 80" role="presentation" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${icons[name]||icons.receipt}</svg>`;
}
const price=(it)=>Math.round((it.ratio?state.salary*it.ratio:it.price)/10)*10;
let state=null,timer=null,toastTimer=null;
function notify(msg){const el=$('toast');el.textContent=msg;el.classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('on'),1800)}
function buildList(){
$('items').innerHTML=products.map(it=>{
const q=state.counts.get(it.id)||0,p=price(it);
return `<article class="item" data-item="${it.id}">
 <div class="item-visual">${iconMarkup(it.icon)}</div>
 <div><div class="item-name">${it.name}</div><div class="item-price">₺${fmt(p)}</div><div class="item-note">${q?`×${q} alındı`:''}</div></div>
 <div class="item-actions"><button class="buy" type="button" data-act="buy" data-id="${it.id}" ${state.finished?'disabled':''}>Al</button>
 <button class="sell" type="button" data-act="sell" data-id="${it.id}" ${q===0||state.finished?'disabled':''}>Geri al</button></div>
 </article>`;
}).join('');
}
function updateBalance(){
if(!state)return;
const left=Math.max(0,state.balance);
$('balance').textContent='₺'+fmt(left);
$('balance').classList.toggle('zero',left===0);
$('spent').textContent='₺'+fmt(state.spent);
const ratio=Math.max(0,Math.min(100,left/state.salary*100));
$('meter').style.width=ratio+'%';
$('meter').style.background=ratio<20?'#e36c70':'#2ac879';
$('elapsed').textContent=fmtTime((performance.now()-state.started)/1000);
$('day').textContent=String(Math.min(state.day+1,30)).padStart(2,'0')+'/30';
$('shopCount').textContent=state.buys+' işlem';
}
function finish(reason){
if(state.finished)return;
state.finished=true;
clearInterval(timer);
state.seconds=Math.max(.1,(performance.now()-state.started)/1000);
updateBalance();buildList();
const bankrupt=reason==='zero';
$('endTitle').textContent=bankrupt?fmtTime(state.seconds):'30 GÜN';
$('endKicker').textContent=bankrupt?'MAAŞIN ÖMRÜ':'MAAŞIN HAYATTA';
$('endMessage').textContent=bankrupt?'Maaş hesabına uğradı. Kalıcı değildi.':'Maaşın ay sonunu gördü. Tebrik etmek istedik ama şaşırdık.';
$('end').hidden=false;
}
function tick(){
if(!state||state.finished)return;
const elapsed=performance.now()-state.started;
while(state.day<MAX_DAYS && elapsed >= (state.day+1)*DAY_MS){
state.day+=1;
const cost=Math.max(140,Math.round(state.salary*.014));
state.balance-=cost;state.spent+=cost;
if(state.day%6===0)$('catCaption').textContent=['Kiradan önceki sakinlik.','Kendiliğinden eksiliyor.','Hayat devam ediyor. Maalesef.','Bu bir bildirim değil. Gider.','Bugün de bir şey ödedin.'][Math.floor(state.day/6-1)%5];
if(state.balance<=0){state.balance=0;finish('zero');return}
}
updateBalance();
if(state.day>=MAX_DAYS){finish('survive')}
}
function reset(salary){
clearInterval(timer);clearTimeout(toastTimer);
state={salary,balance:salary,spent:0,counts:new Map(),buys:0,day:0,started:performance.now(),finished:false,seconds:0};
$('end').hidden=true;
$('catCaption').textContent='Maaş yattı. Kısa süreliğine.';
document.querySelectorAll('.preset').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.salary)===salary)));
buildList();updateBalance();
timer=setInterval(tick,90);
}
function pay(id,action){
if(!state||state.finished)return;
const item=products.find(x=>x.id===id);if(!item)return;
const q=state.counts.get(id)||0,cost=price(item);
if(action==='buy'){
 state.counts.set(id,q+1);state.balance-=cost;state.spent+=cost;state.buys+=1;
 $('catCaption').textContent=state.balance>0?'İhtiyacın vardı. Kesin.':'Bir maaş daha gitti.';
 if(state.balance<=0){state.balance=0;finish('zero');return}
}else if(action==='sell'&&q>0){
 state.counts.set(id,q-1);state.balance=Math.min(state.salary,state.balance+cost);state.spent=Math.max(0,state.spent-cost);
 $('catCaption').textContent='İade kabul edildi. Şimdilik.';
}else return;
buildList();updateBalance();
}
function share(){
const text=state&&state.finished?`Maaşım ${fmtTime(state.seconds)} dayandı. Bunu başarı sayıyor muyuz?`: 'Maaşımın ne kadar dayanacağını test ediyorum.';
const url=location.origin+'/maas.html';
if(navigator.share){navigator.share({title:'Maaşın Kaç Saniyede Biter?',text,url}).catch(()=>{});return}
if(navigator.clipboard){navigator.clipboard.writeText(text+' '+url).then(()=>notify('LİNK KOPYALANDI')).catch(()=>notify('KOPYALANAMADI'));return}
window.prompt('Paylaş:',text+' '+url);
}
$('items').addEventListener('click',e=>{
const b=e.target.closest('button[data-act]');if(!b)return;
pay(b.dataset.id,b.dataset.act);
});
$('reset').addEventListener('click',()=>reset(state.salary));
$('resetTop').addEventListener('click',()=>reset(state.salary));
$('again').addEventListener('click',()=>reset(state.salary));
$('share').addEventListener('click',share);
document.querySelectorAll('.preset').forEach(btn=>btn.addEventListener('click',()=>{
const n=Number(btn.dataset.salary);
if(n)reset(n);
else {
const raw=window.prompt('Maaşın kaç TL?',String(state.salary));
if(raw===null)return;
const num=Number(raw.replace(/[.\s]/g,'').replace(',','.'));
if(!Number.isFinite(num)||num<10000||num>500000){notify('10.000–500.000 ₺ ARASI.');return}
reset(Math.round(num));
}
}));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')tick()});
reset(55000);
})();
