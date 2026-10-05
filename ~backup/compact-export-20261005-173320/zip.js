// Offline ZIP writer using stored entries (PNGs are already compressed).
// UTF-8 filenames, CRC-32 and a central directory make this a standard ZIP archive.
(function(root){
 'use strict';
 const table=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
 function crc32(bytes){let crc=0xffffffff;for(const byte of bytes)crc=table[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0}
 function header(length){const bytes=new Uint8Array(length),view=new DataView(bytes.buffer);return{bytes,u16:(at,n)=>view.setUint16(at,n,true),u32:(at,n)=>view.setUint32(at,n,true)}}
 async function create(entries){
  if(entries.length>65535)throw Error('Too many files for a ZIP archive');
  const encoder=new TextEncoder(),local=[],central=[],names=new Set();let offset=0,centralSize=0;
  const now=new Date(),time=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1),date=((Math.max(1980,Math.min(2107,now.getFullYear()))-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
  for(const entry of entries){
   const name=encoder.encode(entry.name);
   if(!name.length||name.length>65535||names.has(entry.name.toLowerCase()))throw Error('Invalid or duplicate ZIP filename');
   names.add(entry.name.toLowerCase());
   const bytes=new Uint8Array(await entry.blob.arrayBuffer()),size=bytes.length,crc=crc32(bytes);
   if(size>=0xffffffff||offset+30+name.length+size>=0xffffffff)throw Error('Export exceeds the ZIP size limit');
   const h=header(30);h.u32(0,0x04034b50);h.u16(4,20);h.u16(6,0x800);h.u16(10,time);h.u16(12,date);h.u32(14,crc);h.u32(18,size);h.u32(22,size);h.u16(26,name.length);
   local.push(h.bytes,name,entry.blob);
   const c=header(46);c.u32(0,0x02014b50);c.u16(4,20);c.u16(6,20);c.u16(8,0x800);c.u16(12,time);c.u16(14,date);c.u32(16,crc);c.u32(20,size);c.u32(24,size);c.u16(28,name.length);c.u32(42,offset);
   central.push(c.bytes,name);centralSize+=46+name.length;offset+=30+name.length+size;
  }
  if(offset+centralSize+22>=0xffffffff)throw Error('Export exceeds the ZIP size limit');
  const end=header(22);end.u32(0,0x06054b50);end.u16(8,entries.length);end.u16(10,entries.length);end.u32(12,centralSize);end.u32(16,offset);
  return new Blob([...local,...central,end.bytes],{type:'application/zip'});
 }
 root.FormationZip={create};
})(globalThis);
