(function (root) {
  'use strict';
  const units = {
    Sol: ['Scout','Rifleman','Heavy','Sniper','Commando','Light Quad','Heavy Quad','Light Striker','Heavy Striker','AA Truck','Repair Rig','Platoon Hauler','Hover Tank','Barrage Truck','Railgun Tank','Pulse Truck','Siege Tank','Gunship','Dropship','Fighter','Bomber'],
    Centauri: ['Militia','Trooper','Marksman','Juggernaut','Templar','Light Raider','Heavy Raider','Assault Car','Flak Truck','Repair Truck','Strike Tank','Squad Transport','Combat Tank','Heavy Tank','Rocket Truck','Pyro Tank','Crimson Tank','Dreadnought','Interceptor','Shuttle','Freighter'],
    Alien: ['Crab','Horned Crab','Shocker','Wasp','Dragonfly','Squid','Hunter','Behemoth','Scorpion','Firebug','Goliath','Defiler','Colossus']
  };
  const unitTypes=['Infantry','Cavalry','Tank','Siege','Aircraft','Transport','Harvester','Special','Repair'];
  const metadata=root.FormationUnitMetadata||{};
  function migrateSlot(s){
    s.preferredTypes=[...new Set(s.preferredTypes||[])];
    if(s.role==='repair'||s.role==='purple'){
      if(!s.preferredTypes.includes('Repair'))s.preferredTypes.push('Repair');
      s.role=s.role==='repair'?'top':'backup';
    }
    return s;
  }
  function preferenceMarker(s,team){
    const individual=s.preferredUnits||[],types=s.preferredTypes||[],all=[...individual,...types];
    const label=all.join(', ');
    if(!all.length)return null;
    if(all.length>1)return {text:'+',label};
    let icon=individual.length?metadata[team+'|'+individual[0]]?.icon:null;
    if(types.length){
      const entry=Object.entries(metadata).find(([key,value])=>key.startsWith(team+'|')&&value.type===types[0]);
      const fallback={Infantry:'Tac_Soldier_Rifleman',Cavalry:'Tac_Vehicle_LightQuad',Tank:'Tac_Vehicle_HoverTank',Siege:'Tac_Vehicle_SiegeTank',Aircraft:'Tac_AirVehicle_Fighter',Transport:'Tac_Vehicle_TroopHauler',Harvester:'Tac_Vehicle_Harvester',Special:'Tac_Creature_Queen',Repair:'Tac_Vehicle_RepairRig'};
      icon=entry?entry[1].icon:fallback[types[0]];
    }
    const href=root.FormationGameIcons?.[icon];
    return href?{href,label}:{text:all[0].slice(0,2),label};
  }
  const small = new Set(['Scout','Rifleman','Heavy','Sniper','Commando','Militia','Trooper','Marksman','Juggernaut','Templar','Crab','Horned Crab','Shocker','Wasp','Dragonfly','Squid']);
  const large = new Set(['Bomber','Pyro Tank','Crimson Tank','Siege Tank','Freighter','Goliath','Defiler','Colossus']);
  const roles = {top:{label:'Top preferred',color:'#22d751'},repair:{label:'Repair preferred',color:'#87f7ff'},purple:{label:'Backup + repair',color:'#bb64d7'},backup:{label:'Backup',color:'#fff100'},last:{label:'Less preferred',color:'#ff891e'}};
  const preferences=[{label:'0 · Green — first choice',color:'#22d751'},{label:'1 · Yellow — backup',color:'#fff100'},{label:'2 · Orange — less preferred',color:'#ff891e'},{label:'3 · Red — legacy level',color:'#f04444'},{label:'4 · Red — least preferred',color:'#f04444'}];
  const gradientValue=f=>Number.isFinite(f.autoPreferenceGradient)?Math.max(0,Math.min(100,f.autoPreferenceGradient)):50;
  const hasPreference=s=>Number.isInteger(s.preference)&&s.preference>=0&&s.preference<=4;
  const appearance=s=>hasPreference(s)?preferences[s.preference]:roles[s.role];
  // Normalize against the layout's convex envelope, not the move-centre marker.
  // This follows translations and gives polygonal layouts matching preference bands.
  function applyAutoPreference(f){
    if(!f.slots.length)return;
    const points=[...f.slots].sort((a,b)=>a.x-b.x||a.z-b.z);
    const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
    const half=list=>{const h=[];for(const p of list){while(h.length>1&&cross(h[h.length-2],h[h.length-1],p)<=1e-9)h.pop();h.push(p)}return h};
    const lo=half(points),hi=half([...points].reverse()),hull=lo.slice(0,-1).concat(hi.slice(0,-1));
    const centre=(hull.length?hull:points).reduce((c,p,_,arr)=>({x:c.x+p.x/arr.length,z:c.z+p.z/arr.length}),{x:0,z:0});
    const radius=Math.max(...points.map(p=>Math.hypot(p.x-centre.x,p.z-centre.z)),1e-8);
    const bias=(50-gradientValue(f))/100*1.3;
    f.slots.forEach(s=>{
      let distance=0;
      if(hull.length<3)distance=Math.hypot(s.x-centre.x,s.z-centre.z)/radius;
      else for(let i=0;i<hull.length;i++){
        const a=hull[i],b=hull[(i+1)%hull.length],depth=cross(a,b,centre);
        if(depth>1e-9)distance=Math.max(distance,1-cross(a,b,s)/depth);
      }
      const band=Math.floor(4*Math.max(0,Math.min(.999999999,distance+bias)));
      s.preference=[0,1,2,4][band];
    });
  }
  let serial = 1;
  const id = () => `slot-${serial++}`;
  const number = (v, fallback=0) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const rounded = v => Math.round(v*1e6)/1e6;
  const snap = v => Math.max(-25, Math.min(24, Math.round(v*2)/2));
  const sizeScale = preferred => preferred.some(v=>large.has(v)) ? 2 : preferred.length > 0 && preferred.every(v=>small.has(v)) ? 0.5 : 1;
  // Grid +X is screen right, +Z is screen up. Unity right = Cross(up, forward).
  function relative(slot, f) {
    const a=(f.directionSensitive?f.directionDegrees:0)*Math.PI/180;
    const dx=(slot.x-f.origin.x)*f.metresPerNode, dz=(slot.z-f.origin.z)*f.metresPerNode;
    return {x:rounded(dx*Math.cos(a)-dz*Math.sin(a)),z:rounded(dx*Math.sin(a)+dz*Math.cos(a))};
  }
  function toGrid(p, f) {
    const a=(f.directionSensitive?f.directionDegrees:0)*Math.PI/180;
    return {x:f.origin.x+(p.x*Math.cos(a)+p.z*Math.sin(a))/f.metresPerNode,
      z:f.origin.z+(-p.x*Math.sin(a)+p.z*Math.cos(a))/f.metresPerNode};
  }
  const newFormation = () => ({name:'New formation',team:'Sol',type:'move',metresPerNode:20,directionSensitive:true,directionDegrees:0,origin:{x:0,z:0},autoPreference:false,autoPreferenceGradient:50,slots:[]});
  // Numbers are exact command options, scoped independently to each team/function.
  function assignMenuOrders(formations){
    const groups=new Map();
    for(const f of formations){const key=f.team+'|'+f.type;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(f)}
    for(const group of groups.values()){
      const used=new Set();
      for(const f of group)if(f.menuOrder!==undefined){
        if(!Number.isInteger(f.menuOrder)||f.menuOrder<2||f.menuOrder>9999)throw Error('Menu number must be 2–9999; /1 is reserved for default.');
        if(used.has(f.menuOrder))throw Error('Duplicate menu number /'+f.menuOrder+' for '+f.team+' '+f.type+'.');
        used.add(f.menuOrder);
      }
      for(const f of group)if(f.menuOrder===undefined){let n=2;while(used.has(n))n++;if(n>9999)throw Error('Too many menu entries.');f.menuOrder=n;used.add(n)}
    }
    return formations;
  }
  function exportFormation(f) {
    return {name:f.name,team:f.team,function:f.type,menuOrder:f.menuOrder,coordinateSpace:f.directionSensitive?'local-right-forward':'world-xz',metresPerNode:f.metresPerNode,directionSensitive:f.directionSensitive,directionDegrees:f.directionDegrees,origin:{x:0,z:0},editor:{centreGrid:{...f.origin},autoPreference:!!f.autoPreference,autoPreferenceGradient:gradientValue(f)},slots:f.slots.map(s=>({...relative(s,f),editor:{grid:{x:s.x,z:s.z}},role:s.role,...(hasPreference(s)?{preference:s.preference}:{}),preferredUnits:[...s.preferredUnits],preferredTypes:[...(s.preferredTypes||[])],sizeScale:sizeScale(s.preferredUnits)}))};
  }
  const exportDocument = formations => ({format:'silica-formations',version:3,menu:{defaultOption:1,defaultLabel:"default"},grid:{nodesX:50,nodesZ:50,snap:0.5},coordinates:{unit:'metres',relativeTo:'formation.origin',positiveX:'right',positiveZ:'forward',fixedGrid:'screen-right=world+X; screen-up=world+Z'},formations:assignMenuOrders(formations).map(exportFormation)});
  function importDocument(data) {
    if(data.version!=null && ![1,2,3].includes(data.version)) throw Error('Unsupported JSON version');
    if(data.version===3 && data.format!=='silica-formations') throw Error('Invalid document format');
    const items=Array.isArray(data)?data:Array.isArray(data.formations)?data.formations:[data];
    if(!items.length) throw Error('No formations found');
    if(data.menu!==undefined&&(data.menu?.defaultOption!==1||data.menu?.defaultLabel!=="default"))throw Error("Unsupported reserved menu option");
    return assignMenuOrders(items.map(f=>{
      if(!f||!Array.isArray(f.slots)) throw Error('A formation has no slots array');
      const legacy=data.version===1 || (data.version!==2 && f.metresPerNode==null && f.unitSpacing!=null);
      const scale=number(legacy?f.unitSpacing:f.metresPerNode,20);
      if(scale<=0) throw Error('Metres per grid position must be greater than zero');
      const team=units[f.team]?f.team:'Sol';
      const origin=legacy?{x:number(f.origin?.x),z:-number(f.origin?.z)}:{x:number(f.editor?.centreGrid?.x),z:number(f.editor?.centreGrid?.z)};
      const modern=data.version===3;
      if(modern && (!units[f.team] || !['move','follow','commander','attack'].includes(f.function) || typeof f.name!=='string' || !f.name.trim() || !Number.isFinite(f.metresPerNode) || typeof f.directionSensitive!=='boolean' || !Number.isFinite(f.directionDegrees))) throw Error('Invalid formation settings');
      if(modern && f.coordinateSpace!==(f.directionSensitive?'local-right-forward':'world-xz')) throw Error('Coordinate space does not match direction setting');
      const frame={origin,metresPerNode:scale,directionSensitive:!!f.directionSensitive,directionDegrees:number(f.directionDegrees)};
      return {name:String(f.name||'Unnamed formation'),menuOrder:f.menuOrder,team,type:modern?f.function:['move','follow','commander','attack'].includes(f.type)?f.type:'move',metresPerNode:scale,directionSensitive:!!f.directionSensitive,directionDegrees:number(f.directionDegrees),origin,autoPreference:modern&&f.editor?.autoPreference===true,autoPreferenceGradient:gradientValue({autoPreferenceGradient:f.editor?.autoPreferenceGradient}),
        slots:f.slots.map(s=>{
          if(modern && (!Number.isFinite(s.x)||!Number.isFinite(s.z)||!roles[s.role]||!Array.isArray(s.preferredUnits)||s.preferredUnits.some(u=>!units[team].includes(u)))) throw Error('Invalid position, priority or preferred unit');
          if(s.preferredTypes!==undefined&&(!Array.isArray(s.preferredTypes)||s.preferredTypes.some(t=>!unitTypes.includes(t))))throw Error('Invalid preferred unit type');
          if(s.preference!==undefined&&!hasPreference(s))throw Error('Preference must be an integer from 0 (most) to 4 (least).');
          let p=modern?toGrid(s,frame):{x:legacy?number(s.x):number(s.x)/scale+origin.x,z:legacy?-number(s.z):number(s.z)/scale+origin.z};
          if(modern && s.editor?.grid) {
            const saved=s.editor.grid, check=relative(saved,frame);
            if(!Number.isFinite(saved.x)||!Number.isFinite(saved.z)||Math.abs(check.x-s.x)>0.000002||Math.abs(check.z-s.z)>0.000002) throw Error('Editor grid does not match metre coordinates');
            p={...saved};
          }
          if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||p.x < -25-1e-7 || p.x > 24+1e-7 || p.z < -25-1e-7 || p.z > 24+1e-7) throw Error('A position is outside the grid');
          return migrateSlot({id:id(),x:p.x,z:p.z,preferredTypes:[...(s.preferredTypes||[])],role:roles[s.role]?s.role:'backup',...(hasPreference(s)?{preference:s.preference}:{}),preferredUnits:Array.isArray(s.preferredUnits)?[...new Set(s.preferredUnits.filter(u=>units[team].includes(u)))]:[]});
        })};
    }));
  }
  const api={unitTypes,metadata,migrateSlot,preferenceMarker,assignMenuOrders,units,roles,preferences,gradientValue,hasPreference,appearance,applyAutoPreference,id,number,rounded,snap,sizeScale,relative,toGrid,newFormation,exportDocument,importDocument};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.FormationCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
