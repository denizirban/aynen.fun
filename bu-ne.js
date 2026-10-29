/* Bu Ne? | Open-ended illustrated object discovery, no final screen. */
(function(){
'use strict';
const entries = window.BU_NE_OBJECTS || [];
const $ = id => document.getElementById(id);
const shell = $('object-shell'), photo = $('photo'), qa = $('questionarea');
const imageCache = new Map(), answered = new Map();
let deck=[], position=0, lastId=-1, examined=0, pageToken=0, imageToken=0, displayedImageId=null, viewed = new Set(), busy=false;
const pad = n => String(n).padStart(3,'0');
const esc = x => String(x).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function shuffle(xs) { for(let i=xs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [xs[i],xs[j]]=[xs[j],xs[i]];} return xs; }
function startDeck(previous) {
 deck=shuffle(entries.map((_,i)=>i));
 if(deck.length>1 && deck[0]===previous)[deck[0],deck[1]]=[deck[1],deck[0]];
 position=0;
 answered.clear();
}
function current(){return entries[deck[position]];}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2000);}
/* Verified Commons file names. Prefer explicit object photos over a live search
   on every page view: the Wikimedia search APIs can fail or be rate-limited. */
const photoDirect={
 'MEMS Jiroskop':'Mpu6050-small-top-HD.jpg',
 'Ferrofluid':'Ferrofluid-1.JPG',
 'Prens Rupert Damlası':'Prince Ruperts drops.jpg',
 'Aerojel':'Aerogel.jpg',
 'Işık Değirmeni':'Crookes radiometer.jpg',
 'Silikon Wafer':'Silicon wafer.jpg'
};
const commonsFile = name => 'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(name);
const commonsSpecial = name => 'https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/'+encodeURIComponent(name)+'&width=900';
const timeoutFetch = async(url) => {
 const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),6500);
 try { const res=await fetch(url,{signal:controller.signal,mode:'cors',credentials:'omit'}); if(!res.ok)throw Error('HTTP '+res.status);return res.json(); }
 finally { clearTimeout(timer); }
};
function pageInfo(data) {
 const ps=data && data.query && data.query.pages;
 return ps ? Object.values(ps)[0] : null;
}
function maybeImage(src){
 return new Promise(resolve=>{
  if(!src)return resolve(false);
  const im=new Image();let settled=false;
  const done=ok=>{if(settled)return;settled=true;clearTimeout(timer);resolve(ok)};
  const timer=setTimeout(()=>done(false),7500);
  im.onload=()=>done(im.naturalWidth>100 && im.naturalHeight>100);
  im.onerror=()=>done(false);
  im.src=src;
 });
}
async function getWikipediaImage(o){
 const wikiAPI='https://en.wikipedia.org/w/api.php?origin=*&action=query&format=json&redirects=1&prop=pageimages&piprop=thumbnail%7Cname&pithumbsize=900&titles='+encodeURIComponent(o.wiki);
 const d=await timeoutFetch(wikiAPI), p=pageInfo(d);
 if(p && p.thumbnail && p.thumbnail.source){
  const licensePage=p.pageimage?commonsFile(p.pageimage):('https://en.wikipedia.org/wiki/'+encodeURIComponent(o.wiki.replaceAll(' ','_')));
  return {src:p.thumbnail.source,credit:licensePage};
 }
 throw Error('No encyclopedia image');
}
async function getCommonsImage(o){
 const query=o.wiki+' photograph';
 const url='https://commons.wikimedia.org/w/api.php?origin=*&action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=14&gsrsearch='+encodeURIComponent(query)+'&prop=imageinfo&iiprop=url%7Cmime&iiurlwidth=900';
 const d=await timeoutFetch(url);
 const pages=d.query?.pages ? Object.values(d.query.pages):[];
 const filtered=pages.filter(x=>{
  const mime=x.imageinfo?.[0]?.mime||'';
  return /image\/(jpeg|png|webp)/.test(mime)&&x.imageinfo?.[0]?.thumburl;
 });
 filtered.sort((a,b)=>{
  const rank=x => {
   const name=x.title.toLowerCase();
   return (name.includes('photo')?3:0)+(name.includes('thumb')?1:0)-(name.match(/logo|map|diagram|schematic|symbol|icon|chart|graph|drawing|svg|patent|circuit/) ? 9:0);
  };return rank(b)-rank(a);
 });
 for(const item of filtered.slice(0,4)){
  const candidate={src:item.imageinfo[0].thumburl,credit:'https://commons.wikimedia.org/wiki/'+encodeURIComponent(item.title.replace(/^File:/,''))};
  if(await maybeImage(candidate.src))return candidate;
 }
 throw Error('No photograph found');
}
/* A photo is only replaced after the new image has actually loaded.
   Failed sources never leave the browser's broken-image alt text on screen. */
