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
const DEFAULT=()=>({version:2,phase:'intro',returnPhase:'between',chapter:0,clock:0,chapterTime:0,tissue:94,energy:82,inflam:7,memory:0,signals:0,presentation:0,antibody:0,points:9,score:0,kills:0,peak:7,focus:{x:450,y:260},logs:[],history:[],levels:{macro:1,neutro:0,dend:0,nk:0,tcell:0,bcell:0,treg:0,fibro:0},memories:{'bakteri-A':0,'virus-V':0},actionReady:{},unlocks:{},streak:0,completed:false,eventsMade:0,speed:1,mode:'campaign',dynamicWave:null});
let raw=null;try{raw=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
let state=DEFAULT(), agents=[],particles=[],hosts=[],bursts=[],signals=[],debris=[],flares=[],selected=null,frameTime=0,saveTime=0,uiTime=0,renderTs=0,maxId=0;
const animReduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(raw&&raw.state&&raw.state.version===2&&!raw.state.completed){
 state=Object.assign(DEFAULT(),raw.state);state.levels=Object.assign(DEFAULT().levels,raw.state.levels||{});state.memories=Object.assign(DEFAULT().memories,raw.state.memories||{});state.actionReady=raw.state.actionReady||{};
 state.logs=(raw.state.logs||[]).slice(0,25);state.history=(raw.state.history||[]).slice(0,12);
 agents=Array.isArray(raw.agents)?raw.agents.filter(a=>types[a.type]&&Number.isFinite(a.x)&&Number.isFinite(a.y)).slice(0,140):[];agents.forEach(a=>{if(a.permanent===undefined)a.permanent=['macro','dend','fibro','treg'].includes(a.type)});
 particles=Array.isArray(raw.particles)?raw.particles.filter(b=>Number.isFinite(b.x)&&Number.isFinite(b.y)).slice(0,100):[];
 hosts=Array.isArray(raw.hosts)?raw.hosts.filter(h=>Number.isFinite(h.x)).slice(0,40):[];
 debris=Array.isArray(raw.debris)?raw.debris.filter(h=>Number.isFinite(h.x)).slice(0,60):[];
 signals=Array.isArray(raw.signals)?raw.signals.slice(0,50):[];
 maxId=Math.max(0,...agents.map(a=>a.id||0),...particles.map(a=>a.id||0));
 if(state.phase==='active'){state.phase='paused';state.returnPhase='active';}
}
function makeProceduralWave(level){
 const k=['bacteria','virus','debris','allergen'][((level*7+Math.floor(level/3))%4)];
 const example=campaign.find(e=>e.kind===k)||campaign[0];
 const titles={bacteria:'Bariyer yeniden zorlanıyor',virus:'Yeni viral temas',debris:'Doku onarım nöbeti',allergen:'Gereksiz alarm ihtimali'};
 const antigens={bacteria:level%3===0?'bakteri-A':'bakteri-B',virus:level%4===0?'virus-V':'virus-X'};
 return {id:'sandbox-'+level,title:titles[k],desc:example.desc,kind:k,antigen:antigens[k]||null,count:Math.min(26,12+Math.floor(level*.75)),x:290+(level*139)%330,y:160+(level*91)%180,base:95,goal:example.goal,fact:example.fact};
}
const wave=()=>state.mode==='sandbox'&&state.chapter>=campaign.length?(state.dynamicWave||makeProceduralWave(state.chapter)):campaign[Math.min(state.chapter,campaign.length-1)];
function addAgent(type,x,y){if(!types[type]||agents.length>=100)return null;const fromVessel=type==='neutro'||type==='nk'||type==='tcell'||type==='bcell',a={id:++maxId,type,x:x??(fromVessel?rnd(38,115):rnd(90,810)),y:y??rnd(75,445),vx:rnd(-1,1),vy:rnd(-1,1),angle:rnd(0,TWO),age:0,hit:0,permanent:false,life:type==='neutro'?rnd(58,90):2000};agents.push(a);return a;}
function addParticle(type,x,y,antigen){if(particles.length>=80)return;particles.push({id:++maxId,type,x:clamp((x??450)+rnd(-60,60),25,W-25),y:clamp((y??260)+rnd(-50,50),22,H-22),hp:type==='allergen'?1:type==='debris'?1:6,age:0,angle:rnd(0,TWO),antigen:antigen||wave().antigen});}
function addSignal(x,y,power,kind){signals.push({x,y,power,age:0,kind:kind||'alarm'});if(signals.length>28)signals.shift();}
function pop(x,y,color){bursts.push({x,y,r:0,life:0,color:color||'#8fb99f'});if(bursts.length>45)bursts.shift();}
function event(msg){state.logs.unshift({time:Math.round(state.clock),text:msg});state.logs=state.logs.slice(0,25);state.eventsMade++;drawLogs();}
function save(){try{localStorage.setItem(KEY,JSON.stringify({state,agents,particles,hosts,debris,signals}));$('saved').textContent='KAYDEDİLDİ ✓'}catch(e){$('saved').textContent='KAYIT YOK'}}
function resetWorld(){agents=[];particles=[];hosts=[];debris=[];signals=[];bursts=[];flares=[];for(let i=0;i<5;i++)addAgent('macro').permanent=true;addAgent('dend').permanent=true;addAgent('fibro').permanent=true;addAgent('treg').permanent=true;for(let k=0;k<22;k++){let x=80+(k%6)*148+rnd(-22,22),y=95+Math.floor(k/6)*109+rnd(-21,21);hosts.push({id:++maxId,x,y,infect:0,dead:false,heal:0});}}
if(!hosts.length||!agents.length)resetWorld();
function start(){if(state.phase!=='intro')return;state.phase='between';$('overlay').hidden=true;event('Doku devriyesi başladı.');updateUi(true);save();}
function beginChapter(){if(state.phase!=='between'||(state.chapter>=campaign.length&&state.mode!=='sandbox'))return;const w=wave();state.phase='active';state.chapterTime=0;state.presentation=0;state.antibody=0;state.signals=0;state.replication=0;
 const memo=state.memories[w.antigen]||0;state.activation=(w.antigen&&memo>0)?Math.min(55,memo):0;state.focus={x:w.x,y:w.y};particles=[];debris=[];signals=[];
 if(w.kind==='debris'){for(let i=0;i<w.count;i++)debris.push({id:++maxId,x:w.x+rnd(-115,115),y:w.y+rnd(-80,80),hp:3});}
 else for(let i=0;i<w.count;i++)addParticle(w.kind,w.x,w.y,w.antigen);
 if(w.kind==='virus'){for(let j=0;j<2;j++){const h=hosts.slice().sort((a,b)=>Math.hypot(a.x-w.x,a.y-w.y)-Math.hypot(b.x-w.x,b.y-w.y))[j];if(h){h.infect=3;}}}
 if(w.kind==='bacteria'||w.kind==='virus')addSignal(w.x,w.y,20,'alarm');
 if(w.kind==='debris')state.inflam=clamp(state.inflam+9,0,100);
 else if(w.kind==='allergen')state.inflam=clamp(state.inflam+5,0,100);
 else state.inflam=clamp(state.inflam+12,0,100);
 event('OLAY '+(state.chapter+1)+': '+w.title);updateUi(true);save();}
function finishChapter(){if(state.phase!=='active')return;const w=wave();state.phase='between';const gained=Math.max(5,Math.round(4+state.tissue/13+Math.max(0,45-state.inflam)/20));state.points+=gained;state.score+=Math.round(state.tissue)+gained*2;
 if(w.antigen){let gain=clamp(Math.round(16+state.activation*.22+state.presentation*.12),12,35);state.memories[w.antigen]=clamp((state.memories[w.antigen]||0)+gain,0,100);}
 const m=Object.values(state.memories);state.memory=Math.round(m.reduce((a,b)=>a+b,0)/m.length);
 state.history.push({title:w.title,tissue:Math.round(state.tissue),inflam:Math.round(state.inflam),memo:state.memory});state.history=state.history.slice(-40);agents=agents.filter(a=>a.permanent);
 state.chapter++;state.inflam=Math.max(5,state.inflam-10);state.energy=Math.min(100,state.energy+24);
 event('Doku dengelendi. +'+gained+' araştırma puanı.');
 if(state.chapter>=campaign.length){if(state.mode==='sandbox'){state.dynamicWave=makeProceduralWave(state.chapter);state.points+=3;event('Yeni doku olayı ortaya çıktı. +3 araştırma.');}else{complete(true);return;}}updateUi(true);save();}
function complete(success){state.phase='finished';state.completed=true;save();
 const good=success&&state.tissue>=75&&state.peak<65;
 const title=!success?'Doku savunmasız kaldı.':good?'Soğukkanlı koruyucu':state.peak>70?'Fazla hevesli savunma':'Pahalı bir zafer';
 const sub=!success?'Doku zarar gördü. Farklı hücrelere ve onarıma yatırım yaparak yeniden dene.':good?'Savunmayı doku onarımıyla dengede tuttun.':'Sistem ayakta. Ama bu savunmanın bir bedeli oldu.';
 const memory=state.memory;
 const markup='<div class="result"><span class="mono">İÇERİDEKİLER / VÜCUT RAPORU</span><h2>'+title+'</h2><p>'+sub+'</p><div class="result-stats"><span>DOKU<b>'+Math.round(state.tissue)+'</b></span><span>HAFIZA<b>'+memory+'</b></span><span>İNFLAMASYON ZİRVESİ<b>'+Math.round(state.peak)+'</b></span></div><div class="report-meta">'+state.chapter+' olay · '+state.kills+' temizlenen patojen · '+Math.round(state.score)+' puan</div><div class="result-actions"><button class="solid" id="result-share">PAYLAŞ</button><button class="ghost" id="result-image">KARTI İNDİR</button><button class="ghost" id="result-again">YENİDEN</button></div>'+(success&&state.mode!=='sandbox'?'<button class="solid wide" style="margin-top:10px" id="result-endless">SERBEST YAŞAMA DEVAM ET →</button>':'')+'<div class="share-row"><a id="share-x" target="_blank" rel="noopener noreferrer">X</a><a id="share-wa" target="_blank" rel="noopener noreferrer">WhatsApp</a><button id="copy-result">Bağlantıyı kopyala</button></div></div>';
 $('overlay-content').innerHTML=markup;$('overlay').hidden=false;
 const msg='İçeridekiler: '+title+' | Doku '+Math.round(state.tissue)+' | Hafıza '+memory+' | '+state.chapter+' olay. https://aynen.fun/iceridekiler.html';
 $('share-x').href='https://twitter.com/intent/tweet?text='+encodeURIComponent(msg);
 $('share-wa').href='https://wa.me/?text='+encodeURIComponent(msg);
 $('copy-result').onclick=()=>copyText(msg);
 $('result-share').onclick=()=>{if(navigator.share)navigator.share({title:'İçeridekiler',text:msg,url:'https://aynen.fun/iceridekiler.html'}).catch(()=>{});else copyText(msg)};
 $('result-image').onclick=()=>downloadCard(title);
 $('result-again').onclick=restart;if($('result-endless'))$('result-endless').onclick=beginEndless;
 updateUi(true);}
function copyText(t){if(navigator.clipboard){navigator.clipboard.writeText(t).then(()=>notice('Bağlantı kopyalandı.')).catch(()=>notice('Kopyalanamadı.'))}else notice(t);}
function downloadCard(title){const c=document.createElement('canvas');c.width=1080;c.height=1080;const z=c.getContext('2d');z.fillStyle='#f2f4ee';z.fillRect(0,0,1080,1080);z.fillStyle='#b2d2bf';z.beginPath();z.arc(785,340,245,0,TWO);z.fill();z.fillStyle='#638e79';z.beginPath();z.ellipse(780,340,105,83,.3,0,TWO);z.fill();z.fillStyle='#202824';z.font='bold 31px Arial';z.fillText('aynen.fun  /  içeridekiler',80,98);z.font='bold 73px Arial';z.fillText(title.slice(0,22),80,705);z.font='29px Arial';z.fillText('DOKU   '+Math.round(state.tissue)+'     HAFIZA   '+state.memory+'     OLAY   '+state.chapter,80,782);z.strokeStyle='#33483e';z.lineWidth=3;z.beginPath();z.moveTo(80,817);z.lineTo(1000,817);z.stroke();z.font='26px Arial';z.fillText('Mikropları durdur. Dokuyu koru.',80,881);const a=document.createElement('a');a.download='iceridekiler-sonuc.png';a.href=c.toDataURL('image/png');a.click();}
function beginEndless(){state.completed=false;state.mode='sandbox';state.phase='between';state.dynamicWave=makeProceduralWave(state.chapter);$('overlay').hidden=true;event('Serbest yaşam başladı. Her olay farklı bir denge gerektirir.');updateUi(true);save();}
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
 state.points-=cost;state.levels[type]=count+1;const unit=addAgent(type);if(unit)unit.permanent=true;event(u[1]+' laboratuvarı geliştirildi.');updateUi(true);save();}
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
let historySnapshot='';
function renderHistory(){const el=$('history');if(!el)return;const data=state.history.slice(-10),key=JSON.stringify(data);if(historySnapshot===key)return;historySnapshot=key;
 if(!data.length){el.innerHTML='<span class="muted">İlk olayın ardından doku geçmişi burada oluşacak.</span>';return;}
 let pts=data.map((v,i)=>({x:12+i*(256/Math.max(1,data.length-1)),y:100-v.tissue*.84}));
 let path=pts.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
 let svg='<svg viewBox="0 0 280 118" aria-label="Doku sağlığının olaylara göre seyri" role="img"><line x1="8" y1="18" x2="272" y2="18" stroke="#dbe5db"/><line x1="8" y1="100" x2="272" y2="100" stroke="#dbe5db"/><text x="8" y="14" font-size="9" fill="#819487">100</text><text x="8" y="114" font-size="9" fill="#819487">0</text><path d="'+path+'" fill="none" stroke="#598c74" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
 pts.forEach(p=>svg+='<circle cx="'+p.x+'" cy="'+p.y+'" r="4" fill="#8abfa4" stroke="#598c74" stroke-width="1"/>');svg+='</svg>';
 el.innerHTML=svg+'<p class="history-last">'+data[data.length-1].title+' · doku '+data[data.length-1].tissue+'/100</p>';
}
function updateUi(force){const w=wave();['tissue','energy','inflam','memory'].forEach(n=>{$(n+'-n').textContent=Math.round(state[n]);$(n+'-bar').style.width=clamp(state[n],0,100)+'%'});
 $('points').textContent=state.points+' ARAŞTIRMA';$('chapter').textContent=state.mode==='sandbox'?'SERBEST YAŞAM · '+(state.chapter-5)+'. OLAY':'OLAY '+String(Math.min(state.chapter+1,campaign.length)).padStart(2,'0')+' / '+campaign.length.toString().padStart(2,'0');
 $('episode-title').textContent=state.chapter>=campaign.length&&state.mode!=='sandbox'?'Doku raporu hazır.':w.title;
 $('episode-desc').textContent=state.chapter>=campaign.length&&state.mode!=='sandbox'?'Tüm senaryolar tamamlandı.':w.desc;
 $('next').disabled=state.phase!=='between';$('next').textContent=state.chapter===0?'İLK OLAYI BAŞLAT →':'SONRAKİ OLAY →';
 $('scene-label').textContent=state.phase==='active'?'BAĞIŞIKLIK / AKTİF YANIT':state.phase==='paused'?'SİSTEM / DURAKLATILDI':'DOKU / GÖZETİM';
 $('pulse').className='pulse'+(state.phase==='active'?' danger':'');
 $('population').textContent=agents.length+' HÜCRE / '+(particles.length+debris.length)+' PARÇACIK';
 $('clock').textContent=String(Math.floor(state.clock/60)).padStart(2,'0')+':'+String(Math.floor(state.clock%60)).padStart(2,'0')+' / '+Math.min(state.chapter+1,campaign.length)+'. OLAY';
 $('pause').textContent=state.phase==='paused'?'▶':'Ⅱ';$('speed').textContent=state.speed+'×';$('pause').title=state.phase==='paused'?'Devam et':'Duraklat';
 $('science').textContent=w.fact;
 if($('episode-progress')){$('episode-progress').style.width=clamp(state.chapter/campaign.length*100,0,100)+'%';$('episode-progress-label').textContent=state.mode==='sandbox'?'SÜREKLİ GELİŞİM':state.chapter+' / '+campaign.length+' tamamlandı';}
 if($('focus-info'))$('focus-info').textContent='ODAK: '+(Math.round(state.focus.x/W*100))+'% / '+(Math.round(state.focus.y/H*100))+'%';
 if($('immune-readout')){$('immune-readout').textContent=wave().antigen===null?'Antijen sunumu bu olayda belirleyici değil.':'ANTİJEN SUNUMU '+Math.round(state.presentation)+'% · YANIT '+Math.round(state.activation||0)+'%';}
 if($('goal'))$('goal').textContent=w.goal;
 document.querySelectorAll('[data-action]').forEach(btn=>{const act=btn.dataset.action,remaining=Math.ceil((state.actionReady[act]||0)-state.clock);
 btn.disabled=state.phase!=='active'||state.energy<costs[act]||remaining>0||(act==='target'&&!w.antigen);
 const small=btn.querySelector('small');if(small)small.textContent=remaining>0?remaining+' sn bekle':'−'+costs[act]+' enerji';});
 renderUpgrades();drawLogs();renderHistory();}
