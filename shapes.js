(function(root){
  'use strict';
  const types=['circle','rectangle','square','triangle','hexagon','arrow','line','staggered line','diamond','semi-circle','arc'];
  const canFill=type=>!['line','staggered line'].includes(type);
  const MIN=-25,MAX=24,MAX_NODES=4096;
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const snap=v=>Math.round(v*2)/2;
  function polygon(type){
    switch(type){
      case 'rectangle':return [[-1,-.6],[1,-.6],[1,.6],[-1,.6]];
      case 'square':return [[-1,-1],[1,-1],[1,1],[-1,1]];
      case 'triangle':return [[0,1],[-1,-1],[1,-1]];
      case 'hexagon':return Array.from({length:6},(_,i)=>[Math.sin(i*Math.PI/3),Math.cos(i*Math.PI/3)]);
      case 'arrow':return [[0,1],[1,0],[.35,0],[.35,-1],[-.35,-1],[-.35,0],[-1,0]];
      case 'diamond':return [[0,1],[.65,0],[0,-1],[-.65,0]];
      case 'line':return [[-1,0],[1,0]];
      case 'staggered line':return Array.from({length:9},(_,i)=>[-1+i/4,i%2?.2:-.2]);
      default:return null;
    }
  }
  function insidePolygon(x,z,vertices){
    let inside=false;
    for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){
      const [ax,az]=vertices[j],[bx,bz]=vertices[i];
      const cross=(x-ax)*(bz-az)-(z-az)*(bx-ax);
      if(Math.abs(cross)<1e-8&&x>=Math.min(ax,bx)-1e-8&&x<=Math.max(ax,bx)+1e-8&&z>=Math.min(az,bz)-1e-8&&z<=Math.max(az,bz)+1e-8)return true;
      if((az>z)!==(bz>z)&&x<(bx-ax)*(z-az)/(bz-az)+ax)inside=!inside;
    }
    return inside;
  }
  function generate({type='circle',count=20,size=6,fill=false,origin={x:0,z:0},autoSize=true,capacityOnly=false,tactical=false}={}){
    if(!types.includes(type))throw Error('Unknown shape');
    if(!Number.isFinite(count)||!Number.isInteger(count)||count<1||count>MAX_NODES)throw Error('Node count must be an integer from 1 to 4096.');
    if(!Number.isFinite(size)||size<=0)throw Error('Shape size must be positive.');
    if(!Number.isFinite(origin.x)||!Number.isFinite(origin.z)||origin.x<MIN||origin.x>MAX||origin.z<MIN||origin.z>MAX)throw Error('Move the formation centre inside the grid first.');
    tactical=!!tactical&&canFill(type);
    fill=(!!fill||tactical)&&canFill(type);
    if(fill&&autoSize&&!tactical){
      // Probe capacity only: avoid selecting thousands of destinations during size search.
      // Half-grid sizes give a bounded search, independent of the previous slider value.
      const cache=new Map(),probe=step=>{if(!cache.has(step))cache.set(step,generate({type,count,size:step/2,fill:true,origin,autoSize:false,capacityOnly:true}));return cache.get(step)};
      let low=1,high=48;
      if(probe(high).capacity>=count){
        while(low<high){const mid=Math.floor((low+high)/2);if(probe(mid).capacity>=count)high=mid;else low=mid+1}
        // Greedy packings can fluctuate slightly at the boundary; check adjacent sizes too.
        for(let step=Math.max(1,low-2);step<low;step++)if(probe(step).capacity>=count){low=step;break}
      }else low=48;
      const result=generate({type,count,size:low/2,fill:true,origin,autoSize:false});
      return {...result,autoSized:true};
    }
    const vertices=polygon(type),closed=canFill(type)&&!['arc','semi-circle'].includes(type);
    const halfAngle=type==='arc'?Math.PI/3:Math.PI/2;
    const extent=vertices|| (type==='circle'?[[-1,-1],[1,1]]:[[-Math.sin(halfAngle),0],[Math.sin(halfAngle),1]]);
    let radius=size;
    for(const [x,z] of extent){
      if(x>0)radius=Math.min(radius,(MAX-origin.x)/x);else if(x<0)radius=Math.min(radius,(MIN-origin.x)/x);
      if(z>0)radius=Math.min(radius,(MAX-origin.z)/z);else if(z<0)radius=Math.min(radius,(MIN-origin.z)/z);
    }
    radius=Math.max(0,radius);
    const pool=[],seen=new Set();
    function add(x,z){
      x=clamp(snap(x),MIN,MAX);z=clamp(snap(z),MIN,MAX);
      if(tactical&&x===snap(origin.x)&&z===snap(origin.z))return;
      const key=x+','+z;if(seen.has(key))return;
      seen.add(key);pool.push({x,z});
    }
    if(radius<1e-8)add(origin.x,origin.z);
    else if(fill){
      for(let x=MIN;x<=MAX;x+=.5)for(let z=MIN;z<=MAX;z+=.5){
        const nx=(x-origin.x)/radius,nz=(z-origin.z)/radius;
        const inside=vertices?insidePolygon(nx,nz,vertices):nx*nx+nz*nz<=1+1e-8&&
          (type==='circle'||nz>=-1e-8&&(type==='semi-circle'||Math.abs(Math.atan2(nx,nz))<=halfAngle+1e-8));
        if(inside)add(x,z);
      }
    }else if(vertices){
      const segments=closed?vertices.length:vertices.length-1;
      for(let i=0;i<segments;i++){
        const a=vertices[i],b=vertices[(i+1)%vertices.length];
        const steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*radius*16));
        for(let k=0;k<=steps;k++)add(origin.x+(a[0]+(b[0]-a[0])*k/steps)*radius,origin.z+(a[1]+(b[1]-a[1])*k/steps)*radius);
      }
    }else{
      const start=type==='circle'?0:-halfAngle,span=type==='circle'?2*Math.PI:2*halfAngle;
      const steps=Math.max(1,Math.ceil(span*radius*16));
      for(let k=0;k<=(closed?steps-1:steps);k++){
        const angle=start+span*k/steps;add(origin.x+Math.sin(angle)*radius,origin.z+Math.cos(angle)*radius);
      }
    }
    const actual=Math.min(count,pool.length),points=[];
    let overlap=false,capacity=0;
    if(fill&&actual){
      // Newly generated dots have no unit preference: radius .45 plus .02 stroke.
      const dotRadius=.47,spacing=2*dotRadius;
      const segmentDistance=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((p.x-a[0])*dx+(p.z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(p.x-a[0]-t*dx,p.z-a[1]-t*dz)};
      const fits=p=>{
        const q={x:p.x-origin.x,z:p.z-origin.z};
        if(vertices){const v=vertices.map(([x,z])=>[x*radius,z*radius]);return v.every((a,i)=>segmentDistance(q,a,v[(i+1)%v.length])>=dotRadius-1e-8)}
        if(Math.hypot(q.x,q.z)+dotRadius>radius+1e-8)return false;
        if(type==='circle')return true;
        if(type==='semi-circle')return q.z>=dotRadius;
        return q.z*Math.sin(halfAngle)-Math.abs(q.x)*Math.cos(halfAngle)>=dotRadius;
      };
      const inset=pool.filter(fits);
      // Try several lattice phases and sweep directions with constant-size neighbor searches.
      // Keep the largest non-overlapping packing, then retain a compact interior subset.
      let packed=[];
      for(let attempt=0;attempt<12;attempt++){
        const candidates=[...inset].sort((a,b)=>{
          if(attempt<4){const rank=p=>((Math.round(p.x*2)&1)===(attempt&1)&&((Math.round(p.z*2)&1)===((attempt>>1)&1)))?0:1;const diff=rank(a)-rank(b);if(diff)return diff}
          const angle=(attempt%8)*Math.PI/4,score=p=>p.x*Math.cos(angle)+p.z*Math.sin(angle);
          return score(a)-score(b)||a.x-b.x||a.z-b.z;
        });
        const buckets=new Map(),chosen=[];
        for(const p of candidates){
          const cx=Math.floor(p.x/spacing),cz=Math.floor(p.z/spacing);let free=true;
          for(let x=cx-1;x<=cx+1&&free;x++)for(let z=cz-1;z<=cz+1&&free;z++)for(const q of buckets.get(x+','+z)||[])if(Math.hypot(p.x-q.x,p.z-q.z)<spacing-1e-8){free=false;break}
          if(!free)continue;
          chosen.push(p);const key=cx+','+cz;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(p);
        }
        if(chosen.length>packed.length)packed=chosen;
      }
      capacity=packed.length;
      if(capacityOnly)return {capacity,effectiveSize:radius};
      const spread=(candidates,limit)=>{
        const distances=candidates.map(p=>points.length?Math.min(...points.map(q=>(p.x-q.x)**2+(p.z-q.z)**2)):Infinity);
        const used=new Set(points.map(p=>p.x+','+p.z));
        while(points.length<limit){
          let best=-1,score=-Infinity;
          for(let i=0;i<candidates.length;i++){const p=candidates[i];if(used.has(p.x+','+p.z))continue;const value=points.length?distances[i]:-((p.x-origin.x)**2+(p.z-origin.z)**2);if(value>score){score=value;best=i}}
          if(best<0)break;
          const p=candidates[best];points.push(p);used.add(p.x+','+p.z);
          for(let i=0;i<candidates.length;i++)distances[i]=Math.min(distances[i],(candidates[i].x-p.x)**2+(candidates[i].z-p.z)**2);
        }
      };
      if(tactical)spread(packed,Math.min(actual,packed.length));
      else{
      // Retain a dense interior rather than maximizing gaps between the requested dots.
      const centre=inset.reduce((sum,p)=>({x:sum.x+p.x/inset.length,z:sum.z+p.z/inset.length}),{x:0,z:0});
      packed.sort((a,b)=>((a.x-centre.x)**2+(a.z-centre.z)**2)-((b.x-centre.x)**2+(b.z-centre.z)**2)||a.z-b.z||a.x-b.x);
      points.push(...packed.slice(0,actual));
      }
      if(points.length<actual){overlap=true;spread(pool,actual)}
    }else{
      for(let i=0;i<actual;i++){
        const index=actual===1?Math.floor(pool.length/2):closed?Math.floor(i*pool.length/actual):Math.round(i*(pool.length-1)/(actual-1));
        points.push(pool[index]);
      }
    }
    return {points,requested:count,available:pool.length,effectiveSize:radius,fill,overlap,capacity};
  }
  const api={types,canFill,generate,MAX_NODES};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FormationShapes=api;
})(typeof globalThis!=='undefined'?globalThis:this);
