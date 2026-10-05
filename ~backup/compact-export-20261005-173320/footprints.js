(function(root){
  'use strict';
  const C=root.FormationCore;
  let measurements={};
  function load(data){
    if(data?.format!=='silica-unit-footprints'||data.version!==1||!data.units||typeof data.units!=='object')throw Error('Expected a Si_Formation footprint export.');
    const next={};
    for(const [key,value] of Object.entries(data.units)){
      const [team,name]=key.split('|');
      if(!C.units[team]?.includes(name))continue;
      if(!Number.isFinite(value.width)||!Number.isFinite(value.length)||value.width<=0||value.length<=0||value.width>1000||value.length>1000)throw Error('Invalid dimensions for '+key);
      next[key]={width:value.width,length:value.length};
    }
    if(!Object.keys(next).length)throw Error('No recognised unit measurements.');
    measurements=next;return Object.keys(next).length;
  }
  function footprint(slot,team){
    const names=new Set(slot.preferredUnits||[]),types=slot.preferredTypes||[];
    for(const name of C.units[team])if(types.includes(C.metadata[team+'|'+name]?.type))names.add(name);
    const generic={width:4,length:8,label:'Generic 8 × 4 m (not measured)',generic:true};
    if(!names.size)return generic;
    const values=[...names].map(name=>measurements[team+'|'+name]);
    const missing=values.filter(v=>!v).length;
    // Never present guessed dimensions as measured or claim a partial set is conservative.
    if(missing)return {...generic,label:'Generic 8 × 4 m — measurements missing for '+missing+' preferred unit(s)'};
    const width=Math.max(...values.map(v=>v.width)),length=Math.max(...values.map(v=>v.length));
    return {width,length,generic:false,label:(names.size===1?[...names][0]:'Largest preferred footprint envelope')+': '+length.toFixed(2)+' × '+width.toFixed(2)+' m'};
  }
  root.FormationFootprints={load,footprint};
})(globalThis);
