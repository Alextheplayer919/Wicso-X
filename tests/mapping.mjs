import {chromium} from '@playwright/test';
import bundledChromium from '@sparticuz/chromium';
import {readFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {BlobReader,BlobWriter,ZipReader} from '@zip.js/zip.js';
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({executablePath:await bundledChromium.executablePath(),args:bundledChromium.args,headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=process.env.TEST_URL||'http://localhost:4173';await page.goto(base);
const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=900;c.height=600;const ctx=c.getContext('2d');ctx.fillStyle='#dce7cd';ctx.fillRect(0,0,900,600);return c.toDataURL().split(',')[1];});
await page.locator('#file-input').setInputFiles({name:'world.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.getByText('Map loaded · original artwork preserved',{exact:true}).waitFor();
await page.locator('#records').click();await page.locator('#new-country').click();
await page.locator('[name=name]').fill('Federation <script>');await page.locator('[name=government]').fill('Federated council');await page.locator('[name=leadership]').fill('Mira');await page.locator('[name=custom]').fill('{"calendar":"Local year 80"}');
await page.locator('[name=flag]').setInputFiles({name:'flag.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});await page.getByRole('button',{name:'Save country',exact:true}).click();await page.locator('.country-flag').waitFor();
await page.locator('.entity-close').click();
await page.locator('#trace-territory').click();
const artwork=await page.locator('.leaflet-image-layer').boundingBox();
for(const [x,y]of [[.2,.3],[.65,.3],[.65,.75],[.2,.75]])await page.mouse.click(artwork.x+artwork.width*x,artwork.y+artwork.height*y);
await page.locator('#finish-boundary').click();await page.locator('#territory-form').waitFor();await page.locator('[name=name]').fill('Northern district');await page.locator('[name=ownerId]').selectOption({label:'Federation <script>'});await page.getByRole('button',{name:'Save territory',exact:true}).click();
assert.equal(await page.locator('.leaflet-overlay-pane path').count(),1);
// Select on the canvas, then open country dossier and rename without changing IDs.
await page.locator('.leaflet-overlay-pane path').click();await page.locator('#territory-form').waitFor();await page.locator('#owner-dossier').click();assert.equal(await page.locator('[name=leadership]').inputValue(),'Mira');await page.locator('[name=name]').fill('Renamed federation');await page.getByRole('button',{name:'Save country',exact:true}).click();await page.locator('.country-flag').waitFor();
// A country referenced by a territory cannot be deleted.
await page.locator('#delete-country').click();await page.getByRole('alert').filter({hasText:'Reassign owned'}).waitFor();await page.locator('.entity-close').click();
await page.locator('#records').click();await page.locator('[data-territory]').click();assert.equal(await page.locator('[name=ownerId] option:checked').textContent(),'Renamed federation');await page.locator('#edit-boundary').click();
let vertex=await page.getByTitle('Vertex 1',{exact:true}).boundingBox();await page.mouse.move(vertex.x+12,vertex.y+12);await page.mouse.down();await page.mouse.move(vertex.x+40,vertex.y+35,{steps:8});await page.mouse.up();await page.getByTitle('Insert vertex after 1',{exact:true}).click();assert.equal(await page.locator('.vertex-handle').count(),5);await page.getByTitle('Vertex 2',{exact:true}).click();await page.locator('#remove-vertex').click();assert.equal(await page.locator('.vertex-handle').count(),4);await page.locator('#finish-boundary').click();
// Undo and redo the boundary correction.
await page.locator('#undo-edit').click();await page.locator('#redo-edit').click();
await page.locator('#records').click();await page.locator('[data-territory]').click();await page.locator('[name=ownerId]').selectOption('');await page.locator('[name=status]').selectOption('contested');await page.getByRole('button',{name:'Save territory',exact:true}).click();
await page.locator('#territory-visibility').click();assert.equal(await page.locator('.leaflet-overlay-pane path').count(),0);await page.locator('#territory-visibility').click();
const downloadPromise=page.waitForEvent('download');await page.locator('#save-project').click();const bytes=readFileSync(await(await downloadPromise).path());
const r=new ZipReader(new BlobReader(new Blob([bytes])),{useWebWorkers:false});const data={};for(const e of await r.getEntries())data[e.filename]=await e.getData(new BlobWriter());await r.close();const world=JSON.parse(await data['world.json'].text());const m=world.mapping;
assert.equal(m.countries.length,1);assert.equal(m.territories.length,1);assert.equal(m.countries[0].name,'Renamed federation');assert.equal(m.countries[0].profile.government,'Federated council');assert.deepEqual(m.countries[0].custom,{calendar:'Local year 80'});assert.equal(m.territories[0].ownerId,null);assert.equal(m.ownershipHistory.length,1);assert.equal(m.ownershipHistory[0].from,m.countries[0].id);assert.notEqual(m.territories[0].points[0][0],180);assert.deepEqual(Buffer.from(await data[m.countries[0].flag].arrayBuffer()),Buffer.from(png,'base64'));
await page.screenshot({path:'test-results/mapping-desktop.png'});
// Fresh browser context, no local storage assumptions.
const fresh=await(await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();fresh.on('pageerror',e=>errors.push(e.message));await fresh.goto(base);await fresh.locator('#project-input').setInputFiles({name:'saved.zip',mimeType:'application/zip',buffer:bytes});await fresh.getByText('Project opened · artwork and data restored',{exact:true}).waitFor();assert.equal(await fresh.locator('.leaflet-overlay-pane path').count(),1);await fresh.locator('#records').tap();await fresh.locator('[data-country]').tap();assert.equal(await fresh.locator('[name=leadership]').inputValue(),'Mira');await fresh.locator('.country-flag').waitFor();await fresh.locator('.entity-close').tap();await fresh.locator('#records').tap();await fresh.locator('[data-territory]').tap();assert.equal(await fresh.locator('[name=name]').inputValue(),'Northern district');assert.equal(await fresh.locator('[name=status]').inputValue(),'contested');await fresh.screenshot({path:'test-results/mapping-mobile.png'});await fresh.locator('.entity-close').tap();assert.equal(await fresh.evaluate(()=>document.documentElement.scrollWidth),390);
// Mobile touch tracing can be cancelled without changing saved territories.
await fresh.locator('#trace-territory').tap();const box=await fresh.locator('.leaflet-image-layer').boundingBox();for(const [x,y]of [[.3,.4],[.5,.4],[.5,.6]])await fresh.touchscreen.tap(box.x+box.width*x,box.y+box.height*y);await fresh.locator('#cancel-boundary').tap();assert.equal(await fresh.locator('.leaflet-overlay-pane path').count(),1);
// Confirm destructive delete and undo on mobile.
await fresh.locator('#records').tap();await fresh.locator('[data-territory]').tap();fresh.once('dialog',d=>d.accept());await fresh.locator('#delete-territory').tap();assert.equal(await fresh.locator('.leaflet-overlay-pane path').count(),0);await fresh.locator('#undo-edit').tap();assert.equal(await fresh.locator('.leaflet-overlay-pane path').count(),1);
// Closing a modified dossier prompts; rejecting leaves it open and accepting discards it.
await fresh.locator('#records').tap();await fresh.locator('[data-country]').tap();await fresh.locator('[name=leadership]').fill('Unsaved leader');fresh.once('dialog',d=>d.dismiss());await fresh.locator('.entity-close').tap();assert.equal(await fresh.locator('dialog.entity-dialog').evaluate(e=>e.open),true);fresh.once('dialog',d=>d.accept());await fresh.locator('.entity-close').tap();await fresh.locator('#records').tap();await fresh.locator('[data-country]').tap();assert.equal(await fresh.locator('[name=leadership]').inputValue(),'Mira');
assert.deepEqual(errors,[]);console.log('Mapping browser checks passed: tracing, canvas selection, dossier/flag editing, stable ownership after rename, deletion guard, vertex drag, undo/redo, transfer history, layer toggle, ZIP fresh-session restore, and mobile record access/touch cancellation.');await browser.close();
