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
    banner.style.cssText='position:fixed;bottom:12px;left:12px;right:12px;z-index:2147483640;max-width:460px;padding:15px;background:#fff;border:2px solid #151515;box-shadow:4px 4px 0 #151515;color:#151515;font:13px/1.45 system-ui,sans-serif';
    banner.innerHTML='<div style="font-weight:700;font-size:14px;line-height:1.45">Oyunları yaptık. Hangisini sevdiğinizi bilmiyoruz. Biraz veri lazım.</div><div style="margin-top:7px;color:#555;font-size:12px">İzin verirsen hangi oyunların oynandığını anlamak için analitik çerezler kullanacağız.</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button type="button" data-consent="yes">Alın biraz veri</button><button type="button" data-consent="no">Yok, kalsın</button></div><details style="margin-top:10px;font-size:11px;color:#555"><summary style="cursor:pointer;text-decoration:underline;text-underline-offset:2px">Gizlilik ve çerezler</summary><p style="margin:7px 0 0">İzin verirsen Google Analytics ile ziyaret edilen sayfaları, açılan oyunları ve oyunlarda geçirilen süreyi ölçeriz. Google Analytics çerezleri kullanabilir. Reddedersen analitik izleme başlamaz ve oyunlar çalışmaya devam eder. Seçimin bu cihazda saklanır.</p></details>';
    banner.querySelectorAll('button').forEach(b=>{
      b.style.cssText='padding:7px 12px;border:1px solid #151515;background:#f8f8f7;color:#151515;cursor:pointer';
      b.addEventListener('click',()=>choose(b.dataset.consent==='yes'));
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