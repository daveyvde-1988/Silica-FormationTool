(()=>{'use strict';
const C=FormationCore, {roles,units,id,snap,relative,sizeScale}=C;
const $=id=>document.getElementById(id),svgNS='http://www.w3.org/2000/svg';
let formations=[],active=0,selected=new Set(),mode='select',drag=null,placementRole='top',placementPreference=0,zoom=1;
const selectedSlots=()=>current().slots.filter(s=>selected.has(s.id));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const current=()=>formations[active];
const priorityLevel=s=>C.hasPreference(s)?s.preference:s.role==='top'||s.role==='repair'?0:s.role==='backup'||s.role==='purple'?1:2;
let lastNodePress=null;
const inspectorOpen=new Map();
function foldSection(key,title,nodes){
 const fold=document.createElement('details');fold.className='inspector-fold';
 fold.open=inspectorOpen.get(key)??true;
 const summary=document.createElement('summary');summary.textContent=title;
 fold.append(summary,...nodes);
 fold.addEventListener('toggle',()=>{if(fold.isConnected)inspectorOpen.set(key,fold.open)});
 return fold;
}
const matchesFilter=f=>($('teamFilter').value==='all'||f.team===$('teamFilter').value)&&($('functionFilter').value==='all'||f.type===$('functionFilter').value);
const circle=(r,count,role,phase=0)=>Array.from({length:count},(_,i)=>{let a=i/count*Math.PI*2+phase;return{id:id(),x:snap(Math.sin(a)*r),z:snap(Math.cos(a)*r),role,preferredUnits:[]}});
function sample(){let f=C.newFormation();f.name='Circle example';f.slots=[{id:id(),x:-.5,z:0,role:'top',preferredUnits:[],preferredTypes:['Repair']},{id:id(),x:.5,z:0,role:'top',preferredUnits:[],preferredTypes:['Repair']},{id:id(),x:0,z:1,role:'backup',preferredUnits:[],preferredTypes:['Repair']},{id:id(),x:0,z:-1,role:'backup',preferredUnits:[],preferredTypes:['Repair']},...circle(2.5,8,'top'),...circle(4,10,'backup',Math.PI/10),...circle(5.5,12,'last')];return f;}
function status(msg,bad=false){$('status').textContent=msg;$('status').className=bad?'small error':'small'}
function el(tag,attrs={}){let e=document.createElementNS(svgNS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e}
function titles(){let f=current();const visible=formations.some(matchesFilter);
 document.querySelectorAll('.side > .section').forEach(section=>{if(!section.contains($('formationList'))&&!section.contains($('export')))section.hidden=!visible});
 document.querySelector('.workspace').style.visibility=visible?'':'hidden';document.querySelector('.inspector').style.visibility=visible?'':'hidden';
 $('duplicateFormation').disabled=!visible;$('deleteFormation').disabled=!visible;$('formationList').disabled=!visible;
$('formationList').replaceChildren(...formations.map((v,i)=>({v,i})).filter(({v})=>matchesFilter(v)).sort((a,b)=>a.v.menuOrder-b.v.menuOrder||a.i-b.i).map(({v,i})=>new Option(`/${v.menuOrder} ${v.name||'Unnamed formation'} · ${v.team} · ${v.type}`,i)));const reserved=new Option('/1 default — reserved for Vanilla','reserved');reserved.disabled=true;$('formationList').prepend(reserved);if(!visible)$('formationList').append(new Option('No formations match these filters',''));else $('formationList').value=active;$('heading').textContent=f.name||'Unnamed formation';$('command').textContent=`Chat: /${f.type}formation "${f.name}"`}
function menu(){let f=current();titles();$('formationName').value=f.name;$('menuOrder').value=f.menuOrder;$('team').value=f.team;$('kind').value=f.type;$('metresPerNode').value=f.metresPerNode;$('directionSensitive').checked=f.directionSensitive;}
// One SVG geometry defines the visible grid and the snap locations.
const grid=el('g',{'pointer-events':'none','aria-hidden':'true'});
let lines='',crosses='';for(let k=-25;k<=24;k++){lines+=`M ${k} -24 L ${k} 25 M -25 ${-k} L 24 ${-k} `;for(let z=-25;z<=24;z++)crosses+=`M ${k-.12} ${-z} h .24 M ${k} ${-z-.12} v .24 `}
grid.append(el('path',{d:lines,fill:'none',stroke:'#62666c','stroke-width':'.025'}),el('path',{d:crosses,fill:'none',stroke:'#b8bbc0','stroke-width':'.05'}));
const layer=el('g');$('drawing').append(grid,layer);
function draw(){let f=current(),o=f.origin;layer.replaceChildren();
  for(const s of f.slots){
    const fp=FormationFootprints.footprint(s,f.team),w=fp.width/f.metresPerNode,h=fp.length/f.metresPerNode;
    const box=el('rect',{x:s.x-w/2,y:-s.z-h/2,width:w,height:h,fill:C.appearance(s).color,'fill-opacity':'.14',stroke:C.appearance(s).color,'stroke-opacity':'.6','stroke-width':'.035','stroke-dasharray':fp.generic?'.15 .1':'none','pointer-events':'none',transform:'rotate('+(f.directionSensitive?f.directionDegrees:0)+' '+s.x+' '+(-s.z)+')'});
    layer.append(box);
  }
  f.slots.forEach(s=>{let c=el('circle',{cx:s.x,cy:-s.z,r:.45*sizeScale(s.preferredUnits),fill:C.appearance(s).color,class:`slot${selected.has(s.id)?' selected':''}`});c.dataset.target='slot';c.dataset.id=s.id;let t=el('title'),p=relative(s,f);t.textContent=`${C.appearance(s).label} · X ${p.x} m, Z ${p.z} m${s.preferredUnits.length?' · '+s.preferredUnits.join(', '):''}`;c.append(t);layer.append(c);
    t.textContent+=' · '+FormationFootprints.footprint(s,f.team).label;
    const marker=C.preferenceMarker(s,f.team);
    if(marker){
      t.textContent+=' · '+marker.label;
      const radius=.45*sizeScale(s.preferredUnits),side=radius*1.5;
      let badge=marker.href?el('image',{href:marker.href,x:s.x-side/2,y:-s.z-side/2,width:side,height:side,'pointer-events':'none'}):el('text',{x:s.x,y:-s.z,'text-anchor':'middle','dominant-baseline':'central','font-size':radius*1.65,'font-weight':'bold',fill:'#fff',stroke:'#111','stroke-width':'.025','paint-order':'stroke','pointer-events':'none'});
      if(!marker.href)badge.textContent=marker.text;
      layer.append(badge);
    }});
  if(f.directionSensitive){let a=f.directionDegrees*Math.PI/180,tx=o.x+Math.sin(a)*4,ty=-o.z-Math.cos(a)*4;layer.append(el('line',{x1:o.x,y1:-o.z,x2:tx,y2:ty,stroke:'#ff9aca','stroke-width':'.1','stroke-dasharray':'.3 .22','pointer-events':'none'}));let h=el('path',{d:`M ${tx} ${ty-.5} L ${tx-.35} ${ty+.3} L ${tx+.35} ${ty+.3} Z`,fill:'#ff9aca',class:'arrow-handle',transform:`rotate(${f.directionDegrees} ${tx} ${ty})`});h.dataset.target='direction';layer.append(h)}
  let p=el('path',{d:`M ${o.x-.3} ${-o.z-.3} L ${o.x+.3} ${-o.z+.3} M ${o.x+.3} ${-o.z-.3} L ${o.x-.3} ${-o.z+.3}`,stroke:'#ff8fba','stroke-width':'.2','stroke-linecap':'round',class:'marker'});p.dataset.target='origin';let t=el('title');t.textContent='Move centre · X 0 m, Z 0 m';p.append(t);layer.append(p);
}
function updatePosition(){const s=current().slots.find(s=>selected.has(s.id));if(!s)return;const p=relative(s,current());for(const axis of ['X','Z'])if($('slot'+axis))$('slot'+axis).value=p[axis.toLowerCase()]}
function sizeText(s){const fp=FormationFootprints.footprint(s,current().team);return fp.label+' · '+(fp.length/current().metresPerNode).toFixed(2)+' × '+(fp.width/current().metresPerNode).toFixed(2)+' grid positions'}
function multipleDetails(slots,d){
 const f=current();
 d.innerHTML='<h2>'+slots.length+' DOTS SELECTED</h2><p class="small">Drag any selected dot to move the group. Shift-click a dot to add or remove it.</p><h2 style="margin-top:18px">PREFERRED UNITS · '+esc(f.team.toUpperCase())+'</h2><p class="small">A partial check means only some selected dots prefer that unit. Check to add it to all selected dots; uncheck to remove it from all.</p><div class="unit-list">'+units[f.team].map(u=>'<label class="unit-choice"><input type="checkbox" data-unit="'+esc(u)+'">'+esc(u)+'</label>').join('')+'</div><button id="removeGroup" class="warn wide" style="margin-top:15px">Delete selected dots</button>';
 d.querySelectorAll('[data-unit]').forEach(cb=>{
  const count=slots.filter(s=>s.preferredUnits.includes(cb.dataset.unit)).length;
  cb.checked=count===slots.length;
  cb.indeterminate=count>0&&count<slots.length;
  cb.onchange=()=>{
   slots.forEach(s=>{s.preferredUnits=units[f.team].filter(u=>u===cb.dataset.unit?cb.checked:s.preferredUnits.includes(u))});
   cb.indeterminate=false;
   draw();
  };
 });
 $('removeGroup').onclick=removeSelected;
}
function removeSelected(){drag=null;current().slots=current().slots.filter(s=>!selected.has(s.id));selected.clear();geometryChanged();draw();details()}
function legacyDetails(){if(selected.size>1){multipleDetails(selectedSlots(),$('details'));return}let f=current(),s=f.slots.find(s=>selected.has(s.id)),d=$('details');if(!s){d.innerHTML='<div class="empty">Select a dot to edit its priority, coordinates and preferred units.</div>';return}let p=relative(s,f);d.innerHTML=`<h2>SELECTED DOT</h2><div class="row"><label class="control">X (metres)<input id="slotX" type="number" step="${f.metresPerNode/2}" value="${p.x}"></label><label class="control">Z (metres)<input id="slotZ" type="number" step="${f.metresPerNode/2}" value="${p.z}"></label></div><p class="small">Relative to the move centre. ${f.directionSensitive?'X = local right; Z = arrow forward.':'X = world right; Z = world forward (screen up).'}</p><p class="size-info" id="sizeInfo">${sizeText(s)}</p><h2 style="margin-top:18px">PREFERRED UNITS · ${esc(f.team.toUpperCase())}</h2><div class="unit-list">${units[f.team].map(u=>`<label class="unit-choice"><input type="checkbox" data-unit="${esc(u)}" ${s.preferredUnits.includes(u)?'checked':''}>${esc(u)}</label>`).join('')}</div><button id="removeSlot" class="warn wide" style="margin-top:15px">Delete dot</button>`;
for(const axis of ['X','Z'])$('slot'+axis).onchange=e=>{const key=axis.toLowerCase();const p=relative(s,f);p[key]=C.number(e.target.value);const grid=C.toGrid(p,f);s.x=snap(grid.x);s.z=snap(grid.z);geometryChanged();draw();updatePosition();details()};
d.querySelectorAll('[data-unit]').forEach(cb=>cb.onchange=()=>{s.preferredUnits=units[f.team].filter(u=>u===cb.dataset.unit?cb.checked:s.preferredUnits.includes(u));$('sizeInfo').textContent=sizeText(s);draw()});$('removeSlot').onclick=()=>remove(s.id)}
function remove(slotId){current().slots=current().slots.filter(s=>s.id!==slotId);selected.delete(slotId);geometryChanged();draw();details()}
function refresh(){cancelShapeSession();C.assignMenuOrders(formations);if(!matchesFilter(current())){const match=formations.findIndex(matchesFilter);if(match>=0)active=match;}menu();syncShapeControls();draw();details()}
function point(e){let r=$('drawing').getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*50-25.5,z:24.5-(e.clientY-r.top)/r.height*50}}
function coords(e){let p=point(e);return{x:snap(p.x),z:snap(p.z)}}
function startSlotDrag(e){return{type:'slots',start:point(e),slots:selectedSlots().map(s=>({slot:s,x:s.x,z:s.z}))}}
$('drawing').addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 $('drawing').focus({preventScroll:true});
 const f=current(),target=e.target.dataset.target,p=coords(e);drag=null;
 if(target!=='slot')lastNodePress=null;
 if(target==='slot'){
  const slotId=e.target.dataset.id;
  const now=performance.now(),previous=lastNodePress;
  if(previous&&previous.id===slotId&&now-previous.time<450&&Math.hypot(e.clientX-previous.x,e.clientY-previous.y)<5){
   lastNodePress=null;const node=f.slots.find(s=>s.id===slotId),level=priorityLevel(node);
   selected=new Set(f.slots.filter(s=>priorityLevel(s)===level).map(s=>s.id));
   setMode('select');e.preventDefault();draw();details();status('Selected '+selected.size+' nodes with priority '+level+'.');return;
  }
  lastNodePress={id:slotId,time:now,x:e.clientX,y:e.clientY};
  if(e.shiftKey){e.preventDefault();if(selected.has(slotId))selected.delete(slotId);else selected.add(slotId)}
  else{if(!selected.has(slotId))selected=new Set([slotId]);drag=startSlotDrag(e)}
 }else if(e.shiftKey){return}
 else if(target==='direction')drag={type:'direction'};
 else if(target==='origin')drag={type:'origin'};
 else if(mode==='origin'){f.origin=p;geometryChanged();drag={type:'origin'}}
 else if(mode==='place'){if(f.slots.some(s=>s.x===p.x&&s.z===p.z)){status('A dot already occupies that position.',true);return}let s={id:id(),...p,role:placementRole,preference:placementPreference,preferredUnits:[]};f.slots.push(s);geometryChanged();selected=new Set([s.id]);drag=startSlotDrag(e)}
 else selected.clear();
 draw();details();if(drag){$('drawing').setPointerCapture(e.pointerId);e.preventDefault()}
});
$('drawing').addEventListener('pointermove',e=>{
 if(lastNodePress&&Math.hypot(e.clientX-lastNodePress.x,e.clientY-lastNodePress.y)>=5)lastNodePress=null;
 let p=coords(e),f=current();
 if(drag){
  if(drag.type==='slots'){
   const q=point(e),slots=drag.slots;
   // Clamp a shared half-grid delta so a group keeps its shape at the edges.
   const delta=axis=>{const values=slots.map(s=>s[axis]),low=Math.ceil((-25-Math.min(...values))*2)/2,high=Math.floor((24-Math.max(...values))*2)/2;return Math.max(low,Math.min(high,Math.round((q[axis]-drag.start[axis])*2)/2))};
   const dx=delta('x'),dz=delta('z');slots.forEach(s=>{s.slot.x=s.x+dx;s.slot.z=s.z+dz});
  }else if(drag.type==='origin'){f.origin=p}
  else{let q=point(e);f.directionDegrees=Math.round((Math.atan2(q.x-f.origin.x,q.z-f.origin.z)*180/Math.PI+360)%360)}
  if(drag.type!=='direction')geometryChanged();draw();updatePosition();
 }
 const v=relative(p,f);$('coordinates').textContent='X: '+v.x+' m · Z: '+v.z+' m';
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('drawing').addEventListener(event,()=>{drag=null;details()});
$('drawing').addEventListener('contextmenu',e=>{e.preventDefault();if(e.target.dataset.target==='slot')remove(e.target.dataset.id)});
function setMode(m){mode=m;$('placeDot').textContent='Place: '+C.preferences[placementPreference].label;document.querySelectorAll('[data-place-preference]').forEach(button=>{const active=m==='place'&&Number(button.dataset.placePreference)===placementPreference;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active)});for(const [button,value]of [['placeDot','place'],['selectMode','select'],['originMode','origin']]){$(button).classList.toggle('active',m===value);$(button).setAttribute('aria-pressed',m===value)}}
for(const [button,value]of [['placeDot','place'],['selectMode','select'],['originMode','origin']])$(button).onclick=()=>setMode(value);
let nodeClipboard=null,pasteNumber=0;
const editingText=e=>e.target.closest('input,select,textarea,[contenteditable]');
function copyNodes(){
 const slots=selectedSlots();if(!slots.length){status('Select nodes to copy.',true);return null}
 nodeClipboard={format:'silica-editor-nodes',version:1,team:current().team,slots:structuredClone(slots)};pasteNumber=0;
 status('Copied '+slots.length+' nodes.');return JSON.stringify(nodeClipboard);
}
function pasteNodes(data=nodeClipboard){
 if(!matchesFilter(current())){status('Create a formation matching these filters before pasting.',true);return}
 if(!data||data.format!=='silica-editor-nodes'||data.version!==1||!Array.isArray(data.slots)||!data.slots.length||data.slots.length>4096){status('Copy formation nodes first.',true);return}
 const f=current(),slots=data.slots;
 if(slots.some(s=>!Number.isFinite(s.x)||!Number.isFinite(s.z)||s.x< -25||s.x>24||s.z< -25||s.z>24||!roles[s.role]||!Array.isArray(s.preferredUnits)||s.preferredUnits.some(u=>typeof u!=='string')||(s.preference!==undefined&&!C.hasPreference(s)))){status('Invalid copied nodes.',true);return}
 const shift=++pasteNumber*.5;
 const offset=axis=>Math.max(-25-Math.min(...slots.map(s=>s[axis])),Math.min(shift,24-Math.max(...slots.map(s=>s[axis]))));
 const dx=offset('x'),dz=offset('z');
 const added=slots.map(s=>({id:id(),x:s.x+dx,z:s.z+dz,forceExclusive:s.forceExclusive===true,role:s.role,...(C.hasPreference(s)?{preference:s.preference}:{}),preferredUnits:s.preferredUnits.filter(u=>units[f.team].includes(u)),preferredTypes:(s.preferredTypes||[]).filter(t=>C.unitTypes.includes(t))}));
 f.slots.push(...added);selected=new Set(added.map(s=>s.id));geometryChanged();setMode('select');draw();details();
 status('Pasted '+added.length+' nodes.'+(data.team!==f.team?' Unit choices unavailable for this team were removed.':''));
}
$('copyNodes').onclick=()=>{copyNodes()};$('pasteNodes').onclick=()=>pasteNodes();
document.addEventListener('copy',e=>{if(editingText(e)||!selected.size)return;const text=copyNodes();if(text&&e.clipboardData){e.clipboardData.setData('text/plain',text);e.preventDefault()}});
document.addEventListener('paste',e=>{if(editingText(e))return;try{const data=JSON.parse(e.clipboardData.getData('text/plain'));if(data.format!=='silica-editor-nodes')return;e.preventDefault();nodeClipboard=data;pasteNodes(data)}catch{}});

document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){drag=null;setMode('select')}
 if((e.key==='Delete'||e.key==='Backspace')&&!e.target.closest('input,select,textarea,[contenteditable]')&&selected.size){e.preventDefault();removeSelected()}
});
function setZoom(value,anchor){
 if(drag)return;
 const workspace=document.querySelector('.workspace'),board=$('board'),before=$('drawing').getBoundingClientRect(),viewport=workspace.getBoundingClientRect();
 const x=anchor?anchor.clientX:viewport.left+workspace.clientWidth/2,y=anchor?anchor.clientY:viewport.top+workspace.clientHeight/2;
 const fx=(x-before.left)/before.width,fy=(y-before.top)/before.height;
 zoom=Math.max(.25,Math.min(3,Math.round(value*100)/100));board.style.width=1000*zoom+'px';board.style.height=1000*zoom+'px';
 const after=$('drawing').getBoundingClientRect();workspace.scrollLeft+=after.left+fx*after.width-x;workspace.scrollTop+=after.top+fy*after.height-y;
 $('zoomReset').textContent=Math.round(zoom*100)+'%';$('zoomOut').disabled=zoom<=.25;$('zoomIn').disabled=zoom>=3;
}
$('zoomOut').onclick=()=>setZoom(zoom-.25);$('zoomIn').onclick=()=>setZoom(zoom+.25);$('zoomReset').onclick=()=>setZoom(1);
$('drawing').addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();if(e.deltaY)setZoom(zoom+(e.deltaY<0?.1:-.1),e)},{passive:false});
$('teamFilter').onchange=$('functionFilter').onchange=()=>{const match=formations.findIndex(matchesFilter);if(match>=0)active=match;selected.clear();refresh()};
$('formationList').onchange=e=>{active=Number(e.target.value);selected.clear();refresh()};$('addFormation').onclick=()=>{const added=C.newFormation();if($('teamFilter').value!=='all')added.team=$('teamFilter').value;if($('functionFilter').value!=='all')added.type=$('functionFilter').value;formations.push(added);active=formations.length-1;selected.clear();refresh()};$('duplicateFormation').onclick=()=>{let f=structuredClone(current());f.name+=' copy';delete f.menuOrder;f.slots.forEach(s=>s.id=id());formations.push(f);active=formations.length-1;selected.clear();refresh()};$('deleteFormation').onclick=()=>{if(formations.length===1){status('Keep at least one formation.',true);return}formations.splice(active,1);active=Math.max(0,active-1);selected.clear();refresh()};
$('menuOrder').onchange=e=>{
 const f=current(),number=Number(e.target.value);
 if(!Number.isInteger(number)||number<2||number>9999){e.target.value=f.menuOrder;status('Choose 2–9999. /1 is reserved for default.',true);return}
 const other=formations.find(v=>v!==f&&v.team===f.team&&v.type===f.type&&v.menuOrder===number);
 if(other)other.menuOrder=f.menuOrder;f.menuOrder=number;titles();
 status(other?'Menu numbers swapped.':'Menu number saved for export.');
};
$('formationName').oninput=e=>{current().name=e.target.value;titles()};$('kind').onchange=e=>{current().type=e.target.value;delete current().menuOrder;selected.clear();refresh()};$('team').onchange=e=>{let f=current();f.team=e.target.value;delete f.menuOrder;f.slots.forEach(s=>s.preferredUnits=s.preferredUnits.filter(u=>units[f.team].includes(u)));selected.clear();refresh()};
$('metresPerNode').onchange=e=>{const n=Number(e.target.value);if(!Number.isFinite(n)||n<=0){e.target.value=current().metresPerNode;status('Metres per grid position must be greater than zero.',true);return}current().metresPerNode=n;draw();details();status('Grid scale updated. Exported coordinates use the new metre value.')};$('directionSensitive').onchange=e=>{current().directionSensitive=e.target.checked;draw();details()};
function download(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
$('export').onclick=async()=>{
 if(formations.some(f=>!f.name.trim())){status('Give every formation a name before exporting.',true);return}
 const snapshot=structuredClone(formations);$('export').disabled=true;
 try{
  const entries=[{name:'silica-formations.json',blob:new Blob([JSON.stringify(C.exportDocument(snapshot),null,2)+'\n'],{type:'application/json'})}];
  status('Packaging '+snapshot.length+' formations…');
  const archive=await FormationZip.create(entries);
  download(archive,'silica-formations.zip');
  status('ZIP download requested: JSON with '+snapshot.length+' formations'+'.');
 }catch(error){status('Export failed: '+error.message+'. No ZIP was downloaded.',true)}
 finally{$('export').disabled=false}
};$('import').onclick=()=>$('fileInput').click();$('fileInput').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const parsed=C.importDocument(JSON.parse(await file.text()));formations=parsed;active=0;selected.clear();refresh();status(`Loaded ${parsed.length} formation${parsed.length===1?'':'s'}.`)}catch(err){status(`Could not load JSON: ${err.message}`,true)}finally{e.target.value=''}};
$('legend').innerHTML=[0,1,2,4].map(value=>'<button type="button" data-place-preference="'+value+'" aria-pressed="false" title="Place '+C.preferences[value].label+' dots"><i class="swatch" style="background:'+C.preferences[value].color+'"></i>'+C.preferences[value].label+'</button>').join('');
$('legend').querySelectorAll('[data-place-preference]').forEach(button=>button.onclick=()=>{placementPreference=Number(button.dataset.placePreference);setMode('place')});

