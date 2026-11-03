
/* House Boss Life Hub V2 — persistent, actionable, read-only until player clicks. */
(function(){
'use strict';
const B=window.HouseBossLifestyleBridge,build=()=>window.HouseBossBuildBridge;
const book=document.getElementById('notebook'),body=document.getElementById('noteBody'),level=document.getElementById('levelWidget');
if(!B||!book||!body||!level)return;
let section='overview',plannerPerson='self',plannerNotice='';
const sections=[['overview','OVERVIEW'],['planner','DAILY PLANNER'],['career','CAREER'],['home','HOME & DESIGN'],['finance','FINANCES']];
const fmt=n=>'$'+Math.round(Number(n)||0).toLocaleString('en-US');
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=n=>Math.max(0,Math.min(100,Math.round(Number(n)||0)));
const bar=(v,tone='green')=>'<div class="hbl-bar '+tone+'"><i style="width:'+pct(v)+'%"></i></div>';
const nextMilestone=s=>s.milestones.find(m=>!m.claimed);
function progress(m,s){return Math.round((Math.min(1,s.homeLevel/m.level)+Math.min(1,s.quality.score/m.quality)+Math.min(1,s.careerLevel/m.career))/3*100)}
function metric(label,value,sub){return '<div class="hbl-metric"><span>'+label+'</span><strong>'+value+'</strong><small>'+sub+'</small></div>'}
function pageTabs(){
 return '<nav class="hbl-tabs">'+sections.map(([id,label])=>'<button type="button" data-hbl-tab="'+id+'" class="'+(section===id?'active':'')+'">'+label+'</button>').join('')+'</nav>'
}
function needsBrief(s){
 const p=s.needs.self||{};
 const keys=['hunger','hygiene','bladder','fun','social','energy'];
 const worst=keys.sort((a,b)=>Number(p[a]||0)-Number(p[b]||0))[0];
 const label={hunger:'Hunger',hygiene:'Hygiene',bladder:'Bathroom',fun:'Fun',social:'Social',energy:'Energy'}[worst];
 return {label,value:pct(p[worst]),action:worst==='energy'?'Take a rest':'Care for '+label.toLowerCase()}
}
function priority(s){
 const f=s.peaceFactors,n=needsBrief(s);
 if(s.debt>=45)return {tag:'BUDGET ALERT',title:'Get the bills under control',copy:'Debt reduces household peace. Paying it down helps the home recover.',action:'finance',text:'VIEW FINANCES'};
 if(n.value<38)return {tag:'YOUR NEXT MOVE',title:n.action,copy:'Your lowest personal need is '+n.value+'%. Restoring daily needs supports mood and peace.',action:'planner',text:'PLAN DAILY CARE'};
 if(f.chores<65)return {tag:'HOUSEHOLD PRIORITY',title:'Share the chores',copy:'Overdue and unfinished work is putting pressure on your home.',action:'chores',text:'OPEN CHORES'};
 if(s.quality.score<42)return {tag:'INTERIOR GOAL',title:'Upgrade your space',copy:'Better furniture increases comfort and makes everyday activities more rewarding.',action:'build',text:'DESIGN YOUR HOME'};
 return {tag:'YOUR NEXT MOVE',title:'Build the next chapter',copy:'Your home is becoming a place to thrive. Work, design and collect new experiences.',action:'career',text:'EXPLORE CAREERS'}
}
function milestoneList(s,compact){
 const arr=compact?s.milestones.filter(m=>!m.claimed).slice(0,2):s.milestones;
 if(!arr.length)return '<div class="hbl-complete">Every chapter completed. Your home is a legacy.</div>';
 return '<div class="hbl-milestones">'+arr.map((m,i)=>{
  const amount=progress(m,s);
  return '<article class="hbl-milestone '+(m.claimed?'completed ':m.ready?'ready ':'locked')+'">'+
   '<div class="hbl-medal">'+(m.claimed?'✓':m.ready?'✦':String(i+1).padStart(2,'0'))+'</div>'+
   '<div class="hbl-milestone-copy"><div class="hbl-caption">'+(m.claimed?'COLLECTED':m.ready?'REWARD READY':'UPCOMING CHAPTER')+'</div>'+
   '<strong>'+esc(m.title)+'</strong><small>'+esc(m.desc)+'</small>'+
   '<div class="hbl-milestone-req"><span>HOME '+s.homeLevel+'/'+m.level+'</span><span>QUALITY '+s.quality.score+'/'+m.quality+'</span><span>CAREER '+s.careerLevel+'/'+m.career+'</span></div>'+
   bar(amount)+'</div>'+
   '<div class="hbl-milestone-reward"><b>'+fmt(m.reward)+'</b><small>+ '+m.xp+' XP</small>'+
   (m.claimed?'<span class="hbl-done">CLAIMED</span>':m.ready?'<button type="button" data-hbl-claim="'+m.id+'">CLAIM</button>':'<span class="hbl-notyet">LOCKED</span>')+
   '</div></article>'
 }).join('')+'</div>'
}
function decisionCard(s){
 const ev=s.event;if(!ev)return '';
 const chosen=ev.options.find(o=>o.id===ev.selected);
 return '<section class="hbl-daily-event '+(ev.selected?'resolved':'')+'">'+
 '<div class="hbl-event-icon">✧</div><div class="hbl-event-content"><span class="hbl-eyebrow">LIFE MOMENT / DAY '+s.day+(ev.selected?' · RESOLVED':' · YOUR DECISION')+'</span>'+
 '<h4>'+esc(ev.title)+'</h4><p>'+esc(ev.desc)+'</p>'+
 (ev.selected?'<div class="hbl-event-result">✓ '+esc(chosen?.label||'Choice made')+' · Tomorrow brings a new situation.</div>':
 '<div class="hbl-event-options">'+ev.options.map(o=>'<button type="button" data-hbl-decide="'+esc(o.id)+'" '+(!o.available?'disabled':'')+'>'+
 '<strong>'+esc(o.label)+'</strong><small>'+esc(o.desc)+'</small></button>').join('')+'</div>')+
 '</div></section>'
}
function overview(s){
 const f=s.peaceFactors,p=priority(s),m=nextMilestone(s);
 const factors=[['NEEDS',f.needs,'The people in this home'],['RELATIONSHIPS',f.relationships,'Family connections'],['HOME QUALITY',f.home,'Furniture and design'],['CHORES',f.chores,'Work left unfinished']];
 return '<div class="hbl-hero"><div><span class="hbl-eyebrow">YOUR LIFE / DAY '+s.day+'</span><h3>Build the life you want.</h3><p>Your home changes with every choice — what you buy, how you work, and how you live.</p>'+
 '<div class="hbl-hero-actions"><button data-hbl-go="build">DESIGN HOME</button><button class="hbl-outline" data-hbl-go="career">CAREER PATH</button><button class="hbl-outline" data-hbl-go="planner">DAILY PLANNER</button></div></div>'+
 '<div class="hbl-house-emblem"><span>⌂</span><b>LVL '+s.homeLevel+'</b><small>'+esc(s.quality.tier)+'</small></div></div>'+
 '<div class="hbl-metrics">'+metric('HOME LEVEL',s.homeLevel+' / 20',s.homeXP+' / '+s.homeNext+' XP')+
 metric('CAREER',s.careerLevel+' / 12',esc(s.careerRank))+
 metric('COMFORT',s.quality.comfort,'From your furnishings')+
 metric('NET WORTH',fmt(s.netWorth),'Home + cash − debt')+'</div>'+decisionCard(s)+
 '<div class="hbl-dual"><section class="hbl-panel"><div class="hbl-panel-title"><div><span>HOUSEHOLD WELL-BEING</span><h4>Why is House Peace at '+s.peace+'%?</h4></div><b class="hbl-peace-num">'+s.peace+'%</b></div>'+
 '<p class="hbl-muted">Current balance target: '+f.target+'%. Peace moves gradually toward this value as daily conditions improve.</p>'+
 factors.map(([label,value,ex])=>'<div class="hbl-factor"><div><b>'+label+'</b><strong>'+pct(value)+'%</strong></div>'+bar(value,value<42?'warm':'green')+'<small>'+ex+'</small></div>').join('')+
 (s.debt?'<p class="hbl-warning">Unpaid bills: '+fmt(s.debt)+' · reduces peace</p>':'')+
 '<button class="hbl-link" data-hbl-go="needs">IMPROVE DAILY NEEDS →</button></section>'+
 '<section class="hbl-panel hbl-next-action"><span class="hbl-eyebrow">'+p.tag+'</span><h4>'+p.title+'</h4><p>'+p.copy+'</p>'+
 '<button class="hbl-primary" data-hbl-go="'+p.action+'">'+p.text+'</button>'+
 '<div class="hbl-nextline"><span>YOUR NEXT MILESTONE</span><b>'+(m?esc(m.title):'All milestones achieved')+'</b>'+
 (m?bar(progress(m,s)):'')+'</div></section></div>'+
 '<div class="hbl-section-title"><div><span>LONG-TERM PROGRESSION</span><h4>Your next chapters</h4></div><button data-hbl-tab="home">SEE ALL →</button></div>'+
 milestoneList(s,true)
}
function careers(s){
 const tracks=[['creative','DESIGN & TECH','Studio jobs, creativity and leadership'],['business','BUSINESS','Retail, operations and management'],['hospitality','HOSPITALITY','Service, people and guest experiences']];
 const xpLeft=s.careerLevel>=12?0:125-(s.careerXP%125);
 const jobs=s.careerJobs.slice().sort((a,b)=>a.level-b.level||b.pay-a.pay);
 return '<div class="hbl-section-lead"><span>YOUR WORKING LIFE</span><h3>Make a career, not just a paycheck.</h3><p>Build work experience and personal skills to unlock higher-level jobs, earn more and furnish the home you imagine.</p></div>'+
 '<div class="hbl-career-spotlight"><div><small>YOUR CURRENT ROLE</small><h4>'+esc(s.careerRank)+'</h4><span>CAREER LVL '+s.careerLevel+' · PARTNER LVL '+s.partnerCareerLevel+'</span>'+
 bar(s.careerLevel>=12?100:(s.careerXP%125)/125*100)+
 '<p>'+(s.careerLevel>=12?'Highest career level achieved.':'Next promotion in '+xpLeft+' career XP.')+'</p></div>'+
 '<div><b>'+fmt(s.earned)+'</b><small>TOTAL HOUSEHOLD WAGES EARNED</small></div></div>'+
 '<div class="hbl-section-title"><div><span>CHOOSE YOUR SPECIALIZATION</span><h4>Three ways to make it</h4></div></div>'+
 '<div class="hbl-track-grid">'+tracks.map(([id,title,desc])=>'<button type="button" class="hbl-track '+(s.focus===id?'active':'')+'" data-hbl-focus="'+id+'" '+(s.focusChangedDay===s.day&&s.focus!==id?'disabled':'')+'>'+
 '<span>'+(s.focus===id?'YOUR PATH':'SPECIALIZE')+'</span><strong>'+title+'</strong><small>'+desc+'</small><b>'+ (s.focus===id?'✓ ACTIVE':'+12% PAY / XP')+'</b></button>').join('')+'</div>'+
 '<p class="hbl-muted">Matching shifts pay 12% more and earn extra career XP. You can change your direction once each game day.</p>'+
 '<div class="hbl-section-title"><div><span>CAREER LADDER</span><h4>What becomes possible</h4></div><button data-hbl-go="town">GO TO WORK →</button></div>'+
 '<div class="hbl-job-list">'+jobs.filter(j=>j.track===s.focus).map(j=>
 '<div class="hbl-job '+(s.careerLevel<j.level?'locked':'available')+'"><span class="hbl-job-level">LVL '+j.level+'</span><div><b>'+esc(j.title)+'</b><small>'+esc(j.track.toUpperCase())+' · '+j.mins+' in-game min</small></div><strong>'+fmt(j.pay)+'</strong><span class="hbl-job-lock">'+(s.careerLevel>=j.level?'UNLOCKED':'LOCKED')+'</span></div>').join('')+'</div>'
}
function home(s){
 const t=window.HouseBossFurnitureTypes||{},future=Object.entries(t).filter(([id,x])=>x.level>s.homeLevel).sort((a,b)=>a[1].level-b[1].level);
 const next=future[0];
 const wishlist=s.wishlist.map(id=>[id,t[id]]).filter(x=>x[1]);
 const repair=s.furniture.filter(x=>x.condition<98).sort((a,b)=>a.condition-b.condition);
 const ownedItems=s.furniture.slice().sort((a,b)=>a.condition-b.condition);
 return '<div class="hbl-section-lead"><span>YOUR INTERIOR JOURNEY</span><h3>From first apartment to dream home.</h3><p>Every object has a story and a purpose. Comfort grows with your design choices, while favorite pieces last longer when maintained.</p></div>'+
 '<div class="hbl-metrics">'+metric('HOME QUALITY',s.quality.score+'%',esc(s.quality.tier))+
 metric('TOTAL COMFORT',s.quality.comfort,'Improves rest and mood')+
 metric('FURNITURE',s.furniture.length,'Placed in 3D')+
 metric('SAVED FOR LATER',wishlist.length,'Future purchases')+'</div>'+
 '<div class="hbl-dual"><section class="hbl-panel"><span class="hbl-eyebrow">NEXT COLLECTION</span><h4>'+(next?esc(next[1].name):'Everything unlocked')+'</h4>'+
 '<p>'+(next?'Unlock at Home Level '+next[1].level+' · '+fmt(next[1].price)+' · +'+next[1].comfort+' comfort.':'You have unlocked the entire furniture collection.')+'</p>'+
 '<div class="hbl-lock-track">'+(future.length?future.slice(0,4).map(([id,m])=>'<span>LVL '+m.level+' · '+esc(m.name)+'</span>').join(''):'All collections available')+'</div>'+
 '<button class="hbl-primary" data-hbl-go="build">OPEN FURNITURE CATALOG</button></section>'+
 '<section class="hbl-panel"><span class="hbl-eyebrow">YOUR DESIGN SAVES</span><h4>Wishlist</h4>'+
 (wishlist.length?'<div class="hbl-wishlist">'+wishlist.slice(0,6).map(([id,m])=>'<div><i style="background:'+m.color+'"></i><span>'+esc(m.name)+'</span><strong>'+fmt(m.price)+'</strong><small>LVL '+m.level+'</small></div>').join('')+'</div>':'<p>Save pieces in Build Mode to collect furniture ideas for later levels.</p>')+
 '<button class="hbl-link" data-hbl-go="build">BROWSE COLLECTIONS →</button></section></div>'+
 '<div class="hbl-section-title"><div><span>HOME MAINTENANCE</span><h4>Your installed furniture</h4></div><small>'+repair.length+' need care</small></div>'+
 (ownedItems.length?'<div class="hbl-item-list">'+ownedItems.map(o=>{let m=t[o.type]||{name:o.type,color:'#9da5a2'};return '<div class="hbl-item"><i style="background:'+m.color+'"></i><div><b>'+esc(m.name)+'</b><small>CONDITION '+Math.round(o.condition)+'% · +'+(m.comfort||0)+' COMFORT</small>'+
 bar(o.condition,o.condition<55?'warm':'green')+'</div>'+
 (o.condition<98?'<button type="button" data-hbl-repair="'+esc(o.uid)+'" '+(s.cash<B.repairCost(o.uid)?'disabled':'')+'>REPAIR '+fmt(B.repairCost(o.uid))+'</button>':'<span class="hbl-maintained">GOOD</span>')+
 '</div>'}).join('')+'</div>':'<div class="hbl-empty">No movable furniture yet. Design your first room to begin.</div>')+
 '<div class="hbl-section-title"><div><span>HOME ACHIEVEMENTS</span><h4>Milestones</h4></div></div>'+milestoneList(s,false)
}

/* The planner uses the authoritative action queue: it does not simulate imaginary actions. */
const familyLabels={self:'YOU',partner:'PARTNER',kid:'KID',pet:'DOG'};
const needLabels={hunger:'HUNGER',hygiene:'HYGIENE',bladder:'BATHROOM',energy:'ENERGY',fun:'FUN',social:'SOCIAL'};
const actionLabels={toilet:'Use Bathroom',shower:'Take a Shower',snack:'Have a Snack',nap:'Take a Nap',
 read:'Read & Relax',tv:'Watch TV',talk:'Talk Together',playdog:'Play with Dog',
 dogplay:'Play & Explore',groom:'Get Groomed',dogfood:'Eat Dog Food',dognap:'Dog Nap'};
function routinePreview(s,who,id){
 let steps=[];
 if(id==='care')steps=s.carePlans?.[who]||[];
 else steps=({morning:{self:['toilet','shower','snack'],partner:['toilet','shower','snack'],kid:['toilet','shower','snack'],pet:['dogplay','groom','dogfood']},
 unwind:{self:['nap','snack','read'],partner:['nap','snack','read'],kid:['nap','snack','tv'],pet:['dognap','dogfood','dogplay']},
 connect:{self:['talk','playdog','tv'],partner:['talk','playdog','tv'],kid:['talk','playdog','tv'],pet:['dogplay','groom','dognap']}})[id]?.[who]||[];
 return steps.map(a=>actionLabels[a]||a).join(' → ');
}
function planner(s){
 const who=plannerPerson,p=s.needs[who]||{},current=p.active,queue=p.queue||[];
 const needs=Object.entries(needLabels).map(([id,name])=>{
  const val=pct(p[id]),tone=val<30?'urgent':val<50?'low':'fine';
  return '<div class="hbl-person-need '+tone+'"><div><b>'+name+'</b><strong>'+val+'%</strong></div>'+
   bar(val,val<50?'warm':'green')+'</div>'
 }).join('');
 const canPlan=!(who==='kid'&&s.school);
 const activeName=current?(actionLabels[current.id]||current.id):p.busy?'BUSY WITH OTHER TASKS':'AVAILABLE';
 const list=(queue||[]).map((id,i)=>'<div class="hbl-planned-action"><span class="hbl-queue-number">'+(i+1)+'</span>'+
  '<b>'+esc(actionLabels[id]||id)+'</b><button data-hbl-cancel="'+i+'" aria-label="Remove planned action">REMOVE</button></div>').join('');
 const plans=[{id:'care',title:'Smart Care',desc:'Start with the needs that matter most.',icon:'✚'},
  {id:'morning',title:'Morning Reset',desc:'Get clean, fed and ready for the day.',icon:'◌'},
  {id:'unwind',title:'Unwind & Rest',desc:'Recover energy without rushing.',icon:'☾'},
  {id:'connect',title:'Quality Time',desc:'Relationships and play matter too.',icon:'♡'}];
 return '<div class="hbl-section-lead"><span>HOUSEHOLD / DAY '+s.day+'</span><h3>Small routines. A better everyday.</h3>'+
 '<p>Make plans for each household member. Actions use real game time, household resources and the existing action queue.</p></div>'+
 '<nav class="hbl-person-tabs" aria-label="Select household member">'+Object.keys(familyLabels).map(key=>{
 const m=s.needs[key]||{},av=Math.round(Object.values(needLabels).reduce((sum,n,i)=>sum+pct(m[Object.keys(needLabels)[i]]),0)/6);
 return '<button type="button" class="'+(who===key?'active ':'')+(av<45?'needs-help':'')+'" data-hbl-person="'+key+'">'+
 '<span class="hbl-person-avatar '+key+'">'+familyLabels[key].slice(0,1)+'</span>'+
 '<span><strong>'+familyLabels[key]+'</strong><small>'+av+'% WELL-BEING</small></span></button>'
 }).join('')+'</nav>'+
 '<div class="hbl-planner-grid"><section class="hbl-panel hbl-planner-needs"><div class="hbl-panel-title"><div><span>DAILY NEEDS</span><h4>'+familyLabels[who]+' · How are things?</h4></div><b class="hbl-planner-status">'+esc(p.mood?.label||'Fine')+'</b></div>'+
 '<div class="hbl-person-needs">'+needs+'</div>'+
 '<div class="hbl-autonomy"><div><b>FREE WILL</b><small>'+(who==='pet'?'The dog always follows its own needs.':who==='self'?'Your Sim can act autonomously when not selected.':'Let this character make their own choices.')+'</small></div>'+
 '<button type="button" data-hbl-autonomy="'+who+'" '+(who==='pet'?'disabled':'')+' aria-pressed="'+Boolean(s.autonomy?.[who])+'">'+(s.autonomy?.[who]?'ON':'OFF')+'</button></div></section>'+
 '<section class="hbl-panel hbl-planner-queue"><span class="hbl-eyebrow">ACTION QUEUE</span><h4>Now & Next</h4>'+
 '<div class="hbl-active-now"><span class="hbl-status-dot '+(current?'busy':'')+'"></span><div><small>RIGHT NOW</small><b>'+esc(activeName)+'</b>'+(current?bar(100*(1-(current.left||0)/Math.max(1,current.total||1))):'')+'</div></div>'+
 '<div class="hbl-queue-steps">'+(list||'<p class="hbl-muted">Nothing queued. Pick a routine below to make a plan.</p>')+'</div>'+
 '<div class="hbl-queue-footer"><span>'+queue.length+' / 3 queued</span><span>'+(s.autonomy?.[who]?'AUTONOMY ENABLED':'MANUAL CONTROL')+'</span></div></section></div>'+
 '<div class="hbl-section-title"><div><span>ONE-TAP ACTIVITY PLANNING</span><h4>Choose a routine</h4></div><small>3 actions max per queue</small></div>'+
 '<div class="hbl-routines">'+plans.map(plan=>{
 const preview=routinePreview(s,who,plan.id);
 return '<article class="hbl-routine-card"><div class="hbl-routine-symbol">'+plan.icon+'</div><div><h4>'+plan.title+'</h4><p>'+plan.desc+'</p>'+
 '<small>'+esc(preview)+'</small></div><button type="button" data-hbl-routine="'+plan.id+'" '+(!canPlan||queue.length>=3?'disabled':'')+'>PLAN →</button></article>'
 }).join('')+'</div>'+
 (plannerNotice?'<div class="hbl-planner-notice" role="status">'+esc(plannerNotice)+'</div>':'')+
 '<p class="hbl-muted">Scheduled actions are charged when they begin, and can be removed individually. If a character is busy, new actions wait their turn. School and full queues prevent scheduling.</p>'
}
function finances(s){
 const daily=s.dailyBills,months=7*daily;
 const saving=s.debt>0?Math.min(s.debt,s.cash):0;
 return '<div class="hbl-section-lead"><span>YOUR HOUSEHOLD ECONOMY</span><h3>Build a beautiful life, within your means.</h3><p>Jobs fund furniture, renovations and daily living. Income, home value and unpaid bills follow your saved game.</p></div>'+
 '<div class="hbl-metrics">'+metric('AVAILABLE CASH',fmt(s.cash),'Ready to spend')+
 metric('PROPERTY VALUE',fmt(s.propertyValue),'Improvements purchased')+
 metric('UNPAID BILLS',fmt(s.debt),'Outstanding')+
 metric('NET WORTH',fmt(s.netWorth),'Cash + home − bills')+'</div>'+
 '<div class="hbl-dual"><section class="hbl-panel"><span class="hbl-eyebrow">HOUSEHOLD BUDGET</span><h4>Keep the lights on</h4>'+
 '<div class="hbl-ledger"><div><span>Daily household bills</span><b>'+fmt(daily)+'</b></div><div><span>Seven game days</span><b>'+fmt(months)+'</b></div><div><span>Total career earnings</span><b>'+fmt(s.earned)+'</b></div><div><span>Bills paid so far</span><b>'+fmt(s.paidBills)+'</b></div><div><span>Pantry meals remaining</span><b>'+s.pantry+'</b></div></div>'+
 (s.debt?'<div class="hbl-pay-row"><button data-hbl-pay="'+Math.min(45,s.debt,s.cash)+'" '+(s.cash<=0?'disabled':'')+'>PAY UP TO $45</button><button data-hbl-pay="'+s.debt+'" '+(s.cash<=0?'disabled':'')+'>PAY AS MUCH AS POSSIBLE</button></div>':
 '<p class="hbl-positive">All household bills are up to date.</p>')+'</section>'+
 '<section class="hbl-panel hbl-finance-advice"><span class="hbl-eyebrow">YOUR NEXT SMART MOVE</span><h4>'+(s.debt?'Clear unpaid bills first':'Plan your next upgrade')+'</h4>'+
 '<p>'+(s.debt?'Debt can lower House Peace. Paying it back helps your household recover.':'Keep enough money for daily expenses, then invest in comfort and home value.')+'</p>'+
 '<div class="hbl-saving-line"><span>7-DAY LIVING BUFFER</span><b>'+fmt(Math.max(0,s.cash))+' / '+fmt(months)+'</b>'+bar(months?Math.round(s.cash/months*100):100)+'</div>'+
 '<button class="hbl-primary" data-hbl-go="'+(s.debt?'career':'build')+'">'+(s.debt?'EARN MORE AT WORK':'BROWSE HOME UPGRADES')+'</button></section></div>'
}
function render(){
 if(book.classList.contains('hidden')||!B.getState().started)return;
 const s=B.getState();book.classList.add('lifehub-mode');book.classList.remove('design-mode');
 document.getElementById('noteTitle').textContent='Life Hub';
 document.getElementById('noteBudget').textContent=fmt(s.cash)+' · DAY '+s.day+' · '+s.quality.tier;
 body.innerHTML='<div class="hbl-app">'+pageTabs()+(section==='overview'?overview(s):section==='planner'?planner(s):section==='career'?careers(s):section==='home'?home(s):finances(s))+'</div>';
}
const mainTab=document.createElement('button');mainTab.type='button';mainTab.dataset.tab='lifestyle';mainTab.textContent='LIFE HUB';
const tabs=book.querySelector('.note-tabs');tabs?.insertBefore(mainTab,tabs.firstChild);
mainTab.addEventListener('click',()=>B.open('lifestyle'));
const trigger=document.createElement('button');trigger.type='button';trigger.id='hbLifeHubTrigger';trigger.innerHTML='<span>YOUR LIFE AT A GLANCE</span><b>OPEN LIFE HUB ↗</b>';trigger.onclick=()=>B.open('lifestyle');
level.appendChild(trigger);
body.addEventListener('click',e=>{
 const btn=e.target.closest('button');if(!btn||!book.classList.contains('lifehub-mode'))return;
 if(btn.dataset.hblTab){section=btn.dataset.hblTab;plannerNotice='';render();return}
 if(btn.dataset.hblPerson){plannerPerson=btn.dataset.hblPerson;plannerNotice='';render();return}
 if(btn.dataset.hblRoutine){
  const out=B.routine(plannerPerson,btn.dataset.hblRoutine);
  plannerNotice=out.ok?'Scheduled '+out.added.length+' action(s) for '+familyLabels[plannerPerson]+'.'+(out.skipped?.length?' Some steps were skipped.':''):out.reason||'Unable to schedule.';
  render();return
 }
 if(btn.dataset.hblCancel!==undefined){B.cancelPlanned(plannerPerson,Number(btn.dataset.hblCancel));plannerNotice='Removed a queued action.';render();return}
 if(btn.dataset.hblAutonomy){B.toggleAutonomy(btn.dataset.hblAutonomy);render();return}
 if(btn.dataset.hblDecide){if(B.decide(btn.dataset.hblDecide))render();return}
 if(btn.dataset.hblClaim){if(B.claim(btn.dataset.hblClaim))render();return}
 if(btn.dataset.hblRepair){if(B.repair(btn.dataset.hblRepair))render();return}
 if(btn.dataset.hblPay!==undefined){if(B.payDebt(Number(btn.dataset.hblPay)))render();return}
 if(btn.dataset.hblFocus){B.focus(btn.dataset.hblFocus);render();return}
 if(btn.dataset.hblGo){
  const go=btn.dataset.hblGo;
  if(go==='planner'){section='planner';plannerNotice='';render()}
  else if(go==='career'){section='career';render()}
  else if(go==='finance'){section='finance';render()}
  else if(go==='build')B.openBuild();
  else if(go==='town')B.goTown();
  else if(go==='needs')B.goNeeds();
  else if(go==='chores'){B.goChores()}
 }
});
const observer=new MutationObserver(()=>{
 if(book.classList.contains('hidden'))book.classList.remove('lifehub-mode');
});
observer.observe(book,{attributes:true,attributeFilter:['class']});
window.HouseBossLifestyle={render,open:()=>B.open('lifestyle')};
})();
