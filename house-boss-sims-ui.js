/* HOUSE BOSS / SIMS-LIKE CONTROL HUD.
   Presentation only; authoritative gameplay runs in HouseBossSimBridge.
   No replacement of the original 3D kitchen, save, or town systems. */
(function(){
 'use strict';
 const B=window.HouseBossSimBridge,game=document.getElementById('game');
 if(!B||!game)return;
 const q=s=>game.querySelector(s),qa=s=>Array.from(game.querySelectorAll(s));
 let currentPanel='',socialTarget='partner',lastSheetAt=0,portraitFingerprint='',lastQueueSignature='',lastStatusKey='';
 const names={self:'You',partner:'Partner',kid:'Kid',pet:'Dog'};
 /* COMPACT_NEEDS_RENDER_V5 — fast contextual care and small nonmodal sheet */
 const careActions={
   self:{hunger:'snack',energy:'nap',hygiene:'shower',bladder:'toilet',fun:'tv',social:'talk'},
   partner:{hunger:'snack',energy:'nap',hygiene:'shower',bladder:'toilet',fun:'tv',social:'talk'},
   kid:{hunger:'snack',energy:'nap',hygiene:'shower',bladder:'toilet',fun:'tv',social:'talk'},
   pet:{hunger:'dogfood',energy:'dognap',hygiene:'groom',bladder:'dogplay',fun:'dogplay',social:'dogplay'}
 };
 const needNames={hunger:'Hunger',energy:'Energy',hygiene:'Hygiene',bladder:'Bladder',fun:'Fun',social:'Social'};
 const symbols={hunger:'◈',energy:'☾',hygiene:'◉',bladder:'◧',fun:'♫',social:'♡'};

 /* HOUSE_BOSS_VECTOR_ICONS_V6 — original SVG icon vocabulary. */
 const iconPaths={
 hunger:'<path d="M4 3v8M7 3v8M10 3v8M7 11v10M4 11h6M17 3c-4 4-4 9 0 12h3V3zM18 15v6"/>',
 energy:'<path d="M13 2L5 13h7l-1 9 8-12h-7z"/>',
 hygiene:'<path d="M3 8V6a4 4 0 018 0v2M2 9h12M4 13v2M8 13v2M12 13v2M5 18v2M11 18v2"/>',
 bladder:'<path d="M12 2c-2 4-7 9-7 13a7 7 0 0014 0c0-4-5-9-7-13z"/>',
 fun:'<circle cx="12" cy="12" r="9"/><path d="M8 10h.01M16 10h.01M8 15c2 3 6 3 8 0"/>',
 social:'<path d="M20 11a7 7 0 01-7 7H6l-3 3v-7a7 7 0 017-10h3a7 7 0 017 7z"/><path d="M9 11l3 3 3-3"/>',
 needs:'<path d="M20.5 8.8c0 4.9-8.5 11.2-8.5 11.2S3.5 13.7 3.5 8.8A4.4 4.4 0 0112 7a4.4 4.4 0 018.5 1.8z"/><path d="M4 12h4l2-3 3 6 2-3h5"/>',
 skills:'<path d="M12 2l2.5 6 6.5.5-5 4.5 1.5 6.5-5.5-3.5-5.5 3.5L8 13 3 8.5 9.5 8z"/>',
 goals:'<path d="M4 5h16v4a8 8 0 01-16 0zM4 7H2v2a5 5 0 005 5M20 7h2v2a5 5 0 01-5 5M12 17v4M8 21h8"/>',
 chores:'<path d="M16 3L8 15M6 15l6 4M5 14l6 5-4 3-5-4z"/>',
 town:'<path d="M3 10l9-7 9 7v11H3zM8 21v-8h8v8"/>',
 build:'<path d="M3 21l12-12M12 5l7-2 2 7-3 3-7-7z"/>',
 appearance:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0116 0v2"/>',
 hub:'<path d="M3 10l9-7 9 7v11H3zM9 21v-6h6v6M7 11h.01M17 11h.01"/>',
 food:'<path d="M12 7c-2-3-5-3-7-1-5 5 0 15 5 15l2-1 2 1c5 0 10-10 5-15-2-2-5-2-7 1zM12 8c0-4 2-6 5-6"/>',
 rest:'<path d="M18 3A9 9 0 1021 18 8 8 0 0118 3z"/>',
 dog:'<path d="M5 10L3 5l4 2 5-2 5 2 4-2-2 5v7l-7 4-7-4zM8 13h.01M16 13h.01M10 17h4"/>',
 basket:'<path d="M3 10h18l-2 11H5zM7 10l5-8 5 8M8 14v3M12 14v3M16 14v3"/>',
 wallet:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M12 8v8M9 11h6"/>'
 };
 function ico(name){return '<svg class="sim-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(iconPaths[name]||iconPaths.skills)+'</svg>'}
 const actIcons={cook:'food',snack:'food',shower:'hygiene',toilet:'bladder',sleep:'rest',nap:'rest',tv:'fun',talk:'social',read:'skills',study:'skills',paint:'skills',exercise:'energy',dance:'fun',clean:'chores',laundry:'hygiene',computer:'skills',homework:'skills',playdog:'dog',feedpet:'dog',dogfood:'food',dognap:'rest',dogplay:'dog',groom:'hygiene'};

 const actionDescription={
   cook:'Prepare a proper meal and practice cooking.',snack:'Quick food for a small appetite.',shower:'Freshen up and feel comfortable.',
   toilet:'Take care of a basic need.',sleep:'Sleep until you feel rested.',nap:'Get some energy back.',
   tv:'A little entertainment.',talk:'Enjoy a conversation with family.',read:'Improve your Logic skill.',
   study:'Work hard on your Logic skill.',paint:'Make something creative.',exercise:'Train and improve Fitness.',
   dance:'Move around and have fun.',clean:'Improve House Peace and tidy up.',laundry:'Keep the house running.',
   computer:'Practice creativity on the computer.',homework:'Learn something new.',playdog:'Play with your companion.',
   feedpet:'A happy dog is a well-fed dog.',dogfood:'Dinner time.',dognap:'A proper dog nap.',dogplay:'A little adventure.',groom:'A clean, happy dog.'
 };
 const actions={
   needs:{self:['cook','snack','shower','toilet','sleep','tv'],partner:['cook','snack','shower','toilet','nap','talk'],kid:['snack','shower','toilet','nap','tv','homework'],pet:['dogfood','dognap','groom','dogplay']},
   social:{self:['talk','playdog','dance','tv'],partner:['talk','playdog','dance'],kid:['talk','playdog','dance'],pet:['dogplay','groom','dognap']},
   skills:{self:['cook','read','study','paint','exercise','computer'],partner:['cook','read','paint','exercise'],kid:['homework','read','paint','exercise'],pet:['groom','dogplay']},
   station:{
     stove:['cook','snack','clean'],
     sink:['shower','clean','laundry'],
     table:['snack','talk','read','tv'],
     desk:['computer','study','read','paint'],
     kid:['homework','read','talk','nap'],
     floor:['exercise','dance','clean'],
     laundry:['laundry','shower','toilet'],
     pet:['feedpet','playdog','dogfood','dognap','groom','dogplay']
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
   '<div class="sd-need" data-sd-need="'+need+'"><div class="sd-need-top"><span class="sd-need-label">'+ico(need)+' '+needNames[need]+'</span><b data-need-val="'+need+'">80</b></div>'+
   '<div class="sd-track"><i data-need-bar="'+need+'" style="width:80%"></i></div></div>'
 ).join('');
 dock.innerHTML='<div class="sd-queue" id="simQueue" aria-live="polite"></div>'+
 '<div class="sd-portraits" aria-label="Select family member">'+portraitHtml+'</div>'+
 '<div class="sd-identity"><small class="sd-kicker">ACTIVE CHARACTER</small><strong class="sd-name" id="simActiveName">You</strong>'+
 '<span class="sd-mood" id="simMood" data-tone="happy">Happy</span><span class="sd-asp-name" id="simAspName"></span>'+
 '<div class="sd-asp-track"><i id="simAspBar" style="width:0%"></i></div></div>'+
 '<div class="sd-needs" aria-label="Six life needs">'+bars+'</div>'+
 '<div class="sd-buttons" aria-label="Character controls">'+
 '<button type="button" data-sd-panel="needs" aria-label="Needs"><span class="sd-menu-icon">'+ico('needs')+'</span>NEEDS</button>'+
 '<button type="button" data-sd-panel="social" aria-label="Social and relationships"><span class="sd-menu-icon">'+ico('social')+'</span>SOCIAL</button>'+
 '<button type="button" data-sd-panel="skills" aria-label="Skills"><span class="sd-menu-icon">'+ico('skills')+'</span>SKILLS</button>'+
 '<button type="button" data-sd-panel="goals" aria-label="Life goals"><span class="sd-menu-icon">'+ico('goals')+'</span>GOALS</button>'+
 '<button type="button" data-sd-go="chores" aria-label="Open household chores"><span class="sd-menu-icon">'+ico('chores')+'</span>CHORES</button>'+
 '<button type="button" data-sd-go="town" aria-label="Go to town"><span class="sd-menu-icon">'+ico('town')+'</span>TOWN</button>'+
 '<button type="button" data-sd-go="build" aria-label="Build and upgrade home"><span class="sd-menu-icon">'+ico('build')+'</span>BUILD</button>'+ 
 '<button type="button" data-sd-go="lifehub" aria-label="Open Life Hub overview"><span class="sd-menu-icon">'+ico('hub')+'</span>LIFE</button>'+
 '<button type="button" data-sd-go="appearance" aria-label="Customize character appearance"><span class="sd-menu-icon">'+ico('appearance')+'</span>STYLE</button></div>';
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
    dogfood:'Eat',dognap:'Sleep',dogplay:'Explore',groom:'Brush Dog'};
   if(id.startsWith('bond_'))name=( {chat:'Chat',joke:'Tell a Joke',compliment:'Compliment',support:'Offer Support',argue:'Argue',apologize:'Apologize'}[id.split('_')[1]]||'Connect' );
   name=labels[id]||name;
   return '<button type="button" class="ss-action" data-sd-action="'+id+'" data-for="'+who+'">'+
     '<b><span class="ss-action-icon">'+ico(id.startsWith('bond_')?'social':(actIcons[id]||'skills'))+'</span>'+escapeText(name)+'</b><small>'+escapeText(actionDescription[id]||'')+'</small></button>'
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
   B.closeChores?.();
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
      body='<p class="ss-muted">'+names[who]+' · Tap any need to add its care action to the queue.</p>';
      body+='<div class="ss-need-grid">';
      for(const [need,name] of Object.entries(needNames)){
        const value=percent(p[need]),care=careActions[who][need];
        const moodClass=value<25?'critical':value<45?'low':'';
        body+='<button type="button" class="ss-need-card '+moodClass+'" data-sd-care="'+care+'" data-for="'+who+'" title="Care for '+name+'">'+
          '<div class="ss-need-line"><span class="ss-need-label">'+ico(need)+name+'</span><strong>'+value+'%</strong></div>'+
          '<span class="ss-progress"><i style="width:'+value+'%"></i></span></button>';
      }
      body+='</div><div class="ss-pantry">'+ico('basket')+' <b>PANTRY</b><span>'+(s.finance?.pantry??0)+' meals</span><button type="button" data-sd-shop>BUY FOOD</button></div><div class="ss-section-heading"><span>QUICK ACTIONS</span><small>Tap to start or queue</small></div>';
      const priorities=Object.keys(needNames).sort((a,b)=>percent(p[a])-percent(p[b]));
      const shown=[];
      for(const need of priorities){
        const id=careActions[who][need];
        if(!shown.includes(id))shown.push(id);
        if(shown.length===4)break;
      }
      body+='<div class="ss-grid">'+shown.map(id=>actionButton(id,who)).join('')+'</div>';
    
}else if(currentPanel==='social'){
     /* HOUSE_BOSS_RELATION_UI_V6 */
     const targets=['self','partner','kid','pet'].filter(t=>t!==who);
     if(!targets.includes(socialTarget))socialTarget=targets[0];
     body='<p class="ss-muted">Choose someone to spend time with. Each relationship changes through your actions.</p>';
     body+='<div class="ss-relation-targets">'+targets.map(t=>{
       const key=[who,t].sort().join(':'),value=Math.round(s.relationships.matrix[key]??65);
       return '<button class="ss-rel-person '+(socialTarget===t?'active':'')+'" type="button" data-sd-rel-target="'+t+'"><span>'+((t==='pet')?'♧':'♡')+'</span><b>'+names[t]+'</b><small>'+value+'%</small></button>'
     }).join('')+'</div>';
     const relKey=[who,socialTarget].sort().join(':'),bond=Math.round(s.relationships.matrix[relKey]??65);
     body+='<div class="ss-rel-detail"><strong>'+names[who]+' + '+names[socialTarget]+'</strong><span>'+bond+'% relationship</span><div class="ss-progress"><i style="width:'+bond+'%"></i></div></div>';
     if(who==='pet'){
       body+='<div class="ss-grid">'+actions.social.pet.map(id=>actionButton(id,who)).join('')+'</div>';
     }else{
       const moves=socialTarget==='pet'?['chat','joke','compliment','support']:['chat','joke','compliment','support','argue','apologize'];
       body+='<div class="ss-grid">'+moves.map(id=>actionButton('bond_'+id+'_'+socialTarget,who)).join('')+'</div>';
     }
     body+='<div class="ss-freewill"><div><b>Household Free Will</b><small>Unselected adults can care for their own needs.</small></div><button data-sd-freewill aria-pressed="'+!!s.freeWill+'">'+(s.freeWill?'ON':'OFF')+'</button></div>'+
      '<button class="ss-simple" data-sd-manage-family>FAMILY AUTONOMY & HABITS ↗</button>';
   }else if(currentPanel==='skills'){
     body='<p class="ss-muted">Practice activities to level up. Each character grows independently.</p>';
     body+='<div class="ss-section-heading"><span>PERSONALITY</span><small>Shapes free will and skills</small></div>';
     body+='<div class="ss-traits">'+Object.entries(s.traits).filter(([id])=>who!=='pet'||id==='playful').map(([id,trait])=>
       '<button type="button" class="ss-trait '+(p.trait===id?'active':'')+'" '+(who==='pet'?'disabled':'')+' data-sd-trait="'+id+'" data-for="'+who+'" title="'+escapeText(trait.desc)+'">'+escapeText(trait.name)+'</button>'
     ).join('')+'</div>';
     body+='<p class="ss-muted">'+escapeText(s.traits[p.trait]?.desc||'')+'</p>';
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
     
     /* HOUSE_BOSS_WISHES_UI_V6 — visible daily objectives & budget. */
     body+='<div class="ss-section-heading"><span>'+ico('goals')+' TODAY’S WISHES</span><small>Rewards on completion</small></div>';
     body+='<div class="ss-wishes">'+(s.wishes||[]).map(w=>
       '<div class="ss-wish '+(w.complete?'done':'')+'"><span class="ss-wish-check">'+(w.complete?'✓':ico('goals'))+'</span>'+
       '<div><b>'+escapeText(w.title)+'</b><small>'+(w.complete?'COMPLETED':w.done+' / '+w.goal)+' · +$'+w.bonus+'</small></div></div>'
     ).join('')+'</div>';
     body+='<div class="ss-section-heading"><span>'+ico('wallet')+' HOUSEHOLD FINANCES</span></div>';
     body+='<div class="ss-finance"><div><small>CASH</small><strong>$'+s.money+'</strong></div>'+
       '<div><small>FOOD STOCK</small><strong>'+(s.finance?.pantry??0)+'</strong></div>'+
       '<div><small>UNPAID BILLS</small><strong>$'+(s.finance?.debt??0)+'</strong></div></div>';
     body+='<button class="ss-simple ss-grocery-link" data-sd-shop>'+ico('basket')+' VISIT MARKET TO RESTOCK</button>';
     body+='<p class="ss-muted">Long-term ambitions unlock milestone rewards. Daily wishes are refreshed each morning.</p>';

     body+='<p class="ss-muted">Home level '+s.homeLevel+' · Career level '+s.careerLevel+' · House Peace '+s.peace+'%.</p>';
   }
   sheet.innerHTML=header+body;lastSheetAt=Date.now()
 }
 function openObjectMenu(spot,mouseX,mouseY){
   const s=B.getState();if(!s.started||s.ended||s.isTown)return;
   const who=s.selected,options=actions.station[spot]||['talk','read','clean'];
   const allowed=options.filter(id=>who==='pet'?['dogfood','dognap','groom','dogplay'].includes(id):
       !['dogfood','dognap','groom','dogplay'].includes(id));
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
   const map={cook:'Cooking',snack:'Eating',shower:'Shower',toilet:'Bathroom',sleep:'Sleeping',nap:'Resting',tv:'Watching TV',talk:'Talking',read:'Reading',study:'Studying',paint:'Making Art',exercise:'Exercising',dance:'Dancing',clean:'Cleaning',laundry:'Laundry',computer:'Computer',homework:'Homework',playdog:'Playing',feedpet:'Feeding Dog',dogfood:'Eating',dognap:'Napping',dogplay:'Exploring',groom:'Being Groomed'};
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
     if(b.dataset.sdGo==='lifehub')window.HouseBossLifestyle?.open?.();
     if(b.dataset.sdGo==='chores')B.openChores();
     if(b.dataset.sdGo==='appearance')B.openAppearance();
   }
   if(b.dataset.sdCancel!==undefined){B.cancel(b.dataset.sdCancelWho,Number(b.dataset.sdCancel));refreshNow()}
 });
 sheet.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b)return;
   if(b.hasAttribute('data-sd-close')){closePanel();return}
   if(b.dataset.sdAsp){B.chooseAspiration(b.dataset.sdAsp);renderSheet();refreshNow();return}
   if(b.dataset.sdTrait){B.chooseTrait(b.dataset.for,b.dataset.sdTrait);renderSheet();refreshNow();return}
   if(b.dataset.sdRelTarget){socialTarget=b.dataset.sdRelTarget;renderSheet();return}
   if(b.hasAttribute('data-sd-freewill')){B.toggleFreeWill();renderSheet();return}
   if(b.hasAttribute('data-sd-shop')){closePanel();B.goTown();window.HouseBossTownBridge?.selectVenue?.('market');return}
   if(b.dataset.sdCare){B.action(b.dataset.sdCare,b.dataset.for);refreshNow();renderSheet();return}
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