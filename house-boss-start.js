/* HOUSE BOSS / IMMERSIVE GAME MENU V2
   All game buttons are MOVED, not recreated: save actions and avatar listeners survive. */
(function(){
 'use strict';
 const splash=document.getElementById('splash'),shell=splash?.querySelector('.game-menu');
 if(!shell)return;
 const top=shell.querySelector('.menu-top'),story=shell.querySelector('.menu-story'),controls=shell.querySelector('.menu-controls');
 const start=document.getElementById('start'),resume=document.getElementById('resume'),
 saved=document.getElementById('savedStats'),profile=document.getElementById('profileSelect');
 if(!top||!start||!resume||!profile)return;
 const legacy=document.createElement('div');legacy.className='hb-menu-legacy';legacy.hidden=true;
 [story,shell.querySelector('.menu-challenge'),shell.querySelector('.mode-picks')].forEach(el=>{if(el)legacy.appendChild(el)});
 const stage=document.createElement('div');stage.className='hb-menu-stage';
 stage.innerHTML="<div class=\"hb-screen-atmosphere\" aria-hidden=\"true\"><div class=\"hb-sky-glow\"></div><div class=\"hb-floating-cloud cloud-one\"></div><div class=\"hb-floating-cloud cloud-two\"></div><div class=\"hb-screen-particles\"><i></i><i></i><i></i><i></i><i></i></div></div>\n<main class=\"hb-game-intro\"><div class=\"hb-game-label\"><span class=\"hb-signal\"></span> THE LIVING NEIGHBORHOOD <span class=\"hb-game-line\"></span> SINGLE PLAYER</div>\n<h1 class=\"hb-logo\">HOUSE<br><span>BOSS</span><em>.</em></h1><p class=\"hb-manifesto\">Run a home. <b>Shape a life.</b></p>\n<p class=\"hb-subline\">Find your people, make a living, design your space, and see where everyday life takes you.</p>\n<div class=\"hb-feature-row\"><span>♡ RELATIONSHIPS</span><span>◈ CAREERS</span><span>▣ HOME DESIGN</span><span>✧ LIFE STORIES</span></div>\n<div class=\"hb-micro\">A little chaos. A lot of living. <span>ONE HOUSEHOLD · ENDLESS DAYS</span></div></main>\n<aside class=\"hb-game-menu\" aria-label=\"Choose your story\"><div class=\"hb-aside-head\"><span class=\"hb-status-pulse\"></span><span>YOUR HOUSEHOLD</span><small>01 / SINGLE PLAYER</small></div>\n<div class=\"hb-save-block\" id=\"hbContinueCard\"><div class=\"hb-card-label\">PICK UP WHERE YOU LEFT OFF <span>↗</span></div><div class=\"hb-family-avatars\" id=\"hbFamilyAvatars\" aria-hidden=\"true\"></div>\n<h2>Your world is waiting.</h2><p>Come home. Life carried on.</p><div id=\"hbSaveDetails\" class=\"hb-save-meta\"></div><div class=\"hb-continue-control\" id=\"hbContinueControl\"></div></div>\n<div class=\"hb-new-block\"><div class=\"hb-card-label\">A FRESH START <span>✧</span></div><h2>Start a new life.</h2><p>New stories, new routines, new possibilities.</p>\n<div class=\"hb-new-controls\" id=\"hbNewControls\"></div><button type=\"button\" class=\"hb-create-trigger\" id=\"hbCustomize\">✎ &nbsp; CREATE YOUR HOUSEHOLD <span>+</span></button></div>\n<div class=\"hb-aside-foot\"><span><i class=\"hb-dot\"></i> AUTOSAVE ON</span><span>3D WORLD · NO ENDING</span></div></aside>\n<section class=\"hb-setup hidden\" id=\"hbSetup\" aria-label=\"Create your household\"><div class=\"hb-setup-head\"><button id=\"hbSetupBack\" type=\"button\">← BACK</button><span>CREATE A HOUSEHOLD</span></div>\n<div class=\"hb-setup-greeting\">Every story starts somewhere.</div><h2>Make it yours.</h2>\n<p>Choose the look of your household. You can customize personalities and style further inside the game.</p><div id=\"hbProfileMount\"></div>\n<div class=\"hb-setup-message\"><span>◈</span><div><b>YOUR STORY, YOUR PACE</b><p>Build a home, find work, make friends and take control of everyday life.</p></div></div>\n<button type=\"button\" class=\"hb-setup-go\" id=\"hbSetupGo\">START THIS LIFE <span>→</span></button></section>\n<div class=\"hb-game-edition\">HOUSE BOSS / ORIGINAL LIVING WORLD</div>";
 const footer=shell.querySelector('.menu-footer');if(controls)legacy.appendChild(controls);
 shell.replaceChildren(top,stage,legacy);
 stage.querySelector('#hbNewControls').appendChild(start);
 stage.querySelector('#hbContinueControl').appendChild(resume);
 stage.querySelector('#hbProfileMount').appendChild(profile);
 if(saved)stage.querySelector('#hbSaveDetails').appendChild(saved);
 if(footer)legacy.appendChild(footer);
 const avatars=stage.querySelector('#hbFamilyAvatars');
 avatars.innerHTML=['self','partner','kid','pet'].map(who=>{
  const a=document.querySelector('.person-card[data-person="'+who+'"] .avatar');
  return '<div class="hb-family-avatar" title="'+({self:'You',partner:'Partner',kid:'Kid',pet:'Dog'}[who])+'">'+(a?.innerHTML||'')+'</div>'
 }).join('');
 const hasSave=!resume.hidden,card=stage.querySelector('#hbContinueCard');
 card.hidden=!hasSave;stage.classList.toggle('hb-has-save',hasSave);
 if(hasSave){
  const text=saved?.textContent||'';
  const m=text.match(/DAY\s+(\d+)\s*·\s*([0-9:]+)\s*·\s*(\d+)%\s+PEACE\s*·\s*(\d+)\s+CHORES/i);
  if(m){
   stage.querySelector('#hbSaveDetails').innerHTML='<div class="hb-mini-stats">'+
    '<div><small>DAY</small><b>'+m[1]+'</b></div>'+
    '<div><small>TIME</small><b>'+m[2]+'</b></div>'+
    '<div><small>PEACE</small><b>'+m[3]+'%</b></div>'+
    '<div><small>CHORES</small><b>'+m[4]+'</b></div></div>';
  }
  resume.textContent='CONTINUE YOUR LIFE →';
 }else resume.hidden=true;
 start.textContent='START NEW LIFE →';
 const setup=stage.querySelector('#hbSetup');
 const toggle=on=>{setup.classList.toggle('hidden',!on);stage.classList.toggle('hb-setup-open',on);if(on)stage.querySelector('#hbSetupBack').focus()};
 stage.querySelector('#hbCustomize').onclick=()=>toggle(true);
 stage.querySelector('#hbSetupBack').onclick=()=>toggle(false);
 stage.querySelector('#hbSetupGo').onclick=()=>start.click();
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!setup.classList.contains('hidden'))toggle(false)});
 const updateAvatars=()=>{
  ['self','partner'].forEach((who,i)=>{
   const portrait=document.querySelector('.person-card[data-person="'+who+'"] .avatar');
   if(portrait&&avatars.children[i])avatars.children[i].innerHTML=portrait.innerHTML
  })
 };
 document.querySelectorAll('#profileSelect [data-avatar]').forEach(b=>b.addEventListener('click',updateAvatars));
})();