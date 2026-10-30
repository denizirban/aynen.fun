(()=>{'use strict';
const $=id=>document.getElementById(id), C=$('world'),ctx=C.getContext('2d',{alpha:false}),W=900,H=525;
const KEY='aynen-iceridekiler-v2', TWO=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rnd=(a,b)=>a+Math.random()*(b-a),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const types={
macro:{label:'Makrofaj',color:'#98c7ae',nuc:'#457e69',r:18,speed:30,dps:2.7,info:'Yerleşik fagosit. Bakterileri ve ölü hücre kalıntılarını temizler; kimyasal sinyaller gönderir.',group:'doğuştan'},
neutro:{label:'Nötrofil',color:'#cabee4',nuc:'#8876ba',r:15,speed:69,dps:4.0,info:'Damar dışına göç eden hızlı fagosit. Bakteriye etkilidir; uzun süreli aşırı aktivasyonu doku hasarını artırır.',group:'doğuştan'},
dend:{label:'Dendritik hücre',color:'#e6c3a5',nuc:'#b37e59',r:18,speed:33,dps:.25,info:'Antijen örnekler; lenf düğümündeki antijen sunumunu ve özgül yanıtın başlamasını temsil eder.',group:'köprü'},
nk:{label:'NK hücresi',color:'#c1d4b2',nuc:'#73985b',r:16,speed:58,dps:3.2,info:'Doğuştan gelen sitotoksik savunmanın parçası. Viral enfeksiyonda değişmiş hücreleri hedef alır.',group:'doğuştan'},
tcell:{label:'Sitotoksik T hücresi',color:'#aacbe9',nuc:'#5b91be',r:14,speed:65,dps:5.2,info:'Uygun antijen sunumu sonrası çoğalır; virüsle enfekte hücreleri hedefler.',group:'özgül'},
bcell:{label:'B / plazma hücresi',color:'#f1d597',nuc:'#bd9750',r:16,speed:31,dps:0,info:'Antijene özgül antikor üretilmesini temsil eder; serbest mikropların temizlenmesini kolaylaştırır.',group:'özgül'},
treg:{label:'Düzenleyici T hücresi',color:'#dcbacb',nuc:'#a7738d',r:15,speed:31,dps:0,info:'İmmün yanıtın sınırlandırılmasını temsil eder. Gerçek düzenleme çok sayıda hücre ve sinyalle gerçekleşir.',group:'denge'},
fibro:{label:'Fibroblast',color:'#d4b5a0',nuc:'#a27f68',r:18,speed:17,dps:0,info:'Bağ dokusunun onarımı ve matriks oluşumunda rol oynar; bağışıklık hücresi değildir.',group:'onarım'}
};
const campaign=[
{id:'scrape',title:'Deri bariyeri açıldı',desc:'Küçük bir kesik. Bakteriler dokuya ulaşıyor.',kind:'bacteria',antigen:'bakteri-A',count:12,x:450,y:245,base:85,goal:'Bakteri yükünü sıfıra indir; dokuyu koru.',fact:'Doğuştan gelen yanıt hızlı başlar. Makrofajlar ve nötrofiller bakteri temizliğinde rol oynar.'},
{id:'repair',title:'Temizlik bitti, onarım başladı',desc:'Mikrop değil: doku kalıntıları ve kapanması gereken bir açıklık.',kind:'debris',antigen:null,count:11,x:550,y:270,base:70,goal:'Kalıntıyı temizle; inflamasyonu düşük tut.',fact:'Hasar sonrası immün hücreler kalıntıları temizler. Fibroblastlar ve diğer doku hücreleri onarıma katkı sağlar.'},
{id:'virus',title:'Hücrelerin içinde bir misafir',desc:'Virüs yakındaki doku hücrelerini enfekte ediyor.',kind:'virus',antigen:'virus-V',count:11,x:295,y:205,base:110,goal:'Viral yükü ve enfekte hücre sayısını sıfırla.',fact:'NK hücreleri erken dönemde katkı verebilir; sitotoksik T hücreleri enfekte hücreleri tanıyıp hedefler.'},
{id:'allergy',title:'Yanlış alarm',desc:'Zararsız çevresel parçacıklar geldi. Gereksiz inflamasyon oluşturma.',kind:'allergen',antigen:null,count:15,x:610,y:205,base:45,goal:'Parçacıkların uzaklaşmasını beklerken doku dengesini koru.',fact:'Alerjik yanıtı IgE ve mast hücresi gibi farklı mekanizmalar yürütür. Burada yalnızca gereksiz inflamasyon riski temsildir.'},
{id:'return',title:'Yine aynı bakteri',desc:'Önceki karşılaşmadan antijene özgü hafıza kalmış olabilir.',kind:'bacteria',antigen:'bakteri-A',count:17,x:450,y:245,base:105,goal:'Aynı antijenin ikinci karşılaşmasındaki farkı izle.',fact:'Adaptif bağışıklık hafızası antijene özgüdür. Farklı etkenlere genellenemez.'},
{id:'return-virus',title:'Bir kez daha',desc:'İlk viral karşılaşma hatırlanıyor mu?',kind:'virus',antigen:'virus-V',count:17,x:295,y:220,base:110,goal:'Hafıza yanıtını kullanarak enfekte hücreleri kontrol et.',fact:'Hafıza B ve T hücreleri sonraki uygun antijen karşılaşmalarında daha hızlı yanıt verebilir.'}
];
const costs={patrol:21,alarm:24,target:27,calm:18,repair:22};
const DEFAULT=()=>({version:2,phase:'intro',returnPhase:'between',chapter:0,clock:0,chapterTime:0,tissue:94,energy:82,inflam:7,memory:0,signals:0,presentation:0,antibody:0,points:9,score:0,kills:0,peak:7,focus:{x:450,y:260},logs:[],history:[],levels:{macro:1,neutro:0,dend:0,nk:0,tcell:0,bcell:0,treg:0,fibro:0},memories:{'bakteri-A':0,'virus-V':0},actionReady:{},unlocks:{},streak:0,completed:false,eventsMade:0,speed:1});
let raw=null;try{raw=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
let state=DEFAULT(), agents=[],particles=[],hosts=[],bursts=[],signals=[],debris=[],flares=[],selected=null,frameTime=0,saveTime=0,uiTime=0,renderTs=0,maxId=0;
const animReduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(raw&&raw.state&&raw.state.version===2&&!raw.state.completed){
 state=Object.assign(DEFAULT(),raw.state);state.levels=Object.assign(DEFAULT().levels,raw.state.levels||{});state.memories=Object.assign(DEFAULT().memories,raw.state.memories||{});state.actionReady=raw.state.actionReady||{};
 state.logs=(raw.state.logs||[]).slice(0,25);state.history=(raw.state.history||[]).slice(0,12);
 agents=Array.isArray(raw.agents)?raw.agents.filter(a=>types[a.type]&&Number.isFinite(a.x)&&Number.isFinite(a.y)).slice(0,140):[];
 particles=Array.isArray(raw.particles)?raw.particles.filter(b=>Number.isFinite(b.x)&&Number.isFinite(b.y)).slice(0,100):[];
 hosts=Array.isArray(raw.hosts)?raw.hosts.filter(h=>Number.isFinite(h.x)).slice(0,40):[];
 debris=Array.isArray(raw.debris)?raw.debris.filter(h=>Number.isFinite(h.x)).slice(0,60):[];
 signals=Array.isArray(raw.signals)?raw.signals.slice(0,50):[];
 maxId=Math.max(0,...agents.map(a=>a.id||0),...particles.map(a=>a.id||0));
 if(state.phase==='active'){state.phase='paused';state.returnPhase='active';}
}
const wave=()=>campaign[Math.min(state.chapter,campaign.length-1)];
function addAgent(type,x,y){if(!types[type]||agents.length>=100)return null;const fromVessel=type==='neutro'||type==='nk'||type==='tcell'||type==='bcell',a={id:++maxId,type,x:x??(fromVessel?rnd(38,115):rnd(90,810)),y:y??rnd(75,445),vx:rnd(-1,1),vy:rnd(-1,1),angle:rnd(0,TWO),age:0,hit:0,life:type==='neutro'?rnd(58,90):2000};agents.push(a);return a;}
function addParticle(type,x,y,antigen){if(particles.length>=80)return;particles.push({id:++maxId,type,x:clamp((x??450)+rnd(-60,60),25,W-25),y:clamp((y??260)+rnd(-50,50),22,H-22),hp:type==='allergen'?1:type==='debris'?1:6,age:0,angle:rnd(0,TWO),antigen:antigen||wave().antigen});}
function addSignal(x,y,power,kind){signals.push({x,y,power,age:0,kind:kind||'alarm'});if(signals.length>28)signals.shift();}
function pop(x,y,color){bursts.push({x,y,r:0,life:0,color:color||'#8fb99f'});if(bursts.length>45)bursts.shift();}
function event(msg){state.logs.unshift({time:Math.round(state.clock),text:msg});state.logs=state.logs.slice(0,25);state.eventsMade++;drawLogs();}
function save(){try{localStorage.setItem(KEY,JSON.stringify({state,agents,particles,hosts,debris,signals}));$('saved').textContent='KAYDEDİLDİ ✓'}catch(e){$('saved').textContent='KAYIT YOK'}}
function resetWorld(){agents=[];particles=[];hosts=[];debris=[];signals=[];bursts=[];flares=[];for(let i=0;i<5;i++)addAgent('macro');addAgent('dend');addAgent('fibro');addAgent('treg');for(let k=0;k<22;k++){let x=80+(k%6)*148+rnd(-22,22),y=95+Math.floor(k/6)*109+rnd(-21,21);hosts.push({id:++maxId,x,y,infect:0,dead:false,heal:0});}}
if(!hosts.length||!agents.length)resetWorld();
function start(){if(state.phase!=='intro')return;state.phase='between';$('overlay').hidden=true;event('Doku devriyesi başladı.');rebuild();save();}
function beginChapter(){if(state.phase!=='between'||state.chapter>=campaign.length)return;const w=wave();state.phase='active';state.chapterTime=0;state.presentation=0;state.antibody=0;state.signals=0;state.replication=0;
 const memo=state.memories[w.antigen]||0;state.activation=(w.antigen&&memo>0)?Math.min(55,memo):0;state.focus={x:w.x,y:w.y};particles=[];debris=[];signals=[];
 if(w.kind==='debris'){for(let i=0;i<w.count;i++)debris.push({id:++maxId,x:w.x+rnd(-115,115),y:w.y+rnd(-80,80),hp:3});}
 else for(let i=0;i<w.count;i++)addParticle(w.kind,w.x,w.y,w.antigen);
 if(w.kind==='virus'){for(let j=0;j<2;j++){const h=hosts.slice().sort((a,b)=>Math.hypot(a.x-w.x,a.y-w.y)-Math.hypot(b.x-w.x,b.y-w.y))[j];if(h){h.infect=3;}}}
 if(w.kind==='bacteria'||w.kind==='virus')addSignal(w.x,w.y,20,'alarm');
 if(w.kind==='debris')state.inflam=clamp(state.inflam+9,0,100);
 else if(w.kind==='allergen')state.inflam=clamp(state.inflam+5,0,100);
 else state.inflam=clamp(state.inflam+12,0,100);
 event('OLAY '+(state.chapter+1)+': '+w.title);rebuild();save();}
function finishChapter(){if(state.phase!=='active')return;const w=wave();state.phase='between';const gained=Math.max(5,Math.round(4+state.tissue/13+Math.max(0,45-state.inflam)/20));state.points+=gained;state.score+=Math.round(state.tissue)+gained*2;
 if(w.antigen){let gain=clamp(Math.round(16+state.activation*.22+state.presentation*.12),12,35);state.memories[w.antigen]=clamp((state.memories[w.antigen]||0)+gain,0,100);}
 const m=Object.values(state.memories);state.memory=Math.round(m.reduce((a,b)=>a+b,0)/m.length);
 state.history.push({title:w.title,tissue:Math.round(state.tissue),inflam:Math.round(state.inflam),memo:state.memory});
 state.chapter++;state.inflam=Math.max(5,state.inflam-10);state.energy=Math.min(100,state.energy+24);
 event('Doku dengelendi. +'+gained+' araştırma puanı.');
 if(state.chapter>=campaign.length){complete(true);return;}updateUi(true);save();}
function complete(success){state.phase='finished';state.completed=true;save();
 const good=success&&state.tissue>=75&&state.peak<65;
 const title=!success?'Doku savunmasız kaldı.':good?'Soğukkanlı koruyucu':state.peak>70?'Fazla hevesli savunma':'Pahalı bir zafer';
 const sub=!success?'Doku zarar gördü. Farklı hücrelere ve onarıma yatırım yaparak yeniden dene.':good?'Savunmayı doku onarımıyla dengede tuttun.':'Sistem ayakta. Ama bu savunmanın bir bedeli oldu.';
 const memory=state.memory;
 const markup='<div class="result"><span class="mono">İÇERİDEKİLER / VÜCUT RAPORU</span><h2>'+title+'</h2><p>'+sub+'</p><div class="result-stats"><span>DOKU<b>'+Math.round(state.tissue)+'</b></span><span>HAFIZA<b>'+memory+'</b></span><span>İNFLAMASYON ZİRVESİ<b>'+Math.round(state.peak)+'</b></span></div><div class="report-meta">'+state.chapter+' olay · '+state.kills+' temizlenen patojen · '+Math.round(state.score)+' puan</div><div class="result-actions"><button class="solid" id="result-share">PAYLAŞ</button><button class="ghost" id="result-image">KARTI İNDİR</button><button class="ghost" id="result-again">YENİDEN</button></div><div class="share-row"><a id="share-x" target="_blank" rel="noopener noreferrer">X</a><a id="share-wa" target="_blank" rel="noopener noreferrer">WhatsApp</a><button id="copy-result">Bağlantıyı kopyala</button></div></div>';
 $('overlay-content').innerHTML=markup;$('overlay').hidden=false;
 const msg='İçeridekiler: '+title+' | Doku '+Math.round(state.tissue)+' | Hafıza '+memory+' | '+state.chapter+' olay. https://aynen.fun/iceridekiler.html';
 $('share-x').href='https://twitter.com/intent/tweet?text='+encodeURIComponent(msg);
 $('share-wa').href='https://wa.me/?text='+encodeURIComponent(msg);
 $('copy-result').onclick=()=>copyText(msg);
 $('result-share').onclick=()=>{if(navigator.share)navigator.share({title:'İçeridekiler',text:msg,url:'https://aynen.fun/iceridekiler.html'}).catch(()=>{});else copyText(msg)};
 $('result-image').onclick=()=>downloadCard(title);
 $('result-again').onclick=restart;
 updateUi(true);}
function copyText(t){if(navigator.clipboard){navigator.clipboard.writeText(t).then(()=>notice('Bağlantı kopyalandı.')).catch(()=>notice('Kopyalanamadı.'))}else notice(t);}
function downloadCard(title){const c=document.createElement('canvas');c.width=1080;c.height=1080;const z=c.getContext('2d');z.fillStyle='#f2f4ee';z.fillRect(0,0,1080,1080);z.fillStyle='#b2d2bf';z.beginPath();z.arc(785,340,245,0,TWO);z.fill();z.fillStyle='#638e79';z.beginPath();z.ellipse(780,340,105,83,.3,0,TWO);z.fill();z.fillStyle='#202824';z.font='bold 31px Arial';z.fillText('aynen.fun  /  içeridekiler',80,98);z.font='bold 73px Arial';z.fillText(title.slice(0,22),80,705);z.font='29px Arial';z.fillText('DOKU   '+Math.round(state.tissue)+'     HAFIZA   '+state.memory+'     OLAY   '+state.chapter,80,782);z.strokeStyle='#33483e';z.lineWidth=3;z.beginPath();z.moveTo(80,817);z.lineTo(1000,817);z.stroke();z.font='26px Arial';z.fillText('Mikropları durdur. Dokuyu koru.',80,881);const a=document.createElement('a');a.download='iceridekiler-sonuc.png';a.href=c.toDataURL('image/png');a.click();}
function restart(){if(!confirm('Mevcut oyunu silip yeniden başlatmak istiyor musun?'))return;try{localStorage.removeItem(KEY)}catch(e){}location.reload()}
function notice(t){const el=$('toast');el.textContent=t;el.classList.add('show');clearTimeout(notice.timer);notice.timer=setTimeout(()=>el.classList.remove('show'),2100)}
function skill(kind){
 if(state.phase!=='active')return;const cost=costs[kind];if(!cost)return;
 if(state.energy<cost){notice('Enerji yeterli değil.');return}
 if(state.clock<(state.actionReady[kind]||0)){notice('Bu müdahale henüz hazır değil.');return}
 if(kind==='target'&&wave().antigen===null){notice('Bu olayda antijene özgü saldırı gerekli değil.');return}
 state.energy-=cost;state.actionReady[kind]=state.clock+6;
 const pos=state.focus;
 if(kind==='patrol'){addAgent('macro',pos.x+rnd(-50,50),pos.y+rnd(-50,50));state.inflam+=2;event('Makrofaj desteği gönderildi.')}
 if(kind==='alarm'){for(let i=0;i<3;i++)addAgent('neutro',rnd(35,90),rnd(80,455));addSignal(pos.x,pos.y,24,'alarm');state.inflam+=18;event('Nötrofiller çağrıldı; inflamasyon arttı.')}
 if(kind==='target'){const antigen=wave().antigen,delay=state.presentation>=25||state.memories[antigen]>=15;
   if(!delay){state.presentation+=10;state.activation+=12;event('Antijen sunumu güçlendiriliyor.');}else{state.activation+=39;addAgent(wave().kind==='virus'?'tcell':'bcell');addAgent(wave().kind==='virus'?'tcell':'bcell');event('Özgül yanıt güçlendirildi.');}addSignal(pos.x,pos.y,13,'adaptive');state.inflam+=3;}
 if(kind==='calm'){state.inflam-=19;addAgent('treg',pos.x+rnd(-40,40),pos.y+rnd(-40,40));addSignal(pos.x,pos.y,17,'calm');event('Düzenleyici yanıt desteklendi.')}
 if(kind==='repair'){state.tissue+=7;addAgent('fibro',pos.x+rnd(-50,50),pos.y+rnd(-30,30));state.inflam-=3;addSignal(pos.x,pos.y,16,'repair');event('Doku onarımına kaynak aktarıldı.')}
 state.inflam=clamp(state.inflam,0,100);state.tissue=clamp(state.tissue,0,100);pop(pos.x,pos.y,'#79a890');updateUi(true);save();}
const upgrades=[
['macro','Makrofaj','Fagositoz · devriye',5],['neutro','Nötrofil','İlk yanıt · hızlı göç',7],['dend','Dendritik','Antijen sunumu',7],['nk','NK hücresi','Viral erken yanıt',10],
['tcell','T hücresi','Özgül enfekte hücre yanıtı',12],['bcell','B hücresi','Antikor üretimi',12],['treg','Treg','İnflamasyon dengesi',9],['fibro','Fibroblast','Doku onarımı',8]
];
function upgrade(type){const u=upgrades.find(v=>v[0]===type);if(!u||state.phase==='intro'||state.phase==='finished')return;
 if((type==='tcell'||type==='bcell')&&state.chapter<2){notice('Özgül bağışıklık 3. olayda açılır.');return;}
 const count=state.levels[type]||0,cost=u[3]+count*3;if(state.points<cost){notice('Araştırma puanı yetersiz.');return;}
 state.points-=cost;state.levels[type]=count+1;addAgent(type);event(u[1]+' laboratuvarı geliştirildi.');updateUi(true);save();}
let upgradeSnapshot='';
function renderUpgrades(){const key=JSON.stringify([state.points,state.phase,state.chapter,state.levels]);if(key===upgradeSnapshot)return;upgradeSnapshot=key;
 const root=$('upgrades');root.innerHTML='';
 upgrades.forEach(u=>{const type=u[0],lvl=state.levels[type]||0,cost=u[3]+lvl*3,locked=(type==='tcell'||type==='bcell')&&state.chapter<2;
 const div=document.createElement('div');div.className='unit-row';
 const icon=document.createElement('span');icon.className='unit-swatch';icon.style.background=types[type].color;
 const info=document.createElement('div');const title=document.createElement('strong');title.textContent=u[1]+' · '+lvl;const desc=document.createElement('small');desc.textContent=u[2];info.append(title,desc);
 const button=document.createElement('button');button.className='upgrade';button.textContent=locked?'KİLİTLİ':'+'+cost+' AR';button.disabled=locked||state.points<cost||state.phase==='intro'||state.phase==='finished';button.onclick=()=>upgrade(type);
 div.append(icon,info,button);root.append(div);});
}
let lastLog='';
function drawLogs(){const key=JSON.stringify(state.logs);if(key===lastLog)return;lastLog=key;
 $('log').innerHTML='';state.logs.slice(0,7).forEach(e=>{const p=document.createElement('p'),t=document.createElement('em');t.textContent=String(Math.floor(e.time/60)).padStart(2,'0')+':'+String(e.time%60).padStart(2,'0');p.append(t,document.createTextNode(e.text));$('log').append(p);});
 $('event-count').textContent=state.logs.length+' KAYIT';}
function updateUi(force){const w=wave();['tissue','energy','inflam','memory'].forEach(n=>{$(n+'-n').textContent=Math.round(state[n]);$(n+'-bar').style.width=clamp(state[n],0,100)+'%'});
 $('points').textContent=state.points+' ARAŞTIRMA';$('chapter').textContent='OLAY '+String(Math.min(state.chapter+1,campaign.length)).padStart(2,'0')+' / '+campaign.length.toString().padStart(2,'0');
 $('episode-title').textContent=state.chapter>=campaign.length?'Doku raporu hazır.':w.title;
 $('episode-desc').textContent=state.chapter>=campaign.length?'Tüm senaryolar tamamlandı.':w.desc;
 $('next').disabled=state.phase!=='between';$('next').textContent=state.chapter===0?'İLK OLAYI BAŞLAT →':'SONRAKİ OLAY →';
 $('scene-label').textContent=state.phase==='active'?'BAĞIŞIKLIK / AKTİF YANIT':state.phase==='paused'?'SİSTEM / DURAKLATILDI':'DOKU / GÖZETİM';
 $('pulse').className='pulse'+(state.phase==='active'?' danger':'');
 $('population').textContent=agents.length+' HÜCRE / '+(particles.length+debris.length)+' PARÇACIK';
 $('clock').textContent=String(Math.floor(state.clock/60)).padStart(2,'0')+':'+String(Math.floor(state.clock%60)).padStart(2,'0')+' / '+Math.min(state.chapter+1,campaign.length)+'. OLAY';
 $('pause').textContent=state.phase==='paused'?'DEVAM ET':'DURAKLAT';$('speed').textContent=state.speed+'× HIZ';
 $('science').textContent=w.fact;
 if($('episode-progress')){$('episode-progress').style.width=clamp(state.chapter/campaign.length*100,0,100)+'%';$('episode-progress-label').textContent=state.chapter+' / '+campaign.length+' tamamlandı';}
 if($('focus-info'))$('focus-info').textContent='ODAK: '+(Math.round(state.focus.x/W*100))+'% / '+(Math.round(state.focus.y/H*100))+'%';
 if($('immune-readout')){$('immune-readout').textContent=wave().antigen===null?'Antijen sunumu bu olayda belirleyici değil.':'ANTİJEN SUNUMU '+Math.round(state.presentation)+'% · YANIT '+Math.round(state.activation||0)+'%';}
 if($('goal'))$('goal').textContent=w.goal;
 document.querySelectorAll('[data-action]').forEach(btn=>{const act=btn.dataset.action,remaining=Math.ceil((state.actionReady[act]||0)-state.clock);
 btn.disabled=state.phase!=='active'||state.energy<costs[act]||remaining>0||(act==='target'&&!w.antigen);
 const small=btn.querySelector('small');if(small)small.textContent=remaining>0?remaining+' sn bekle':'−'+costs[act]+' enerji';});
 renderUpgrades();drawLogs();}
function pickTarget(a){const kind=wave().kind;let pick=null,best=Infinity;
 if(a.type==='fibro'||a.type==='treg'||a.type==='bcell'){return null;}
 if((a.type==='nk'||a.type==='tcell')&&kind==='virus'){for(const h of hosts){if(h.infect<=0||h.dead)continue;const d=distance(a,h);if(d<best){best=d;pick={obj:h,kind:'host',range:40}}}return pick;}
 if(kind==='bacteria'&&['macro','neutro','dend'].includes(a.type)){for(const b of particles){if(b.type!=='bacteria')continue;const d=distance(a,b);if(d<best){best=d;pick={obj:b,kind:'bug',range:39}}}}
 if(kind==='debris'&&['macro','neutro','dend'].includes(a.type)){for(const b of debris){const d=distance(a,b);if(d<best){best=d;pick={obj:b,kind:'debris',range:39}}}}
 return pick;}
function follow(a,aim,dt){const d=types[a.type];let x=0,y=0;
 if(aim){const dx=aim.x-a.x,dy=aim.y-a.y,length=Math.max(1,Math.hypot(dx,dy));x=dx/length;y=dy/length;}
 else if(Math.random()<dt*.7){a.vx=rnd(-1,1);a.vy=rnd(-1,1)}
 if(!aim){x=a.vx;y=a.vy}
 a.vx=a.vx*.7+x*.3;a.vy=a.vy*.7+y*.3;
 const length=Math.max(1,Math.hypot(a.vx,a.vy));
 a.x=clamp(a.x+(a.vx/length)*d.speed*dt,25,W-25);a.y=clamp(a.y+(a.vy/length)*d.speed*dt,25,H-25);
 a.angle+=dt*(a.type==='neutro'?.9:.32);}
function stepAgents(dt){
 const w=wave();for(let i=agents.length-1;i>=0;i--){const a=agents[i],type=a.type;a.age+=dt;a.hit=Math.max(0,a.hit-dt);
 if(a.age>a.life){agents.splice(i,1);continue;}
 const target=state.phase==='active'?pickTarget(a):null;
 let aim=target?target.obj:null;
 if(!aim&&state.phase==='active'&&['neutro','macro','dend'].includes(type)&&w.kind!=='allergen'){
  const sig=signals.filter(v=>v.kind==='alarm').sort((p,q)=>distance(a,p)-distance(a,q))[0];if(sig)aim=sig;else aim=state.focus;}
 if(!aim&&type==='fibro'&&state.tissue<92)aim=state.focus;
 if(!aim&&type==='treg'&&state.inflam>28)aim=state.focus;
 follow(a,aim,dt);
 if(target&&distance(a,target.obj)<target.range){
  if(target.kind==='bug'){target.obj.hp-=types[type].dps*dt*(1+state.antibody*.012);a.hit=.3;if(type==='dend')state.presentation=clamp(state.presentation+dt*6,0,100);if(type==='neutro')state.inflam+=dt*.55;}
  if(target.kind==='debris'){target.obj.hp-=types[type].dps*dt;a.hit=.3;}
  if(target.kind==='host'){target.obj.infect-=types[type].dps*dt*(type==='tcell'?1+.25*state.activation/100:1);a.hit=.3;state.inflam+=dt*.13;if(target.obj.infect<=0){target.obj.infect=0;target.obj.heal=6;pop(target.obj.x,target.obj.y,'#9fc4d2')}}
 }
 if(type==='dend'&&w.antigen&&state.phase==='active'&&state.chapterTime>3){state.presentation=clamp(state.presentation+dt*(.35+.12*Math.min(8,particles.length)),0,100);}
 if(type==='fibro'&&state.phase==='active'&&w.kind==='debris'){state.tissue=Math.min(100,state.tissue+dt*.4)}
 if(type==='treg'&&state.phase==='active'&&state.inflam>9){state.inflam=Math.max(6,state.inflam-dt*.22)}
 }}
function stepThreat(dt){
 const w=wave();for(let i=particles.length-1;i>=0;i--){let b=particles[i];b.age+=dt;b.angle+=dt*.7;
 b.x=clamp(b.x+Math.sin(b.angle+b.id)*dt*9,20,W-20);b.y=clamp(b.y+Math.cos(b.angle*.9+b.id)*dt*8,20,H-20);
 if(b.type==='allergen')b.hp-=dt*.065;
 if(b.type==='virus'){b.hp-=dt*.29;let h=null,near=36;for(const t of hosts){if(t.dead||t.infect>0)continue;const d=distance(b,t);if(d<near){h=t;near=d}}if(h){h.infect=3.8;pop(h.x,h.y,'#ce879c');b.hp=0;}}
 if(b.type==='bacteria'&&state.antibody>0)b.hp-=dt*.11*state.antibody;
 if(b.hp<=0){if(b.type==='bacteria')state.kills++;state.points+=b.type==='bacteria'&&Math.random()<.25?1:0;pop(b.x,b.y,b.type==='virus'?'#b48cc2':'#85ad9a');particles.splice(i,1);}
 }
 for(let i=debris.length-1;i>=0;i--){if(debris[i].hp<=0){pop(debris[i].x,debris[i].y,'#d6a985');debris.splice(i,1)}}
 for(const h of hosts){if(h.heal>0)h.heal=Math.max(0,h.heal-dt);
 if(h.infect>0){h.infect+=dt*.08;state.tissue-=dt*.035;if(h.infect>=9){h.infect=0;h.heal=10;state.tissue-=.8;for(let i=0;i<2;i++)addParticle('virus',h.x,h.y,w.antigen);pop(h.x,h.y,'#c57991');}}}
 if(w.kind==='bacteria'&&state.chapterTime>5&&particles.length>0){state.replication=(state.replication||0)+dt;if(state.replication>8.8){state.replication=0;let b=particles[Math.floor(Math.random()*particles.length)];if(b&&particles.length<28)addParticle('bacteria',b.x,b.y,w.antigen);}}
 if(w.kind==='virus'&&state.chapterTime>8){state.replication=(state.replication||0)+dt;if(state.replication>9.8){state.replication=0;const inf=hosts.filter(h=>h.infect>0);if(inf.length){const h=inf[0];addParticle('virus',h.x,h.y,w.antigen);}}}
}
function stepSignals(dt){for(let i=signals.length-1;i>=0;i--){signals[i].age+=dt;if(signals[i].age>13)signals.splice(i,1)}for(let i=bursts.length-1;i>=0;i--){bursts[i].life+=dt;if(bursts[i].life>.65)bursts.splice(i,1)}}
function step(dt){state.clock+=dt;stepSignals(dt);
 if(state.phase==='intro'||state.phase==='between'){stepAgents(dt);if(state.phase==='between'){state.energy=Math.min(100,state.energy+dt*.65);state.inflam=Math.max(5,state.inflam-dt*.25);state.tissue=Math.min(99,state.tissue+dt*.12)}return;}
 if(state.phase!=='active')return;
 state.chapterTime+=dt;state.energy=Math.min(100,state.energy+dt*.62);state.activation=clamp(state.activation||0,0,100);
 stepAgents(dt);stepThreat(dt);
 const w=wave(),enemy=particles.length+debris.length,infected=hosts.filter(h=>h.infect>0).length;
 const danger=w.kind==='allergen'?0:enemy+infected*1.3;
 state.inflam=clamp(state.inflam+dt*(danger*.065-(w.kind==='allergen'?.24:.25)),0,100);
 if(w.kind==='allergen'&&state.chapterTime>5&&state.inflam<35)state.tissue=Math.min(100,state.tissue+dt*.05);
 else state.tissue-=dt*(w.kind==='debris'? .025:danger*.035)+(state.inflam>48?dt*(state.inflam-48)*.019:0);
 if(w.antigen&&state.presentation>8){state.activation=clamp(state.activation+dt*(1.1+state.presentation*.045),0,100)}
 if(w.antigen&&state.memories[w.antigen]>18){state.activation=clamp(state.activation+dt*.4,0,100)}
 if(w.antigen&&state.activation>30){const b=agents.filter(a=>a.type==='bcell').length;if(b>0)state.antibody=clamp(state.antibody+dt*(b*.12+state.activation*.003),0,25);
 if(w.kind==='virus'&&!agents.some(a=>a.type==='tcell')&&state.chapterTime>12)addAgent('tcell');
 if(w.kind==='bacteria'&&!agents.some(a=>a.type==='bcell')&&state.chapterTime>15)addAgent('bcell');
 }
 if(w.kind==='virus'&&state.chapterTime>3&&agents.filter(a=>a.type==='nk').length<2){addAgent('nk');}
 if(w.kind==='bacteria'&&state.chapterTime>5&&agents.filter(a=>a.type==='neutro').length<3)addAgent('neutro');
 if(state.chapterTime>8&&state.chapterTime<9){addSignal(w.x,w.y,20,'alarm');}
 if(state.chapterTime>13&&state.chapterTime<13.08&&w.antigen){event('Antijen sunumu başladı.');}
 state.peak=Math.max(state.peak,state.inflam);state.tissue=clamp(state.tissue,0,100);
 if(state.tissue<5||state.inflam>98){event('Doku dengesi kaybedildi.');complete(false);return;}
 if(w.kind==='allergen'&&state.chapterTime>21&&enemy===0){finishChapter();return}
 if(w.kind==='debris'&&enemy===0&&state.chapterTime>3){finishChapter();return}
 if(['bacteria','virus'].includes(w.kind)&&enemy===0&&infected===0&&state.chapterTime>5){finishChapter();return}
 if(state.chapterTime>160){if(enemy+infected<6)finishChapter();else if(state.chapterTime>205){event('Yanıt uzadı; doku yoruldu.');complete(false)}}
}
function paint(t){ctx.save();ctx.clearRect(0,0,W,H);const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#eaf2e8');g.addColorStop(1,'#cfded6');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 // Fluid extracellular matrix
 ctx.strokeStyle='#ffffff4d';ctx.lineWidth=1.2;for(let n=0;n<24;n++){let y=n*29-60;ctx.beginPath();ctx.moveTo(-20,y);ctx.bezierCurveTo(250,y+50,560,y-41,920,y+15);ctx.stroke();}
 // Vessel and flowing blood elements
 ctx.beginPath();ctx.moveTo(35,-10);ctx.bezierCurveTo(115,95,78,195,90,288);ctx.bezierCurveTo(110,400,50,455,72,555);ctx.lineWidth=48;ctx.strokeStyle='#c3b9a7ad';ctx.stroke();ctx.lineWidth=33;ctx.strokeStyle='#e7afaaad';ctx.stroke();
 for(let i=0;i<13;i++){let y=((i*57+t*.012)%590)-35,x=82+Math.sin(y*.022)*12;ctx.beginPath();ctx.ellipse(x,y,10,6,.2,0,TWO);ctx.fillStyle='#cc8883a8';ctx.fill();}
 // Host cells
 for(const h of hosts){ctx.save();ctx.translate(h.x,h.y);let sick=h.infect>0;
 ctx.beginPath();ctx.ellipse(0,0,47,32,Math.sin(h.id)*.3,0,TWO);ctx.fillStyle=sick?'#e1c3cb9f':'#f5faef8f';ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle=sick?'#ca8798a8':'#bbd2c1ba';ctx.stroke();ctx.beginPath();ctx.ellipse(0,0,13,9,.2,0,TWO);ctx.fillStyle=sick?'#b86e82a8':'#b3c9b5a4';ctx.fill();
 if(sick){ctx.strokeStyle='#bd677280';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,25+Math.sin(t*.003+h.id)*3,0,TWO);ctx.stroke();}
 if(h.heal>0){ctx.strokeStyle='#7aab95';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,35,0,TWO);ctx.stroke();}ctx.restore();}
 // Tissue breach
 if(state.phase==='active'&&['scrape','repair'].includes(wave().id)){const a=wave();ctx.beginPath();ctx.ellipse(a.x,a.y,84,38,.1,0,TWO);ctx.fillStyle='#c4867b27';ctx.fill();ctx.setLineDash([4,8]);ctx.strokeStyle='#bc8577';ctx.lineWidth=3;ctx.stroke();ctx.setLineDash([]);}
 // Signaling gradients
 for(const q of signals){const alpha=Math.max(0,1-q.age/13);ctx.strokeStyle=q.kind==='calm'?'rgba(120,166,155,'+(alpha*.33)+')':'rgba(210,122,111,'+(alpha*.37)+')';
 for(let k=0;k<3;k++){ctx.beginPath();ctx.arc(q.x,q.y,18+(q.age*7+k*20),0,TWO);ctx.lineWidth=1.5;ctx.stroke();}}
 for(const a of debris){ctx.save();ctx.translate(a.x,a.y);ctx.rotate(a.id);ctx.fillStyle='#b89a82';ctx.beginPath();ctx.moveTo(-10,-6);ctx.lineTo(6,-10);ctx.lineTo(13,5);ctx.lineTo(-3,11);ctx.closePath();ctx.fill();ctx.restore();}
 for(const p of particles)paintParticle(p);
 for(const a of agents)paintAgent(a,t);
 for(const b of bursts){ctx.beginPath();ctx.arc(b.x,b.y,b.life*44+5,0,TWO);ctx.lineWidth=3;ctx.strokeStyle=b.color;ctx.globalAlpha=1-b.life/.65;ctx.stroke();ctx.globalAlpha=1;}
 // Selected action focus
 if(state.phase==='active'||state.phase==='between'){ctx.beginPath();ctx.arc(state.focus.x,state.focus.y,48+Math.sin(t*.0017)*3,0,TWO);ctx.setLineDash([4,8]);ctx.lineWidth=2;ctx.strokeStyle='#447968ad';ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(state.focus.x-9,state.focus.y);ctx.lineTo(state.focus.x+9,state.focus.y);ctx.moveTo(state.focus.x,state.focus.y-9);ctx.lineTo(state.focus.x,state.focus.y+9);ctx.strokeStyle='#527f6e90';ctx.stroke();}
 ctx.restore();}
function paintParticle(p){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);
 if(p.type==='virus'){ctx.strokeStyle='#a95f75';ctx.fillStyle='#c88b9e';ctx.lineWidth=2;for(let j=0;j<9;j++){const a=j*TWO/9;ctx.beginPath();ctx.moveTo(Math.cos(a)*8,Math.sin(a)*8);ctx.lineTo(Math.cos(a)*14,Math.sin(a)*14);ctx.stroke();ctx.beginPath();ctx.arc(Math.cos(a)*15,Math.sin(a)*15,2,0,TWO);ctx.fill()}ctx.beginPath();ctx.arc(0,0,8,0,TWO);ctx.fill();}
 else if(p.type==='bacteria'){ctx.beginPath();ctx.ellipse(0,0,13,7,.5,0,TWO);ctx.fillStyle='#c59d75';ctx.fill();ctx.strokeStyle='#987047';ctx.lineWidth=2;ctx.stroke();}
 else {ctx.strokeStyle='#bca28b';ctx.fillStyle='#d6b6a1';ctx.beginPath();ctx.arc(0,0,5,0,TWO);ctx.fill();ctx.stroke();}
 ctx.restore();}