function pickTarget(a){const kind=wave().kind;let pick=null,best=Infinity;
 if(a.type==='fibro'||a.type==='treg'||a.type==='bcell'){return null;}
 if((a.type==='nk'||a.type==='tcell')&&kind==='virus'){for(const h of hosts){if(h.infect<=0||h.dead)continue;const d=distance(a,h);if(d<best){best=d;pick={obj:h,kind:'host',range:40}}}return pick;}
 if(kind==='bacteria'&&['macro','neutro','dend'].includes(a.type)){for(const b of particles){if(b.type!=='bacteria')continue;const d=distance(a,b);if(d<best){best=d;pick={obj:b,kind:'bug',range:39}}}}
 if((kind==='debris'||kind==='virus')&&['macro','neutro','dend'].includes(a.type)){for(const b of debris){const d=distance(a,b);if(d<best){best=d;pick={obj:b,kind:'debris',range:39}}}}
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
  if(target.kind==='host'){target.obj.infect-=types[type].dps*dt*(type==='tcell'?1+.25*state.activation/100:1);a.hit=.3;state.inflam+=dt*.13;if(target.obj.infect<=0){target.obj.infect=0;target.obj.dead=true;target.obj.heal=11;state.tissue-=.38;if(debris.length<55)debris.push({id:++maxId,x:target.obj.x,y:target.obj.y,hp:1.5});pop(target.obj.x,target.obj.y,'#9fc4d2')}}
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
 for(const h of hosts){if(h.dead){const nearFibro=agents.some(a=>a.type==='fibro'&&distance(a,h)<90);h.heal=Math.max(0,h.heal-dt*(nearFibro?1.7:1));if(h.heal<=0){h.dead=false;h.heal=0;}continue;}
 if(h.infect>0){h.infect+=dt*.08;state.tissue-=dt*.035;if(h.infect>=9){h.infect=0;h.dead=true;h.heal=12;state.tissue-=.8;if(debris.length<55)debris.push({id:++maxId,x:h.x,y:h.y,hp:1.5});for(let i=0;i<2;i++)addParticle('virus',h.x,h.y,w.antigen);pop(h.x,h.y,'#c57991');}}}
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

/* Chromatic jelly-organism illustration system, inspired by the supplied warm
   glow-on-black references. Shapes are drawn from code, not from source images. */
const ART={
 macro:{light:'#f3d58c',edge:'#ae7544',shade:'#694137',glow:'rgba(231,171,89,.36)',person:'guardian'},
 neutro:{light:'#ffcb93',edge:'#c37d55',shade:'#673f3f',glow:'rgba(246,166,105,.35)',person:'walker'},
 dend:{light:'#f5d0aa',edge:'#b97d55',shade:'#6a4750',glow:'rgba(246,175,125,.28)',person:'antenna'},
 nk:{light:'#ebd6b9',edge:'#c19d8c',shade:'#73505b',glow:'rgba(248,191,160,.3)',person:'horns'},
 tcell:{light:'#c6d6f9',edge:'#8c9dcc',shade:'#51567a',glow:'rgba(124,168,246,.32)',person:'bead'},
 bcell:{light:'#f5d9a1',edge:'#b99365',shade:'#765345',glow:'rgba(255,195,96,.31)',person:'round'},
 treg:{light:'#e4c9cd',edge:'#b27f9b',shade:'#63475d',glow:'rgba(222,140,187,.28)',person:'round'},
 fibro:{light:'#e2cbab',edge:'#9d8c84',shade:'#52434d',glow:'rgba(211,179,156,.3)',person:'branch'}
};
const VIEW={w:900,h:525,sx:1,sy:1,scale:1};
function resizeScene(){
 const r=C.getBoundingClientRect();
 const dpr=Math.min(window.devicePixelRatio||1,1.75);
 const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
 if(C.width!==w||C.height!==h){C.width=w;C.height=h;}
 VIEW.w=w;VIEW.h=h;VIEW.sx=w/W;VIEW.sy=h/H;
 VIEW.scale=Math.max(.8,Math.min(2.25,Math.min(VIEW.sx,VIEW.sy)*1.45));
}
function drawDust(t){
 let c=ctx,w=VIEW.w,h=VIEW.h;
 for(let i=0;i<110;i++){
  let x=((i*173.83+37)%900)/900*w;
  let y=((i*117.41+63)%525)/525*h;
  let f=(Math.sin(t*.00051+i*1.71)+1)*.5;
  c.globalAlpha=.08+.2*f;
  c.fillStyle=i%9===0?'#efb9a7':'#e2d8c7';
  c.fillRect(x+Math.sin(t*.00031+i)*2,y+Math.cos(t*.00028+i)*2,(i%11===0?1.7:.8)*VIEW.scale,(i%11===0?1.7:.8)*VIEW.scale);
 }
 c.globalAlpha=1;
}
function halo(x,y,r,color,power=1){
 const c=ctx;
 const g=c.createRadialGradient(x,y,0,x,y,r);
 g.addColorStop(0,color.replace(/[\d.]+\)$/,'')+((.1*power).toFixed(3))+')');
 // The second, transparent gradient stop lets the glow fall off without hard edges.
 g.addColorStop(.45,'rgba(236,179,125,'+(.04*power)+')');
 g.addColorStop(1,'rgba(20,20,24,0)');
 c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TWO);c.fill();
}
function paint(t){
 const c=ctx;const w=VIEW.w,h=VIEW.h;c.setTransform(1,0,0,1,0,0);
 c.fillStyle='#020203';c.fillRect(0,0,w,h);
 let g=c.createRadialGradient(w*.51,h*.51,10,w*.51,h*.52,Math.max(w,h)*.72);
 g.addColorStop(0,'#151015');g.addColorStop(.32,'#0c0b10');g.addColorStop(.75,'#030304');g.addColorStop(1,'#000');
 c.fillStyle=g;c.fillRect(0,0,w,h);
 let a=c.createRadialGradient(w*.46,h*.65,0,w*.46,h*.65,Math.max(w,h)*.55);
 a.addColorStop(0,'rgba(97,46,47,.075)');a.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=a;c.fillRect(0,0,w,h);
 drawDust(t);
 // Very restrained extracellular fibers, mostly invisible unless an event is active.
 c.save();c.strokeStyle='rgba(196,174,167,.048)';c.lineWidth=1;
 for(let q=0;q<8;q++){let yy=(q+1)*h/9;
 c.beginPath();c.moveTo(0,yy);c.bezierCurveTo(w*.32,yy+h*.035*Math.sin(q+t*.0002),w*.64,yy-h*.04,w,yy+h*.014);c.stroke();}
 c.restore();
 // Chemical signals radiate through the black biological space.
 for(const sig of signals){
  const x=sig.x*VIEW.sx,y=sig.y*VIEW.sy,alpha=Math.max(0,1-sig.age/13);
  const hue=sig.kind==='calm'?'177,184,241':sig.kind==='repair'?'237,196,143':'255,150,126';
  for(let k=0;k<2;k++){
   c.strokeStyle='rgba('+hue+','+(alpha*.20)+')';c.lineWidth=1.1;
   c.beginPath();c.ellipse(x,y,(20+sig.age*8+k*32)*VIEW.scale,(20+sig.age*8+k*32)*VIEW.scale,0,0,TWO);c.stroke();
  }
 }
 // Host cells as translucent sleeping organisms in the distant layer.
 for(const cell of hosts){
  let x=cell.x*VIEW.sx,y=cell.y*VIEW.sy;
  const r=27*VIEW.scale;
  c.save();c.globalAlpha=cell.dead?.36:cell.infect>0?.67:.25;
  c.shadowBlur=cell.infect>0?24:12;c.shadowColor=cell.infect>0?'#ee7895':'#d6b996';
  let hg=c.createRadialGradient(x-r*.3,y-r*.4,1,x,y,r*1.5);
  hg.addColorStop(0,cell.infect>0?'#f1bdc7':'#e3d8bb');hg.addColorStop(.7,cell.infect>0?'#985b78':'#6c685a');hg.addColorStop(1,'rgba(35,26,24,0)');
  c.fillStyle=hg;c.beginPath();c.ellipse(x,y,r*1.5,r,Math.sin(cell.id)*.2,0,TWO);c.fill();c.restore();
  if(cell.infect>0)halo(x,y,r*2,'rgba(235,93,126,0.2)',1);
 }
 for(const d of debris){const x=d.x*VIEW.sx,y=d.y*VIEW.sy;c.save();c.translate(x,y);c.rotate(d.id);c.fillStyle='#ba8764bb';c.shadowColor='#dc8f68';c.shadowBlur=7;c.beginPath();c.ellipse(0,0,5*VIEW.scale,3*VIEW.scale,.5,0,TWO);c.fill();c.restore();}
 for(const p of particles)paintParticle(p,t);
 for(const u of agents)paintAgent(u,t);
 for(const fx of bursts){
  c.beginPath();c.arc(fx.x*VIEW.sx,fx.y*VIEW.sy,(4+fx.life*44)*VIEW.scale,0,TWO);
  c.strokeStyle='rgba(235,211,183,'+(Math.max(0,1-fx.life/.65)*.50)+')';c.lineWidth=1.5;c.stroke();
 }
 // Crosshair is intentionally tiny and soft, never a persistent huge white target.
 if(state.phase==='active'||state.phase==='between'){
  const x=state.focus.x*VIEW.sx,y=state.focus.y*VIEW.sy;
  c.save();c.strokeStyle='rgba(247,218,163,.47)';c.lineWidth=1;
  let s=6*VIEW.scale;c.beginPath();c.moveTo(x-s*2,y);c.lineTo(x-s,y);
  c.moveTo(x+s,y);c.lineTo(x+s*2,y);c.moveTo(x,y-s*2);c.lineTo(x,y-s);c.moveTo(x,y+s);c.lineTo(x,y+s*2);c.stroke();
  c.beginPath();c.arc(x,y,22*VIEW.scale,0,TWO);c.strokeStyle='rgba(238,194,154,.14)';c.stroke();c.restore();
 }
}
function paintParticle(p,t){
 let c=ctx,x=p.x*VIEW.sx,y=p.y*VIEW.sy,s=VIEW.scale;
 c.save();c.translate(x,y);c.scale(s,s);c.rotate(p.angle*.21);
 c.shadowColor=p.type==='virus'?'#ef809f':p.type==='bacteria'?'#d99665':'#c1a095';c.shadowBlur=13;
 if(p.type==='virus'){c.strokeStyle='#d989a0';c.lineWidth=1.6;for(let i=0;i<8;i++){let a=i*TWO/8;c.beginPath();c.moveTo(Math.cos(a)*5,Math.sin(a)*5);c.lineTo(Math.cos(a)*9,Math.sin(a)*9);c.stroke();c.beginPath();c.arc(Math.cos(a)*10,Math.sin(a)*10,1.4,0,TWO);c.fillStyle='#edb1bf';c.fill();}
 c.beginPath();c.arc(0,0,6.3,0,TWO);c.fillStyle='#ba6c8e';c.fill();}
 else if(p.type==='bacteria'){let gr=c.createLinearGradient(-10,-5,12,9);gr.addColorStop(0,'#f1c791');gr.addColorStop(1,'#995f49');c.fillStyle=gr;c.beginPath();c.ellipse(0,0,11,5.7,.4,0,TWO);c.fill();c.strokeStyle='#edc29999';c.stroke();}
 else{c.fillStyle='#bbafa4';c.beginPath();c.arc(0,0,4,0,TWO);c.fill();}
 c.restore();
}
function paintAgent(u,t){
 let c=ctx,info=ART[u.type],d=types[u.type];
 if(!info||!d)return;
 const x=u.x*VIEW.sx,y=u.y*VIEW.sy;
 const base=VIEW.scale*(u.type==='macro'?1.36:u.type==='dend'?1.03:u.type==='fibro'?1.08:1.12);
 let bob=(animReduce?0:Math.sin(t*.0017+u.id*1.6)*2.6);
 c.save();c.translate(x,y+bob*base);c.scale(base,base);
 c.rotate(Math.sin(t*.0005+u.id)*.065);
 // Soft jelly halo with subtle cyan/red aberration, like the second reference.
 c.shadowColor=info.glow;c.shadowBlur=24;
 const R=d.r*1.1;
 const headY=(u.type==='macro'?-3:0);
 // Character limbs and morphology silhouette.
 c.strokeStyle=info.edge;c.lineWidth=4.6;c.lineCap='round';
 if(info.person==='guardian'){ // small feet, stout watchman
   c.beginPath();c.moveTo(-R*.48,R*.60);c.lineTo(-R*.45,R*1.09);c.moveTo(R*.42,R*.6);c.lineTo(R*.44,R*1.08);c.stroke();
 }else if(info.person==='antenna'){ // dendritic spines
   for(let k=0;k<4;k++){let a=-Math.PI*.88+k*.62;c.beginPath();c.moveTo(Math.cos(a)*R*.75,Math.sin(a)*R*.73);c.lineTo(Math.cos(a)*R*1.35,Math.sin(a)*R*1.35);c.stroke();}
 }else if(info.person==='horns'){ // branch-shaped arms from reference
   for(let side of [-1,1]){c.beginPath();c.moveTo(side*R*.55,3);c.quadraticCurveTo(side*R*1.55,-4,side*R*1.26,-R*.58);c.stroke();c.beginPath();c.moveTo(side*R*1.27,-R*.55);c.lineTo(side*R*1.55,-R*.8);c.stroke();}
 }else if(info.person==='walker'){for(let side of [-1,1]){c.beginPath();c.moveTo(side*R*.35,R*.65);c.lineTo(side*R*.38,R*1.05);c.stroke();}}
 else if(info.person==='branch'){for(let side of [-1,1]){c.beginPath();c.moveTo(side*R*.63,R*.10);c.lineTo(side*R*1.32,-R*.4);c.stroke();}}
 // jelly body; tiny organic asymmetry
 const grad=c.createRadialGradient(-R*.35,-R*.52,R*.05,R*.12,R*.35,R*1.42);
 grad.addColorStop(0,'#fff8dccc');grad.addColorStop(.19,info.light);
 grad.addColorStop(.60,info.edge);grad.addColorStop(1,info.shade);
 c.beginPath();
 const N=30;
 for(let k=0;k<=N;k++){
  let a=k*TWO/N;let mod=1+.05*Math.sin(a*3+u.angle)+.035*Math.cos(a*5+t*.001+u.id);
  let rx=R*mod,ry=R*mod;
  if(info.person==='guardian'){rx*=1.12;ry*=1.24;}
  if(info.person==='round')rx*=1.1;
  if(info.person==='branch')ry*=.76;
  let px=Math.cos(a)*rx,py=Math.sin(a)*ry;
  if(k===0)c.moveTo(px,py);else c.lineTo(px,py);
 }
 c.closePath();c.fillStyle=grad;c.fill();
 c.shadowBlur=0;
 c.save();c.globalCompositeOperation='screen';c.lineWidth=.85;c.strokeStyle='rgba(103,166,249,.18)';c.translate(-1.35,0);c.stroke();c.translate(2.5,0);c.strokeStyle='rgba(253,102,116,.14)';c.stroke();c.restore();
 // Internal translucency, softly glowing organelle
 c.globalAlpha=.23;c.fillStyle='#ffd5c8';c.beginPath();c.ellipse(R*.15,R*.32,R*.5,R*.42,.13,0,TWO);c.fill();c.globalAlpha=1;
 // Eyelike details give each cell a charming character without turning it into an animal.
 c.fillStyle='#3f3330';const eyeR=u.type==='macro'?1.35:1.15;
 let eyeY=-R*.12;
 c.beginPath();c.ellipse(-R*.19,eyeY,eyeR,eyeR*1.35,0,0,TWO);
 c.ellipse(R*.18,eyeY,eyeR,eyeR*1.35,0,0,TWO);c.fill();
 if(info.person==='guardian'){c.strokeStyle='#fff8d477';c.lineWidth=1.5;c.beginPath();c.arc(-R*.28,-R*.35,R*.34,Math.PI*1.14,Math.PI*1.9);c.stroke();}
 if(u.hit>0){c.strokeStyle='#fff0d0';c.lineWidth=1.2;c.beginPath();c.arc(0,0,R*1.24,0,TWO);c.stroke();}
 c.restore();
}