let shapeSession=null,shapeUndo=null,shapeTimer=null;
function cancelShapeSession(){
 clearTimeout(shapeTimer);shapeTimer=null;shapeSession=null;shapeUndo=null;
 $('undoShape').disabled=true;
}
function geometryChanged(){
 if(shapeSession){cancelShapeSession();$('shapeStatus').textContent='Manual edit: live shape updates stopped. Generate to replace all dots again.';}
 if(current().autoPreference)C.applyAutoPreference(current());
}
function syncShapeControls(){
 $('autoPreference').checked=!!current().autoPreference;
 $('preferenceGradient').value=C.gradientValue(current());$('gradientValue').textContent=C.gradientValue(current())+' / 100';$('preferenceGradient').disabled=!current().autoPreference;
 const fillable=FormationShapes.canFill($('shapeType').value);
 $('shapeFill').disabled=!fillable;$('shapeTactical').disabled=!fillable;
 if(!fillable){$('shapeFill').checked=false;$('shapeTactical').checked=false}
 const type=$('shapeType').value;
 $('shapeFillHint').textContent=!fillable?'This path has no area to fill; nodes follow the line.':$('shapeTactical').checked?'Tactical fill uses the Size slider and places symmetric pairs inside the shape, excluding the centre.':type==='arc'?'Outline: open 120° arc. Fill: 120° circular sector.':type==='semi-circle'?'Outline: open 180° curve. Fill: half-disc.':'Fill automatically sizes a compact layout with neighboring dots close together.';
 $('shapeSize').disabled=$('shapeFill').checked;
 $('shapeSizeValue').textContent=$('shapeSize').value+($('shapeFill').checked?' (automatic)':'');
}
function generateShape(){
 clearTimeout(shapeTimer);shapeTimer=null;
 const f=current();
 try{
  const result=FormationShapes.generate({type:$('shapeType').value,count:Number($('shapeCount').value),size:Number($('shapeSize').value),fill:$('shapeFill').checked,tactical:$('shapeTactical').checked,origin:f.origin});
  if(!result.points.length)throw Error('No half-grid positions fit. Move the centre inward.');
  if(result.autoSized){$('shapeSize').value=Math.max(.5,result.effectiveSize);syncShapeControls();$('shapeSizeValue').textContent=C.rounded(result.effectiveSize)+' (automatic)'}
  if(!shapeSession){shapeUndo={formation:f,slots:structuredClone(f.slots),autoPreference:!!f.autoPreference,autoPreferenceGradient:C.gradientValue(f)};}
  shapeSession={formation:f};
  f.slots=result.points.map(p=>({id:id(),...p,role:placementRole,preference:placementPreference,preferredUnits:[]}));
  if(f.autoPreference)C.applyAutoPreference(f);
  selected.clear();drag=null;setMode('select');draw();details();$('undoShape').disabled=false;
  $('shapeStatus').textContent=result.points.length+' / '+result.requested+' nodes. Effective size '+C.rounded(result.effectiveSize)+' grid intervals.'+(result.autoSized?' Automatically sized for compact spacing.':'')+(result.points.length<result.requested?' Half-grid density limits this shape; increase size or enable Fill.':'')+(result.effectiveSize<Number($('shapeSize').value)?' Size reduced to fit the grid around the centre.':'')+(result.overlap?' No non-overlapping fit found. For Tactical, increase size; otherwise reduce count or move the centre inward.':'')+' Live updates active.';
 }catch(error){$('shapeStatus').textContent=error.message;}
}
function shapeControlChanged(){
 syncShapeControls();clearTimeout(shapeTimer);
 if(shapeSession&&shapeSession.formation===current())shapeTimer=setTimeout(generateShape,80);
 else $('shapeStatus').textContent='Press Generate / replace all to apply. Current dots are unchanged.';
}
function renderDetails(){
 legacyDetails();
 const slots=selectedSlots(),d=$('details');if(!slots.length)return;
 const typeSection=document.createElement('section');
 typeSection.innerHTML='<h2>PREFERRED UNIT TYPES</h2><p class="small">Individual unit &gt; matching type &gt; unrestricted &gt; nonmatching fallback, within each priority level.</p><div class="unit-list">'+C.unitTypes.map(type=>'<label class="unit-choice"><input type="checkbox" data-unit-type="'+type+'">'+type+'</label>').join('')+'</div>';
 d.insertBefore(typeSection,d.querySelector('.unit-list')?.previousElementSibling||null);
 typeSection.querySelectorAll('[data-unit-type]').forEach(cb=>{
   const type=cb.dataset.unitType,count=slots.filter(s=>(s.preferredTypes||[]).includes(type)).length;
   cb.checked=count===slots.length;cb.indeterminate=count>0&&count<slots.length;
   cb.onchange=()=>{slots.forEach(s=>{s.preferredTypes=C.unitTypes.filter(t=>t===type?cb.checked:(s.preferredTypes||[]).includes(t))});cb.indeterminate=false;draw();if(slots.length===1&&$('sizeInfo'))$('sizeInfo').textContent=sizeText(slots[0])};
 });
 // Group the existing individual checkboxes by the installed game's actual UnitType.
 const unitList=d.querySelector('[data-unit]')?.closest('.unit-list');
 if(unitList){
   const exclusiveBox=document.createElement('div');exclusiveBox.id='exclusivePreferences';
   const exclusive=document.createElement('label');exclusive.className='unit-choice';
   const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.id='forceExclusive';
   checkbox.checked=slots.every(s=>s.forceExclusive===true);
   checkbox.indeterminate=slots.some(s=>s.forceExclusive===true)&&!checkbox.checked;
   checkbox.onchange=()=>{slots.forEach(s=>s.forceExclusive=checkbox.checked);checkbox.indeterminate=false;draw()};
   exclusive.append(checkbox,document.createTextNode('Exclusive — selected units or types'));
   const exclusiveHint=document.createElement('p');exclusiveHint.className='hint';
   exclusiveHint.textContent='Shared by both preference lists: only a selected individual unit OR a selected unit type may use these dots. With no preference selected, an exclusive dot stays empty.';
   exclusiveBox.append(exclusive,exclusiveHint);d.append(exclusiveBox);
   const labels=[...unitList.querySelectorAll('.unit-choice')].filter(label=>label.querySelector('[data-unit]'));
   for(const type of [...C.unitTypes,'Other']){
     const matching=labels.filter(label=>(C.metadata[current().team+'|'+label.querySelector('input').dataset.unit]?.type||'Other')===type);
     if(!matching.length)continue;
     const heading=document.createElement('strong');heading.textContent=type;heading.style.gridColumn='1 / -1';unitList.append(heading,...matching);
   }
 }
 const label=document.createElement('label');label.className='control';label.textContent='Distance preference';
 const input=document.createElement('select');input.id='slotPreference';
 input.append(new Option('Legacy role ranking','legacy'));
 C.preferences.forEach((p,i)=>{if(i!==3||slots.some(s=>s.preference===3))input.append(new Option(p.label,String(i)))});
 const first=C.hasPreference(slots[0])?String(slots[0].preference):'legacy';
 const common=slots.every(s=>(C.hasPreference(s)?String(s.preference):'legacy')===first);
 if(!common)input.prepend(new Option('Mixed preferences','mixed'));
 input.value=common?first:'mixed';input.disabled=!!current().autoPreference;
 input.onchange=()=>{if(input.value==='mixed')return;cancelShapeSession();slots.forEach(s=>{if(input.value==='legacy')delete s.preference;else s.preference=Number(input.value)});draw();details()};
 label.append(input);d.insertBefore(label,d.children[1]||null);
 if(slots.some(s=>!C.hasPreference(s))){const legacy=document.createElement('p');legacy.className='small';legacy.textContent='Legacy role data is preserved: '+[...new Set(slots.filter(s=>!C.hasPreference(s)).map(s=>roles[s.role].label))].join(', ')+'. Priority is shared by all unit types. Repair preference is an ordinary checkbox.';label.append(legacy);}
 if(current().autoPreference){const note=document.createElement('p');note.className='small';note.textContent='Auto-preference controls priorities. Turn it off to edit values.';label.append(note);}
 d.querySelectorAll('input,select').forEach(control=>control.addEventListener('change',()=>cancelShapeSession(),{capture:true}));
}
function details(){
 // Save state synchronously before replacing sections (toggle events are asynchronous).
 document.querySelectorAll('#details details[data-fold-key]').forEach(f=>inspectorOpen.set(f.dataset.foldKey,f.open));
 renderDetails();
 const d=$('details'),priority=$('slotPreference')?.closest('label');
 if(!priority)return;
 const types=d.querySelector('section'),individual=d.querySelector('[data-unit]')?.closest('.unit-list');
 const exclusivity=d.querySelector('#exclusivePreferences');
 priority.remove();types?.remove();individual?.remove();exclusivity?.remove();
 d.querySelectorAll(':scope > h2').forEach(h=>{if(h.textContent.startsWith('PREFERRED UNITS'))h.remove()});
 types?.querySelector('h2')?.remove();
 const remaining=[...d.childNodes];d.replaceChildren();
 const shortcut=document.createElement('p');shortcut.className='hint';shortcut.textContent='Double-click a node to select every node with the same priority level. Unit and unit-type checkboxes do not affect this selection.';
 const groups=[['position','Selected nodes / position',remaining],['priority','Priority',[priority,shortcut]],['exclusive','Unit and type exclusivity',exclusivity?[exclusivity]:[]],['types','Preferred unit types',types?[...types.childNodes]:[]],['units','Preferred individual units',individual?[individual]:[]]];
 for(const [key,title,nodes] of groups){const fold=foldSection(key,title,nodes);fold.dataset.foldKey=key;d.append(fold)}
}
function setupInspector(){
 document.querySelectorAll('.side > .section, .inspector > .section:not(#details)').forEach((section,index)=>{
   const title=section.querySelector('h2');if(!title)return;
   const text=title.textContent;title.remove();section.append(foldSection('static-'+index,text,[...section.childNodes]));
 });
 const section=document.createElement('section');section.className='section';
 const clear=document.createElement('button');clear.id='clearAllPreferences';clear.className='warn wide';clear.textContent='Clear all preferences';
 const note=document.createElement('p');note.className='hint';note.textContent='Current formation only: clears all unit/type choices, sets every node to equal priority 0, and turns auto-preference off. Double-click a node to select all nodes with the same priority level (color), regardless of unit choices.';
 clear.onclick=()=>{
   cancelShapeSession();const f=current();f.autoPreference=false;
   f.slots.forEach(s=>{s.preference=0;s.role='top';s.preferredUnits=[];s.preferredTypes=[];s.forceExclusive=false});
   syncShapeControls();draw();details();status('Cleared all preferences in '+f.name+'. All nodes now have equal priority.');
 };
 section.append(foldSection('formation-preferences','Formation preferences',[clear,note]));
 $('details').before(section);
}
$('shapeType').replaceChildren(...FormationShapes.types.map(type=>new Option(type[0].toUpperCase()+type.slice(1),type)));
$('preferenceLegend').innerHTML=C.preferences.filter((p,i)=>i!==3).map(p=>'<span><i class="swatch" style="background:'+p.color+'"></i>'+p.label+'</span>').join('');
$('shapeType').onchange=shapeControlChanged;$('shapeCount').oninput=shapeControlChanged;$('shapeSize').oninput=shapeControlChanged;$('shapeFill').onchange=()=>{if($('shapeFill').checked)$('shapeTactical').checked=false;shapeControlChanged()};
$('shapeTactical').onchange=()=>{if($('shapeTactical').checked)$('shapeFill').checked=false;shapeControlChanged()};
$('generateShape').onclick=generateShape;
$('undoShape').onclick=()=>{if(!shapeUndo||shapeUndo.formation!==current())return;const saved=shapeUndo;cancelShapeSession();current().slots=saved.slots;current().autoPreference=saved.autoPreference;current().autoPreferenceGradient=saved.autoPreferenceGradient;selected.clear();syncShapeControls();draw();details();$('shapeStatus').textContent='Restored the layout from before generation.';};
$('autoPreference').onchange=e=>{current().autoPreference=e.target.checked;syncShapeControls();if(e.target.checked)C.applyAutoPreference(current());draw();details();status(e.target.checked?'Distance preferences assigned to all dots. Requires Si_Formation 2.3.1+.':'Auto-preference off. Existing values are retained and editable.');};

