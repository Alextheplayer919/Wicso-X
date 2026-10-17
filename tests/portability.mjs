import { chromium } from '@playwright/test';
import bundledChromium from '@sparticuz/chromium';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { BlobReader, TextWriter, ZipReader, BlobWriter, ZipWriter, TextReader } from '@zip.js/zip.js';
const browser=await chromium.launch({executablePath:await bundledChromium.executablePath(),args:bundledChromium.args,headless:true});
const base=process.env.TEST_URL || 'http://localhost:4173';
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(base);
const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=800;c.height=500;c.getContext('2d').fillRect(50,50,700,400);return c.toDataURL().split(',')[1];});
await page.locator('#file-input').setInputFiles({name:'original.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
await page.getByText('Map loaded · original artwork preserved',{exact:true}).waitFor();
await page.locator('#edit-project').click();
await page.locator('#world-name').fill('Republic of WICSO');await page.locator('#world-notes').fill('A local world. Capital: Žilina. <script>not executable</script>');
await page.getByRole('button',{name:'Apply changes'}).click();
await page.locator('#actual').click();await page.waitForTimeout(400);await page.locator('#visibility').click();
const save=page.waitForEvent('download');await page.locator('#save-project').click();const download=await save;
const bytes=readFileSync(await download.path());
async function unpack(bytes){const r=new ZipReader(new BlobReader(new Blob([bytes])),{useWebWorkers:false});const entries=await r.getEntries();const data={};for(const e of entries)data[e.filename]=await e.getData(new BlobWriter());await r.close();return data;}
const saved=await unpack(bytes);const manifest=JSON.parse(await saved['manifest.json'].text());const world=JSON.parse(await saved['world.json'].text());
assert.equal(manifest.name,'Republic of WICSO');assert.equal(world.layers.artwork,false);assert.equal(world.view.zoom,0);assert.equal(world.notes,'A local world. Capital: Žilina. <script>not executable</script>');
assert.deepEqual(Buffer.from(await saved[manifest.artwork.path].arrayBuffer()),Buffer.from(png,'base64'));
// Retained extension asset and unknown structured fields survive a fresh browser context.
manifest.futureMetadata={enabled:true};world.countries=[{id:'realm-a',name:'Test realm',flag:'assets/flag.bin'}];world.territories=[{id:'region-a',ownerId:'realm-a',points:[[0,0],[1,2],[3,0]]}];
saved['manifest.json']=new Blob([JSON.stringify(manifest)]);saved['world.json']=new Blob([JSON.stringify(world)]);saved['assets/flag.bin']=new Blob(['unchanged flag']);
async function repack(data){const w=new ZipWriter(new BlobWriter(),{useWebWorkers:false});for(const [name,blob]of Object.entries(data))await w.add(name,new BlobReader(blob),{level:0});return Buffer.from(await(await w.close()).arrayBuffer());}
const extended=await repack(saved);
const context=await browser.newContext();const fresh=await context.newPage();fresh.on('pageerror',e=>errors.push(e.message));await fresh.goto(base);
await fresh.locator('#project-input').setInputFiles({name:'world.zip',mimeType:'application/zip',buffer:extended});
await fresh.getByText('Project opened · artwork and data restored',{exact:true}).waitFor();
assert.equal(await fresh.locator('#project-title').textContent(),'Republic of WICSO');assert.equal(await fresh.locator('.leaflet-image-layer').evaluate(e=>e.style.opacity),'0');assert.equal(await fresh.locator('#zoom-level').textContent(),'100%');
await fresh.locator('#edit-project').click();assert.equal(await fresh.locator('#world-notes').inputValue(),world.notes);await fresh.locator('.dialog-close').click();
const nextSave=fresh.waitForEvent('download');await fresh.locator('#save-project').click();const next=await unpack(readFileSync(await(await nextSave).path()));
assert.deepEqual(JSON.parse(await next['world.json'].text()),world);assert.deepEqual(JSON.parse(await next['manifest.json'].text()).futureMetadata,manifest.futureMetadata);assert.equal(await next['assets/flag.bin'].text(),'unchanged flag');
// A malformed ZIP does not replace the loaded workspace or request a destructive backup.
await fresh.locator('#project-input').setInputFiles({name:'bad.zip',mimeType:'application/zip',buffer:Buffer.from('bad')});await fresh.getByRole('alert').filter({hasText:'readable ZIP'}).waitFor();assert.equal(await fresh.locator('#project-title').textContent(),'Republic of WICSO');
// Replacing a valid workspace emits a self-contained backup first.
fresh.once('dialog',d=>d.accept());const backup=fresh.waitForEvent('download');
await fresh.locator('#file-input').setInputFiles({name:'second.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});const backupDownload=await backup;assert.match(backupDownload.suggestedFilename(),/-backup-/);
const backupData=await unpack(readFileSync(await backupDownload.path()));assert.equal(JSON.parse(await backupData['manifest.json'].text()).id,manifest.id);assert.equal(await backupData['assets/flag.bin'].text(),'unchanged flag');
await fresh.getByText('Map loaded · original artwork preserved',{exact:true}).waitFor();
await fresh.setViewportSize({width:390,height:844});assert.equal(await fresh.evaluate(()=>document.documentElement.scrollWidth),390);await fresh.locator('#edit-project').click();await fresh.locator('#world-notes').fill('Mobile notes');await fresh.getByRole('button',{name:'Apply changes'}).click();
assert.deepEqual(errors,[]);console.log('Portability browser checks passed: download, fresh-session restoration, notes, visibility/view, original bytes, unknown metadata/assets, country references, invalid ZIP safety, pre-replacement backup and mobile details editing.');await browser.close();
