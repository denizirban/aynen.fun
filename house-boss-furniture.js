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
  stereo:{name:'Music Console',price:305,color:'#5c7f87',w:1.1,d:.66,icon:'♫',desc:'Put a little music on.',benefit:'Dancing is more fun',action:'dance'}
};
const defaults=[[-7.65,-3.55],[-6.3,-3.55],[-7.7,-2.1],[-6.1,-2.25],
 [-2.5,3.85],[.0,3.9],[1.95,3.9],[4.45,3.85],
 [-2.1,-3.8],[.35,-3.8],[3.1,-3.8],[-7.85,1.7],[-7.8,3.9],[-5.95,3.98]];
const bridge=()=>window.HouseBossBuildBridge;
let selectedUid=null,warning='';
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
function confirmSale(item){return window.confirm('Sell '+types[item.type].name+' for $'+Math.floor(types[item.type].price/2)+'? This removes the item from your home.')}
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
 const all=Object.entries(types);
 const pieces=st.furniture||[];
 let html='<div class="hbf-head"><span>BUILD MODE / FURNITURE</span><strong>'+pieces.length+' OBJECT'+(pieces.length===1?'':'S')+' INSTALLED</strong></div>'+
 '<p class="hbf-sub">Buy, move, rotate and arrange real furniture in your 3D home. Work in progress is not charged until you place it.</p>';
 if(warning)html+='<div class="hbf-warning" role="status">'+warning+'</div>';
 html+=placeBar();
 html+='<div class="hbf-section-title"><strong>FURNITURE CATALOG</strong><small>'+all.length+' objects</small></div>'+
 '<div class="hbf-market">'+all.map(([id,item])=>{
  const poor=st.cash<item.price,editing=!!sceneCandidate();
  return '<article class="hbf-card"><div class="hbf-card-top"><span class="hbf-model" style="--tone:'+item.color+'">'+item.icon+'</span>'+
   '<div><strong>'+item.name+'</strong><small>'+item.desc+'</small></div></div>'+
   '<div class="hbf-bonus">'+item.benefit+'</div>'+
   '<button data-hbf-buy="'+id+'" '+(poor||editing?'disabled':'')+'>'+(poor?'NEED $'+(item.price-st.cash):'ADD · $'+item.price)+'</button></article>'
 }).join('')+'</div>';
 html+='<div class="hbf-section-title"><strong>PLACED OBJECTS</strong><small>Tap an item to move it</small></div>';
 html+='<div class="hbf-installed">'+(pieces.length?pieces.map((o,i)=>{
  const info=types[o.type];if(!info)return '';
  return '<div class="hbf-row"><span class="hbf-small-icon" style="--tone:'+info.color+'">'+info.icon+'</span>'+
    '<div><b>'+info.name+'</b><small>'+o.x.toFixed(1)+', '+o.z.toFixed(1)+' · '+(o.rot||0)*90+'°</small></div>'+
    '<button type="button" data-hbf-move="'+o.uid+'" '+(sceneCandidate()?'disabled':'')+'>MOVE</button>'+
    '<button type="button" class="hbf-sell" data-hbf-sell="'+o.uid+'" '+(sceneCandidate()?'disabled':'')+'>SELL</button></div>';
 }).join(''):'<p class="hbf-empty">Your house has room for new stories. Pick your first piece above.</p>')+'</div>';
 html+='<p class="hbf-note">Tip: Tap a placed object in 3D to move it. Outside Build Mode, tap functional furniture to use it.</p>';
 root.innerHTML=html;
 updateStatus()
}
function install(){
 const body=view();if(!body)return;
 body.addEventListener('click',e=>{
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