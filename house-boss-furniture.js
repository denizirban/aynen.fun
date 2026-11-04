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
const defaults=[[3.5,3.5],[3,3.5],[4,-3.5],[2.5,-3.5],
 [2,0],[1,0],[0,0],[-1,0],
 [2.5,4],[1.5,4],[0,4],[-2.5,4],
 [3,-4],[0,-4],[-2.5,-4],[-6,-2.5],[-8,-4],[-8,4]];
const bridge=()=>window.HouseBossBuildBridge;
let selectedUid=null,warning='',filter='new',category='all',styleFilter='all',searchQuery='';
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
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
function begin(type,uid,previewOnly=false){
 let st=null;try{st=bridge()?.getState?.()}catch(e){st=bridge()?.getQuickState?.()||null}
 if(!st||!types[type])return;
 if(!previewOnly&&!uid&&st.level<types[type].level){warning='Reach Home Level '+types[type].level+' to unlock '+types[type].name+'.';render();return}
 if(!previewOnly&&!uid&&st.cash<types[type].price){warning='You need $'+(types[type].price-st.cash)+' more.';render();return}
 let item=uid?st.furniture.find(f=>f.uid===uid):null;
 if(uid&&!item)return;
 let p=item?{type,x:item.x,z:item.z,rot:item.rot||0,uid,mode:'move'}:safeCandidate(type);
 if(p&&previewOnly)p.mode='preview';
 if(!p){warning='There is no free space. Move or sell another object first.';render();return}
 let ok=window.Evin3D?.beginFurniturePlacement?.(p);
 if(!ok){warning='3D world is not ready.';render();return}
 selectedUid=uid||null;warning='';
 window.Evin3D?.focusFurniture?.(p.x,p.z);
 render();
}
function confirm(){
 const item=sceneCandidate();if(item?.mode==='preview'){clear();render();return}if(!item||!item.valid){warning=item?.reason||'Choose a free space highlighted in green.';render();return}
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
  '<div class="hbf-place-heading"><span>'+(p.mode==='preview'?'FREE 3D PREVIEW':'NOW PLACING')+'</span><b>'+type.name+'</b></div>'+
  '<p>'+(p.mode==='preview'?'Explore this designer object in your 3D room. A preview never charges money.':'Drag the object in the room or use the arrows. Green = valid placement.')+'</p>'+
  '<div id="hb-build-position" class="hbf-status" data-valid="'+!!p.valid+'">'+(p.valid?'VALID POSITION':'BLOCKED · '+(p.reason||'Move to an open area'))+'</div>'+
  '<div class="hbf-place-buttons"><button type="button" data-hbf-turn>ROTATE 90° ↻</button>'+
  '<div class="hbf-dpad"><button data-hbf-nudge="0,-.5" aria-label="Move back">↑</button>'+
  '<button data-hbf-nudge="-.5,0" aria-label="Move left">←</button>'+
  '<button data-hbf-nudge="0,.5" aria-label="Move forward">↓</button>'+
  '<button data-hbf-nudge=".5,0" aria-label="Move right">→</button></div></div>'+
  '<div class="hbf-action-row"><button data-hbf-cancel>CANCEL</button>'+
  '<button data-hbf-confirm '+(!p.valid&&p.mode!=='preview'?'disabled':'')+'>'+(p.mode==='preview'?'CLOSE PREVIEW':p.uid?'SAVE POSITION':'BUY & PLACE · $'+type.price)+'</button></div></div>';
}

