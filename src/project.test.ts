import { describe, expect, it } from 'vitest';
import { BlobReader, BlobWriter, TextReader, ZipReader, ZipWriter } from '@zip.js/zip.js';
import { LIMITS, newProject, readProject, safePath, writeProject, type Project } from './project';
async function fixture() {
  return newProject(new File([new Uint8Array([137,80,78,71,1,2,3])], 'map.png', {type:'image/png'}),1200,600);
}
async function archive(overrides: Record<string, string | Blob>, p?: Project) {
  p ??= await fixture();
  const contents: Record<string, string | Blob> = {
    'manifest.json': JSON.stringify(p.manifest), 'world.json': JSON.stringify(p.world), 'history.json': JSON.stringify(p.history), [p.manifest.artwork.path]: p.artwork, ...overrides,
  };
  const w = new ZipWriter(new BlobWriter(), {useWebWorkers:false});
  for(const [name,data] of Object.entries(contents)) await w.add(name, typeof data === 'string' ? new TextReader(data) : new BlobReader(data), {level:0});
  return w.close();
}
describe('portable ZIP format v1',()=>{
  it('canonicalizes JFIF/JPEG aliases to a JPEG archive path without changing source bytes', async () => {
    const source = new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1]);
    const imported = new File([source], 'atlas.jfif', { type: 'image/jpeg' });
    const p = await newProject(imported, 2, 2);
    expect(p.manifest.artwork.path).toBe('artwork/original.jpg');
    expect(p.manifest.artwork.name).toBe('atlas.jfif');
    expect(p.manifest.artwork.mime).toBe('image/jpeg');
    const reopened = await readProject(await writeProject(p));
    expect(reopened.manifest.artwork.name).toBe('atlas.jfif');
    expect(new Uint8Array(await reopened.artwork.arrayBuffer())).toEqual(source);
  });

  it('round trips source bytes, IDs, records, geometry, history, flags and unknown extensions',async()=>{
    const p=await fixture();
    p.world = { ...p.world, notes:'World history 🗺', view:{center:[90,400],zoom:-.5},layers:{artwork:false,custom:true},countries:[{id:'country-a',name:'Renamed realm',flag:'assets/flags/a.png'}],territories:[{id:'territory-a',ownerId:'country-a',geometry:[[0,0],[10,20],[40,0]]}],military:[{id:'front-a',points:[[1,2],[3,4]]}], infrastructure:{nodes:[{id:'n1'},{id:'n2'}],edges:[{id:'e1',from:'n1',to:'n2'}]},futureField:{version:'keep me'}};
    p.history={events:[{id:'event-a',countryId:'country-a'}],snapshots:[{id:'s1',state:{a:1}}]};
    p.manifest.extension={unchanged:true};
    p.extras.set('assets/flags/a.png',new Blob(['flag bytes'])); p.extras.set('extensions/unknown.json',new Blob(['{"future":true}']));
    const r=await readProject(await writeProject(p));
    expect(r.manifest).toEqual(p.manifest);expect(r.world).toEqual(p.world);expect(r.history).toEqual(p.history);
    expect(await r.artwork.arrayBuffer()).toEqual(await p.artwork.arrayBuffer());
    expect(await r.extras.get('assets/flags/a.png')!.text()).toBe('flag bytes');
    expect(await r.extras.get('extensions/unknown.json')!.text()).toBe('{"future":true}');
    const twice=await readProject(await writeProject(r));expect(twice.world).toEqual(p.world);expect(twice.manifest.id).toBe(p.manifest.id);
  });
  it('rejects newer and older versions without mutating a project',async()=>{
    for(const version of [0,2,'1']) {const p=await fixture();const m={...p.manifest,version}; await expect(readProject(await archive({'manifest.json':JSON.stringify(m)},p))).rejects.toThrow('Unsupported project format');expect(p.manifest.version).toBe(1);}
  });
  it('rejects non-project and malformed metadata',async()=>{
    for(const data of ['{}','null','[]','not JSON']) await expect(readProject(await archive({'manifest.json':data}))).rejects.toThrow();
  });
  it('rejects missing required entries',async()=>{
    const p=await fixture();const w=new ZipWriter(new BlobWriter(),{useWebWorkers:false});await w.add('manifest.json',new TextReader(JSON.stringify(p.manifest)));await expect(readProject(await w.close())).rejects.toThrow('missing world.json');
  });
  it('rejects duplicate names with case folding',async()=>{await expect(readProject(await archive({'WORLD.JSON':'{}'}))).rejects.toThrow('duplicate');});
  it('rejects paths with traversal, absolute names and backslashes',async()=>{
    for(const path of ['../x','/x','a/../x','a\\x','C:/x','a//b','./file','a\0b']) expect(()=>safePath(path)).toThrow('unsafe');
    const bytes = new Uint8Array(await (await archive({'evilxxx':'x'})).arrayBuffer());
    const from = new TextEncoder().encode('evilxxx'), to = new TextEncoder().encode('../evil');
    for(let i=0;i<=bytes.length-from.length;i++) if(from.every((b,j)=>bytes[i+j]===b)) bytes.set(to,i);
    await expect(readProject(new Blob([bytes]))).rejects.toThrow(/unsafe/i);
  });
  it('rejects a damaged source checksum',async()=>{await expect(readProject(await archive({'artwork/original.png':new Blob(['changed'])}))).rejects.toThrow('checksum');});
  it('rejects oversized metadata',async()=>{await expect(readProject(await archive({'world.json':' '.repeat(LIMITS.json+1)}))).rejects.toThrow('metadata limit');});
  it('rejects malformed saved view and layer settings',async()=>{
    for(const world of [{view:{center:[0,0],zoom:99}},{view:{center:[0,'x'],zoom:1}},{layers:{artwork:'no'}},{notes:{text:'wrong'}}]) await expect(readProject(await archive({'world.json':JSON.stringify(world)}))).rejects.toThrow();
  });
  it('rejects invalid dimensions and filename in manifest',async()=>{
    const p=await fixture();for(const patch of [{width:-1},{height:20000},{name:'../map.png'},{path:'manifest.json'}]) await expect(readProject(await archive({'manifest.json':JSON.stringify({...p.manifest,artwork:{...p.manifest.artwork,...patch}})},p))).rejects.toThrow();
  });
  it('rejects collisions with reserved files during export',async()=>{const p=await fixture();p.extras.set('World.json',new Blob(['x']));await expect(writeProject(p)).rejects.toThrow('conflicts');});
  it('produces required self-contained files',async()=>{const r=new ZipReader(new BlobReader(await writeProject(await fixture())));expect((await r.getEntries()).map(e=>e.filename)).toEqual(['manifest.json','world.json','history.json','artwork/original.png']);await r.close();});
  it('rejects encrypted project entries',async()=>{
    const w=new ZipWriter(new BlobWriter(),{useWebWorkers:false});
    await w.add('secret.txt',new TextReader('secret'),{password:'test-only-password',zipCrypto:true});
    await expect(readProject(await w.close())).rejects.toThrow('Encrypted');
  });
  it('rejects excessive entry counts',async()=>{
    const w=new ZipWriter(new BlobWriter(),{useWebWorkers:false});
    for(let i=0;i<513;i++) await w.add(`entry-${i}`,new TextReader(''),{level:0});
    await expect(readProject(await w.close())).rejects.toThrow('too many');
  });
  it('rejects missing artwork and a wrong format identifier',async()=>{
    const p=await fixture();p.manifest.artwork.path='artwork/missing.png';
    const w=new ZipWriter(new BlobWriter(),{useWebWorkers:false});
    for(const [name,value] of Object.entries({'manifest.json':p.manifest,'world.json':p.world,'history.json':p.history})) await w.add(name,new TextReader(JSON.stringify(value)));
    await expect(readProject(await w.close())).rejects.toThrow('artwork is missing');
    await expect(readProject(await archive({'manifest.json':JSON.stringify({...p.manifest,format:'other'})}))).rejects.toThrow('not a WicsoX');
  });
  it('rejects files that are not ZIPs',async()=>{await expect(readProject(new Blob(['broken zip']))).rejects.toThrow();});
});