let inspectSnapshot='';
function inspect(ev){const rect=C.getBoundingClientRect();const x=(ev.clientX-rect.left)/rect.width*W,y=(ev.clientY-rect.top)/rect.height*H;
 let found=null,best=55;for(const a of agents){const d=Math.hypot(x-a.x,y-a.y);if(d<best){found=a;best=d;}}
 if(found){if(window.openBiologyPanel)window.openBiologyPanel('inspect');const d=types[found.type];$('selection').textContent=d.label+(found.hit>0?' / aktif yanıt':' / devriyede');$('detail').innerHTML='<strong>'+d.label+'</strong><p style="margin:5px 0 0">'+d.info+'</p><span class="detail-kind">'+d.group.toUpperCase()+' · 1 CANLI HÜCRE</span>';if($('cell-legend'))$('cell-legend').textContent=d.label+' · '+d.group;}
 else{state.focus={x:clamp(x,45,W-45),y:clamp(y,45,H-45)};$('selection').textContent='Odak seçildi: müdahaleler bu bölgede uygulanacak.';notice('Müdahale odağı değişti.');updateUi(true);}}
let reportShown=false;
function loop(t){if(!frameTime)frameTime=t;const dt=Math.min(.04,(t-frameTime)/1000);frameTime=t;const run=state.phase!=='paused'&&state.phase!=='finished'&&document.visibilityState==='visible';
 if(run){let remain=dt*state.speed;while(remain>0){const d=Math.min(remain,.04);step(d);remain-=d;}}
 paint(t);
 if(t-uiTime>260){uiTime=t;updateUi(false)}
 if(t-saveTime>4500&&state.phase!=='intro'&&state.phase!=='finished'){saveTime=t;save()}
 requestAnimationFrame(loop);}