function renderRich(){
 const root=view(),st=bridge()?.getState?.();if(!root||!st)return;
 document.getElementById('noteTitle').textContent='The Design Shop';
 const budget=document.getElementById('noteBudget');if(budget)budget.textContent='$'+st.cash+' · Home Value $'+st.homeValue;
 const homeLevel=Math.max(1,st.level||1),comfort=st.comfort||0;
 const all=Object.entries(types).sort((a,b)=>{
   const left=a[1],right=b[1];
   return Number(left.level>homeLevel)-Number(right.level>homeLevel)||left.level-right.level||left.price-right.price
 });
 const available=all.filter(([,item])=>item.level<=homeLevel).length;
 const wishlist=st.wishlist||[],pieces=st.furniture||[];
 const qualities=st.quality||{score:0,tier:'First Apartment',comfort:0};
 const nextUnlock=all.find(([,item])=>item.level>homeLevel);
 const categoryDefs=window.HouseBossDesignerCollection?.categories||{seating:'SEATING',tables:'TABLES',lighting:'LIGHTING',rugs:'RUGS',art:'ART',objects:'OBJECTS',plants:'PLANTS',storage:'STORAGE'};
 const active=all.filter(([id,item])=>
  (filter==='all'||(filter==='new'?(item.series==='STUDIO STARTERS'&&item.level<=homeLevel):filter==='available'?item.level<=homeLevel:filter==='wishlist'?wishlist.includes(id):item.level>homeLevel))&&
  (category==='all'||item.category===category)&&
  (styleFilter==='all'||item.style===styleFilter)
 );
 const categoryIcons={seating:'▰',tables:'◉',lighting:'☀',rugs:'▦',art:'✷',objects:'◇',plants:'✿',storage:'▤'};
 let html='<nav class="hd-categories" aria-label="Home design categories"><button class="active" type="button" data-hd-category="furniture"><span>▣</span>Design Shop</button>'+
 Object.entries(window.HouseBossHomeDesign?.catalog||{}).map(([k,v])=>'<button type="button" data-hd-category="'+k+'"><span>'+v.icon+'</span>'+v.label+'</button>').join('')+'</nav>'+
 '<div class="hbf-shop-hero"><div><span>DESIGN SHOP / EDITIONS</span><h3>Make it yours.</h3><p>Furniture with personality. Sculptural shapes, playful colour and collectible pieces for your 3D home.</p>'+
 '<div class="hbf-hero-pills"><b>'+all.length+' OBJECTS</b><b>'+available+' UNLOCKED</b><b>3D HOME STYLING</b></div></div><div class="hbf-hero-sculpt"><i></i><i></i><i></i></div></div>'+
 '<div class="hbf-preview-space"><div><b>SEE THE OBJECTS IN YOUR ROOM</b><small>Try the new mushroom lamp in real 3D before buying. The catalogue stays open while you explore.</small></div>'+
 '<button type="button" data-hbf-preview="mushroomlamp">TRY IN 3D ↗</button></div>'+
 '<div class="hbf-head"><span>YOUR HOME / DESIGN PROGRESS</span><strong>LVL '+homeLevel+' · '+pieces.length+' PIECES OWNED</strong></div>'+
 '<div class="hbf-quality"><div><strong>'+esc(qualities.tier)+'</strong><b>HOME QUALITY · '+qualities.score+'%</b></div>'+
 '<div class="hbf-quality-track"><i style="width:'+qualities.score+'%"></i></div>'+
 '<div class="hbf-lifestyle-stats"><span><b>'+comfort+'</b><small>COMFORT</small></span><span><b>'+available+'/'+all.length+'</b><small>UNLOCKED</small></span><span><b>'+homeLevel+'/20</b><small>HOME LEVEL</small></span></div>'+
 '<small>Unique objects boost design variety. Completed designer themes add +'+(qualities.setBonus||0)+' home quality.</small></div>'+
 '<div class="hbf-set-header"><b>CURATED COLLECTIONS</b><span>Collect 3 different designs in each style to earn bonus XP, money and home quality.</span></div>'+
 '<div class="hbf-designer-sets">'+(st.sets||[]).map(set=>
  '<article class="hbf-set-card '+(set.claimed?'claimed':set.ready?'ready':'')+'"><div class="hbf-set-top"><span class="hbf-set-symbol '+set.id+'">✦</span>'+
  '<div><b>'+esc(set.title)+'</b><small>'+esc(set.desc)+'</small></div><strong>'+set.owned+'/'+set.goal+'</strong></div>'+
  '<div class="hbf-set-progress"><i style="width:'+Math.min(100,100*set.owned/set.goal)+'%"></i></div>'+
  (set.claimed?'<span class="hbf-set-completed">✓ COLLECTION COMPLETE</span>':set.ready?
   '<button type="button" data-hbf-claim-set="'+set.id+'">CLAIM $'+set.reward+' +'+set.xp+' XP</button>':
   '<button type="button" data-hbf-set="'+set.id+'">EXPLORE '+set.id.toUpperCase()+' PIECES</button>')+
  '</article>').join('')+'</div>'+
 '<div class="hbf-next"><div><b>UP NEXT / YOUR NEXT COLLECTION</b><strong>'+(nextUnlock?'LEVEL '+nextUnlock[1].level+' · '+esc(nextUnlock[1].name):'EVERYTHING UNLOCKED')+'</strong>'+
 '<small>'+(nextUnlock?'Earn Home XP to discover and purchase more collectible objects.':'Every design can now be bought and styled.')+'</small></div><span class="hbf-lock-symbol">✦</span></div>';
 if(warning)html+='<div class="hbf-warning" role="status">'+esc(warning)+'</div>';
 html+=placeBar();
 html+='<div class="hbf-section-title"><strong>YOUR ROOMS</strong><small>Build & explore</small></div>'+
 '<div class="hbf-room-tiles">'+(st.rooms||[]).map(room=>{
  const status=room.id==='home'?'ALWAYS OPEN':room.installed?'BUILT':'LEVEL '+room.level;
  return '<article class="hbf-room"><strong>'+esc(room.name)+'</strong><small>'+status+'</small>'+
   (room.installed?'<button type="button" data-hbf-room="'+room.id+'">VIEW IN 3D ↗</button>':
   '<button type="button" data-hbf-room-buy="'+room.id+'" '+(!room.available?'disabled':'')+'>'+
   (room.available?'BUILD · $'+room.price:'UNLOCK · LVL '+room.level+' · $'+room.price)+'</button>')+'</article>'
 }).join('')+'</div>';
 html+='<div class="hbf-section-title"><strong>COLLECTOR’S OBJECT CATALOGUE</strong><small>'+all.length+' designer pieces</small></div>'+
 '<nav class="hbf-category-grid" aria-label="Shop by object type"><button type="button" data-hbf-category="all" class="'+(category==='all'?'active':'')+'"><span>◆</span><b>ALL OBJECTS</b><small>'+all.length+'</small></button>'+'<button type="button" data-hd-category="wallpaper" class="hbf-wallpaper-category"><span>▧</span><b>WALLPAPERS</b><small>15 designs ↗</small></button>'+
 Object.entries(categoryDefs).map(([id,label])=>'<button type="button" data-hbf-category="'+id+'" class="'+(category===id?'active':'')+'"><span>'+categoryIcons[id]+'</span><b>'+label+'</b><small>'+all.filter(([,item])=>item.category===id).length+'</small></button>').join('')+'</nav>'+
 '<div class="hbf-shop-toolbar"><label class="hbf-search"><span>⌕</span><input type="search" id="hbf-search" placeholder="Find something special..." value="'+esc(searchQuery)+'" aria-label="Search objects"></label>'+
 '<label class="hbf-style-select"><span>STYLE</span><select id="hbf-style" aria-label="Design aesthetic">'+
 [['all','All aesthetics'],['pop','Colourful / Pop'],['soft','Soft / Bouclé'],['organic','Organic'],['retro','Retro'],['modern','Modern']].map(([id,label])=>'<option value="'+id+'" '+(styleFilter===id?'selected':'')+'>'+label+'</option>').join('')+'</select></label></div>'+
 '<div class="hbf-filters"><button data-hbf-filter="new" class="'+(filter==='new'?'active':'')+'">✦ NEW & UNLOCKED</button><button data-hbf-filter="all" class="'+(filter==='all'?'active':'')+'">ALL PIECES</button>'+
 '<button data-hbf-filter="available" class="'+(filter==='available'?'active':'')+'">UNLOCKED</button>'+
 '<button data-hbf-filter="locked" class="'+(filter==='locked'?'active':'')+'">COMING SOON</button>'+
 '<button data-hbf-filter="wishlist" class="'+(filter==='wishlist'?'active':'')+'">♡ SAVED '+wishlist.length+'</button></div>'+
 '<div class="hbf-result-caption"><strong id="hbf-result-count">'+active.length+' PIECES</strong><span>Preview in 3D · Buy · Place · Personalise</span></div>'+
 '<div class="hbf-market">'+active.map(([id,item])=>{
  const locked=homeLevel<item.level,poor=st.cash<item.price,editing=!!sceneCandidate(),rank=collections[item.tier]||'EVERYDAY';
  return '<article class="hbf-card '+(locked?'is-locked':'is-unlocked')+' hbf-tier-'+item.tier+'" data-hbf-item="'+id+'" data-hbf-text="'+esc([item.name,item.desc,item.style,item.category].join(' ').toLowerCase())+'">'+
   '<div class="hbf-visual hbf-preview-'+esc(item.style||'modern')+'" style="--tone:'+item.color+'">'+
   '<button type="button" class="hbf-heart '+(wishlist.includes(id)?'is-saved':'')+'" data-hbf-wish="'+id+'" aria-label="Save to wishlist">'+(wishlist.includes(id)?'♥':'♡')+'</button>'+
   '<div class="hbf-visual-glow"></div><div class="hbf-silhouette '+esc(item.shape)+'"><i></i><i></i><i></i><i></i><i></i></div>'+
   '<button type="button" class="hbf-visual-preview" data-hbf-preview="'+id+'">VIEW IN 3D</button>'+
   (locked?'<span class="hbf-padlock">LVL '+item.level+' LOCKED</span>':'<span class="hbf-available">UNLOCKED</span>')+'</div>'+
   '<div class="hbf-card-content"><div class="hbf-card-kicker">'+(item.series==='STUDIO STARTERS'?'NEW DROP · ':item.collection?'EDITIONS · ':'')+rank+' · LVL '+item.level+'</div>'+
   '<strong>'+esc(item.name)+'</strong><small>'+esc(item.desc)+'</small>'+
   '<div class="hbf-material-tags"><span>'+esc(item.style||'modern')+'</span><span>'+(item.layer==='floor'?'LAYERED RUG':item.layer==='tabletop'?'ON TABLE':esc(item.category||'furniture'))+'</span></div>'+
   '<div class="hbf-bonus">✧ +'+item.comfort+' COMFORT <span>· '+(item.action||'talk').toUpperCase()+'</span></div></div>'+
   '<button type="button" data-hbf-buy="'+id+'" '+(locked||poor||editing?'disabled':'')+'>'+
   (locked?'LEVEL '+item.level+' TO UNLOCK':poor?'NEED $'+(item.price-st.cash)+' MORE':'BUY & PLACE · $'+item.price)+'</button></article>'
 }).join('')+'</div>'+
 '<div id="hbf-empty-results" class="hbf-empty-results" hidden>No objects match those filters. Try another category or style.</div>';
 html+='<div class="hbf-section-title"><strong>YOUR OWN COLLECTION</strong><small>'+pieces.length+' placed objects · personalise anytime</small></div>';
 html+='<div class="hbf-installed">'+(pieces.length?pieces.map(o=>{
  const info=types[o.type];if(!info)return '';
  const colors=info.variants||[],isBusy=!!sceneCandidate();
  return '<div class="hbf-row"><span class="hbf-small-icon" style="--tone:'+(o.tint||info.color)+'">'+(info.icon||categoryIcons[info.category]||'✦')+'</span>'+
   '<div><b>'+esc(info.name)+'</b><small>+'+info.comfort+' COMFORT · CONDITION '+Math.round(o.condition||100)+'%</small>'+
   (colors.length?'<div class="hbf-colorways" aria-label="Choose this item’s colour">'+colors.map(tint=>'<button type="button" data-hbf-color="'+o.uid+','+tint+'" class="'+((o.tint||info.color)===tint?'active':'')+'" style="--swatch:'+tint+'" title="'+tint+'" aria-label="Change to '+tint+'"></button>').join('')+'</div>':'')+
   '<span class="hbf-wear-meter"><i style="width:'+(o.condition||100)+'%"></i></span></div>'+
   '<button type="button" data-hbf-move="'+o.uid+'" '+(isBusy?'disabled':'')+'>MOVE</button>'+
   (o.condition<98?'<button type="button" data-hbf-repair="'+o.uid+'" class="hbf-repair" '+(st.cash<bridge().repairCost(o.uid)?'disabled':'')+'>FIX $'+bridge().repairCost(o.uid)+'</button>':'')+
   '<button type="button" data-hbf-sell="'+o.uid+'" class="hbf-sell" '+(isBusy?'disabled':'')+'>SELL</button></div>'
 }).join(''):'<p class="hbf-empty">Your collection is just beginning. Find your first piece above.</p>')+'</div>'+
 '<p class="hbf-note">Rugs go beneath existing furniture. Small objects can be placed on the dining table and other suitable tables. Tap a 3D item to use it; Build Mode lets you move or recolour it.</p>';
 root.innerHTML=html;
 updateStatus();
 applySearch()
}

