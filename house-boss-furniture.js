/* HOUSE BOSS FURNITURE V1 — real saved 3D furnishing, drag/place, rotate, move, sell. */
(function(){
'use strict';
const types={
  plant:{name:'Fiddle Leaf Plant',price:65,color:'#648d60',w:.70,d:.70,icon:'✿',desc:'Greenery for a calmer home.',benefit:'Home peace +1 each morning',action:'clean'},
  bookshelf:{name:'Oak Bookshelf',price:240,color:'#af8158',w:1.25,d:.58,icon:'▤',desc:'Books and a place to think.',benefit:'Reading develops Logic faster',action:'read'},
  floorlamp:{name:'Arc Floor Lamp',price:135,color:'#e2c386',w:.65,d:.65,icon:'☼',desc:'A warm little reading corner.',benefit:'A brighter household',action:'read'},
  armchair:{name:'Accent Armchair',price:225,color:'#a8786b',w:1.25,d:1.15,icon:'▱',desc:'Your own place to unwind.',benefit:'Rest and fun bonus',action:'nap'},
  ottoman:{name:'Velvet Ottoman',price:105,color:'#8ca8a1',w:.85,d:.75,icon:'▱',desc:'Put your feet up.',benefit:'Extra comfort on breaks',action:'nap'},
  petbed:{name:'Dog Bed',price:155,color:'#9c8675',w:1.2,d:1.0,icon:'♡',desc:'A good place for a good dog.',benefit:'Dog recovers extra energy',action:'dognap'},
  easel:{name:'Artist Easel',price:285,color:'#c18b5b',w:1.10,d:.95,icon:'✎',desc:'Space for creative practice.',benefit:'Painting raises Creativity faster',action:'paint'},
  yogamat:{name:'Yoga Mat',price:115,color:'#769d88',w:1.65,d:.75,icon:'⌁',desc:'A moment to move.',benefit:'Exercise raises Fitness faster',action:'exercise'},
  sidetable:{name:'Round Side Table',price:110,color:'#ae9375',w:.75,d:.75,icon:'◯',desc:'Somewhere to put your cup.',benefit:'More enjoyable conversations',action:'talk'},
  stereo:{name:'Music Console',price:305,color:'#5c7f87',w:1.1,d:.66,icon:'♫',desc:'Put a little music on.',benefit:'Dancing is more fun',action:'dance'},
  loungechair:{name:'Soft Lounge Chair',price:390,color:'#b8a98f',w:1.28,d:1.23,icon:'▱',level:2,tier:'modern',comfort:10,desc:'Sculpted curves and supportive cushions.',action:'nap',shape:'chair'},
  loveseat:{name:'Modular Loveseat',price:620,color:'#b6978d',w:2.05,d:1.13,icon:'▰',level:3,tier:'modern',comfort:14,desc:'Two deep cushions and tailored upholstery.',action:'nap',shape:'sofa'},
  recliner:{name:'Leather Recliner',price:920,color:'#816d5e',w:1.15,d:1.26,icon:'▱',level:5,tier:'premium',comfort:20,desc:'A comfortable reclining seat in rich leather.',action:'nap',shape:'chair'},
  walnutdesk:{name:'Walnut Work Desk',price:1060,color:'#8e6449',w:1.55,d:.79,icon:'▤',level:5,tier:'premium',comfort:10,desc:'Solid walnut, slim brass details, storage.',action:'computer',shape:'desk'},
  chaise:{name:'Velvet Chaise',price:1470,color:'#9e857d',w:2.05,d:.95,icon:'▰',level:7,tier:'premium',comfort:25,desc:'A soft sculptural chaise for slow evenings.',action:'nap',shape:'sofa'},
  daybed:{name:'Boutique Daybed',price:1760,color:'#b0a8a0',w:1.95,d:.95,icon:'▰',level:8,tier:'premium',comfort:27,desc:'An upholstered daybed with tailored cushions.',action:'nap',shape:'sofa'},
  pendant:{name:'Architectural Floor Lamp',price:980,color:'#d6ba84',w:.68,d:.68,icon:'☼',level:7,tier:'premium',comfort:8,desc:'Brass architecture with a warm linen shade.',action:'read',shape:'lamp'},
  statementsofa:{name:'Cloud Sectional',price:2450,color:'#d9cabb',w:2.38,d:1.24,icon:'▰',level:10,tier:'luxury',comfort:34,desc:'Deep oversized cushions and rounded edges.',action:'nap',shape:'sofa'},
  hifi:{name:'Designer Hi-Fi System',price:1850,color:'#6f766e',w:1.20,d:.67,icon:'♫',level:10,tier:'luxury',comfort:15,desc:'Walnut sound cabinet with analog detailing.',action:'dance',shape:'media'},
  grandbookcase:{name:'Gallery Bookcase',price:2200,color:'#9b7757',w:1.48,d:.58,icon:'▤',level:12,tier:'luxury',comfort:16,desc:'Tall crafted oak shelving with curved edges.',action:'read',shape:'shelf'}
};
const firstLevels={plant:1,bookshelf:2,floorlamp:1,armchair:2,ottoman:1,petbed:1,easel:2,yogamat:1,sidetable:1,stereo:3};
const firstComfort={plant:1,bookshelf:3,floorlamp:2,armchair:7,ottoman:3,petbed:4,easel:2,yogamat:2,sidetable:2,stereo:5};
Object.entries(types).forEach(([id,t])=>{
 t.level=t.level||firstLevels[id]||1;t.tier=t.tier||(t.level>=5?'premium':t.level>=2?'modern':'starter');
 t.comfort=t.comfort??firstComfort[id]??2;
 t.shape=t.shape||({armchair:'chair',ottoman:'chair',floorlamp:'lamp',bookshelf:'shelf',sidetable:'desk',stereo:'media'}[id]||id)
});
const defaults=[[-8,-4],[-6.5,-4],[-7.5,-2.5],[-6,-2.5],
 [-2.5,4],[0,4],[1.5,4],[4.5,4],
 [-2.5,-4],[0,-4],[3,-4],[-8,2],[-8,4],[-6,4]];
const bridge=()=>window.HouseBossBuildBridge;
let selectedUid=null,warning='',filter='all';
const collections={starter:'EVERYDAY',modern:'CONTEMPORARY',premium:'DESIGN STUDIO',luxury:'SIGNATURE'};
function floor2(v){return Math.round(Number(v)*2)/2}
function safeCandidate(type){
 for(const [x,z] of defaults){const p={type,x,z,rot:0};if(bridge()?.validate?.(p)?.ok)return p}
 for(let z=-4.0;z<=4;z+=.5)for(let x=-8;x<=5;x+=.5){
  let p={type,x,z,rot:0};if(bridge()?.validate?.(p)?.ok)return p
 }
 return null
}
function sceneCandidate(){return window.Evin3D?.getFurniturePlacement?.()||null}
function view(){return document.getElementById('noteBody')}
function clear(){
 window.Evin3D?.cancelFurniturePlacement?.();
 selectedUid=null;warning='';
}
function begin(type,uid){
 const st=bridge()?.getState?.();if(!st||!types[type])return;
 if(!uid&&st.level<types[type].level){warning='Reach Home Level '+types[type].level+' to unlock '+types[type].name+'.';render();return}
 if(!uid&&st.cash<types[type].price){warning='You need $'+(types[type].price-st.cash)+' more.';render();return}
 let item=uid?st.furniture.find(f=>f.uid===uid):null;
 if(uid&&!item)return;
 let p=item?{type,x:item.x,z:item.z,rot:item.rot||0,uid,mode:'move'}:safeCandidate(type);
 if(!p){warning='There is no free space. Move or sell another object first.';render();return}
 let ok=window.Evin3D?.beginFurniturePlacement?.(p);
 if(!ok){warning='3D world is not ready.';render();return}
 selectedUid=uid||null;warning='';
 window.Evin3D?.focusFurniture?.(p.x,p.z);
 render();
}
function confirm(){
 const item=sceneCandidate();if(!item||!item.valid){warning=item?.reason||'Choose a free space highlighted in green.';render();return}
 const ok=item.uid?bridge()?.move?.(item.uid,item.x,item.z,item.rot):
   bridge()?.buy?.(item.type,item.x,item.z,item.rot,types[item.type].price);
 if(!ok){warning='Unable to place furniture. Check space and budget.';render();return}
 clear();window.Evin3D?.syncFurnitureNow?.();render()
}
function rotate(){window.Evin3D?.rotateFurniture?.();updateStatus()}
function nudge(dx,dz){window.Evin3D?.nudgeFurniture?.(dx,dz);updateStatus()}
function updateStatus(){
 let p=sceneCandidate(),el=document.getElementById('hb-build-position');
 if(el){
  el.textContent=p?(p.valid?'VALID POSITION':'BLOCKED · '+(p.reason||'Move to a clear tile')):'';
  el.dataset.valid=String(!!p?.valid)
 }
 const save=document.querySelector('[data-hbf-confirm]');if(save)save.disabled=!p?.valid
}
function sell(uid){
 const st=bridge()?.getState?.(),item=st?.furniture?.find(o=>o.uid===uid);
 if(!item)return;
 if(!confirmSale(item))return;
 clear();
 if(bridge()?.sell?.(uid)){window.Evin3D?.syncFurnitureNow?.();render()}
}
function confirmSale(item){return window.confirm('Sell '+types[item.type].name+' for $'+Math.floor(types[item.type].price*(.20+.30*(item.condition||100)/100))+'? This removes the item from your home.')}
function placeBar(){
 const p=sceneCandidate(),type=types[p?.type];
 if(!p||!type)return '';
 return '<div class="hbf-placement">'+
  '<div class="hbf-place-heading"><span>NOW PLACING</span><b>'+type.name+'</b></div>'+
  '<p>Drag the object across the 3D floor or use the arrows. Red means the space is blocked.</p>'+
  '<div id="hb-build-position" class="hbf-status" data-valid="'+!!p.valid+'">'+(p.valid?'VALID POSITION':'BLOCKED · '+(p.reason||'Move to an open area'))+'</div>'+
  '<div class="hbf-place-buttons"><button type="button" data-hbf-turn>ROTATE 90° ↻</button>'+
  '<div class="hbf-dpad"><button data-hbf-nudge="0,-.5" aria-label="Move back">↑</button>'+
  '<button data-hbf-nudge="-.5,0" aria-label="Move left">←</button>'+
  '<button data-hbf-nudge="0,.5" aria-label="Move forward">↓</button>'+
  '<button data-hbf-nudge=".5,0" aria-label="Move right">→</button></div></div>'+
  '<div class="hbf-action-row"><button data-hbf-cancel>CANCEL</button>'+
  '<button data-hbf-confirm '+(!p.valid?'disabled':'')+'>'+(p.uid?'SAVE POSITION':'BUY & PLACE · $'+type.price)+'</button></div></div>';
}
function render(){
 const root=view(),st=bridge()?.getState?.();if(!root||!st)return;
 document.getElementById('noteTitle').textContent='Furnish your Home';
 const budget=document.getElementById('noteBudget');if(budget)budget.textContent='$'+st.cash+' · Home Value $'+st.homeValue;
 const all=Object.entries(types).sort((a,b)=>a[1].level-b[1].level||a[1].price-b[1].price);
 const homeLevel=Math.max(1,st.level||1),comfort=st.comfort||0;
 const nextUnlock=all.find(([,item])=>item.level>homeLevel);
 const available=all.filter(([,item])=>item.level<=homeLevel).length;
 const wishlist=st.wishlist||[];
 const pieces=st.furniture||[];
 let quality=st.quality||{score:0,tier:'First Place',furniture:pieces.length};
 let html='<nav class="hd-categories" aria-label="Home design categories"><button class="active" type="button" data-hd-category="furniture"><span>▣</span>Furniture</button>'+
 Object.entries(window.HouseBossHomeDesign?.catalog||{}).map(([k,v])=>'<button type="button" data-hd-category="'+k+'"><span>'+v.icon+'</span>'+v.label+'</button>').join('')+'</nav>'+
 '<div class="hbf-head"><span>BUILD MODE / FURNITURE</span><strong>HOME LVL '+homeLevel+' · '+pieces.length+' INSTALLED</strong></div>'+
 '<p class="hbf-sub">Buy, move, rotate and arrange real furniture in your 3D home. Work in progress is not charged until you place it.</p>'+
 '<div class="hbf-quality"><div><strong>'+quality.tier+'</strong><b>HOME QUALITY · '+quality.score+'%</b></div><div class="hbf-quality-track"><i style="width:'+quality.score+'%"></i></div>'+
 '<div class="hbf-lifestyle-stats"><span><b>'+comfort+'</b><small>COMFORT</small></span><span><b>'+available+'/'+all.length+'</b><small>UNLOCKED</small></span><span><b>'+homeLevel+'/20</b><small>HOME LEVEL</small></span></div>'+
 '<small>Quality furniture makes relaxing more rewarding and helps household well-being.</small></div>'+
 '<div class="hbf-next"><div><b>YOUR NEXT UNLOCK</b><strong>'+(nextUnlock?'LVL '+nextUnlock[1].level+' · '+nextUnlock[1].name:'ALL COLLECTIONS UNLOCKED')+'</strong><small>'+(nextUnlock?'Earn Home XP by doing chores, meeting wishes and improving your space.':'The collection is yours to explore.')+'</small></div><span class="hbf-lock-symbol">◆</span></div>';
 if(warning)html+='<div class="hbf-warning" role="status">'+warning+'</div>';
 html+=placeBar();
 html+='<div class="hbf-section-title"><strong>HOUSE ROOMS</strong><small>Build and explore</small></div>'+
 '<div class="hbf-room-tiles">'+(st.rooms||[]).map(room=>{
   const status=room.id==='home'?'ALWAYS OPEN':room.installed?'BUILT':'LEVEL '+room.level;
   return '<article class="hbf-room"><strong>'+room.name+'</strong><small>'+status+'</small>'+
    (room.installed?'<button data-hbf-room="'+room.id+'">VIEW IN 3D ↗</button>':
    '<button data-hbf-room-buy="'+room.id+'" '+(!room.available?'disabled':'')+'>'+
    (room.available?'BUILD · $'+room.price:'UNLOCK · LVL '+room.level+' · $'+room.price)+'</button>')+'</article>'
 }).join('')+'</div>';
 html+='<div class="hbf-section-title"><strong>FURNITURE COLLECTIONS</strong><small>'+available+'/'+all.length+' unlocked</small></div>'+
 '<div class="hbf-filters"><button data-hbf-filter="all" class="'+(filter==='all'?'active':'')+'">ALL</button><button data-hbf-filter="available" class="'+(filter==='available'?'active':'')+'">SHOP NOW</button><button data-hbf-filter="locked" class="'+(filter==='locked'?'active':'')+'">FUTURE LEVELS</button><button data-hbf-filter="wishlist" class="'+(filter==='wishlist'?'active':'')+'">♡ SAVED · '+wishlist.length+'</button></div>'+
 '<div class="hbf-market">'+all.filter(([id,item])=>filter==='all'||(filter==='available'?item.level<=homeLevel:filter==='wishlist'?wishlist.includes(id):item.level>homeLevel)).map(([id,item])=>{
  const locked=homeLevel<item.level,poor=st.cash<item.price,editing=!!sceneCandidate();
  const rank=collections[item.tier]||'EVERYDAY';
  return '<article class="hbf-card '+(locked?'is-locked':'is-unlocked')+' hbf-tier-'+item.tier+'">'+
   '<div class="hbf-visual" style="--tone:'+item.color+'"><button type="button" class="hbf-heart '+(wishlist.includes(id)?'is-saved':'')+'" data-hbf-wish="'+id+'" title="'+(wishlist.includes(id)?'Remove from wishlist':'Save to wishlist')+'">'+(wishlist.includes(id)?'♥':'♡')+'</button><div class="hbf-visual-glow"></div><div class="hbf-silhouette '+item.shape+'"><i></i><i></i><i></i></div>'+
   (locked?'<span class="hbf-padlock">LOCKED · LVL '+item.level+'</span>':'<span class="hbf-available">AVAILABLE</span>')+'</div>'+
   '<div class="hbf-card-content"><div class="hbf-card-kicker">'+rank+' · LVL '+item.level+' · $'+item.price+'</div><strong>'+item.name+'</strong><small>'+item.desc+'</small>'+
   '<div class="hbf-bonus">✧ +'+item.comfort+' COMFORT <span>· '+item.action.toUpperCase()+'</span></div></div>'+
   '<button data-hbf-buy="'+id+'" '+(locked||poor||editing?'disabled':'')+'>'+
   (locked?'UNLOCK AT LVL '+item.level:poor?'SAVE $'+(item.price-st.cash)+' MORE':'BUY & PLACE · $'+item.price)+'</button></article>'
 }).join('')+'</div>';
 html+='<div class="hbf-section-title"><strong>PLACED OBJECTS</strong><small>Tap an item to move it</small></div>';
 html+='<div class="hbf-installed">'+(pieces.length?pieces.map((o,i)=>{
  const info=types[o.type];if(!info)return '';
  return '<div class="hbf-row"><span class="hbf-small-icon" style="--tone:'+info.color+'">'+info.icon+'</span>'+
    '<div><b>'+info.name+'</b><small>+'+info.comfort+' COMFORT · CONDITION '+Math.round(o.condition||100)+'%</small><span class="hbf-wear-meter"><i style="width:'+(o.condition||100)+'%"></i></span></div>'+
    '<button type="button" data-hbf-move="'+o.uid+'" '+(sceneCandidate()?'disabled':'')+'>MOVE</button>'+(o.condition<98?'<button type="button" class="hbf-repair" data-hbf-repair="'+o.uid+'" '+(st.cash<bridge().repairCost(o.uid)?'disabled':'')+'>FIX $'+bridge().repairCost(o.uid)+'</button>':'')+
    '<button type="button" class="hbf-sell" data-hbf-sell="'+o.uid+'" '+(sceneCandidate()?'disabled':'')+'>SELL</button></div>';
 }).join(''):'<p class="hbf-empty">Your house has room for new stories. Pick your first piece above.</p>')+'</div>';
 html+='<p class="hbf-note">Tip: Tap a placed object in 3D to move it. Outside Build Mode, tap functional furniture to use it.</p>';
 root.innerHTML=html;
 updateStatus()
}
function install(){
 const body=view();if(!body)return;
 body.addEventListener('click',e=>{
  const wish=e.target.closest('[data-hbf-wish]');if(wish){bridge()?.toggleWishlist?.(wish.dataset.hbfWish);render();return}
  const repair=e.target.closest('[data-hbf-repair]');if(repair){if(bridge()?.repair?.(repair.dataset.hbfRepair))render();return}
  const choice=e.target.closest('[data-hbf-filter]');if(choice){filter=choice.dataset.hbfFilter;render();return}
  let room=e.target.closest('[data-hbf-room]');if(room){clear();window.Evin3D?.focusRoom?.(room.dataset.hbfRoom);render();return}
  room=e.target.closest('[data-hbf-room-buy]');if(room){
   const installed=bridge()?.buyRoom?.(room.dataset.hbfRoom);
   if(installed){clear();window.Evin3D?.focusRoom?.(room.dataset.hbfRoom);render()}
   return
  }
  let t=e.target.closest('[data-hbf-buy]');if(t){begin(t.dataset.hbfBuy);return}
  t=e.target.closest('[data-hbf-move]');if(t){const f=bridge()?.getState?.()?.furniture?.find(x=>x.uid===t.dataset.hbfMove);if(f)begin(f.type,f.uid);return}
  t=e.target.closest('[data-hbf-sell]');if(t){sell(t.dataset.hbfSell);return}
  if(e.target.closest('[data-hbf-turn]')){rotate();return}
  t=e.target.closest('[data-hbf-nudge]');if(t){const [dx,dz]=t.dataset.hbfNudge.split(',').map(Number);nudge(dx,dz);return}
  if(e.target.closest('[data-hbf-confirm]')){confirm();return}
  if(e.target.closest('[data-hbf-cancel]')){clear();render()}
 });
 window.HouseBossFurnitureTypes=types;
 window.HouseBossFurnitureUI={
  render,clear,types,
  selectFrom3D:function(uid){
   if(!document.getElementById('notebook')?.classList.contains('design-mode'))return;
   const f=bridge()?.getState?.()?.furniture?.find(o=>o.uid===uid);
   if(f)begin(f.type,uid)
  },
  updateStatus
 };
}
install();
})();