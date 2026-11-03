/* HOUSE BOSS / SIMS-LIKE CONTROL HUD.
   Presentation only; authoritative gameplay runs in HouseBossSimBridge.
   No replacement of the original 3D kitchen, save, or town systems. */
(function(){
 'use strict';
 const B=window.HouseBossSimBridge,game=document.getElementById('game');
 if(!B||!game)return;
 const q=s=>game.querySelector(s),qa=s=>Array.from(game.querySelectorAll(s));
 let currentPanel='',lastSheetAt=0,portraitFingerprint='',lastQueueSignature='',lastStatusKey='';
 const names={self:'You',partner:'Partner',kid:'Kid',pet:'Dog'};
 const needNames={hunger:'Hunger',energy:'Energy',hygiene:'Hygiene',bladder:'Bladder',fun:'Fun',social:'Social'};
 const symbols={hunger:'◈',energy:'☾',hygiene:'◉',bladder:'◧',fun:'♫',social:'♡'};
 const actionDescription={
   cook:'Prepare a proper meal and practice cooking.',snack:'Quick food for a small appetite.',shower:'Freshen up and feel comfortable.',
   toilet:'Take care of a basic need.',sleep:'Sleep until you feel rested.',nap:'Get some energy back.',
   tv:'A little entertainment.',talk:'Enjoy a conversation with family.',read:'Improve your Logic skill.',
   study:'Work hard on your Logic skill.',paint:'Make something creative.',exercise:'Train and improve Fitness.',
   dance:'Move around and have fun.',clean:'Improve House Peace and tidy up.',laundry:'Keep the house running.',
   computer:'Practice creativity on the computer.',homework:'Learn something new.',playdog:'Play with your companion.',
   feedpet:'A happy dog is a well-fed dog.',dogfood:'Dinner time.',dognap:'A proper dog nap.',dogplay:'A little adventure.'
 };
 const actions={
   needs:{self:['cook','snack','shower','toilet','sleep','tv'],partner:['cook','snack','shower','toilet','nap','talk'],kid:['snack','shower','toilet','nap','tv','homework'],pet:['dogfood','dognap','dogplay']},
   social:{self:['talk','playdog','dance','tv'],partner:['talk','playdog','dance'],kid:['talk','playdog','dance'],pet:['dogplay','dognap']},
   skills:{self:['cook','read','study','paint','exercise','computer'],partner:['cook','read','paint','exercise'],kid:['homework','read','paint','exercise'],pet:['dogplay']},
   station:{
     stove:['cook','snack','clean'],
     sink:['shower','clean','laundry'],
     table:['snack','talk','read','tv'],
     desk:['computer','study','read','paint'],
     kid:['homework','read','talk','nap'],
     floor:['exercise','dance','clean'],
     laundry:['laundry','shower','toilet'],
     pet:['feedpet','playdog','dogfood','dognap','dogplay']
   }
 };
 function escapeText(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
 function percent(x){return Math.max(0,Math.min(100,Math.round(x||0)))}
 function face(who){
   const src=document.querySelector('.person-card[data-person="'+who+'"] .avatar');
   return src&&src.innerHTML?src.innerHTML:'<span aria-hidden="true">◉</span>'
 }
 const dock=document.createElement('section');
 dock.id='simDock';dock.hidden=true;dock.setAttribute('aria-label','Living world character control panel');
 const portraitHtml=['self','partner','kid','pet'].map(who=>
   '<button type="button" class="sd-avatar" data-sd-who="'+who+'" aria-label="Select '+names[who]+'">'+
   '<span class="sd-face" data-portrait="'+who+'">'+face(who)+'</span><span class="sd-label">'+names[who]+'</span>'+
   '<span class="sd-energy"><i data-mini-energy="'+who+'" style="width:85%"></i></span></button>'
 ).join('');
 const bars=Object.keys(needNames).map(need=>
   '<div class="sd-need" data-sd-need="'+need+'"><div class="sd-need-top"><span>'+symbols[need]+' '+needNames[need]+'</span><b data-need-val="'+need+'">80</b></div>'+
   '<div class="sd-track"><i data-need-bar="'+need+'" style="width:80%"></i></div></div>'
 ).join('');
 dock.innerHTML='<div class="sd-queue" id="simQueue" aria-live="polite"></div>'+
 '<div class="sd-portraits" aria-label="Select family member">'+portraitHtml+'</div>'+
 '<div class="sd-identity"><small class="sd-kicker">ACTIVE CHARACTER</small><strong class="sd-name" id="simActiveName">You</strong>'+
 '<span class="sd-mood" id="simMood" data-tone="happy">Happy</span><span class="sd-asp-name" id="simAspName"></span>'+
 '<div class="sd-asp-track"><i id="simAspBar" style="width:0%"></i></div></div>'+
 '<div class="sd-needs" aria-label="Six life needs">'+bars+'</div>'+
 '<div class="sd-buttons" aria-label="Character controls">'+
 '<button type="button" data-sd-panel="needs" aria-label="Needs"><span>◉</span>NEEDS</button>'+
 '<button type="button" data-sd-panel="social" aria-label="Social and relationships"><span>♡</span>SOCIAL</button>'+
 '<button type="button" data-sd-panel="skills" aria-label="Skills"><span>✧</span>SKILLS</button>'+
 '<button type="button" data-sd-panel="goals" aria-label="Life goals"><span>✦</span>GOALS</button>'+
 '<button type="button" data-sd-go="chores" aria-label="Open household chores"><span>✓</span>CHORES</button>'+
 '<button type="button" data-sd-go="town" aria-label="Go to town"><span>⌂</span>TOWN</button>'+
 '<button type="button" data-sd-go="build" aria-label="Build and upgrade home"><span>▤</span>BUILD</button>'+
 '<button type="button" data-sd-go="appearance" aria-label="Customize character appearance"><span>◈</span>STYLE</button></div>';
 game.appendChild(dock);
 const sheet=document.createElement('section');sheet.id='simSheet';sheet.hidden=true;sheet.setAttribute('aria-label','Character details');game.appendChild(sheet);
 const object=document.createElement('section');object.id='simObjectMenu';object.hidden=true;object.setAttribute('aria-label','Object interactions');game.appendChild(object);
 function active(){const s=B.getState();return s.people[s.selected]?s.selected:'self'}
 function actionButton(id,who){
   let name=id.replace(/([a-z])([A-Z])/g,'$1 $2');
   const labels={cook:'Cook a Meal',snack:'Grab a Snack',shower:'Take a Shower',toilet:'Use Bathroom',
    sleep:'Go to Sleep',nap:'Take a Nap',tv:'Watch TV',talk:'Talk Together',read:'Read a Book',
    study:'Study Logic',paint:'Make Art',exercise:'Exercise',dance:'Dance',
    clean:'Clean the Kitchen',laundry:'Do Laundry',computer:'Use Computer',
    homework:'Do Homework',playdog:'Play with Dog',feedpet:'Feed Dog',
    dogfood:'Eat',dognap:'Sleep',dogplay:'Explore'};
   name=labels[id]||name;
   return '<button type="button" class="ss-action" data-sd-action="'+id+'" data-for="'+who+'">'+
     '<b>'+escapeText(name)+'</b><small>'+escapeText(actionDescription[id]||'')+'</small></button>'
 }
 function dismissObject(){object.hidden=true}
 function closePanel(){currentPanel='';sheet.hidden=true;dock.querySelectorAll('[data-sd-panel]').forEach(b=>b.classList.remove('active'))}
 function selectPerson(who){
   if(!['self','partner','kid','pet'].includes(who))return;
   B.selectPerson(who);dismissObject();refreshNow();
   if(currentPanel&&!sheet.hidden)renderSheet();
 }
 function showPanel(panel){
   const s=B.getState(),who=s.selected;
   if(s.isTown){closePanel();return}
   if(currentPanel===panel&&!sheet.hidden){closePanel();return}
   currentPanel=panel;sheet.hidden=false;dismissObject();
   dock.querySelectorAll('[data-sd-panel]').forEach(b=>b.classList.toggle('active',b.dataset.sdPanel===panel));
   renderSheet()
 }
 function renderSheet(){
   if(!currentPanel||sheet.hidden)return;
   const s=B.getState(),who=s.selected,p=s.people[who];
   const header='<div class="ss-head"><b>'+escapeText(
     currentPanel==='needs'?'Everyday Needs':currentPanel==='social'?'Relationships':currentPanel==='skills'?'Skills & Activities':'Life Aspirations'
   )+'</b><button class="ss-close" type="button" data-sd-close aria-label="Close">×</button></div>';
   let body='';
   if(currentPanel==='needs'){
     body='<p class="ss-muted">Care for '+names[who]+'. Needs change as the game clock runs. Low needs affect mood.</p>';
     for(const [need,name] of Object.entries(needNames)){
       const value=percent(p[need]);
       body+='<div class="ss-row"><div style="display:flex;justify-content:space-between"><b>'+name+'</b><span>'+value+'%</span></div>'+
         '<div class="ss-progress"><i style="width:'+value+'%;background:'+(value<25?'#d47767':value<50?'#d5a160':'#7fac73')+'"></i></div></div>'
     }
     body+='<p class="ss-muted" style="margin-top:12px">Suggested actions</p><div class="ss-grid">'+actions.needs[who].map(id=>actionButton(id,who)).join('')+'</div>';
   }else if(currentPanel==='social'){
     body='<p class="ss-muted">Spend time with family and neighbors to build lasting bonds.</p>';
     body+='<div class="ss-row"><b>Partner relationship</b> <strong style="float:right">'+s.relationships.partner+'%</strong><div class="ss-progress"><i style="width:'+s.relationships.partner+'%"></i></div></div>';
     body+='<div class="ss-row"><b>Kid trust</b> <strong style="float:right">'+s.relationships.kid+'%</strong><div class="ss-progress"><i style="width:'+s.relationships.kid+'%"></i></div></div>';
     body+='<p class="ss-muted" style="margin-top:12px">Social activities</p><div class="ss-grid">'+actions.social[who].map(id=>actionButton(id,who)).join('')+'</div>'+'<div style="margin-top:12px"><button class="ss-simple" data-sd-manage-family>FAMILY AUTONOMY & HABITS ↗</button></div>';
   }else if(currentPanel==='skills'){
     body='<p class="ss-muted">Practice activities to level up. Each character grows independently.</p>';
     for(const [skill,lvl] of Object.entries(p.skills)){
       const current=p.skillXp[skill]||0,need=lvl*35;
       body+='<div class="ss-row"><b>'+escapeText(skill)+'</b><span style="float:right">LEVEL '+lvl+(lvl>=10?' · MAX':'')+'</span>'+
         '<div class="ss-progress"><i style="width:'+Math.min(100,100*current/need)+'%"></i></div></div>'
     }
     body+='<p class="ss-muted" style="margin-top:12px">Practice skills</p><div class="ss-grid">'+actions.skills[who].map(id=>actionButton(id,who)).join('')+'</div>';
   }else{
     body='<p class="ss-muted">Choose a long-term ambition. Complete milestones to earn money and experience.</p>';
     for(const [id,a] of Object.entries(s.aspirations)){
       const stage=s.aspirationStages[id]||0,target=a.targets[Math.min(stage,a.targets.length-1)];
       const isDone=stage>=a.targets.length;
       const value=id===s.aspiration?s.aspirationValue:
          id==='home'?s.owned:id==='career'?s.careerShifts:id==='social'?Math.round((s.relationships.partner+s.relationships.kid)/2):
          Object.values(s.people.self.skills).reduce((x,y)=>x+y,0);
       body+='<div class="ss-asp '+(s.aspiration===id?'active':'')+'"><div style="min-width:0"><b>'+escapeText(a.title)+'</b>'+
         '<small>'+escapeText(a.desc)+'</small><small>'+(isDone?'COMPLETE':('STEP '+(stage+1)+' / '+a.targets.length+' · '+value+' / '+target))+'</small></div>'+
         '<button data-sd-asp="'+id+'">'+(s.aspiration===id?'ACTIVE':'SELECT')+'</button></div>'
     }
     body+='<p class="ss-muted">Home level '+s.homeLevel+' · Career level '+s.careerLevel+' · House Peace '+s.peace+'%.</p>';
   }
   sheet.innerHTML=header+body;lastSheetAt=Date.now()
 }
 function openObjectMenu(spot,mouseX,mouseY){
   const s=B.getState();if(!s.started||s.ended||s.isTown)return;
   const who=s.selected,options=actions.station[spot]||['talk','read','clean'];
   const allowed=options.filter(id=>who==='pet'?['dogfood','dognap','dogplay'].includes(id):
       !['dogfood','dognap','dogplay'].includes(id));
   if(!allowed.length)return;
   closePanel();
   const title={stove:'Stove & Kitchen',sink:'Sink & Counter',table:'Dining Table',desk:'Office Corner',kid:'Kids’ Corner',floor:'Open Floor',laundry:'Laundry & Bathroom',pet:'Dog’s Corner'}[spot]||'Household Object';
   object.innerHTML='<div class="so-decoration"></div><div class="so-head"><b>'+escapeText(title)+'</b><button class="so-close" data-sd-close-menu aria-label="Close">×</button></div>'+
      '<p class="so-muted">Choose what '+(who==='self'?'you want':names[who]+' wants')+' to do.</p>'+
      '<div class="so-grid">'+allowed.map(id=>actionButton(id,who).replace('class="ss-action"','class="so-action"')).join('')+'</div>';
   object.hidden=false;
   if(typeof mouseX==='number'&&innerWidth>750){
     const x=Math.min(innerWidth-200,Math.max(200,mouseX)),y=Math.min(innerHeight-290,Math.max(160,mouseY));
     object.style.left=x+'px';object.style.top=y+'px';
   }else{object.style.left='50%';object.style.top='42%'}
 }
 function renderQueue(s){
   const who=s.selected,p=s.people[who];
   const parts=[];
   if(p.active){parts.push('<button aria-label="Cancel current activity" data-sd-cancel="-1" data-sd-cancel-who="'+who+'">▶ '+escapeText(actionNames(p.active.id))+' · '+Math.max(0,Math.ceil(p.active.left))+'m ×</button>')}
   p.queue.forEach((id,index)=>parts.push('<button aria-label="Cancel queued action" data-sd-cancel="'+index+'" data-sd-cancel-who="'+who+'">'+(index+1)+'. '+escapeText(actionNames(id))+' ×</button>'));
   const html=parts.length?parts.join(''):'<span class="sd-idle">◷ '+(p.busy?'BUSY':'IDLE')+' · '+(s.paused?'PAUSED':'TIME IS RUNNING')+'</span>';
   if(html!==lastQueueSignature){lastQueueSignature=html;q('#simQueue').innerHTML=html}
 }
 function actionNames(id){
   const map={cook:'Cooking',snack:'Eating',shower:'Shower',toilet:'Bathroom',sleep:'Sleeping',nap:'Resting',tv:'Watching TV',talk:'Talking',read:'Reading',study:'Studying',paint:'Making Art',exercise:'Exercising',dance:'Dancing',clean:'Cleaning',laundry:'Laundry',computer:'Computer',homework:'Homework',playdog:'Playing',feedpet:'Feeding Dog',dogfood:'Eating',dognap:'Napping',dogplay:'Exploring'};
   return map[id]||id
 }
 function refreshNow(){
   const s=B.getState();
   if(!s.started||s.ended){dock.hidden=true;closePanel();dismissObject();return}
   dock.hidden=false;
   const who=s.selected,p=s.people[who],mood=p.mood;
   q('#simActiveName').textContent=names[who]||'You';
   q('#simMood').textContent=mood.label;q('#simMood').dataset.tone=mood.tone;
   const id=s.aspiration,a=s.aspirations[id],stage=s.aspirationStages[id]||0,target=a.targets[Math.min(stage,a.targets.length-1)];
   q('#simAspName').textContent=a.title+' · '+(stage>=a.targets.length?'Completed':(s.aspirationValue+' / '+target));
   q('#simAspBar').style.width=(stage>=a.targets.length?100:Math.min(100,s.aspirationValue/target*100))+'%';
   for(const [need,value] of Object.entries(p)){
     const node=q('[data-sd-need="'+need+'"]');
     if(!node)continue;
     const v=percent(value);node.classList.toggle('low',v<45);node.classList.toggle('critical',v<24);
     q('[data-need-val="'+need+'"]').textContent=v+'%';
     q('[data-need-bar="'+need+'"]').style.width=v+'%'
   }
   qa('[data-sd-who]').forEach(b=>{b.classList.toggle('selected',b.dataset.sdWho===who);b.setAttribute('aria-pressed',String(b.dataset.sdWho===who))});
   for(const id of ['self','partner','kid','pet'])q('[data-mini-energy="'+id+'"]').style.width=percent(s.people[id].energy)+'%';
   renderQueue(s);
   // Honor appearance customization after portraits have changed.
   for(const id of ['self','partner']){const f=face(id),node=q('[data-portrait="'+id+'"]');if(node&&node.innerHTML!==f)node.innerHTML=f}
   if(currentPanel&&!sheet.hidden&&Date.now()-lastSheetAt>4500)renderSheet()
 }
 dock.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b)return;
   if(b.dataset.sdWho){selectPerson(b.dataset.sdWho);return}
   if(b.dataset.sdPanel){showPanel(b.dataset.sdPanel);return}
   if(b.dataset.sdGo){
     closePanel();dismissObject();
     if(b.dataset.sdGo==='town')B.goTown();
     if(b.dataset.sdGo==='build')B.openBuild();
     if(b.dataset.sdGo==='chores')B.openChores();
     if(b.dataset.sdGo==='appearance')B.openAppearance();
   }
   if(b.dataset.sdCancel!==undefined){B.cancel(b.dataset.sdCancelWho,Number(b.dataset.sdCancel));refreshNow()}
 });
 sheet.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b)return;
   if(b.hasAttribute('data-sd-close')){closePanel();return}
   if(b.dataset.sdAsp){B.chooseAspiration(b.dataset.sdAsp);renderSheet();refreshNow();return}
   if(b.hasAttribute('data-sd-manage-family')){closePanel();B.openFamily();return}
   if(b.dataset.sdAction){B.action(b.dataset.sdAction,b.dataset.for);refreshNow();renderSheet()}
 });
 object.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b)return;
   if(b.hasAttribute('data-sd-close-menu')){dismissObject();return}
   if(b.dataset.sdAction){B.action(b.dataset.sdAction,b.dataset.for);dismissObject();refreshNow()}
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){dismissObject();closePanel()}});
 game.addEventListener('click',e=>{
   if(object.hidden)return;
   if(e.target.closest('#simObjectMenu,#simDock'))return;
   dismissObject()
 });
 // 2D object click takes precedence over the legacy chore-only picker.
 const room=document.getElementById('room');
 if(room)room.addEventListener('click',e=>{
   const t=e.target.closest('[data-station],.scene-item');
   if(!t||!B.live()||!game.classList.contains('sims-ui'))return;
   e.stopPropagation();e.stopImmediatePropagation();
   const spot=t.dataset.station||({charger:'desk',lost:'table',crumb:'table',snack:'stove'}[t.dataset.item]||'table');
   openObjectMenu(spot,e.clientX,e.clientY);
 },true);
 window.HouseBossSimUI={selectPerson,openObjectMenu,refreshNow,showPanel,closePanel};
 game.classList.add('sims-ui');
 setInterval(refreshNow,1100);refreshNow();
})();