/* Reliable Design Shop: never replace a working shop with a text-only index.
   Render all cards even if a saved game's optional state has an unexpected shape. */
function renderSafe(err){
 const root=view();if(!root)return;
 const noteTitle=document.getElementById('noteTitle');
 if(noteTitle)noteTitle.textContent='The Design Shop';
 let st=null;
 try{st=bridge()?.getState?.()||null}catch(inner){console.error('Shop state recovery:',inner)}
 if(!st){try{st=bridge()?.getQuickState?.()||null}catch(inner){console.error('Quick inventory recovery:',inner)}}
 const lvl=Number(st?.level)||1,wallet=Number(st?.cash)||0;
 const items=Object.entries(types),wishlist=Array.isArray(st?.wishlist)?st.wishlist:[];
 const saved=Array.isArray(st?.furniture)?st.furniture:[];
 const categories=window.HouseBossDesignerCollection?.categories||{seating:'SEATING',tables:'TABLES',lighting:'LIGHTING',rugs:'RUGS',art:'ART',objects:'OBJECTS',plants:'PLANTS',storage:'STORAGE'};
 const budget=document.getElementById('noteBudget');
 if(budget)budget.textContent='$'+wallet+' · HOME LEVEL '+lvl;
 const filtered=items.filter(([id,t])=>
   (category==='all'||t.category===category)&&
   (styleFilter==='all'||t.style===styleFilter)&&
   (filter==='all'||filter==='new'&&t.series==='STUDIO STARTERS'&&t.level<=lvl||filter==='available'&&t.level<=lvl||filter==='locked'&&t.level>lvl||filter==='wishlist'&&wishlist.includes(id)));
 const palette={seating:'▰',tables:'◉',lighting:'☀',rugs:'▦',art:'✷',objects:'◇',plants:'✿',storage:'▤'};
 const categoryButtons='<nav class="hbf-category-grid" aria-label="Furniture categories">'+
  '<button data-hbf-category="all" class="'+(category==='all'?'active':'')+'"><span>◆</span><b>ALL</b><small>'+items.length+'</small></button>'+
  '<button data-hd-category="wallpaper" class="hbf-wallpaper-category"><span>▧</span><b>WALLPAPERS</b><small>15 designs ↗</small></button>'+Object.entries(categories).map(([id,name])=>'<button data-hbf-category="'+id+'" class="'+(category===id?'active':'')+'"><span>'+(palette[id]||'✦')+'</span><b>'+name+'</b><small>'+items.filter(([,t])=>t.category===id).length+'</small></button>').join('')+'</nav>';
 let html='<nav class="hd-categories"><button class="active" data-hd-category="furniture">▣ Design Shop</button>'+
  Object.entries(window.HouseBossHomeDesign?.catalog||{}).map(([id,v])=>'<button data-hd-category="'+id+'">'+v.icon+' '+v.label+'</button>').join('')+'</nav>'+
  '<div class="hbf-shop-hero"><div><span>COLLECTIBLE INTERIORS / HOUSE BOSS</span><h3>Make it yours.</h3><p>37 original design editions, saved colourways, decorative accents and layered rugs. See each object in 3D before buying.</p>'+
  '<div class="hbf-hero-pills"><b>'+items.length+' FURNITURE & OBJECTS</b><b>HOME LVL '+lvl+'</b></div></div><div class="hbf-hero-sculpt"><i></i><i></i><i></i></div></div>'+
  '<div class="hbf-preview-space"><div><b>LOOK AROUND YOUR 3D HOUSE</b><small>Preview a colourful mushroom lamp at no cost, then place furniture with the buy button.</small></div>'+
  '<button data-hbf-preview="mushroomlamp">TRY IN 3D ↗</button></div>'+
  '<div class="hbf-section-title"><strong>DESIGN COLLECTION</strong><small>'+items.length+' objects · '+items.filter(([,t])=>t.level<=lvl).length+' unlocked</small></div>'+
  categoryButtons+
  '<div class="hbf-shop-toolbar"><label class="hbf-search"><span>⌕</span><input id="hbf-search" type="search" placeholder="Search for a piece..." value="'+esc(searchQuery)+'"></label>'+
  '<label class="hbf-style-select"><span>STYLE</span><select id="hbf-style">'+
  [['all','All styles'],['pop','Pop colour'],['retro','Retro'],['soft','Soft'],['modern','Modern'],['organic','Organic']].map(([id,name])=>
    '<option value="'+id+'" '+(styleFilter===id?'selected':'')+'>'+name+'</option>').join('')+'</select></label></div>'+
  '<div class="hbf-filters">'+[['new','✦ NEW DROPS'],['all','ALL PIECES'],['available','SHOP NOW'],['locked','COMING SOON'],['wishlist','♡ SAVED']].map(([id,name])=>
    '<button data-hbf-filter="'+id+'" class="'+(filter===id?'active':'')+'">'+name+'</button>').join('')+'</div>'+
  '<div class="hbf-result-caption"><strong id="hbf-result-count">'+filtered.length+' PIECES</strong><span>Real 3D placement · Free preview</span></div>'+
  '<div class="hbf-market">';
 for(const [id,t] of filtered){
  const locked=t.level>lvl,unaffordable=t.price>wallet;
  html+='<article class="hbf-card '+(locked?'is-locked':'is-unlocked')+' hbf-tier-'+(t.tier||'starter')+'" data-hbf-item="'+id+'" data-hbf-text="'+esc([t.name,t.desc,t.style,t.category].join(' ').toLowerCase())+'">'+
   '<div class="hbf-visual hbf-preview-'+(t.style||'modern')+'" style="--tone:'+t.color+'">'+
   '<button class="hbf-heart '+(wishlist.includes(id)?'is-saved':'')+'" data-hbf-wish="'+id+'">'+(wishlist.includes(id)?'♥':'♡')+'</button>'+
   '<div class="hbf-visual-glow"></div><div class="hbf-silhouette '+(t.shape||'sculpture')+'"><i></i><i></i><i></i><i></i><i></i></div>'+
   '<button class="hbf-visual-preview" data-hbf-preview="'+id+'">VIEW IN 3D</button>'+
   (locked?'<span class="hbf-padlock">LVL '+t.level+'</span>':'<span class="hbf-available">UNLOCKED</span>')+'</div>'+
   '<div class="hbf-card-content"><div class="hbf-card-kicker">'+(t.series==='STUDIO STARTERS'?'NEW DROP · ':t.collection?'EDITIONS · ':'')+'LVL '+t.level+'</div>'+
   '<strong>'+esc(t.name)+'</strong><small>'+esc(t.desc||'A statement piece for your home.')+'</small>'+
   '<div class="hbf-material-tags"><span>'+esc(t.style||'modern')+'</span><span>'+esc(t.category||'furniture')+'</span></div>'+
   '<div class="hbf-bonus">✧ +'+(t.comfort||0)+' COMFORT</div></div>'+
   '<button data-hbf-buy="'+id+'" '+(locked||unaffordable?'disabled':'')+'>'+
   (locked?'UNLOCK AT LVL '+t.level:unaffordable?'NEED $'+(t.price-wallet)+' MORE':'BUY & PLACE · $'+t.price)+'</button></article>';
 }
 html+='</div><div id="hbf-empty-results" class="hbf-empty-results" hidden>No matching designs. Try another style.</div>';
 html+='<div class="hbf-section-title"><strong>YOUR OWN COLLECTION</strong><small>'+saved.length+' PLACED</small></div>';
 html+='<div class="hbf-installed">'+(saved.length?saved.map(o=>{
   const info=types[o.type];if(!info)return '';
   return '<div class="hbf-row"><span class="hbf-small-icon" style="--tone:'+(o.tint||info.color)+'">'+(info.icon||'✦')+'</span>'+
    '<div><b>'+esc(info.name)+'</b><small>Condition '+(o.condition||100)+'%</small>'+
    (info.variants?'<div class="hbf-colorways">'+info.variants.map(tint=>
      '<button style="--swatch:'+tint+'" class="'+((o.tint||info.color)===tint?'active':'')+'" data-hbf-color="'+o.uid+','+tint+'" title="Change colour"></button>').join('')+'</div>':'')+'</div>'+
    '<button data-hbf-move="'+o.uid+'">MOVE</button><button data-hbf-sell="'+o.uid+'">SELL</button></div>'
  }).join(''):'<p class="hbf-empty">Your collection starts here. Choose something from the shop.</p>')+'</div>';
 root.innerHTML=html;
 if(err){
  root.dataset.shopRecovery='true';
  root.dataset.shopFailure=String(err?.message||err).slice(0,240);
  console.error('House Boss: full catalogue recovered from',err)
 }else{delete root.dataset.shopRecovery;delete root.dataset.shopFailure}
 applySearch()
}
function render(){
 try{
  renderRich();
  if(view()?.querySelector('.hbf-market'))return;
  renderSafe(new Error('Catalogue view did not render'))
 }catch(err){renderSafe(err)}
}