async function loadPicture(o, requestId){
 const alt=o.name+' nesnesinin görseli';
 photo.alt=alt;
 shell.classList.add('loading');
 shell.classList.remove('error','zoom');
 $('photo-caption').textContent='NESNE GÖRSELİ ARANIYOR';
 $('photo-credit').href=o.link;
 photo.removeAttribute('src');
 const show = async(candidate)=>{
  if(!candidate)return false;
  const ok=await maybeImage(candidate.src);
  if(requestId!==imageToken)return true;
  if(!ok)return false;
  photo.onerror=()=>{if(requestId===imageToken){photo.removeAttribute('src');shell.classList.remove('loading');shell.classList.add('error');$('photo-caption').textContent='GÖRSEL ERİŞİLEMİYOR';}};
  photo.onload=()=>{if(requestId===imageToken){shell.classList.remove('loading','error');$('photo-caption').textContent='GERÇEK NESNE FOTOĞRAFI';}};
  photo.src=candidate.src;
  $('photo-credit').href=candidate.credit||o.link;
  imageCache.set(o.id,candidate);
  if(photo.complete&&photo.naturalWidth>0){shell.classList.remove('loading','error');$('photo-caption').textContent='GERÇEK NESNE FOTOĞRAFI';}
  return true;
 };
 const cached=imageCache.get(o.id);
 if(cached && await show(cached))return;
 if(requestId!==imageToken)return;
 const fixed=photoDirect[o.name];
 if(fixed && await show({src:commonsSpecial(fixed),credit:commonsFile(fixed)}))return;
 if(requestId!==imageToken)return;
 try {
  const result=await getWikipediaImage(o);
  if(await show(result))return;
 } catch(e){}
 if(requestId!==imageToken)return;
 try {
  const result=await getCommonsImage(o);
  if(await show(result))return;
 } catch(e){}
 if(requestId!==imageToken)return;
 photo.removeAttribute('src');
 photo.alt='';
 shell.classList.remove('loading');
 shell.classList.add('error');
 $('photo-caption').textContent='FOTOĞRAFA ERİŞİLEMİYOR · TEMSİLÎ GÖRSEL';
 $('photo-credit').href=o.link;
}
function updateLabels(){
 const o=current(),isAnswered=answered.has(o.id);
 $('status').textContent='KEŞİF / DEVAM EDİYOR';
 $('collection').textContent='NESNE '+pad(examined);
 $('eyebrow').textContent=isAnswered?'BU ŞEYİN ADI':'BAK. TAHMİN ET. ÖĞREN.';
 $('title').textContent=isAnswered?o.name:'Bu Ne?';
 $('title').classList.toggle('reveal',isAnswered);
 $('material').textContent=isAnswered?o.material:'CEVAPTAN SONRA';
 $('category').textContent=isAnswered?o.category:'SÜRPRİZ';
 $('photo-index').textContent=pad(examined);
 $('count').textContent=viewed.size+' FARKLI NESNE GÖRDÜN';
 $('loop').textContent='SONU YOK · DEVAM ET';
}
function render(){
 const o=current();if(!o)return;
 const isAnswered=answered.has(o.id), answer=answered.get(o.id);
 const token=++pageToken;
 updateLabels();
 shell.style.setProperty('--object-scale',o.name==='Işık Değirmeni'?'0.87':o.name==='Lav Lambası'?'0.90':'1');
 if(displayedImageId!==o.id){displayedImageId=o.id;loadPicture(o,++imageToken);}
 if(!isAnswered){
  qa.innerHTML='<p class="ask">'+esc(o.question)+'</p><div class="choices">'+o.choices.map((choice,i)=>'<button class="choice" data-answer="'+i+'"><span class="number">'+String(i+1).padStart(2,'0')+'</span><span>'+esc(choice)+'</span></button>').join('')+'</div><button class="reveal-answer" type="button" id="show-answer">BİLMİYORUM, GÖSTER ↗</button>';
  qa.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>{if(token===pageToken)answerCurrent(Number(b.dataset.answer));}));
  $('show-answer').onclick=()=>{if(token===pageToken)answerCurrent(null);};
 } else {
  const feedback=answer===null?'İŞTE CEVABI':answer===o.correct?'DOĞRU TAHMİN':'PEKİ GERÇEKTE?';
  qa.innerHTML='<div class="answerline '+(answer===o.correct?'good':'')+'">'+feedback+'</div>'+
   '<p class="explain">'+esc(o.story)+'</p>'+
   '<div class="fact"><b>NE İÇİN KULLANILIYOR?</b>'+esc(o.usage)+'</div>'+
   '<div class="fact"><b>İŞİN GARİBİ</b>'+esc(o.fact)+'</div>'+
   '<div class="source"><a href="'+o.link+'" target="_blank" rel="noopener noreferrer">BİLGİ KAYNAĞI ↗</a> · <a id="inline-photo-credit" href="'+$('photo-credit').href+'" target="_blank" rel="noopener noreferrer">GÖRSEL KAYNAĞI ↗</a></div>'+
   '<button class="continue" id="continue" type="button">BAŞKA BİR NESNE <span>→</span></button>';
  $('continue').onclick=()=>{if(token===pageToken)next();};
  qa.scrollTop=0;
 }
}
function answerCurrent(choice){
 const o=current();if(answered.has(o.id))return;
 answered.set(o.id,choice);
 render();
}
function next(){
 const prev=deck[position];
 position++;
 if(position>=deck.length)startDeck(prev);
 examined++;
 viewed.add(current().id);
 render();
}
function previous(){
 // The previous item in the current shuffled cycle. Never block on a new round.
 if(position>0){position--;render();}
 else toast('YENİ TURA GEÇTİN · DEVAM ET');
}
function random(){
 const old=deck[position];
 let choices=deck.map((id,i)=>({id,i})).filter(x=>x.id!==old && !viewed.has(entries[x.id].id));
 if(!choices.length)choices=deck.map((id,i)=>({id,i})).filter(x=>x.id!==old);
 if(!choices.length)return;
 const picked=choices[Math.floor(Math.random()*choices.length)];
 // Swap the next slot so normal forward navigation keeps a coherent history.
 if(position+1>=deck.length){next();return;}
 [deck[position+1],deck[picked.i]]=[deck[picked.i],deck[position+1]];
 next();
}
function share(){
 const o=current(),text='Bu nesnenin ne işe yaradığını biliyor musun? '+o.name+' · Bu Ne?';
 const url=location.origin+location.pathname;
 if(navigator.share)navigator.share({title:'Bu Ne? — aynen.fun',text,url}).catch(()=>{});
 else if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text+' '+url).then(()=>toast('BAĞLANTI KOPYALANDI')).catch(()=>toast('PAYLAŞILAMADI'));
 else toast('PAYLAŞILAMADI');
}
$('prev').addEventListener('click',previous);
$('next').addEventListener('click',next);
$('next-bottom').addEventListener('click',next);
$('shuffle').addEventListener('click',random);
$('share').addEventListener('click',share);
shell.addEventListener('click',()=>shell.classList.toggle('zoom'));
document.addEventListener('keydown',event=>{
 if(event.altKey||event.ctrlKey||event.metaKey||event.target.matches('a,button,input,textarea'))return;
 if(event.key==='ArrowRight'){event.preventDefault();next();}
 if(event.key==='ArrowLeft'){event.preventDefault();previous();}
 if(event.key==='Escape')shell.classList.remove('zoom');
 if(/^[123]$/.test(event.key))answerCurrent(Number(event.key)-1);
 if(event.key===' ') {event.preventDefault();next();}
});
if(entries.length===0){qa.textContent='Nesneler yüklenemedi. Sayfayı yenile.';return;}
startDeck(-1);examined=1;viewed.add(current().id);render();
})();