$('preferenceGradient').oninput=e=>{const f=current();f.autoPreferenceGradient=Math.max(0,Math.min(100,Number(e.target.value)));$('gradientValue').textContent=f.autoPreferenceGradient+' / 100';if(f.autoPreference){C.applyAutoPreference(f);draw();details()}};
let backupUndo=null;
$('autoBackups').onclick=()=>{
 const f=current();cancelShapeSession();backupUndo={formation:f,slots:structuredClone(f.slots),autoPreference:f.autoPreference};
 const result=C.autoBackups(f);selected=new Set(result.added.map(s=>s.id));$('undoBackups').disabled=false;
 syncShapeControls();draw();details();status('Added '+result.added.length+' backup positions; '+result.skipped+' skipped (occupied, boundary or 4096-position limit).');
};
$('undoBackups').onclick=()=>{if(!backupUndo||backupUndo.formation!==current()){status('Return to the formation where backups were added.',true);return}current().slots=backupUndo.slots;current().autoPreference=backupUndo.autoPreference;backupUndo=null;$('undoBackups').disabled=true;selected.clear();syncShapeControls();draw();details()};
$('loadFootprints').onclick=()=>$('footprintInput').click();
$('footprintInput').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text()),count=FormationFootprints.load(data);try{localStorage.setItem('silica-footprints-v1',JSON.stringify(data))}catch{}$('footprintStatus').textContent=count+' measured unit footprints loaded.';draw();details()}catch(err){status('Footprints: '+err.message,true)}finally{e.target.value=''}};
try{const saved=localStorage.getItem('silica-footprints-v1');if(saved){const count=FormationFootprints.load(JSON.parse(saved));$('footprintStatus').textContent=count+' measured unit footprints restored.'}}catch{}
setupInspector();formations=[sample()];refresh();setMode('select');
})();
