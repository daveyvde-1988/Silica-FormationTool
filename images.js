// Standalone canvas renderer: cropping is independent of editor zoom and selection.
(function(root){
 'use strict';
 async function png(f){
  const C=FormationCore,margin=.3;
  const bounds=f.slots.map(s=>({x:s.x,z:s.z,r:.45*C.sizeScale(s.preferredUnits)+.02}));
  if(!bounds.length)bounds.push({x:f.origin.x,z:f.origin.z,r:.5});
  const minX=Math.min(...bounds.map(p=>p.x-p.r))-margin,maxX=Math.max(...bounds.map(p=>p.x+p.r))+margin;
  const minZ=Math.min(...bounds.map(p=>p.z-p.r))-margin,maxZ=Math.max(...bounds.map(p=>p.z+p.r))+margin;
  const scale=Math.min(80,2400/Math.max(maxX-minX,maxZ-minZ));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil((maxX-minX)*scale));canvas.height=Math.max(1,Math.ceil((maxZ-minZ)*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas is unavailable');
  ctx.fillStyle='#050607';ctx.fillRect(0,0,canvas.width,canvas.height);
  const x=v=>(v-minX)*scale,y=v=>(maxZ-v)*scale;
  ctx.strokeStyle='#373b42';ctx.lineWidth=1;ctx.beginPath();
  for(let v=Math.ceil(minX);v<=maxX;v++){ctx.moveTo(x(v),0);ctx.lineTo(x(v),canvas.height)}
  for(let v=Math.ceil(minZ);v<=maxZ;v++){ctx.moveTo(0,y(v));ctx.lineTo(canvas.width,y(v))}ctx.stroke();
  for(const s of f.slots){ctx.beginPath();ctx.arc(x(s.x),y(s.z),.45*C.sizeScale(s.preferredUnits)*scale,0,Math.PI*2);ctx.fillStyle=C.appearance(s).color;ctx.fill();ctx.strokeStyle='#11192b';ctx.lineWidth=.04*scale;ctx.stroke();
    const marker=C.preferenceMarker(s,f.team);
    if(marker){
      const side=.45*C.sizeScale(s.preferredUnits)*scale*1.5;
      if(marker.href){const image=new Image();image.src=marker.href;await image.decode();ctx.drawImage(image,x(s.x)-side/2,y(s.z)-side/2,side,side)}
      else{ctx.font='bold '+side+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=1;ctx.strokeText(marker.text,x(s.x),y(s.z));ctx.fillText(marker.text,x(s.x),y(s.z))}
    }
  }
  // Only show the centre when it lies inside the dot crop; never enlarge the image for it.
  if(f.origin.x>=minX&&f.origin.x<=maxX&&f.origin.z>=minZ&&f.origin.z<=maxZ){ctx.strokeStyle='#ff8fba';ctx.lineWidth=.12*scale;ctx.beginPath();ctx.moveTo(x(f.origin.x-.2),y(f.origin.z-.2));ctx.lineTo(x(f.origin.x+.2),y(f.origin.z+.2));ctx.moveTo(x(f.origin.x-.2),y(f.origin.z+.2));ctx.lineTo(x(f.origin.x+.2),y(f.origin.z-.2));ctx.stroke();
    const marker=C.preferenceMarker(s,f.team);
    if(marker){
      const side=.45*C.sizeScale(s.preferredUnits)*scale*1.5;
      if(marker.href){const image=new Image();image.src=marker.href;await image.decode();ctx.drawImage(image,x(s.x)-side/2,y(s.z)-side/2,side,side)}
      else{ctx.font='bold '+side+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.strokeStyle='#111';ctx.lineWidth=1;ctx.strokeText(marker.text,x(s.x),y(s.z));ctx.fillText(marker.text,x(s.x),y(s.z))}
    }
  }
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('PNG encoding failed')),'image/png'));
 }
 const safe=value=>String(value).replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[ .]+$/g,'').trim().slice(0,100)||'Unnamed';
 function filename(f){return safe(f.type[0].toUpperCase()+f.type.slice(1))+'_'+safe(f.team)+'_'+safe(f.name)+'.png'}
 root.FormationImages={png,filename};
})(globalThis);
