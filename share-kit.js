/* Aynen Share Kit — progressive enhancement for game-result share buttons. */
(function(){
'use strict';
if(window.AynenShare)return;
var S=null,lastFocus=null;
var CSS=".ay-share-mask{position:fixed;inset:0;z-index:2147483000;background:rgba(10,12,11,.52);display:flex;align-items:center;justify-content:center;padding:16px}.ay-share-box{font-family:Arial,Helvetica,sans-serif;width:min(460px,100%);max-height:min(90dvh,750px);overflow:auto;border:1px solid #1c1e1c;background:#f9f9f7;color:#171918;box-shadow:9px 9px 0 rgba(0,0,0,.15);padding:22px;text-align:left}.ay-share-top{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.ay-share-eyebrow{font:11px ui-monospace,monospace;color:#285bd7;letter-spacing:.08em;margin-bottom:7px}.ay-share-heading{font-size:25px;font-weight:800;letter-spacing:-.06em;line-height:1.15}.ay-share-excerpt{font-size:13px;line-height:1.5;color:#666d68;max-width:390px;margin:10px 0 18px;overflow-wrap:anywhere}.ay-share-x{background:transparent;border:0;color:#171918;font-size:26px;cursor:pointer;min-height:36px;min-width:36px}.ay-share-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.ay-share-action{min-height:51px;padding:11px 13px;background:white;border:1px solid #cfd2ce;display:flex;align-items:center;justify-content:space-between;text-align:left;color:#171918;font-size:13px;font-weight:700;cursor:pointer;border-radius:0}.ay-share-action:hover,.ay-share-action:focus-visible{border-color:#285bd7;background:#f2f5ff;outline:none}.ay-share-action span{color:#8d9590;font-size:16px}.ay-share-foot{margin-top:16px;padding-top:12px;border-top:1px solid #dee1dc;color:#6b736c;font:11px ui-monospace,monospace;line-height:1.5}.ay-share-status{min-height:17px;margin-top:10px;font-size:12px;color:#285bd7}.ay-share-divider{height:1px;background:#e0e2de;margin:12px 0}.ay-share-action.primary{background:#171918;color:#fff;border-color:#171918}.ay-share-action.primary span{color:#fff}@media(max-width:600px){.ay-share-mask{align-items:flex-end;padding:0}.ay-share-box{width:100%;max-height:92dvh;padding:19px 17px 27px;border:0;border-top:1px solid #222;box-shadow:none}.ay-share-heading{font-size:23px}}";
function style(){if(document.getElementById('ay-share-style'))return;var el=document.createElement('style');el.id='ay-share-style';el.textContent=CSS;document.head.appendChild(el)}
function safe(s){return (s||'').replace(/\s+/g,' ').trim().slice(0,280)}
function visible(e){if(!e)return false;var cs=getComputedStyle(e);return cs.display!=='none'&&cs.visibility!=='hidden'&&e.getBoundingClientRect().width>0}
function gameTitle(){return safe(document.querySelector('h1')?.textContent||document.title.split('—')[0]||'aynen.fun')}
function gameExcerpt(btn){
 var selectors=['#resultTitle','#resultLine','#resultSeconds','#resultDetail','#endTitle','#endText','#outcomeTitle','#resultQuote','#resultDistance','#resultScore','#resultTop','.end-title','.result-title','.end-big','.endline'];
 var chunks=[];
 selectors.forEach(function(sel){var n=document.querySelector(sel);if(visible(n)){var txt=safe(n.textContent);if(txt&&txt.length>=2&&!chunks.includes(txt))chunks.push(txt)}});
 if(chunks.length)return chunks.slice(0,3).join(' · ');
 var scope=btn.closest('[id*="result" i],[class*="result" i],[id*="end" i],[class*="end" i],[class*="overlay" i]')||btn.parentElement?.parentElement;
 var heading=scope?.querySelector('h2,h3,strong,.score,.big');
 if(heading&&visible(heading))return safe(heading.textContent);
 return 'Bu oyunu sen de dene.';
}
function format(title,text,url){return safe(title)+(text?' — '+safe(text):'')+' '+url}
function urlFor(name,info){
 var message=format(info.title,info.text,info.url),e=encodeURIComponent;
 switch(name){
 case 'x':return 'https://twitter.com/intent/tweet?text='+e(message);
 case 'wa':return 'https://api.whatsapp.com/send?text='+e(message);
 case 'tg':return 'https://t.me/share/url?url='+e(info.url)+'&text='+e(info.title+' — '+info.text);
 case 'reddit':return 'https://www.reddit.com/submit?url='+e(info.url)+'&title='+e(info.title+' — '+info.text);
 case 'bsky':return 'https://bsky.app/intent/compose?text='+e(message);
 }
 return '';
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function close(){if(!S)return;var root=S.root;document.removeEventListener('keydown',onKey,true);root.remove();S=null;if(lastFocus&&document.contains(lastFocus))lastFocus.focus();lastFocus=null}
function onKey(e){if(e.key==='Escape'){e.preventDefault();close();return}
 if(e.key==='Tab'&&S){var els=[...S.root.querySelectorAll('button')];if(els.length){if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els[els.length-1].focus()}else if(!e.shiftKey&&document.activeElement===els[els.length-1]){e.preventDefault();els[0].focus()}}}}
function inform(s){if(S)S.root.querySelector('.ay-share-status').textContent=s}
async function copy(s){try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(s);return true}}catch(e){}var input=document.createElement('textarea');input.value=s;input.style.position='fixed';input.style.left='-9999px';document.body.appendChild(input);input.select();var ok=false;try{ok=document.execCommand('copy')}catch(e){}input.remove();return ok}
async function imageFile(info){
 var c=document.createElement('canvas');c.width=1080;c.height=1920;var ctx=c.getContext('2d');ctx.fillStyle='#f6f6f3';ctx.fillRect(0,0,1080,1920);
 ctx.strokeStyle='#171918';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(85,160);ctx.lineTo(995,160);ctx.stroke();
 ctx.fillStyle='#171918';ctx.font='600 44px Arial';ctx.fillText('aynen.fun',85,125);
 ctx.fillStyle='#285bd7';ctx.font='bold 34px Arial';ctx.fillText('OYUN SONUCU / PAYLAŞIM KARTI',85,260);
 function wrap(text,y,font,lineHeight,maxLines){
  ctx.font=font;var words=String(text).split(/\s+/),line='',lines=[];
  for(var i=0;i<words.length;i++){var test=line?line+' '+words[i]:words[i];if(ctx.measureText(test).width>890&&line){lines.push(line);line=words[i]}else line=test}
  if(line)lines.push(line);ctx.fillStyle='#171918';
  lines.slice(0,maxLines).forEach(function(str,i){ctx.fillText(str,85,y+i*lineHeight)});
  return y+Math.min(lines.length,maxLines)*lineHeight;
 }
 var y=wrap(info.title,510,'bold 102px Arial',118,4)+90;
 y=wrap(info.text,y,'normal 52px Arial',70,7);
 ctx.strokeStyle='#bfc5bd';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(85,1640);ctx.lineTo(995,1640);ctx.stroke();
 ctx.font='38px Arial';ctx.fillStyle='#545c55';ctx.fillText('Bİ SEN DE DENE',85,1740);ctx.font='32px Arial';ctx.fillText(info.url.replace(/^https?:\/\//,''),85,1810);
 return await new Promise(function(resolve){c.toBlob(function(blob){resolve(blob?new File([blob],'aynen-fun-sonuc.png',{type:'image/png'}):null)},'image/png')});
}
function download(file){var obj=URL.createObjectURL(file),a=document.createElement('a');a.href=obj;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(obj)},8000)}
async function doAction(key){
 if(!S)return;var info=S.info;
 if(['x','wa','tg','reddit','bsky'].includes(key)){var url=urlFor(key,info);window.open(url,'_blank','noopener,noreferrer');return}
 if(key==='copy'||key==='discord'){var ok=await copy(format(info.title,info.text,info.url));inform(ok?(key==='discord'?'Discord için sonuç ve bağlantı kopyalandı.':'Sonuç bağlantısı kopyalandı.'):'Kopyalanamadı. Bağlantı: '+info.url);return}
 if(key==='native'){try{if(navigator.share)await navigator.share({title:info.title,text:info.text,url:info.url});else{await copy(format(info.title,info.text,info.url));inform('Cihaz paylaşımı yok; bağlantı kopyalandı.')}}catch(e){if(e.name!=='AbortError')inform('Paylaşım açılamadı.')}return}
 if(key==='instagram'||key==='image'){
  inform('Paylaşım kartı hazırlanıyor...');
  try{var f=await imageFile(info);if(!f){inform('Görsel oluşturulamadı.');return}
   if(key==='instagram'&&navigator.share&&navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:info.title,text:info.text});inform('Paylaşım menüsünden Instagram’ı seçebilirsin.')}catch(e){if(e.name!=='AbortError')inform('Instagram için kart indiriliyor...');if(e.name!=='AbortError')download(f)}}
   else{download(f);inform(key==='instagram'?'Instagram web’den doğrudan hikâye açılamıyor. Kartı Instagram’da hikâye olarak yükleyebilirsin.':'PNG kart indirildi.')}
  }catch(e){inform('Kart hazırlanamadı.')}return;
 }
}
function open(o){
 close();style();
 var info={title:safe(o&&o.title)||gameTitle(),text:safe(o&&o.text)||'Bu oyunu sen de dene.',url:(o&&o.url)||location.origin+location.pathname};
 var modal=document.createElement('div');modal.className='ay-share-mask';
 modal.innerHTML='<section class="ay-share-box" role="dialog" aria-modal="true" aria-label="Sonucunu paylaş"><div class="ay-share-top"><div><div class="ay-share-eyebrow">AYNEN.FUN / SONUCU PAYLAŞ</div><div class="ay-share-heading">'+escapeHtml(info.title)+'</div></div><button type="button" class="ay-share-x" data-ay="close" aria-label="Kapat">×</button></div><div class="ay-share-excerpt">'+escapeHtml(info.text)+'</div><div class="ay-share-grid"><button type="button" class="ay-share-action" data-ay="x">X <span>↗</span></button><button type="button" class="ay-share-action" data-ay="wa">WhatsApp <span>↗</span></button><button type="button" class="ay-share-action" data-ay="instagram">Instagram <span>↗</span></button><button type="button" class="ay-share-action" data-ay="tg">Telegram <span>↗</span></button><button type="button" class="ay-share-action" data-ay="reddit">Reddit <span>↗</span></button><button type="button" class="ay-share-action" data-ay="bsky">Bluesky <span>↗</span></button><button type="button" class="ay-share-action" data-ay="discord">Discord için kopyala <span>⧉</span></button><button type="button" class="ay-share-action" data-ay="image">Sonuç kartı PNG <span>↓</span></button><button type="button" class="ay-share-action primary" data-ay="native">Cihazdan paylaş <span>↗</span></button><button type="button" class="ay-share-action" data-ay="copy">Bağlantıyı kopyala <span>⧉</span></button></div><div class="ay-share-status" role="status" aria-live="polite"></div><div class="ay-share-foot">Instagram: mobilde uygulama seçimi; masaüstünde hikâye kartı indirme. Discord: sunucuna yapıştırmak için kopyala.</div></section>';
 lastFocus=document.activeElement;document.body.appendChild(modal);S={root:modal,info:info};
 modal.addEventListener('click',function(e){if(e.target===modal){close();return}var b=e.target.closest('[data-ay]');if(!b)return;if(b.dataset.ay==='close'){close();return}doAction(b.dataset.ay)});
 document.addEventListener('keydown',onKey,true);modal.querySelector('[data-ay="close"]').focus();
}
window.AynenShare={open:open};
document.addEventListener('click',function(e){
 if(e.defaultPrevented||e.target.closest('.ay-share-mask'))return;
 var trigger=e.target.closest('button,[role="button"]');if(!trigger)return;
 var id=(trigger.id||'').toLowerCase(),txt=(trigger.textContent||'').toLocaleLowerCase('tr');
 var isShare=(/(^share$|^sharebtn$|share-button|share_result|share-result)/.test(id))||txt.includes('paylaş')||txt.includes('paylas');
 if(!isShare)return;
 e.preventDefault();e.stopImmediatePropagation();
 open(window.AynenShareResult||{title:gameTitle(),text:gameExcerpt(trigger),url:location.origin+location.pathname});
},true);
})();