(function salaryFlow(){
'use strict';
const $=id=>document.getElementById(id);
const fmt=n=>Math.max(0,Math.round(n)).toLocaleString('tr-TR');
const BASE=[
{id:'rent',title:'Kira',line:'Ev sahibi “müsaitsen” dedi.',kind:'bill',portion:.49,min:13500,max:90000,icon:'house',skip:'Birazdan'},
{id:'fee',title:'Aidat',line:'Yönetici grupta yazmış.',kind:'bill',portion:.055,min:1800,max:9500,icon:'building',skip:'Görmedim'},
{id:'market',title:'Market',line:'İki parça aldın.',kind:'bill',portion:.078,min:2400,max:10500,icon:'bag',skip:'Sonra'},
{id:'coffee',title:'Kahve',line:'Daha uyanamadın.',kind:'want',cost:260,icon:'cup',pay:'Al',skip:'Evde var'},
{id:'phone',title:'Telefon faturası',line:'Bu ay da konuşmuşsun.',kind:'bill',portion:.022,min:790,max:2900,icon:'phone',skip:'Sonra bakarım'},
{id:'wedding',title:'Düğün takısı',line:'Gruba IBAN atılmış.',kind:'social',cost:3800,icon:'ring',pay:'Tak',skip:'Mesaj at'},
{id:'electric',title:'Elektrik',line:'Açmışsın ışığı.',kind:'bill',portion:.051,min:1350,max:7000,icon:'bolt',skip:'Sonra'},
{id:'delivery',title:'Bedava kargo',line:'Biraz daha alırsan.',kind:'want',cost:690,icon:'box',pay:'Tamam',skip:'Gerek yok'},
{id:'internet',title:'İnternet',line:'Çekmediği günler dahil.',kind:'bill',portion:.019,min:590,max:2500,icon:'wifi',skip:'Sonra'},
{id:'taxi',title:'Taksi',line:'İnerken bir daha düşündün.',kind:'want',cost:860,icon:'taxi',pay:'Bin',skip:'Yürürüm'},
{id:'gas',title:'Doğalgaz',line:'Kombiye dokunmuşsun.',kind:'bill',portion:.053,min:1800,max:7900,icon:'fire',skip:'Sonra'},
{id:'gift',title:'Hediye grubu',line:'Seni de yazmışlar.',kind:'social',cost:1200,icon:'gift',pay:'Gönder',skip:'Çık gruptan'},
{id:'market2',title:'Yine market',line:'Ekmek almaya girdin.',kind:'bill',portion:.05,min:1500,max:7500,icon:'bag',skip:'Sonra'},
{id:'subscription',title:'Abonelik',line:'Neye üye olduğunu unuttun.',kind:'bill',portion:.015,min:300,max:2300,icon:'phone',skip:'İptal edeceğim'},
{id:'water',title:'Su',line:'Açmışsın musluğu.',kind:'bill',portion:.028,min:650,max:3500,icon:'drop',skip:'Sonra'},
{id:'repair',title:'Tamirci',line:'Usta “bir bakayım” dedi.',kind:'bill',portion:.10,min:2800,max:13500,icon:'tool',skip:'Yarın'},
{id:'night',title:'Bir şeyler içelim',line:'İki saat oturduk.',kind:'want',cost:1550,icon:'cup',pay:'Gidelim',skip:'Yarın erken'},
{id:'unknown',title:'Bu ne?',line:'Çekmişler.',kind:'bill',portion:.13,min:3500,max:30000,icon:'receipt',skip:'İtiraz et'}
];
const ESC={
rent:['Ev sahibi yazdı.','“Bir şey soracaktım.”','Ev sahibi tekrar aradı.','Bu sefer direkt arıyor.'],
fee:['Apartman grubu.','“Arkadaşlar aidat...”','Yönetici özelden yazdı.','“Görmemiş olabilirsiniz.”'],
market:['Market borcu.','Kasiyer baktı.','Yine mi sen?','Artık tanıyorlar.'],
phone:['Telefon faturası.','SMS gelmiş.','Hat biraz küstü.','Paket bitmiş.'],
electric:['Elektrik.','Son ödeme geçmiş.','Mumlara bakıyorsun.','Hâlâ fatura.'],
internet:['İnternet.','Hatırlatma gelmiş.','Mobil veriyle idare.','Yine hatırlatma.'],
gas:['Doğalgaz.','Gecikmiş.','Ev serin.', 'Montla oturuyorsun.'],
water:['Su.','Hatırlatma gelmiş.','Bir bak istersen.', 'Hâlâ burada.'],
repair:['Usta aradı.','“Parçayı aldım.”','Usta bir daha aradı.','“Abi?”'],
subscription:['Abonelik.','Yine yenilenmiş.','Üyelik hâlâ açık.', 'Ayın sürprizi.'],
unknown:['Banka bildirimi.','Bir de gecikme gelmiş.','Kim çekmiş hâlâ belirsiz.', 'Yine çekmişler.'],
market2:['Market.','Kasa soruyor.','İade fişi var mı?', 'Sık sık görüşüyoruz.']
};
const ICONS={
house:'<path d="m9 36 31-26 31 26M18 31v40h44V31M33 71V46h15v25"/>',
building:'<rect x="17" y="11" width="46" height="60" rx="3"/><path d="M29 23h7m9 0h7M29 35h7m9 0h7M29 47h7m9 0h7M36 71V59h8v12"/>',
bag:'<path d="M15 31h50l-6 42H21zM29 31v-9a11 11 0 0 1 22 0v9"/>',
cup:'<path d="M13 27h49v22c0 15-9 24-24 24S13 64 13 49zM62 31h7c11 0 8 19-7 19M28 14v-8m15 8V6"/>',
phone:'<rect x="25" y="9" width="30" height="62" rx="6"/><path d="M34 17h12m-10 46h8"/>',
ring:'<ellipse cx="40" cy="51" rx="23" ry="19"/><path d="m27 25 13-17 13 17-13 12zM27 25h26M40 8v29"/>',
bolt:'<path d="m45 6-28 39h22l-5 31 29-43H41z"/>',
box:'<path d="m13 25 27-14 27 14v41L40 79 13 66zM13 25l27 14 27-14M40 39v40"/>',
wifi:'<path d="M8 31c18-18 46-18 64 0M20 44c11-11 29-11 40 0M30 56c6-6 14-6 20 0"/><circle cx="40" cy="68" r="2.5" fill="#222" stroke="none"/>',
taxi:'<path d="m11 45 12-21h34l12 21v20H11zM24 44h32M32 24v-9h16v9"/><circle cx="25" cy="65" r="5"/><circle cx="55" cy="65" r="5"/>',
fire:'<path d="M42 7c9 16-4 24 5 33 2-8 8-12 9-19 21 31 11 52-16 52C13 73 5 44 42 7zM39 45c6 8-7 15-5 23"/>',
gift:'<rect x="14" y="31" width="52" height="42" rx="3"/><rect x="10" y="24" width="60" height="12" rx="3"/><path d="M40 24v49M40 23c-27 0-28-17-16-18 10-1 16 13 16 18zm0 0C68 23 68 5 56 5 46 4 40 18 40 23z"/>',
drop:'<path d="M40 8C30 28 19 39 19 52a21 21 0 0 0 42 0C61 39 50 28 40 8z"/>',
tool:'<path d="M62 13c-15-5-28 8-23 23L14 61a9 9 0 0 0 13 13l25-25c15 5 28-9 23-23L61 40 51 30z"/>',
receipt:'<path d="M22 9h36v62l-9-5-9 5-9-5-9 5zM30 27h20M30 38h20M30 49h11"/>'
};
let game=null,stepTimer=null,updateTimer=null,toastTimer=null,delayTimer=null;
const LIMIT=7200;
const costOf=item=>item.cost||Math.round(Math.min(item.max,Math.max(item.min,game.salary*item.portion))/10)*10;
const dur=()=>((performance.now()-game.start)/1000);
function toTime(sec){return Math.max(0,sec).toFixed(1).replace('.',',')}
function cleanTimers(){clearTimeout(stepTimer);clearTimeout(delayTimer);clearInterval(updateTimer)}
function say(x){const el=$('toast');el.textContent=x;el.classList.add('on');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('on'),1400)}
function icon(which){return `<svg viewBox="0 0 80 80" class="drawn" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${ICONS[which]||ICONS.receipt}</svg>`}
function renderStats(){
$('money').textContent='₺'+fmt(game.balance);
$('money').classList.toggle('dead',game.balance<=0);
$('spent').textContent='₺'+fmt(game.spent);
$('owed').textContent='₺'+fmt(game.debts.reduce((n,d)=>n+d.amount,0));
$('seconds').textContent=toTime(dur())+' sn';
$('progressFill').style.width=Math.max(0,Math.min(100,game.balance/game.salary*100))+'%';
$('finishedCount').textContent=String(game.cursor).padStart(2,'0')+' / '+BASE.length;
$('figureIcon').innerHTML=icon(game.active?.icon||'receipt');
$('figureText').textContent=game.debts.length ? game.debts.length+' şey bekliyor.' : 'Şimdilik.';
}
function init(salary){
cleanTimers();clearTimeout(toastTimer);
game={salary,balance:salary,spent:0,saved:0,debts:[],cursor:0,decisions:0,alerts:0,ended:false,active:null,start:performance.now(),paid:0,ignored:0,social:0};
$('intro').hidden=true;$('finish').hidden=true;
updateTimer=setInterval(()=>{if(!game.ended)renderStats()},100);
advance();
}
const overdue=d=>game.decisions>=d.due;
function getNext(){
const due=game.debts.find(overdue);
if(due){
due.due=Infinity; // don't repeat while this screen is open
const level=due.level;
const texts=ESC[due.id]||['Hatırlatma.','Tekrar yazmışlar.','Arıyorlar.','Yine.'];
return {type:'debt',id:due.id,icon:due.icon,title:texts[Math.min(level*2,3)],line:texts[Math.min(level*2+1,3)],kind:'bill',cost:due.amount,debt:due,pay:'Öde',skip:level>=1?'Sessize al':'Görmedim',note:'Gecikme eklendi.'}
}
if(game.cursor<BASE.length){
const src=BASE[game.cursor++];
return {...src,type:'base',cost:costOf(src),pay:src.pay||'Öde',note:src.kind==='bill'?'Erteleyince kaybolmuyor.':'İstersen alırsın.'}
}
const unserved=game.debts.find(d=>d.due!==Infinity);
if(unserved){unserved.due=0;return getNext()}
return null;
}
function advance(){
if(!game||game.ended)return;
if(game.balance<=0){end('zero');return}
const item=getNext();
if(!item){end('complete');return}
game.active=item;
renderStats();
$('kind').textContent=item.type==='debt'?'YİNE GELDİ.':item.kind==='bill'?'BUNU ÖDEYECEKSİN.':item.kind==='social'?'GRUBA YAZILDI.':'İSTERSEN.';
$('eventIcon').innerHTML=icon(item.icon);
$('eventTitle').textContent=item.title;
$('eventLine').textContent=item.line;
$('eventCost').textContent='₺'+fmt(item.cost);
$('eventHint').textContent=item.note;
$('btnPay').textContent=item.pay;
$('btnSkip').textContent=item.skip||'Sonra';
$('btnPay').disabled=false;$('btnSkip').disabled=false;
$('toast').classList.remove('on');
$('rightCountdown').textContent='';
$('deadlineFill').style.transform='scaleX(1)';
const began=performance.now();
const run=()=>{
if(game.ended||game.active!==item)return;
const r=Math.max(0,1-(performance.now()-began)/LIMIT);
$('deadlineFill').style.transform='scaleX('+r+')';
$('rightCountdown').textContent=r>0?String(Math.ceil(r*LIMIT/1000))+' sn':'';
if(r===0){decision(item.kind==='bill'?'pay':'skip',true);return}
stepTimer=setTimeout(run,85);
};
stepTimer=setTimeout(run,85);
}
function scheduleDebt(item){
const amount=item.cost,fee=Math.max(180,Math.round(amount*.055/10)*10);
game.debts.push({id:item.id,icon:item.icon,amount:amount+fee,original:amount,level:0,due:game.decisions+2});
game.alerts++;
if(item.id==='fee')say('Yönetici yazıyor...');
else if(item.id==='rent')say('Ev sahibi çevrimiçi.');
else say('Sonra, biraz pahalı.');
}
function resolveDebt(item,action){
const d=item.debt;
if(action==='pay'){
game.balance-=d.amount;game.spent+=d.amount;game.paid++;
game.debts=game.debts.filter(x=>x!==d);
say('Gitti.');
}else if(d.level<1){
d.level+=1;d.amount+=Math.max(200,Math.round(d.original*.055/10)*10);
d.due=game.decisions+2;
game.alerts++;
say(d.id==='fee'?'Yönetici özelden yazdı.': 'Bir daha geldi.');
}else{
d.level=3;d.due=Infinity;game.ignored++;
say(d.id==='fee'?'Grup sessize alındı.':'Görülmedi atıldı.');
}
}
function decision(action,timeout=false){
if(!game||game.ended||!game.active)return;
const item=game.active;
clearTimeout(stepTimer);game.active=null;
$('btnPay').disabled=true;$('btnSkip').disabled=true;
game.decisions++;
if(item.type==='debt'){
resolveDebt(item,action);
}else if(item.kind==='bill'){
if(action==='pay'){
 game.balance-=item.cost;game.spent+=item.cost;game.paid++;
 say(timeout?'Banka çekti.':'Ödendi.');
}else{
 scheduleDebt(item);
}
}else if(item.kind==='social'){
if(action==='pay'){
 game.balance-=item.cost;game.spent+=item.cost;game.paid++;
 say('Hayırlı olsun.');
}else{
 game.social+=1;game.saved+=item.cost;
 say('Grup sustu.');
}
}else{
if(action==='pay'){
 game.balance-=item.cost;game.spent+=item.cost;
 say('Aldın.');
}else{
 game.saved+=item.cost;
 say('İyi dayandın.');
}
}
renderStats();
delayTimer=setTimeout(advance,440);
}
function end(reason){
if(game.ended)return;
game.ended=true;cleanTimers();
const seconds=dur();game.finalSeconds=seconds;
const owed=game.debts.reduce((n,d)=>n+d.amount,0);
$('resultSeconds').textContent=toTime(seconds)+' sn';
$('resultTop').textContent=reason==='zero'?'MAAŞ BİTTİ.':'BİTTİ SAYILIR.';
$('resultLine').textContent=owed>0 ? (game.debts.some(d=>d.id==='fee')?'Yönetici hâlâ grupta.':game.debts.some(d=>d.id==='rent')?'Ev sahibi arıyor.':owed>game.balance?'Hesapta para yok. Borç duruyor.':'Para kalmış. Borç da kalmış.'):reason==='zero'?'Daha yeni yatmıştı.':'Bu kadar dayanması ilginç.';
$('resultDetail').textContent='Kalan ₺'+fmt(game.balance)+'  ·  Bekleyen ₺'+fmt(owed);
$('finish').hidden=false;
}
function selectSalary(v){
document.querySelectorAll('[data-salary]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.salary)===v)));
$('salaryCustom').value='';
$('start').dataset.amount=v;
}
document.querySelectorAll('[data-salary]').forEach(b=>b.addEventListener('click',()=>selectSalary(Number(b.dataset.salary))));
$('salaryCustom').addEventListener('input',()=>{document.querySelectorAll('[data-salary]').forEach(b=>b.setAttribute('aria-pressed','false'));$('start').dataset.amount=''});
$('start').addEventListener('click',()=>{
let s=$('salaryCustom').value.trim()?Number($('salaryCustom').value):Number($('start').dataset.amount||55000);
if(!Number.isFinite(s)||s<10000||s>500000){say('10 binle 500 bin arası.');return}
init(Math.round(s))
});
$('btnPay').addEventListener('click',()=>decision('pay'));
$('btnSkip').addEventListener('click',()=>decision('skip'));
$('reset').addEventListener('click',()=>{cleanTimers();$('intro').hidden=false;$('finish').hidden=true;game=null});
$('playAgain').addEventListener('click',()=>{init(game.salary)});
$('share').addEventListener('click',()=>{
const t='Maaşım '+toTime(game.finalSeconds||dur())+' saniye dayandı. aynen.fun/maas.html';
const url=location.origin+'/maas.html';
if(navigator.share){navigator.share({title:'Maaş kaç saniye dayanır?',text:t,url}).catch(()=>{});return}
if(navigator.clipboard){navigator.clipboard.writeText(t+' '+url).then(()=>say('Kopyalandı.')).catch(()=>say('Kopyalanmadı.'));return}
window.prompt('Paylaş:',t+' '+url)
});
window.addEventListener('pagehide',cleanTimers);
})();
