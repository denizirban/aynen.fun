/* aynen.fun — GA4 game analytics. Add a GA4 Measurement ID in analytics-config.js to activate.
   No Google request or analytics storage before affirmative consent. */
(() => {
  'use strict';
  const cfg=window.AYNEN_ANALYTICS||{};
  const id=cfg.measurementId||'';
  if(!/^G-[A-Z0-9]+$/.test(id)) return;
  const consentKey='aynen_analytics_consent_v1';
  const gameFromPath=()=>{
    const file=location.pathname.split('/').pop().replace(/\.html$/,'');
    return file&&file!=='index' ? file : null;
  };
  const game=gameFromPath();
  let consent;
  try{consent=localStorage.getItem(consentKey)}catch(e){}
  let started=0, sent=false;
  const params=(extra={})=>({game_id:game||'hub',...extra});
  const send=(name,extra={})=>{
    if(!sent||typeof window.gtag!=='function')return;
    window.gtag('event',name,params(extra));
  };
  function load(){
    if(sent)return;
    sent=true;
    window.dataLayer=window.dataLayer||[];
    window.gtag=function(){dataLayer.push(arguments)};
    gtag('js',new Date());
    gtag('config',id,{send_page_view:true});
    const script=document.createElement('script');script.async=true;
    script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);
    document.head.appendChild(script);
    if(game){started=Date.now();send('game_start',{game_id:game})}
  }
  function choose(yes){
    try{localStorage.setItem(consentKey,yes?'granted':'denied')}catch(e){}
    document.getElementById('aynen-analytics-consent')?.remove();
    if(yes)load();
  }
  if(consent==='granted')load();
  if(consent!== 'granted' && consent!=='denied'){
    const banner=document.createElement('div');
    banner.id='aynen-analytics-consent';
    banner.setAttribute('role','dialog');
    banner.setAttribute('aria-label','Analitik tercihi');
    banner.style.cssText='position:fixed;bottom:max(14px,env(safe-area-inset-bottom));left:14px;right:14px;z-index:2147483640;max-width:390px;padding:17px 18px 15px;background:#ffe5ed;border:1.5px solid #191919;border-radius:18px;box-shadow:5px 5px 0 #191919;color:#191919;font:13px/1.4 "Space Grotesk",system-ui,sans-serif;box-sizing:border-box;max-height:min(80vh,570px);overflow-y:auto';
    banner.innerHTML='<div style="display:flex;align-items:center;gap:8px;margin-bottom:9px"><span aria-hidden="true" style="display:inline-grid;place-items:center;width:28px;height:28px;border:1.5px solid #191919;border-radius:9px;background:#d4e7a5;transform:rotate(-10deg);font-size:16px">✳</span><span style="font-size:10px;font-weight:800;letter-spacing:.08em">AYNEN.FUN / MİNİ RİCA</span></div><div style="font-size:clamp(15px,4.4vw,18px);font-weight:800;line-height:1.25;letter-spacing:-.04em">Oyunları yaptık. Hangisini sevdiğinizi bilmiyoruz. Biraz veri lazım.</div><p style="margin:8px 0 0;font-size:11px;line-height:1.45;color:#494049">İzin verirsen hangi oyunlara girildiğini görmek için çerez kullanırız. İstemezsen de oyun aynen devam.</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:13px"><button type="button" data-consent="yes">Alın biraz veri</button><button type="button" data-consent="no">Yok, kalsın</button></div><details style="margin-top:11px;font-size:11px;color:#484048"><summary style="cursor:pointer;text-decoration:underline;text-underline-offset:2px">Gizlilik ve çerezler</summary><p style="margin:8px 0 0;line-height:1.5">İzin verirsen Google Analytics ile ziyaret edilen sayfaları, açılan oyunları ve oyunlarda geçirilen süreyi ölçeriz. Bu hizmet analitik çerezler kullanabilir. İzin vermezsen bu takip başlamaz; oyunlar normal çalışır. Seçimin bu cihazda saklanır.</p></details>';
    banner.querySelectorAll('button').forEach(b=>{
      const yes=b.dataset.consent==='yes';
      b.style.cssText='flex:1 1 135px;min-height:40px;padding:9px 11px;border:1.5px solid #191919;border-radius:10px;background:'+(yes?'#d4e7a5':'#fff')+';color:#191919;font:700 12px/1.2 "Space Grotesk",system-ui,sans-serif;cursor:pointer;box-shadow:2px 2px 0 #191919';
      b.addEventListener('click',()=>choose(yes));
    });
    const add=()=>document.body.appendChild(banner);
    if(document.body)add();else document.addEventListener('DOMContentLoaded',add,{once:true});
  }
  const clean=(text)=>String(text||'').trim().toLowerCase().replace(/\s+/g,' ').slice(0,80);
  document.addEventListener('click',(event)=>{
    const el=event.target.closest?.('a.game-tile,button[data-game],a[href$=".html"]');
    if(!el)return;
    const name=el.dataset.game||el.querySelector('.game-name')?.textContent||
      el.getAttribute('href')?.split('/').pop()?.replace(/\.html$/,'');
    if(name)send('game_select',{game_id:clean(name),source_page:location.pathname});
    if(el.matches('button[data-game]')) {
      // Inline games do not navigate to another document.
      window.aynenGameStart(clean(name));
    }
  },true);
  let inlineStart=0, inlineId='';
  window.aynenGameStart=(id)=>{
    if(inlineStart)window.aynenGameEnd();
    inlineId=clean(id);inlineStart=Date.now();
    send('game_start',{game_id:inlineId});
  };
  window.aynenGameEvent=(event,properties={})=>{
    if(!/^[a-z][a-z0-9_]{0,39}$/.test(event))return;
    send(event,{...properties,game_id:properties.game_id||inlineId||game||'hub'});
  };
  window.aynenGameEnd=()=>{
    if(!inlineStart)return;
    const seconds=Math.max(0,Math.round((Date.now()-inlineStart)/1000));
    send('game_end',{game_id:inlineId,duration_seconds:seconds});
    inlineStart=0;inlineId='';
  };
  function finish(){
    if(game&&started)send('game_end',{game_id:game,duration_seconds:Math.max(0,Math.round((Date.now()-started)/1000))});
    if(inlineStart)window.aynenGameEnd();
    started=0;
  }
  window.addEventListener('pagehide',finish);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){finish()}else if(game&&sent&&!started){started=Date.now()}});
  // Set to true only for an actively started game, not simply because a tile was viewed.
})();