function paintAgent(a,t){const d=types[a.type],r=d.r,jig=animReduce?0:Math.sin(t*.0025+a.id)*1.6;ctx.save();ctx.translate(a.x,a.y);ctx.rotate(a.angle*.11);
 ctx.shadowBlur=9;ctx.shadowColor='#42695a23';ctx.beginPath();for(let i=0;i<=24;i++){const theta=i*TWO/24,rad=r+Math.sin(theta*5+t*.0008+a.id)*1.7+jig*.35;let x=rad*Math.cos(theta),y=rad*Math.sin(theta);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.closePath();ctx.fillStyle=d.color;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=d.nuc;ctx.stroke();ctx.shadowBlur=0;
 ctx.fillStyle=d.nuc;if(a.type==='neutro'){for(let j=0;j<3;j++){let a2=j*TWO/3;ctx.beginPath();ctx.ellipse(Math.cos(a2)*5,Math.sin(a2)*5,5,4,j,0,TWO);ctx.fill();}}
 else if(a.type==='dend'){for(let j=0;j<6;j++){let a2=j*TWO/6;ctx.beginPath();ctx.moveTo(Math.cos(a2)*r*.8,Math.sin(a2)*r*.8);ctx.lineTo(Math.cos(a2)*(r+7),Math.sin(a2)*(r+7));ctx.lineWidth=2;ctx.stroke()}ctx.beginPath();ctx.arc(0,0,6,0,TWO);ctx.fill();}
 else if(a.type==='fibro'){ctx.beginPath();ctx.ellipse(0,0,12,5,.45,0,TWO);ctx.fill();}
 else{ctx.beginPath();ctx.ellipse(0,0,r*.47,r*.39,.4,0,TWO);ctx.fill();}
 if(a.hit>0){ctx.beginPath();ctx.arc(0,0,r+6,0,TWO);ctx.lineWidth=2;ctx.strokeStyle='#fbfff4';ctx.stroke();}
 ctx.restore();}
let inspectSnapshot='';
function inspect(ev){const rect=C.getBoundingClientRect();const x=(ev.clientX-rect.left)/rect.width*W,y=(ev.clientY-rect.top)/rect.height*H;
 let found=null,best=35;for(const a of agents){const d=Math.hypot(x-a.x,y-a.y);if(d<best){found=a;best=d;}}
 if(found){const d=types[found.type];$('selection').textContent=d.label+(found.hit>0?' / aktif yanıt':' / devriyede');$('detail').innerHTML='<strong>'+d.label+'</strong><p style="margin:5px 0 0">'+d.info+'</p><span class="detail-kind">'+d.group.toUpperCase()+' · 1 CANLI HÜCRE</span>';if($('cell-legend'))$('cell-legend').textContent=d.label+' · '+d.group;}
 else{state.focus={x:clamp(x,45,W-45),y:clamp(y,45,H-45)};$('selection').textContent='Odak seçildi: müdahaleler bu bölgede uygulanacak.';notice('Müdahale odağı değişti.');updateUi(true);}}
let reportShown=false;
function loop(t){if(!frameTime)frameTime=t;const dt=Math.min(.04,(t-frameTime)/1000);frameTime=t;const run=state.phase!=='paused'&&state.phase!=='finished'&&document.visibilityState==='visible';
 if(run){let remain=dt*state.speed;while(remain>0){const d=Math.min(remain,.04);step(d);remain-=d;}}
 paint(t);
 if(t-uiTime>260){uiTime=t;updateUi(false)}
 if(t-saveTime>4500&&state.phase!=='intro'&&state.phase!=='finished'){saveTime=t;save()}
 requestAnimationFrame(loop);}
function init(){
 if($('campaign-progress'))$('campaign-progress').hidden=false;
 $('start').onclick=start;$('next').onclick=beginChapter;$('reset').onclick=restart;C.addEventListener('click',inspect);
 document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>skill(b.dataset.action)));
 $('speed').onclick=()=>{state.speed=state.speed===1?2:state.speed===2?3:1;updateUi(true);save()};
 $('pause').onclick=()=>{if(state.phase==='active'||state.phase==='between'){state.returnPhase=state.phase;state.phase='paused';event('Duraklatıldı.');}
 else if(state.phase==='paused'){state.phase=state.returnPhase||'between';event('Devam ediyor.');}
 updateUi(true);save()};
 document.addEventListener('keydown',e=>{if(e.code==='Space'&&(e.target===document.body||e.target===C)){e.preventDefault();$('pause').click();}});
 document.addEventListener('visibilitychange',save);window.addEventListener('pagehide',save);
 if(state.phase!=='intro')$('overlay').hidden=true;
 if(state.phase==='paused')notice('Kaldığın yer yüklendi. DEVAM ET ile sürdür.');
 updateUi(true);requestAnimationFrame(loop);
}
init();
})();