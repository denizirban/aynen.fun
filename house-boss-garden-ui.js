/* House Boss / Garden & Build UI — controls the real saved game through bridges. */
(function(){
 'use strict';
 const $=s=>document.querySelector(s),root=()=>$('#noteBody'),bridge=()=>window.HouseBossGardenBridge,
  build=()=>window.HouseBossBuildBridge,three=()=>window.Evin3D,types=()=>window.HouseBossFurnitureTypes||{};
 let view='garden',filter='all',note='',selection=null;
 const icons={flowers:'✿',trees:'♣',planters:'▤','outdoor-seating':'▰',paths:'▦','outdoor-lighting':'☀','outdoor-decor':'◇'};
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const itemState=()=>three()?.getFurniturePlacement?.()||null;
 const itemDesc=t=>t.growthDays?'GROWS IN '+t.growthDays+' DAYS · +'+(t.beauty||0)+' BEAUTY':
  '✧ +'+(t.comfort||0)+' COMFORT';
 const tabBar=current=>'<nav class="hbg-tabs" aria-label="Home design mode">'+
  [['furniture','INDOOR'],['garden','GARDEN'],['build','BUILD / EXPAND']].map(([id,label])=>
   '<button type="button" class="'+(id===current?'active':'')+'" data-hd-category="'+id+'">'+label+'</button>').join('')+'</nav>';
 function picker(){
  const p=itemState();
  if(!p||types()[p.type]?.zone!=='garden')return '';
  const t=types()[p.type],name=esc(t.name),preview=p.mode==='preview';
  return '<div class="hbg-placement" role="group" aria-label="Garden placement controls">'+
   '<div><span>'+ (preview?'FREE 3D PREVIEW':p.uid?'MOVE OBJECT':'PLACE IN THE GARDEN')+'</span><strong>'+name+'</strong></div>'+
   '<p id="hbg-place-status" data-valid="'+Boolean(p.valid)+'">'+(p.valid?'GOOD SPOT':esc(p.reason||'Move to an open tile'))+'</p>'+
   '<div class="hbg-place-controls"><button data-hbg-turn>ROTATE ↻</button>'+
   '<button data-hbg-nudge="-0.5,0">←</button><button data-hbg-nudge="0,-0.5">↑</button>'+
   '<button data-hbg-nudge="0,0.5">↓</button><button data-hbg-nudge="0.5,0">→</button></div>'+
   '<div class="hbg-place-final"><button data-hbg-cancel>CANCEL</button>'+
   '<button data-hbg-confirm '+(!p.valid&&!preview?'disabled':'')+'>'+
   (preview?'CLOSE PREVIEW':p.uid?'SAVE LOCATION':'BUY & PLANT · $'+t.price)+'</button></div></div>'
 }
 function garden(s){
  const catalog=window.HouseBossGardenCatalog,items=(catalog?.ids||[]).map(id=>[id,types()[id]]).filter(([id,t])=>t&&
   (filter==='all'||filter==='new'&&t.level<=s.level||filter===t.category));
  const count=s.objects?.length||0,zoneIsLocked=!s.unlocked;
  const room=s.room||{level:1,price:0,available:false};
  const roomNote=zoneIsLocked?'<div class="hbg-unlock"><div><b>OPEN YOUR GARDEN</b>'+
   '<p>The outdoor room is not built yet. Unlock it once to start planting, collecting and decorating.</p>'+
   '<small>HOME LVL '+room.level+' · $'+room.price+'</small></div>'+
   '<button data-hbg-build="garden" '+(!room.available?'disabled':'')+'>'+
   (s.level<room.level?'LEVEL '+room.level+' REQUIRED':'BUILD GARDEN · $'+room.price)+'</button></div>':'';
  const overview='<div class="hbg-hero"><div><span>HOUSE BOSS / YOUR LITTLE OUTDOOR WORLD</span>'+
   '<h3>Let it grow.</h3><p>Plant a tree. Arrange the terrace. Collect unusual garden objects. A little fresh air changes everything.</p>'+
   '<div class="hbg-hero-pills"><b>'+s.plants+' PLANTS</b><b>'+s.beauty+' GARDEN BEAUTY</b><b>'+count+' OBJECTS</b></div></div>'+
   '<div class="hbg-hero-art">✿<small>GARDEN STUDIO</small></div></div>';
  let html=overview+roomNote;
  if(!zoneIsLocked)html+='<div class="hbg-callout"><div><b>YOUR LIVE 3D GARDEN IS READY</b><small>Place plants directly in the garden. Water to speed up growth; collect fruit when trees mature.</small></div><button data-hbg-focus>VIEW GARDEN ↗</button></div>';
  html+=picker();
  html+='<div class="hbg-section-title"><strong>GARDEN MARKET</strong><small>'+catalog.ids.length+' REAL 3D OBJECTS</small></div>'+
   '<div class="hbg-filters">'+[['all','ALL'],['new','UNLOCKED'],['flowers','FLOWERS'],['trees','TREES'],['planters','POTS'],['outdoor-seating','SEATING'],['paths','PATHS'],['outdoor-lighting','LIGHTS'],['outdoor-decor','DECOR']].map(([k,label])=>
    '<button class="'+(filter===k?'active':'')+'" data-hbg-filter="'+k+'">'+label+'</button>').join('')+'</div>';
  html+='<div class="hbg-catalogue">'+items.map(([id,t])=>{
   const locked=s.level<t.level,poor=s.cash<t.price;
   return '<article class="hbg-card '+(locked?'locked':'')+'">'+
    '<div class="hbg-model hbg-model-'+t.category+'" style="--hbg-color:'+t.color+'"><div class="hbg-model-icon">'+(icons[t.category]||'✦')+'</div>'+
     (t.growthDays?'<span class="hbg-growth-chip">'+t.growthDays+' GAME DAYS TO GROW</span>':'')+
     (locked?'<b class="hbg-card-locked">LEVEL '+t.level+'</b>':'<b class="hbg-card-ready">UNLOCKED</b>')+'</div>'+
    '<div class="hbg-card-copy"><span>'+esc(t.category).toUpperCase()+' · LVL '+t.level+'</span><h4>'+esc(t.name)+'</h4>'+
     '<p>'+esc(t.desc)+'</p><small>'+itemDesc(t)+'</small></div>'+
    '<div class="hbg-card-actions"><button data-hbg-preview="'+id+'" '+(zoneIsLocked?'disabled':'')+'>VIEW 3D</button>'+
     '<button data-hbg-buy="'+id+'" '+(zoneIsLocked||locked||poor?'disabled':'')+'>'+
      (zoneIsLocked?'BUILD GARDEN FIRST':locked?'LEVEL '+t.level:poor?'NEED $'+(t.price-s.cash):'BUY · $'+t.price)+'</button></div>'+
    '</article>'
  }).join('')+'</div>';
  html+='<div class="hbg-section-title"><strong>MY GARDEN</strong><small>WATER · HARVEST · REARRANGE</small></div>';
  html+='<div class="hbg-inventory">'+(count?s.objects.map(o=>{
   const t=types()[o.type],grow=!!t?.growthDays,stage=['SEEDLING','SPROUT','GROWING','MATURE'][o.stage]||'MATURE';
   return '<div class="hbg-item"><div class="hbg-item-icon" style="--hbg-color:'+t.color+'">'+(icons[t.category]||'✦')+'</div>'+
    '<div class="hbg-item-info"><b>'+esc(t.name)+'</b><small>'+(grow?stage+' · '+(o.stage/3*100).toFixed(0)+'% GROWN':'OUTDOOR OBJECT')+'</small>'+
     (grow?'<div class="hbg-plant-meter"><i style="width:'+(o.stage/3*100)+'%"></i></div>':'')+'</div>'+
    '<div class="hbg-item-actions">'+(grow?'<button data-hbg-water="'+o.uid+'" '+(o.wateredToday?'disabled':'')+'>'+(o.wateredToday?'WATERED':'WATER')+'</button>':'<button data-hbg-use="'+o.uid+'">USE</button>')+
     (o.harvest?'<button data-hbg-harvest="'+o.uid+'" '+(!o.canHarvest?'disabled':'')+'>HARVEST +$'+o.harvest+'</button>':'')+
     '<button data-hbg-move="'+o.uid+'">MOVE</button><button data-hbg-sell="'+o.uid+'" class="hbg-item-sell">SELL</button></div></div>'
  }).join(''):'<p class="hbg-empty">Your garden begins with one seed. Choose a flower or a little outdoor bench above.</p>')+'</div>';
  return html
 }
 function buildPanel(s){
  const opts=s.expansions||[];
  let html='<div class="hbg-hero hbg-build-hero"><div><span>HOUSE BOSS / ARCHITECTURE & EXPANSIONS</span>'+
   '<h3>More room to live.</h3><p>Build real new spaces in your 3D home — not just invisible upgrades. Each extension changes the world around you.</p>'+
   '<div class="hbg-hero-pills"><b>4 EXPANSIONS</b><b>'+(opts.filter(o=>o.owned).length)+' BUILT</b><b>HOME LVL '+s.level+'</b></div></div>'+
   '<div class="hbg-hero-art">⌂<small>BUILD MODE</small></div></div>'+
   '<div class="hbg-section-title"><strong>ARCHITECTURAL PROJECTS</strong><small>NEW SPACES · PROPERTY VALUE</small></div>';
  const room=s.room;
  if(room)html+='<article class="hbg-expansion '+(s.unlocked?'built':'')+'"><div class="hbg-expansion-icon">❀</div>'+
   '<div><span>FOUNDATION / OUTDOORS</span><h4>Garden Room</h4><p>A separate outdoor world for plants, paths, chairs and landscaping.</p>'+
   '<small>HOME LVL '+room.level+' · $'+room.price+'</small></div>'+
   '<button data-hbg-build="garden" '+(s.unlocked||!room.available?'disabled':'')+'>'+
    (s.unlocked?'✓ BUILT':s.level<room.level?'LEVEL '+room.level:'BUILD · $'+room.price)+'</button></article>';
  html+=opts.map(e=>'<article class="hbg-expansion '+(e.owned?'built':'')+'">'+
   '<div class="hbg-expansion-icon">'+({garden_patch:'✿',patio:'▤',greenhouse:'▱',studio:'⌂'}[e.id])+'</div>'+
   '<div><span>'+(e.id==='studio'?'HOME EXTENSION':'GARDEN EXPANSION')+' / LEVEL '+e.level+'</span>'+
    '<h4>'+esc(e.name)+'</h4><p>'+esc(e.desc)+'</p><small>'+esc(e.benefit)+'</small></div>'+
   '<button data-hbg-build="'+e.id+'" '+(e.owned||!e.available?'disabled':'')+'>'+
    (e.owned?'✓ BUILT':s.level<e.level?'LEVEL '+e.level:s.cash<e.price?'NEED $'+(e.price-s.cash):'BUILD · $'+e.price)+'</button></article>').join('');
  if(opts.some(e=>e.id==='studio'&&e.owned))html+='<button class="hbg-view-studio" data-hbg-studio>VIEW NEW GARDEN STUDIO IN 3D ↗</button>';
  return html
 }
 function render(kind){
  if(kind)view=kind;
  const B=bridge(),rootNode=root();if(!rootNode||!B)return;
  const s=B.getState(),heading=$('#noteTitle'),budget=$('#noteBudget');
  if(heading)heading.textContent=view==='build'?'Build & Expand':'The Garden Shop';
  if(budget)budget.textContent='$'+s.cash+' · HOME LVL '+s.level+' · DAY '+s.day;
  rootNode.innerHTML='<div class="hbg-app">'+tabBar(view)+(view==='build'?buildPanel(s):garden(s))+
   (note?'<p class="hbg-message" role="status">'+esc(note)+'</p>':'')+'</div>';
  updateStatus()
 }
 function findSpot(type){
  // Outdoor local coordinates: 3D renderer shifts to the garden room at z + 12.2.
  const xs=[-3.5,3.5,3,-3,2,-2,0,4,-4,1,-1,6,-6],zs=[2.5,3,1.5,-3,-1,0,-4,4];
  for(const z of zs)for(const x of xs){
   const p={type,x,z,rot:0,zone:'garden'};
   if(build()?.validate?.(p)?.ok)return p
  }
  return null
 }
 function start(type,uid,preview){
  const B=bridge(),api=build(),T=three(),s=B?.getState(),t=types()[type];
  if(!s?.unlocked){note='Unlock the Garden room in BUILD first.';render();return}
  if(!t||!T?.isReady){note='The 3D garden is not ready.';render();return}
  if(!preview&&!uid&&(s.level<t.level||s.cash<t.price)){note='This item is locked or cannot be afforded yet.';render();return}
  const owned=s.objects.find(o=>o.uid===uid);
  const pos=uid?{type:owned?.type,x:owned?.x,z:owned?.z,rot:owned?.rot,uid,mode:'move',zone:'garden'}:findSpot(type);
  if(!pos?.type){note='No free garden tiles. Move or sell another object.';render();return}
  if(preview)pos.mode='preview';
  T.focusRoom?.('garden');
  if(!T.beginFurniturePlacement?.(pos)){note='Unable to start garden placement.';render();return}
  T.focusFurniture?.(pos.x,pos.z);note='';render()
 }
 function stop(){three()?.cancelFurniturePlacement?.();note='';render()}
 function updateStatus(){
  const p=itemState(),node=$('#hbg-place-status');
  if(node&&p?.zone==='garden'){
   node.textContent=p.valid?'GOOD SPOT':p.reason||'Choose another tile';
   node.dataset.valid=String(!!p.valid)
  }
  const confirm=$('[data-hbg-confirm]');if(confirm)confirm.disabled=!p?.valid&&p?.mode!=='preview'
 }
 function finish(){
  const p=itemState(),api=build(),t=types()[p?.type];
  if(!p||p.zone!=='garden')return;
  if(p.mode==='preview'){stop();return}
  if(!p.valid){note=p.reason||'Choose a valid garden tile.';render();return}
  const success=p.uid?api.move?.(p.uid,p.x,p.z,p.rot):api.buy?.(p.type,p.x,p.z,p.rot,t.price);
  if(!success){note='Could not save this placement. Check your space and funds.';render();return}
  three()?.cancelFurniturePlacement?.();three()?.syncFurnitureNow?.();note='';render()
 }
 function install(){
  const body=root();if(!body)return;
  body.addEventListener('click',e=>{
   const b=e.target.closest('[data-hbg-buy]');if(b){start(b.dataset.hbgBuy);return}
   const p=e.target.closest('[data-hbg-preview]');if(p){start(p.dataset.hbgPreview,null,true);return}
   const sel=e.target.closest('[data-hbg-filter]');if(sel){filter=sel.dataset.hbgFilter;render();return}
   const focus=e.target.closest('[data-hbg-focus]');if(focus){bridge()?.focus?.();return}
   const studio=e.target.closest('[data-hbg-studio]');if(studio){bridge()?.focusStudio?.();return}
   const exp=e.target.closest('[data-hbg-build]');if(exp){
    const id=exp.dataset.hbgBuild;
    if(bridge()?.build?.(id)){note='Construction complete. Your new space is ready in 3D.';three()?.syncFurnitureNow?.();if(id==='studio')bridge()?.focusStudio?.();else bridge()?.focus?.()}
    else note='Not available yet. Check your funds, level and Garden room.';
    render();return
   }
   const water=e.target.closest('[data-hbg-water]');if(water){note=bridge()?.water?.(water.dataset.hbgWater)?'Watered. Check again tomorrow.':'Already watered today.';render();return}
   const harvest=e.target.closest('[data-hbg-harvest]');if(harvest){note=bridge()?.harvest?.(harvest.dataset.hbgHarvest)?'Fresh harvest collected.':'Not ready for harvest.';render();return}
   const use=e.target.closest('[data-hbg-use]');if(use){note=bridge()?.use?.(use.dataset.hbgUse)?'A good moment outdoors.':'Action unavailable.';render();return}
   const move=e.target.closest('[data-hbg-move]');if(move){const o=bridge()?.getState()?.objects.find(x=>x.uid===move.dataset.hbgMove);if(o)start(o.type,o.uid);return}
   const sell=e.target.closest('[data-hbg-sell]');if(sell){
    const o=bridge()?.getState()?.objects.find(x=>x.uid===sell.dataset.hbgSell);
    if(o&&window.confirm('Sell '+o.name+'?')){build()?.sell?.(o.uid);three()?.syncFurnitureNow?.();render()}
    return
   }
   if(e.target.closest('[data-hbg-cancel]')){stop();return}
   if(e.target.closest('[data-hbg-confirm]')){finish();return}
   if(e.target.closest('[data-hbg-turn]')){three()?.rotateFurniture?.();updateStatus();return}
   const n=e.target.closest('[data-hbg-nudge]');if(n){const [x,z]=n.dataset.hbgNudge.split(',').map(Number);three()?.nudgeFurniture?.(x,z);updateStatus();return}
  })
 }
 install();
 window.HouseBossGardenUI={render,stop,updateStatus,selectFrom3D(uid){
  const s=bridge()?.getState(),obj=s?.objects?.find(o=>o.uid===uid);
  if(obj){window.HouseBossHomeDesign?.selectCategory?.('garden');start(obj.type,uid)}
 }};
})();