function applySearch(){
 const root=view();if(!root)return;
 const term=searchQuery.trim().toLowerCase();
 let shown=0;
 root.querySelectorAll('[data-hbf-item]').forEach(card=>{
  const match=!term||(card.dataset.hbfText||'').includes(term);
  card.hidden=!match;
  if(match)shown++
 });
 const count=root.querySelector('#hbf-result-count');if(count)count.textContent=shown+' PIECES';
 const empty=root.querySelector('#hbf-empty-results');if(empty)empty.hidden=shown>0
}
function install(){
 const body=view();if(!body)return;
 body.addEventListener('input',e=>{
  if(e.target.id==='hbf-search'){searchQuery=e.target.value||'';applySearch()}
 });
 body.addEventListener('change',e=>{
  if(e.target.id==='hbf-style'){styleFilter=e.target.value||'all';render()}
 });
 body.addEventListener('click',e=>{
  const claim=e.target.closest('[data-hbf-claim-set]');if(claim){if(bridge()?.claimSet?.(claim.dataset.hbfClaimSet))render();return}
  const collection=e.target.closest('[data-hbf-set]');if(collection){styleFilter=collection.dataset.hbfSet;filter='all';category='all';render();return}
  const wish=e.target.closest('[data-hbf-wish]');if(wish){bridge()?.toggleWishlist?.(wish.dataset.hbfWish);render();return}
  const repair=e.target.closest('[data-hbf-repair]');if(repair){if(bridge()?.repair?.(repair.dataset.hbfRepair))render();return}
  const preview=e.target.closest('[data-hbf-preview]');if(preview){begin(preview.dataset.hbfPreview,null,true);return}
  const recolor=e.target.closest('[data-hbf-color]');if(recolor){
   const [uid,color]=recolor.dataset.hbfColor.split(',');
   if(bridge()?.recolor?.(uid,color))render();
   return
  }
  const cat=e.target.closest('[data-hbf-category]');if(cat){category=cat.dataset.hbfCategory;render();return}
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
  render,renderSafe,clear,types,
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