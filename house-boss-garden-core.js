/* Native Garden simulation, loaded inside the main household closure. */
function gardenExpansions(){return Array.isArray(life.gardenExpansions)?life.gardenExpansions:(life.gardenExpansions=[])}
function gardenHas(id){return gardenExpansions().includes(id)}
function gardenIsPlant(type){return Number.isFinite(window.HouseBossFurnitureTypes?.[type]?.growthDays)}
function gardenStage(item){
 const m=window.HouseBossFurnitureTypes?.[item?.type];
 if(!m||!gardenIsPlant(item.type))return 3;
 const days=Math.max(0,day-(Number(item.plantedDay)||day));
 return Math.min(3,Math.floor(3*(days+(Number(item.wateredCount)||0)*.45+(gardenHas('greenhouse')?days*.25:0))/Math.max(1,m.growthDays)))
}
function gardenPlaceValidate(p){
 const meta=window.HouseBossFurnitureTypes?.[p?.type],a=furnitureBounds(p);
 if(!meta||meta.zone!=='garden'||!a)return {ok:false,reason:'Select a garden object'};
 if(!owned.includes('garden'))return {ok:false,reason:'Build the Garden room first'};
 const bounds=gardenHas('garden_patch')?[-8.05,8.05,-5.05,5.05]:[-4.6,4.6,-3.5,3.5];
 if(a.minX<bounds[0]||a.maxX>bounds[1]||a.minZ<bounds[2]||a.maxZ>bounds[3])
  return {ok:false,reason:'Build the garden plot expansion to plant farther away'};
 if(gardenIsPlant(p.type)&&a.minX<1.35&&a.maxX>-5.2&&a.minZ<.78&&a.maxZ>-2.75)
  return {ok:false,reason:'Roots need soil, not the timber deck'};
 for(const q of [[1.3,4,-2.4,-1.25],[5.4,6.9,-2.1,-.5]]){
  if(a.minX<q[1]&&a.maxX>q[0]&&a.minZ<q[3]&&a.maxZ>q[2])return {ok:false,reason:'Keep fixed garden furniture accessible'}
 }
 for(const o of ensureHomeFurniture()){
  if(o.uid===p.uid||window.HouseBossFurnitureTypes?.[o.type]?.zone!=='garden')continue;
  const b=furnitureBounds(o);if(!b)continue;
  const ground=meta.layer==='floor',otherGround=window.HouseBossFurnitureTypes?.[o.type]?.layer==='floor';
  if(ground!==otherGround)continue;
  if(a.minX<b.maxX+.1&&a.maxX>b.minX-.1&&a.minZ<b.maxZ+.1&&a.maxZ>b.minZ-.1)
   return {ok:false,reason:'Too close to another garden object'}
 }
 return {ok:true,reason:'Available outdoor tile'}
}
function gardenSnapshot(){
 const types=window.HouseBossFurnitureTypes||{},garden=ensureHomeFurniture().filter(o=>types[o.type]?.zone==='garden');
 const room=homeFurnitureRooms().find(r=>r.id==='garden');
 return {cash:Math.floor(cash),level:level,day:day,unlocked:owned.includes('garden'),room:room,
  beauty:garden.reduce((n,o)=>n+Math.round((types[o.type]?.beauty||types[o.type]?.comfort||0)*(gardenIsPlant(o.type)?.3+.7*gardenStage(o)/3:1)),0),
  plants:garden.filter(o=>gardenIsPlant(o.type)).length,
  objects:garden.map(o=>{
   const t=types[o.type],stage=gardenStage(o);
   return Object.assign({},o,{name:t.name,stage,harvest:t.harvest||0,wateredToday:o.lastWateredDay===day,
    canHarvest:!!t.harvest&&stage===3&&(!o.lastHarvestDay||day-o.lastHarvestDay>=3)})
  }),
  expansions:(window.HouseBossGardenCatalog?.expansions||[]).map(e=>Object.assign({},e,{owned:gardenHas(e.id),available:owned.includes('garden')&&level>=e.level&&cash>=e.price}))
 }
}
function gardenWater(uid){
 const o=ensureHomeFurniture().find(x=>x.uid===uid);
 if(!started||ended||!o||!gardenIsPlant(o.type)||o.lastWateredDay===day)return false;
 o.lastWateredDay=day;o.wateredCount=Math.min(60,(o.wateredCount||0)+1);
 peace=Math.min(100,peace+1);message('WATERED · '+window.HouseBossFurnitureTypes[o.type].name);
 saveGame();render();return true
}
function gardenHarvest(uid){
 const o=ensureHomeFurniture().find(x=>x.uid===uid),t=window.HouseBossFurnitureTypes?.[o?.type];
 if(!started||ended||!t?.harvest||gardenStage(o)!==3||(o.lastHarvestDay&&day-o.lastHarvestDay<3))return false;
 const value=Math.round(t.harvest*(.75+Math.min(12,o.wateredCount||0)*.08));
 cash+=value;o.lastHarvestDay=day;grantXp(6);
 message('GARDEN HARVEST · +$'+value);floatReward('HARVEST +$'+value);
 saveGame();render();return true
}
function gardenUse(uid){
 const o=ensureHomeFurniture().find(x=>x.uid===uid),t=window.HouseBossFurnitureTypes?.[o?.type];
 if(!started||ended||!t||t.zone!=='garden')return false;
 if(gardenIsPlant(o.type))return gardenWater(uid);
 const p=simState().people[simState().selected]||simState().people.self;
 if(p)p.fun=Math.min(100,(p.fun||0)+Math.max(3,Math.round((t.comfort||0)*.5)));
 peace=Math.min(100,peace+1);message('GARDEN MOMENT · '+t.name);
 saveGame();render();return true
}
function gardenBuild(id){
 if(!started||ended)return false;
 if(id==='garden')return window.HouseBossBuildBridge?.buyRoom?.('garden')||false;
 const entry=window.HouseBossGardenCatalog?.expansions.find(x=>x.id===id);
 if(!entry||!owned.includes('garden')||gardenHas(id)||level<entry.level||cash<entry.price)return false;
 cash-=entry.price;life.homeValue=(life.homeValue||0)+entry.price;
 gardenExpansions().push(id);grantXp(25);simWishProgress('design');
 message('BUILT · '+entry.name);floatReward('NEW SPACE · '+entry.name);
 saveGame();render();return true
}
window.HouseBossGardenBridge={
 getState:gardenSnapshot,water:gardenWater,harvest:gardenHarvest,use:gardenUse,build:gardenBuild,stage:gardenStage,
 focus:()=>window.Evin3D?.focusRoom?.('garden'),
 focusStudio:()=>window.Evin3D?.focusRoom?.('studio'),
 open:kind=>{openNote('design');window.HouseBossHomeDesign?.selectCategory?.(kind||'garden')}
};