/* Icon-operated drawers; no menus obscure the central simulation by default. */
function setupDrawer(){
 const drawer=$('drawer'),heading=$('drawer-title'),close=$('close-drawer');
 const names={laboratory:'Hücre laboratuvarı',events:'Bugün içeride',history:'Doku geçmişi',inspect:'Hücreyi incele',about:'Biyolojik model'};
 let active=null;
 function open(name){
  if(active===name){hide();return;}
  active=name;drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');heading.textContent=names[name]||'İçeridekiler';
  document.querySelectorAll('[data-section]').forEach(item=>{item.hidden=item.dataset.section!==name});
  document.querySelectorAll('[data-drawer]').forEach(btn=>{const on=btn.dataset.drawer===name;btn.classList.toggle('active',on);btn.setAttribute('aria-expanded',String(on));});
 }
 function hide(){
  active=null;drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true');
  document.querySelectorAll('[data-drawer]').forEach(btn=>{btn.classList.remove('active');btn.setAttribute('aria-expanded','false')});
 }
 document.querySelectorAll('[data-drawer]').forEach(btn=>btn.addEventListener('click',()=>open(btn.dataset.drawer)));
 close.addEventListener('click',hide);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')hide()});
 window.openBiologyPanel=name=>{if(active!==name)open(name);};
}
let audioEnabled=false,audioContext=null;
function softSound(freq=340){
 if(!audioEnabled)return;
 try{audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();
 const o=audioContext.createOscillator(),g=audioContext.createGain();
 o.type='sine';o.frequency.setValueAtTime(freq,audioContext.currentTime);
 o.frequency.exponentialRampToValueAtTime(freq*.62,audioContext.currentTime+.22);
 g.gain.setValueAtTime(.0001,audioContext.currentTime);
 g.gain.exponentialRampToValueAtTime(.035,audioContext.currentTime+.025);
 g.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+.27);
 o.connect(g).connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+.28);
 }catch(e){}
}
function setupSound(){
 const b=$('mute');
 b.addEventListener('click',()=>{
  audioEnabled=!audioEnabled;b.textContent=audioEnabled?'♪':'♪̸';b.setAttribute('aria-pressed',String(!audioEnabled));
  if(audioEnabled)softSound(410);
 });
 document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('click',()=>softSound(260+Math.random()*150)));
 $('next').addEventListener('click',()=>softSound(490));
}

function init(){resizeScene();window.addEventListener('resize',resizeScene,{passive:true});setupDrawer();setupSound();
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