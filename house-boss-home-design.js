/* HOUSE BOSS / HOME DESIGN STUDIO V1
   Original design controls, six rooms/finishes, live 3D previews and persistent owned styles.
   Works with the existing game bridge; no separate game/save state. */
(function(){
'use strict';
const catalog={
 sofa:{label:'Sofas',icon:'▱',description:'A sofa changes how your home feels.',options:[
  ['starter','Everyday Linen',0,'#bdb49c','Simple and comfortable'],
  ['sage','Modern Sage',175,'#8ca796','Clean, soft and inviting'],
  ['rust','Rust Velvet',215,'#be7c67','A statement curved sofa'],
  ['navy','Midnight Blue',260,'#667f9b','Deep, dramatic cushions'],
  ['boucle','Cloud Bouclé',480,'#f1e9d9','A premium rounded silhouette'],
  ['leather','Heritage Leather',980,'#86674f','Tailored caramel leather and solid timber'],
  ['cloud','Cloud Modular',1950,'#e3ddd2','Generous deep modular cushions'],
  ['atelier','Atelier Signature',3600,'#b4a696','Sculptural collectible-design seating']
 ]},
 wallpaper:{label:'Wallpaper',icon:'▧',description:'A new wall finish can completely change the room.',options:[
  ['ivory','Warm Plaster',0,'#f6f1e6','Original cream'],
  ['sage','Sage Stripes',90,'#acc2aa','Quiet vertical stripes'],
  ['botanical','Botanical Print',155,'#83aa83','A subtle green leaf motif'],
  ['clay','Clay Wash',125,'#d3a294','Warm, earthy and textural'],
  ['blue','Misty Blue',115,'#b2c9da','A soft coastal look']
 ]},
 flooring:{label:'Flooring',icon:'▦',description:'Replace the flooring of the entire living space.',options:[
  ['hex','Classic Hex',0,'#d6d8d0','Original ceramic tile'],
  ['oak','Natural Oak',165,'#bf9b74','Wood planks'],
  ['terrazzo','Soft Terrazzo',195,'#dfd4c6','Stone flecks in a warm base'],
  ['checker','Sage Checker',175,'#9cae9c','A retro checkerboard']
 ]},
 cabinets:{label:'Cabinets',icon:'▤',description:'Repaint the kitchen cabinetry.',options:[
  ['sage','Original Sage',0,'#a5b8a4','Natural muted green'],
  ['cream','Oat Cream',120,'#e2d4b8','Bright and cozy'],
  ['forest','Deep Forest',190,'#526c5c','A sophisticated green'],
  ['blue','Dusty Blue',150,'#8daebc','Soft blue-grey'],
  ['clay','Warm Clay',145,'#c28d7b','Terracotta-toned cabinets']
 ]},
 rug:{label:'Rugs',icon:'▩',description:'Add a layer of color and softness.',options:[
  ['linen','Natural Linen',0,'#c9be9c','Neutral woven fibers'],
  ['rose','Vintage Rose',105,'#b98786','A faded floral palette'],
  ['forest','Fern Green',105,'#6c946f','Earthy botanical'],
  ['blue','Sky Weave',95,'#8db6c1','Cool tones and texture']
 ]},
 curtains:{label:'Curtains',icon:'║',description:'Change the light and mood around the window.',options:[
  ['terracotta','Copper Linen',0,'#bb7954','Warm café curtains'],
  ['ivory','Sheer Ivory',90,'#eee7d9','Bright and breezy'],
  ['sage','Muted Sage',105,'#94ab92','Soft natural green'],
  ['navy','Blue Grey',110,'#718b9b','A little more contrast']
 ]}
};
const sofaLevels={starter:1,sage:2,rust:3,navy:5,boucle:7,leather:9,cloud:12,atelier:15};
Object.entries(catalog).forEach(([cat,data])=>data.options.forEach((o,i)=>{o[5]=cat==='sofa'?sofaLevels[o[0]]:(i===0?1:Math.max(1,Math.ceil((i+1)/1.5)))}));
let category='furniture',preview=null;
function bridge(){return window.HouseBossDesignBridge}
function state(){return bridge()?.getState?.()||{cash:0,value:0,selected:{},unlocked:{}}}
function selectedStyle(cat){let st=state();return st.selected?.[cat]||catalog[cat].options[0][0]}
function owned(cat,id){return !!state().unlocked?.[cat]?.includes(id)||id===catalog[cat].options[0][0]}
function effective(){return Object.fromEntries(Object.keys(catalog).map(k=>[k,preview?.category===k?preview.id:selectedStyle(k)]))}
function updateScene(){window.Evin3D?.applyDesign?.(effective())}
function clearPreview(){window.HouseBossFurnitureUI?.clear?.();preview=null;bridge()?.preview?.(null,null);updateScene()}
function render(){
 let root=document.getElementById('noteBody');
 if(!root)return;
 if(category==='furniture'){window.HouseBossFurnitureUI?.render?.();return}
 const st=state(),data=catalog[category],active=preview?.category===category?preview.id:selectedStyle(category);
 const section=document.getElementById('notebook');section?.classList.toggle('design-mode',true);
 const title=document.getElementById('noteTitle');if(title)title.textContent='Home Design';
 const budget=document.getElementById('noteBudget');if(budget)budget.textContent=';
 let html='<div class="hd-lead"><span class="hd-kicker">INTERIOR DESIGN STUDIO · HOME LVL '+(st.level||1)+'</span><p>Make your first apartment a designer home. Premium styles unlock as your Home Level rises. Preview a future look any time.</p></div>';
 html+='<nav class="hd-categories" aria-label="Design categories"><button type="button" data-hd-category="furniture"><span>▣</span>Furniture</button>'+Object.entries(catalog).map(([k,v])=>'<button type="button" data-hd-category="'+k+'" class="'+(k===category?'active':'')+'"><span>'+v.icon+'</span>'+v.label+'</button>').join('')+'</nav>';
 html+='<div class="hd-collection"><div><h3>'+data.label+'</h3><small>'+data.description+'</small></div><button type="button" data-hd-focus>VIEW IN 3D ↗</button></div>';
 html+='<div class="hd-options">'+data.options.map(opt=>{
  const [id,name,price,color,desc,needLevel]=opt,isActive=selectedStyle(category)===id,isOwned=owned(category,id),isShowing=active===id;
  const locked=(st.level||1)<needLevel&&!isOwned;
  const poor=st.cash<price&&!isOwned;
  return '<article class="hd-style '+(isShowing?'hd-current ':'')+(isActive?'hd-applied':'')+(locked?' hd-locked':'')+'">'+
   '<button class="hd-preview" type="button" data-hd-preview="'+category+':'+id+'" aria-label="Preview '+name+'">'+
    '<span class="hd-swatch" style="--sample:'+color+'"><i></i></span>'+
    '<span class="hd-style-name">'+name+'</span><span class="hd-style-desc">'+desc+'</span><span class="hd-tier">'+(locked?'◆ LEVEL '+needLevel+' TO UNLOCK':'LVL '+needLevel+' COLLECTION')+'</span>'+
    '<span class="hd-style-tag">'+(isActive?'IN ROOM':isOwned?'OWNED':locked?'LOCKED':'
   '<button type="button" class="hd-purchase" data-hd-apply="'+category+':'+id+'" '+(isActive||poor||locked?'disabled':'')+'>'+
    (isActive?'✓ INSTALLED':isOwned?'APPLY':locked?'UNLOCK LVL '+needLevel:poor?'NEED +'</button></article>'
 }).join('')+'</div>';
 html+='<div class="hd-foot"><span>HOME VALUE · $'+(st.value||0)+'</span>'+
 (preview?'<button type="button" data-hd-revert>REVERT PREVIEW</button>':'<span>DESIGNS ARE SAVED</span>')+
 '</div><p class="hd-tip">Changes are visualized in the existing 3D house. Bought styles are yours permanently; switch back for free.</p>';
 root.innerHTML=html;
}
function apply(cat,id){
 let option=catalog[cat]?.options.find(o=>o[0]===id);
 if(!option)return;
 let ok=bridge()?.apply?.(cat,id,option[2]);
 if(!ok)return;
 preview=null;updateScene();render()
}
function showPreview(cat,id){
 if(!catalog[cat]?.options.some(o=>o[0]===id))return;
 category=cat;preview={category:cat,id};bridge()?.preview?.(cat,id);updateScene();render()
}
function install(){
 const tabs=document.querySelector('#notebook .note-tabs'),body=document.getElementById('noteBody');
 if(!tabs||!body)return;
 const tab=document.createElement('button');tab.type='button';tab.dataset.tab='design';tab.textContent='DESIGN';
 tabs.insertBefore(tab,tabs.firstChild);
 tab.addEventListener('click',()=>{clearPreview();bridge()?.open?.();render()});
 body.addEventListener('click',e=>{
  if(e.target.closest('[data-hd-focus]')){window.Evin3D?.focusDesign?.(category);return}
  let el=e.target.closest('[data-hd-category]');if(el){clearPreview();category=el.dataset.hdCategory;render();return}
  el=e.target.closest('[data-hd-preview]');if(el){let [c,id]=el.dataset.hdPreview.split(':');showPreview(c,id);return}
  el=e.target.closest('[data-hd-apply]');if(el){let [c,id]=el.dataset.hdApply.split(':');apply(c,id);return}
  if(e.target.closest('[data-hd-revert]')){clearPreview();render()}
 });
 const close=document.getElementById('closeNotebook');
 close?.addEventListener('click',clearPreview);
 document.getElementById('noteShade')?.addEventListener('click',clearPreview);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')clearPreview()});
 // The original Upgrades tab remains available for structural home expansions.
 const oldTabs=Array.from(tabs.querySelectorAll('button:not([data-tab="design"])'));
 oldTabs.forEach(b=>b.addEventListener('click',()=>{
  clearPreview();document.getElementById('notebook')?.classList.remove('design-mode');
 },true));
 window.HouseBossHomeDesign={render,clearPreview,effective,catalog,isFurnitureView(){return category==='furniture'&&document.getElementById('notebook')?.classList.contains('design-mode')},selectCategory(k){if(k==='furniture'||catalog[k]){clearPreview();category=k;render()}}};
}
install();
})();+Math.floor(st.cash)+' · Property value ;
 let html='<div class="hd-lead"><span class="hd-kicker">YOUR HOME, YOUR STYLE</span><p>Change finishes and furniture in your 3D home. Tap to preview before buying.</p></div>';
 html+='<nav class="hd-categories" aria-label="Design categories"><button type="button" data-hd-category="furniture"><span>▣</span>Furniture</button>'+Object.entries(catalog).map(([k,v])=>'<button type="button" data-hd-category="'+k+'" class="'+(k===category?'active':'')+'"><span>'+v.icon+'</span>'+v.label+'</button>').join('')+'</nav>';
 html+='<div class="hd-collection"><div><h3>'+data.label+'</h3><small>'+data.description+'</small></div><button type="button" data-hd-focus>VIEW IN 3D ↗</button></div>';
 html+='<div class="hd-options">'+data.options.map(opt=>{
  const [id,name,price,color,desc]=opt,isActive=selectedStyle(category)===id,isOwned=owned(category,id),isShowing=active===id;
  const poor=st.cash<price&&!isOwned;
  return '<article class="hd-style '+(isShowing?'hd-current ':'')+(isActive?'hd-applied':'')+'">'+
   '<button class="hd-preview" type="button" data-hd-preview="'+category+':'+id+'" aria-label="Preview '+name+'">'+
    '<span class="hd-swatch" style="--sample:'+color+'"><i></i></span>'+
    '<span class="hd-style-name">'+name+'</span><span class="hd-style-desc">'+desc+'</span>'+
    '<span class="hd-style-tag">'+(isActive?'IN ROOM':isOwned?'OWNED':'$'+price)+'</span></button>'+
   '<button type="button" class="hd-purchase" data-hd-apply="'+category+':'+id+'" '+(isActive||poor?'disabled':'')+'>'+
    (isActive?'✓ INSTALLED':isOwned?'APPLY':poor?'NEED $'+(price-st.cash):'BUY · $'+price)+'</button></article>'
 }).join('')+'</div>';
 html+='<div class="hd-foot"><span>HOME VALUE · $'+(st.value||0)+'</span>'+
 (preview?'<button type="button" data-hd-revert>REVERT PREVIEW</button>':'<span>DESIGNS ARE SAVED</span>')+
 '</div><p class="hd-tip">Changes are visualized in the existing 3D house. Bought styles are yours permanently; switch back for free.</p>';
 root.innerHTML=html;
}
function apply(cat,id){
 let option=catalog[cat]?.options.find(o=>o[0]===id);
 if(!option)return;
 let ok=bridge()?.apply?.(cat,id,option[2]);
 if(!ok)return;
 preview=null;updateScene();render()
}
function showPreview(cat,id){
 if(!catalog[cat]?.options.some(o=>o[0]===id))return;
 category=cat;preview={category:cat,id};bridge()?.preview?.(cat,id);updateScene();render()
}
function install(){
 const tabs=document.querySelector('#notebook .note-tabs'),body=document.getElementById('noteBody');
 if(!tabs||!body)return;
 const tab=document.createElement('button');tab.type='button';tab.dataset.tab='design';tab.textContent='DESIGN';
 tabs.insertBefore(tab,tabs.firstChild);
 tab.addEventListener('click',()=>{clearPreview();bridge()?.open?.();render()});
 body.addEventListener('click',e=>{
  if(e.target.closest('[data-hd-focus]')){window.Evin3D?.focusDesign?.(category);return}
  let el=e.target.closest('[data-hd-category]');if(el){clearPreview();category=el.dataset.hdCategory;render();return}
  el=e.target.closest('[data-hd-preview]');if(el){let [c,id]=el.dataset.hdPreview.split(':');showPreview(c,id);return}
  el=e.target.closest('[data-hd-apply]');if(el){let [c,id]=el.dataset.hdApply.split(':');apply(c,id);return}
  if(e.target.closest('[data-hd-revert]')){clearPreview();render()}
 });
 const close=document.getElementById('closeNotebook');
 close?.addEventListener('click',clearPreview);
 document.getElementById('noteShade')?.addEventListener('click',clearPreview);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')clearPreview()});
 // The original Upgrades tab remains available for structural home expansions.
 const oldTabs=Array.from(tabs.querySelectorAll('button:not([data-tab="design"])'));
 oldTabs.forEach(b=>b.addEventListener('click',()=>{
  clearPreview();document.getElementById('notebook')?.classList.remove('design-mode');
 },true));
 window.HouseBossHomeDesign={render,clearPreview,effective,catalog,isFurnitureView(){return category==='furniture'&&document.getElementById('notebook')?.classList.contains('design-mode')},selectCategory(k){if(k==='furniture'||catalog[k]){clearPreview();category=k;render()}}};
}
install();
})();+(st.value||0)+' · HOME LVL '+(st.level||1);
 let html='<div class="hd-lead"><span class="hd-kicker">YOUR HOME, YOUR STYLE</span><p>Change finishes and furniture in your 3D home. Tap to preview before buying.</p></div>';
 html+='<nav class="hd-categories" aria-label="Design categories"><button type="button" data-hd-category="furniture"><span>▣</span>Furniture</button>'+Object.entries(catalog).map(([k,v])=>'<button type="button" data-hd-category="'+k+'" class="'+(k===category?'active':'')+'"><span>'+v.icon+'</span>'+v.label+'</button>').join('')+'</nav>';
 html+='<div class="hd-collection"><div><h3>'+data.label+'</h3><small>'+data.description+'</small></div><button type="button" data-hd-focus>VIEW IN 3D ↗</button></div>';
 html+='<div class="hd-options">'+data.options.map(opt=>{
  const [id,name,price,color,desc]=opt,isActive=selectedStyle(category)===id,isOwned=owned(category,id),isShowing=active===id;
  const poor=st.cash<price&&!isOwned;
  return '<article class="hd-style '+(isShowing?'hd-current ':'')+(isActive?'hd-applied':'')+'">'+
   '<button class="hd-preview" type="button" data-hd-preview="'+category+':'+id+'" aria-label="Preview '+name+'">'+
    '<span class="hd-swatch" style="--sample:'+color+'"><i></i></span>'+
    '<span class="hd-style-name">'+name+'</span><span class="hd-style-desc">'+desc+'</span>'+
    '<span class="hd-style-tag">'+(isActive?'IN ROOM':isOwned?'OWNED':'$'+price)+'</span></button>'+
   '<button type="button" class="hd-purchase" data-hd-apply="'+category+':'+id+'" '+(isActive||poor?'disabled':'')+'>'+
    (isActive?'✓ INSTALLED':isOwned?'APPLY':poor?'NEED $'+(price-st.cash):'BUY · $'+price)+'</button></article>'
 }).join('')+'</div>';
 html+='<div class="hd-foot"><span>HOME VALUE · $'+(st.value||0)+'</span>'+
 (preview?'<button type="button" data-hd-revert>REVERT PREVIEW</button>':'<span>DESIGNS ARE SAVED</span>')+
 '</div><p class="hd-tip">Changes are visualized in the existing 3D house. Bought styles are yours permanently; switch back for free.</p>';
 root.innerHTML=html;
}
function apply(cat,id){
 let option=catalog[cat]?.options.find(o=>o[0]===id);
 if(!option)return;
 let ok=bridge()?.apply?.(cat,id,option[2]);
 if(!ok)return;
 preview=null;updateScene();render()
}
function showPreview(cat,id){
 if(!catalog[cat]?.options.some(o=>o[0]===id))return;
 category=cat;preview={category:cat,id};bridge()?.preview?.(cat,id);updateScene();render()
}
function install(){
 const tabs=document.querySelector('#notebook .note-tabs'),body=document.getElementById('noteBody');
 if(!tabs||!body)return;
 const tab=document.createElement('button');tab.type='button';tab.dataset.tab='design';tab.textContent='DESIGN';
 tabs.insertBefore(tab,tabs.firstChild);
 tab.addEventListener('click',()=>{clearPreview();bridge()?.open?.();render()});
 body.addEventListener('click',e=>{
  if(e.target.closest('[data-hd-focus]')){window.Evin3D?.focusDesign?.(category);return}
  let el=e.target.closest('[data-hd-category]');if(el){clearPreview();category=el.dataset.hdCategory;render();return}
  el=e.target.closest('[data-hd-preview]');if(el){let [c,id]=el.dataset.hdPreview.split(':');showPreview(c,id);return}
  el=e.target.closest('[data-hd-apply]');if(el){let [c,id]=el.dataset.hdApply.split(':');apply(c,id);return}
  if(e.target.closest('[data-hd-revert]')){clearPreview();render()}
 });
 const close=document.getElementById('closeNotebook');
 close?.addEventListener('click',clearPreview);
 document.getElementById('noteShade')?.addEventListener('click',clearPreview);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')clearPreview()});
 // The original Upgrades tab remains available for structural home expansions.
 const oldTabs=Array.from(tabs.querySelectorAll('button:not([data-tab="design"])'));
 oldTabs.forEach(b=>b.addEventListener('click',()=>{
  clearPreview();document.getElementById('notebook')?.classList.remove('design-mode');
 },true));
 window.HouseBossHomeDesign={render,clearPreview,effective,catalog,isFurnitureView(){return category==='furniture'&&document.getElementById('notebook')?.classList.contains('design-mode')},selectCategory(k){if(k==='furniture'||catalog[k]){clearPreview();category=k;render()}}};
}
install();
})();+price)+'</span></button>'+
   '<button type="button" class="hd-purchase" data-hd-apply="'+category+':'+id+'" '+(isActive||poor?'disabled':'')+'>'+
    (isActive?'✓ INSTALLED':isOwned?'APPLY':poor?'NEED $'+(price-st.cash):'BUY · $'+price)+'</button></article>'
 }).join('')+'</div>';
 html+='<div class="hd-foot"><span>HOME VALUE · $'+(st.value||0)+'</span>'+
 (preview?'<button type="button" data-hd-revert>REVERT PREVIEW</button>':'<span>DESIGNS ARE SAVED</span>')+
 '</div><p class="hd-tip">Changes are visualized in the existing 3D house. Bought styles are yours permanently; switch back for free.</p>';
 root.innerHTML=html;
}
function apply(cat,id){
 let option=catalog[cat]?.options.find(o=>o[0]===id);
 if(!option)return;
 let ok=bridge()?.apply?.(cat,id,option[2]);
 if(!ok)return;
 preview=null;updateScene();render()
}
function showPreview(cat,id){
 if(!catalog[cat]?.options.some(o=>o[0]===id))return;
 category=cat;preview={category:cat,id};bridge()?.preview?.(cat,id);updateScene();render()
}
function install(){
 const tabs=document.querySelector('#notebook .note-tabs'),body=document.getElementById('noteBody');
 if(!tabs||!body)return;
 const tab=document.createElement('button');tab.type='button';tab.dataset.tab='design';tab.textContent='DESIGN';
 tabs.insertBefore(tab,tabs.firstChild);
 tab.addEventListener('click',()=>{clearPreview();bridge()?.open?.();render()});
 body.addEventListener('click',e=>{
  if(e.target.closest('[data-hd-focus]')){window.Evin3D?.focusDesign?.(category);return}
  let el=e.target.closest('[data-hd-category]');if(el){clearPreview();category=el.dataset.hdCategory;render();return}
  el=e.target.closest('[data-hd-preview]');if(el){let [c,id]=el.dataset.hdPreview.split(':');showPreview(c,id);return}
  el=e.target.closest('[data-hd-apply]');if(el){let [c,id]=el.dataset.hdApply.split(':');apply(c,id);return}
  if(e.target.closest('[data-hd-revert]')){clearPreview();render()}
 });
 const close=document.getElementById('closeNotebook');
 close?.addEventListener('click',clearPreview);
 document.getElementById('noteShade')?.addEventListener('click',clearPreview);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')clearPreview()});
 // The original Upgrades tab remains available for structural home expansions.
 const oldTabs=Array.from(tabs.querySelectorAll('button:not([data-tab="design"])'));
 oldTabs.forEach(b=>b.addEventListener('click',()=>{
  clearPreview();document.getElementById('notebook')?.classList.remove('design-mode');
 },true));
 window.HouseBossHomeDesign={render,clearPreview,effective,catalog,isFurnitureView(){return category==='furniture'&&document.getElementById('notebook')?.classList.contains('design-mode')},selectCategory(k){if(k==='furniture'||catalog[k]){clearPreview();category=k;render()}}};
}
install();
})();+Math.floor(st.cash)+' · Property value ;
 let html='<div class="hd-lead"><span class="hd-kicker">YOUR HOME, YOUR STYLE</span><p>Change finishes and furniture in your 3D home. Tap to preview before buying.</p></div>';
 html+='<nav class="hd-categories" aria-label="Design categories"><button type="button" data-hd-category="furniture"><span>▣</span>Furniture</button>'+Object.entries(catalog).map(([k,v])=>'<button type="button" data-hd-category="'+k+'" class="'+(k===category?'active':'')+'"><span>'+v.icon+'</span>'+v.label+'</button>').join('')+'</nav>';
 html+='<div class="hd-collection"><div><h3>'+data.label+'</h3><small>'+data.description+'</small></div><button type="button" data-hd-focus>VIEW IN 3D ↗</button></div>';
 html+='<div class="hd-options">'+data.options.map(opt=>{
  const [id,name,price,color,desc]=opt,isActive=selectedStyle(category)===id,isOwned=owned(category,id),isShowing=active===id;
  const poor=st.cash<price&&!isOwned;
  return '<article class="hd-style '+(isShowing?'hd-current ':'')+(isActive?'hd-applied':'')+'">'+
   '<button class="hd-preview" type="button" data-hd-preview="'+category+':'+id+'" aria-label="Preview '+name+'">'+
    '<span class="hd-swatch" style="--sample:'+color+'"><i></i></span>'+
    '<span class="hd-style-name">'+name+'</span><span class="hd-style-desc">'+desc+'</span>'+
    '<span class="hd-style-tag">'+(isActive?'IN ROOM':isOwned?'OWNED':'$'+price)+'</span></button>'+
   '<button type="button" class="hd-purchase" data-hd-apply="'+category+':'+id+'" '+(isActive||poor?'disabled':'')+'>'+
    (isActive?'✓ INSTALLED':isOwned?'APPLY':poor?'NEED $'+(price-st.cash):'BUY · $'+price)+'</button></article>'
 }).join('')+'</div>';
 html+='<div class="hd-foot"><span>HOME VALUE · $'+(st.value||0)+'</span>'+
 (preview?'<button type="button" data-hd-revert>REVERT PREVIEW</button>':'<span>DESIGNS ARE SAVED</span>')+
 '</div><p class="hd-tip">Changes are visualized in the existing 3D house. Bought styles are yours permanently; switch back for free.</p>';
 root.innerHTML=html;
}
function apply(cat,id){
 let option=catalog[cat]?.options.find(o=>o[0]===id);
 if(!option)return;
 let ok=bridge()?.apply?.(cat,id,option[2]);
 if(!ok)return;
 preview=null;updateScene();render()
}
function showPreview(cat,id){
 if(!catalog[cat]?.options.some(o=>o[0]===id))return;
 category=cat;preview={category:cat,id};bridge()?.preview?.(cat,id);updateScene();render()
}
function install(){
 const tabs=document.querySelector('#notebook .note-tabs'),body=document.getElementById('noteBody');
 if(!tabs||!body)return;
 const tab=document.createElement('button');tab.type='button';tab.dataset.tab='design';tab.textContent='DESIGN';
 tabs.insertBefore(tab,tabs.firstChild);
 tab.addEventListener('click',()=>{clearPreview();bridge()?.open?.();render()});
 body.addEventListener('click',e=>{
  if(e.target.closest('[data-hd-focus]')){window.Evin3D?.focusDesign?.(category);return}
  let el=e.target.closest('[data-hd-category]');if(el){clearPreview();category=el.dataset.hdCategory;render();return}
  el=e.target.closest('[data-hd-preview]');if(el){let [c,id]=el.dataset.hdPreview.split(':');showPreview(c,id);return}
  el=e.target.closest('[data-hd-apply]');if(el){let [c,id]=el.dataset.hdApply.split(':');apply(c,id);return}
  if(e.target.closest('[data-hd-revert]')){clearPreview();render()}
 });
 const close=document.getElementById('closeNotebook');
 close?.addEventListener('click',clearPreview);
 document.getElementById('noteShade')?.addEventListener('click',clearPreview);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')clearPreview()});
 // The original Upgrades tab remains available for structural home expansions.
 const oldTabs=Array.from(tabs.querySelectorAll('button:not([data-tab="design"])'));
 oldTabs.forEach(b=>b.addEventListener('click',()=>{
  clearPreview();document.getElementById('notebook')?.classList.remove('design-mode');
 },true));
 window.HouseBossHomeDesign={render,clearPreview,effective,catalog,isFurnitureView(){return category==='furniture'&&document.getElementById('notebook')?.classList.contains('design-mode')},selectCategory(k){if(k==='furniture'||catalog[k]){clearPreview();category=k;render()}}};
}
install();
})();+(st.value||0)+' · HOME LVL '+(st.level||1);
 let html='<div class="hd-lead"><span class="hd-kicker">YOUR HOME, YOUR STYLE</span><p>Change finishes and furniture in your 3D home. Tap to preview before buying.</p></div>';
 html+='<nav class="hd-categories" aria-label="Design categories"><button type="button" data-hd-category="furniture"><span>▣</span>Furniture</button>'+Object.entries(catalog).map(([k,v])=>'<button type="button" data-hd-category="'+k+'" class="'+(k===category?'active':'')+'"><span>'+v.icon+'</span>'+v.label+'</button>').join('')+'</nav>';
 html+='<div class="hd-collection"><div><h3>'+data.label+'</h3><small>'+data.description+'</small></div><button type="button" data-hd-focus>VIEW IN 3D ↗</button></div>';
 html+='<div class="hd-options">'+data.options.map(opt=>{
  const [id,name,price,color,desc]=opt,isActive=selectedStyle(category)===id,isOwned=owned(category,id),isShowing=active===id;
  const poor=st.cash<price&&!isOwned;
  return '<article class="hd-style '+(isShowing?'hd-current ':'')+(isActive?'hd-applied':'')+'">'+
   '<button class="hd-preview" type="button" data-hd-preview="'+category+':'+id+'" aria-label="Preview '+name+'">'+
    '<span class="hd-swatch" style="--sample:'+color+'"><i></i></span>'+
    '<span class="hd-style-name">'+name+'</span><span class="hd-style-desc">'+desc+'</span>'+
    '<span class="hd-style-tag">'+(isActive?'IN ROOM':isOwned?'OWNED':'$'+price)+'</span></button>'+
   '<button type="button" class="hd-purchase" data-hd-apply="'+category+':'+id+'" '+(isActive||poor?'disabled':'')+'>'+
    (isActive?'✓ INSTALLED':isOwned?'APPLY':poor?'NEED $'+(price-st.cash):'BUY · $'+price)+'</button></article>'
 }).join('')+'</div>';
 html+='<div class="hd-foot"><span>HOME VALUE · $'+(st.value||0)+'</span>'+
 (preview?'<button type="button" data-hd-revert>REVERT PREVIEW</button>':'<span>DESIGNS ARE SAVED</span>')+
 '</div><p class="hd-tip">Changes are visualized in the existing 3D house. Bought styles are yours permanently; switch back for free.</p>';
 root.innerHTML=html;
}
function apply(cat,id){
 let option=catalog[cat]?.options.find(o=>o[0]===id);
 if(!option)return;
 let ok=bridge()?.apply?.(cat,id,option[2]);
 if(!ok)return;
 preview=null;updateScene();render()
}
function showPreview(cat,id){
 if(!catalog[cat]?.options.some(o=>o[0]===id))return;
 category=cat;preview={category:cat,id};bridge()?.preview?.(cat,id);updateScene();render()
}
function install(){
 const tabs=document.querySelector('#notebook .note-tabs'),body=document.getElementById('noteBody');
 if(!tabs||!body)return;
 const tab=document.createElement('button');tab.type='button';tab.dataset.tab='design';tab.textContent='DESIGN';
 tabs.insertBefore(tab,tabs.firstChild);
 tab.addEventListener('click',()=>{clearPreview();bridge()?.open?.();render()});
 body.addEventListener('click',e=>{
  if(e.target.closest('[data-hd-focus]')){window.Evin3D?.focusDesign?.(category);return}
  let el=e.target.closest('[data-hd-category]');if(el){clearPreview();category=el.dataset.hdCategory;render();return}
  el=e.target.closest('[data-hd-preview]');if(el){let [c,id]=el.dataset.hdPreview.split(':');showPreview(c,id);return}
  el=e.target.closest('[data-hd-apply]');if(el){let [c,id]=el.dataset.hdApply.split(':');apply(c,id);return}
  if(e.target.closest('[data-hd-revert]')){clearPreview();render()}
 });
 const close=document.getElementById('closeNotebook');
 close?.addEventListener('click',clearPreview);
 document.getElementById('noteShade')?.addEventListener('click',clearPreview);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')clearPreview()});
 // The original Upgrades tab remains available for structural home expansions.
 const oldTabs=Array.from(tabs.querySelectorAll('button:not([data-tab="design"])'));
 oldTabs.forEach(b=>b.addEventListener('click',()=>{
  clearPreview();document.getElementById('notebook')?.classList.remove('design-mode');
 },true));
 window.HouseBossHomeDesign={render,clearPreview,effective,catalog,isFurnitureView(){return category==='furniture'&&document.getElementById('notebook')?.classList.contains('design-mode')},selectCategory(k){if(k==='furniture'||catalog[k]){clearPreview();category=k;render()}}};
}
install();
})();+(price-st.cash):'BUY · +'</button></article>'
 }).join('')+'</div>';
 html+='<div class="hd-foot"><span>HOME VALUE · $'+(st.value||0)+'</span>'+
 (preview?'<button type="button" data-hd-revert>REVERT PREVIEW</button>':'<span>DESIGNS ARE SAVED</span>')+
 '</div><p class="hd-tip">Changes are visualized in the existing 3D house. Bought styles are yours permanently; switch back for free.</p>';
 root.innerHTML=html;
}
function apply(cat,id){
 let option=catalog[cat]?.options.find(o=>o[0]===id);
 if(!option)return;
 let ok=bridge()?.apply?.(cat,id,option[2]);
 if(!ok)return;
 preview=null;updateScene();render()
}
function showPreview(cat,id){
 if(!catalog[cat]?.options.some(o=>o[0]===id))return;
 category=cat;preview={category:cat,id};bridge()?.preview?.(cat,id);updateScene();render()
}
function install(){
 const tabs=document.querySelector('#notebook .note-tabs'),body=document.getElementById('noteBody');
 if(!tabs||!body)return;
 const tab=document.createElement('button');tab.type='button';tab.dataset.tab='design';tab.textContent='DESIGN';
 tabs.insertBefore(tab,tabs.firstChild);
 tab.addEventListener('click',()=>{clearPreview();bridge()?.open?.();render()});
 body.addEventListener('click',e=>{
  if(e.target.closest('[data-hd-focus]')){window.Evin3D?.focusDesign?.(category);return}
  let el=e.target.closest('[data-hd-category]');if(el){clearPreview();category=el.dataset.hdCategory;render();return}
  el=e.target.closest('[data-hd-preview]');if(el){let [c,id]=el.dataset.hdPreview.split(':');showPreview(c,id);return}
  el=e.target.closest('[data-hd-apply]');if(el){let [c,id]=el.dataset.hdApply.split(':');apply(c,id);return}
  if(e.target.closest('[data-hd-revert]')){clearPreview();render()}
 });
 const close=document.getElementById('closeNotebook');
 close?.addEventListener('click',clearPreview);
 document.getElementById('noteShade')?.addEventListener('click',clearPreview);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')clearPreview()});
 // The original Upgrades tab remains available for structural home expansions.
 const oldTabs=Array.from(tabs.querySelectorAll('button:not([data-tab="design"])'));
 oldTabs.forEach(b=>b.addEventListener('click',()=>{
  clearPreview();document.getElementById('notebook')?.classList.remove('design-mode');
 },true));
 window.HouseBossHomeDesign={render,clearPreview,effective,catalog,isFurnitureView(){return category==='furniture'&&document.getElementById('notebook')?.classList.contains('design-mode')},selectCategory(k){if(k==='furniture'||catalog[k]){clearPreview();category=k;render()}}};
}
install();
})();+Math.floor(st.cash)+' · Property value ;
 let html='<div class="hd-lead"><span class="hd-kicker">YOUR HOME, YOUR STYLE</span><p>Change finishes and furniture in your 3D home. Tap to preview before buying.</p></div>';
 html+='<nav class="hd-categories" aria-label="Design categories"><button type="button" data-hd-category="furniture"><span>▣</span>Furniture</button>'+Object.entries(catalog).map(([k,v])=>'<button type="button" data-hd-category="'+k+'" class="'+(k===category?'active':'')+'"><span>'+v.icon+'</span>'+v.label+'</button>').join('')+'</nav>';
 html+='<div class="hd-collection"><div><h3>'+data.label+'</h3><small>'+data.description+'</small></div><button type="button" data-hd-focus>VIEW IN 3D ↗</button></div>';
 html+='<div class="hd-options">'+data.options.map(opt=>{
  const [id,name,price,color,desc]=opt,isActive=selectedStyle(category)===id,isOwned=owned(category,id),isShowing=active===id;
  const poor=st.cash<price&&!isOwned;
  return '<article class="hd-style '+(isShowing?'hd-current ':'')+(isActive?'hd-applied':'')+'">'+
   '<button class="hd-preview" type="button" data-hd-preview="'+category+':'+id+'" aria-label="Preview '+name+'">'+
    '<span class="hd-swatch" style="--sample:'+color+'"><i></i></span>'+
    '<span class="hd-style-name">'+name+'</span><span class="hd-style-desc">'+desc+'</span>'+
    '<span class="hd-style-tag">'+(isActive?'IN ROOM':isOwned?'OWNED':'$'+price)+'</span></button>'+
   '<button type="button" class="hd-purchase" data-hd-apply="'+category+':'+id+'" '+(isActive||poor?'disabled':'')+'>'+
    (isActive?'✓ INSTALLED':isOwned?'APPLY':poor?'NEED $'+(price-st.cash):'BUY · $'+price)+'</button></article>'
 }).join('')+'</div>';
 html+='<div class="hd-foot"><span>HOME VALUE · $'+(st.value||0)+'</span>'+
 (preview?'<button type="button" data-hd-revert>REVERT PREVIEW</button>':'<span>DESIGNS ARE SAVED</span>')+
 '</div><p class="hd-tip">Changes are visualized in the existing 3D house. Bought styles are yours permanently; switch back for free.</p>';
 root.innerHTML=html;
}
function apply(cat,id){
 let option=catalog[cat]?.options.find(o=>o[0]===id);
 if(!option)return;
 let ok=bridge()?.apply?.(cat,id,option[2]);
 if(!ok)return;
 preview=null;updateScene();render()
}
function showPreview(cat,id){
 if(!catalog[cat]?.options.some(o=>o[0]===id))return;
 category=cat;preview={category:cat,id};bridge()?.preview?.(cat,id);updateScene();render()
}
function install(){
 const tabs=document.querySelector('#notebook .note-tabs'),body=document.getElementById('noteBody');
 if(!tabs||!body)return;
 const tab=document.createElement('button');tab.type='button';tab.dataset.tab='design';tab.textContent='DESIGN';
 tabs.insertBefore(tab,tabs.firstChild);
 tab.addEventListener('click',()=>{clearPreview();bridge()?.open?.();render()});
 body.addEventListener('click',e=>{
  if(e.target.closest('[data-hd-focus]')){window.Evin3D?.focusDesign?.(category);return}
  let el=e.target.closest('[data-hd-category]');if(el){clearPreview();category=el.dataset.hdCategory;render();return}
  el=e.target.closest('[data-hd-preview]');if(el){let [c,id]=el.dataset.hdPreview.split(':');showPreview(c,id);return}
  el=e.target.closest('[data-hd-apply]');if(el){let [c,id]=el.dataset.hdApply.split(':');apply(c,id);return}
  if(e.target.closest('[data-hd-revert]')){clearPreview();render()}
 });
 const close=document.getElementById('closeNotebook');
 close?.addEventListener('click',clearPreview);
 document.getElementById('noteShade')?.addEventListener('click',clearPreview);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')clearPreview()});
 // The original Upgrades tab remains available for structural home expansions.
 const oldTabs=Array.from(tabs.querySelectorAll('button:not([data-tab="design"])'));
 oldTabs.forEach(b=>b.addEventListener('click',()=>{
  clearPreview();document.getElementById('notebook')?.classList.remove('design-mode');
 },true));
 window.HouseBossHomeDesign={render,clearPreview,effective,catalog,isFurnitureView(){return category==='furniture'&&document.getElementById('notebook')?.classList.contains('design-mode')},selectCategory(k){if(k==='furniture'||catalog[k]){clearPreview();category=k;render()}}};
}
install();
})();+(st.value||0)+' · HOME LVL '+(st.level||1);
 let html='<div class="hd-lead"><span class="hd-kicker">YOUR HOME, YOUR STYLE</span><p>Change finishes and furniture in your 3D home. Tap to preview before buying.</p></div>';
 html+='<nav class="hd-categories" aria-label="Design categories"><button type="button" data-hd-category="furniture"><span>▣</span>Furniture</button>'+Object.entries(catalog).map(([k,v])=>'<button type="button" data-hd-category="'+k+'" class="'+(k===category?'active':'')+'"><span>'+v.icon+'</span>'+v.label+'</button>').join('')+'</nav>';
 html+='<div class="hd-collection"><div><h3>'+data.label+'</h3><small>'+data.description+'</small></div><button type="button" data-hd-focus>VIEW IN 3D ↗</button></div>';
 html+='<div class="hd-options">'+data.options.map(opt=>{
  const [id,name,price,color,desc]=opt,isActive=selectedStyle(category)===id,isOwned=owned(category,id),isShowing=active===id;
  const poor=st.cash<price&&!isOwned;
  return '<article class="hd-style '+(isShowing?'hd-current ':'')+(isActive?'hd-applied':'')+'">'+
   '<button class="hd-preview" type="button" data-hd-preview="'+category+':'+id+'" aria-label="Preview '+name+'">'+
    '<span class="hd-swatch" style="--sample:'+color+'"><i></i></span>'+
    '<span class="hd-style-name">'+name+'</span><span class="hd-style-desc">'+desc+'</span>'+
    '<span class="hd-style-tag">'+(isActive?'IN ROOM':isOwned?'OWNED':'$'+price)+'</span></button>'+
   '<button type="button" class="hd-purchase" data-hd-apply="'+category+':'+id+'" '+(isActive||poor?'disabled':'')+'>'+
    (isActive?'✓ INSTALLED':isOwned?'APPLY':poor?'NEED $'+(price-st.cash):'BUY · $'+price)+'</button></article>'
 }).join('')+'</div>';
 html+='<div class="hd-foot"><span>HOME VALUE · $'+(st.value||0)+'</span>'+
 (preview?'<button type="button" data-hd-revert>REVERT PREVIEW</button>':'<span>DESIGNS ARE SAVED</span>')+
 '</div><p class="hd-tip">Changes are visualized in the existing 3D house. Bought styles are yours permanently; switch back for free.</p>';
 root.innerHTML=html;
}
function apply(cat,id){
 let option=catalog[cat]?.options.find(o=>o[0]===id);
 if(!option)return;
 let ok=bridge()?.apply?.(cat,id,option[2]);
 if(!ok)return;
 preview=null;updateScene();render()
}
function showPreview(cat,id){
 if(!catalog[cat]?.options.some(o=>o[0]===id))return;
 category=cat;preview={category:cat,id};bridge()?.preview?.(cat,id);updateScene();render()
}
function install(){
 const tabs=document.querySelector('#notebook .note-tabs'),body=document.getElementById('noteBody');
 if(!tabs||!body)return;
 const tab=document.createElement('button');tab.type='button';tab.dataset.tab='design';tab.textContent='DESIGN';
 tabs.insertBefore(tab,tabs.firstChild);
 tab.addEventListener('click',()=>{clearPreview();bridge()?.open?.();render()});
 body.addEventListener('click',e=>{
  if(e.target.closest('[data-hd-focus]')){window.Evin3D?.focusDesign?.(category);return}
  let el=e.target.closest('[data-hd-category]');if(el){clearPreview();category=el.dataset.hdCategory;render();return}
  el=e.target.closest('[data-hd-preview]');if(el){let [c,id]=el.dataset.hdPreview.split(':');showPreview(c,id);return}
  el=e.target.closest('[data-hd-apply]');if(el){let [c,id]=el.dataset.hdApply.split(':');apply(c,id);return}
  if(e.target.closest('[data-hd-revert]')){clearPreview();render()}
 });
 const close=document.getElementById('closeNotebook');
 close?.addEventListener('click',clearPreview);
 document.getElementById('noteShade')?.addEventListener('click',clearPreview);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')clearPreview()});
 // The original Upgrades tab remains available for structural home expansions.
 const oldTabs=Array.from(tabs.querySelectorAll('button:not([data-tab="design"])'));
 oldTabs.forEach(b=>b.addEventListener('click',()=>{
  clearPreview();document.getElementById('notebook')?.classList.remove('design-mode');
 },true));
 window.HouseBossHomeDesign={render,clearPreview,effective,catalog,isFurnitureView(){return category==='furniture'&&document.getElementById('notebook')?.classList.contains('design-mode')},selectCategory(k){if(k==='furniture'||catalog[k]){clearPreview();category=k;render()}}};
}
install();
})();+price)+'</span></button>'+
   '<button type="button" class="hd-purchase" data-hd-apply="'+category+':'+id+'" '+(isActive||poor?'disabled':'')+'>'+
    (isActive?'✓ INSTALLED':isOwned?'APPLY':poor?'NEED $'+(price-st.cash):'BUY · $'+price)+'</button></article>'
 }).join('')+'</div>';
 html+='<div class="hd-foot"><span>HOME VALUE · $'+(st.value||0)+'</span>'+
 (preview?'<button type="button" data-hd-revert>REVERT PREVIEW</button>':'<span>DESIGNS ARE SAVED</span>')+
 '</div><p class="hd-tip">Changes are visualized in the existing 3D house. Bought styles are yours permanently; switch back for free.</p>';
 root.innerHTML=html;
}
function apply(cat,id){
 let option=catalog[cat]?.options.find(o=>o[0]===id);
 if(!option)return;
 let ok=bridge()?.apply?.(cat,id,option[2]);
 if(!ok)return;
 preview=null;updateScene();render()
}
function showPreview(cat,id){
 if(!catalog[cat]?.options.some(o=>o[0]===id))return;
 category=cat;preview={category:cat,id};bridge()?.preview?.(cat,id);updateScene();render()
}
function install(){
 const tabs=document.querySelector('#notebook .note-tabs'),body=document.getElementById('noteBody');
 if(!tabs||!body)return;
 const tab=document.createElement('button');tab.type='button';tab.dataset.tab='design';tab.textContent='DESIGN';
 tabs.insertBefore(tab,tabs.firstChild);
 tab.addEventListener('click',()=>{clearPreview();bridge()?.open?.();render()});
 body.addEventListener('click',e=>{
  if(e.target.closest('[data-hd-focus]')){window.Evin3D?.focusDesign?.(category);return}
  let el=e.target.closest('[data-hd-category]');if(el){clearPreview();category=el.dataset.hdCategory;render();return}
  el=e.target.closest('[data-hd-preview]');if(el){let [c,id]=el.dataset.hdPreview.split(':');showPreview(c,id);return}
  el=e.target.closest('[data-hd-apply]');if(el){let [c,id]=el.dataset.hdApply.split(':');apply(c,id);return}
  if(e.target.closest('[data-hd-revert]')){clearPreview();render()}
 });
 const close=document.getElementById('closeNotebook');
 close?.addEventListener('click',clearPreview);
 document.getElementById('noteShade')?.addEventListener('click',clearPreview);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')clearPreview()});
 // The original Upgrades tab remains available for structural home expansions.
 const oldTabs=Array.from(tabs.querySelectorAll('button:not([data-tab="design"])'));
 oldTabs.forEach(b=>b.addEventListener('click',()=>{
  clearPreview();document.getElementById('notebook')?.classList.remove('design-mode');
 },true));
 window.HouseBossHomeDesign={render,clearPreview,effective,catalog,isFurnitureView(){return category==='furniture'&&document.getElementById('notebook')?.classList.contains('design-mode')},selectCategory(k){if(k==='furniture'||catalog[k]){clearPreview();category=k;render()}}};
}
install();
})();+Math.floor(st.cash)+' · Property value ;
 let html='<div class="hd-lead"><span class="hd-kicker">YOUR HOME, YOUR STYLE</span><p>Change finishes and furniture in your 3D home. Tap to preview before buying.</p></div>';
 html+='<nav class="hd-categories" aria-label="Design categories"><button type="button" data-hd-category="furniture"><span>▣</span>Furniture</button>'+Object.entries(catalog).map(([k,v])=>'<button type="button" data-hd-category="'+k+'" class="'+(k===category?'active':'')+'"><span>'+v.icon+'</span>'+v.label+'</button>').join('')+'</nav>';
 html+='<div class="hd-collection"><div><h3>'+data.label+'</h3><small>'+data.description+'</small></div><button type="button" data-hd-focus>VIEW IN 3D ↗</button></div>';
 html+='<div class="hd-options">'+data.options.map(opt=>{
  const [id,name,price,color,desc]=opt,isActive=selectedStyle(category)===id,isOwned=owned(category,id),isShowing=active===id;
  const poor=st.cash<price&&!isOwned;
  return '<article class="hd-style '+(isShowing?'hd-current ':'')+(isActive?'hd-applied':'')+'">'+
   '<button class="hd-preview" type="button" data-hd-preview="'+category+':'+id+'" aria-label="Preview '+name+'">'+
    '<span class="hd-swatch" style="--sample:'+color+'"><i></i></span>'+
    '<span class="hd-style-name">'+name+'</span><span class="hd-style-desc">'+desc+'</span>'+
    '<span class="hd-style-tag">'+(isActive?'IN ROOM':isOwned?'OWNED':'$'+price)+'</span></button>'+
   '<button type="button" class="hd-purchase" data-hd-apply="'+category+':'+id+'" '+(isActive||poor?'disabled':'')+'>'+
    (isActive?'✓ INSTALLED':isOwned?'APPLY':poor?'NEED $'+(price-st.cash):'BUY · $'+price)+'</button></article>'
 }).join('')+'</div>';
 html+='<div class="hd-foot"><span>HOME VALUE · $'+(st.value||0)+'</span>'+
 (preview?'<button type="button" data-hd-revert>REVERT PREVIEW</button>':'<span>DESIGNS ARE SAVED</span>')+
 '</div><p class="hd-tip">Changes are visualized in the existing 3D house. Bought styles are yours permanently; switch back for free.</p>';
 root.innerHTML=html;
}
function apply(cat,id){
 let option=catalog[cat]?.options.find(o=>o[0]===id);
 if(!option)return;
 let ok=bridge()?.apply?.(cat,id,option[2]);
 if(!ok)return;
 preview=null;updateScene();render()
}
function showPreview(cat,id){
 if(!catalog[cat]?.options.some(o=>o[0]===id))return;
 category=cat;preview={category:cat,id};bridge()?.preview?.(cat,id);updateScene();render()
}
function install(){
 const tabs=document.querySelector('#notebook .note-tabs'),body=document.getElementById('noteBody');
 if(!tabs||!body)return;
 const tab=document.createElement('button');tab.type='button';tab.dataset.tab='design';tab.textContent='DESIGN';
 tabs.insertBefore(tab,tabs.firstChild);
 tab.addEventListener('click',()=>{clearPreview();bridge()?.open?.();render()});
 body.addEventListener('click',e=>{
  if(e.target.closest('[data-hd-focus]')){window.Evin3D?.focusDesign?.(category);return}
  let el=e.target.closest('[data-hd-category]');if(el){clearPreview();category=el.dataset.hdCategory;render();return}
  el=e.target.closest('[data-hd-preview]');if(el){let [c,id]=el.dataset.hdPreview.split(':');showPreview(c,id);return}
  el=e.target.closest('[data-hd-apply]');if(el){let [c,id]=el.dataset.hdApply.split(':');apply(c,id);return}
  if(e.target.closest('[data-hd-revert]')){clearPreview();render()}
 });
 const close=document.getElementById('closeNotebook');
 close?.addEventListener('click',clearPreview);
 document.getElementById('noteShade')?.addEventListener('click',clearPreview);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')clearPreview()});
 // The original Upgrades tab remains available for structural home expansions.
 const oldTabs=Array.from(tabs.querySelectorAll('button:not([data-tab="design"])'));
 oldTabs.forEach(b=>b.addEventListener('click',()=>{
  clearPreview();document.getElementById('notebook')?.classList.remove('design-mode');
 },true));
 window.HouseBossHomeDesign={render,clearPreview,effective,catalog,isFurnitureView(){return category==='furniture'&&document.getElementById('notebook')?.classList.contains('design-mode')},selectCategory(k){if(k==='furniture'||catalog[k]){clearPreview();category=k;render()}}};
}
install();
})();+(st.value||0)+' · HOME LVL '+(st.level||1);
 let html='<div class="hd-lead"><span class="hd-kicker">YOUR HOME, YOUR STYLE</span><p>Change finishes and furniture in your 3D home. Tap to preview before buying.</p></div>';
 html+='<nav class="hd-categories" aria-label="Design categories"><button type="button" data-hd-category="furniture"><span>▣</span>Furniture</button>'+Object.entries(catalog).map(([k,v])=>'<button type="button" data-hd-category="'+k+'" class="'+(k===category?'active':'')+'"><span>'+v.icon+'</span>'+v.label+'</button>').join('')+'</nav>';
 html+='<div class="hd-collection"><div><h3>'+data.label+'</h3><small>'+data.description+'</small></div><button type="button" data-hd-focus>VIEW IN 3D ↗</button></div>';
 html+='<div class="hd-options">'+data.options.map(opt=>{
  const [id,name,price,color,desc]=opt,isActive=selectedStyle(category)===id,isOwned=owned(category,id),isShowing=active===id;
  const poor=st.cash<price&&!isOwned;
  return '<article class="hd-style '+(isShowing?'hd-current ':'')+(isActive?'hd-applied':'')+'">'+
   '<button class="hd-preview" type="button" data-hd-preview="'+category+':'+id+'" aria-label="Preview '+name+'">'+
    '<span class="hd-swatch" style="--sample:'+color+'"><i></i></span>'+
    '<span class="hd-style-name">'+name+'</span><span class="hd-style-desc">'+desc+'</span>'+
    '<span class="hd-style-tag">'+(isActive?'IN ROOM':isOwned?'OWNED':'$'+price)+'</span></button>'+
   '<button type="button" class="hd-purchase" data-hd-apply="'+category+':'+id+'" '+(isActive||poor?'disabled':'')+'>'+
    (isActive?'✓ INSTALLED':isOwned?'APPLY':poor?'NEED $'+(price-st.cash):'BUY · $'+price)+'</button></article>'
 }).join('')+'</div>';
 html+='<div class="hd-foot"><span>HOME VALUE · $'+(st.value||0)+'</span>'+
 (preview?'<button type="button" data-hd-revert>REVERT PREVIEW</button>':'<span>DESIGNS ARE SAVED</span>')+
 '</div><p class="hd-tip">Changes are visualized in the existing 3D house. Bought styles are yours permanently; switch back for free.</p>';
 root.innerHTML=html;
}
function apply(cat,id){
 let option=catalog[cat]?.options.find(o=>o[0]===id);
 if(!option)return;
 let ok=bridge()?.apply?.(cat,id,option[2]);
 if(!ok)return;
 preview=null;updateScene();render()
}
function showPreview(cat,id){
 if(!catalog[cat]?.options.some(o=>o[0]===id))return;
 category=cat;preview={category:cat,id};bridge()?.preview?.(cat,id);updateScene();render()
}
function install(){
 const tabs=document.querySelector('#notebook .note-tabs'),body=document.getElementById('noteBody');
 if(!tabs||!body)return;
 const tab=document.createElement('button');tab.type='button';tab.dataset.tab='design';tab.textContent='DESIGN';
 tabs.insertBefore(tab,tabs.firstChild);
 tab.addEventListener('click',()=>{clearPreview();bridge()?.open?.();render()});
 body.addEventListener('click',e=>{
  if(e.target.closest('[data-hd-focus]')){window.Evin3D?.focusDesign?.(category);return}
  let el=e.target.closest('[data-hd-category]');if(el){clearPreview();category=el.dataset.hdCategory;render();return}
  el=e.target.closest('[data-hd-preview]');if(el){let [c,id]=el.dataset.hdPreview.split(':');showPreview(c,id);return}
  el=e.target.closest('[data-hd-apply]');if(el){let [c,id]=el.dataset.hdApply.split(':');apply(c,id);return}
  if(e.target.closest('[data-hd-revert]')){clearPreview();render()}
 });
 const close=document.getElementById('closeNotebook');
 close?.addEventListener('click',clearPreview);
 document.getElementById('noteShade')?.addEventListener('click',clearPreview);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')clearPreview()});
 // The original Upgrades tab remains available for structural home expansions.
 const oldTabs=Array.from(tabs.querySelectorAll('button:not([data-tab="design"])'));
 oldTabs.forEach(b=>b.addEventListener('click',()=>{
  clearPreview();document.getElementById('notebook')?.classList.remove('design-mode');
 },true));
 window.HouseBossHomeDesign={render,clearPreview,effective,catalog,isFurnitureView(){return category==='furniture'&&document.getElementById('notebook')?.classList.contains('design-mode')},selectCategory(k){if(k==='furniture'||catalog[k]){clearPreview();category=k;render()}}};
}
install();
})();+price)+'</button></article>'
 }).join('')+'</div>';
 html+='<div class="hd-foot"><span>HOME VALUE · $'+(st.value||0)+'</span>'+
 (preview?'<button type="button" data-hd-revert>REVERT PREVIEW</button>':'<span>DESIGNS ARE SAVED</span>')+
 '</div><p class="hd-tip">Changes are visualized in the existing 3D house. Bought styles are yours permanently; switch back for free.</p>';
 root.innerHTML=html;
}
function apply(cat,id){
 let option=catalog[cat]?.options.find(o=>o[0]===id);
 if(!option)return;
 let ok=bridge()?.apply?.(cat,id,option[2]);
 if(!ok)return;
 preview=null;updateScene();render()
}
function showPreview(cat,id){
 if(!catalog[cat]?.options.some(o=>o[0]===id))return;
 category=cat;preview={category:cat,id};bridge()?.preview?.(cat,id);updateScene();render()
}
function install(){
 const tabs=document.querySelector('#notebook .note-tabs'),body=document.getElementById('noteBody');
 if(!tabs||!body)return;
 const tab=document.createElement('button');tab.type='button';tab.dataset.tab='design';tab.textContent='DESIGN';
 tabs.insertBefore(tab,tabs.firstChild);
 tab.addEventListener('click',()=>{clearPreview();bridge()?.open?.();render()});
 body.addEventListener('click',e=>{
  if(e.target.closest('[data-hd-focus]')){window.Evin3D?.focusDesign?.(category);return}
  let el=e.target.closest('[data-hd-category]');if(el){clearPreview();category=el.dataset.hdCategory;render();return}
  el=e.target.closest('[data-hd-preview]');if(el){let [c,id]=el.dataset.hdPreview.split(':');showPreview(c,id);return}
  el=e.target.closest('[data-hd-apply]');if(el){let [c,id]=el.dataset.hdApply.split(':');apply(c,id);return}
  if(e.target.closest('[data-hd-revert]')){clearPreview();render()}
 });
 const close=document.getElementById('closeNotebook');
 close?.addEventListener('click',clearPreview);
 document.getElementById('noteShade')?.addEventListener('click',clearPreview);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')clearPreview()});
 // The original Upgrades tab remains available for structural home expansions.
 const oldTabs=Array.from(tabs.querySelectorAll('button:not([data-tab="design"])'));
 oldTabs.forEach(b=>b.addEventListener('click',()=>{
  clearPreview();document.getElementById('notebook')?.classList.remove('design-mode');
 },true));
 window.HouseBossHomeDesign={render,clearPreview,effective,catalog,isFurnitureView(){return category==='furniture'&&document.getElementById('notebook')?.classList.contains('design-mode')},selectCategory(k){if(k==='furniture'||catalog[k]){clearPreview();category=k;render()}}};
}
install();
})();+Math.floor(st.cash)+' · Property value ;
 let html='<div class="hd-lead"><span class="hd-kicker">YOUR HOME, YOUR STYLE</span><p>Change finishes and furniture in your 3D home. Tap to preview before buying.</p></div>';
 html+='<nav class="hd-categories" aria-label="Design categories"><button type="button" data-hd-category="furniture"><span>▣</span>Furniture</button>'+Object.entries(catalog).map(([k,v])=>'<button type="button" data-hd-category="'+k+'" class="'+(k===category?'active':'')+'"><span>'+v.icon+'</span>'+v.label+'</button>').join('')+'</nav>';
 html+='<div class="hd-collection"><div><h3>'+data.label+'</h3><small>'+data.description+'</small></div><button type="button" data-hd-focus>VIEW IN 3D ↗</button></div>';
 html+='<div class="hd-options">'+data.options.map(opt=>{
  const [id,name,price,color,desc]=opt,isActive=selectedStyle(category)===id,isOwned=owned(category,id),isShowing=active===id;
  const poor=st.cash<price&&!isOwned;
  return '<article class="hd-style '+(isShowing?'hd-current ':'')+(isActive?'hd-applied':'')+'">'+
   '<button class="hd-preview" type="button" data-hd-preview="'+category+':'+id+'" aria-label="Preview '+name+'">'+
    '<span class="hd-swatch" style="--sample:'+color+'"><i></i></span>'+
    '<span class="hd-style-name">'+name+'</span><span class="hd-style-desc">'+desc+'</span>'+
    '<span class="hd-style-tag">'+(isActive?'IN ROOM':isOwned?'OWNED':'$'+price)+'</span></button>'+
   '<button type="button" class="hd-purchase" data-hd-apply="'+category+':'+id+'" '+(isActive||poor?'disabled':'')+'>'+
    (isActive?'✓ INSTALLED':isOwned?'APPLY':poor?'NEED $'+(price-st.cash):'BUY · $'+price)+'</button></article>'
 }).join('')+'</div>';
 html+='<div class="hd-foot"><span>HOME VALUE · $'+(st.value||0)+'</span>'+
 (preview?'<button type="button" data-hd-revert>REVERT PREVIEW</button>':'<span>DESIGNS ARE SAVED</span>')+
 '</div><p class="hd-tip">Changes are visualized in the existing 3D house. Bought styles are yours permanently; switch back for free.</p>';
 root.innerHTML=html;
}
function apply(cat,id){
 let option=catalog[cat]?.options.find(o=>o[0]===id);
 if(!option)return;
 let ok=bridge()?.apply?.(cat,id,option[2]);
 if(!ok)return;
 preview=null;updateScene();render()
}
function showPreview(cat,id){
 if(!catalog[cat]?.options.some(o=>o[0]===id))return;
 category=cat;preview={category:cat,id};bridge()?.preview?.(cat,id);updateScene();render()
}
function install(){
 const tabs=document.querySelector('#notebook .note-tabs'),body=document.getElementById('noteBody');
 if(!tabs||!body)return;
 const tab=document.createElement('button');tab.type='button';tab.dataset.tab='design';tab.textContent='DESIGN';
 tabs.insertBefore(tab,tabs.firstChild);
 tab.addEventListener('click',()=>{clearPreview();bridge()?.open?.();render()});
 body.addEventListener('click',e=>{
  if(e.target.closest('[data-hd-focus]')){window.Evin3D?.focusDesign?.(category);return}
  let el=e.target.closest('[data-hd-category]');if(el){clearPreview();category=el.dataset.hdCategory;render();return}
  el=e.target.closest('[data-hd-preview]');if(el){let [c,id]=el.dataset.hdPreview.split(':');showPreview(c,id);return}
  el=e.target.closest('[data-hd-apply]');if(el){let [c,id]=el.dataset.hdApply.split(':');apply(c,id);return}
  if(e.target.closest('[data-hd-revert]')){clearPreview();render()}
 });
 const close=document.getElementById('closeNotebook');
 close?.addEventListener('click',clearPreview);
 document.getElementById('noteShade')?.addEventListener('click',clearPreview);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')clearPreview()});
 // The original Upgrades tab remains available for structural home expansions.
 const oldTabs=Array.from(tabs.querySelectorAll('button:not([data-tab="design"])'));
 oldTabs.forEach(b=>b.addEventListener('click',()=>{
  clearPreview();document.getElementById('notebook')?.classList.remove('design-mode');
 },true));
 window.HouseBossHomeDesign={render,clearPreview,effective,catalog,isFurnitureView(){return category==='furniture'&&document.getElementById('notebook')?.classList.contains('design-mode')},selectCategory(k){if(k==='furniture'||catalog[k]){clearPreview();category=k;render()}}};
}
install();
})();+(st.value||0)+' · HOME LVL '+(st.level||1);
 let html='<div class="hd-lead"><span class="hd-kicker">YOUR HOME, YOUR STYLE</span><p>Change finishes and furniture in your 3D home. Tap to preview before buying.</p></div>';
 html+='<nav class="hd-categories" aria-label="Design categories"><button type="button" data-hd-category="furniture"><span>▣</span>Furniture</button>'+Object.entries(catalog).map(([k,v])=>'<button type="button" data-hd-category="'+k+'" class="'+(k===category?'active':'')+'"><span>'+v.icon+'</span>'+v.label+'</button>').join('')+'</nav>';
 html+='<div class="hd-collection"><div><h3>'+data.label+'</h3><small>'+data.description+'</small></div><button type="button" data-hd-focus>VIEW IN 3D ↗</button></div>';
 html+='<div class="hd-options">'+data.options.map(opt=>{
  const [id,name,price,color,desc]=opt,isActive=selectedStyle(category)===id,isOwned=owned(category,id),isShowing=active===id;
  const poor=st.cash<price&&!isOwned;
  return '<article class="hd-style '+(isShowing?'hd-current ':'')+(isActive?'hd-applied':'')+'">'+
   '<button class="hd-preview" type="button" data-hd-preview="'+category+':'+id+'" aria-label="Preview '+name+'">'+
    '<span class="hd-swatch" style="--sample:'+color+'"><i></i></span>'+
    '<span class="hd-style-name">'+name+'</span><span class="hd-style-desc">'+desc+'</span>'+
    '<span class="hd-style-tag">'+(isActive?'IN ROOM':isOwned?'OWNED':'$'+price)+'</span></button>'+
   '<button type="button" class="hd-purchase" data-hd-apply="'+category+':'+id+'" '+(isActive||poor?'disabled':'')+'>'+
    (isActive?'✓ INSTALLED':isOwned?'APPLY':poor?'NEED $'+(price-st.cash):'BUY · $'+price)+'</button></article>'
 }).join('')+'</div>';
 html+='<div class="hd-foot"><span>HOME VALUE · $'+(st.value||0)+'</span>'+
 (preview?'<button type="button" data-hd-revert>REVERT PREVIEW</button>':'<span>DESIGNS ARE SAVED</span>')+
 '</div><p class="hd-tip">Changes are visualized in the existing 3D house. Bought styles are yours permanently; switch back for free.</p>';
 root.innerHTML=html;
}
function apply(cat,id){
 let option=catalog[cat]?.options.find(o=>o[0]===id);
 if(!option)return;
 let ok=bridge()?.apply?.(cat,id,option[2]);
 if(!ok)return;
 preview=null;updateScene();render()
}
function showPreview(cat,id){
 if(!catalog[cat]?.options.some(o=>o[0]===id))return;
 category=cat;preview={category:cat,id};bridge()?.preview?.(cat,id);updateScene();render()
}
function install(){
 const tabs=document.querySelector('#notebook .note-tabs'),body=document.getElementById('noteBody');
 if(!tabs||!body)return;
 const tab=document.createElement('button');tab.type='button';tab.dataset.tab='design';tab.textContent='DESIGN';
 tabs.insertBefore(tab,tabs.firstChild);
 tab.addEventListener('click',()=>{clearPreview();bridge()?.open?.();render()});
 body.addEventListener('click',e=>{
  if(e.target.closest('[data-hd-focus]')){window.Evin3D?.focusDesign?.(category);return}
  let el=e.target.closest('[data-hd-category]');if(el){clearPreview();category=el.dataset.hdCategory;render();return}
  el=e.target.closest('[data-hd-preview]');if(el){let [c,id]=el.dataset.hdPreview.split(':');showPreview(c,id);return}
  el=e.target.closest('[data-hd-apply]');if(el){let [c,id]=el.dataset.hdApply.split(':');apply(c,id);return}
  if(e.target.closest('[data-hd-revert]')){clearPreview();render()}
 });
 const close=document.getElementById('closeNotebook');
 close?.addEventListener('click',clearPreview);
 document.getElementById('noteShade')?.addEventListener('click',clearPreview);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')clearPreview()});
 // The original Upgrades tab remains available for structural home expansions.
 const oldTabs=Array.from(tabs.querySelectorAll('button:not([data-tab="design"])'));
 oldTabs.forEach(b=>b.addEventListener('click',()=>{
  clearPreview();document.getElementById('notebook')?.classList.remove('design-mode');
 },true));
 window.HouseBossHomeDesign={render,clearPreview,effective,catalog,isFurnitureView(){return category==='furniture'&&document.getElementById('notebook')?.classList.contains('design-mode')},selectCategory(k){if(k==='furniture'||catalog[k]){clearPreview();category=k;render()}}};
}
install();
})();+price)+'</span></button>'+
   '<button type="button" class="hd-purchase" data-hd-apply="'+category+':'+id+'" '+(isActive||poor?'disabled':'')+'>'+
    (isActive?'✓ INSTALLED':isOwned?'APPLY':poor?'NEED $'+(price-st.cash):'BUY · $'+price)+'</button></article>'
 }).join('')+'</div>';
 html+='<div class="hd-foot"><span>HOME VALUE · $'+(st.value||0)+'</span>'+
 (preview?'<button type="button" data-hd-revert>REVERT PREVIEW</button>':'<span>DESIGNS ARE SAVED</span>')+
 '</div><p class="hd-tip">Changes are visualized in the existing 3D house. Bought styles are yours permanently; switch back for free.</p>';
 root.innerHTML=html;
}
function apply(cat,id){
 let option=catalog[cat]?.options.find(o=>o[0]===id);
 if(!option)return;
 let ok=bridge()?.apply?.(cat,id,option[2]);
 if(!ok)return;
 preview=null;updateScene();render()
}
function showPreview(cat,id){
 if(!catalog[cat]?.options.some(o=>o[0]===id))return;
 category=cat;preview={category:cat,id};bridge()?.preview?.(cat,id);updateScene();render()
}
function install(){
 const tabs=document.querySelector('#notebook .note-tabs'),body=document.getElementById('noteBody');
 if(!tabs||!body)return;
 const tab=document.createElement('button');tab.type='button';tab.dataset.tab='design';tab.textContent='DESIGN';
 tabs.insertBefore(tab,tabs.firstChild);
 tab.addEventListener('click',()=>{clearPreview();bridge()?.open?.();render()});
 body.addEventListener('click',e=>{
  if(e.target.closest('[data-hd-focus]')){window.Evin3D?.focusDesign?.(category);return}
  let el=e.target.closest('[data-hd-category]');if(el){clearPreview();category=el.dataset.hdCategory;render();return}
  el=e.target.closest('[data-hd-preview]');if(el){let [c,id]=el.dataset.hdPreview.split(':');showPreview(c,id);return}
  el=e.target.closest('[data-hd-apply]');if(el){let [c,id]=el.dataset.hdApply.split(':');apply(c,id);return}
  if(e.target.closest('[data-hd-revert]')){clearPreview();render()}
 });
 const close=document.getElementById('closeNotebook');
 close?.addEventListener('click',clearPreview);
 document.getElementById('noteShade')?.addEventListener('click',clearPreview);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')clearPreview()});
 // The original Upgrades tab remains available for structural home expansions.
 const oldTabs=Array.from(tabs.querySelectorAll('button:not([data-tab="design"])'));
 oldTabs.forEach(b=>b.addEventListener('click',()=>{
  clearPreview();document.getElementById('notebook')?.classList.remove('design-mode');
 },true));
 window.HouseBossHomeDesign={render,clearPreview,effective,catalog,isFurnitureView(){return category==='furniture'&&document.getElementById('notebook')?.classList.contains('design-mode')},selectCategory(k){if(k==='furniture'||catalog[k]){clearPreview();category=k;render()}}};
}
install();
})();+Math.floor(st.cash)+' · Property value ;
 let html='<div class="hd-lead"><span class="hd-kicker">YOUR HOME, YOUR STYLE</span><p>Change finishes and furniture in your 3D home. Tap to preview before buying.</p></div>';
 html+='<nav class="hd-categories" aria-label="Design categories"><button type="button" data-hd-category="furniture"><span>▣</span>Furniture</button>'+Object.entries(catalog).map(([k,v])=>'<button type="button" data-hd-category="'+k+'" class="'+(k===category?'active':'')+'"><span>'+v.icon+'</span>'+v.label+'</button>').join('')+'</nav>';
 html+='<div class="hd-collection"><div><h3>'+data.label+'</h3><small>'+data.description+'</small></div><button type="button" data-hd-focus>VIEW IN 3D ↗</button></div>';
 html+='<div class="hd-options">'+data.options.map(opt=>{
  const [id,name,price,color,desc]=opt,isActive=selectedStyle(category)===id,isOwned=owned(category,id),isShowing=active===id;
  const poor=st.cash<price&&!isOwned;
  return '<article class="hd-style '+(isShowing?'hd-current ':'')+(isActive?'hd-applied':'')+'">'+
   '<button class="hd-preview" type="button" data-hd-preview="'+category+':'+id+'" aria-label="Preview '+name+'">'+
    '<span class="hd-swatch" style="--sample:'+color+'"><i></i></span>'+
    '<span class="hd-style-name">'+name+'</span><span class="hd-style-desc">'+desc+'</span>'+
    '<span class="hd-style-tag">'+(isActive?'IN ROOM':isOwned?'OWNED':'$'+price)+'</span></button>'+
   '<button type="button" class="hd-purchase" data-hd-apply="'+category+':'+id+'" '+(isActive||poor?'disabled':'')+'>'+
    (isActive?'✓ INSTALLED':isOwned?'APPLY':poor?'NEED $'+(price-st.cash):'BUY · $'+price)+'</button></article>'
 }).join('')+'</div>';
 html+='<div class="hd-foot"><span>HOME VALUE · $'+(st.value||0)+'</span>'+
 (preview?'<button type="button" data-hd-revert>REVERT PREVIEW</button>':'<span>DESIGNS ARE SAVED</span>')+
 '</div><p class="hd-tip">Changes are visualized in the existing 3D house. Bought styles are yours permanently; switch back for free.</p>';
 root.innerHTML=html;
}
function apply(cat,id){
 let option=catalog[cat]?.options.find(o=>o[0]===id);
 if(!option)return;
 let ok=bridge()?.apply?.(cat,id,option[2]);
 if(!ok)return;
 preview=null;updateScene();render()
}
function showPreview(cat,id){
 if(!catalog[cat]?.options.some(o=>o[0]===id))return;
 category=cat;preview={category:cat,id};bridge()?.preview?.(cat,id);updateScene();render()
}
function install(){
 const tabs=document.querySelector('#notebook .note-tabs'),body=document.getElementById('noteBody');
 if(!tabs||!body)return;
 const tab=document.createElement('button');tab.type='button';tab.dataset.tab='design';tab.textContent='DESIGN';
 tabs.insertBefore(tab,tabs.firstChild);
 tab.addEventListener('click',()=>{clearPreview();bridge()?.open?.();render()});
 body.addEventListener('click',e=>{
  if(e.target.closest('[data-hd-focus]')){window.Evin3D?.focusDesign?.(category);return}
  let el=e.target.closest('[data-hd-category]');if(el){clearPreview();category=el.dataset.hdCategory;render();return}
  el=e.target.closest('[data-hd-preview]');if(el){let [c,id]=el.dataset.hdPreview.split(':');showPreview(c,id);return}
  el=e.target.closest('[data-hd-apply]');if(el){let [c,id]=el.dataset.hdApply.split(':');apply(c,id);return}
  if(e.target.closest('[data-hd-revert]')){clearPreview();render()}
 });
 const close=document.getElementById('closeNotebook');
 close?.addEventListener('click',clearPreview);
 document.getElementById('noteShade')?.addEventListener('click',clearPreview);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')clearPreview()});
 // The original Upgrades tab remains available for structural home expansions.
 const oldTabs=Array.from(tabs.querySelectorAll('button:not([data-tab="design"])'));
 oldTabs.forEach(b=>b.addEventListener('click',()=>{
  clearPreview();document.getElementById('notebook')?.classList.remove('design-mode');
 },true));
 window.HouseBossHomeDesign={render,clearPreview,effective,catalog,isFurnitureView(){return category==='furniture'&&document.getElementById('notebook')?.classList.contains('design-mode')},selectCategory(k){if(k==='furniture'||catalog[k]){clearPreview();category=k;render()}}};
}
install();
})();+(st.value||0)+' · HOME LVL '+(st.level||1);
 let html='<div class="hd-lead"><span class="hd-kicker">YOUR HOME, YOUR STYLE</span><p>Change finishes and furniture in your 3D home. Tap to preview before buying.</p></div>';
 html+='<nav class="hd-categories" aria-label="Design categories"><button type="button" data-hd-category="furniture"><span>▣</span>Furniture</button>'+Object.entries(catalog).map(([k,v])=>'<button type="button" data-hd-category="'+k+'" class="'+(k===category?'active':'')+'"><span>'+v.icon+'</span>'+v.label+'</button>').join('')+'</nav>';
 html+='<div class="hd-collection"><div><h3>'+data.label+'</h3><small>'+data.description+'</small></div><button type="button" data-hd-focus>VIEW IN 3D ↗</button></div>';
 html+='<div class="hd-options">'+data.options.map(opt=>{
  const [id,name,price,color,desc]=opt,isActive=selectedStyle(category)===id,isOwned=owned(category,id),isShowing=active===id;
  const poor=st.cash<price&&!isOwned;
  return '<article class="hd-style '+(isShowing?'hd-current ':'')+(isActive?'hd-applied':'')+'">'+
   '<button class="hd-preview" type="button" data-hd-preview="'+category+':'+id+'" aria-label="Preview '+name+'">'+
    '<span class="hd-swatch" style="--sample:'+color+'"><i></i></span>'+
    '<span class="hd-style-name">'+name+'</span><span class="hd-style-desc">'+desc+'</span>'+
    '<span class="hd-style-tag">'+(isActive?'IN ROOM':isOwned?'OWNED':'$'+price)+'</span></button>'+
   '<button type="button" class="hd-purchase" data-hd-apply="'+category+':'+id+'" '+(isActive||poor?'disabled':'')+'>'+
    (isActive?'✓ INSTALLED':isOwned?'APPLY':poor?'NEED $'+(price-st.cash):'BUY · $'+price)+'</button></article>'
 }).join('')+'</div>';
 html+='<div class="hd-foot"><span>HOME VALUE · $'+(st.value||0)+'</span>'+
 (preview?'<button type="button" data-hd-revert>REVERT PREVIEW</button>':'<span>DESIGNS ARE SAVED</span>')+
 '</div><p class="hd-tip">Changes are visualized in the existing 3D house. Bought styles are yours permanently; switch back for free.</p>';
 root.innerHTML=html;
}
function apply(cat,id){
 let option=catalog[cat]?.options.find(o=>o[0]===id);
 if(!option)return;
 let ok=bridge()?.apply?.(cat,id,option[2]);
 if(!ok)return;
 preview=null;updateScene();render()
}
function showPreview(cat,id){
 if(!catalog[cat]?.options.some(o=>o[0]===id))return;
 category=cat;preview={category:cat,id};bridge()?.preview?.(cat,id);updateScene();render()
}
function install(){
 const tabs=document.querySelector('#notebook .note-tabs'),body=document.getElementById('noteBody');
 if(!tabs||!body)return;
 const tab=document.createElement('button');tab.type='button';tab.dataset.tab='design';tab.textContent='DESIGN';
 tabs.insertBefore(tab,tabs.firstChild);
 tab.addEventListener('click',()=>{clearPreview();bridge()?.open?.();render()});
 body.addEventListener('click',e=>{
  if(e.target.closest('[data-hd-focus]')){window.Evin3D?.focusDesign?.(category);return}
  let el=e.target.closest('[data-hd-category]');if(el){clearPreview();category=el.dataset.hdCategory;render();return}
  el=e.target.closest('[data-hd-preview]');if(el){let [c,id]=el.dataset.hdPreview.split(':');showPreview(c,id);return}
  el=e.target.closest('[data-hd-apply]');if(el){let [c,id]=el.dataset.hdApply.split(':');apply(c,id);return}
  if(e.target.closest('[data-hd-revert]')){clearPreview();render()}
 });
 const close=document.getElementById('closeNotebook');
 close?.addEventListener('click',clearPreview);
 document.getElementById('noteShade')?.addEventListener('click',clearPreview);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')clearPreview()});
 // The original Upgrades tab remains available for structural home expansions.
 const oldTabs=Array.from(tabs.querySelectorAll('button:not([data-tab="design"])'));
 oldTabs.forEach(b=>b.addEventListener('click',()=>{
  clearPreview();document.getElementById('notebook')?.classList.remove('design-mode');
 },true));
 window.HouseBossHomeDesign={render,clearPreview,effective,catalog,isFurnitureView(){return category==='furniture'&&document.getElementById('notebook')?.classList.contains('design-mode')},selectCategory(k){if(k==='furniture'||catalog[k]){clearPreview();category=k;render()}}};
}
install();
})();